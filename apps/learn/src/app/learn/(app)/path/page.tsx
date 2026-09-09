export const dynamic = "force-dynamic";
import Link from "next/link";
import { LEVELS, WEEKS, sessionsOf } from "@/lib/content/course";
import { loadLearnerState } from "@/lib/progress/load";
import { gate, levelOpen, weekPct } from "@/lib/progress/gating";
import { SessionCard } from "@/components/ui/SessionCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Lock } from "@/components/ui/Icon";

/** The 60-session ladder: 3 levels × 4 weeks × 5 days. Locked sessions say why. */
export default async function PathPage() {
  const { state, lang } = await loadLearnerState();
  return (
    <>
      <p className="col-eyebrow">AI Trading Course</p>
      <h1 className="lrn-title">Path</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{lang === "hi" ? "3 levels, 12 weeks, 60 sessions. Ek session poora karo, agla khulta hai." : "3 levels, 12 weeks, 60 sessions. Finish one session and the next unlocks."}</p>
      {LEVELS.map((lv) => {
        const open = levelOpen(state, lv.slug);
        const prev = LEVELS.find((l) => l.sequence === lv.sequence - 1);
        return (
          <section key={lv.slug} className="mt-6" aria-labelledby={`lv-${lv.slug}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 id={`lv-${lv.slug}`} className="lrn-title" style={{ fontSize: 20, margin: 0 }}>{lv.title_en}</h2>
              <span className="col-chip">{open ? "Open" : <><Lock size={12} aria-hidden /> Locked</>}</span>
              {!open && prev && <span className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }}>{lang === "hi" ? `${prev.title_en} ka certificate milte hi khulega.` : `Unlocks when your ${prev.title_en} certificate is issued.`} <Link href="/learn/certificate" className="lrn-link">Certificate</Link></span>}
            </div>
            {WEEKS.filter((w) => w.level === lv.slug).map((w) => (
              <div key={w.number} className="mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <ProgressRing value={weekPct(state, lv.slug, w.number)} size={44} stroke={4} label={`${lv.title_en} week ${w.number}`} />
                  <div><span className="col-eyebrow">Week {w.number}</span><div style={{ fontWeight: 600 }}>{lang === "hi" ? w.title_hi : w.title_en}</div></div>
                </div>
                <div className="lrn-grid">
                  {sessionsOf(lv.slug, w.number).map((s) => {
                    const g = gate(state, s);
                    const card = <SessionCard lang={lang} n={s.number} day={String(s.day)} titleEn={s.title_en} titleHi={s.title_hi} concept={s.core_concept} aiLab={s.ai_lab} psychology={s.psychology} status={g.status} lockedWhy={(lang === "hi" ? g.reasonHi : g.reason) ?? undefined} />;
                    return <Link key={s.number} href={`/learn/session/${s.number}`} className="lrn-cardlink" aria-label={`Session ${s.number}: ${s.title_en} (${g.status})`}>{card}</Link>;
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}
