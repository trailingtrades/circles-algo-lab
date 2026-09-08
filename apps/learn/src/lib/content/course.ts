/** Course content, read from /content/*.json (source of truth; seeded to DB by scripts/seed.ts). */
import levelsJson from "../../../../../content/levels.json";
import weeksJson from "../../../../../content/weeks.json";
import foundation from "../../../../../content/sessions/foundation.json";
import intermediate from "../../../../../content/sessions/intermediate.json";
import advanced from "../../../../../content/sessions/advanced.json";
import resourcesJson from "../../../../../content/resources.json";
import quizW1 from "../../../../../content/quizzes/foundation-w1.json";

export type LevelSlug = "foundation" | "intermediate" | "advanced";
export interface Level { slug: LevelSlug; sequence: number; title_en: string; title_hi: string; unlock_rule: string }
export interface Week { level: LevelSlug; number: number; title_en: string; title_hi: string; theme_accent: string }
export interface Prompt { title: string; level: string; platform: string; body: string }
export interface Session { number: number; level: LevelSlug; week: number; day: number; title_en: string; title_hi: string; core_concept: string; ai_lab: string; psychology: string; duration_min: number; video_url: string | null; video_provider: string; is_published: boolean; draft: boolean; summary_hi: string; prompts: Prompt[] }
export interface Resource { level: LevelSlug | null; week: number | null; kind: "deck" | "handout" | "workbook" | "exam" | "excel" | "link"; file_name: string; note: string; storage_path: string | null }
export interface QuizOption { en: string; hi: string; distractor: boolean }
export interface QuizQuestionPublic { idx: number; stem_en: string; stem_hi: string; options: QuizOption[]; marks: number }

export const LEVELS = levelsJson as Level[];
export const WEEKS = weeksJson as Week[];
export const SESSIONS = ([...foundation, ...intermediate, ...advanced] as Session[]).sort((a, b) => a.number - b.number);
export const RESOURCES = resourcesJson as Resource[];

export const getSession = (n: number) => SESSIONS.find((s) => s.number === n) ?? null;
export const sessionsOf = (level: LevelSlug, week?: number) => SESSIONS.filter((s) => s.level === level && (week ? s.week === week : true));
export const weekOf = (s: Session) => WEEKS.find((w) => w.level === s.level && w.number === s.week)!;
export const levelOf = (slug: LevelSlug) => LEVELS.find((l) => l.slug === slug)!;

/** Public view of a quiz bank: no correct_index, no explanation. Grading and explanations are server-only (actions.ts). */
export function quizPublic(n: number): QuizQuestionPublic[] {
  const bank = (quizW1 as { session: number; questions: { stem_en: string; stem_hi: string; options: QuizOption[]; marks: number }[] }[]).find((b) => b.session === n);
  return (bank?.questions ?? []).map((q, idx) => ({ idx, stem_en: q.stem_en, stem_hi: q.stem_hi, options: q.options, marks: q.marks }));
}
/** Server-only helper (never import from a client component). */
export function quizAnswerKey(n: number) {
  const bank = (quizW1 as { session: number; questions: { correct_index: number; explanation_en: string; explanation_hi: string; marks: number }[] }[]).find((b) => b.session === n);
  return (bank?.questions ?? []).map((q) => ({ correct_index: q.correct_index, explanation_en: q.explanation_en, explanation_hi: q.explanation_hi, marks: q.marks }));
}
/** YouTube unlisted (decision Q6-A): accept a watch URL, youtu.be URL, or bare id; return the privacy-enhanced embed URL. */
export function youtubeEmbed(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/) ?? url.match(/^([A-Za-z0-9_-]{6,})$/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` : null;
}
