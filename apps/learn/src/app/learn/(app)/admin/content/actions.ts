"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanText } from "@/lib/compliance/scan";
export type EditState = { error?: string; ok?: string };

async function audit(actor: string, action: string, type: string, id: string | null, before: unknown, after: unknown) {
  await createAdminClient().rpc("log_audit", { p_actor: actor, p_action: action, p_target_type: type, p_target_id: id, p_before: before ?? null, p_after: after ?? null });
}
/** Session editor: title, Hinglish title, concept tags, summary, video URL, prompts, publish/draft flags. Every save is compliance-scanned and audited. */
export async function saveSession(_: EditState, form: FormData): Promise<EditState> {
  const v = await requireViewer(["admin"]);
  const n = Number(form.get("number")); const g = (k: string) => String(form.get(k) ?? "").trim();
  let prompts: unknown;
  try { prompts = JSON.parse(g("prompts") || "[]"); if (!Array.isArray(prompts)) throw new Error(); } catch { return { error: "Prompts must be a JSON array of {title, level, platform, body}." }; }
  const patch = { title_en: g("title_en"), title_hi: g("title_hi"), core_concept: g("core_concept"), ai_lab: g("ai_lab"), psychology: g("psychology"), summary_hi: g("summary_hi"), video_url: g("video_url") || null, duration_min: Number(g("duration_min") || 60), is_published: form.get("is_published") === "on", is_draft: form.get("is_draft") === "on", prompts };
  const issues = scanText([patch.title_en, patch.title_hi, patch.summary_hi, JSON.stringify(prompts)].join("\n"));
  if (issues.length) return { error: `Compliance scan blocked the save: ${issues.slice(0, 3).join(" | ")}` };
  const admin = createAdminClient();
  const { data: before } = await admin.from("sessions").select("*").eq("number", n).single();
  const { error } = await admin.from("sessions").update(patch).eq("number", n);
  if (error) return { error: error.message };
  await audit(v.id, "content.session.update", "sessions", before?.id ?? null, before, patch);
  revalidatePath(`/learn/session/${n}`); revalidatePath(`/learn/admin/content/${n}`); revalidatePath("/learn/path");
  return { ok: "Saved and live." };
}
export async function saveQuestion(_: EditState, form: FormData): Promise<EditState> {
  const v = await requireViewer(["admin"]);
  const g = (k: string) => String(form.get(k) ?? "").trim();
  const id = g("id") || null; const sessionN = Number(g("session_number"));
  let options: { en: string; hi: string; distractor: boolean }[];
  try { options = JSON.parse(g("options")); if (!Array.isArray(options) || options.length < 2 || options.length > 6) throw new Error(); } catch { return { error: "Options must be a JSON array of 2–6 {en, hi} objects." }; }
  const correct = Number(g("correct_index")); if (!(correct >= 0 && correct < options.length)) return { error: "correct_index out of range." };
  options = options.map((o, i) => ({ en: String(o.en ?? ""), hi: String(o.hi ?? o.en ?? ""), distractor: i !== correct }));
  const q = { stem_en: g("stem_en"), stem_hi: g("stem_hi"), options, correct_index: correct, explanation_en: g("explanation_en"), explanation_hi: g("explanation_hi") || g("explanation_en"), marks: Number(g("marks") || 1), difficulty: Number(g("difficulty") || 1), sequence: Number(g("sequence") || 0) };
  const issues = scanText([q.stem_en, q.stem_hi, q.explanation_en, q.explanation_hi].join("\n"), { allowScamExample: form.get("scam_example") === "on" });
  if (issues.length) return { error: `Compliance scan blocked the save: ${issues.slice(0, 3).join(" | ")}` };
  const admin = createAdminClient();
  const { data: s } = await admin.from("sessions").select("id").eq("number", sessionN).single(); if (!s) return { error: "Session not found." };
  const { data: before } = id ? await admin.from("quiz_questions").select("*").eq("id", id).single() : { data: null };
  const { data: row, error } = id ? await admin.from("quiz_questions").update(q).eq("id", id).select("id").single() : await admin.from("quiz_questions").insert({ ...q, session_id: s.id }).select("id").single();
  if (error) return { error: error.message };
  await audit(v.id, id ? "content.question.update" : "content.question.create", "quiz_questions", row.id, before, q);
  revalidatePath(`/learn/admin/content/${sessionN}`); revalidatePath(`/learn/session/${sessionN}`);
  return { ok: id ? "Question updated." : "Question added." };
}
export async function deleteQuestion(_: EditState, form: FormData): Promise<EditState> {
  const v = await requireViewer(["admin"]);
  const id = String(form.get("id")); const sessionN = Number(form.get("session_number"));
  const admin = createAdminClient();
  const { data: before } = await admin.from("quiz_questions").select("*").eq("id", id).single();
  const { error } = await admin.from("quiz_questions").delete().eq("id", id);
  if (error) return { error: error.message };
  await audit(v.id, "content.question.delete", "quiz_questions", id, before, null);
  revalidatePath(`/learn/admin/content/${sessionN}`); revalidatePath(`/learn/session/${sessionN}`);
  return { ok: "Deleted." };
}
