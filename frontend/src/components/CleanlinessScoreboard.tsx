import React, { useState, useEffect } from 'react';
import { BarChart3, Award, CheckCircle, RefreshCw } from 'lucide-react';
import type { AdministrativeRegion, LeaderboardItem } from '../types';
import { getRegionsSummary, getLeaderboard } from '../api';

export const CleanlinessScoreboard: React.FC = () => {
  const [regions, setRegions] = useState<AdministrativeRegion[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [regs, lb] = await Promise.all([
        getRegionsSummary(),
        getLeaderboard()
      ]);
      setRegions(regs);
      setLeaderboard(lb);
    } catch (err) {
      console.error('Failed to load scoreboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const district = regions.find((r) => r.region_type === 'DISTRICT');
  const wards = regions.filter((r) => r.region_type === 'WARD');

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 65) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Hierarchical Cleanliness Scoring Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic multi-tier aggregation factoring in open report severity, age decay, and verified cleanup bonuses.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="self-start sm:self-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Scores
        </button>
      </div>

      {/* Top Level Cards: Country & District */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* District Card */}
        {district && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {district.region_type} Aggregate
              </span>
              <span className="text-xs text-slate-400 font-mono">{district.code}</span>
            </div>

            <h3 className="text-xl font-bold mt-2">{district.name}</h3>
            <p className="text-xs text-slate-400">
              Aggregated across {wards.length} administrative wards & population of {district.population.toLocaleString()}.
            </p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-5xl font-black text-emerald-400">
                {district.cleanliness_score.toFixed(1)}
              </span>
              <span className="text-slate-400 text-sm font-semibold">/ 100 Cleanliness Index</span>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${district.cleanliness_score}%` }}
              />
            </div>
          </div>
        )}

        {/* Scoring Methodology Box */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Mathematical Scoring Specification</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              EcoTrack enforces an anti-reporting bias formulation. Areas with high citizen vigilance are not penalized; unresolved incidents decay over time to prioritize action.
            </p>

            <div className="space-y-1.5 text-xs text-slate-700 font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div><strong>RawPenalty:</strong> Σ (Weight[severity] × AI_Conf × AgeDecay)</div>
              <div><strong>AgeDecay:</strong> 1.0 + min(1.0, DaysOpen / 30 × 0.5)</div>
              <div><strong>CleanupBonus:</strong> min(25.0, Σ 10.0 × AI_Delta)</div>
              <div><strong>Score:</strong> clamp(100 - Penalty + Bonus, 0, 100)</div>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-slate-400 italic">
            *All historic scoring changes are logged to the cryptographic audit trail.
          </div>
        </div>
      </div>

      {/* Ward-Level Breakdown Cards */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Ward-Level Cleanliness Indexes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {wards.map((ward) => (
            <div key={ward.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {ward.code}
                </span>
                <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${getScoreColor(ward.cleanliness_score)}`}>
                  {ward.cleanliness_score.toFixed(1)} / 100
                </span>
              </div>

              <h4 className="font-bold text-slate-900 text-base mt-2">{ward.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Pop: {ward.population.toLocaleString()} | Area: {ward.area_sq_km} sq km
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Active Monitoring
                </span>
                <span className="font-semibold text-emerald-700">Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Regional Cleanliness Leaderboard
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Region Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Cleanliness Score</th>
                <th className="p-3">Verified Cleanups</th>
                <th className="p-3">Civic Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.map((item) => (
                <tr key={item.region_id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                      item.rank === 1 ? 'bg-amber-100 text-amber-800' :
                      item.rank === 2 ? 'bg-slate-200 text-slate-800' :
                      item.rank === 3 ? 'bg-amber-50 text-amber-900' : 'text-slate-500'
                    }`}>
                      #{item.rank}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-800">{item.region_name}</td>
                  <td className="p-3 text-slate-500">{item.region_type}</td>
                  <td className="p-3">
                    <span className="font-extrabold text-sm text-slate-900">{item.score.toFixed(1)}</span>
                    <span className="text-[11px] text-slate-400">/100</span>
                  </td>
                  <td className="p-3 font-medium text-emerald-700">{item.cleanups_count} cleanups</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.status_label}
                    </span>
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
