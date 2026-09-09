"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import type { QuizQuestionPublic } from "@/lib/content/course";
import { startOrResume, autosave, submitExam, type ExamAttempt, type ExamResult } from "../actions";
import { Clock, CheckCircle, XCircle, AlertCircle, Shield } from "@/components/ui/Icon";

/** Timed exam: autosave every 15s, resume on refresh from the server-side attempt, one submit, instant score + per-question "Recommended answer". */
export function ExamRunner({ examKey, questions, lang, demo, timeLimitMin }: { examKey: string; questions: QuizQuestionPublic[]; lang: "en" | "hi"; demo: boolean; timeLimitMin: number }) {
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [left, setLeft] = useState<number>(timeLimitMin * 60);
  const [saved, setSaved] = useState<string>("");
  const [result, setResult] = useState<ExamResult | null>(null);
  const [pending, start] = useTransition();
  const dirty = useRef(false);

  useEffect(() => { if (demo) return; startOrResume(examKey).then((r) => { if (r.error) setErr(r.error); if (r.attempt) { setAttempt(r.attempt); setAnswers(r.attempt.answers ?? {}); } }); }, [examKey, demo]);
  // server deadline drives the clock
  useEffect(() => { if (!attempt || result) return; const id = setInterval(() => setLeft(Math.max(0, Math.round((new Date(attempt.deadline_at).getTime() - Date.now()) / 1000))), 1000); return () => clearInterval(id); }, [attempt, result]);
  // autosave every 15s when dirty
  useEffect(() => { if (!attempt || result) return; const id = setInterval(async () => { if (!dirty.current) return; dirty.current = false; const r = await autosave(examKey, attempt.id, answers); setSaved(r.ok ? new Date().toLocaleTimeString("en-IN") : "save failed"); }, 15_000); return () => clearInterval(id); }, [attempt, answers, examKey, result]);
  // auto-submit at zero
  useEffect(() => { if (attempt && !result && left === 0 && !pending) start(async () => setResult(await submitExam(examKey, attempt.id, answers))); }, [left, attempt, result, answers, examKey, pending]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  const answered = Object.keys(answers).length;
  if (demo) return <div className="col-card col-empty"><Shield size={32} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Preview mode</p><p style={{ margin: 0 }}>Exam runner sign-in ke baad chalega. {questions.length} questions tayyar hain.</p></div>;
  if (err) return <p className="lrn-error" role="alert"><AlertCircle size={16} aria-hidden /> {err}</p>;
  if (!attempt) return <p className="lrn-muted">Loading attempt…</p>;
  return (
    <div>
      <div className="col-card flex items-center justify-between gap-3 flex-wrap lrn-sticky" role="status" aria-live="polite" aria-atomic="true">
        <span className="lrn-num" style={{ fontSize: 22, fontWeight: 600 }}><Clock size={18} aria-hidden /> {mm}:{ss}</span>
        <span className="col-chip">Attempt {attempt.attempt_no}</span>
        <span className="col-chip lrn-num">{answered} / {questions.length} answered</span>
        <span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{saved ? `Autosaved ${saved}` : "Autosaves every 15s"}</span>
      </div>
      <div className="lrn-quiz mt-4">
        {questions.map((q) => { const r = result?.results?.find((x) => x.idx === q.idx); return (
          <fieldset key={q.idx} className="col-card__inner lrn-q" disabled={!!result || pending}>
            <legend className="lrn-q__stem">{q.idx + 1}. {lang === "hi" ? q.stem_hi : q.stem_en}</legend>
            {q.options.map((o, i) => { const chosen = answers[q.idx] === i; const mark = r ? (i === r.correct ? "right" : chosen ? "wrong" : "") : ""; return (
              <label key={i} className={`lrn-opt ${chosen ? "lrn-opt--chosen" : ""} lrn-opt--${mark}`}>
                <input type="radio" name={`e${q.idx}`} checked={chosen} onChange={() => { setAnswers({ ...answers, [q.idx]: i }); dirty.current = true; }} />
                <span>{lang === "hi" ? o.hi : o.en}</span>{mark === "right" && <CheckCircle size={16} aria-label="correct" />}{mark === "wrong" && <XCircle size={16} aria-label="incorrect" />}
              </label>); })}
            {r && <p className="lrn-q__expl"><strong>Recommended answer:</strong> {q.options[r.correct][lang]}. {r.explanation}</p>}
          </fieldset>); })}
      </div>
      {result?.error && <p className="lrn-error mt-3" role="alert">{result.error}</p>}
      {result?.results ? (
        <div className="col-card mt-4" role="status" aria-live="polite">
          <span className="col-eyebrow">Result</span>
          <p className="lrn-num" style={{ fontSize: 32, fontWeight: 600, margin: "4px 0" }}>{result.score} / {result.max}</p>
          <p style={{ margin: 0 }}>{result.band === "distinction" ? "Distinction" : result.band === "pass" ? "Pass" : "Not passed yet"} · {result.band === "fail" ? "Ek aur attempt hai (80% cap ke saath). Pehle explanations padhiye." : "Explanations upar har question ke neeche hain."}</p>
        </div>
      ) : (
        <button type="button" className="col-btn col-btn--primary mt-4" disabled={pending || answered < questions.length} onClick={() => start(async () => setResult(await submitExam(examKey, attempt.id, answers)))}>{pending ? "Grading" : "Submit exam (one submit)"}</button>
      )}
    </div>
  );
}
