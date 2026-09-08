export const dynamic = "force-dynamic";
import Link from "next/link";
import { loadLearnerState } from "@/lib/progress/load";
import { gate, nextSession, weekPct, isComplete, stateOf } from "@/lib/progress/gating";
import { SESSIONS, WEEKS, weekOf, levelOf } from "@/lib/content/course";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SessionCard } from "@/components/ui/SessionCard";
import { T } from "@/lib/i18n/strings";
import { Target, Clock, Calendar, ArrowRight, CheckCircle } from "@/components/ui/Icon";

export default async function HomePage() {
  const { state, demo, lang } = await loadLearnerState();
  const v = supabaseConfigured() ? await getViewer() : null;
  const t = (k: keyof typeof T) => T[k][lang];
  const next = nextSession(state);
  const focus = next ?? SESSIONS[SESSIONS.length - 1];
  const week = weekOf(focus); const level = levelOf(focus.level);
  const doneCount = SESSIONS.filter((s) => isComplete(stateOf(state, s.number))).length;
  const weekSessions = SESSIONS.filter((s) => s.level === focus.level && s.week === focus.week);
  const name = v?.full_name?.split(" ")[0] || (demo ? "Priya" : "");
  return (
    <>
      <p className="col-eyebrow">{level.title_en} · Week {week.number} · {lang === "hi" ? week.title_hi : week.title_en}{demo && " · preview"}</p>
      <h1 className="lrn-title">{lang === "hi" ? `Namaste${name ? ", " + name : ""}` : `Hello${name ? ", " + name : ""}`}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{t("rankNote")}</p>

      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="today">
          <div className="flex items-center justify-between gap-2 mb-2"><span className="col-eyebrow">{t("todayTask")}</span><span className="col-chip"><Clock size={14} strokeWidth={1.75} aria-hidden />Day {focus.day}</span></div>
          <h2 id="today" className="lrn-session__title">Session {focus.number} · {lang === "hi" ? focus.title_hi : focus.title_en}</h2>
          <p className="lrn-session__sub">{next ? (lang === "hi" ? "Quiz submit kijiye aur journal mein ek line likhiye. Aaj ke liye itna kaafi hai." : "Submit the quiz and save one journal line. That is enough for today.") : (lang === "hi" ? "Saare sessions poore. Certificate page dekhiye." : "All sessions complete. Check the certificate page.")}</p>
          <Link href={`/learn/session/${focus.number}`} className="col-btn col-btn--primary mt-3">Open session <ArrowRight size={16} aria-hidden /></Link>
        </section>
        <section className="col-card" aria-label="Sessions complete">
          <span className="col-eyebrow">Sessions complete</span>
          <p className="lrn-num" style={{ fontSize: 40, fontWeight: 600, margin: "4px 0" }}>{doneCount} <span style={{ fontSize: 14, fontWeight: 500 }}>/ 60</span></p>
          <p className="lrn-session__sub">{t("streakBody")}</p>
        </section>
        <section className="col-card" aria-label={t("weekProgress")}>
          <span className="col-eyebrow">{t("weekProgress")} · {level.title_en}</span>
          <div className="flex flex-wrap gap-4 mt-3">
            {WEEKS.filter((w) => w.level === focus.level).map((w) => (
              <div key={w.number} className="flex flex-col items-center gap-1"><ProgressRing value={weekPct(state, focus.level, w.number)} label={`Week ${w.number}`} /><span className="col-eyebrow">W{w.number}</span></div>
            ))}
          </div>
        </section>
        <section className="col-card" aria-label="Process Score">
          <div className="flex items-center justify-between gap-2"><span className="col-eyebrow">5C Process Score</span><span className="col-chip"><Target size={14} strokeWidth={1.75} aria-hidden />Phase 4</span></div>
          <p className="lrn-num" style={{ fontSize: 40, fontWeight: 600, margin: "4px 0" }}>— <span style={{ fontSize: 14, fontWeight: 500 }}>/ 1000</span></p>
          <p className="lrn-session__sub">{t("rankNote")}</p>
        </section>
        <section className="col-card" aria-label={t("nextDeadline")}>
          <span className="col-eyebrow">{t("nextDeadline")}</span>
          <p className="lrn-session__title mt-2"><Calendar size={16} aria-hidden /> Week {week.number} exam</p>
          <p className="lrn-session__sub">Exam runner lands in Phase 4.</p>
        </section>
        <section className="col-card" aria-label={t("journalPrompt")}>
          <span className="col-eyebrow">{t("journalPrompt")}</span>
          <p className="lrn-session__sub mt-2">{t("journalBody")}</p>
          <Link href={`/learn/session/${focus.number}`} className="col-btn col-btn--ghost col-btn--sm mt-3">Write one line</Link>
        </section>
      </div>

      <h2 className="col-eyebrow mt-6 mb-3">This week · {week.title_hi}</h2>
      <div className="lrn-grid">
        {weekSessions.map((s) => { const g = gate(state, s); return (
          <Link key={s.number} href={`/learn/session/${s.number}`} className="lrn-cardlink">
            <SessionCard lang={lang} n={s.number} day={String(s.day)} titleEn={s.title_en} titleHi={s.title_hi} concept={s.core_concept} aiLab={s.ai_lab} psychology={s.psychology} status={g.status} lockedWhy={(lang === "hi" ? g.reasonHi : g.reason) ?? undefined} />
          </Link>); })}
      </div>
      {doneCount === 60 && <div className="col-card col-empty mt-6"><CheckCircle size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Course complete</p></div>}
    </>
  );
}
