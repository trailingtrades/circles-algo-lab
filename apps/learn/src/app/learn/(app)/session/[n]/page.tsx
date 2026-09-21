export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SESSIONS, weekOf, levelOf, youtubeEmbed, isWeekReviewDay, getExam, pick3, type ExamMeta } from "@/lib/content/course";
import { sessionMaterial, sessionHasHandout } from "@/lib/content/resources";
import { liveSession, liveQuizPublic, liveQuizKey } from "@/lib/content/live";
import { loadLearnerState } from "@/lib/progress/load";
import { gate, stateOf, isComplete } from "@/lib/progress/gating";
import { getViewer, createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { t3, tr, type L, type Lang, type Text } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import { LockedGate } from "@/components/ui/LockedGate";
import { QuizBlock } from "@/components/ui/QuizBlock";
import { LearnPanel, KaamPanel, AiPanel, resourceItems } from "@/components/lesson/panels";
import { VideoBlock, ResourceList, JournalForm } from "@/components/lesson/interactive";
import { grade, type Graded } from "@/components/lesson/grade";
import { ArrowRight, CheckCircle, ChevronLeft, Circle, Download } from "@/components/ui/Icon";
import css from "@/components/lesson/lesson.module.css";
import { dayText } from "@/components/ui/SessionCard";
import { SessionTabs } from "./SessionTabs";

const S = {
  back: t3("All sessions", "Saare sessions", "सारे सेशन"),
  concept: t3("Concept", "Concept", "कॉन्सेप्ट"),
  aiLab: t3("AI Lab", "AI Lab", "AI लैब"),
  mindset: t3("Mindset", "Mindset", "माइंडसेट"),
  strategy: t3("Strategy", "Strategy", "स्ट्रैटेजी"),
  draft: t3("Draft", "Draft", "ड्राफ़्ट"),
  reviewH: t3("Weekly review day", "Weekly review ka din", "साप्ताहिक रिव्यू का दिन"),
  reviewP: t3("Revise the week, then take this week's Quiz Game. The exam page shows the rules before you start.", "Hafte ko dohraiye, phir is hafte ka Quiz Game dijiye. Shuru karne se pehle exam page par saare rules dikhenge.", "हफ़्ते को दोहराइए, फिर इस हफ़्ते का क्विज़ गेम दीजिए। शुरू करने से पहले एग्ज़ाम पेज पर सारे नियम दिखेंगे।"),
  gate: t3("To open the next session", "Agla session kholne ke liye", "अगला सेशन खोलने के लिए"),
  gateLast: t3("To finish this stage", "Is stage ko poora karne ke liye", "इस चरण को पूरा करने के लिए"),
  quizStep: t3("Submit the quiz", "Quiz submit kijiye", "क्विज़ सबमिट कीजिए"),
  journalStep: t3("Save one journal entry", "Ek journal entry save kijiye", "एक जर्नल एंट्री सेव कीजिए"),
  doneSr: t3("done", "ho gaya", "पूरा"),
  todoSr: t3("not done yet", "abhi baaki hai", "अभी बाकी है"),
  attVideoHandout: t3("Attendance points (not needed to unlock): watch at least 80% of the class video and open the handout (under Class material).", "Attendance points (unlock ke liye zaroori nahi): class video ka kam se kam 80% dekhiye aur handout kholiye (Class material mein).", "अटेंडेंस पॉइंट (अनलॉक के लिए ज़रूरी नहीं): क्लास वीडियो का कम से कम 80% देखिए और हैंडआउट खोलिए (क्लास मटीरियल में)।"),
  attVideo: t3("Attendance points (not needed to unlock): watch at least 80% of the class video.", "Attendance points (unlock ke liye zaroori nahi): class video ka kam se kam 80% dekhiye.", "अटेंडेंस पॉइंट (अनलॉक के लिए ज़रूरी नहीं): क्लास वीडियो का कम से कम 80% देखिए।"),
  attHandout: t3("Attendance points: finish this session and open the handout (under Class material).", "Attendance points: ye session poora kijiye aur handout kholiye (Class material mein).", "अटेंडेंस पॉइंट: यह सेशन पूरा कीजिए और हैंडआउट खोलिए (क्लास मटीरियल में)।"),
  attDone: t3("Attendance points are added when you finish this session.", "Ye session poora karte hi attendance points jud jaate hain.", "यह सेशन पूरा करते ही अटेंडेंस पॉइंट जुड़ जाते हैं।"),
  complete: t3("Session complete.", "Session poora ho gaya.", "सेशन पूरा हो गया।"),
  next: t3("Next session", "Agla session", "अगला सेशन"),
  final: t3("Go to the final exam", "Final exam par chaliye", "फ़ाइनल एग्ज़ाम पर चलिए"),
  cert: t3("Certificate", "Certificate", "सर्टिफ़िकेट"),
  waitNext: t3("The next session opens once both are done.", "Dono ho jaane par agla session khul jaayega.", "दोनों होने पर अगला सेशन खुल जाएगा।"),
  waitLast: t3("Finish both, then take the final exam.", "Dono poore kijiye, phir final exam dijiye.", "दोनों पूरे कीजिए, फिर फ़ाइनल एग्ज़ाम दीजिए।"),
  print: t3("Print / Save as PDF", "Print / PDF save kijiye", "प्रिंट / PDF सेव कीजिए"),
  preview: t3("Preview: progress is not saved on this page.","Preview: is page par progress save nahi hoti.", "प्रीव्यू: इस पेज पर प्रोग्रेस सेव नहीं होती।"),
};

/** exams.json carries title_hi / title_dv; ExamMeta only types the English title. */
const examTitle = (e: ExamMeta, lang: Lang) => { const x = e as ExamMeta & { title_hi?: string; title_dv?: string }; return tr({ en: x.title, hi: x.title_hi ?? "", dv: x.title_dv ?? "" }, lang); };

/** The learner's recorded quiz attempt, graded for display so they can come back to the explanations.
 *  Only called once the attempt exists, so the answer key never reaches a browser before submitting. */
async function loadReview(n: number): Promise<Graded | null> {
  const v = await getViewer(); if (!v) return null;
  const sb = await createClient();
  const { data: row } = await sb.from("sessions").select("id").eq("number", n).maybeSingle(); if (!row) return null;
  const { data } = await sb.from("attempts").select("answers,score,max_score").eq("user_id", v.id).eq("session_id", row.id).not("submitted_at", "is", null).order("submitted_at").limit(1);
  const a = data?.[0]; if (!a) return null;
  const key = await liveQuizKey(n); if (!key.length) return null;
  const g = grade(key, (a.answers ?? {}) as Record<number, number>);
  return { ...g, score: a.score == null ? g.score : Number(a.score), max: a.max_score == null ? g.max : Number(a.max_score) }; // the recorded score, even if the key was edited later
}

function Mark({ ok, lang }: { ok: boolean; lang: Lang }) {
  return <>{ok ? <CheckCircle size={16} className={css.markOk} aria-hidden /> : <Circle size={16} className={css.mark} aria-hidden />}<span className="sr-only">{tr(ok ? S.doneSr : S.todoSr, lang)}: </span></>;
}

export default async function SessionPage({ params }: { params: Promise<{ n: string }> }) {
  const { n: raw } = await params;
  const n = Number(raw);
  const s = Number.isInteger(n) ? await liveSession(n) : null;
  if (!s) notFound();
  const { state, demo, lang } = await loadLearnerState();
  const g = gate(state, s);
  const st = stateOf(state, s.number);
  const week = weekOf(s), level = levelOf(s.level), c = s.content;
  const say = (x: L) => tr(x, lang);

  // Same "Day N · SNN" label as the session cards on Home and Path.
  const eyebrow = `${pick3(level, "title", lang)} · ${say(T.week)} ${week.number} · ${dayText(s, lang)} · ${s.duration_min} ${say(T.minutes)}`;
  const tag = (label: L, v: Text | undefined, fallback: string | null) => { const text = tr(v, lang) || fallback; return text ? `${say(label)}: ${text}` : null; };
  const tags = [tag(S.concept, c.tags?.concept, s.core_concept), tag(S.aiLab, c.tags?.ai_lab, s.ai_lab), tag(S.mindset, c.tags?.psychology, s.psychology), tag(S.strategy, c.tags?.strategy, s.strategy)].filter(Boolean) as string[];
  // Draft marker is for staff previewing unpublished content, never for learners.
  const staff = s.draft && supabaseConfigured() ? ["mentor", "admin"].includes((await getViewer())?.role ?? "") : false;

  const header = (
    <>
      <Link href="/learn/path" className={`lrn-link ${css.back}`}><ChevronLeft size={14} aria-hidden /> {say(S.back)}</Link>
      <header className={css.head}>
        <p className={`col-eyebrow ${css.eyebrow}`}>{eyebrow}</p>
        <h1 className="lrn-title">{pick3(s, "title", lang)}</h1>
        {(tags.length > 0 || staff) && <div className={`lrn-tags ${css.tags}`}>{tags.map((t) => <span key={t} className="col-chip">{t}</span>)}{staff && <span className="col-chip">{say(S.draft)}</span>}</div>}
      </header>
    </>
  );
  if (g.status === "locked") return <>{header}<div className="mt-4"><LockedGate gate={g} lang={lang} /></div></>;

  const [quiz, review] = await Promise.all([liveQuizPublic(n), !demo && st.quiz_submitted ? loadReview(n) : null]);
  const embed = youtubeEmbed(s.video_url);
  // Decks and handouts for this session in the reader's language, filtered like the Resources page (hiddenBecause:
  // no private Drive files, nothing without a link). Until Stage 1's v3 files exist there are none, and attendance is
  // the finished session alone; once a v3 handout is listed, opening it counts too.
  const material = sessionMaterial(s, lang);
  const handout = sessionHasHandout(s);
  const reviewDay = isWeekReviewDay(s);
  const weekExam = reviewDay ? getExam(`${s.level}-w${s.week}`) : null;
  const nextInLevel = SESSIONS.find((x) => x.level === s.level && x.number > s.number);
  const finalExam = nextInLevel ? null : getExam(`${s.level}-final`);
  const complete = isComplete(st);
  // Attendance (§9, awarded in actions.ts): with a class video, 80%+ watched; without one, the finished session. Plus the handout when the week has one.
  const attended = (embed ? st.watched_pct >= 80 : complete) && (!handout || st.handout_opened);
  const attText = embed ? (handout ? S.attVideoHandout : S.attVideo) : handout ? S.attHandout : S.attDone;

  return (
    <>
      {header}
      {/* Stage 1: the whole day (all five tabs, quiz without answers) as an A4 page to print or save as PDF. */}
      {s.level === "foundation" && <p className="mt-3"><Link href={`/learn/print/day/${s.number}?lang=${lang}`} className="col-btn col-btn--ghost col-btn--sm"><Download size={14} aria-hidden /> {say(S.print)}</Link></p>}
      {weekExam && (
        <section className={css.callout} aria-labelledby="review-h">
          <div><h2 id="review-h" className={css.calloutH}>{say(S.reviewH)}</h2><p>{say(S.reviewP)}</p></div>
          <Link href={`/learn/exam/${s.level}-w${s.week}`} className="col-btn col-btn--primary">{examTitle(weekExam, lang)} <ArrowRight size={16} aria-hidden /></Link>
        </section>
      )}
      <SessionTabs
        done={{ quiz: st.quiz_submitted, journal: st.journal_saved }}
        panels={{
          learn: <LearnPanel c={c} lang={lang}
            video={embed ? <VideoBlock n={s.number} embed={embed} title={pick3(s, "title", lang)} watched={st.watched_pct >= 80} /> : null}
            resources={material.length ? <ResourceList n={s.number} items={resourceItems(material, lang)} handoutOpened={st.handout_opened} /> : null} />,
          kaam: <KaamPanel n={s.number} c={c} lang={lang} />,
          ai: <AiPanel prompts={s.prompts} lang={lang} />,
          quiz: <QuizBlock n={s.number} questions={quiz} alreadySubmitted={st.quiz_submitted} review={review} journalSaved={st.journal_saved} />,
          journal: <JournalForm n={s.number} prompt={c.journal_prompt} review={reviewDay} saved={st.journal_saved} />,
        }}
      />

      <section className={`col-card ${css.gate}`} aria-labelledby="gate-h">
        <h2 id="gate-h" className={css.gateH}>{say(nextInLevel ? S.gate : S.gateLast)}</h2>
        <ul className="lrn-checks">
          <li><Mark ok={st.quiz_submitted} lang={lang} /> {say(S.quizStep)}</li>
          <li><Mark ok={st.journal_saved} lang={lang} /> {say(S.journalStep)}</li>
        </ul>
        <p className={css.att}><Mark ok={attended} lang={lang} /> {say(attText)}</p>
        {complete ? (
          <div className={css.gateActions}>
            <span className={css.ok}><CheckCircle size={16} aria-hidden /> {say(S.complete)}</span>
            {nextInLevel ? <Link href={`/learn/session/${nextInLevel.number}`} className="col-btn col-btn--primary">{say(S.next)} <ArrowRight size={16} aria-hidden /></Link>
              : <>{finalExam && <Link href={`/learn/exam/${s.level}-final`} className="col-btn col-btn--primary">{say(S.final)} <ArrowRight size={16} aria-hidden /></Link>}<Link href="/learn/certificate" className={`col-btn ${finalExam ? "col-btn--ghost" : "col-btn--primary"}`}>{say(S.cert)}</Link></>}
          </div>
        ) : <p className={css.gateNote}>{say(nextInLevel ? S.waitNext : S.waitLast)}</p>}
        {demo && <p className={css.preview}>{say(S.preview)}</p>}
      </section>
    </>
  );
}
