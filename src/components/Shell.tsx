import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { scoreTone } from "@/lib/data";

const nav = [
  { to: "/capture", label: "Capture" },
  { to: "/rankings", label: "Rankings" },
  { to: "/cleanups", label: "Cleanups" },
  { to: "/water-land", label: "Water & Land" },
  { to: "/organizations", label: "Organisations" },
  { to: "/municipal", label: "Municipal" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl italic">Terra</span>
          <span className="eyebrow">Ledger</span>
        </Link>
        <nav className="hidden gap-6 text-sm lg:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground underline underline-offset-8 decoration-primary" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Link to="/capture" className="rounded-sm bg-ink px-4 py-2 text-sm text-bone transition-colors hover:bg-primary">Report pollution</Link>
      </div>
      <nav className="flex gap-5 overflow-x-auto px-6 pb-3 text-sm lg:hidden">
        {nav.map((n) => <Link key={n.to} to={n.to} className="whitespace-nowrap text-muted-foreground">{n.label}</Link>)}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-32 border-t">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-6 py-10 md:flex-row">
        <p className="font-display text-xl italic">Every photograph is a vote for cleaner ground.</p>
        <p className="eyebrow">Terra Ledger · Citizen pollution index</p>
      </div>
    </footer>
  );
}

export function PageHead({ eyebrow, title, intro, children }: { eyebrow: string; title: ReactNode; intro?: string; children?: ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-16 pb-10">
      <p className="eyebrow rise">{eyebrow}</p>
      <h1 className="rise mt-4 max-w-4xl text-5xl leading-[1.02] md:text-7xl" style={{ animationDelay: "80ms" }}>{title}</h1>
      {intro && <p className="rise mt-6 max-w-2xl text-lg text-muted-foreground" style={{ animationDelay: "160ms" }}>{intro}</p>}
      {children}
    </section>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const t = scoreTone(score);
  return <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-xs ${t.cls}`}>{score}<span className="opacity-80">· {t.label}</span></span>;
}
