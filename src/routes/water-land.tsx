import { createFileRoute } from "@tanstack/react-router";
import { PageHead } from "@/components/Shell";
import { water, land, reports } from "@/lib/data";

export const Route = createFileRoute("/water-land")({
  head: () => ({
    meta: [
      { title: "Water & land pollution — Terra Ledger" },
      { name: "description", content: "Distribution of water and land pollution sources, with suggested solutions." },
      { property: "og:title", content: "Water & land pollution — Terra Ledger" },
      { property: "og:description", content: "What pollutes our rivers and soil, and what we can do." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WaterLand,
});

const fixes = {
  Water: ["Report drain outfalls to the municipal body", "Avoid washing chemicals into storm drains", "Join riverbank and lake drives", "Support sewage-treatment upgrades"],
  Land: ["Segregate wet, dry and hazardous waste", "Compost kitchen waste at home", "Flag open dumping sites with photos", "Drop e-waste at authorised collectors"],
};

function Block({ title, data, tone, total }: { title: "Water" | "Land"; data: { name: string; v: number }[]; tone: string; total: number }) {
  return (
    <div className="panel p-8">
      <div className="flex items-baseline justify-between"><h2 className="text-5xl italic">{title}</h2><span className="font-mono text-sm text-muted-foreground">{total} reports today</span></div>
      <div className="mt-8 flex h-4 overflow-hidden rounded-sm">
        {data.map((d, i) => <div key={d.name} className={`grow ${tone}`} style={{ width: `${d.v}%`, opacity: 1 - i * 0.2, animationDelay: `${i * 150}ms` }} />)}
      </div>
      <ul className="mt-8 space-y-4">
        {data.map((d, i) => (
          <li key={d.name}>
            <div className="flex justify-between text-sm"><span>{d.name}</span><span className="font-mono">{d.v}%</span></div>
            <div className="mt-1 h-px bg-border"><div className={`grow h-px ${tone}`} style={{ width: `${d.v * 2}%`, animationDelay: `${300 + i * 100}ms` }} /></div>
          </li>
        ))}
      </ul>
      <p className="eyebrow mt-10">Possible solutions</p>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {fixes[title].map((f) => <li key={f} className="border-l-2 border-primary pl-3">{f}</li>)}
      </ul>
    </div>
  );
}

function WaterLand() {
  return (
    <>
      <PageHead eyebrow="Distribution" title={<>Two grounds, <em className="text-primary">one ledger.</em></>} intro="How reported pollution splits between rivers, lakes and coasts versus soil, streets and open land — and what helps." />
      <section className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-2">
        <Block title="Water" data={water} tone="bg-accent" total={reports.filter((r) => r.type === "Water").length * 214} />
        <Block title="Land" data={land} tone="bg-primary" total={reports.filter((r) => r.type === "Land").length * 187} />
      </section>
    </>
  );
}
