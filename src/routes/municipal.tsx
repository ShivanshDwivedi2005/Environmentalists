import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHead } from "@/components/Shell";
import { municipal } from "@/lib/data";

export const Route = createFileRoute("/municipal")({
  head: () => ({
    meta: [
      { title: "Municipal offices — Terra Ledger" },
      { name: "description", content: "Contact details of municipal offices by area, and tag them on pollution reports." },
      { property: "og:title", content: "Municipal offices — Terra Ledger" },
      { property: "og:description", content: "Find your municipal office and tag them on local pollution reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Municipal,
});

function Municipal() {
  const [q, setQ] = useState("");
  const [tagged, setTagged] = useState<string[]>([]);
  const list = municipal.filter((m) => (m.area + m.body).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHead eyebrow="Accountability" title={<>Tag the people <em className="text-primary">responsible.</em></>} intro="Every area has a municipal body. Find their contact, and tag them on reports so the issue lands on the right desk." />
      <section className="mx-auto max-w-7xl px-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your area…" className="w-full border-b-2 border-foreground bg-transparent py-4 font-display text-3xl outline-none placeholder:text-muted-foreground focus:border-primary" />
        <div className="mt-10 divide-y border-y">
          {list.map((m, i) => {
            const on = tagged.includes(m.area);
            return (
              <div key={m.area} className="rise grid items-center gap-4 py-6 md:grid-cols-12" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="md:col-span-5"><p className="eyebrow">{m.area}</p><p className="mt-1 font-display text-2xl">{m.body}</p></div>
                <div className="text-sm md:col-span-4"><a href={`mailto:${m.email}`} className="block underline-offset-4 hover:text-primary hover:underline">{m.email}</a><span className="font-mono text-muted-foreground">{m.phone}</span></div>
                <div className="font-mono text-sm md:col-span-1"><span className="text-destructive">{m.open}</span> <span className="text-muted-foreground">open</span></div>
                <button onClick={() => setTagged((t) => (on ? t.filter((x) => x !== m.area) : [...t, m.area]))} className={`rounded-sm px-4 py-2 text-sm transition-colors md:col-span-2 ${on ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}>{on ? "Tagged ✓" : "@ Tag on reports"}</button>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Contact details shown are samples — real office details will be added per area.</p>
      </section>
    </>
  );
}
