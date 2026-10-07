import { createFileRoute, Link } from "@tanstack/react-router";
import { reports, indiaStates, cleanups } from "@/lib/data";
import { ScoreBadge } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Camera, ArrowRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { scenery, sceneryWebm, sceneryPoster } from "@/lib/scenery";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Terra Ledger — Map, rank and clean up pollution" },
      { name: "description", content: "Photograph pollution across India, explore pollution rankings from state to village, and join local cleanup drives." },
      { property: "og:title", content: "Terra Ledger — Citizen pollution index" },
      { property: "og:description", content: "Photograph pollution, rank every place, and organise cleanups together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  ["01", "Capture", "Open the camera. Time and coordinates are stamped automatically."],
  ["02", "Score", "An independent vision model grades each frame from 0 (clean) to 100."],
  ["03", "Rank", "Scores roll up across India — village, block, district, state."],
  ["04", "Act", "Schedule a drive, find neighbours, prove the change with before/after."],
];

function Index() {
  const india = indiaStates;
  const backgroundVideo = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setPaused(media.matches);
      if (media.matches) backgroundVideo.current?.pause();
      else backgroundVideo.current?.play().catch(() => setPaused(true));
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  function toggleScenery() {
    if (paused) backgroundVideo.current?.play().then(() => setPaused(false)).catch(() => {});
    else { backgroundVideo.current?.pause(); setPaused(true); }
  }
  return (
    <div className="home-scenery">
      <section className="relative flex min-h-[calc(100svh-6rem)] items-center text-scenery-foreground">
        <video ref={backgroundVideo} poster={sceneryPoster.url} autoPlay loop muted playsInline aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover">
          <source src={sceneryWebm.url} type="video/webm" />
          <source src={scenery.url} type="video/mp4" />
        </video>
        <div className="scenery-overlay pointer-events-none fixed inset-0 -z-10" />
        <div className="mx-auto w-full max-w-7xl px-6 py-16 md:py-20">
          <p className="rise font-mono text-xs uppercase">India · Citizen pollution index</p>
          <h1 className="rise mt-5 text-5xl leading-[1.05] md:text-7xl">Terra Ledger</h1>
          <p className="rise mt-6 max-w-lg font-display text-3xl leading-tight md:text-4xl">Make the dirt visible.<br />Then make it gone.</p>
          <p className="rise mt-5 max-w-lg text-base leading-relaxed">A public ledger of land and water pollution across India, written by everyone with a phone — and people who clean it up.</p>
          <div className="rise mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/capture"><Camera />Open camera</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-scenery-foreground/60 bg-scenery-shade/30 text-scenery-foreground hover:bg-scenery-foreground hover:text-scenery-shade"><Link to="/rankings">See rankings<ArrowRight /></Link></Button>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleScenery} aria-label={paused ? "Play scenery" : "Pause scenery"} title={paused ? "Play scenery" : "Pause scenery"} className="fixed right-5 bottom-4 z-30 border border-scenery-foreground/40 bg-scenery-shade/30 text-scenery-foreground hover:bg-scenery-shade/60 hover:text-scenery-foreground">{paused ? <Play /> : <Pause />}</Button>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-8">
        <aside>
          <div className="flex items-center justify-between"><p className="eyebrow">Live state index</p><span className="font-mono text-xs text-muted-foreground">India</span></div>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...india].sort((a, b) => b.score - a.score).map((s, i) => (
              <li key={s.name}>
                <div className="flex justify-between text-sm"><span>{s.name}</span><span className="font-mono">{s.score}</span></div>
                <div className="mt-1.5 h-1 bg-muted"><div className="grow h-full bg-primary" style={{ width: `${s.score}%`, animationDelay: `${400 + i * 90}ms` }} /></div>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <div className="overflow-hidden border-y bg-ink py-4 text-bone">
        <div className="marquee flex w-max gap-12 font-display text-2xl italic">
          {[...reports, ...reports].map((r, i) => <span key={i} className="whitespace-nowrap">{r.place} <span className="font-mono text-sm not-italic text-ochre">{r.score}</span> ✦</span>)}
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <p className="eyebrow">How it works</p>
        <div className="mt-10 grid gap-px divide-y border-y md:grid-cols-4 md:divide-x md:divide-y-0">
          {steps.map(([n, t, d], i) => (
            <div key={n} className="rise p-8" style={{ animationDelay: `${i * 100}ms` }}>
              <span className="font-mono text-sm text-primary">{n}</span>
              <h3 className="mt-6 text-3xl">{t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2">
        <div>
          <div className="flex items-end justify-between"><h2 className="text-4xl">Latest reports</h2><span className="eyebrow">Live</span></div>
          <ul className="mt-6 divide-y border-y">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-card">
                <div><p className="font-medium">{r.place}</p><p className="text-sm text-muted-foreground">{r.note} · {r.type} · {r.time}</p></div>
                <ScoreBadge score={r.score} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-end justify-between"><h2 className="text-4xl">Upcoming drives</h2><Link to="/cleanups" className="eyebrow hover:text-primary">All →</Link></div>
          <div className="mt-6 grid gap-4">
            {cleanups.slice(0, 3).map((c) => (
              <div key={c.id} className="panel lift flex items-center justify-between p-5">
                <div><p className="font-display text-xl">{c.place}</p><p className="text-sm text-muted-foreground">{c.date} · {c.time}</p></div>
                <span className="font-mono text-sm">{c.joined}/{c.need}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
