import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import type { Report, Cleanup, User } from '../types';
import { updateReportStatus, verifyCleanup } from '../api';

interface MunicipalDashboardProps {
  currentUser: User;
  reports: Report[];
  cleanups: Cleanup[];
  onDataRefresh: () => void;
  onInspectEvidence: (evidence: any) => void;
}

export const MunicipalDashboard: React.FC<MunicipalDashboardProps> = ({
  currentUser,
  reports,
  cleanups,
  onDataRefresh,
  onInspectEvidence
}) => {
  const [selectedCrew, setSelectedCrew] = useState<Record<string, string>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const pendingCleanups = cleanups.filter((c) => c.status === 'SUBMITTED');
  const activeReports = reports.filter((r) => r.status !== 'CLEANED_AND_VERIFIED');

  const handleAssignCrew = async (reportId: string) => {
    const crewName = selectedCrew[reportId] || 'NMC Sanitation Rapid Response Team';
    try {
      setLoadingAction(`assign-${reportId}`);
      await updateReportStatus(reportId, 'ASSIGNED', crewName);
      onDataRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to assign team');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleVerifyCleanup = async (cleanupId: string, approve: boolean) => {
    try {
      setLoadingAction(`verify-${cleanupId}`);
      await verifyCleanup(
        cleanupId,
        approve ? 'VERIFIED' : 'REJECTED',
        approve ? 'Inspected by Municipal Sanitation Officer. Site sanitized.' : 'Insufficient cleanup. Area requires re-work.'
      );
      onDataRefresh();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Jurisdiction Banner */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-300 text-purple-950 font-bold text-xs uppercase tracking-wider">
                Authorized Jurisdiction
              </span>
              <span className="text-xs text-purple-200">Enforced by RBAC Guard</span>
            </div>
            <h2 className="text-2xl font-bold mt-1">Nagpur Municipal Corporation (NMC) Hub</h2>
            <p className="text-xs text-purple-200 mt-0.5">
              Supervising Officer: <strong>{currentUser.full_name}</strong> | All actions are cryptographically signed & audited.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/10 rounded-xl p-3 text-center min-w-[90px] backdrop-blur-xs">
              <span className="text-2xl font-extrabold block">{activeReports.length}</span>
              <span className="text-[10px] text-purple-200 uppercase font-bold">Open Reports</span>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center min-w-[90px] backdrop-blur-xs">
              <span className="text-2xl font-extrabold text-amber-300 block">{pendingCleanups.length}</span>
              <span className="text-[10px] text-purple-200 uppercase font-bold">Pending Review</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Queue (Before & After) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Cleanup Verification Queue ({pendingCleanups.length})
            </h3>
            <p className="text-xs text-slate-500">
              Verify submitted cleanups with AI image delta analysis to release community points.
            </p>
          </div>
        </div>

        {pendingCleanups.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            No cleanups currently awaiting verification.
          </div>
        ) : (
          <div className="space-y-6">
            {pendingCleanups.map((cleanup) => {
              const beforeEv = cleanup.before_evidence;
              const afterEv = cleanup.after_evidence;
              return (
                <div key={cleanup.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Cleanup by: {cleanup.organizer_name}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-2">
                        Completed on {cleanup.completed_at ? new Date(cleanup.completed_at).toLocaleDateString() : 'Today'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                        AI Cleanliness Delta: +{Math.round(cleanup.ai_cleanliness_delta * 100)}% Improvement
                      </span>
                    </div>
                  </div>

                  {/* Side-by-Side Photos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Before Photo */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
                        <span>Before Cleanup</span>
                        {beforeEv && (
                          <button
                            onClick={() => onInspectEvidence(beforeEv)}
                            className="text-emerald-700 text-[10px] hover:underline"
                          >
                            Inspect SHA-256
                          </button>
                        )}
                      </span>
                      {beforeEv ? (
                        <img
                          src={beforeEv.file_url}
                          alt="Before cleanup"
                          className="w-full h-44 object-cover rounded-lg border border-slate-300"
                        />
                      ) : (
                        <div className="w-full h-44 bg-slate-200 rounded-lg flex items-center justify-center text-xs">
                          No Before Photo
                        </div>
                      )}
                    </div>

                    {/* After Photo */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
                        <span>After Cleanup</span>
                        {afterEv && (
                          <button
                            onClick={() => onInspectEvidence(afterEv)}
                            className="text-emerald-700 text-[10px] hover:underline"
                          >
                            Inspect SHA-256
                          </button>
                        )}
                      </span>
                      {afterEv ? (
                        <img
                          src={afterEv.file_url}
                          alt="After cleanup"
                          className="w-full h-44 object-cover rounded-lg border border-emerald-300 ring-2 ring-emerald-500/20"
                        />
                      ) : (
                        <div className="w-full h-44 bg-slate-200 rounded-lg flex items-center justify-center text-xs">
                          No After Photo
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleVerifyCleanup(cleanup.id, false)}
                      disabled={loadingAction === `verify-${cleanup.id}`}
                      className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors"
                    >
                      Reject (Re-Clean)
                    </button>
                    <button
                      onClick={() => handleVerifyCleanup(cleanup.id, true)}
                      disabled={loadingAction === `verify-${cleanup.id}`}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                    >
                      {loadingAction === `verify-${cleanup.id}` ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      Confirm Verified & Release Points (+100 Pts)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incident Reports Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Active Incident Reports in Jurisdiction
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Location / Address</th>
                <th className="p-3">Waste Types</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sanitation Assignment</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-medium text-slate-800 max-w-[200px]">
                    <div>{r.address}</div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {r.waste_categories.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                      r.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      r.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-700">{r.status}</span>
                  </td>
                  <td className="p-3">
                    {r.assigned_to ? (
                      <span className="text-emerald-700 font-medium">{r.assigned_to}</span>
                    ) : (
                      <select
                        className="text-[11px] border border-slate-300 rounded px-2 py-1 bg-white"
                        value={selectedCrew[r.id] || ''}
                        onChange={(e) => setSelectedCrew({ ...selectedCrew, [r.id]: e.target.value })}
                      >
                        <option value="">Select Sanitation Unit</option>
                        <option value="NMC Central Zone Rapid Action">NMC Central Zone Rapid Action</option>
                        <option value="NMC West Zone Sanitation Truck">NMC West Zone Sanitation Truck</option>
                        <option value="Green Earth Volunteer Squad">Green Earth Volunteer Squad</option>
                      </select>
                    )}
                  </td>
                  <td className="p-3">
                    {!r.assigned_to && r.status !== 'CLEANED_AND_VERIFIED' ? (
                      <button
                        onClick={() => handleAssignCrew(r.id)}
                        disabled={loadingAction === `assign-${r.id}`}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold"
                      >
                        Assign Unit
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">Assigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
