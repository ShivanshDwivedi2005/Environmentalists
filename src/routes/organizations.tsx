import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHead } from "@/components/Shell";
import { orgs } from "@/lib/data";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [
      { title: "Organisations — Terra Ledger" },
      { name: "description", content: "Directory of organisations working on pollution control and environmental cleanup." },
      { property: "og:title", content: "Organisations — Terra Ledger" },
      { property: "og:description", content: "Find and support groups fighting land and water pollution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Orgs,
});

function Orgs() {
  const [f, setF] = useState("All");
  const filters = ["All", "Water", "Land", "Coastal"];
  const list = orgs.filter((o) => f === "All" || o.focus.includes(f));
  return (
    <>
      <PageHead eyebrow="Directory" title={<>The people already <em className="text-accent">doing the work.</em></>} intro="Organisations working on pollution control — volunteer with them, fund them, or bring them into your area." />
      <section className="mx-auto max-w-7xl px-6">
        <div className="flex gap-2">
          {filters.map((x) => <button key={x} onClick={() => setF(x)} className={`rounded-sm px-4 py-2 text-sm transition-colors ${f === x ? "bg-ink text-bone" : "border hover:bg-muted"}`}>{x}</button>)}
        </div>
        <div className="mt-8 grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
          {list.map((o, i) => (
            <article key={o.name} className="rise group bg-background p-8 transition-colors hover:bg-card" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex justify-between"><span className="eyebrow">{o.focus}</span><span className="font-mono text-xs text-muted-foreground">est. {o.since}</span></div>
              <h3 className="mt-6 text-3xl">{o.name}</h3>
              <p className="mt-1 text-sm text-primary">{o.region}</p>
              <p className="mt-4 text-sm text-muted-foreground">{o.desc}</p>
              <button className="mt-6 text-sm underline decoration-primary underline-offset-4 transition-all group-hover:tracking-wide">Volunteer →</button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
