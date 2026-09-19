import "server-only";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession, quizPublic, quizAnswerKey, publicOption, type Session, type QuizQuestionPublic, type QuizOption, type Prompt, type AnswerKey } from "./course";
import { normalizeContent } from "./session-v2";

/** Content is data (§6): when a Supabase project is connected, editable fields come from the DB so Rahul can fix a typo without a redeploy.
 *  Structure (numbers, weeks, days) stays pinned to /content JSON. Falls back to JSON in preview mode.
 *  The *_dv (Devanagari) columns arrive with migration 0010; until it is applied the queries retry without them,
 *  so this code can ship before the migration without breaking a page. */
const SESSION_COLS = "title_en,title_hi,core_concept,ai_lab,psychology,strategy,duration_min,video_url,is_published,is_draft,summary_hi,prompts,content";

export async function liveSession(n: number): Promise<Session | null> {
  const base = getSession(n); if (!base) return null;
  if (!supabaseConfigured()) return base;
  const sb = await createClient();
  let { data, error } = await sb.from("sessions").select(`${SESSION_COLS},title_dv`).eq("number", n).maybeSingle();
  if (error) ({ data, error } = await sb.from("sessions").select(SESSION_COLS).eq("number", n).maybeSingle());
  // Not visible under RLS = unpublished (or the viewer is not an active learner): lock it rather than
  // falling back to the bundled JSON copy, which would bypass the admin's unpublish switch.
  if (!data) return { ...base, is_published: false };
  const row = data as typeof data & { title_dv?: string | null };
  const raw = row.content && typeof row.content === "object" && Array.isArray((row.content as { topics?: unknown }).topics) ? row.content : base.content;
  return { ...base, ...row, title_dv: row.title_dv ?? base.title_dv ?? null, draft: row.is_draft, prompts: (row.prompts as Prompt[]) ?? base.prompts, content: normalizeContent(raw) };
}

type PubRow = { stem_en: string; stem_hi: string; stem_dv?: string | null; options: unknown; marks: number };
const PUB_COLS = "id,stem_en,stem_hi,options,marks,sequence";

export async function liveQuizPublic(n: number): Promise<QuizQuestionPublic[]> {
  if (!supabaseConfigured()) return quizPublic(n);
  const sb = await createClient();
  const { data: s } = await sb.from("sessions").select("id").eq("number", n).maybeSingle(); if (!s) return [];
  // Same order as liveQuizKey: position i on screen is graded against key row i.
  // Typed as the narrower row so the retry without stem_dv (pre-0010 database) can reuse the same variables.
  let { data, error }: { data: PubRow[] | null; error: unknown } = await sb.from("quiz_questions").select(`${PUB_COLS},stem_dv`).eq("session_id", s.id).order("sequence").order("id");
  if (error) ({ data, error } = await sb.from("quiz_questions").select(PUB_COLS).eq("session_id", s.id).order("sequence").order("id"));
  if (!data?.length) return [];
  return data.map((q, idx) => ({ idx, stem_en: q.stem_en, stem_hi: q.stem_hi, stem_dv: q.stem_dv ?? null, options: ((q.options as QuizOption[]) ?? []).map(publicOption), marks: q.marks }));
}

/** Server-only answer key from the DB (service role: authenticated users cannot read correct_index). */
export async function liveQuizKey(n: number): Promise<AnswerKey[]> {
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return quizAnswerKey(n);
  const admin = createAdminClient();
  const { data: s } = await admin.from("sessions").select("id").eq("number", n).maybeSingle(); if (!s) return quizAnswerKey(n);
  const KEY_COLS = "correct_index,explanation_en,explanation_hi,marks,sequence";
  type KeyRow = { correct_index: number; explanation_en: string; explanation_hi: string; explanation_dv?: string | null; marks: number };
  let { data, error }: { data: KeyRow[] | null; error: unknown } = await admin.from("quiz_questions").select(`${KEY_COLS},explanation_dv`).eq("session_id", s.id).order("sequence").order("id");
  if (error) ({ data, error } = await admin.from("quiz_questions").select(KEY_COLS).eq("session_id", s.id).order("sequence").order("id"));
  return (data ?? [])
    .map((q) => ({ correct_index: q.correct_index, explanation_en: q.explanation_en, explanation_hi: q.explanation_hi, explanation_dv: q.explanation_dv ?? "", marks: q.marks }));
}
