export const dynamic = "force-dynamic";
import Link from "next/link";
import { loadLearnerState } from "@/lib/progress/load";
import { gate, chainedLock, nextSession, isComplete, stateOf, currentLevel, stageSessions, levelDone } from "@/lib/progress/gating";
import { WEEKS, EXAMS, weekOf, examKey, pick3, type ExamMeta, type Session } from "@/lib/content/course";
import { SessionCard } from "@/components/ui/SessionCard";
import { SegmentedRing, courseArt } from "@/components/ui/CourseArt";
import { T } from "@/lib/i18n/strings";
import { t3, tr, type Lang } from "@/lib/i18n/lang";
import { loadScore } from "@/lib/scoring/read";
import { RankChip } from "@/components/ui/RankChip";
import { ArrowRight, ArrowUpRight, Lock, ShieldCheck } from "@/components/ui/Icon";
import { WaveJourney, type WaveStep } from "@/components/ui/WaveJourney";

const S = {
  sample: t3("Sample data", "Sample data", "सैंपल डेटा"),
  welcome: t3("Welcome", "Namaste", "नमस्ते"),
  ringLabel: t3("Sessions done", "Sessions poore", "सेशन पूरे"),
  score: t3("Process Score", "Process Score", "प्रोसेस स्कोर"),
  breakdown: t3("See breakdown", "Breakdown dekhiye", "ब्रेकडाउन देखिए"),
  today: t3("Today", "Aaj", "आज"),
  subFresh: t3("Read the lesson, then submit the quiz and write one line in your journal. That is enough for today.", "Lesson padhiye, phir quiz submit kijiye aur journal mein ek line likhiye. Aaj ke liye itna kaafi hai.", "पाठ पढ़िए, फिर क्विज़ सबमिट कीजिए और जर्नल में एक लाइन लिखिए। आज के लिए इतना काफ़ी है।"),
  subQuizDone: t3("Quiz done. Write one journal line to finish the day.", "Quiz ho gaya. Din poora karne ke liye journal mein ek line likhiye.", "क्विज़ हो गया। दिन पूरा करने के लिए जर्नल में एक लाइन लिखिए।"),
  subJournalDone: t3("Journal saved. Submit the quiz to finish the day.", "Journal save ho gaya. Din poora karne ke liye quiz submit kijiye.", "जर्नल सेव हो गया। दिन पूरा करने के लिए क्विज़ सबमिट कीजिए।"),
  openSession: t3("Open session", "Session kholiye", "सेशन खोलिए"),
  resume: t3("Continue", "Aage badhiye", "आगे बढ़िए"),
  alsoReady: t3("Also ready", "Ye bhi taiyaar hai", "यह भी तैयार है"),
  readRules: t3("Read the rules", "Rules padhiye", "नियम पढ़िए"),
  finalKick: t3("Final step", "Aakhri kadam", "आख़िरी कदम"),
  viewExam: t3("View exam", "Exam dekhiye", "एग्ज़ाम देखिए"),
  certKick: t3("Almost there", "Bas thoda aur", "बस थोड़ा और"),
  certTitle: t3("Your certificate checklist", "Aapki certificate checklist", "आपकी सर्टिफ़िकेट चेकलिस्ट"),
  certSub: t3("The final exam is behind you. See which certificate steps are still open.", "Final exam ho gaya. Dekhiye certificate ke kaun se steps abhi baaki hain.", "फ़ाइनल एग्ज़ाम हो गया। देखिए सर्टिफ़िकेट के कौन-से स्टेप अभी बाकी हैं।"),
  openCert: t3("Open certificate", "Certificate kholiye", "सर्टिफ़िकेट खोलिए"),
  stageDone: t3("Stage 1 complete", "Stage 1 poora", "चरण 1 पूरा"),
  nextStage: t3("Next: Stage 2 · CIRCLE F.U.N.D.A", "Agla: Stage 2 · CIRCLE F.U.N.D.A", "अगला: चरण 2 · CIRCLE F.U.N.D.A"),
  stage2Open: t3("Your Stage 2 access is active. Start when you are ready.", "Aapka Stage 2 access active hai. Jab taiyaar hon, shuru kijiye.", "आपका चरण 2 एक्सेस चालू है। जब तैयार हों, शुरू कीजिए।"),
  stage2Ask: t3("Stage 2 opens when your mentor enrols you. Have a look at what it covers.", "Stage 2 tab khulta hai jab aapke mentor aapko enrol karte hain. Tab tak dekh lijiye usmein kya hai.", "चरण 2 तब खुलता है जब आपके मेंटर आपको एनरोल करते हैं। तब तक देख लीजिए उसमें क्या है।"),
  goStage2: t3("Go to Stage 2", "Stage 2 par jaiye", "चरण 2 पर जाइए"),
  aboutStage2: t3("About Stage 2", "Stage 2 ke baare mein", "चरण 2 के बारे में"),
  viewCert: t3("View certificate", "Certificate dekhiye", "सर्टिफ़िकेट देखिए"),
  route: t3("Your route through this stage", "Is stage mein aapka raasta", "इस चरण में आपका रास्ता"),
  start: t3("Start", "Shuruaat", "शुरुआत"),
  finalExam: t3("Final exam", "Final exam", "फ़ाइनल एग्ज़ाम"),
  thisWeek: t3("This week", "Is hafte", "इस हफ़्ते"),
  suspendedTitle: t3("Your account is suspended", "Aapka account suspend hai", "आपका अकाउंट सस्पेंड है"),
  suspendedBody: t3("Your progress is saved. Please contact your mentor to reactivate the account.", "Aapki progress save hai. Account dobara chalu karwane ke liye apne mentor se baat kijiye.", "आपकी प्रोग्रेस सेव है। अकाउंट फिर से चालू करवाने के लिए अपने मेंटर से बात कीजिए।"),
};
/* Shown when the stage gate (nginx) sent the learner back from /winners/ or /one/: ?stage_denied=<reason>. */
const DENIED = {
  no_access: t3("That stage is not open on your account yet. It opens when your mentor enrols you.", "Ye stage abhi aapke account par khula nahi hai. Mentor ke enrol karte hi khul jayega.", "यह चरण अभी आपके अकाउंट पर खुला नहीं है। मेंटर के एनरोल करते ही खुल जाएगा।"),
  not_started: t3("Your access to that stage has not started yet. It opens on the start date your mentor set.", "Us stage ka access abhi shuru nahi hua. Mentor ki rakhi start date par khulega.", "उस चरण का एक्सेस अभी शुरू नहीं हुआ है। मेंटर की तय की हुई शुरुआत की तारीख़ पर खुलेगा।"),
  expired: t3("Your access to that stage has ended. Please talk to your mentor to extend it.", "Us stage ka access khatam ho gaya hai. Badhwane ke liye mentor se baat kijiye.", "उस चरण का एक्सेस ख़त्म हो गया है। बढ़वाने के लिए मेंटर से बात कीजिए।"),
};
// One tap from the denied banner to the Academy's enrolment line (same number everywhere).
const DENIED_CTA = t3("Unlock on WhatsApp", "WhatsApp par unlock kijiye", "WhatsApp पर अनलॉक कीजिए");
const DENIED_WA = t3(
  "Hi, I want to enrol in the next stage at the 5 Circles Academy. Please share the details.",
  "Namaste, mujhe 5 Circles Academy ka agla stage join karna hai. Details bata dijiye.",
  "नमस्ते, मुझे 5 Circles Academy का अगला चरण जॉइन करना है। डिटेल्स बता दीजिए।",
);
const dayOf = (d: number, n: number) => t3(`Day ${d} of ${n}`, `${n} din mein se Day ${d}`, `${n} दिनों में से दिन ${d}`);
const sessionsOf = (d: number, n: number) => t3(`${d} of ${n} sessions done`, `${n} mein se ${d} sessions poore`, `${n} में से ${d} सेशन पूरे`);
const allDaysDone = (n: number) => t3(`All ${n} days done`, `Saare ${n} din poore`, `सभी ${n} दिन पूरे`);
const finalSub = (n: number) => t3(`All ${n} days are done. Open the exam page to read the rules, the time limit and your attempts before you begin.`, `Saare ${n} din poore ho gaye. Shuru karne se pehle exam page par rules, time limit aur attempts padh lijiye.`, `सभी ${n} दिन पूरे हो गए। शुरू करने से पहले एग्ज़ाम पेज पर नियम, समय सीमा और अटेम्प्ट पढ़ लीजिए।`);
/** exams.json keeps the English title in `title` (no _en suffix), so pick3 cannot read it directly. */
const examTitle = (e: ExamMeta, lang: Lang) => { const x = e as ExamMeta & { title_hi?: string; title_dv?: string }; return tr({ en: x.title, hi: x.title_hi ?? x.title, dv: x.title_dv ?? "" }, lang); };
/** Exam links open the exam's own page (rules, time, attempts); the timed attempt starts there, never from Home. */
const examHref = (e: ExamMeta) => `/learn/exam/${examKey(e)}`;

/* Home = one progress block (greeting, day, ring), one "what to do now" card, the route (wave), this week's sessions.
   Everything is scoped to the learner's CURRENT level and its published sessions (currentLevel), so a Tier 1
   graduate stays on Stage 1 and is pointed to Stage 2, instead of falling through to a locked draft tier. */
export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ state, demo, lang, viewer }, sp] = await Promise.all([loadLearnerState(), searchParams]);
  const tx = (x: Parameters<typeof tr>[0]) => tr(x, lang);
  const deniedKey = typeof sp.stage_denied === "string" ? sp.stage_denied : null;
  // Unknown or empty reason (an older gate, a hand-typed URL): the general "not open yet" line.
  const denied = deniedKey === null ? null : Object.prototype.hasOwnProperty.call(DENIED, deniedKey) ? DENIED[deniedKey as keyof typeof DENIED] : DENIED.no_access;
  if (state.suspended) {
    // Before loadScore: its level lookup fails under RLS for a suspended account.
    return (
      <div className="col-card col-empty lrn-card--locked" role="status">
        <Lock size={28} strokeWidth={1.75} aria-hidden />
        <p className="col-empty__title">{tx(S.suspendedTitle)}</p>
        <p style={{ margin: 0 }}>{tx(S.suspendedBody)}</p>
      </div>
    );
  }
  const lvl = currentLevel(state);
  const ss = stageSessions(state, lvl);
  if (!ss.length) return <div className="col-card col-empty"><p className="col-empty__title">{tx(T.emptyTitle)}</p><p style={{ margin: 0 }}>{tx(T.emptyBody)}</p></div>;
  const score = await loadScore();
  const name = viewer?.full_name?.split(" ")[0] || (demo ? "Priya" : "");
  const doneN = ss.filter((s) => isComplete(stateOf(state, s.number))).length;
  const stageDone = levelDone(state, lvl);
  const next = nextSession(state, lvl);
  const focus: Session = next ?? ss.find((s) => !isComplete(stateOf(state, s.number))) ?? ss[ss.length - 1];
  const week = weekOf(focus);
  const days = ss.every((s) => s.course_day) ? ss.length : 0; // Tier 1 is counted in days (21), other tiers in sessions
  const progressLine = stageDone ? (days ? allDaysDone(days) : sessionsOf(doneN, ss.length)) : days && focus.course_day ? dayOf(focus.course_day, days) : sessionsOf(doneN, ss.length);
  const weeks = WEEKS.filter((w) => w.level === lvl).map((w) => {
    const ws = ss.filter((s) => s.week === w.number);
    return { w, total: ws.length, done: ws.filter((s) => isComplete(stateOf(state, s.number))).length };
  }).filter((x) => x.total > 0);
  const final = EXAMS.find((e) => e.level === lvl && e.week === null) ?? null;
  const finalPassed = !!(final && state.exams?.[examKey(final)]?.passed);
  const certified = state.certificates.includes(lvl);
  // A weekly Quiz Game is offered once its week is finished and it has not been attempted yet.
  const weeklyReady = weeks.filter((x) => x.done === x.total).map((x) => EXAMS.find((e) => e.level === lvl && e.week === x.w.number)).find((e) => e && !state.exams?.[examKey(e)]) ?? null;
  const [FocusGlyph] = courseArt(focus.level, focus.week);
  const fs = stateOf(state, focus.number);

  // The one "what to do now" card: today's session, then the final exam, then the certificate, then Stage 2.
  const card = !stageDone
    ? { kick: `${tx(S.today)} · ${focus.course_day ? `${tx(T.day)} ${focus.course_day}` : `${tx(T.session)} ${focus.number}`}`, title: pick3(focus, "title", lang),
        sub: tx(fs.quiz_submitted ? S.subQuizDone : fs.journal_saved ? S.subJournalDone : S.subFresh),
        cta: <Link href={`/learn/session/${focus.number}`} className="col-btn col-btn--primary">{tx(fs.quiz_submitted || fs.journal_saved || fs.watched_pct > 0 ? S.resume : S.openSession)} <ArrowRight size={16} aria-hidden /></Link> }
    : final && !finalPassed
      ? { kick: tx(S.finalKick), title: examTitle(final, lang), sub: tx(finalSub(days || ss.length)),
          cta: <Link href={examHref(final)} className="col-btn col-btn--primary">{tx(S.viewExam)} <ArrowRight size={16} aria-hidden /></Link> }
      : !certified
        ? { kick: tx(S.certKick), title: tx(S.certTitle), sub: tx(S.certSub),
            cta: <Link href="/learn/certificate" className="col-btn col-btn--primary">{tx(S.openCert)} <ArrowRight size={16} aria-hidden /></Link> }
        : { kick: tx(S.stageDone), title: tx(S.nextStage), sub: tx(state.stages?.includes("funda") ? S.stage2Open : S.stage2Ask),
            // Stage 2 lives outside the /smart app, so a plain <a> (next/link would prefix the basePath).
            cta: <span className="flex items-center gap-2 flex-wrap">
              {state.stages?.includes("funda")
                ? <a href="/funda/" className="col-btn col-btn--primary">{tx(S.goStage2)} <ArrowUpRight size={16} aria-hidden /></a>
                : <a href="/funda/about/" className="col-btn col-btn--primary">{tx(S.aboutStage2)} <ArrowUpRight size={16} aria-hidden /></a>}
              <Link href="/learn/certificate" className="col-btn col-btn--ghost col-btn--sm">{tx(S.viewCert)}</Link>
            </span> };

  const curW = stageDone ? -1 : weeks.findIndex((x) => x.done < x.total);
  const steps: WaveStep[] = [
    { key: "start", title: tx(S.start), kind: "start", done: doneN > 0 },
    ...weeks.map((x, i) => ({
      key: `w${x.w.number}`, title: `${tx(T.week)} ${x.w.number}`, sub: `${x.done}/${x.total}`,
      kind: "mid" as const, done: x.done === x.total, cur: i === curW, frac: x.total ? x.done / x.total : 0, href: `/learn/path#${lvl}-w${x.w.number}`,
    })),
    // The final-exam node links only once every day is done, so a curious early click cannot land on the exam.
    ...(final ? [{ key: "final", title: tx(S.finalExam), kind: "end" as const, done: finalPassed, cur: stageDone && !finalPassed, href: stageDone ? examHref(final) : undefined }] : []),
  ];
  const weekSessions = ss.filter((s) => s.week === focus.week);

  return (
    <>
      {denied && (
        <p className="lrn-notice mb-4" role="status">
          {tx(denied)}{" "}
          <a className="lrn-link" href={`https://wa.me/916387497277?text=${encodeURIComponent(tx(DENIED_WA))}`} target="_blank" rel="noopener noreferrer">{tx(DENIED_CTA)}</a>
        </p>
      )}
      <section className="lrn-hero mb-4">
        <div className="lrn-hero__txt">
          <p className="lrn-kicker">{tx(T.week)} {week.number} · {pick3(week, "title", lang)}{demo && ` · ${tx(S.sample)}`}</p>
          <h1 className="lrn-title">{tx(S.welcome)}{name ? `, ${name}` : ""}</h1>
          <p className="lrn-muted" style={{ marginTop: 0 }}>{tx(progressLine)}</p>
          <p className="flex items-center gap-2 flex-wrap" style={{ margin: "10px 0 0" }}>
            <RankChip rank={score.rank} band={score.band} lang={lang} />
            <span className="lrn-muted">{tx(S.score)} <strong className="lrn-num">{score.components.total}</strong> / 1000 · <Link href="/learn/score" className="lrn-link">{tx(S.breakdown)}</Link></span>
          </p>
          <p className="lrn-muted" style={{ margin: "6px 0 0", fontSize: "var(--col-text-body-sm)" }}>{tx(T.rankNote)}</p>
        </div>
        <div className="col-card lrn-ringpanel lrn-hero__ring">
          <SegmentedRing done={doneN} total={ss.length} label={tx(S.ringLabel)} />
          <p className="lrn-muted lrn-num" style={{ margin: "8px 0 0" }}>{doneN} / {ss.length}</p>
        </div>
      </section>

      {/* The next action sits right under the greeting so it is above the fold on a phone. */}
      <section className="col-card lrn-continue mb-4" aria-labelledby="now">
        <span className="lrn-tile-ico">{stageDone ? <ShieldCheck size={26} strokeWidth={1.5} aria-hidden /> : <FocusGlyph size={26} strokeWidth={1.5} aria-hidden />}</span>
        <div className="lrn-continue__body">
          <p className="lrn-continue__kick">{card.kick}</p>
          <h2 id="now" className="lrn-session__title" style={{ fontSize: 17 }}>{card.title}</h2>
          <p className="lrn-session__sub">{card.sub}</p>
          {!stageDone && weeklyReady && (
            <p className="lrn-session__sub" style={{ marginTop: 6 }}>{tx(S.alsoReady)}: <strong>{examTitle(weeklyReady, lang)}</strong> · <Link href={examHref(weeklyReady)} className="lrn-link">{tx(S.readRules)}</Link></p>
          )}
        </div>
        {card.cta}
      </section>

      <WaveJourney steps={steps} lang={lang} label={tx(S.route)} />

      <h2 className="lrn-title mt-6 mb-3" style={{ fontSize: 20 }}>{stageDone ? `${tx(T.week)} ${week.number}` : tx(S.thisWeek)} · {pick3(week, "title", lang)}</h2>
      <div className="lrn-grid">
        {weekSessions.map((s) => { const g = gate(state, s); return (
          <Link key={s.number} href={`/learn/session/${s.number}`} className="lrn-cardlink">
            <SessionCard s={s} g={g} lang={lang} why={!chainedLock(state, g)} />
          </Link>); })}
      </div>
    </>
  );
}
