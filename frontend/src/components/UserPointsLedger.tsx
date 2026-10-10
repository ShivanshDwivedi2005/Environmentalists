import React, { useState, useEffect } from 'react';
import { Award, Trophy, Clock } from 'lucide-react';
import type { UserStats } from '../types';
import { getMyPoints, getCitizensLeaderboard } from '../api';

export const UserPointsLedger: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [citizenLeaderboard, setCitizenLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [myStats, lb] = await Promise.all([
          getMyPoints(),
          getCitizensLeaderboard()
        ]);
        setStats(myStats);
        setCitizenLeaderboard(lb);
      } catch (err) {
        console.error('Failed to fetch rewards:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-300 text-amber-950 font-bold text-xs uppercase tracking-wider">
                Civic Rewards Ledger
              </span>
              <span className="text-xs text-amber-100">Append-Only Double-Entry Integrity</span>
            </div>
            <h2 className="text-2xl font-bold mt-1">Environmental Impact Points & Badges</h2>
            <p className="text-xs text-amber-100 mt-0.5">
              Points are awarded strictly upon verified outcomes (+25 for verified report, +100 for verified cleanup).
            </p>
          </div>

          <div className="bg-white/15 rounded-2xl p-4 text-center min-w-[140px] backdrop-blur-xs border border-white/20">
            <span className="text-4xl font-black block">{stats?.total_points || 0}</span>
            <span className="text-xs text-amber-100 uppercase font-bold tracking-wider">Total Points</span>
          </div>
        </div>
      </div>

      {/* Badges Earned */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Earned Environmental Badges
        </h3>

        <div className="flex flex-wrap gap-3">
          {stats?.badges && stats.badges.length > 0 ? (
            stats.badges.map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 shadow-2xs"
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span>{badge}</span>
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-400">No badges earned yet. Complete verified reports to earn badges.</span>
          )}
        </div>
      </div>

      {/* 2-Column: Transaction Ledger & Top Citizens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction History (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            Immutable Points Ledger
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Event / Contribution</th>
                  <th className="p-3">Reference Type</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.transactions && stats.transactions.length > 0 ? (
                  stats.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-medium text-slate-800">{tx.reason}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{tx.reference_type}</td>
                      <td className="p-3 text-slate-400">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                          tx.points_delta > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {tx.points_delta > 0 ? `+${tx.points_delta}` : tx.points_delta}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400 text-xs">
                      No points transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Citizens Leaderboard (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Top Citizen Champions
          </h3>

          <div className="space-y-3">
            {citizenLeaderboard.map((c) => (
              <div
                key={c.user_id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                    #{c.rank}
                  </span>
                  <div>
                    <p className="font-bold text-xs text-slate-800">{c.full_name}</p>
                    <span className="text-[10px] text-emerald-700 font-medium">{c.badge}</span>
                  </div>
                </div>

                <span className="font-extrabold text-xs text-slate-900">{c.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
