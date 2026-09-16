export const dynamic = "force-dynamic";
import Link from "next/link";
import { loadLearnerState } from "@/lib/progress/load";
import { gate, nextSession, weekPct, isComplete, stateOf } from "@/lib/progress/gating";
import { SESSIONS, WEEKS, weekOf, levelOf, dayLabel, examForWeek, examKey } from "@/lib/content/course";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { SessionCard } from "@/components/ui/SessionCard";
import { SegmentedRing, courseArt } from "@/components/ui/CourseArt";
import { T } from "@/lib/i18n/strings";
import { loadScore } from "@/lib/scoring/read";
import { RankChip } from "@/components/ui/RankChip";
import { Clock, Calendar, ArrowRight, CheckCircle, BookOpen, Target, Activity } from "@/components/ui/Icon";

/* Live Winners home recipe: kicker + big gradient-name hero beside a ring panel,
   icon stat tiles, a full-width continue-learning bar, phase-banner roadmap
   (gold on the current milestone), then module cards with numbered covers.
   Copy, scoring, gating untouched — layout only. */
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
  const focusWatched = stateOf(state, focus.number).watched_pct ?? 0;
  const [FocusGlyph] = courseArt(focus.level, focus.week, focus.number);
  return (
    <>
      {/* Hero: kicker + gradient-name greeting, ring panel on the right */}
      <section className="lrn-hero mb-4">
        <div className="lrn-hero__txt">
          <p className="lrn-kicker">{level.title_en} · Week {week.number} · {lang === "hi" ? week.title_hi : week.title_en}{demo && " · preview"}</p>
          <h1 className="lrn-title">{lang === "hi" ? "Namaste" : "Hello"}{name ? <>, <span className="wm">{name}</span></> : null}</h1>
          <p className="lrn-muted" style={{ marginTop: 0 }}>{t("rankNote")}</p>
          <p style={{ margin: "10px 0 0" }}><RankChip rank={score.rank} band={score.band} /></p>
        </div>
        <div className="col-card lrn-ringpanel lrn-hero__ring">
          <SegmentedRing done={levelDone} total={levelSessions.length} label="Overall progress" />
        </div>
      </section>

      {/* Icon stat tiles */}
      <div className="lrn-statrow">
        <section className="col-card lrn-stat" aria-label="Sessions complete">
          <span className="lrn-stat__ico"><BookOpen size={20} strokeWidth={1.75} aria-hidden /></span>
          <span className="min-w-0">
            <p className="lrn-num">{doneCount} <span style={{ fontSize: 13, fontWeight: 500 }}>/ {SESSIONS.length}</span></p>
            <p className="lrn-stat__lbl">Sessions complete</p>
          </span>
        </section>
        <section className="col-card lrn-stat" aria-label="Process Score">
          <span className="lrn-stat__ico"><Target size={20} strokeWidth={1.75} aria-hidden /></span>
          <span className="min-w-0">
            <p className="lrn-num">{score.components.total} <span style={{ fontSize: 13, fontWeight: 500 }}>/ 1000</span></p>
            <p className="lrn-stat__lbl">5C Process Score · <Link href="/learn/score" className="lrn-link">Breakdown</Link></p>
          </span>
        </section>
        <section className="col-card lrn-stat" aria-label={t("weekProgress")}>
          <span className="lrn-stat__ico"><Activity size={20} strokeWidth={1.75} aria-hidden /></span>
          <span className="min-w-0">
            <p className="lrn-num">{weekPct(state, focus.level, week.number)}%</p>
            <p className="lrn-stat__lbl">{t("weekProgress")}</p>
          </span>
        </section>
        <section className="col-card lrn-stat" aria-label={t("nextDeadline")}>
          <span className="lrn-stat__ico"><Calendar size={20} strokeWidth={1.75} aria-hidden /></span>
          <span className="min-w-0">
            <p className="lrn-num" style={{ fontSize: 15 }}>{nextExam?.title ?? `${level.title_en} exam`}</p>
            <p className="lrn-stat__lbl">{t("nextDeadline")} · <Link href={`/learn/exam/${nextExam ? examKey(nextExam) : `${focus.level}-final`}`} className="lrn-link">Open exam</Link></p>
          </span>
        </section>
      </div>

      {/* Continue learning bar */}
      <section className="col-card lrn-continue mt-4" aria-labelledby="today">
        <span className="lrn-tile-ico"><FocusGlyph size={26} strokeWidth={1.5} aria-hidden /></span>
        <div className="lrn-continue__body">
          <p className="lrn-continue__kick">{t("todayTask")} · {dayLabel(focus)}</p>
          <h2 id="today" className="lrn-session__title" style={{ fontSize: 17 }}>Session {focus.number} · {lang === "hi" ? focus.title_hi : focus.title_en}</h2>
          <p className="lrn-session__sub">{next ? (lang === "hi" ? "Quiz submit kijiye aur journal mein ek line likhiye. Aaj ke liye itna kaafi hai." : "Submit the quiz and save one journal line. That is enough for today.") : (lang === "hi" ? "Saare sessions poore. Certificate page dekhiye." : "All sessions complete. Check the certificate page.")}</p>
          <div className="lrn-continue__meta">
            <div className="lrn-bar__track"><div className="lrn-bar__fill" style={{ width: `${Math.max(0, Math.min(100, focusWatched))}%` }} /></div>
            <span className="lrn-continue__pct lrn-num">{focusWatched}% watched</span>
          </div>
        </div>
        <Link href={`/learn/session/${focus.number}`} className="col-btn col-btn--primary">Open session <ArrowRight size={16} aria-hidden /></Link>
      </section>

      {/* Journal prompt */}
      <section className="col-card lrn-continue mt-3" aria-label={t("journalPrompt")}>
        <span className="lrn-tile-ico"><Clock size={24} strokeWidth={1.5} aria-hidden /></span>
        <div className="lrn-continue__body">
          <p className="lrn-continue__kick">{t("journalPrompt")}</p>
          <p className="lrn-session__sub" style={{ margin: 0 }}>{t("journalBody")}</p>
        </div>
        <Link href={`/learn/session/${focus.number}`} className="col-btn col-btn--ghost col-btn--sm">Write one line</Link>
      </section>

      {/* Roadmap: phase-banner rows, gold on the current week */}
      <h2 className="lrn-title mt-6 mb-3" style={{ fontSize: 22 }}>{t("weekProgress")} · {level.title_en}</h2>
      <div className="lrn-phases" role="list">
        {levelWeeks.map((w) => {
          const pct = weekPct(state, focus.level, w.number);
          const wSessions = SESSIONS.filter((s) => s.level === focus.level && s.week === w.number);
          const wDone = wSessions.filter((s) => isComplete(stateOf(state, s.number))).length;
          const now = w.number === week.number;
          const [WGlyph] = courseArt(focus.level, w.number);
          const status = pct >= 100 ? "Complete" : now ? "In progress" : "Up next";
          return (
            <Link key={w.number} href="/learn/path" role="listitem" className={`col-card lrn-phase${now ? " lrn-phase--now" : ""}`}>
              <span className="lrn-tile-ico"><WGlyph size={24} strokeWidth={1.5} aria-hidden /></span>
              <span className="lrn-phase__body">
                <p className="lrn-phase__kick">Week {w.number} · {status}</p>
                <p className="lrn-phase__title">{lang === "hi" ? w.title_hi : w.title_en}</p>
                <div className="lrn-continue__meta">
                  <div className="lrn-bar__track"><div className="lrn-bar__fill" style={{ width: `${pct}%` }} /></div>
                  <span className="lrn-continue__pct lrn-num">{pct}%</span>
                </div>
              </span>
              <span className="lrn-phase__count lrn-num">{wDone} / {wSessions.length}</span>
            </Link>
          );
        })}
      </div>

      <h2 className="lrn-title mt-6 mb-3" style={{ fontSize: 22 }}>This week · {week.title_hi}</h2>
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
