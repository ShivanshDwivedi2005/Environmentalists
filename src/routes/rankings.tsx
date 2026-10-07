import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHead, ScoreBadge } from "@/components/Shell";
import { rankingAreas, LEVELS, type Place } from "@/lib/data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/rankings")({
  head: () => ({
    meta: [
      { title: "Dirtiness rankings — Terra Ledger" },
      { name: "description", content: "Ranked pollution scores across India's states, districts, blocks and villages." },
      { property: "og:title", content: "Dirtiness rankings — Terra Ledger" },
      { property: "og:description", content: "Explore India's pollution rankings from state to village." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Rankings,
});

function Rankings() {
  const [path, setPath] = useState<Place[]>([]);
  const list = rankingAreas(path);
  const level = LEVELS[path.length];
  const sorted = [...list].sort((a, b) => b.score - a.score);

  return (
    <>
      <PageHead eyebrow="India · Pollution index" title={<>Ranked, from <em className="text-primary">state</em> to village.</>} intro="Pollution scores across India. Higher means dirtier." />
      <section className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-center gap-2 border-b pb-4">
          {LEVELS.map((l, i) => (
            <span key={l} className={`eyebrow rounded-sm px-2 py-1 ${i === path.length ? "bg-ink text-bone" : i < path.length ? "text-foreground" : "opacity-40"}`}>{l}</span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Button variant="link" onClick={() => setPath([])} className="h-auto p-0">India</Button>
          {path.map((p, i) => (
            <span key={p.name} className="flex items-center gap-2"><span className="text-muted-foreground">/</span>
              <Button variant="link" onClick={() => setPath(path.slice(0, i + 1))} className="h-auto p-0">{p.name}</Button></span>
          ))}
        </div>

        <ol key={path.map((p) => p.name).join("/")} className="mt-8 border-t">
          {sorted.length === 0 && <li className="py-10 text-muted-foreground">No sub-areas reported yet at {level} level.</li>}
          {sorted.map((p, i) => (
            <li key={p.name} className="rise" style={{ animationDelay: `${i * 60}ms` }}>
              <Button variant="ghost" disabled={!p.children} onClick={() => setPath([...path, p])} className="group grid h-auto w-full grid-cols-12 items-center gap-3 whitespace-normal rounded-none border-b px-0 py-5 text-left font-normal disabled:opacity-100 enabled:hover:bg-card enabled:hover:text-foreground">
                <span className="col-span-1 font-display text-3xl italic text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="col-span-5 md:col-span-4"><span className="font-display text-2xl">{p.name}</span>{p.children && <span className="ml-2 text-primary opacity-0 transition-opacity group-hover:opacity-100">→</span>}</span>
                <span className="col-span-3 hidden md:block"><span className="block h-1 bg-muted"><span className="grow block h-full bg-primary" style={{ width: `${p.score}%` }} /></span></span>
                <span className="col-span-3 text-right font-mono text-xs text-muted-foreground md:col-span-2">{p.reports.toLocaleString()} reports<br /><span className={p.trend > 0 ? "text-destructive" : "text-accent"}>{p.trend > 0 ? "▲" : "▼"} {Math.abs(p.trend)}%</span></span>
                <span className="col-span-3 text-right md:col-span-2"><ScoreBadge score={p.score} /></span>
              </Button>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
