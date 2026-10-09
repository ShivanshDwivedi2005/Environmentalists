import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  Camera,
  CheckCircle2,
  Leaf,
  MapPinned,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { sceneryPosterUrl, sceneryVideoUrl } from '../lib/scenery';

interface HomePageProps {
  onSignIn: () => void;
  onCreateAccount: () => void;
}

const workflow = [
  {
    number: '01',
    title: 'Report',
    description: 'Capture a location-stamped image, describe the waste, and optionally tag the responsible municipality.',
    icon: Camera,
  },
  {
    number: '02',
    title: 'Fund',
    description: 'Pledge any amount toward the cleanup and give volunteers a safe way to coordinate with supporters.',
    icon: BadgeIndianRupee,
  },
  {
    number: '03',
    title: 'Act',
    description: 'Residents, organizations, and municipal teams can claim the work and upload evidence after cleaning.',
    icon: Users,
  },
  {
    number: '04',
    title: 'Verify',
    description: 'Before-and-after evidence creates an auditable resolution and removes cleaned waste from the active map.',
    icon: ShieldCheck,
  },
];

const heroBenefits = [
  { icon: MapPinned, title: 'Location-aware reporting', description: 'Evidence mapped to the responsible region' },
  { icon: BadgeIndianRupee, title: 'Open cleanup support', description: 'Transparent pledges and volunteer contact' },
  { icon: CheckCircle2, title: 'Verified resolution', description: 'Before-and-after proof closes the incident' },
];

export function HomePage({ onSignIn, onCreateAccount }: HomePageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => {
      if (reducedMotion.matches) {
        videoRef.current?.pause();
        setPaused(true);
      } else {
        videoRef.current?.play().then(() => setPaused(false)).catch(() => setPaused(true));
      }
    };

    syncMotionPreference();
    reducedMotion.addEventListener('change', syncMotionPreference);
    return () => reducedMotion.removeEventListener('change', syncMotionPreference);
  }, []);

  const toggleScenery = () => {
    if (paused) {
      videoRef.current?.play().then(() => setPaused(false)).catch(() => setPaused(true));
    } else {
      videoRef.current?.pause();
      setPaused(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <a href="#home-content" className="sr-only z-[70] rounded-lg bg-white px-4 py-3 font-bold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to main content
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/45 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex min-h-11 items-center gap-3 rounded-lg" aria-label="EcoTrack home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/30">
              <Leaf className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight">EcoTrack</span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200 sm:block">Evidence into action</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/75 lg:flex" aria-label="Home navigation">
            <a className="transition-colors hover:text-white" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-white" href="#platform">Platform</a>
            <a className="transition-colors hover:text-white" href="#municipalities">Municipalities</a>
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onSignIn} className="min-h-11 rounded-xl px-3 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:px-4">
              Sign in
            </button>
            <button type="button" onClick={onCreateAccount} className="hidden min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950 transition-colors hover:bg-emerald-100 sm:flex">
              Join EcoTrack <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main id="home-content">
        <section id="top" className="relative flex min-h-[100svh] items-center overflow-hidden pt-24">
          <video
            ref={videoRef}
            poster={sceneryPosterUrl}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={sceneryVideoUrl} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,19,14,0.92)_0%,rgba(2,19,14,0.68)_52%,rgba(2,19,14,0.34)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(2,6,23,0.78)_0%,transparent_42%)]" />

          <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
            <div className="max-w-3xl">
              <div className="home-rise inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-950/45 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Community-powered civic cleanup
              </div>
              <h1 className="home-rise mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-8xl" style={{ animationDelay: '80ms' }}>
                Make waste visible. <span className="text-emerald-300">Make action possible.</span>
              </h1>
              <p className="home-rise mt-7 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg" style={{ animationDelay: '160ms' }}>
                Report polluted places, rally cleanup funding, connect local volunteers, and give municipal teams verified evidence they can act on.
              </p>
              <div className="home-rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '240ms' }}>
                <button type="button" onClick={onCreateAccount} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-black text-slate-950 shadow-xl shadow-emerald-950/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-300">
                  Start with a report <Camera className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={onSignIn} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/35 bg-slate-950/25 px-6 text-sm font-black text-white backdrop-blur-md transition-colors hover:bg-white hover:text-slate-950">
                  Open your dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <aside className="home-rise self-end rounded-3xl border border-white/15 bg-slate-950/45 p-5 backdrop-blur-xl sm:p-6" style={{ animationDelay: '300ms' }}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">One shared workflow</p>
              <div className="mt-5 space-y-4">
                {heroBenefits.map(({ icon: Icon, title, description }) => (
                    <div key={title} className="flex gap-3 border-t border-white/10 pt-4 first:border-0 first:pt-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-200">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-bold">{title}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-300">{description}</p>
                      </div>
                    </div>
                ))}
              </div>
            </aside>
          </div>

          <button type="button" onClick={toggleScenery} aria-label={paused ? 'Play background scenery' : 'Pause background scenery'} title={paused ? 'Play background scenery' : 'Pause background scenery'} className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-slate-950/45 text-white backdrop-blur-md transition-colors hover:bg-slate-950/75">
            {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
          </button>
        </section>

        <section id="how-it-works" className="bg-slate-50 px-4 py-20 text-slate-900 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">From evidence to resolution</p>
            <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <h2 className="max-w-3xl text-4xl font-black tracking-[-0.035em] sm:text-5xl">A cleanup workflow everyone can understand.</h2>
              <p className="max-w-md text-base leading-7 text-slate-600">Every participant sees the same incident, funding, ownership, and verification trail.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {workflow.map(({ number, title, description, icon: Icon }) => (
                <article key={number} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-emerald-700">{number}</span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-2xl font-black">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="bg-white px-4 py-20 text-slate-900 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Built for public trust</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">Not just another complaint form.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">EcoTrack connects the people who notice a problem with the people who can fund, clean, and officially verify the result.</p>
              <button type="button" onClick={onCreateAccount} className="mt-8 flex min-h-12 items-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-black text-white transition-colors hover:bg-emerald-700">
                Create your account <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-3xl bg-emerald-700 p-7 text-white sm:row-span-2 sm:flex sm:flex-col sm:justify-between">
                <ShieldCheck className="h-9 w-9 text-emerald-200" aria-hidden="true" />
                <div className="mt-14">
                  <h3 className="text-2xl font-black">Evidence that stays accountable</h3>
                  <p className="mt-3 text-sm leading-6 text-emerald-50">Image hashes, capture details, and verification status help communities trust what they see.</p>
                </div>
              </article>
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
                <BadgeIndianRupee className="h-8 w-8 text-emerald-700" aria-hidden="true" />
                <h3 className="mt-8 text-xl font-black">Community funding</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Anyone can pledge support and make their contact details available for cleanup coordination.</p>
              </article>
              <article id="municipalities" className="rounded-3xl border border-slate-200 bg-slate-950 p-7 text-white">
                <Building2 className="h-8 w-8 text-emerald-300" aria-hidden="true" />
                <h3 className="mt-8 text-xl font-black">Municipal response</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Tagged reports reach a shared employee inbox with controlled staff registration.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-emerald-400 px-4 py-20 text-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-950/70">Cleaner places start locally</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.035em] sm:text-5xl">See waste. Rally people. Prove the change.</h2>
            </div>
            <button type="button" onClick={onCreateAccount} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-black text-white transition-transform hover:-translate-y-0.5">
              Join the civic network <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm text-slate-400 sm:flex-row sm:items-center">
          <p className="font-bold text-white">EcoTrack</p>
          <p>Report responsibly. Coordinate openly. Verify every cleanup.</p>
        </div>
      </footer>
    </div>
  );
}
