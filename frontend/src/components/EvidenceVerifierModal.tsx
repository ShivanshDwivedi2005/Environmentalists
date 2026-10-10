import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, FileText, X, RefreshCw } from 'lucide-react';
import type { Evidence, EvidenceVerificationResult } from '../types';
import { assetUrl, verifyEvidence } from '../api';

interface EvidenceVerifierModalProps {
  evidence: Evidence;
  onClose: () => void;
}

export const EvidenceVerifierModal: React.FC<EvidenceVerifierModalProps> = ({
  evidence,
  onClose
}) => {
  const [result, setResult] = useState<EvidenceVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runVerification = async () => {
    try {
      setIsVerifying(true);
      setError(null);
      const res = await verifyEvidence(evidence.id);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  let manifestObj: any = {};
  try {
    manifestObj = JSON.parse(evidence.signed_manifest);
  } catch {
    manifestObj = {};
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg">Cryptographic Evidence Verifier</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Verification Status Banner */}
          {result ? (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              result.tamper_detected
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {result.tamper_detected ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {result.tamper_detected ? 'TAMPERING DETECTED' : 'CRYPTOGRAPHIC INTEGRITY VERIFIED'}
                </p>
                <p className="text-xs mt-1">{result.details}</p>
                <div className="mt-2 text-[11px] grid grid-cols-2 gap-2">
                  <span>Hash Matches: <strong>{result.hash_matches ? 'YES' : 'NO'}</strong></span>
                  <span>Signature Valid: <strong>{result.signature_valid ? 'YES' : 'NO'}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-sky-100 bg-sky-50 text-sky-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Evidence Registered in Tamper-Proof Chain</p>
                <p className="text-[11px] text-sky-600">Run byte-level SHA-256 and HMAC signature re-check on server.</p>
              </div>
              <button
                type="button"
                onClick={runVerification}
                disabled={isVerifying}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Run Live Forensics
              </button>
            </div>
          )}

          {/* Image and Hashes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <img
                src={assetUrl(evidence.file_url)}
                alt="Evidence snapshot"
                className="w-full h-36 object-cover rounded-xl border border-slate-200"
              />
              <span className="block text-center text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                {evidence.evidence_type.replace('_', ' ')}
              </span>
            </div>

            <div className="sm:col-span-2 space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Original SHA-256 Digest</span>
                <span className="font-mono text-[11px] text-slate-800 break-all select-all">{evidence.sha256_hash}</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Server HMAC-SHA256 Signature</span>
                <span className="font-mono text-[11px] text-slate-800 break-all select-all">{evidence.manifest_signature}</span>
              </div>
            </div>
          </div>

          {/* Canonical Manifest JSON */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Signed Canonical Evidence Manifest</span>
            </div>
            <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-36">
              {JSON.stringify(manifestObj, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
