/* Lesson panels (Learn, Aaj Ka Kaam, AI Lab). Hookless, so the session page renders them on the server
   and hands them to the client tab shell; the few interactive bits are client components from ./interactive. */
import type { ReactNode } from "react";
import { t3, tr, type Lang } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import type { SessionContentV2 } from "@/lib/content/session-v2";
import type { Prompt, Resource } from "@/lib/content/course";
import { resourceHref } from "@/lib/content/resources";
import { Visual } from "@/components/visuals/Visual";
import { PromptBlock } from "@/components/ui/PromptBlock";
import { KaamSteps, type ResItem } from "./interactive";
import css from "./lesson.module.css";

const S = {
  example: t3("Example", "Example", "उदाहरण"),
  remember: t3("Remember", "Yaad rakhiye", "याद रखिए"),
  terms: t3("Words from today", "Aaj ke naye words", "आज के नए शब्द"),
  preparing: t3("This lesson is being prepared.", "Ye lesson abhi taiyaar ho raha hai.", "यह लेसन अभी तैयार हो रहा है।"),
  material: t3("Class material", "Class material", "क्लास मटीरियल"),
  kaam: t3("Today's task", "Aaj Ka Kaam", "आज का काम"),
  template: t3("Your template", "Aapka template", "आपका टेम्पलेट"),
  outcome: t3("Outcome", "Outcome", "नतीजा"),
  tools: t3("Tools", "Tools", "टूल"),
  noTools: t3("No tools needed, just a notebook and your attention.", "Koi tool nahi chahiye, bas notebook aur dhyaan.", "कोई टूल नहीं चाहिए, बस नोटबुक और ध्यान।"),
  cohort: t3("With your batch", "Batch ke saath", "बैच के साथ"),
  solo: t3("Studying on your own? Do it yourself and note what you found in your journal.", "Akele padh rahe hain? Khud kijiye aur jo mila, journal mein likh lijiye.", "अकेले पढ़ रहे हैं? ख़ुद कीजिए और जो मिला, जर्नल में लिख लीजिए।"),
  note: t3("Note", "Note", "नोट"),
  aiLead: t3("AI is the analyst; you pull the trigger. Copy a prompt, run it in any AI tool, then sort its answer into Fact, Guess and Kachra (junk).", "AI analyst hai, trigger aap dabate hain. Prompt copy kijiye, kisi bhi AI tool mein chalaiye, phir uske jawab ko Fact, Guess aur Kachra mein baantiye.", "AI एनालिस्ट है, ट्रिगर आप दबाते हैं। प्रॉम्प्ट कॉपी कीजिए, किसी भी AI टूल में चलाइए, फिर उसके जवाब को फ़ैक्ट, अंदाज़ा और कचरा में बाँटिए।"),
  aiLang: t3("Prompts stay in English because AI tools follow English instructions best.", "Prompts English mein hi rahenge, AI unhe sabse achhe se samajhta hai. Copy karne par ek line jud jaati hai ki AI jawab Hinglish mein de.", "प्रॉम्प्ट अंग्रेज़ी में ही रहेंगे, AI उन्हें सबसे अच्छे से समझता है। कॉपी करने पर एक लाइन जुड़ जाती है कि AI जवाब हिंदी में दे।"),
  noPrompt: t3("No AI Lab prompt for this session.", "Is session mein AI Lab prompt nahi hai.", "इस सेशन में AI लैब प्रॉम्प्ट नहीं है।"),
  handout: (w: number) => t3(`Week ${w} handout`, `Week ${w} handout`, `हफ़्ता ${w} हैंडआउट`),
  deck: (w: number) => t3(`Week ${w} class deck`, `Week ${w} class deck`, `हफ़्ता ${w} क्लास डेक`),
  dayHandout: (d: number) => t3(`Day ${d} handout`, `Day ${d} handout`, `दिन ${d} हैंडआउट`),
  dayDeck: (d: number) => t3(`Day ${d} class deck`, `Day ${d} class deck`, `दिन ${d} क्लास डेक`),
  langEn: t3("English", "English", "अंग्रेज़ी"),
  langHi: t3("Hinglish", "Hinglish", "हिंग्लिश"),
};

/** Text with blank-line paragraphs; a single newline stays a line break (the CSS uses pre-line). */
function Paras({ text, className }: { text: string; className: string }) {
  return <>{text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p, i) => <p key={i} className={className}>{p}</p>)}</>;
}

/** Learn tab: opening story, topics (text, visual, example, takeaway), the day's words, recap map, closing line, material. */
export function LearnPanel({ c, lang, video, resources }: { c: SessionContentV2; lang: Lang; video?: ReactNode; resources?: ReactNode }) {
  const terms = c.key_terms ?? [];
  const motivation = tr(c.motivation, lang);
  return (
    <div className={css.read}>
      {video}
      <Visual v={c.story} lang={lang} />
      {c.topics.length ? (
        <ol className={css.topics}>
          {c.topics.map((t, i) => {
            const ex = tr(t.example, lang), rem = tr(t.remember, lang);
            return (
              <li key={i} className={`col-card ${css.topic}`}>
                <span className={css.num} aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <h2 className={css.h}>{tr(t.h, lang)}</h2>
                <Paras text={tr(t.p, lang)} className={css.p} />
                <Visual v={t.visual} lang={lang} label={tr(t.h, lang)} />
                {ex && <div className={css.example}><span className={css.label}>{tr(S.example, lang)}</span><Paras text={ex} className={css.exP} /></div>}
                {rem && <p className={css.remember}><strong>{tr(S.remember, lang)}:</strong> {rem}</p>}
              </li>
            );
          })}
        </ol>
      ) : <p className="lrn-muted">{tr(S.preparing, lang)}</p>}
      {terms.length > 0 && (
        <section aria-labelledby="terms-h">
          <h2 id="terms-h" className={css.sectionH}>{tr(S.terms, lang)}</h2>
          <dl className={css.terms}>{terms.map((k, i) => <div key={i} className={css.term}><dt>{tr(k.term, lang)}</dt><dd>{tr(k.meaning, lang)}</dd></div>)}</dl>
        </section>
      )}
      <Visual v={c.mindmap} lang={lang} />
      {motivation && <p className={css.motivation}>{motivation}</p>}
      {resources && (
        <section aria-labelledby="material-h">
          <h2 id="material-h" className={css.sectionH}>{tr(S.material, lang)}</h2>
          {resources}
        </section>
      )}
    </div>
  );
}

/** Aaj Ka Kaam tab: the brief, a numbered checklist with real minutes, the templates / model cards the task builds
 *  ("Your template"), outcome, tools, the batch activity (with a solo way to do it) and the compliance note, which
 *  stays English and verbatim. */
export function KaamPanel({ n, c, lang }: { n: number; c: SessionContentV2; lang: Lang }) {
  const steps = (c.kaam_steps ?? []).map((x) => tr(x, lang)).filter(Boolean);
  const artefacts = c.artefacts ?? [];
  const tools = c.tools.map((x) => tr(x, lang)).filter(Boolean);
  const kaam = tr(c.kaam, lang), outcome = tr(c.outcome, lang), fun = tr(c.fun, lang);
  return (
    <div className={css.read}>
      <section className={`col-card ${css.kaam}`} aria-labelledby="kaam-h">
        <div className={css.kaamHead}>
          <h2 id="kaam-h" className={css.kaamH}>{tr(S.kaam, lang)}</h2>
          {c.kaam_min ? <span className={css.mins}>{c.kaam_min} {tr(T.minutes, lang)}</span> : null}
        </div>
        {kaam && <Paras text={kaam} className={css.kaamBrief} />}
        {steps.length > 0 && <KaamSteps n={n} steps={steps} />}
      </section>
      {artefacts.length > 0 && (
        <section aria-labelledby="tpl-h">
          <h2 id="tpl-h" className={css.sectionH}>{tr(S.template, lang)}</h2>
          <div className={css.stack}>
            {artefacts.map((a, i) => {
              const note = tr(a.note, lang);
              return (
                <article key={i} className={`col-card ${css.artefact}`} aria-labelledby={`tpl-${i}`}>
                  <h3 id={`tpl-${i}`} className={css.artefactH}>{tr(a.title, lang)}</h3>
                  {note && <Paras text={note} className={css.artefactNote} />}
                  <Visual v={a.visual} lang={lang} label={tr(a.title, lang)} />
                </article>
              );
            })}
          </div>
        </section>
      )}
      <div className={css.kaamGrid}>
        {outcome && <section className={css.box}><h3 className={css.boxH}>{tr(S.outcome, lang)}</h3><p>{outcome}</p></section>}
        <section className={css.box}>
          <h3 className={css.boxH}>{tr(S.tools, lang)}</h3>
          {tools.length ? <ul className={css.tools}>{tools.map((t, i) => <li key={i}>{t}</li>)}</ul> : <p>{tr(S.noTools, lang)}</p>}
        </section>
        {fun && <section className={css.box}><h3 className={css.boxH}>{tr(S.cohort, lang)}</h3><p>{fun}</p><p className={css.muted}>{tr(S.solo, lang)}</p></section>}
      </div>
      {c.compliance && <p className={css.note} lang="en"><strong>{tr(S.note, lang)}:</strong> {c.compliance}</p>}
    </div>
  );
}

/** AI Lab tab: how to use the prompts, and the prompts (English body; the copy asks for the learner's language). */
export function AiPanel({ prompts, lang }: { prompts: Prompt[]; lang: Lang }) {
  return (
    <div className={css.read}>
      <p className={css.lead}>{tr(S.aiLead, lang)}</p>
      {lang !== "en" && <p className={css.muted}>{tr(S.aiLang, lang)}</p>}
      {prompts.length ? <div className={css.stack}>{prompts.map((p, i) => <PromptBlock key={i} prompt={p} />)}</div> : <p className="lrn-muted">{tr(S.noPrompt, lang)}</p>}
    </div>
  );
}

const FORMAT: [RegExp, string][] = [[/\.pdf$/i, "PDF"], [/\.pptx?$/i, "PPT"], [/google slides/i, "Slides"], [/google sheets?/i, "Sheet"], [/google doc/i, "Doc"], [/\.xlsx?$/i, "Excel"]];

/** Learner-facing names for decks and handouts: "Day 5 handout", "Week 1 class deck" (a file name like
 *  "5C_AITC_Foundation_Week1_Deck_v1_1.pptx" also becomes "Week 1 class deck"); handouts are listed first.
 *  The meta line names the format and, for a language copy, its language (a Hindi reader gets the Hinglish copy). */
export function resourceItems(list: Resource[], lang: Lang): ResItem[] {
  return [...list].sort((a, b) => Number(b.kind === "handout") - Number(a.kind === "handout")).map((r, i) => {
    const file = r.file_name ?? "";
    const name = file.replace(/\s*\([^)]*\)\s*$/, "").replace(/\.[a-z0-9]{2,4}$/i, "").replace(/^5C(ircles)?_(AITC_)?(Foundation_|Intermediate_|Advanced_)?/i, "").replace(/_v\d+(_\d+)*$/i, "").replace(/_/g, " ").trim();
    const wk = name.match(/^Week\s?(\d+)\s+Deck$/i);
    const label = r.day != null ? tr(r.kind === "handout" ? S.dayHandout(r.day) : S.dayDeck(r.day), lang)
      : r.kind === "handout" && r.week ? tr(S.handout(r.week), lang)
      : r.kind === "deck" && r.week && (r.lang || !name) ? tr(S.deck(r.week), lang)
      : wk ? tr(S.deck(Number(wk[1])), lang) : name;
    const format = FORMAT.find(([re]) => re.test(file) || re.test(r.storage_path ?? ""))?.[1] ?? "";
    const language = r.lang === "en" ? tr(S.langEn, lang) : r.lang === "hi" ? tr(S.langHi, lang) : "";
    return { id: `${r.kind}-${i}`, label, meta: [format, language].filter(Boolean).join(" · "), href: resourceHref(r), handout: r.kind === "handout" };
  });
}
