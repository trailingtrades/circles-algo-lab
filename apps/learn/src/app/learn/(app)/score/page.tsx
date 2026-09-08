export const dynamic = "force-dynamic";
import Link from "next/link";
import { loadScore } from "@/lib/scoring/read";
import { ScoreBreakdown } from "@/components/ui/ScoreBreakdown";
import { RankChip } from "@/components/ui/RankChip";
import { ArrowRight } from "@/components/ui/Icon";
import { TIER2 } from "@/lib/compliance/strings";

export default async function ScorePage() {
  const s = await loadScore();
  return (
    <>
      <p className="col-eyebrow">{s.level} · 5C Process Score{s.demo && " · preview"}</p>
      <div className="flex items-center gap-3 flex-wrap"><h1 className="lrn-title" style={{ margin: 0 }}><span className="lrn-num">{s.components.total}</span> <span className="lrn-muted" style={{ fontSize: 16 }}>/ 1000</span></h1><RankChip rank={s.rank} band={s.band} /></div>
      <p className="lrn-muted">{s.lang === "hi" ? "Ye score aapke process ka hai — profit ka nahi. Har point par tap karke dekhiye kis action se aaya." : "This score is about your process, not your profit. Tap any component to see exactly which action earned which point."}</p>
      <div className="lrn-grid mt-4">
        <section className="col-card" style={{ gridColumn: "1 / -1" }}><ScoreBreakdown components={s.components} events={s.events} lang={s.lang} /></section>
        <section className="col-card" aria-labelledby="nx">
          <h2 id="nx" className="lrn-session__title">{s.lang === "hi" ? "Agle 3 kaam jo score sabse zyada badhayenge" : "Next 3 actions that move your score most"}</h2>
          <ul className="lrn-list mt-3">
            {s.actions.map((a) => <li key={a.href + a.label} className="col-card__inner lrn-res"><span>{s.lang === "hi" ? a.labelHi : a.label}</span><Link href={a.href} className="col-btn col-btn--ghost col-btn--sm"><span className="lrn-num">+{a.points}</span> <ArrowRight size={14} aria-hidden /></Link></li>)}
            {s.actions.length === 0 && <li className="lrn-muted">Sab kuch ho gaya. Certificate page dekhiye.</li>}
          </ul>
        </section>
      </div>
      <p className="lrn-muted mt-4" style={{ fontSize: "var(--col-text-dense)" }}>{TIER2}</p>
    </>
  );
}
