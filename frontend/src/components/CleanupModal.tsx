import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, X, RefreshCw, Upload, AlertCircle } from 'lucide-react';
import type { Report, Cleanup } from '../types';
import { createCleanup, submitCleanupEvidence } from '../api';

interface CleanupModalProps {
  report: Report;
  onClose: () => void;
  onCleanupSubmitted: (cleanup: Cleanup) => void;
}

export const CleanupModal: React.FC<CleanupModalProps> = ({
  report,
  onClose,
  onCleanupSubmitted
}) => {
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const beforeEvidence = report.evidence.find((e) => e.evidence_type === 'BEFORE_POLLUTION');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoBlob(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoBlob) {
      setErrorMsg('Please upload or snap an after-cleanup photograph.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // 1. Create or ensure cleanup object exists
      const cleanup = await createCleanup(report.id);

      // 2. Submit after evidence
      const formData = new FormData();
      formData.append('file', photoBlob, 'after_cleanup.jpg');
      formData.append('latitude', report.latitude.toString());
      formData.append('longitude', report.longitude.toString());
      formData.append('capture_method', 'IN_APP_CAMERA');

      const completedCleanup = await submitCleanupEvidence(cleanup.id, formData);
      onCleanupSubmitted(completedCleanup);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit cleanup evidence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in duration-200">
        <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <h3 className="font-bold text-lg">Submit Verified Cleanup Evidence</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-emerald-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Before Evidence Summary */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Reference: Original Before-Cleaning Evidence
            </span>
            <div className="mt-2 flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              {beforeEvidence ? (
                <img
                  src={beforeEvidence.file_url}
                  alt="Before pollution"
                  className="w-24 h-24 object-cover rounded-lg border border-slate-300 shrink-0"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400">
                  No Photo
                </div>
              )}
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-800">{report.address}</p>
                <p className="text-slate-600">{report.description}</p>
                {beforeEvidence && (
                  <p className="font-mono text-[10px] text-slate-400 break-all">
                    SHA-256: {beforeEvidence.sha256_hash.substring(0, 24)}...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* After Evidence Upload */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Upload After-Cleaning Photograph
            </span>

            {photoPreview ? (
              <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
                <img src={photoPreview} alt="After cleanup preview" className="w-full h-48 object-cover rounded-lg" />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Ready for AI Before/After Delta Evaluation
                  </span>
                  <button
                    type="button"
                    onClick={() => { setPhotoBlob(null); setPhotoPreview(null); }}
                    className="text-rose-600 font-semibold hover:underline"
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            ) : (
              <label className="mt-2 flex flex-col items-center justify-center p-8 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition-colors">
                <Upload className="w-8 h-8 text-emerald-600 mb-2" />
                <span className="text-xs font-bold text-emerald-900">Upload or Snap Cleaned Site Photo</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Captures same angle and coordinates for comparison</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Integrity Rule:</strong> Submitting an after-photo immediately computes its cryptographic SHA-256 digest, server signature, and visual edge-reduction delta. Rewards (+100 pts) are released upon municipal authority confirmation.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !photoBlob}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Evaluating Delta & Registering...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Submit for Verification (+100 Pts)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
