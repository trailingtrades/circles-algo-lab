export const dynamic = "force-dynamic";
import { LEVELS, RESOURCES, pick3, type Resource } from "@/lib/content/course";
import { loadLearnerState } from "@/lib/progress/load";
import { levelOpen } from "@/lib/progress/gating";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { t3, tr, type L, type Lang } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import { ExternalLink, Lock } from "@/components/ui/Icon";

const S = {
  title: t3("Resources", "Resources", "रिसोर्स"),
  intro: t3("Slides, handouts and templates for your stage. Files open in a new tab.", "Aapke stage ki slides, handouts aur templates. Files naye tab mein khulti hain.", "आपके चरण की स्लाइड्स, हैंडआउट और टेम्पलेट। फ़ाइलें नए टैब में खुलती हैं।"),
  tools: t3("Tools", "Tools", "टूल"),
  locked: (n: number, prev: string) => t3(`${n} files. They open once your ${prev} certificate is issued.`, `${n} files. Ye ${prev} ka certificate milte hi khulengi.`, `${n} फ़ाइलें। ये ${prev} का सर्टिफ़िकेट मिलते ही खुलेंगी।`),
  empty: t3("Files for this stage will appear here.", "Is stage ki files yahan dikhengi.", "इस चरण की फ़ाइलें यहाँ दिखेंगी।"),
  deck: (w: number | null) => w ? t3(`Week ${w} class slides`, `Week ${w} ki class slides`, `हफ़्ता ${w} की क्लास स्लाइड्स`) : t3("Class slides", "Class slides", "क्लास स्लाइड्स"),
  handout: (w: number | null) => w ? t3(`Week ${w} handout`, `Week ${w} ka handout`, `हफ़्ता ${w} का हैंडआउट`) : t3("Handout", "Handout", "हैंडआउट"),
  deckNote: t3("The slides used in class, to revise at your own pace.", "Class mein jo slides chali thi, apni speed se revise karne ke liye.", "क्लास में जो स्लाइड्स चली थीं, अपनी रफ़्तार से दोहराने के लिए।"),
  handoutNote: t3("Short notes to read after class.", "Class ke baad padhne ke chhote notes.", "क्लास के बाद पढ़ने के छोटे नोट्स।"),
  workbook: t3("Practice workbook", "Practice workbook", "प्रैक्टिस वर्कबुक"),
  workbookNote: t3("Exercises for the whole stage, to print or work through at your own pace.", "Poore stage ki exercises, print karke ya apni speed se karne ke liye.", "पूरे चरण के अभ्यास, प्रिंट करके या अपनी रफ़्तार से करने के लिए।"),
  excel: t3("Mock portfolio template (Excel)", "Mock portfolio template (Excel)", "मॉक पोर्टफ़ोलियो टेम्पलेट (Excel)"),
  excelNote: t3("Rs 10 lakh of virtual money. Use it alongside the Portfolio page.", "Rs 10 lakh virtual paisa. Portfolio page ke saath use kijiye.", "Rs 10 लाख वर्चुअल पैसा। पोर्टफ़ोलियो पेज के साथ इस्तेमाल कीजिए।"),
  algo: t3("The Circles Algo Lab dashboard. Opens in a new tab.", "Circles Algo Lab dashboard. Naye tab mein khulta hai.", "Circles Algo Lab डैशबोर्ड। नए टैब में खुलता है।"),
  open: t3("Open", "Kholiye", "खोलें"),
};

/* These five Drive files are private: students get a Google sign-in wall (401 in the 19 Sep audit).
   They stay hidden until their sharing is "Anyone with the link: Viewer". */
const PRIVATE_DRIVE = ["1MJsyuDyzMdXUTBBjojRQoA_G3_Z-pgWL", "1XUH2eezNFWBp_3UebzPCo4O6zdOMbes6Q2XKL1Q_P-0", "1OCWV7Yr-8n-UU5VyJrTJyIaMy7Qlt5iEzmKRpiqPDXE", "1e5iLlkY0cGhRp9KoQsUsQgf77LkfX5vmedHRAEr3Jio", "1ZzMybEjVJpPpG6DFqsJyd5RceOJHgrCwNkYT1f8vIh4"];
/** Why a row is not shown to students (staff still see it, labelled). null = show it. */
function hiddenBecause(r: Resource): string | null {
  // Exam papers are the answer-bearing print versions: students sit exams in the app, never from a PDF.
  if (r.kind === "exam") return "Exam paper (print version with answers): staff only";
  if (/Question_Bank/i.test(r.file_name)) return "Question bank with answers: staff only";
  if (!r.storage_path) return "Not uploaded yet";
  if (PRIVATE_DRIVE.some((id) => r.storage_path!.includes(id))) return "Private Google file: students get a sign-in wall. Share as 'Anyone with the link: Viewer' to show it";
  // Tier 1 is 3 weeks in Curriculum v2; the v1 pack's Week 4 files no longer match any week.
  if (r.level === "foundation" && /Week4|Handout4/i.test(r.file_name)) return "Old v1 Week 4 file: Tier 1 has 3 weeks";
  return null;
}
function label(r: Resource): { name: L | string; note: L | string } {
  if (r.kind === "link") return { name: r.file_name, note: /algo\.circleoptionlab/.test(r.storage_path ?? "") ? S.algo : "" };
  if (r.kind === "deck") return { name: S.deck(r.week), note: S.deckNote };
  if (r.kind === "handout") return { name: S.handout(r.week), note: S.handoutNote };
  if (r.kind === "workbook") return { name: S.workbook, note: S.workbookNote };
  if (r.kind === "excel") return { name: S.excel, note: S.excelNote };
  return { name: r.file_name, note: "" };
}

function Item({ r, lang, open, staff }: { r: Resource; lang: Lang; open: boolean; staff: boolean }) {
  const { name, note } = label(r); const why = hiddenBecause(r);
  return (
    <li className="flex items-center justify-between gap-3 flex-wrap">
      <div style={{ flex: "1 1 220px" }}>
        <strong>{tr(name, lang)}</strong>
        {note && <div className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }}>{tr(note, lang)}</div>}
        {staff && <div className="lrn-muted lrn-num" style={{ fontSize: "var(--col-text-dense)" }}>{r.file_name}{why && <> · <strong>Hidden from students:</strong> {why}</>}</div>}
      </div>
      {open && r.storage_path && <a href={r.storage_path} target="_blank" rel="noopener noreferrer" className="col-btn col-btn--ghost col-btn--sm"><ExternalLink size={14} aria-hidden /> {tr(S.open, lang)}</a>}
    </li>
  );
}

/** Slides, handouts, workbooks and the mock-portfolio template, plus the link out to the Algo Lab dashboard.
 *  Students see only files they can actually open; staff see everything, with the reason a row is hidden. */
export default async function ResourcesPage() {
  const { state, lang } = await loadLearnerState();
  const v = supabaseConfigured() ? await getViewer() : null;
  const staff = v?.role === "admin" || v?.role === "mentor";
  const shown = RESOURCES.filter((r) => staff || !hiddenBecause(r));
  const links = shown.filter((r) => r.kind === "link");
  return (
    <>
      <h1 className="lrn-title">{tr(S.title, lang)}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{tr(S.intro, lang)}</p>
      {links.length > 0 && (
        <section className="col-card mt-4" aria-labelledby="res-tools">
          <h2 id="res-tools" className="lrn-session__title">{tr(S.tools, lang)}</h2>
          <ul className="lrn-list mt-3">{links.map((r) => <Item key={`${r.file_name}-${r.week}`} r={r} lang={lang} open staff={staff} />)}</ul>
        </section>
      )}
      {[...LEVELS].sort((a, b) => a.sequence - b.sequence).map((lv) => {
        const open = levelOpen(state, lv.slug) || staff;
        const items = shown.filter((r) => r.level === lv.slug).sort((a, b) => (a.week ?? 99) - (b.week ?? 99));
        const prev = LEVELS.find((l) => l.sequence === lv.sequence - 1);
        return (
          <section key={lv.slug} className="col-card mt-4" aria-labelledby={`res-${lv.slug}`}>
            <div className="flex items-center gap-2 flex-wrap"><h2 id={`res-${lv.slug}`} className="lrn-session__title">{pick3(lv, "title", lang)}</h2>{!open && <span className="col-chip"><Lock size={12} aria-hidden /> {tr(T.locked, lang)}</span>}</div>
            {!open && prev ? <p className="lrn-session__sub mt-2">{tr(S.locked(items.length, pick3(prev, "title", lang)), lang)}</p>
              : items.length === 0 ? <p className="lrn-session__sub mt-2">{tr(S.empty, lang)}</p>
              : <ul className="lrn-list mt-3">{items.map((r) => <Item key={`${r.file_name}-${r.week}`} r={r} lang={lang} open={open} staff={staff} />)}</ul>}
          </section>
        );
      })}
    </>
  );
}
