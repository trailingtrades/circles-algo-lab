export const dynamic = "force-dynamic";
import Link from "next/link";
import { loadLearnerState } from "@/lib/progress/load";
import { gate, nextSession, weekPct, isComplete, stateOf } from "@/lib/progress/gating";
import { SESSIONS, WEEKS, weekOf, levelOf, dayLabel, examForWeek, examKey } from "@/lib/content/course";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { SessionCard } from "@/components/ui/SessionCard";
import { SegmentedRing, Cover } from "@/components/ui/CourseArt";
import { T } from "@/lib/i18n/strings";
import { loadScore } from "@/lib/scoring/read";
import { RankChip } from "@/components/ui/RankChip";
import { Clock, Calendar, ArrowRight, CheckCircle } from "@/components/ui/Icon";

/* Winners home recipe: hero + segmented progress ring, compact stat tiles,
   a "Continue learning" card, a horizontal roadmap, then cards with generated
   icon/tint covers. Copy, scoring, gating untouched — layout only. */
export default async function HomePage() {
  const { state, demo, lang } = await loadLearnerState();
  const score = await loadScore();
  const v = supabaseConfigured() ? await getViewer() : null;
  const t = (k: keyof typeof T) => T[k][lang];
  const next = nextSession(state);
  const focus = next ?? SESSIONS[SESSIONS.length - 1];
  const week = weekOf(focus); const level = levelOf(focus.level);
  const doneCount = SESSIONS.filter((s) => isComplete(stateOf(state, s.number))).length;
  const nextExam = examForWeek(focus.level, week.number);
  const weekSessions = SESSIONS.filter((s) => s.level === focus.level && s.week === focus.week);
  const levelSessions = SESSIONS.filter((s) => s.level === focus.level);
  const levelDone = levelSessions.filter((s) => isComplete(stateOf(state, s.number))).length;
  const levelWeeks = WEEKS.filter((w) => w.level === focus.level);
  const name = v?.full_name?.split(" ")[0] || (demo ? "Priya" : "");
  return (
    <>
      {/* Hero: greeting + one segmented ring for the level */}
      <section className="lrn-hero mb-4">
        <div className="lrn-hero__txt">
          <p className="col-eyebrow">{level.title_en} · Week {week.number} · {lang === "hi" ? week.title_hi : week.title_en}{demo && " · preview"}</p>
          <h1 className="lrn-title">{lang === "hi" ? `Namaste${name ? ", " + name : ""}` : `Hello${name ? ", " + name : ""}`}</h1>
          <p className="lrn-muted" style={{ marginTop: 0 }}>{t("rankNote")}</p>
        </div>
        <div className="lrn-hero__ring">
          <SegmentedRing done={levelDone} total={levelSessions.length} label={`${level.title_en} progress`} />
        </div>
      </section>

      {/* Compact stat tiles */}
      <div className="lrn-statrow">
        <section className="col-card lrn-stat" aria-label="Sessions complete">
          <span className="col-eyebrow">Sessions complete</span>
          <p className="lrn-num">{doneCount} <span style={{ fontSize: 13, fontWeight: 500 }}>/ {SESSIONS.length}</span></p>
          <p className="lrn-session__sub">{t("streakBody")}</p>
        </section>
        <section className="col-card lrn-stat" aria-label="Process Score">
          <div className="flex items-center justify-between gap-2"><span className="col-eyebrow">5C Process Score</span><RankChip rank={score.rank} band={score.band} /></div>
          <p className="lrn-num">{score.components.total} <span style={{ fontSize: 13, fontWeight: 500 }}>/ 1000</span></p>
          <p className="lrn-session__sub">{t("rankNote")} <Link href="/learn/score" className="lrn-link">Breakdown</Link></p>
        </section>
        <section className="col-card lrn-stat" aria-label={t("nextDeadline")}>
          <span className="col-eyebrow">{t("nextDeadline")}</span>
          <p className="lrn-session__title mt-2"><Calendar size={16} aria-hidden /> {nextExam?.title ?? `${level.title_en} exam`}</p>
          <Link href={`/learn/exam/${nextExam ? examKey(nextExam) : `${focus.level}-final`}`} className="col-btn col-btn--ghost col-btn--sm mt-2">Open exam</Link>
        </section>
      </div>

      {/* Continue learning */}
      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="today">
          <Cover level={focus.level} week={focus.week} />
          <div className="flex items-center justify-between gap-2 mb-2"><span className="col-eyebrow">{t("todayTask")}</span><span className="col-chip"><Clock size={14} strokeWidth={1.75} aria-hidden />{dayLabel(focus)}</span></div>
          <h2 id="today" className="lrn-session__title">Session {focus.number} · {lang === "hi" ? focus.title_hi : focus.title_en}</h2>
          <p className="lrn-session__sub">{next ? (lang === "hi" ? "Quiz submit kijiye aur journal mein ek line likhiye. Aaj ke liye itna kaafi hai." : "Submit the quiz and save one journal line. That is enough for today.") : (lang === "hi" ? "Saare sessions poore. Certificate page dekhiye." : "All sessions complete. Check the certificate page.")}</p>
          <Link href={`/learn/session/${focus.number}`} className="col-btn col-btn--primary mt-3">Open session <ArrowRight size={16} aria-hidden /></Link>
        </section>
        <section className="col-card" aria-label={t("journalPrompt")}>
          <span className="col-eyebrow">{t("journalPrompt")}</span>
          <p className="lrn-session__sub mt-2">{t("journalBody")}</p>
          <Link href={`/learn/session/${focus.number}`} className="col-btn col-btn--ghost col-btn--sm mt-3">Write one line</Link>
        </section>
      </div>

      {/* Horizontal roadmap across the level's weeks */}
      <h2 className="col-eyebrow mt-6 mb-2">{t("weekProgress")} · {level.title_en}</h2>
      <nav className="lrn-roadmap" aria-label={t("weekProgress")}>
        {levelWeeks.map((w) => {
          const pct = weekPct(state, focus.level, w.number);
          const cls = pct >= 100 ? "lrn-road--done" : w.number === week.number ? "lrn-road--now" : "";
          return (
            <Link key={w.number} href="/learn/path" className={`lrn-road ${cls}`}>
              <span className="lrn-road__dot">{pct >= 100 ? <CheckCircle size={14} strokeWidth={2} aria-hidden /> : `W${w.number}`}</span>
              <span className="lrn-road__label">{lang === "hi" ? w.title_hi : w.title_en}</span>
              <span className="lrn-num" aria-label={`Week ${w.number}: ${pct}%`}>{pct}%</span>
            </Link>
          );
        })}
      </nav>

      <h2 className="col-eyebrow mt-6 mb-3">This week · {week.title_hi}</h2>
      <div className="lrn-grid">
        {weekSessions.map((s) => { const g = gate(state, s); return (
          <Link key={s.number} href={`/learn/session/${s.number}`} className="lrn-cardlink">
            <SessionCard lang={lang} n={s.number} day={String(s.day)} titleEn={s.title_en} titleHi={s.title_hi} concept={s.core_concept} aiLab={s.ai_lab} psychology={s.psychology} status={g.status} lockedWhy={(lang === "hi" ? g.reasonHi : g.reason) ?? undefined} level={s.level} week={s.week} />
          </Link>); })}
      </div>
      {doneCount === 60 && <div className="col-card col-empty mt-6"><CheckCircle size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Course complete</p></div>}
    </>
  );
}
