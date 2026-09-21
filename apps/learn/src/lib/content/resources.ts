/* Class material (content/resources.json, written by scripts/gen_content.py): which rows a learner may see, which
 * language copy of a file they get, and what a session links. SERVER-ONLY at runtime (it reads RESOURCES from
 * course.ts, which bundles the answer keys); the session page, the Resources page, the session actions and the
 * score page all use these, so what a learner sees and what attendance asks for can never disagree.
 *
 * A row may carry `lang` ("en" | "hi") when the same file exists in more than one language: English readers get
 * "en", Hinglish and Hindi readers get "hi" (there is no Devanagari edition of the decks and handouts), and a
 * learner falls back to whichever copy exists. A row may carry `day` (a Stage 1 course day, 1-21) when the file
 * belongs to one day rather than the whole week. */
import { RESOURCES, type Resource, type Session } from "./course";
import { STAGE1_FILES_ROUTE, stage1FileExists, stage1FileName } from "./stage1-files";
import type { Lang } from "@/lib/i18n/lang";

/* These Drive files are private: students get a Google sign-in wall (401 in the 19 Sep audit).
   They stay hidden until their sharing is "Anyone with the link: Viewer". */
const PRIVATE_DRIVE = ["1MJsyuDyzMdXUTBBjojRQoA_G3_Z-pgWL", "1XUH2eezNFWBp_3UebzPCo4O6zdOMbes6Q2XKL1Q_P-0", "1OCWV7Yr-8n-UU5VyJrTJyIaMy7Qlt5iEzmKRpiqPDXE", "1e5iLlkY0cGhRp9KoQsUsQgf77LkfX5vmedHRAEr3Jio", "1ZzMybEjVJpPpG6DFqsJyd5RceOJHgrCwNkYT1f8vIh4"];

/** Where a row opens: a web link as it is, or a file served by this app ("/learn/...") under the app's basePath.
 *  Anything else (a bare storage key, nothing) has no link yet. */
export function resourceHref(r: Pick<Resource, "storage_path">): string | null {
  const p = r.storage_path?.trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/") && !p.startsWith("//")) return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p}`;
  return null;
}

/** Why a row is not shown to students (staff still see it, labelled). null = show it. */
export function hiddenBecause(r: Resource): string | null {
  // Exam papers are the answer-bearing print versions: students sit exams in the app, never from a PDF.
  if (r.kind === "exam") return "Exam paper (print version with answers): staff only";
  if (/Question_Bank/i.test(r.file_name ?? "")) return "Question bank with answers: staff only";
  // 21 Sep 2026: Stage 2 is CIRCLE W.I.N.N.E.R.S, so the old Level 2 / Level 3 v1 packs are kept but not shown.
  if (r.level === "intermediate" || r.level === "advanced") return "Level 2 / Level 3 v1 pack: hidden from students (Stage 2 is CIRCLE W.I.N.N.E.R.S)";
  // 21 Sep 2026: the v1 Stage 1 decks, handouts and workbook teach a different sequence (and v1 Handout 3 breaks the
  // SEBI FY26 statistic rule). gen_content.py no longer lists them; this keeps them off even in an older resources.json.
  if (r.level === "foundation" && /^5C_AITC_Foundation_(Week\d|Handout\d|Workbook)/i.test(r.file_name ?? "")) return "Old v1 Stage 1 file: replaced by the v3 week files";
  if (!resourceHref(r)) return "Not uploaded yet";
  // Stage 1 week handouts and decks are served by this app from apps/learn/files/stage1/ (lib/content/stage1-files.ts).
  // A row counts only once its file is exported and shipped; until then it stays off, and attendance is the finished
  // session alone (sessionHasHandout below).
  if (r.storage_path!.trim().startsWith(STAGE1_FILES_ROUTE)) {
    const name = stage1FileName(r.storage_path);
    if (!name || !stage1FileExists(name)) return `Not exported yet: apps/learn/files/stage1/${name ?? r.file_name} is missing`;
  }
  if (PRIVATE_DRIVE.some((id) => r.storage_path!.includes(id))) return "Private Google file: students get a sign-in wall. Share as 'Anyone with the link: Viewer' to show it";
  // Tier 1 is 3 weeks in Curriculum v2; the v1 pack's Week 4 files no longer match any week.
  if (r.level === "foundation" && /Week4|Handout4/i.test(r.file_name ?? "")) return "Old v1 Week 4 file: Tier 1 has 3 weeks";
  return null;
}

/** Language copies to try, best first. Hindi (Devanagari) readers get the Hinglish copy. */
const PREFER: Record<Lang, readonly ("en" | "hi")[]> = { en: ["en", "hi"], hi: ["hi", "en"], dv: ["hi", "en"] };

/** One copy per file for this reader. Rows without `lang` are single files and always stay; rows with `lang` are
 *  copies of one file (same level, week, day and kind), and only the best copy for `lang` stays. Order is kept. */
export function pickLang(rows: Resource[], lang: Lang): Resource[] {
  const key = (r: Resource) => `${r.level ?? ""}|${r.week ?? ""}|${r.day ?? ""}|${r.kind}`;
  const best = new Map<string, Resource>();
  const rank = (r: Resource) => { const i = PREFER[lang].indexOf(r.lang as "en" | "hi"); return i < 0 ? 99 : i; };
  for (const r of rows) {
    if (!r.lang) continue;
    const k = key(r), cur = best.get(k);
    if (!cur || rank(r) < rank(cur)) best.set(k, r);
  }
  return rows.filter((r) => !r.lang || best.get(key(r)) === r);
}

/** Every deck and handout that belongs to this session and a student may open: the week's files, plus files
 *  pinned to this course day. All language copies; pickLang narrows them for one reader. */
function sessionRows(s: Session): Resource[] {
  return RESOURCES.filter((r) => r.level === s.level && (r.kind === "deck" || r.kind === "handout")
    && (r.day != null ? r.day === s.course_day : r.week === s.week) && !hiddenBecause(r));
}

/** Class material shown on a session page, in the reader's language. */
export const sessionMaterial = (s: Session, lang: Lang): Resource[] => pickLang(sessionRows(s), lang);

/** The session has a handout a student can open. Then attendance also asks for "handout opened"; without one it
 *  is the finished session alone. Language-blind on purpose: pickLang always leaves every reader one copy. */
export const sessionHasHandout = (s: Session): boolean => sessionRows(s).some((r) => r.kind === "handout");
