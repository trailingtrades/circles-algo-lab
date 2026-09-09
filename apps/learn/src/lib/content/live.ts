import "server-only";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession, quizPublic, quizAnswerKey, type Session, type QuizQuestionPublic, type Prompt } from "./course";

/** Content is data (§6): when a Supabase project is connected, editable fields come from the DB so Rahul can fix a typo without a redeploy.
 *  Structure (numbers, weeks, days) stays pinned to /content JSON. Falls back to JSON in preview mode. */
export async function liveSession(n: number): Promise<Session | null> {
  const base = getSession(n); if (!base) return null;
  if (!supabaseConfigured()) return base;
  const sb = await createClient();
  const { data } = await sb.from("sessions").select("title_en,title_hi,core_concept,ai_lab,psychology,duration_min,video_url,is_published,is_draft,summary_hi,prompts").eq("number", n).maybeSingle();
  if (!data) return base;
  return { ...base, ...data, draft: data.is_draft, prompts: (data.prompts as Prompt[]) ?? base.prompts };
}
export async function liveQuizPublic(n: number): Promise<QuizQuestionPublic[]> {
  if (!supabaseConfigured()) return quizPublic(n);
  const sb = await createClient();
  const { data: s } = await sb.from("sessions").select("id").eq("number", n).maybeSingle(); if (!s) return quizPublic(n);
  const { data } = await sb.from("quiz_questions").select("id,stem_en,stem_hi,options,marks,sequence").eq("session_id", s.id).order("sequence");
  if (!data?.length) return [];
  return data.map((q, idx) => ({ idx, stem_en: q.stem_en, stem_hi: q.stem_hi, options: q.options as QuizQuestionPublic["options"], marks: q.marks }));
}
/** Server-only answer key from the DB (service role: authenticated users cannot read correct_index). */
export async function liveQuizKey(n: number) {
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return quizAnswerKey(n);
  const admin = createAdminClient();
  const { data: s } = await admin.from("sessions").select("id").eq("number", n).maybeSingle(); if (!s) return quizAnswerKey(n);
  const { data } = await admin.from("quiz_questions").select("correct_index,explanation_en,explanation_hi,marks,sequence").eq("session_id", s.id).order("sequence");
  return (data ?? []).map((q) => ({ correct_index: q.correct_index, explanation_en: q.explanation_en, explanation_hi: q.explanation_hi, marks: q.marks }));
}
