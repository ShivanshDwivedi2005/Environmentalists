import { useState, useEffect } from 'react';
import type { User, Report, Cleanup, Evidence } from './types';
import { loginUser, getMe, getReports, getCleanups, removeAuthToken } from './api';
import { Navbar } from './components/Navbar';
import { PollutionMap } from './components/PollutionMap';
import { ReportForm } from './components/ReportForm';
import { CleanupModal } from './components/CleanupModal';
import { EvidenceVerifierModal } from './components/EvidenceVerifierModal';
import { MunicipalDashboard } from './components/MunicipalDashboard';
import { CleanlinessScoreboard } from './components/CleanlinessScoreboard';
import { UserPointsLedger } from './components/UserPointsLedger';
import {
  MapPin, Camera, ShieldCheck, CheckCircle2,
  RefreshCw
} from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('map');
  const [reports, setReports] = useState<Report[]>([]);
  const [cleanups, setCleanups] = useState<Cleanup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected entities for modals / inspect
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [inspectEvidence, setInspectEvidence] = useState<Evidence | null>(null);
  const [cleanupTargetReport, setCleanupTargetReport] = useState<Report | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  // Initial login / fetch
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        // Try getting existing profile or auto-login default demo citizen
        try {
          const user = await getMe();
          setCurrentUser(user);
        } catch {
          const res = await loginUser('citizen@ecotrack.org', 'password123');
          setCurrentUser(res.user);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const refreshAllData = async () => {
    try {
      const [reps, cleans] = await Promise.all([
        getReports({
          status: statusFilter || undefined,
          severity: severityFilter || undefined
        }),
        getCleanups()
      ]);
      setReports(reps);
      setCleanups(cleans);
      if (currentUser) {
        const updatedMe = await getMe();
        setCurrentUser(updatedMe);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshAllData();
    }
  }, [currentUser, statusFilter, severityFilter]);

  const handleSwitchUser = async (email: string) => {
    try {
      setIsLoading(true);
      removeAuthToken();
      const res = await loginUser(email, 'password123');
      setCurrentUser(res.user);
      // Auto-navigate to appropriate view
      if (res.user.role === 'MUNICIPAL') {
        setActiveTab('cleanups');
      } else {
        setActiveTab('map');
      }
    } catch (err: any) {
      alert(err.message || 'Switch persona failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setCurrentUser(null);
  };

  const handleReportCreated = (newReport: Report) => {
    setReports([newReport, ...reports]);
    setSelectedReport(newReport);
    setActiveTab('map');
  };

  const handleCleanupSubmitted = (newCleanup: Cleanup) => {
    setCleanups([newCleanup, ...cleanups]);
    setCleanupTargetReport(null);
    refreshAllData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading state */}
        {isLoading && !currentUser ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-sm font-semibold text-slate-600">Initializing EcoTrack Platform...</span>
          </div>
        ) : (
          <>
            {/* TAB: Interactive GIS Map */}
            {activeTab === 'map' && (
              <div className="space-y-6">
                {/* Map Header & Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      Live Pollution Incident Map
                    </h2>
                    <p className="text-xs text-slate-500">
                      Real-time incidents verified with cryptographic manifests and municipal jurisdictions.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
                    >
                      <option value="">All Statuses</option>
                      <option value="VERIFIED">Verified Active</option>
                      <option value="ASSIGNED">Assigned to Crew</option>
                      <option value="CLEANING_IN_PROGRESS">Cleaning In Progress</option>
                      <option value="CLEANED_AND_VERIFIED">Cleaned & Verified ✓</option>
                    </select>

                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
                    >
                      <option value="">All Severities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>

                    <button
                      onClick={() => setActiveTab('report')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Report Incident
                    </button>
                  </div>
                </div>

                {/* Main 2-Col Layout: Map + Incident Drawer */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[620px]">
                  {/* Left 2 Cols: Leaflet GIS Map */}
                  <div className="lg:col-span-2 h-full">
                    <PollutionMap
                      reports={reports}
                      onSelectReport={(r) => setSelectedReport(r)}
                      selectedReportId={selectedReport?.id}
                    />
                  </div>

                  {/* Right 1 Col: Selected Report Inspector / Incident List */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-y-auto h-full space-y-4">
                    {selectedReport ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            selectedReport.status === 'CLEANED_AND_VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {selectedReport.status}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(selectedReport.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {selectedReport.evidence[0] && (
                          <div className="relative rounded-xl overflow-hidden border border-slate-200">
                            <img
                              src={selectedReport.evidence[0].file_url}
                              alt="Report evidence"
                              className="w-full h-44 object-cover"
                            />
                            <button
                              onClick={() => setInspectEvidence(selectedReport.evidence[0])}
                              className="absolute bottom-2 right-2 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold rounded-md flex items-center gap-1 backdrop-blur-xs"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              Verify SHA-256
                            </button>
                          </div>
                        )}

                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{selectedReport.address}</h4>
                          <p className="text-xs text-slate-600 mt-1">{selectedReport.description}</p>
                        </div>

                        {/* AI Waste Tags */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            AI Classified Waste Types
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {selectedReport.waste_categories.map((c) => (
                              <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Jurisdictional Assignment */}
                        <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Region:</span>
                            <span className="font-semibold text-slate-800">{selectedReport.region_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Authority:</span>
                            <span className="font-semibold text-slate-800">{selectedReport.municipality_name || 'NMC Nagpur'}</span>
                          </div>
                          {selectedReport.assigned_to && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Assigned Crew:</span>
                              <span className="font-semibold text-emerald-700">{selectedReport.assigned_to}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {selectedReport.status !== 'CLEANED_AND_VERIFIED' && (
                          <button
                            onClick={() => setCleanupTargetReport(selectedReport)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Submit Cleanup Drive Evidence (+100 Pts)
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-slate-400 text-xs">
                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Click on any map marker to inspect its verified evidence, severity, and cleanup history.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Report Pollution */}
            {activeTab === 'report' && (
              <ReportForm
                onReportCreated={handleReportCreated}
                onCancel={() => setActiveTab('map')}
              />
            )}

            {/* TAB: Cleanups & Municipal Hub */}
            {activeTab === 'cleanups' && (
              <MunicipalDashboard
                currentUser={currentUser!}
                reports={reports}
                cleanups={cleanups}
                onDataRefresh={refreshAllData}
                onInspectEvidence={(ev) => setInspectEvidence(ev)}
              />
            )}

            {/* TAB: Hierarchical Scores */}
            {activeTab === 'scores' && (
              <CleanlinessScoreboard />
            )}

            {/* TAB: Cryptographic Verifier Direct */}
            {activeTab === 'verifier' && (
              <div className="max-w-3xl mx-auto space-y-6 py-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Cryptographic Forensics Hub</h2>
                      <p className="text-xs text-slate-500">
                        Inspect byte hashes, verify HMAC-SHA256 signatures, and run tamper checks.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Select an evidence item from any report below to inspect its cryptographic manifest and verify that no server-side or third-party image manipulation has occurred:
                  </p>

                  <div className="space-y-3">
                    {reports.map((r) => {
                      const ev = r.evidence[0];
                      if (!ev) return null;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <img src={ev.file_url} alt="Ev" className="w-12 h-12 rounded-lg object-cover" />
                            <div className="text-xs">
                              <p className="font-bold text-slate-900">{r.address}</p>
                              <p className="font-mono text-[10px] text-slate-400">
                                SHA-256: {ev.sha256_hash.substring(0, 24)}...
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setInspectEvidence(ev)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Inspect Forensics
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Rewards Ledger */}
            {activeTab === 'rewards' && (
              <UserPointsLedger />
            )}
          </>
        )}
      </main>

      {/* MODAL: Cleanup Submission */}
      {cleanupTargetReport && (
        <CleanupModal
          report={cleanupTargetReport}
          onClose={() => setCleanupTargetReport(null)}
          onCleanupSubmitted={handleCleanupSubmitted}
        />
      )}

      {/* MODAL: Cryptographic Forensics Inspector */}
      {inspectEvidence && (
        <EvidenceVerifierModal
          evidence={inspectEvidence}
          onClose={() => setInspectEvidence(null)}
        />
      )}
    </div>
  );
}
export default App;
