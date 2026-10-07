import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHead } from "@/components/Shell";
import { cleanups as seed, volunteers } from "@/lib/data";

export const Route = createFileRoute("/cleanups")({
  head: () => ({
    meta: [
      { title: "Cleanup drives — Terra Ledger" },
      { name: "description", content: "Schedule cleanup drives, get matched with neighbours and earn impact scores from before/after photos." },
      { property: "og:title", content: "Cleanup drives — Terra Ledger" },
      { property: "og:description", content: "Pick a time and place; we match you with people cleaning the same area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cleanups,
});

function Cleanups() {
  const [list, setList] = useState(seed);
  const [joined, setJoined] = useState<number[]>([]);
  const [form, setForm] = useState({ place: "", date: "", time: "" });
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.place || !form.date) return;
    setList([{ id: Date.now(), place: form.place, date: form.date, time: form.time || "Flexible", joined: 1, need: 20, lead: "You" }, ...list]);
    setForm({ place: "", date: "", time: "" });
  };
  const toggle = (id: number) => setJoined((j) => (j.includes(id) ? j.filter((x) => x !== id) : [...j, id]));
  const file = (set: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) set(URL.createObjectURL(f)); };
  const inp = "w-full rounded-sm border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <>
      <PageHead eyebrow="Collective action" title={<>Pick a time. <em className="text-accent">Find your crew.</em></>} intro="Set when and where you want to clean. We match you with others nearby, and your before/after photos earn an impact score." />
      <section className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-3">
        <form onSubmit={add} className="panel h-fit space-y-4 p-6">
          <h2 className="text-2xl">Schedule a drive</h2>
          <input className={inp} placeholder="Location (e.g. Gomti Riverfront)" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
          <input className={inp} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className={inp} placeholder="Time window (e.g. 07:00 – 10:00)" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <button className="w-full rounded-sm bg-accent py-3 text-accent-foreground transition-opacity hover:opacity-90">Find people near me</button>
        </form>

        <div className="space-y-4 lg:col-span-2">
          {list.map((c, i) => {
            const on = joined.includes(c.id); const n = c.joined + (on ? 1 : 0);
            return (
              <div key={c.id} className="panel lift rise grid items-center gap-4 p-6 md:grid-cols-4" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="md:col-span-2"><p className="font-display text-2xl">{c.place}</p><p className="text-sm text-muted-foreground">{c.date} · {c.time} · led by {c.lead}</p></div>
                <div><div className="h-1 bg-muted"><div className="h-full bg-accent transition-all duration-700" style={{ width: `${Math.min(100, (n / c.need) * 100)}%` }} /></div><p className="mt-2 font-mono text-xs">{n} of {c.need} volunteers</p></div>
                <button onClick={() => toggle(c.id)} className={`rounded-sm px-4 py-2 text-sm transition-colors ${on ? "bg-ink text-bone" : "border hover:bg-muted"}`}>{on ? "Joined ✓" : "Join drive"}</button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-24 grid max-w-7xl gap-10 px-6 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Proof of work</p>
          <h2 className="mt-3 text-4xl">Before &amp; after</h2>
          <p className="mt-3 text-muted-foreground">The score difference between your two photos becomes your impact rating.</p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {[["Before", before, setBefore], ["After", after, setAfter]].map(([label, src, set]) => (
              <label key={label as string} className="panel flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden hover:bg-muted">
                {src ? <img src={src as string} alt={label as string} className="h-full w-full object-cover" /> : <><span className="font-display text-2xl italic">{label as string}</span><span className="eyebrow mt-2">Tap to add</span></>}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={file(set as (s: string) => void)} />
              </label>
            ))}
          </div>
          {before && after && <p className="rise mt-4 font-display text-2xl">Impact score: <span className="text-accent">+34</span> <span className="text-sm text-muted-foreground">(78 → 44)</span></p>}
        </div>
        <div>
          <p className="eyebrow">Volunteer ledger</p>
          <h2 className="mt-3 text-4xl">Top cleaners</h2>
          <ol className="mt-6 divide-y border-y">
            {volunteers.map((v, i) => (
              <li key={v.name} className="flex items-center gap-4 py-4">
                <span className="w-8 font-display text-2xl italic text-muted-foreground">{i + 1}</span>
                <div className="flex-1"><p className="font-medium">{v.name}</p><p className="text-sm text-muted-foreground">{v.city} · {v.drives} drives · avg Δ {v.delta}</p></div>
                <span className="font-mono text-lg">{v.impact}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
