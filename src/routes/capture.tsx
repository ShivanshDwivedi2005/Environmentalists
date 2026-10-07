import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHead, ScoreBadge } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "Capture pollution — Terra Ledger" },
      { name: "description", content: "Use your camera to photograph pollution; time and location are recorded automatically." },
      { property: "og:title", content: "Capture pollution — Terra Ledger" },
      { property: "og:description", content: "Photograph, geotag and score pollution in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Capture,
});

type Geo = { lat: number; lon: number; label?: string };

// Placeholder for the separate scoring model: estimates from image texture/colour variance.
function mockScore(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0, sq = 0, brown = 0, n = 0;
  for (let i = 0; i < data.length; i += 64) {
    const r = data[i] ?? 0, g = data[i + 1] ?? 0, b = data[i + 2] ?? 0;
    const l = (r + g + b) / 3; sum += l; sq += l * l; n++;
    if (r > g && g > b && r - b > 30) brown++;
  }
  const variance = Math.sqrt(sq / n - (sum / n) ** 2);
  return Math.max(5, Math.min(98, Math.round(variance * 0.9 + (brown / n) * 60)));
}

function Capture() {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [kind, setKind] = useState<"Land" | "Water">("Land");
  const [sent, setSent] = useState(false);

  useEffect(() => () => {
    stream.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function start() {
    setErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play(); }
      setLive(true);
    } catch { setErr("Camera unavailable. Please allow camera access in your browser settings and try again."); }
  }

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (p) => {
      const g: Geo = { lat: p.coords.latitude, lon: p.coords.longitude };
      setGeo(g);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${g.lat}&lon=${g.lon}`);
        const j = await r.json();
        const a = j.address ?? {};
        setGeo({ ...g, label: [a.village || a.suburb || a.town, a.county || a.state_district, a.state, a.country].filter(Boolean).join(", ") });
      } catch { /* keep coordinates */ }
    }, () => setErr("Location permission denied — the report will be saved without coordinates."));
  }

  function finalize(c: HTMLCanvasElement) {
    setShot(c.toDataURL("image/jpeg", 0.85));
    setTime(new Date().toLocaleString());
    setScore(null); setSent(false);
    locate();
    setTimeout(() => setScore(mockScore(c)), 1400);
  }

  function snap() {
    const v = video.current, c = canvas.current;
    if (!v || !c || !v.videoWidth || !v.videoHeight) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    finalize(c);
  }

  return (
    <>
      <PageHead eyebrow="Field report" title={<>Point. Shoot. <em className="text-primary">Record.</em></>} intro="Your photo is stamped with time and location, then graded by our pollution model. Scores feed every ranking from your village up." />
      <section className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-5">
        <div className="panel relative aspect-[4/3] overflow-hidden lg:col-span-3">
          <video ref={video} playsInline muted className={`h-full w-full object-cover ${live && !shot ? "" : "hidden"}`} />
          {shot && <img src={shot} alt="Captured pollution" className="h-full w-full object-cover" />}
          {!live && !shot && (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-ink text-bone">
              <p className="font-display text-3xl italic">Viewfinder</p>
               <Button onClick={start} size="lg" className="pulse-ring rounded-full"><Camera />Open camera</Button>
            </div>
          )}
          {live && !shot && (
             <Button onClick={snap} size="icon" aria-label="Take photo" className="absolute bottom-6 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-bone transition-transform hover:scale-110"><Camera /></Button>
          )}
          <canvas ref={canvas} className="hidden" />
        </div>

        <div className="space-y-4 lg:col-span-2">
          {err && <p className="panel border-destructive p-4 text-sm text-destructive">{err}</p>}
          <div className="panel p-6">
            <p className="eyebrow">Metadata</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Time</dt><dd className="font-mono">{time ?? "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Coordinates</dt><dd className="font-mono">{geo ? `${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)}` : "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Place</dt><dd className="text-right">{geo?.label ?? "—"}</dd></div>
            </dl>
          </div>
          <div className="panel p-6">
            <p className="eyebrow">Category</p>
            <div className="mt-3 flex gap-2">
              {(["Land", "Water"] as const).map((k) => (
                 <Button key={k} variant="outline" aria-pressed={kind === k} onClick={() => setKind(k)} className={`flex-1 ${kind === k ? "border-ink bg-ink text-bone" : "hover:bg-muted"}`}>{k}</Button>
              ))}
            </div>
          </div>
          <div className="panel p-6">
            <p className="eyebrow">Model score</p>
            {!shot ? <p className="mt-3 text-sm text-muted-foreground">Take a photo to get a score.</p>
              : score === null ? <p className="mt-3 animate-pulse font-display text-2xl italic">Analysing frame…</p>
              : <div className="rise mt-3 flex items-end justify-between"><span className="font-display text-6xl">{score}</span><ScoreBadge score={score} /></div>}
          </div>
          {shot && (
            <div className="flex gap-3">
               <Button variant="outline" onClick={() => { setShot(null); setScore(null); }} className="flex-1">Retake</Button>
               <Button disabled={score === null || sent} onClick={() => setSent(true)} className="flex-1">{sent ? "Submitted ✓" : "Submit report"}</Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
