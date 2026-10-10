import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Upload, RefreshCw, AlertTriangle, ShieldCheck, Building2, HandCoins } from 'lucide-react';
import { createReport, placeCleanupBid, resolveDeviceLocation } from '../api';
import type { LocationResolution, Report } from '../types';

interface ReportFormProps {
  onReportCreated: (newReport: Report, warning?: string) => void;
  onCancel?: () => void;
}

const COMMON_WASTE_CATEGORIES = [
  'Plastic Waste',
  'Construction Debris',
  'Organic / Wet Waste',
  'Mixed Household Garbage',
  'Illegal Dumping',
  'Hazardous / Electronic Waste'
];

export const ReportForm: React.FC<ReportFormProps> = ({ onReportCreated, onCancel }) => {
  const [useCamera, setUseCamera] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [captureMethod, setCaptureMethod] = useState<'IN_APP_CAMERA' | 'FILE_UPLOAD'>('IN_APP_CAMERA');

  // Geolocation
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('');
  const [locationResolution, setLocationResolution] = useState<LocationResolution | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'resolved' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Form fields
  const [description, setDescription] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [taggedMunicipalityId, setTaggedMunicipalityId] = useState('');
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const resolvePhotoLocation = () => {
    setLocationStatus('locating');
    setLocationError(null);
    setLocationResolution(null);
    setTaggedMunicipalityId('');

    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('This browser does not provide device location. Open EcoTrack in a modern browser with location services enabled.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;
        const nextAccuracy = position.coords.accuracy;
        setLatitude(nextLatitude);
        setLongitude(nextLongitude);
        setAccuracy(nextAccuracy);
        try {
          const resolved = await resolveDeviceLocation({
            latitude: nextLatitude,
            longitude: nextLongitude,
            accuracy: nextAccuracy,
          });
          setLocationResolution(resolved);
          setAddress(resolved.address);
          setTaggedMunicipalityId(resolved.municipality.id);
          setLocationStatus('resolved');
        } catch (caught) {
          setLocationStatus('error');
          setLocationError(caught instanceof Error ? caught.message : 'Could not resolve the responsible municipality.');
        }
      },
      (locationFailure) => {
        setLocationStatus('error');
        const recovery = locationFailure.code === locationFailure.PERMISSION_DENIED
          ? 'Location permission was denied. Enable location access for this site, then try again.'
          : 'A precise device location could not be obtained. Move to an open area and try again.';
        setLocationError(recovery);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const acceptPhoto = (blob: Blob, method: 'IN_APP_CAMERA' | 'FILE_UPLOAD') => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
    setCaptureMethod(method);
    resolvePhotoLocation();
  };

  // WebRTC Camera Handler
  const startCamera = async () => {
    try {
      setUseCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setUseCamera(false);
      setErrorMessage('Device camera not available or permission denied. Please use file upload.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          acceptPhoto(blob, 'IN_APP_CAMERA');
          stopCamera();
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      acceptPhoto(file, 'FILE_UPLOAD');
    }
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoBlob) {
      setErrorMessage('Please capture or upload a pollution photograph as evidence.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please provide a short description of the observed pollution.');
      return;
    }
    if (latitude === null || longitude === null || accuracy === null || !locationResolution) {
      setErrorMessage('Resolve the image location and responsible municipality before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('file', photoBlob, 'evidence.jpg');
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('address', address);
      formData.append('location_accuracy', accuracy.toString());
      formData.append('description', description);
      formData.append('waste_categories_raw', JSON.stringify(selectedCategories));
      formData.append('capture_method', captureMethod);
      if (taggedMunicipalityId) formData.append('tagged_municipality_id', taggedMunicipalityId);

      const created = await createReport(formData);
      const numericPledge = Number(pledgeAmount);
      let warning: string | undefined;
      if (Number.isFinite(numericPledge) && numericPledge > 0) {
        try {
          await placeCleanupBid(created.id, {
            amount: numericPledge,
            contact_phone: contactPhone.trim() || undefined,
            message: 'Initial pledge from the person who reported this site.',
          });
        } catch (pledgeError) {
          warning = `The report was created, but its pledge was not recorded: ${
            pledgeError instanceof Error ? pledgeError.message : 'please add it from the report funding panel.'
          }`;
        }
      }
      onReportCreated(created, warning);
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-2xl mx-auto my-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white">
        <div className="flex items-center gap-2">
          <Camera className="w-6 h-6" />
          <h2 className="text-xl font-bold tracking-tight">Report Land Pollution Incident</h2>
        </div>
        <p className="text-xs text-emerald-100 mt-1">
          Every report is cryptographically hashed (SHA-256), server-signed, and verified against municipal boundaries.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Evidence Capture */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            1. Evidence Photography (Required)
          </label>

          {useCamera ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={captureFrame}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-xs shadow-lg flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Snap Snapshot
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-800 text-white rounded-full text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : photoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
              <img src={photoPreview} alt="Evidence preview" className="w-full h-48 object-cover rounded-lg" />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1 font-medium text-emerald-600">
                  <ShieldCheck className="w-4 h-4" /> Ready for SHA-256 Hashing ({captureMethod})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoBlob(null);
                    setPhotoPreview(null);
                    setLatitude(null);
                    setLongitude(null);
                    setAccuracy(null);
                    setAddress('');
                    setLocationResolution(null);
                    setLocationStatus('idle');
                    setLocationError(null);
                    setTaggedMunicipalityId('');
                  }}
                  className="text-rose-600 hover:underline font-semibold"
                >
                  Retake Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 transition-colors"
              >
                <Camera className="w-8 h-8 mb-2" />
                <span className="font-bold text-xs">Launch In-App Camera</span>
                <span className="text-[10px] text-slate-500">Direct authentic frame</span>
              </button>

              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors">
                <Upload className="w-8 h-8 mb-2 text-slate-400" />
                <span className="font-bold text-xs">Upload from Device</span>
                <span className="text-[10px] text-slate-500">JPG, PNG up to 10MB</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* 2. Device location and live municipal discovery */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            2. Device Location & Responsible Municipality
          </label>
          {locationStatus === 'idle' && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Select or capture the pollution image first. EcoTrack will then ask for your current device location and identify the local body for that area.
            </div>
          )}
          {locationStatus === 'locating' && (
            <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
              Fetching precise device coordinates and matching the responsible Indian municipality…
            </div>
          )}
          {locationStatus === 'error' && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{locationError}</span>
              </div>
              <button type="button" onClick={resolvePhotoLocation} className="mt-3 min-h-11 rounded-lg bg-rose-700 px-4 text-xs font-bold text-white hover:bg-rose-800">
                Try location again
              </button>
            </div>
          )}
          {locationStatus === 'resolved' && locationResolution && latitude !== null && longitude !== null && accuracy !== null && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-emerald-950">Location matched</p>
                  <p className="mt-1 font-mono text-xs text-emerald-800">{latitude.toFixed(6)}, {longitude.toFixed(6)} · accuracy ±{Math.round(accuracy)}m</p>
                </div>
                <button type="button" onClick={resolvePhotoLocation} className="min-h-11 rounded-lg px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100">Refresh</button>
              </div>
              <div>
                <label htmlFor="resolved-address" className="mb-1 block text-xs font-semibold text-slate-700">Resolved address</label>
                <input id="resolved-address" type="text" value={address} onChange={(event) => setAddress(event.target.value)} required className="min-h-11 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-white p-3 text-sm text-slate-700">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                <div>
                  <p className="font-bold">Suggested local body: {locationResolution.municipality.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{[locationResolution.district, locationResolution.state].filter(Boolean).join(', ')}</p>
                  <p className="mt-1 text-xs text-slate-500">Source: {locationResolution.source} · {locationResolution.attribution}</p>
                </div>
              </div>
              <p className="text-xs leading-5 text-slate-500">Your coordinates are sent only after you choose an image. The municipal suggestion is based on the closest OpenStreetMap administrative address and can be corrected when local boundary data changes.</p>
            </div>
          )}
        </div>

        {/* 3. Waste Categorization */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            3. Waste Classification
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_WASTE_CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    active
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat} {active && '✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Description */}
        <div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Description & Visual Landmark
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Describe the extent of the dumping, proximity to water drains, or noticeable hazards..."
              required
            />
          </div>

          <p className="mt-1 text-xs text-slate-500">Severity is calculated from the submitted image by the backend analysis service.</p>
        </div>

        {/* 5. Municipal notification and optional cleanup pledge */}
        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div>
            <label htmlFor="municipality-tag" className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Building2 className="h-4 w-4 text-indigo-600" aria-hidden="true" /> Tag responsible municipality
            </label>
            <select
              id="municipality-tag"
              value={taggedMunicipalityId}
              onChange={(event) => setTaggedMunicipalityId(event.target.value)}
              disabled={!locationResolution}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Do not notify a municipality</option>
              {locationResolution && (
                <option value={locationResolution.municipality.id}>{locationResolution.municipality.name}</option>
              )}
            </select>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">The live location match is selected automatically. Keeping it selected creates a notification visible to that municipality's registered employees.</p>
          </div>

          <div>
            <label htmlFor="initial-pledge" className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <HandCoins className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Initial cleanup pledge (optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input id="initial-pledge" type="number" min="0.01" step="0.01" value={pledgeAmount} onChange={(event) => setPledgeAmount(event.target.value)} placeholder="Amount ₹" className="min-h-11 rounded-lg border border-slate-300 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              <input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="Contact phone" aria-label="Pledge contact phone" className="min-h-11 rounded-lg border border-slate-300 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </div>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">This records a public pledge and contact route; it does not transfer money.</p>
          </div>
        </div>

        {/* Submit Controls */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || locationStatus !== 'resolved'}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Signing Evidence & Submitting...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Submit Signed Evidence Report (+25 Pts on verification)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
