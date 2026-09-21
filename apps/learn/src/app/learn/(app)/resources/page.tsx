export const dynamic = "force-dynamic";
import { LEVELS, RESOURCES, pick3, type Resource } from "@/lib/content/course";
import { hiddenBecause, pickLang, resourceHref } from "@/lib/content/resources";
import { stage1FileName } from "@/lib/content/stage1-files";
import Link from "next/link";
import { loadLearnerState } from "@/lib/progress/load";
import { levelOpen, stageSessions, type LearnerState } from "@/lib/progress/gating";
import { STAGE1_WEEKS, stage1Days, weekGate } from "@/lib/progress/stage1-access";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { t3, tr, type L, type Lang } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import { Download, ExternalLink, Lock } from "@/components/ui/Icon";

const S = {
  title: t3("Resources", "Resources", "रिसोर्स"),
  intro: t3("Slides, handouts and templates for your stage. Files open in a new tab.", "Aapke stage ki slides, handouts aur templates. Files naye tab mein khulti hain.", "आपके चरण की स्लाइड्स, हैंडआउट और टेम्पलेट। फ़ाइलें नए टैब में खुलती हैं।"),
  tools: t3("Tools", "Tools", "टूल"),
  locked: (n: number, prev: string) => t3(`${n} files. They open once your ${prev} certificate is issued.`, `${n} files. Ye ${prev} ka certificate milte hi khulengi.`, `${n} फ़ाइलें। ये ${prev} का सर्टिफ़िकेट मिलते ही खुलेंगी।`),
  empty: t3("Files for this stage will appear here.", "Is stage ki files yahan dikhengi.", "इस चरण की फ़ाइलें यहाँ दिखेंगी।"),
  deck: (w: number | null) => w ? t3(`Week ${w} class slides`, `Week ${w} ki class slides`, `हफ़्ता ${w} की क्लास स्लाइड्स`) : t3("Class slides", "Class slides", "क्लास स्लाइड्स"),
  handout: (w: number | null) => w ? t3(`Week ${w} handout`, `Week ${w} ka handout`, `हफ़्ता ${w} का हैंडआउट`) : t3("Handout", "Handout", "हैंडआउट"),
  dayDeck: (d: number) => t3(`Day ${d} class slides`, `Day ${d} ki class slides`, `दिन ${d} की क्लास स्लाइड्स`),
  dayHandout: (d: number) => t3(`Day ${d} handout`, `Day ${d} ka handout`, `दिन ${d} का हैंडआउट`),
  inLang: (l: "en" | "hi") => l === "en" ? t3("In English.", "English mein.", "अंग्रेज़ी में।") : t3("In Hinglish.", "Hinglish mein.", "हिंग्लिश में।"),
  deckNote: t3("The slides used in class, to revise at your own pace.", "Class mein jo slides chali thi, apni speed se revise karne ke liye.", "क्लास में जो स्लाइड्स चली थीं, अपनी रफ़्तार से दोहराने के लिए।"),
  handoutNote: t3("Short notes to read after class.", "Class ke baad padhne ke chhote notes.", "क्लास के बाद पढ़ने के छोटे नोट्स।"),
  workbook: t3("Practice workbook", "Practice workbook", "प्रैक्टिस वर्कबुक"),
  workbookNote: t3("Exercises for the whole stage, to print or work through at your own pace.", "Poore stage ki exercises, print karke ya apni speed se karne ke liye.", "पूरे चरण के अभ्यास, प्रिंट करके या अपनी रफ़्तार से करने के लिए।"),
  excel: t3("Mock portfolio template (Excel)", "Mock portfolio template (Excel)", "मॉक पोर्टफ़ोलियो टेम्पलेट (Excel)"),
  excelNote: t3("Rs 10 lakh of virtual money. Use it alongside the Portfolio page.", "Rs 10 lakh virtual paisa. Portfolio page ke saath use kijiye.", "Rs 10 लाख वर्चुअल पैसा। पोर्टफ़ोलियो पेज के साथ इस्तेमाल कीजिए।"),
  algo: t3("The Circles Algo Lab dashboard. Opens in a new tab.", "Circles Algo Lab dashboard. Naye tab mein khulta hai.", "Circles Algo Lab डैशबोर्ड। नए टैब में खुलता है।"),
  open: t3("Open", "Kholiye", "खोलें"),
  printH: t3("Print a week", "Week print kijiye", "हफ़्ता प्रिंट कीजिए"),
  printNote: t3("The whole week on A4, in English, Hinglish or Hindi: every day's lesson, task, AI Lab prompts, journal question and quiz, with the answers at the back. Print it, or save it as a PDF.", "Poora week A4 par, English, Hinglish ya Hindi mein: har din ka lesson, task, AI Lab prompts, journal sawal aur quiz, answers peeche. Print kijiye ya PDF save kijiye.", "पूरा हफ़्ता A4 पर, अंग्रेज़ी, हिंग्लिश या हिंदी में: हर दिन का पाठ, काम, AI लैब प्रॉम्प्ट, जर्नल सवाल और क्विज़, जवाब आख़िर में। प्रिंट कीजिए या PDF सेव कीजिए।"),
  weekPrint: (w: number) => t3(`Week ${w}: printable handout`, `Week ${w}: printable handout`, `हफ़्ता ${w}: प्रिंट वाला हैंडआउट`),
  opensWith: (d: number) => t3(`Opens with Day ${d}.`, `Day ${d} khulte hi khulega.`, `दिन ${d} खुलते ही खुलेगा।`),
  printOpen: t3("Open to print", "Print ke liye kholiye", "प्रिंट के लिए खोलिए"),
};

/** Stage 1: one printable handout per week (/learn/print/week/[w]), in the reader's language (the page switches
 *  language). Same rule as the page itself (lib/progress/stage1-access.ts): a week opens with its first day. */
function PrintWeeks({ state, staff, lang }: { state: LearnerState; staff: boolean; lang: Lang }) {
  return (
    <div className="mt-4">
      <h3 className="lrn-session__title">{tr(S.printH, lang)}</h3>
      <p className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)", marginTop: 4 }}>{tr(S.printNote, lang)}</p>
      <ul className="lrn-list mt-3">
        {STAGE1_WEEKS.map((w) => {
          const first = stage1Days(state, w, staff)[0];
          const shut = weekGate(state, w, staff);
          return (
            <li key={w} className="flex items-center justify-between gap-3 flex-wrap">
              <div style={{ flex: "1 1 220px" }}>
                <strong>{tr(S.weekPrint(w), lang)}</strong>
                {shut && first?.course_day && <div className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }}>{tr(S.opensWith(first.course_day), lang)}</div>}
              </div>
              {shut ? <span className="col-chip"><Lock size={12} aria-hidden /> {tr(T.locked, lang)}</span>
                : <Link href={`/learn/print/week/${w}?lang=${lang}`} className="col-btn col-btn--ghost col-btn--sm"><Download size={14} aria-hidden /> {tr(S.printOpen, lang)}</Link>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* Which rows a student may see (hiddenBecause: exam papers, private Drive files, files not uploaded yet and the
   hidden Level 2 / Level 3 v1 packs) lives in lib/content/resources.ts, shared with the session page. */
function label(r: Resource): { name: L | string; note: L | string } {
  if (r.kind === "link") return { name: r.file_name, note: /algo\.circleoptionlab/.test(r.storage_path ?? "") ? S.algo : "" };
  if (r.kind === "deck") return { name: r.day != null ? S.dayDeck(r.day) : S.deck(r.week), note: S.deckNote };
  if (r.kind === "handout") return { name: r.day != null ? S.dayHandout(r.day) : S.handout(r.week), note: S.handoutNote };
  if (r.kind === "workbook") return { name: S.workbook, note: S.workbookNote };
  if (r.kind === "excel") return { name: S.excel, note: S.excelNote };
  return { name: r.file_name, note: "" };
}

function Item({ r, lang, open, staff, shut }: { r: Resource; lang: Lang; open: boolean; staff: boolean; shut?: string }) {
  const { name, note } = label(r); const why = hiddenBecause(r); const href = resourceHref(r);
  const noteText = [tr(note, lang), r.lang ? tr(S.inLang(r.lang), lang) : ""].filter(Boolean).join(" ");
  return (
    <li className="flex items-center justify-between gap-3 flex-wrap">
      <div style={{ flex: "1 1 220px" }}>
        <strong>{tr(name, lang)}</strong>
        {noteText && <div className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }}>{noteText}</div>}
        {staff && <div className="lrn-muted lrn-num" style={{ fontSize: "var(--col-text-dense)" }}>{r.file_name}{r.lang && <> · lang {r.lang}</>}{r.day != null && <> · day {r.day}</>}{why && <> · <strong>Hidden from students:</strong> {why}</>}</div>}
      </div>
      {open && href && !shut && <a href={href} target="_blank" rel="noopener noreferrer" className="col-btn col-btn--ghost col-btn--sm"><ExternalLink size={14} aria-hidden /> {tr(S.open, lang)}</a>}
      {open && shut && <span className="col-chip" title={shut}><Lock size={12} aria-hidden /> {shut}</span>}
    </li>
  );
}

/** Slides, handouts, workbooks and the mock-portfolio template, plus the link out to the Algo Lab dashboard.
 *  Students see only files they can actually open, one language copy of each (theirs, else the one that exists),
 *  and only the stages that have published sessions (the unpublished Level 2 / Level 3 drafts stay off, as on
 *  Path). Staff see everything, every copy, with the reason a row is hidden from students. */
export default async function ResourcesPage() {
  const { state, lang } = await loadLearnerState();
  const v = supabaseConfigured() ? await getViewer() : null;
  const staff = v?.role === "admin" || v?.role === "mentor";
  const shown = staff ? RESOURCES : pickLang(RESOURCES.filter((r) => !hiddenBecause(r)), lang);
  const levels = [...LEVELS].sort((a, b) => a.sequence - b.sequence).filter((lv) => staff || stageSessions(state, lv.slug).length > 0);
  const links = shown.filter((r) => r.kind === "link");
  // A Stage 1 week's files open with that week's first day (the file route applies the same rule, stage1-access.ts).
  const weekShut = (r: Resource) => {
    if (r.level !== "foundation" || r.week == null || !stage1FileName(r.storage_path) || !weekGate(state, r.week, staff)) return undefined;
    const first = stage1Days(state, r.week, false)[0];
    return tr(first?.course_day ? S.opensWith(first.course_day) : T.locked, lang);
  };
  return (
    <>
      <h1 className="lrn-title">{tr(S.title, lang)}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{tr(S.intro, lang)}</p>
      {links.length > 0 && (
        <section className="col-card mt-4" aria-labelledby="res-tools">
          <h2 id="res-tools" className="lrn-session__title">{tr(S.tools, lang)}</h2>
          <ul className="lrn-list mt-3">{links.map((r, i) => <Item key={`${r.file_name}-${i}`} r={r} lang={lang} open staff={staff} />)}</ul>
        </section>
      )}
      {levels.map((lv) => {
        const open = levelOpen(state, lv.slug) || staff;
        const items = shown.filter((r) => r.level === lv.slug).sort((a, b) => (a.week ?? 99) - (b.week ?? 99) || (a.day ?? 0) - (b.day ?? 0));
        const prev = LEVELS.find((l) => l.sequence === lv.sequence - 1);
        return (
          <section key={lv.slug} className="col-card mt-4" aria-labelledby={`res-${lv.slug}`}>
            <div className="flex items-center gap-2 flex-wrap"><h2 id={`res-${lv.slug}`} className="lrn-session__title">{pick3(lv, "title", lang)}</h2>{!open && <span className="col-chip"><Lock size={12} aria-hidden /> {tr(T.locked, lang)}</span>}</div>
            {!open && prev ? <p className="lrn-session__sub mt-2">{tr(S.locked(items.length, pick3(prev, "title", lang)), lang)}</p>
              : items.length === 0 ? <p className="lrn-session__sub mt-2">{tr(S.empty, lang)}</p>
              : <ul className="lrn-list mt-3">{items.map((r, i) => <Item key={`${r.file_name}-${r.week}-${r.day}-${r.lang}-${i}`} r={r} lang={lang} open={open} staff={staff} shut={weekShut(r)} />)}</ul>}
            {lv.slug === "foundation" && open && <PrintWeeks state={state} staff={staff} lang={lang} />}
          </section>
        );
      })}
    </>
  );
}
