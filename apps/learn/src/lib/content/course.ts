/** Course content, read from /content/*.json (source of truth; seeded to DB by scripts/seed.ts). */
import levelsJson from "../../../../../content/levels.json";
import weeksJson from "../../../../../content/weeks.json";
import foundation from "../../../../../content/sessions/foundation.json";
import intermediate from "../../../../../content/sessions/intermediate.json";
import advanced from "../../../../../content/sessions/advanced.json";
import resourcesJson from "../../../../../content/resources.json";
import quizBanks from "../../../../../content/quizzes/foundation.json";
import examsJson from "../../../../../content/exams.json";
import examBanks from "../../../../../content/exams/foundation.json";

import type { Text } from "@/lib/i18n/lang";
import { normalizeContent, type SessionContentV2 } from "./session-v2";
import type { QuizOption, QuizQuestionPublic } from "./text";

/* SERVER-ONLY at runtime: this module bundles every quiz and exam answer key. A "use client" file may
 * import types from here, but must take pick3 / optionText from ./text (eslint and the post-build
 * bundle check both enforce it). Re-exported so server callers keep one import. */
export { pick3, optionText, type QuizOption, type QuizQuestionPublic } from "./text";

export type LevelSlug = "foundation" | "intermediate" | "advanced";
/* Language columns: *_en English, *_hi Hinglish (Roman), *_dv Hindi (Devanagari; optional until seeded). */
export interface Level { slug: LevelSlug; sequence: number; title_en: string; title_hi: string; title_dv?: string | null; subtitle_en: string; subtitle_hi: string; subtitle_dv?: string | null; unlock_rule: string }
export interface Week { level: LevelSlug; number: number; title_en: string; title_hi: string; title_dv?: string | null; theme_accent: string }
export interface Prompt { title: Text; level: string; platform: string; body: string }
/** @deprecated the v1 name — use SessionContentV2 (lib/content/session-v2.ts). */
export type SessionContent = SessionContentV2;
export interface Session { number: number; level: LevelSlug; week: number; day: number; course_day: number | null; title_en: string; title_hi: string; title_dv?: string | null; core_concept: string; ai_lab: string; psychology: string; strategy: string | null; duration_min: number; video_url: string | null; video_provider: string; is_published: boolean; draft: boolean; summary_hi: string; content: SessionContentV2; prompts: Prompt[] }
/** A file or link on the Resources page / a session's Class material. `lang` marks one language copy of a file
 *  ("en" English, "hi" Hinglish: Hindi readers get "hi"); `day` pins a file to one Stage 1 course day (1-21).
 *  storage_path is a web link or an in-app path ("/learn/..."). Selection rules: lib/content/resources.ts. */
export interface Resource { level: LevelSlug | null; week: number | null; day?: number | null; lang?: "en" | "hi" | null; kind: "deck" | "handout" | "workbook" | "exam" | "excel" | "link"; file_name: string; note: string; storage_path: string | null }
/** A bank row as stored in /content JSON (server-side; carries the answer). */
type BankQuestion = { stem_en: string; stem_hi: string; stem_dv?: string; options: (QuizOption & { distractor?: boolean })[]; correct_index: number; explanation_en: string; explanation_hi: string; explanation_dv?: string; marks: number };
/** Keep only the words of an option — the legacy `distractor` flag revealed the answer. */
export const publicOption = (o: QuizOption & { distractor?: boolean }): QuizOption => (o.dv ? { en: o.en, hi: o.hi, dv: o.dv } : { en: o.en, hi: o.hi });

export const LEVELS = levelsJson as Level[];
export const WEEKS = weeksJson as Week[];
export const SESSIONS = ([...foundation, ...intermediate, ...advanced] as unknown as Session[])
  .map((s) => ({ ...s, content: normalizeContent(s.content) }))
  .sort((a, b) => a.number - b.number);
export const RESOURCES = resourcesJson as Resource[];

export const getSession = (n: number) => SESSIONS.find((s) => s.number === n) ?? null;
/** Last session of its level-week: the weekly review day (Tier 1: Day 7/14/21; Tier 2: session 2; Tier 3: the single session). */
export const isWeekReviewDay = (s: Session) => s.day === Math.max(...SESSIONS.filter((x) => x.level === s.level && x.week === s.week).map((x) => x.day));
/** Day label for cards/eyebrows: Tier 1 counts course days (D1..D21); other tiers show session-in-week. */
export const dayLabel = (s: Session) => s.course_day ? `Day ${s.course_day}` : `S${s.day}`;
export const COURSE_STATS = { levels: LEVELS.length, weeks: WEEKS.length, sessions: SESSIONS.length };
export const sessionsOf = (level: LevelSlug, week?: number) => SESSIONS.filter((s) => s.level === level && (week ? s.week === week : true));
export const weekOf = (s: Session) => WEEKS.find((w) => w.level === s.level && w.number === s.week)!;
export const levelOf = (slug: LevelSlug) => LEVELS.find((l) => l.slug === slug)!;

/** Public view of a quiz bank: no correct_index, no explanation. Grading and explanations are server-only (actions.ts). */
const QUIZ_BANKS = quizBanks as unknown as { session: number; questions: BankQuestion[] }[];
const toPublic = (q: BankQuestion, idx: number): QuizQuestionPublic => ({ idx, stem_en: q.stem_en, stem_hi: q.stem_hi, stem_dv: q.stem_dv ?? null, options: q.options.map(publicOption), marks: q.marks });
const toKey = (q: BankQuestion) => ({ correct_index: q.correct_index, explanation_en: q.explanation_en, explanation_hi: q.explanation_hi, explanation_dv: q.explanation_dv ?? "", marks: q.marks });
export type AnswerKey = ReturnType<typeof toKey>;
export function quizPublic(n: number): QuizQuestionPublic[] {
  return (QUIZ_BANKS.find((b) => b.session === n)?.questions ?? []).map(toPublic);
}
/** Server-only helper (never import from a client component). */
export function quizAnswerKey(n: number): AnswerKey[] {
  return (QUIZ_BANKS.find((b) => b.session === n)?.questions ?? []).map(toKey);
}
/** YouTube unlisted (decision Q6-A): accept a watch URL, youtu.be URL, or bare id; return the privacy-enhanced embed URL. */
export function youtubeEmbed(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/) ?? url.match(/^([A-Za-z0-9_-]{6,})$/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` : null;
}

export interface ExamMeta { level: LevelSlug; week: number | null; title: string; total_marks: number; pass_marks: number; distinction_marks: number; time_limit_min: number; attempts_allowed: number }
export const EXAMS = examsJson as ExamMeta[];
/** Content key for an exam: "<level>-w<n>" or "<level>-final". */
export const examKey = (e: ExamMeta) => `${e.level}-${e.week ? `w${e.week}` : "final"}`;
export const getExam = (key: string) => EXAMS.find((e) => examKey(e) === key) ?? null;
/** The exam a learner in this level-week should see next: the weekly exam if one exists, else the level final. */
export const examForWeek = (level: LevelSlug, week: number) => EXAMS.find((e) => e.level === level && e.week === week) ?? EXAMS.find((e) => e.level === level && e.week === null) ?? null;
type Bank = { level: string; week: number | null; questions: BankQuestion[] };
const EXAM_BANKS = examBanks as unknown as Bank[];
const bankFor = (key: string) => EXAM_BANKS.find((b) => `${b.level}-${b.week ? `w${b.week}` : "final"}` === key);
export function examPublic(key: string): QuizQuestionPublic[] {
  return (bankFor(key)?.questions ?? []).map(toPublic);
}
/** Server-only. */
export function examAnswerKey(key: string): AnswerKey[] {
  return (bankFor(key)?.questions ?? []).map(toKey);
}
