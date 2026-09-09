"use client";
import { useState, useTransition } from "react";
import type { QuizQuestionPublic } from "@/lib/content/course";
import { submitQuiz, type QuizResult } from "@/app/learn/(app)/session/actions";
import { CheckCircle, XCircle, AlertCircle } from "./Icon";

/** One-shot quiz: pick every answer, submit once, instant right/wrong + "Recommended answer" explanation (label kept consistent with the Algo Lab). */
export function QuizBlock({ n, questions, lang, alreadySubmitted }: { n: number; questions: QuizQuestionPublic[]; lang: "en" | "hi"; alreadySubmitted: boolean }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, start] = useTransition();
  if (!questions.length) return <div className="col-empty"><AlertCircle size={32} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Quiz coming soon</p><p style={{ margin: 0 }}>Is session ka question bank abhi ban raha hai. Journal aur AI Lab abhi kar sakte hain.</p></div>;
  if (alreadySubmitted && !result) return <div className="col-empty"><CheckCircle size={32} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Quiz submitted</p><p style={{ margin: 0 }}>Ye quiz one-shot hai. Aapka attempt record ho chuka hai.</p></div>;
  const done = !!result?.results;
  const allAnswered = questions.every((q) => answers[q.idx] !== undefined);
  return (
    <div className="lrn-quiz">
      {questions.map((q) => {
        const r = result?.results?.find((x) => x.idx === q.idx);
        return (
          <fieldset key={q.idx} className="col-card__inner lrn-q" disabled={done || pending}>
            <legend className="lrn-q__stem">{q.idx + 1}. {lang === "hi" ? q.stem_hi : q.stem_en}</legend>
            {q.options.map((o, i) => {
              const chosen = answers[q.idx] === i;
              const mark = r ? (i === r.correct ? "right" : chosen ? "wrong" : "") : "";
              return (
                <label key={i} className={`lrn-opt ${chosen ? "lrn-opt--chosen" : ""} lrn-opt--${mark}`}>
                  <input type="radio" name={`q${q.idx}`} checked={chosen} onChange={() => setAnswers({ ...answers, [q.idx]: i })} />
                  <span>{lang === "hi" ? o.hi : o.en}</span>
                  {mark === "right" && <CheckCircle size={16} aria-label="correct" />}
                  {mark === "wrong" && <XCircle size={16} aria-label="incorrect" />}
                </label>
              );
            })}
            {r && <p className="lrn-q__expl" aria-live="polite"><strong>Recommended answer:</strong> {q.options[r.correct][lang]}. {r.explanation}</p>}
          </fieldset>
        );
      })}
      {result?.error && <p className="lrn-error" role="alert"><AlertCircle size={16} aria-hidden /> {result.error}</p>}
      {done ? (
        <p className="lrn-notice" role="status" aria-live="polite"><CheckCircle size={16} aria-hidden /> Score <span className="lrn-num">{result!.score} / {result!.max}</span>. Ab journal likhiye — tab session complete hoga.</p>
      ) : (
        <button type="button" className="col-btn col-btn--primary" disabled={!allAnswered || pending} onClick={() => start(async () => setResult(await submitQuiz(n, answers)))}>{pending ? "Grading" : "Submit quiz (one attempt)"}</button>
      )}
    </div>
  );
}
