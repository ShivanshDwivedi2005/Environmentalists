import React from 'react';
import type { User } from '../types';
import { ShieldCheck, MapPin, Camera, Award, BarChart3, CheckCircle2, LogOut } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('map')}>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xl tracking-tight text-slate-900">EcoTrack</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  AI & Verifiable
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Civic Land Pollution & Accountability</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'map' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              GIS Map
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'report' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Camera className="w-4 h-4" />
              Report Pollution
            </button>

            <button
              onClick={() => setActiveTab('cleanups')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'cleanups' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Cleanups & Verify
            </button>

            <button
              onClick={() => setActiveTab('scores')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'scores' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Cleanliness Scores
            </button>

            <button
              onClick={() => setActiveTab('verifier')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'verifier' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Crypto Inspector
            </button>

            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'rewards' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Award className="w-4 h-4" />
              Rewards Ledger
            </button>
          </nav>

          {/* User Controls & Demo Persona Switcher */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2">
                {/* Points Pill */}
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  {currentUser.cached_points} pts
                </div>

                <div className="hidden lg:block text-right">
                  <p className="text-xs font-bold text-slate-800">{currentUser.full_name}</p>
                  <p className="text-[10px] text-slate-500">{currentUser.email}</p>
                </div>

                {/* Role Badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  currentUser.role === 'MUNICIPAL' ? 'bg-purple-100 text-purple-800' :
                  currentUser.role === 'ADMIN' ? 'bg-rose-100 text-rose-800' :
                  currentUser.role === 'ORGANIZATION' ? 'bg-sky-100 text-sky-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {currentUser.role}
                </span>
                <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation */}
      <div className="flex overflow-x-auto border-t border-slate-200 bg-slate-50 px-3 py-2 gap-2 xl:hidden">
        <button
          onClick={() => setActiveTab('map')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'map' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}
        >Map</button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'report' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}
        >Report</button>
        <button
          onClick={() => setActiveTab('cleanups')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'cleanups' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}
        >Cleanups</button>
        <button
          onClick={() => setActiveTab('scores')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'scores' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}
        >Scores</button>
        <button
          onClick={() => setActiveTab('verifier')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'verifier' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}
        >Forensics</button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'rewards' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}
        >Rewards</button>
      </div>
    </header>
  );
};

