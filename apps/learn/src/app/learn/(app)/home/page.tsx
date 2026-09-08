"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SessionCard } from "@/components/ui/SessionCard";
import { Target, Clock, Calendar, Lock, ArrowRight } from "@/components/ui/Icon";

/* Static demo data — Phase 1 only. Replaced by Supabase in Phase 3. */
export default function HomePage() {
  const { t, lang } = useLang();
  return (
    <>
      <p className="col-eyebrow">Foundation · TDP-Foundation-Oct-2026 · Week 1</p>
      <h1 className="lrn-title">{lang === "hi" ? "Namaste, Priya" : "Hello, Priya"}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{t("rankNote")}</p>

      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="today">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="col-eyebrow">{t("todayTask")}</span>
            <span className="col-chip"><Clock size={14} strokeWidth={1.75} aria-hidden />Day 3</span>
          </div>
          <h2 id="today" className="lrn-session__title">Session 3 · Teen Batti — Fact, Guess, Kachra</h2>
          <p className="lrn-session__sub">{t("todayTaskBody")}</p>
          <button type="button" className="col-btn col-btn--primary mt-3">Open session <ArrowRight size={16} aria-hidden /></button>
        </section>

        <section className="col-card" aria-label="Streak">
          <span className="col-eyebrow">Streak</span>
          <p className="lrn-num" style={{ fontSize: 40, fontWeight: 600, margin: "4px 0" }}>5 <span style={{ fontSize: 14, fontWeight: 500 }}>days</span></p>
          <p className="lrn-session__sub">{t("streakBody")}</p>
        </section>

        <section className="col-card" aria-label={t("weekProgress")}>
          <span className="col-eyebrow">{t("weekProgress")}</span>
          <div className="flex flex-wrap gap-4 mt-3">
            {[["W1", 40], ["W2", 0], ["W3", 0], ["W4", 0]].map(([w, v]) => (
              <div key={w} className="flex flex-col items-center gap-1"><ProgressRing value={v as number} label={`Week ${w}`} /><span className="col-eyebrow">{w}</span></div>
            ))}
          </div>
        </section>

        <section className="col-card" aria-label="Process Score">
          <div className="flex items-center justify-between gap-2"><span className="col-eyebrow">5C Process Score</span><span className="col-chip"><Target size={14} strokeWidth={1.75} aria-hidden />Top 25%</span></div>
          <p className="lrn-num" style={{ fontSize: 40, fontWeight: 600, margin: "4px 0" }}>112 <span style={{ fontSize: 14, fontWeight: 500 }}>/ 1000</span></p>
          <p className="lrn-session__sub">{t("rankNote")}</p>
        </section>

        <section className="col-card" aria-label={t("nextDeadline")}>
          <span className="col-eyebrow">{t("nextDeadline")}</span>
          <p className="lrn-session__title mt-2"><Calendar size={16} aria-hidden /> Week 1 exam · Fri 10 Oct, 23:59 IST</p>
          <p className="lrn-session__sub">50 pts · 20 questions · 30 min</p>
        </section>

        <section className="col-card" aria-label={t("journalPrompt")}>
          <span className="col-eyebrow">{t("journalPrompt")}</span>
          <p className="lrn-session__sub mt-2">{t("journalBody")}</p>
          <button type="button" className="col-btn col-btn--ghost col-btn--sm mt-3">Write one line</button>
        </section>
      </div>

      <h2 className="col-eyebrow mt-6 mb-3">This week · Bazaar Ki Neenv</h2>
      <div className="lrn-grid">
        <SessionCard lang={lang} n={1} day="1" titleEn="Why the market exists" titleHi="Bazaar kyun hai" concept="R-C-D-T-F" aiLab="Master prompt" psychology="Curiosity" status="complete" />
        <SessionCard lang={lang} n={2} day="2" titleEn="What a share really is" titleHi="Share asli mein kya hai" concept="Full Why" aiLab="5 AI patterns" psychology="FOMO" status="complete" />
        <SessionCard lang={lang} n={3} day="3" titleEn="Teen Batti: Fact, Guess, Kachra" titleHi="Teen batti" concept="Fact/Guess/Kachra" aiLab="LOOT-scan" psychology="Confirmation bias" status="in_progress" />
        <SessionCard lang={lang} n={4} day="4" titleEn="The six-item gate" titleHi="Six-item gate" concept="six-item gate" aiLab="Master prompt v2" psychology="Impatience" status="locked" lockedWhy={t("lockedWhy")} />
        <SessionCard lang={lang} n={5} day="5" titleEn="Friday review" titleHi="Friday review" concept="1% rule" aiLab="Galti-log" psychology="Ownership" status="locked" lockedWhy={t("lockedWhy")} />
      </div>

      <div className="col-card col-empty mt-6">
        <Lock size={36} strokeWidth={1.5} aria-hidden />
        <p className="col-empty__title">{t("emptyTitle")}</p>
        <p style={{ margin: 0 }}>{t("emptyBody")}</p>
      </div>
    </>
  );
}
