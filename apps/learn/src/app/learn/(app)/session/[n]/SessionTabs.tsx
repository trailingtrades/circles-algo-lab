"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { Session, Resource, QuizQuestionPublic } from "@/lib/content/course";
import type { SessionState } from "@/lib/progress/gating";
import { PromptBlock } from "@/components/ui/PromptBlock";
import { QuizBlock } from "@/components/ui/QuizBlock";
import { markWatched, markHandoutOpened, saveJournal, type ActState } from "../actions";
import { CheckCircle, Circle, Download, AlertCircle, Lock } from "@/components/ui/Icon";

const TABS = ["Watch", "Read", "AI Lab", "Quiz", "Journal"] as const;

export function SessionTabs({ s, embed, resources, quiz, state, lang, demo }: { s: Session; embed: string | null; resources: Resource[]; quiz: QuizQuestionPublic[]; state: SessionState; lang: "en" | "hi"; demo: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Watch");
  const [watched, setWatched] = useState(state.watched_pct);
  const [handout, setHandout] = useState(state.handout_opened);
  const [journalSaved, setJournalSaved] = useState(state.journal_saved);
  const [msg, setMsg] = useState<ActState>({});
  const [pending, start] = useTransition();
  const complete = state.quiz_submitted && journalSaved;
  return (
    <>
      <div className="col-tabs" role="tablist" aria-label="Session sections">
        {TABS.map((t) => <button key={t} role="tab" type="button" className="col-tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <div className="mt-4" role="tabpanel">
        {tab === "Watch" && (
          <div>
            {embed ? <div className="lrn-video"><iframe src={embed} title={s.title_en} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" /></div>
              : <div className="col-card col-empty"><Lock size={32} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Video abhi attach nahi hua</p><p style={{ margin: 0 }}>Class recording (YouTube unlisted) admin editor se jodi jayegi. Tab tak Read aur AI Lab se shuru kijiye.</p></div>}
            <p className="lrn-muted mt-3" style={{ fontSize: "var(--col-text-body-sm)" }}>{lang === "hi" ? s.summary_hi : `Core concept: ${s.core_concept}. AI Lab: ${s.ai_lab}. Psychology: ${s.psychology}.`}</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="col-chip">Watched: <span className="lrn-num">{watched}%</span></span>
              <button type="button" className="col-btn col-btn--ghost col-btn--sm" disabled={pending || watched >= 80} onClick={() => start(async () => { const r = await markWatched(s.number, 100); setMsg(r); if (r.ok) setWatched(100); })}>Mark as watched</button>
              <span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>Attendance points need 80%+ watched and the handout opened.</span>
            </div>
          </div>
        )}
        {tab === "Read" && (
          <ul className="lrn-list">
            {resources.length === 0 && <li className="lrn-muted">Is week ke deck/handout abhi upload nahi hue.</li>}
            {resources.map((r) => (
              <li key={r.file_name} className="col-card__inner lrn-res">
                <div><strong>{r.kind}</strong> · {r.file_name}<div className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{r.note}{!r.storage_path && " · file pending upload"}</div></div>
                {r.kind === "handout" ? (
                  <button type="button" className="col-btn col-btn--ghost col-btn--sm" disabled={pending} onClick={() => start(async () => { const x = await markHandoutOpened(s.number); setMsg(x); if (x.ok) setHandout(true); })}>{handout ? <><CheckCircle size={14} aria-hidden /> Opened</> : <><Download size={14} aria-hidden /> Open handout</>}</button>
                ) : <span className="col-chip"><Download size={14} aria-hidden /> pending</span>}
              </li>
            ))}
          </ul>
        )}
        {tab === "AI Lab" && (
          <div className="lrn-list">
            <p className="lrn-muted" style={{ marginTop: 0 }}>AI = analyst, human = trigger. Prompt copy kijiye, apne AI tool mein chalaiye, aur output ko Fact / Guess / Kachra mein baantiye. Prompts English mein hi rehte hain.</p>
            {s.prompts.map((p, i) => <PromptBlock key={i} prompt={p} />)}
          </div>
        )}
        {tab === "Quiz" && <QuizBlock n={s.number} questions={quiz} lang={lang} alreadySubmitted={state.quiz_submitted} />}
        {tab === "Journal" && (
          <form className="lrn-list" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); start(async () => { const r = await saveJournal(s.number, String(f.get("body")), (f.get("kind") as "reflection" | "galti_log" | "friday_review") ?? "reflection"); setMsg(r); if (r.ok) setJournalSaved(true); }); }}>
            <p className="lrn-muted" style={{ marginTop: 0 }}>Aaj ka ek Fact, ek Guess, ek Kachra. Ya ek galti jo process mein hui. Sirf ek line bhi kaafi hai.</p>
            <div className="lrn-field"><label htmlFor="kind">Entry type</label>
              <select id="kind" name="kind" className="col-input" defaultValue={s.day === 5 ? "friday_review" : "reflection"}><option value="reflection">Reflection</option><option value="galti_log">Galti-log</option><option value="friday_review">Friday review</option></select></div>
            <div className="lrn-field"><label htmlFor="body">Your note</label><textarea id="body" name="body" className="col-input lrn-textarea" minLength={10} maxLength={4000} required /></div>
            <button className="col-btn col-btn--primary" disabled={pending}>{pending ? "Saving" : "Save journal"}</button>
            {journalSaved && <p className="lrn-notice" role="status"><CheckCircle size={16} aria-hidden /> Journal saved for this session.</p>}
          </form>
        )}
        {msg.error && <p className="lrn-error mt-3" role="alert"><AlertCircle size={16} aria-hidden /> {msg.error}</p>}
      </div>

      <section className="col-card mt-6" aria-label="Session complete gate">
        <span className="col-eyebrow">Session complete gate</span>
        <ul className="lrn-checks">
          <li>{state.quiz_submitted ? <CheckCircle size={16} aria-hidden /> : <Circle size={16} aria-hidden />} Quiz submitted</li>
          <li>{journalSaved ? <CheckCircle size={16} aria-hidden /> : <Circle size={16} aria-hidden />} Journal saved</li>
          <li className="lrn-muted">{watched >= 80 && handout ? <CheckCircle size={16} aria-hidden /> : <Circle size={16} aria-hidden />} Attendance (video 80%+ and handout) — for points, not for unlock</li>
        </ul>
        {complete ? <Link href={`/learn/session/${s.number + 1}`} className="col-btn col-btn--primary">Next session</Link>
          : <p className="lrn-muted" style={{ margin: 0 }}>Agla session tab khulega jab quiz aur journal dono ho jayein.</p>}
        {demo && <p className="lrn-muted mt-2" style={{ fontSize: "var(--col-text-dense)" }}>Preview mode: Supabase project connect hone tak progress save nahi hoti.</p>}
      </section>
    </>
  );
}
