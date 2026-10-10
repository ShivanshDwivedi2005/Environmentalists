import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Leaf, LockKeyhole, LogIn, RefreshCw, UserPlus } from 'lucide-react';
import { getMunicipalities, loginUser, registerMunicipalEmployee, registerUser } from '../api';
import type { Municipality, User } from '../types';

type AuthMode = 'login' | 'register' | 'employee';

interface AuthScreenProps {
  onAuthenticated: (user: User) => void;
  initialMode?: AuthMode;
  onBackHome: () => void;
}

export function AuthScreen({ onAuthenticated, initialMode = 'login', onBackHome }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [role, setRole] = useState<'CITIZEN' | 'ORGANIZATION'>('CITIZEN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMunicipalities()
      .then((items) => {
        setMunicipalities(items);
        if (items[0]) setMunicipalityId(items[0].id);
      })
      .catch(() => setMunicipalities([]));
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setFullName('');
    setEmployeeId('');
    if (nextMode !== 'login') {
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        const result = await loginUser(email, password);
        onAuthenticated(result.user);
        return;
      }

      if (!fullName.trim()) throw new Error('Enter your full name.');
      if (password.length < 8) throw new Error('Password must contain at least 8 characters.');

      if (mode === 'employee') {
        if (!municipalityId || !employeeId.trim()) {
          throw new Error('Select your municipality and enter the employee ID provided by it.');
        }
        await registerMunicipalEmployee({
          municipality_id: municipalityId,
          employee_id: employeeId.trim(),
          email,
          password,
          full_name: fullName.trim(),
        });
      } else {
        await registerUser({ email, password, full_name: fullName.trim(), role });
      }

      const result = await loginUser(email, password);
      onAuthenticated(result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-slate-950 px-4 py-10 text-slate-900 sm:py-16">
      <button type="button" onClick={onBackHome} className="mx-auto mb-4 flex min-h-11 w-full max-w-5xl items-center gap-2 rounded-xl px-1 text-sm font-bold text-slate-300 transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
      </button>
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700 bg-white lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between bg-emerald-700 p-8 text-white sm:p-10">
          <div>
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Leaf className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100">EcoTrack civic network</p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Report waste. Fund action. Verify cleaner streets.</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-emerald-50">
              Citizens, cleanup volunteers, organizations, and municipal teams share one evidence-backed workflow from first photo to verified resolution.
            </p>
          </div>
          <div className="mt-10 space-y-3 text-sm text-emerald-50">
            <p className="flex items-center gap-2"><LockKeyhole className="h-4 w-4" aria-hidden="true" /> Signed evidence and auditable decisions</p>
            <p className="flex items-center gap-2"><Building2 className="h-4 w-4" aria-hidden="true" /> Municipality-scoped reports and notifications</p>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-7 flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Account access">
            {([
              ['login', 'Sign in'],
              ['register', 'Create account'],
              ['employee', 'Municipal employee'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                className={`min-h-11 flex-1 rounded-lg px-3 text-xs font-bold transition-colors ${
                  mode === value ? 'bg-white text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900">
              {mode === 'login' ? 'Welcome back' : mode === 'employee' ? 'Join your municipal team' : 'Create your EcoTrack account'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'employee'
                ? 'Your municipality must load your employee ID and email before registration.'
                : mode === 'login'
                  ? 'Use your account credentials to continue.'
                  : 'Citizen and organization accounts can be created directly.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

            {mode !== 'login' && (
              <div>
                <label htmlFor="full-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label>
                <input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" autoComplete="name" />
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label htmlFor="account-role" className="mb-1.5 block text-sm font-semibold text-slate-700">Account type</label>
                <select id="account-role" value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                  <option value="CITIZEN">Citizen</option>
                  <option value="ORGANIZATION">Cleanup organization</option>
                </select>
              </div>
            )}

            {mode === 'employee' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="municipality" className="mb-1.5 block text-sm font-semibold text-slate-700">Municipality</label>
                  <select id="municipality" value={municipalityId} onChange={(event) => setMunicipalityId(event.target.value)} required className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                    <option value="">Select municipality</option>
                    {municipalities.map((municipality) => <option key={municipality.id} value={municipality.id}>{municipality.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="employee-id" className="mb-1.5 block text-sm font-semibold text-slate-700">Employee ID</label>
                  <input id="employee-id" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
              <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" autoComplete="email" />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>

            <button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : mode === 'login' ? <LogIn className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register and continue'}
            </button>
          </form>

        </section>
      </div>
    </main>
  );
}
