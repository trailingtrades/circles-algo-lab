"use client";
import { useRef, useState, useTransition } from "react";
import { pick3, optionText, type QuizQuestionPublic } from "@/lib/content/course";
import { t3 } from "@/lib/i18n/lang";
import { useLang } from "@/lib/i18n/LangProvider";
import { submitQuiz, type QuizResult } from "@/app/learn/(app)/session/actions";
import type { Graded } from "@/components/lesson/grade";
import { CheckCircle, XCircle, AlertCircle } from "./Icon";

const S = {
  soonTitle: t3("Quiz coming soon", "Quiz jald aayega", "क्विज़ जल्द आएगा"),
  soonBody: t3("This session's questions are being prepared.", "Is session ke sawaal abhi taiyaar ho rahe hain.", "इस सेशन के सवाल अभी तैयार हो रहे हैं।"),
  doneTitle: t3("Quiz submitted", "Quiz submit ho gaya", "क्विज़ सबमिट हो गया"),
  doneBody: t3("This quiz has one attempt, and yours is recorded.", "Is quiz mein ek hi attempt hota hai, aur aapka record ho chuka hai.", "इस क्विज़ में एक ही अटेम्प्ट होता है, और आपका रिकॉर्ड हो चुका है।"),
  intro: t3("Answer every question, then submit once. You get one attempt, and the reasoning behind each answer shows right after.", "Har sawaal ka jawab dijiye, phir ek baar submit kijiye. Attempt ek hi hai, aur har jawab ki wajah turant dikhegi.", "हर सवाल का जवाब दीजिए, फिर एक बार सबमिट कीजिए। अटेम्प्ट एक ही है, और हर जवाब की वजह तुरंत दिखेगी।"),
  answered: (a: number, b: number) => t3(`${a} of ${b} answered`, `${b} mein se ${a} ka jawab diya`, `${b} में से ${a} के जवाब दिए`),
  submit: t3("Submit answers (one attempt)", "Answers submit karein (ek hi attempt)", "जवाब सबमिट करें (एक ही अटेम्प्ट)"),
  checking: t3("Checking", "Check ho raha hai", "चेक हो रहा है"),
  recommended: t3("Recommended answer", "Recommended answer", "सुझाया गया जवाब"),
  score: t3("Your score", "Aapka score", "आपका स्कोर"),
  nextJournal: t3("Next: write one journal entry. The session is complete when both are done.", "Ab ek journal entry likhiye. Dono hone par session poora hoga.", "अब एक जर्नल एंट्री लिखिए। दोनों होने पर सेशन पूरा होगा।"),
  right: t3("correct", "sahi", "सही"),
  wrong: t3("your answer, incorrect", "aapka jawab, galat", "आपका जवाब, ग़लत"),
  failed: t3("Could not submit. Check your internet and try again.", "Submit nahi ho paaya. Internet check karke dobara try kijiye.", "सबमिट नहीं हो पाया। इंटरनेट देखकर दोबारा कोशिश कीजिए।"),
};

/** One-shot quiz: pick every answer, submit once, instant right/wrong + "Recommended answer" explanation
 *  (label kept consistent with the Algo Lab). The page passes `review` once an attempt is on record, so
 *  the learner can come back to the explanations; before that the browser holds the words only. */
export function QuizBlock({ n, questions, alreadySubmitted, review, journalSaved }: { n: number; questions: QuizQuestionPublic[]; alreadySubmitted: boolean; review?: Graded | null; journalSaved?: boolean }) {
  const { lang, tx } = useLang();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, start] = useTransition();
  const busy = useRef(false); // a second click lands before `pending` re-renders the button
  const shown: Graded | null = result?.results ? (result as Graded) : review ?? null;

  if (!questions.length) return <div className="col-empty"><AlertCircle size={32} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">{tx(S.soonTitle)}</p><p style={{ margin: 0 }}>{tx(S.soonBody)}</p></div>;
  if (alreadySubmitted && !shown) return <div className="col-empty"><CheckCircle size={32} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">{tx(S.doneTitle)}</p><p style={{ margin: 0 }}>{tx(S.doneBody)}</p></div>;

  const count = questions.filter((q) => answers[q.idx] !== undefined).length;
  const allAnswered = count === questions.length;
  function submit() {
    if (busy.current || !allAnswered) return;
    busy.current = true;
    start(async () => {
      try { setResult(await submitQuiz(n, answers)); }
      catch { setResult({ error: tx(S.failed) }); }
      finally { busy.current = false; }
    });
  }
  return (
    <div className="lrn-quiz" style={{ maxWidth: "72ch" }}>
      {!shown && <p className="lrn-muted" style={{ margin: 0 }}>{tx(S.intro)}</p>}
      {shown && (
        <p className="lrn-notice" role="status" aria-live="polite" style={{ margin: 0 }}>
          <CheckCircle size={16} aria-hidden /> <span>{tx(S.score)}: <span className="lrn-num">{shown.score} / {shown.max}</span>.{!journalSaved && <> {tx(S.nextJournal)}</>}</span>
        </p>
      )}
      {questions.map((q) => {
        const r = shown?.results.find((x) => x.idx === q.idx);
        const rec = r ? q.options[r.correct] : undefined;
        return (
          <fieldset key={q.idx} className="col-card__inner lrn-q" disabled={!!shown || pending}>
            <legend className="lrn-q__stem">{q.idx + 1}. {pick3(q, "stem", lang)}</legend>
            {q.options.map((o, i) => {
              const chosen = r ? r.chosen === i : answers[q.idx] === i;
              const mark = r ? (i === r.correct ? "right" : chosen ? "wrong" : null) : null;
              return (
                <label key={i} className={`lrn-opt${chosen ? " lrn-opt--chosen" : ""}${mark ? ` lrn-opt--${mark}` : ""}`}>
                  <input type="radio" name={`q${n}-${q.idx}`} checked={chosen} onChange={() => setAnswers((a) => ({ ...a, [q.idx]: i }))} />
                  <span>{optionText(o, lang)}</span>
                  {mark === "right" && <><CheckCircle size={16} aria-hidden /><span className="sr-only">({tx(S.right)})</span></>}
                  {mark === "wrong" && <><XCircle size={16} aria-hidden /><span className="sr-only">({tx(S.wrong)})</span></>}
                </label>
              );
            })}
            {r && <p className="lrn-q__expl"><strong>{tx(S.recommended)}:</strong> {rec ? `${optionText(rec, lang).replace(/[.\u0964]\s*$/, "")}. ` : ""}{tx(r.explanation)}</p>}
          </fieldset>
        );
      })}
      {result?.error && !shown && <p className="lrn-error" role="alert"><AlertCircle size={16} aria-hidden /> {result.error}</p>}
      {!shown && (
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" className="col-btn col-btn--primary" disabled={!allAnswered || pending} onClick={submit}>{pending ? tx(S.checking) : tx(S.submit)}</button>
          <span className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }} aria-live="polite">{tx(S.answered(count, questions.length))}</span>
        </div>
      )}
    </div>
  );
}
