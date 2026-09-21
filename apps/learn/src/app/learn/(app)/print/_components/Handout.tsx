/* The Stage 1 handout: one week (cover, contents, 7 days, answers, disclaimer) or one day, in reading order and
 * without tabs. Server component, no client JS. Built from the same session content the app renders (liveSession /
 * content/sessions/foundation.json, generated from scripts/content_v3/smart/dayNN.json) and drawn with the app's own
 * <Visual>, so a printed page and the lesson on screen can never disagree. scripts/export-stage1.mjs prints these
 * pages to the class PDFs (apps/learn/files/stage1/).
 *
 * Deliberately NOT here: the weekend Quiz Game and final exam banks (students sit those in the app only, and their
 * papers are staff-only). The day quizzes appear without answers under each day; an answers page at the back exists
 * behind WITH_ANSWERS and is switched off. */
import Image from "next/image";
import { Visual } from "@/components/visuals/Visual";
import { pick3, optionText, type AnswerKey, type QuizQuestionPublic, type Session, type Week } from "@/lib/content/course";
import { COMPANY, CREDENTIAL_LINE, SEBI_REG_NO, TIER1 } from "@/lib/compliance/strings";
import { htmlLang, t3, tr, type L, type Lang, type Text } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import "@/styles/print.css";

/** The answers page at the back of every handout (day quizzes only). OFF (21 Sep 2026): learners can open a week's
 *  handout from its first day, and the day quizzes score points in the app, so a printed key would give away later
 *  days' answers. The app shows each explanation after the learner submits. */
export const WITH_ANSWERS = false;

export interface PrintDay { s: Session; quiz: QuizQuestionPublic[]; key: AnswerKey[] }

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/* The prompt body stays English; the line the app's Copy button adds (components/ui/PromptBlock.tsx, REPLY_IN) is
   printed under it, word for word, so a printed prompt is exactly what the app would copy. */
const REPLY_IN: Record<Lang, string> = {
  en: "",
  hi: "Reply in simple Hinglish (Hindi written in Roman script).",
  dv: "Reply in simple Hindi, in Devanagari script.",
};

export const S = {
  stage1: t3("Stage 1", "Stage 1", "चरण 1"),
  handout: t3("Class handout", "Class handout", "क्लास हैंडआउट"),
  edition: { en: t3("English edition", "English edition", "अंग्रेज़ी एडिशन"), hi: t3("Hinglish edition", "Hinglish edition", "हिंग्लिश एडिशन"), dv: t3("Hindi edition", "Hindi edition", "हिंदी एडिशन") } as Record<Lang, L>,
  daysH: t3("This week's days", "Is hafte ke din", "इस हफ़्ते के दिन"),
  howTo: t3("How to use this handout", "Is handout ko kaise use karein", "इस हैंडआउट को कैसे इस्तेमाल करें"),
  howTo1: t3("Read one day at a time, in order. Each day ends with a task, AI Lab prompts, a journal question and a 5-question quiz.", "Ek baar mein ek hi din padhiye, order se. Har din ke end mein ek task, AI Lab prompts, ek journal sawal aur 5 sawaalon ka quiz hai.", "एक बार में एक ही दिन पढ़िए, क्रम से। हर दिन के आख़िर में एक काम, AI लैब प्रॉम्प्ट, एक जर्नल सवाल और 5 सवालों का क्विज़ है।"),
  howTo2: t3("Submit the quiz and save the journal in the app: that is what opens the next day and counts for your score.", "Quiz aur journal app mein hi submit kijiye: wahi agla din kholta hai aur score mein judta hai.", "क्विज़ और जर्नल ऐप में ही सबमिट कीजिए: वही अगला दिन खोलता है और स्कोर में जुड़ता है।"),
  howTo3: t3("All charts and numbers are illustrative, and every company name in an example is made up. Virtual money only. Nothing here is a tip or a buy or sell call.", "Saare charts aur numbers sirf samjhane ke liye hain, aur examples ki har company ka naam banaya hua hai. Sirf virtual paisa. Ismein koi tip ya buy/sell call nahi hai.", "सारे चार्ट और नंबर सिर्फ़ समझाने के लिए हैं, और उदाहरणों में हर कंपनी का नाम बनाया हुआ है। सिर्फ़ वर्चुअल पैसा। इसमें कोई टिप या खरीदने-बेचने की कॉल नहीं है।"),
  edDate: t3("Edition", "Edition", "एडिशन"),
  contents: t3("Contents", "Is handout mein", "इस हैंडआउट में"),
  eachDay: t3("Every day has the same shape: the story, 4-6 topics with pictures, words of the day, a recap map, today's task, AI Lab prompts, a journal question, a closing line and a 5-question quiz.", "Har din ka dhaancha ek jaisa hai: kahani, pictures ke saath 4-6 topics, aaj ke words, recap map, aaj ka kaam, AI Lab prompts, journal sawal, ek aakhri baat aur 5 sawaalon ka quiz.", "हर दिन का ढाँचा एक जैसा है: कहानी, तस्वीरों के साथ 4-6 टॉपिक, आज के शब्द, रिकैप मैप, आज का काम, AI लैब प्रॉम्प्ट, जर्नल सवाल, एक आख़िरी बात और 5 सवालों का क्विज़।"),
  answersToc: t3("Answers to the day quizzes", "Din ke quiz ke answers", "दिन के क्विज़ के जवाब"),
  legalToc: t3("Important information and disclaimer", "Zaroori jaankari aur disclaimer", "ज़रूरी जानकारी और डिस्क्लेमर"),
  concept: t3("Concept", "Concept", "कॉन्सेप्ट"),
  aiLab: t3("AI Lab", "AI Lab", "AI लैब"),
  mindset: t3("Mindset", "Mindset", "माइंडसेट"),
  strategy: t3("Strategy", "Strategy", "स्ट्रैटेजी"),
  learn: t3("Learn", "Seekhiye", "सीखिए"),
  example: t3("Example", "Example", "उदाहरण"),
  remember: t3("Remember", "Yaad rakhiye", "याद रखिए"),
  terms: t3("Words from today", "Aaj ke naye words", "आज के नए शब्द"),
  recap: t3("Recap map", "Recap map", "रिकैप मैप"),
  kaam: t3("Today's task", "Aaj Ka Kaam", "आज का काम"),
  template: t3("Your template", "Aapka template", "आपका टेम्पलेट"),
  outcome: t3("Outcome", "Outcome", "नतीजा"),
  tools: t3("Tools", "Tools", "टूल"),
  noTools: t3("No tools needed, just a notebook and your attention.", "Koi tool nahi chahiye, bas notebook aur dhyaan.", "कोई टूल नहीं चाहिए, बस नोटबुक और ध्यान।"),
  cohort: t3("With your batch", "Batch ke saath", "बैच के साथ"),
  solo: t3("Studying on your own? Do it yourself and note what you found in your journal.", "Akele padh rahe hain? Khud kijiye aur jo mila, journal mein likh lijiye.", "अकेले पढ़ रहे हैं? ख़ुद कीजिए और जो मिला, जर्नल में लिख लीजिए।"),
  note: t3("Note", "Note", "नोट"),
  aiLead: t3("AI is the analyst; you pull the trigger. Run a prompt in any AI tool, then sort its answer into Fact, Guess and Kachra (junk).", "AI analyst hai, trigger aap dabate hain. Prompt kisi bhi AI tool mein chalaiye, phir uske jawab ko Fact, Guess aur Kachra mein baantiye.", "AI एनालिस्ट है, ट्रिगर आप दबाते हैं। प्रॉम्प्ट किसी भी AI टूल में चलाइए, फिर उसके जवाब को फ़ैक्ट, अंदाज़ा और कचरा में बाँटिए।"),
  aiLang: t3("", "Prompts English mein hi hain, AI unhe sabse achhe se samajhta hai. Har prompt ki aakhri line AI ko Hinglish mein jawab dene ko kehti hai: use bhi saath mein dijiye.", "प्रॉम्प्ट अंग्रेज़ी में ही हैं, AI उन्हें सबसे अच्छे से समझता है। हर प्रॉम्प्ट की आख़िरी लाइन AI को हिंदी में जवाब देने को कहती है: उसे भी साथ में दीजिए।"),
  aiCopy: t3("The same prompts are in this day's AI Lab tab in the app, with a Copy button. Never paste your PAN, client ID, passwords, OTPs or contract notes into any AI.", "Yahi prompts app mein is din ke AI Lab tab mein bhi hain, Copy button ke saath. Apna PAN, client ID, password, OTP ya contract note kabhi kisi AI mein mat daaliye.", "यही प्रॉम्प्ट ऐप में इस दिन के AI लैब टैब में भी हैं, कॉपी बटन के साथ। अपना PAN, क्लाइंट ID, पासवर्ड, OTP या कॉन्ट्रैक्ट नोट कभी किसी AI में मत डालिए।"),
  journal: t3("Journal", "Journal", "जर्नल"),
  journalNote: t3("Write your answer here, then save it in the app's Journal tab.", "Apna jawab yahan likhiye, phir app ke Journal tab mein save kijiye.", "अपना जवाब यहाँ लिखिए, फिर ऐप के जर्नल टैब में सेव कीजिए।"),
  quiz: t3("Quiz", "Quiz", "क्विज़"),
  quizNote: t3("Tick your answers here, then submit the quiz in the app: only the app attempt counts. The answers are at the back of this handout.", "Yahan answer tick kijiye, phir quiz app mein submit kijiye: score mein sirf app wala attempt judta hai. Answers is handout ke end mein hain.", "यहाँ जवाब पर निशान लगाइए, फिर क्विज़ ऐप में सबमिट कीजिए: स्कोर में सिर्फ़ ऐप वाला प्रयास जुड़ता है। जवाब इस हैंडआउट के आख़िर में हैं।"),
  quizNoteNoKey: t3("Tick your answers here, then submit the quiz in the app: only the app attempt counts.", "Yahan answer tick kijiye, phir quiz app mein submit kijiye: score mein sirf app wala attempt judta hai.", "यहाँ जवाब पर निशान लगाइए, फिर क्विज़ ऐप में सबमिट कीजिए: स्कोर में सिर्फ़ ऐप वाला प्रयास जुड़ता है।"),
  answers: t3("Answers: day quizzes", "Answers: din ke quiz", "जवाब: दिन के क्विज़"),
  answersNote: t3("Try each quiz yourself first, then check here. The explanation matters more than the letter.", "Pehle har quiz khud try kijiye, phir yahan milaiye. Letter se zyada explanation zaroori hai.", "पहले हर क्विज़ ख़ुद हल कीजिए, फिर यहाँ मिलाइए। अक्षर से ज़्यादा ज़रूरी उसकी वजह है।"),
  legalH: t3("Important information", "Zaroori jaankari", "ज़रूरी जानकारी"),
  legalAbout: t3("This handout is study material for CIRCLE S.M.A.R.T, Stage 1 of the 5 Circles Academy. It teaches how the market works. It does not give tips, calls or investment advice, and it does not recommend any security. Company names in the examples are made up; charts and numbers are illustrative; practice uses virtual money only.", "Ye handout CIRCLE S.M.A.R.T (5 Circles Academy ka Stage 1) ka study material hai. Ye sikhata hai ki market kaise kaam karta hai. Ismein koi tip, call ya investment advice nahi hai, aur ye kisi security ko recommend nahi karta. Examples mein company ke naam banaye hue hain; charts aur numbers sirf samjhane ke liye hain; practice sirf virtual paise se hoti hai.", "यह हैंडआउट CIRCLE S.M.A.R.T (5 Circles Academy का चरण 1) का पढ़ाई का मटीरियल है। यह सिखाता है कि मार्केट कैसे काम करता है। इसमें कोई टिप, कॉल या निवेश सलाह नहीं है, और यह किसी सिक्योरिटी की सिफ़ारिश नहीं करता। उदाहरणों में कंपनियों के नाम बनाए हुए हैं; चार्ट और नंबर सिर्फ़ समझाने के लिए हैं; प्रैक्टिस सिर्फ़ वर्चुअल पैसे से होती है।"),
  grievance: t3("Complaint? Write to our Compliance Officer first. If it is not resolved, you can take it to SEBI SCORES (scores.sebi.gov.in) or SMART ODR (smartodr.in).", "Koi shikayat hai? Pehle hamare Compliance Officer ko likhiye. Hal na ho to SEBI SCORES (scores.sebi.gov.in) ya SMART ODR (smartodr.in) par le ja sakte hain.", "कोई शिकायत है? पहले हमारे कंप्लायंस ऑफ़िसर को लिखिए। हल न हो तो SEBI SCORES (scores.sebi.gov.in) या SMART ODR (smartodr.in) पर ले जा सकते हैं।"),
  company: t3("Company", "Company", "कंपनी"),
  ra: t3("SEBI Registered Research Analyst (Non-Individual)", "SEBI Registered Research Analyst (Non-Individual)", "SEBI रजिस्टर्ड रिसर्च एनालिस्ट (नॉन-इंडिविजुअल)"),
  regNo: t3("Registration", "Registration", "रजिस्ट्रेशन"),
  po: t3("Principal Officer", "Principal Officer", "प्रिंसिपल ऑफ़िसर"),
  co: t3("Compliance Officer", "Compliance Officer", "कंप्लायंस ऑफ़िसर"),
  email: t3("Email", "Email", "ईमेल"),
  phone: t3("Phone", "Phone", "फ़ोन"),
  disclaimer: t3("Disclaimer", "Disclaimer", "डिस्क्लेमर"),
};

const say = (x: Text | null | undefined, lang: Lang) => tr(x, lang);
const dayWord = (s: Session, lang: Lang) => `${say(T.day, lang)} ${s.course_day ?? s.number}`;
const LOGO = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/logo.png`;

/** Text with blank-line paragraphs; a single newline stays a line break (pre-line), as on the lesson page. */
function Paras({ text, className }: { text: string; className: string }) {
  return <>{text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p, i) => <p key={i} className={className}>{p}</p>)}</>;
}

function tagsOf(s: Session, lang: Lang): string[] {
  const c = s.content;
  const tag = (label: L, v: Text | undefined, fallback: string | null) => { const text = tr(v, lang) || fallback; return text ? `${say(label, lang)}: ${text}` : null; };
  return [tag(S.concept, c.tags?.concept, s.core_concept), tag(S.aiLab, c.tags?.ai_lab, s.ai_lab), tag(S.mindset, c.tags?.psychology, s.psychology), tag(S.strategy, c.tags?.strategy, s.strategy)].filter(Boolean) as string[];
}

function editionDate(): string {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date());
}

function Cover({ week, days, lang }: { week: Week; days: PrintDay[]; lang: Lang }) {
  return (
    <section className="prt-cover" aria-labelledby="cover-h">
      <div className="prt-cover__top">
        <Image src={LOGO} alt="" width={52} height={52} priority unoptimized />
        <div><strong className="prt-brand">5 Circles Academy</strong><span className="prt-cred">{CREDENTIAL_LINE}</span></div>
      </div>
      <div>
        <p className="prt-kicker">CIRCLE S.M.A.R.T · {say(S.stage1, lang)}</p>
        <h1 id="cover-h" className="prt-cover__title"><span className="prt-cover__week">{say(T.week, lang)} {week.number}</span>{pick3(week, "title", lang)}</h1>
        <p className="prt-cover__sub">{say(S.handout, lang)} · {say(S.edition[lang], lang)}</p>
      </div>
      <div>
        <h2 className="prt-howto__h">{say(S.daysH, lang)}</h2>
        <ol className="prt-cover__days">
          {days.map(({ s }) => <li key={s.number}><span className="prt-cover__dn">{dayWord(s, lang)}</span><span>{pick3(s, "title", lang)}</span></li>)}
        </ol>
      </div>
      <div className="prt-howto">
        <h2 className="prt-howto__h">{say(S.howTo, lang)}</h2>
        <ul><li>{say(S.howTo1, lang)}</li><li>{say(S.howTo2, lang)}</li><li>{say(S.howTo3, lang)}</li></ul>
      </div>
      <p className="prt-cover__foot"><span>learn.optionlab.co.in/smart</span><span>{say(S.edDate, lang)}: {editionDate()}</span></p>
    </section>
  );
}

function Masthead({ s, lang }: { s: Session; lang: Lang }) {
  return (
    <div className="prt-mast">
      <Image src={LOGO} alt="" width={40} height={40} priority unoptimized />
      <div>
        <strong className="prt-brand">5 Circles Academy · CIRCLE S.M.A.R.T · {say(S.stage1, lang)}</strong>
        <span className="prt-cred">{CREDENTIAL_LINE}</span>
        <span className="prt-cred">{say(S.handout, lang)} · {dayWord(s, lang)} · {say(S.edition[lang], lang)} · {say(S.edDate, lang)}: {editionDate()}</span>
      </div>
    </div>
  );
}

function Contents({ days, lang }: { days: PrintDay[]; lang: Lang }) {
  return (
    <nav className="prt-contents" aria-labelledby="toc-h">
      <h2 id="toc-h" className="prt-pagetitle">{say(S.contents, lang)}</h2>
      <ol className="prt-toc">
        {days.map(({ s }) => (
          <li key={s.number}>
            <a href={`#day-${s.number}`}><span className="prt-toc__day">{dayWord(s, lang)}</span><span>{pick3(s, "title", lang)}</span></a>
            <p className="prt-toc__topics">{s.content.topics.map((t) => tr(t.h, lang)).filter(Boolean).join(" · ")}</p>
          </li>
        ))}
        {WITH_ANSWERS && <li><a href="#answers"><span className="prt-toc__day" aria-hidden /><span>{say(S.answersToc, lang)}</span></a></li>}
        <li><a href="#legal"><span className="prt-toc__day" aria-hidden /><span>{say(S.legalToc, lang)}</span></a></li>
      </ol>
      <p className="prt-muted prt-toc__each">{say(S.eachDay, lang)}</p>
    </nav>
  );
}

function Day({ d, lang }: { d: PrintDay; lang: Lang }) {
  const { s } = d;
  const c = s.content, n = s.number;
  const tags = tagsOf(s, lang);
  const terms = c.key_terms ?? [];
  const steps = (c.kaam_steps ?? []).map((x) => tr(x, lang)).filter(Boolean);
  const tools = c.tools.map((x) => tr(x, lang)).filter(Boolean);
  const artefacts = c.artefacts ?? [];
  const kaam = tr(c.kaam, lang), outcome = tr(c.outcome, lang), fun = tr(c.fun, lang), journal = tr(c.journal_prompt, lang), motivation = tr(c.motivation, lang);
  const reply = REPLY_IN[lang];
  return (
    <section className="prt-day" id={`day-${n}`} aria-labelledby={`day-${n}-h`}>
      <header className="prt-dayhead">
        <p className="prt-eyebrow">CIRCLE S.M.A.R.T · {say(S.stage1, lang)} · {say(T.week, lang)} {s.week} · {dayWord(s, lang)} · {s.duration_min} {say(T.minutes, lang)}</p>
        <h2 id={`day-${n}-h`} className="prt-daytitle">{pick3(s, "title", lang)}</h2>
        {tags.length > 0 && <ul className="prt-tags">{tags.map((t) => <li key={t}>{t}</li>)}</ul>}
      </header>

      <Visual v={c.story} lang={lang} />

      {c.topics.length > 0 && (
        <>
          <h3 className="prt-h">{say(S.learn, lang)}</h3>
          <ol className="prt-topics">
            {c.topics.map((t, i) => {
              const h = tr(t.h, lang), ex = tr(t.example, lang), rem = tr(t.remember, lang);
              return (
                <li key={i} className="prt-topic">
                  <div className="prt-topic__head"><span className="prt-num" aria-hidden>{String(i + 1).padStart(2, "0")}</span><h4 className="prt-topic__h">{h}</h4></div>
                  <Paras text={tr(t.p, lang)} className="prt-p" />
                  <Visual v={t.visual} lang={lang} label={h} />
                  {ex && <div className="prt-example"><span className="prt-label">{say(S.example, lang)}</span><Paras text={ex} className="prt-p" /></div>}
                  {rem && <p className="prt-remember"><strong>{say(S.remember, lang)}:</strong> {rem}</p>}
                </li>
              );
            })}
          </ol>
        </>
      )}

      {terms.length > 0 && (
        <section className="prt-block" aria-labelledby={`terms-${n}`}>
          <h3 id={`terms-${n}`} className="prt-h">{say(S.terms, lang)}</h3>
          <dl className="prt-terms">{terms.map((k, i) => <div key={i} className="prt-term"><dt>{tr(k.term, lang)}</dt><dd>{tr(k.meaning, lang)}</dd></div>)}</dl>
        </section>
      )}

      {c.mindmap && (
        <section className="prt-block" aria-labelledby={`recap-${n}`}>
          <h3 id={`recap-${n}`} className="prt-h">{say(S.recap, lang)}</h3>
          <Visual v={c.mindmap} lang={lang} />
        </section>
      )}

      <section className="prt-block prt-task" aria-labelledby={`kaam-${n}`}>
        <div className="prt-task__head">
          <h3 id={`kaam-${n}`} className="prt-h">{say(S.kaam, lang)}</h3>
          {c.kaam_min ? <span className="prt-mins">{c.kaam_min} {say(T.minutes, lang)}</span> : null}
        </div>
        {kaam && <Paras text={kaam} className="prt-p prt-brief" />}
        {steps.length > 0 && <ol className="prt-steps">{steps.map((x, i) => <li key={i}><span className="prt-box" aria-hidden />{x}</li>)}</ol>}
        {artefacts.length > 0 && (
          <div className="prt-block">
            <h4 className="prt-cell__h">{say(S.template, lang)}</h4>
            {artefacts.map((a, i) => {
              const title = tr(a.title, lang), note = tr(a.note, lang);
              return (
                <div key={i} className="prt-artefact">
                  <h4 className="prt-artefact__h">{title}</h4>
                  {note && <p className="prt-artefact__note">{note}</p>}
                  <Visual v={a.visual} lang={lang} label={title} />
                </div>
              );
            })}
          </div>
        )}
        <div className="prt-grid">
          {outcome && <div className="prt-cell"><h4 className="prt-cell__h">{say(S.outcome, lang)}</h4><p>{outcome}</p></div>}
          <div className="prt-cell">
            <h4 className="prt-cell__h">{say(S.tools, lang)}</h4>
            {tools.length ? <ul>{tools.map((t, i) => <li key={i}>{t}</li>)}</ul> : <p>{say(S.noTools, lang)}</p>}
          </div>
          {fun && <div className="prt-cell"><h4 className="prt-cell__h">{say(S.cohort, lang)}</h4><p>{fun}</p><p className="prt-muted">{say(S.solo, lang)}</p></div>}
        </div>
        {c.compliance && <p className="prt-note" lang="en"><strong>{say(S.note, lang)}:</strong> {c.compliance}</p>}
      </section>

      {s.prompts.length > 0 && (
        <section className="prt-block prt-ai" aria-labelledby={`ai-${n}`}>
          <h3 id={`ai-${n}`} className="prt-h">{say(S.aiLab, lang)}</h3>
          <p className="prt-lead">{say(S.aiLead, lang)}</p>
          {lang !== "en" && <p className="prt-muted">{say(S.aiLang, lang)}</p>}
          {s.prompts.map((p, i) => (
            <div key={i} className="prt-prompt">
              <h4 className="prt-prompt__h">{tr(p.title, lang)}</h4>
              <pre className="prt-prompt__body" lang="en">{p.body}{reply && <>{"\n\n"}<span className="prt-reply">{reply}</span></>}</pre>
            </div>
          ))}
          <p className="prt-muted">{say(S.aiCopy, lang)}</p>
        </section>
      )}

      {journal && (
        <section className="prt-block prt-journal" aria-labelledby={`jr-${n}`}>
          <h3 id={`jr-${n}`} className="prt-h">{say(S.journal, lang)}</h3>
          <Paras text={journal} className="prt-p" />
          <div className="prt-lines" aria-hidden>{Array.from({ length: 5 }, (_, i) => <span key={i} />)}</div>
          <p className="prt-muted">{say(S.journalNote, lang)}</p>
        </section>
      )}

      {motivation && <p className="prt-motivation">{motivation}</p>}

      {d.quiz.length > 0 && (
        <section className="prt-block prt-quiz" aria-labelledby={`quiz-${n}`}>
          <h3 id={`quiz-${n}`} className="prt-h">{say(S.quiz, lang)}</h3>
          <p className="prt-muted">{say(WITH_ANSWERS ? S.quizNote : S.quizNoteNoKey, lang)}</p>
          <ol className="prt-qs">
            {d.quiz.map((q, i) => (
              <li key={i} className="prt-q">
                <p className="prt-q__stem"><span className="prt-q__n">Q{i + 1}.</span> {pick3(q, "stem", lang)}</p>
                <ol className="prt-opts">{q.options.map((o, j) => <li key={j}><span className="prt-opt__l" aria-hidden>{LETTERS[j]}</span><span><span className="sr-only">{LETTERS[j]}. </span>{optionText(o, lang)}</span></li>)}</ol>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}

function Answers({ days, lang }: { days: PrintDay[]; lang: Lang }) {
  const withQuiz = days.filter((d) => d.quiz.length > 0 && d.key.length > 0);
  if (!withQuiz.length) return null;
  return (
    <section className="prt-answers" id="answers" aria-labelledby="answers-h">
      <h2 id="answers-h" className="prt-pagetitle">{say(S.answers, lang)}</h2>
      <p className="prt-muted">{say(S.answersNote, lang)}</p>
      {withQuiz.map(({ s, quiz, key }) => (
        <section key={s.number} className="prt-ans-day" aria-labelledby={`ans-${s.number}`}>
          <h3 id={`ans-${s.number}`} className="prt-h">{dayWord(s, lang)} · {pick3(s, "title", lang)}</h3>
          <ol className="prt-ans">
            {quiz.map((q, i) => {
              const k = key[i]; const o = k ? q.options[k.correct_index] : undefined;
              if (!k || !o) return null;
              return (
                <li key={i} className="prt-ans__item">
                  <p><span className="prt-ans__key">Q{i + 1} · {LETTERS[k.correct_index]}</span>{optionText(o, lang)}</p>
                  {pick3(k, "explanation", lang) && <p className="prt-ans__why">{pick3(k, "explanation", lang)}</p>}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </section>
  );
}

/** Last page: what this document is, who issued it, the grievance route and the Tier-1 disclaimer, verbatim. */
function Legal({ lang }: { lang: Lang }) {
  return (
    <section className="prt-legal" id="legal" aria-labelledby="legal-h">
      <h2 id="legal-h" className="prt-pagetitle">{say(S.legalH, lang)}</h2>
      <p>{say(S.legalAbout, lang)}</p>
      <p>{say(S.grievance, lang)}</p>
      <dl className="prt-company">
        <dt>{say(S.company, lang)}</dt><dd>{COMPANY.legal}</dd>
        <dt>SEBI</dt><dd>{say(S.ra, lang)}</dd>
        <dt>{say(S.regNo, lang)}</dt><dd>Reg. No. {SEBI_REG_NO} · {COMPANY.regGranted}</dd>
        <dt>{say(S.po, lang)}</dt><dd>{COMPANY.principalOfficer}</dd>
        <dt>{say(S.co, lang)}</dt><dd>{COMPANY.complianceOfficer}</dd>
        <dt>{say(S.email, lang)}</dt><dd>{COMPANY.email}</dd>
        <dt>{say(S.phone, lang)}</dt><dd>{COMPANY.phone}</dd>
      </dl>
      <h3 className="prt-h">{say(S.disclaimer, lang)}</h3>
      <p className="prt-disclaimer" lang="en">{TIER1}</p>
    </section>
  );
}

/** The running footer on every printed page: the credential line from lib/compliance/strings.ts and the page number.
 *  Emitted here (not in print.css) so the legal wording has one source. Constant text only. */
const PAGE_RULE = `@page prt { @bottom-center { content: ${JSON.stringify(`${CREDENTIAL_LINE} · page `)} counter(page); } }`;

export function Handout({ mode, week, days, lang }: { mode: "week" | "day"; week: Week; days: PrintDay[]; lang: Lang }) {
  return (
    <article className={`prt-doc prt-doc--${mode}`} data-theme="light" data-lang={lang} lang={htmlLang(lang)} data-print-ready="1">
      <style dangerouslySetInnerHTML={{ __html: PAGE_RULE }} />
      {mode === "week" ? <><Cover week={week} days={days} lang={lang} /><Contents days={days} lang={lang} /></> : days[0] ? <Masthead s={days[0].s} lang={lang} /> : null}
      {days.map((d) => <Day key={d.s.number} d={d} lang={lang} />)}
      {WITH_ANSWERS && <Answers days={days} lang={lang} />}
      <Legal lang={lang} />
    </article>
  );
}
