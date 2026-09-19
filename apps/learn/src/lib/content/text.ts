/* Language pickers and the public quiz shapes, safe to import from client components.
 * Keep this file free of /content JSON imports: anything a "use client" file imports at runtime
 * is bundled into public /_next/static chunks, and course.ts carries every quiz and exam answer key. */
import { tr, type Lang } from "@/lib/i18n/lang";

/** What the browser may see for an option: the words only. Which option is right never leaves the server. */
export interface QuizOption { en: string; hi: string; dv?: string }
export interface QuizQuestionPublic { idx: number; stem_en: string; stem_hi: string; stem_dv?: string | null; options: QuizOption[]; marks: number }

/** A title / stem / explanation in the learner's language from its *_en / *_hi / *_dv fields (dv -> hi -> en fallback). */
export function pick3(row: object, base: string, lang: Lang): string {
  const r = row as Record<string, unknown>;
  const v = (k: string) => (typeof r[`${base}_${k}`] === "string" ? (r[`${base}_${k}`] as string) : "");
  return tr({ en: v("en"), hi: v("hi"), dv: v("dv") }, lang);
}
export const optionText = (o: QuizOption, lang: Lang) => tr({ en: o.en, hi: o.hi, dv: o.dv ?? "" }, lang);
