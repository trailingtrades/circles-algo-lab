import Link from "next/link";
import { Target, BookOpen, ShieldCheck, Check, type IconProps } from "@/components/ui/Icon";

/* Wave journey — the CIRCLE O.N.E dashboard diagram, ported: a cubic-bezier path over a
   soft gradient fill, green-to-cyan progress stroke, and step nodes (done / current with
   "YOU ARE HERE" / upcoming). Pure server render; nodes link into the app. */

export type WaveStep = {
  key: string;
  title: string;
  sub?: string;             // e.g. "5/7" or "82%"
  kind: "start" | "mid" | "end";
  done: boolean;
  cur?: boolean;
  frac?: number;            // 0..1 progress within the step (partial stroke)
  href?: string;
};

const ICON: Record<WaveStep["kind"], React.ComponentType<IconProps>> = { start: Target, mid: BookOpen, end: ShieldCheck };
const YS = [150, 80, 120, 60, 40];

export function WaveJourney({ steps, youAreHere }: { steps: WaveStep[]; youAreHere: string }) {
  const W = 1000, H = 220, x0 = 60, x1 = W - 60, span = (x1 - x0) / (steps.length - 1);
  const pts = steps.map((_, i) => ({ x: x0 + span * i, y: YS[i % YS.length] }));
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => { const cx = (a.x + b.x) / 2; return ` C ${cx} ${a.y}, ${cx} ${b.y}, ${b.x} ${b.y}`; };
  let full = `M ${pts[0].x} ${pts[0].y}`; for (let i = 1; i < pts.length; i++) full += seg(pts[i - 1], pts[i]);
  let lastDone = 0; steps.forEach((s, i) => { if (s.done) lastDone = i; });
  let donePath = `M ${pts[0].x} ${pts[0].y}`; for (let i = 1; i <= lastDone; i++) donePath += seg(pts[i - 1], pts[i]);
  const cur = steps.findIndex((s) => s.cur);
  const partial = cur > 0 && (steps[cur].frac ?? 0) > 0 && cur === lastDone + 1
    ? { d: `M ${pts[cur - 1].x} ${pts[cur - 1].y}${seg(pts[cur - 1], pts[cur])}`, dash: Math.round((steps[cur].frac ?? 0) * 100) }
    : null;
  return (
    <div className="wave mb-4">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="wvg" x1="0" x2="1"><stop offset="0" stopColor="#4caf50" /><stop offset="1" stopColor="#22b8f5" /></linearGradient>
          <linearGradient id="wvf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#22b8f5" stopOpacity=".22" /><stop offset="1" stopColor="#22b8f5" stopOpacity="0" /></linearGradient>
        </defs>
        <path d={`${full} L ${x1} ${H} L ${x0} ${H} Z`} fill="url(#wvf)" opacity=".5" />
        <path d={full} fill="none" stroke="var(--line-2)" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 10" />
        {lastDone > 0 && <path d={donePath} fill="none" stroke="url(#wvg)" strokeWidth="6" strokeLinecap="round" />}
        {partial && <path d={partial.d} fill="none" stroke="var(--brand)" strokeWidth="6" strokeLinecap="round" pathLength={100} strokeDasharray={`${partial.dash} 100`} opacity=".9" />}
      </svg>
      <div className="wv-nodes">
        {steps.map((s, i) => {
          const I = ICON[s.kind];
          const cls = `wv-n ${s.kind === "end" ? "end" : ""} ${s.done ? "done" : s.cur ? "cur" : ""}`;
          const body = (
            <>
              <div className="dot">{s.done && s.kind !== "end" ? <Check size={16} aria-hidden /> : <I size={s.kind === "end" ? 20 : 16} aria-hidden />}</div>
              <div className="k">{s.cur ? youAreHere : s.kind === "start" ? "" : `Step ${i}`}</div>
              <div className="t">{s.title}</div>
              {s.sub ? <div className="p">{s.sub}</div> : null}
            </>
          );
          return s.href
            ? <Link key={s.key} href={s.href} className={cls} style={{ left: `${(pts[i].x / W) * 100}%`, top: `${(pts[i].y / H) * 100}%` }}>{body}</Link>
            : <span key={s.key} className={cls} style={{ left: `${(pts[i].x / W) * 100}%`, top: `${(pts[i].y / H) * 100}%` }}>{body}</span>;
        })}
      </div>
      <div className="wv-mobile">
        {steps.filter((s) => s.kind !== "start").map((s) => {
          const I = ICON[s.kind];
          return (
            <div key={s.key} className={`wv-m ${s.done ? "done" : s.cur ? "cur" : ""}`}>
              <div className="dot">{s.done ? <Check size={15} aria-hidden /> : <I size={15} aria-hidden />}</div>
              <div><div className="t">{s.title}</div>{s.cur ? <div className="p">{youAreHere}</div> : null}</div>
              <div className="pct">{s.sub ?? ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
