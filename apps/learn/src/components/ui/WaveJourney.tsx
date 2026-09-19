import Link from "next/link";
import { Target, BookOpen, ShieldCheck, Check, type IconProps } from "@/components/ui/Icon";
import { t3, tr, type Lang } from "@/lib/i18n/lang";

/* Wave journey (shared with the CIRCLE O.N.E dashboard): a curved path through the steps, a solid brand
   stroke over the finished part, and nodes marked done / current ("You are here") / upcoming. Server-rendered;
   a node links only when it has somewhere useful to go. Below 760px the CSS swaps the curve for a list. */

export type WaveStep = {
  key: string;
  title: string;
  sub?: string;             // e.g. "5/7"
  kind: "start" | "mid" | "end";
  done: boolean;
  cur?: boolean;
  frac?: number;            // 0..1 progress within the step (partial stroke)
  href?: string;
};

const S = {
  here: t3("You are here", "Aap yahan hain", "आप यहाँ हैं"),
  step: t3("Step", "Step", "चरण"),
};

const ICON: Record<WaveStep["kind"], React.ComponentType<IconProps>> = { start: Target, mid: BookOpen, end: ShieldCheck };
const YS = [150, 80, 120, 60, 40];

export function WaveJourney({ steps, lang, label }: { steps: WaveStep[]; lang: Lang; label: string }) {
  const here = tr(S.here, lang);
  const W = 1000, H = 220, x0 = 60, x1 = W - 60, span = (x1 - x0) / Math.max(1, steps.length - 1);
  const pts = steps.map((_, i) => ({ x: x0 + span * i, y: YS[i % YS.length] }));
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => { const cx = (a.x + b.x) / 2; return ` C ${cx} ${a.y}, ${cx} ${b.y}, ${b.x} ${b.y}`; };
  let full = `M ${pts[0].x} ${pts[0].y}`; for (let i = 1; i < pts.length; i++) full += seg(pts[i - 1], pts[i]);
  let lastDone = 0; steps.forEach((s, i) => { if (s.done) lastDone = i; });
  let donePath = `M ${pts[0].x} ${pts[0].y}`; for (let i = 1; i <= lastDone; i++) donePath += seg(pts[i - 1], pts[i]);
  const cur = steps.findIndex((s) => s.cur);
  const partial = cur > 0 && (steps[cur].frac ?? 0) > 0 && cur === lastDone + 1
    ? { d: `M ${pts[cur - 1].x} ${pts[cur - 1].y}${seg(pts[cur - 1], pts[cur])}`, dash: Math.round((steps[cur].frac ?? 0) * 100) }
    : null;
  const at = (i: number) => ({ left: `${(pts[i].x / W) * 100}%`, top: `${(pts[i].y / H) * 100}%` });
  return (
    <section className="wave mb-4" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="wvf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style={{ stopColor: "var(--brand)" }} stopOpacity=".18" /><stop offset="1" style={{ stopColor: "var(--brand)" }} stopOpacity="0" /></linearGradient>
        </defs>
        <path d={`${full} L ${x1} ${H} L ${x0} ${H} Z`} fill="url(#wvf)" opacity=".5" />
        <path d={full} fill="none" stroke="var(--line-2)" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 10" />
        {lastDone > 0 && <path d={donePath} fill="none" stroke="var(--brand)" strokeWidth="6" strokeLinecap="round" />}
        {partial && <path d={partial.d} fill="none" stroke="var(--brand)" strokeWidth="6" strokeLinecap="round" pathLength={100} strokeDasharray={`${partial.dash} 100`} opacity=".55" />}
      </svg>
      <div className="wv-nodes">
        {steps.map((s, i) => {
          const I = ICON[s.kind];
          const cls = `wv-n ${s.kind === "end" ? "end" : ""} ${s.done ? "done" : s.cur ? "cur" : ""}`;
          const body = (
            <>
              <div className="dot">{s.done && s.kind !== "end" ? <Check size={16} aria-hidden /> : <I size={s.kind === "end" ? 20 : 16} aria-hidden />}</div>
              <div className="k">{s.cur ? here : s.kind === "start" ? "" : `${tr(S.step, lang)} ${i}`}</div>
              <div className="t">{s.title}</div>
              {s.sub ? <div className="p">{s.sub}</div> : null}
            </>
          );
          return s.href
            ? <Link key={s.key} href={s.href} className={cls} style={at(i)} aria-current={s.cur ? "step" : undefined}>{body}</Link>
            : <span key={s.key} className={cls} style={at(i)} aria-current={s.cur ? "step" : undefined}>{body}</span>;
        })}
      </div>
      <div className="wv-mobile">
        {steps.filter((s) => s.kind !== "start").map((s) => {
          const I = ICON[s.kind];
          const body = (
            <>
              <div className="dot">{s.done ? <Check size={15} aria-hidden /> : <I size={15} aria-hidden />}</div>
              <div><div className="t">{s.title}</div>{s.cur ? <div className="p">{here}</div> : null}</div>
              <div className="pct">{s.sub ?? ""}</div>
            </>
          );
          const cls = `wv-m ${s.done ? "done" : s.cur ? "cur" : ""}`;
          // Phones get the same links as the desktop curve (they used to be plain rows).
          return s.href
            ? <Link key={s.key} href={s.href} className={cls} style={{ color: "inherit", textDecoration: "none" }} aria-current={s.cur ? "step" : undefined}>{body}</Link>
            : <div key={s.key} className={cls} aria-current={s.cur ? "step" : undefined}>{body}</div>;
        })}
      </div>
    </section>
  );
}
