import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Upload, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { createReport } from '../api';
import type { Report } from '../types';

interface ReportFormProps {
  onReportCreated: (newReport: Report) => void;
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
  const [latitude, setLatitude] = useState<number>(21.1458);
  const [longitude, setLongitude] = useState<number>(79.0882);
  const [accuracy, setAccuracy] = useState<number>(4.5);
  const [address, setAddress] = useState<string>('Sitabuldi Market Road, Ward 12, Nagpur');

  // Form fields
  const [description, setDescription] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Plastic Waste']);
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // GPS auto-fetch
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setAccuracy(pos.coords.accuracy || 5.0);
        },
        (err) => {
          console.warn('Geolocation query warning, using standard coordinates:', err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

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
          setPhotoBlob(blob);
          setPhotoPreview(URL.createObjectURL(blob));
          setCaptureMethod('IN_APP_CAMERA');
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
      setPhotoBlob(file);
      setPhotoPreview(URL.createObjectURL(file));
      setCaptureMethod('FILE_UPLOAD');
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

      const created = await createReport(formData);
      onReportCreated(created);
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
                  onClick={() => { setPhotoBlob(null); setPhotoPreview(null); }}
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
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* 2. Geolocation Coordinates */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            2. Verified Geolocation
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500">GPS Coordinates (Lat / Lng)</label>
              <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
                <span className="text-[10px] text-slate-400 ml-auto">(±{accuracy}m)</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Street / Area Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="e.g. Near Dharampeth square"
                required
              />
            </div>
          </div>
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

        {/* 4. Description & Severity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Estimated Severity
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="LOW">LOW (Scattered litter)</option>
              <option value="MEDIUM">MEDIUM (Moderate pile)</option>
              <option value="HIGH">HIGH (Major dumping)</option>
              <option value="CRITICAL">CRITICAL (Hazardous / Drain blocking)</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              *The AI engine will cross-evaluate severity and edge clutter upon upload.
            </p>
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
            disabled={isSubmitting}
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
