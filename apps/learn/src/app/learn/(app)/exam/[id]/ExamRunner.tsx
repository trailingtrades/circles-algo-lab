"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startOrResume, autosave, submitExam } from "../actions";
import type { Answers, Band, ExamFacts, ExamQuestion, ExamResult, IntroView, LiveAttempt } from "../types";
import { t3, tr, type L, type Lang } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import { Clock, CheckCircle, XCircle, AlertCircle } from "@/components/ui/Icon";

const S = {
  questions: t3("Questions", "Questions", "सवाल"),
  time: t3("Time limit", "Time limit", "समय सीमा"),
  min: t3("minutes", "minute", "मिनट"),
  attempts: t3("Attempts", "Attempts", "अटेम्प्ट"),
  usedOf: (u: number, a: number) => t3(`${u} of ${a} used`, `${a} mein se ${u} ho gaye`, `${a} में से ${u} हो चुके`),
  pass: t3("Pass mark", "Pass marks", "पास होने के लिए"),
  distinction: t3("Distinction", "Distinction", "डिस्टिंक्शन"),
  best: t3("Best so far", "Ab tak ka best", "अब तक का सबसे अच्छा"),
  rules: t3("Before you start", "Shuru karne se pehle", "शुरू करने से पहले"),
  r1: t3("The timer starts when you press Start and keeps running even if you close this tab.", "Timer Start dabate hi chalu hota hai, aur tab band karne par bhi chalta rehta hai.", "टाइमर Start दबाते ही शुरू होता है और टैब बंद करने पर भी चलता रहता है।"),
  r2: t3("Your answers are saved every 15 seconds. If the connection drops, open this page again to continue.", "Aapke answers har 15 second mein save hote hain. Connection toote to yahi page dobara kholiye.", "आपके जवाब हर 15 सेकंड में सेव होते हैं। कनेक्शन टूटे तो यही पेज दोबारा खोलिए।"),
  r3: t3("When time is up the exam submits itself. Answers saved after the deadline are not counted.", "Time khatam hote hi exam apne aap submit ho jaata hai. Deadline ke baad ke answers count nahi hote.", "समय खत्म होते ही एग्ज़ाम अपने-आप सबमिट हो जाता है। डेडलाइन के बाद के जवाब नहीं गिने जाते।"),
  r4: t3("Your best attempt counts. If you do not pass, you can take it again; a retake is capped at 80% of the points.", "Aapka best attempt count hota hai. Pass na hon to dobara de sakte hain; retake mein 80% points tak hi milte hain.", "आपका सबसे अच्छा अटेम्प्ट गिना जाता है। पास न हों तो दोबारा दे सकते हैं; दोबारा देने पर 80% पॉइंट तक ही मिलते हैं।"),
  r5: t3("Correct answers are shown after you pass, or after your last attempt.", "Sahi answers pass hone ke baad, ya aakhri attempt ke baad dikhte hain.", "सही जवाब पास होने के बाद, या आखिरी अटेम्प्ट के बाद दिखते हैं।"),
  closed: (s: number, m: number) => t3(`Your last attempt ran out of time. It was graded on the answers saved before the deadline: ${s}/${m}.`, `Pichhle attempt ka time khatam ho gaya tha. Deadline se pehle save hue answers par grade hua: ${s}/${m}.`, `पिछले अटेम्प्ट का समय खत्म हो गया था। डेडलाइन से पहले सेव हुए जवाबों पर ग्रेड हुआ: ${s}/${m}।`),
  lastOne: t3("This is your last attempt.", "Ye aapka aakhri attempt hai.", "यह आपका आखिरी अटेम्प्ट है।"),
  start: (n: number, a: number) => t3(`Start attempt ${n} of ${a}`, `Attempt ${n} shuru kijiye (${a} mein se)`, `अटेम्प्ट ${n} शुरू करें (${a} में से)`),
  starting: t3("Starting", "Shuru ho raha hai", "शुरू हो रहा है"),
  passedDone: t3("You have passed this exam. There is nothing more to do here.", "Aap ye exam pass kar chuke hain. Yahan aur kuch nahi karna hai.", "आप यह एग्ज़ाम पास कर चुके हैं। यहाँ और कुछ नहीं करना है।"),
  noneLeft: t3("No attempts are left for this exam. Talk to your mentor about what to do next.", "Is exam ke attempts khatam ho gaye. Aage kya karna hai, apne mentor se baat kijiye.", "इस एग्ज़ाम के अटेम्प्ट खत्म हो गए। आगे क्या करना है, अपने मेंटर से बात कीजिए।"),
  notReady: t3("This exam is not open yet. Your mentor will share the date.", "Ye exam abhi khula nahi hai. Taareekh aapke mentor batayenge.", "यह एग्ज़ाम अभी खुला नहीं है। तारीख आपके मेंटर बताएँगे।"),
  attempt: t3("Attempt", "Attempt", "अटेम्प्ट"),
  answered: t3("answered", "answered", "जवाब दिए"),
  timeLeft: t3("Time left", "Bacha hua time", "बचा हुआ समय"),
  autosaves: t3("Saves every 15 seconds", "Har 15 second mein save", "हर 15 सेकंड में सेव"),
  savedAt: t3("Saved", "Save hua", "सेव हुआ"),
  saveFail: t3("Not saved. Check your connection.", "Save nahi hua. Internet check kijiye.", "सेव नहीं हुआ। इंटरनेट देखिए।"),
  fiveMin: t3("5 minutes left.", "5 minute bache hain.", "5 मिनट बचे हैं।"),
  oneMin: t3("1 minute left. The exam submits itself at zero.", "1 minute bacha hai. Zero par exam apne aap submit hoga.", "1 मिनट बचा है। शून्य पर एग्ज़ाम अपने-आप सबमिट होगा।"),
  timeUp: t3("Time is up. Submitting your saved answers.", "Time khatam. Save hue answers submit ho rahe hain.", "समय खत्म। सेव हुए जवाब सबमिट हो रहे हैं।"),
  submit: t3("Submit exam", "Exam submit kijiye", "एग्ज़ाम सबमिट करें"),
  grading: t3("Checking your answers", "Answers check ho rahe hain", "जवाब जाँचे जा रहे हैं"),
  unanswered: (n: number) => t3(`Unanswered questions: ${n}. There is one submit per attempt. Submit anyway?`, `${n} sawaalon ka answer baaki hai. Har attempt mein ek hi submit hai. Phir bhi submit karein?`, `${n} सवालों का जवाब बाकी है। हर अटेम्प्ट में एक ही सबमिट है। फिर भी सबमिट करें?`),
  anyway: t3("Submit anyway", "Phir bhi submit kijiye", "फिर भी सबमिट करें"),
  keepGoing: t3("Keep answering", "Answers dete rahiye", "जवाब देते रहिए"),
  offline: t3("Could not reach the server. Check your connection and try again; your saved answers are safe.", "Server tak nahi pahunch paaye. Internet check karke dobara try kijiye; save hue answers surakshit hain.", "सर्वर तक नहीं पहुँच पाए। इंटरनेट देखकर फिर से कोशिश कीजिए; सेव हुए जवाब सुरक्षित हैं।"),
  result: t3("Result", "Result", "नतीजा"),
  late: t3("Time ran out, so only the answers saved before the deadline were counted.", "Time khatam ho gaya tha, isliye sirf deadline se pehle save hue answers gine gaye.", "समय खत्म हो गया था, इसलिए सिर्फ़ डेडलाइन से पहले सेव हुए जवाब गिने गए।"),
  passedMsg: t3("The correct answer and the reason are under each question. Read the ones you got wrong.", "Har sawaal ke neeche sahi answer aur uski wajah hai. Jo galat hue, unhe zaroor padhiye.", "हर सवाल के नीचे सही जवाब और उसकी वजह है। जो गलत हुए, उन्हें ज़रूर पढ़िए।"),
  retryMsg: (n: number) => t3(`Attempts left: ${n}. The questions you got wrong are marked; revise those sessions before you try again. A retake is capped at 80% of the points. Correct answers appear after you pass or after your last attempt.`, `Bache attempts: ${n}. Jo sawaal galat hue, unpar nishaan hai; dobara dene se pehle wo sessions revise kijiye. Retake mein 80% points tak hi milte hain. Sahi answers pass hone ke baad ya aakhri attempt ke baad dikhenge.`, `बचे अटेम्प्ट: ${n}। जो सवाल गलत हुए, उन पर निशान है; दोबारा देने से पहले वो सेशन दोहराइए। दोबारा देने पर 80% पॉइंट तक ही मिलते हैं। सही जवाब पास होने के बाद या आखिरी अटेम्प्ट के बाद दिखेंगे।`),
  lastMsg: t3("That was your last attempt for this exam. The correct answers and reasons are below. Talk to your mentor about what to do next.", "Ye is exam ka aakhri attempt tha. Sahi answers aur unki wajah neeche hai. Aage kya karna hai, apne mentor se baat kijiye.", "यह इस एग्ज़ाम का आखिरी अटेम्प्ट था। सही जवाब और उनकी वजह नीचे है। आगे क्या करना है, अपने मेंटर से बात कीजिए।"),
  overview: t3("Back to exam overview", "Exam overview par wapas", "एग्ज़ाम की जानकारी पर वापस"),
  correct: t3("Correct answer", "Sahi answer", "सही जवाब"),
  notAnswered: t3("Not answered", "Answer nahi diya", "जवाब नहीं दिया"),
  markRight: t3("your answer, correct", "aapka answer, sahi", "आपका जवाब, सही"),
  markWrong: t3("your answer, wrong", "aapka answer, galat", "आपका जवाब, गलत"),
  markKey: t3("correct answer", "sahi answer", "सही जवाब"),
};
const BAND: Record<Band, L> = { distinction: t3("Distinction", "Distinction", "डिस्टिंक्शन"), pass: t3("Passed", "Pass", "पास"), fail: t3("Not passed yet", "Abhi pass nahi hua", "अभी पास नहीं हुआ") };

/** Intro (rules + Start) -> timed attempt (autosave, server deadline) -> result. Nothing starts until the learner presses Start;
 *  an attempt that is already running is resumed. Grading, deadlines and the attempt limit are all enforced in ../actions. */
export function ExamRunner({ examKey, lang, questions: paper, facts, intro, readiness }: { examKey: string; lang: Lang; questions: ExamQuestion[] | null; facts: ExamFacts; intro: IntroView; readiness: string | null }) {
  const x = useCallback((l: L) => tr(l, lang), [lang]);
  // The page sends the paper only while an attempt runs (so it re-renders in a new language); Start hands it over the first time.
  const [started, setStarted] = useState<ExamQuestion[] | null>(null);
  const questions = paper ?? started ?? [];
  const router = useRouter();
  const [attempt, setAttempt] = useState<LiveAttempt | null>(intro.open);
  const [answers, setAnswers] = useState<Answers>(intro.open?.answers ?? {});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [saved, setSaved] = useState<{ ok: boolean; at: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  // Latest answers live in a ref so the 15 s autosave timer is not restarted by every click (it never fired for a fast answerer).
  const answersRef = useRef<Answers>(intro.open?.answers ?? {});
  const ver = useRef(0), savedVer = useRef(0), submitting = useRef(false), skew = useRef(0);
  const topRef = useRef<HTMLDivElement>(null);

  const submit = useCallback(() => {
    if (!attempt || submitting.current) return;
    submitting.current = true; setErr(null);
    start(async () => {
      try {
        const r = await submitExam(examKey, attempt.id, answersRef.current);
        if (r.results) { setResult(r); topRef.current?.scrollIntoView({ block: "start" }); }
        else { setErr(r.error ?? x(S.offline)); submitting.current = false; }
      } catch { setErr(x(S.offline)); submitting.current = false; }
    });
  }, [attempt, examKey, x]);

  // Autosave only when something changed since the last good save; a failed save stays dirty and is retried next tick.
  const save = useCallback(async () => {
    if (!attempt || submitting.current || ver.current === savedVer.current) return;
    const v = ver.current;
    try {
      const r = await autosave(examKey, attempt.id, answersRef.current);
      if (r.ok) { savedVer.current = Math.max(savedVer.current, v); setSaved({ ok: true, at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) }); }
      else { setSaved({ ok: false, at: "" }); if (r.closed) submit(); }
    } catch { setSaved({ ok: false, at: "" }); }
  }, [attempt, examKey, submit]);

  // Server clock minus device clock, taken when the attempt arrives: the countdown follows the server deadline even on a wrong phone clock.
  useEffect(() => { if (attempt) skew.current = attempt.now - Date.now(); }, [attempt]);
  useEffect(() => {
    if (!attempt || result) return;
    const end = Math.min(attempt.deadline_at ? Date.parse(attempt.deadline_at) : Infinity, Date.parse(attempt.started_at) + facts.minutes * 60_000);
    const tick = () => setLeft(Math.max(0, Math.round((end - (Date.now() + skew.current)) / 1000)));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [attempt, result, facts.minutes]);
  useEffect(() => {
    if (!attempt || result) return;
    const id = setInterval(() => void save(), 15_000);
    const onHide = () => { if (document.visibilityState === "hidden") void save(); }, onLeave = () => void save();
    document.addEventListener("visibilitychange", onHide); window.addEventListener("pagehide", onLeave);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", onLeave); };
  }, [attempt, result, save]);
  // At zero the exam submits itself; the server still decides what counts.
  useEffect(() => { if (left === 0 && attempt && !result) submit(); }, [left, attempt, result, submit]);

  const begin = () => { setErr(null); start(async () => { try { const r = await startOrResume(examKey); if (r.attempt) { setStarted(r.questions ?? null); answersRef.current = r.attempt.answers ?? {}; ver.current = savedVer.current = 0; submitting.current = false; setAnswers(answersRef.current); setSaved(null); setLeft(null); setAttempt(r.attempt); } else setErr(r.error ?? x(S.offline)); } catch { setErr(x(S.offline)); } }); };
  const overview = () => { setResult(null); setAttempt(null); setErr(null); setConfirm(false); setLeft(null); router.refresh(); };
  const choose = (idx: number, i: number) => { const next = { ...answersRef.current, [idx]: i }; answersRef.current = next; ver.current++; setAnswers(next); setConfirm(false); };

  const answered = questions.filter((q) => answers[q.idx] !== undefined).length;

  /* ---------- intro ---------- */
  if (!attempt) {
    const { used, passed, best, closed } = intro; const noneLeft = used >= facts.allowed;
    let action: React.ReactNode;
    if (intro.state !== "ready") action = <p className="lrn-notice mt-3"><AlertCircle size={16} aria-hidden /> {intro.msg}</p>;
    else if (!facts.count) action = <p className="lrn-notice mt-3"><AlertCircle size={16} aria-hidden /> {x(S.notReady)}</p>;
    else if (passed) action = <p className="lrn-notice mt-3"><CheckCircle size={16} aria-hidden /> {x(S.passedDone)}</p>;
    else if (noneLeft) action = <p className="lrn-notice mt-3"><AlertCircle size={16} aria-hidden /> {x(S.noneLeft)}</p>;
    else action = (
      <>
        {used === facts.allowed - 1 && <p className="lrn-notice" style={{ marginTop: 12 }}><AlertCircle size={16} aria-hidden /> {x(S.lastOne)}</p>}
        <button type="button" className="col-btn col-btn--primary mt-3" disabled={pending} onClick={begin}>{pending ? x(S.starting) : x(S.start(used + 1, facts.allowed))}</button>
        {err && <p className="lrn-error mt-3" role="alert"><AlertCircle size={16} aria-hidden /> {err} <button type="button" className="col-btn col-btn--ghost col-btn--sm" onClick={begin}>{x(T.tryAgain)}</button></p>}
      </>
    );
    return (
      <section className="col-card" aria-labelledby="ex-rules">
        <dl className="lrn-dl" style={{ marginTop: 0 }}>
          <dt>{x(S.questions)}</dt><dd className="lrn-num">{facts.count || "–"}</dd>
          <dt>{x(S.time)}</dt><dd><span className="lrn-num">{facts.minutes}</span> {x(S.min)}</dd>
          <dt>{x(S.attempts)}</dt><dd>{x(S.usedOf(used, facts.allowed))}</dd>
          <dt>{x(S.pass)}</dt><dd className="lrn-num">{facts.pass} / {facts.total}</dd>
          <dt>{x(S.distinction)}</dt><dd className="lrn-num">{facts.distinction} / {facts.total}</dd>
          {best && <><dt>{x(S.best)}</dt><dd><span className="lrn-num">{best.score} / {best.max}</span> · {x(BAND[best.band])}</dd></>}
        </dl>
        {closed?.score != null && <p className="lrn-notice mt-3"><Clock size={16} aria-hidden /> {x(S.closed(closed.score, closed.max ?? facts.total))}</p>}
        <h2 id="ex-rules" className="lrn-session__title mt-4">{x(S.rules)}</h2>
        <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: "var(--col-text-body-sm)" }}>{[S.r1, S.r2, S.r3, S.r4, S.r5].map((r, i) => <li key={i} style={{ marginTop: 4 }}>{x(r)}</li>)}</ul>
        {readiness && !passed && !noneLeft && <p className="lrn-muted mt-3" style={{ marginBottom: 0 }}>{readiness}</p>}
        {action}
      </section>
    );
  }

  /* ---------- running / result ---------- */
  const done = !!result?.results, timeUp = left === 0 && !done;
  const mm = String(Math.floor((left ?? 0) / 60)).padStart(2, "0"), ss = String((left ?? 0) % 60).padStart(2, "0");
  const warn = done || left === null ? "" : left === 0 ? x(S.timeUp) : left <= 60 ? x(S.oneMin) : left <= 300 ? x(S.fiveMin) : "";
  const r = result;
  return (
    <div ref={topRef} style={{ scrollMarginTop: 16 }}>
      {done && r ? (
        <section className="col-card mb-4" role="status" aria-live="polite">
          <span className="col-eyebrow">{x(S.result)}</span>
          <p className="lrn-num" style={{ fontSize: 32, fontWeight: 600, margin: "4px 0" }}>{r.score} / {r.max}</p>
          <p style={{ margin: 0, fontWeight: 600 }}>{x(BAND[r.band ?? "fail"])}</p>
          {r.late && <p className="lrn-muted" style={{ margin: "8px 0 0" }}>{x(S.late)}</p>}
          <p style={{ margin: "8px 0 0" }}>{r.band !== "fail" ? x(S.passedMsg) : (r.attemptsLeft ?? 0) > 0 ? x(S.retryMsg(r.attemptsLeft ?? 0)) : x(S.lastMsg)}</p>
          <button type="button" className="col-btn col-btn--ghost col-btn--sm mt-3" onClick={overview}>{x(S.overview)}</button>
        </section>
      ) : (
        <div className="col-card flex items-center justify-between gap-3 flex-wrap lrn-sticky">
          <span className={`lrn-num ${left !== null && left <= 60 ? "col-down" : ""}`} style={{ fontSize: 22, fontWeight: 600 }} aria-label={`${x(S.timeLeft)} ${mm}:${ss}`}><Clock size={18} aria-hidden /> {left === null ? "--:--" : `${mm}:${ss}`}</span>
          <span className="col-chip">{x(S.attempt)} {attempt.attempt_no} / {facts.allowed}</span>
          <span className="col-chip lrn-num">{answered} / {questions.length} {x(S.answered)}</span>
          <span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{saved ? (saved.ok ? `${x(S.savedAt)} ${saved.at}` : x(S.saveFail)) : x(S.autosaves)}</span>
        </div>
      )}
      {/* Announce only the 5-minute, 1-minute and time-up moments, not every second. */}
      <p className="sr-only" aria-live="assertive">{warn}</p>
      <div className="lrn-quiz mt-4">
        {questions.map((q) => {
          const qr = r?.results?.find((y) => y.idx === q.idx);
          return (
            <fieldset key={q.idx} className="col-card__inner lrn-q" disabled={done || pending || timeUp}>
              <legend className="lrn-q__stem">{q.idx + 1}. {q.stem}</legend>
              {q.options.map((o, i) => {
                const chosen = answers[q.idx] === i;
                // Before the answers may be shown, only the learner's own pick is marked right or wrong.
                const mark = !qr ? "" : qr.correct !== undefined ? (i === qr.correct ? "right" : chosen ? "wrong" : "") : chosen ? (qr.right ? "right" : "wrong") : "";
                return (
                  <label key={i} className={`lrn-opt ${chosen ? "lrn-opt--chosen" : ""} ${mark ? `lrn-opt--${mark}` : ""}`}>
                    <input type="radio" name={`e${q.idx}`} checked={chosen} onChange={() => choose(q.idx, i)} />
                    <span>{o}</span>
                    {mark === "right" && <CheckCircle size={16} role="img" aria-label={x(chosen ? S.markRight : S.markKey)} />}
                    {mark === "wrong" && <XCircle size={16} role="img" aria-label={x(S.markWrong)} />}
                  </label>
                );
              })}
              {qr && qr.chosen < 0 && <p className="lrn-q__expl">{x(S.notAnswered)}</p>}
              {qr?.correct !== undefined && <p className="lrn-q__expl"><strong>{x(S.correct)}:</strong> {q.options[qr.correct]}.{qr.explanation ? ` ${qr.explanation}` : ""}</p>}
            </fieldset>
          );
        })}
      </div>
      {err && <p className="lrn-error mt-3" role="alert"><AlertCircle size={16} aria-hidden /> {err}{!done && <> <button type="button" className="col-btn col-btn--ghost col-btn--sm" onClick={overview}>{x(S.overview)}</button></>}</p>}
      {!done && (confirm ? (
        <div className="col-card mt-4" role="alert">
          <p style={{ margin: 0 }}>{x(S.unanswered(questions.length - answered))}</p>
          <div className="lrn-actions mt-3"><button type="button" className="col-btn col-btn--primary" disabled={pending} onClick={submit}>{pending ? x(S.grading) : x(S.anyway)}</button><button type="button" className="col-btn col-btn--ghost" onClick={() => setConfirm(false)}>{x(S.keepGoing)}</button></div>
        </div>
      ) : (
        <button type="button" className="col-btn col-btn--primary mt-4" disabled={pending} onClick={() => (answered < questions.length ? setConfirm(true) : submit())}>{pending ? x(S.grading) : x(S.submit)}</button>
      ))}
    </div>
  );
}
