"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardPractice } from "@/lib/scoring/award";
export type GradeState = { error?: string; ok?: string };

/** Mentor grades an artefact on PROCESS (A–F). Outcome +/− is recorded for display only and never reaches score_events (§9). */
export async function gradeArtefact(_: GradeState, form: FormData): Promise<GradeState> {
  const v = await requireViewer(["mentor", "admin"]);
  const userId = String(form.get("user_id")); const refId = String(form.get("ref_id") || "") || null; const artefact = String(form.get("artefact"));
  const grade = String(form.get("process_grade")) as "A" | "B" | "C" | "D" | "F"; const outcome = String(form.get("outcome_sign") || "") || null; const feedback = String(form.get("feedback") ?? "").slice(0, 1000);
  if (!"ABCDF".includes(grade) || grade.length !== 1) return { error: "Grade A–F." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("cohort_id,cohorts(level,mentor_id)").eq("id", userId).single();
  const cohort = target?.cohorts as unknown as { level: string; mentor_id: string | null } | null;
  if (!cohort) return { error: "Student has no cohort." };
  if (v.role === "mentor" && cohort.mentor_id !== v.id) return { error: "Not your cohort." };
  const { data: lv } = await admin.from("levels").select("id").eq("slug", cohort.level).single();
  const { data: ladder } = await admin.from("artefact_ladder").select("points").eq("level_slug", cohort.level).eq("artefact", artefact).single();
  if (!ladder) return { error: "Unknown artefact for this level." };
  // Foundation: 5 rows share the 250-point artefact -> each complete row is worth 50.
  const per = artefact === "full_why" ? Number(ladder.points) / 5 : Number(ladder.points);
  const { data: before } = await admin.from("practice_grades").select("*").eq("user_id", userId).eq("level_id", lv!.id).eq("artefact", artefact).is("ref_id", refId).maybeSingle();
  const { data: row, error } = await admin.from("practice_grades").upsert({ user_id: userId, level_id: lv!.id, artefact, ref_id: refId, process_grade: grade, outcome_sign: outcome, feedback, graded_by: v.id, graded_at: new Date().toISOString() }, { onConflict: "user_id,level_id,artefact,ref_id" }).select("id").single();
  if (error) return { error: error.message };
  await admin.rpc("log_audit", { p_actor: v.id, p_action: "practice.grade", p_target_type: "practice_grades", p_target_id: row.id, p_before: before ?? null, p_after: { grade, outcome, feedback } });
  // Regrade: a new event with a fresh ref (grade row id + grade) so history stays; award() dedupes per ref.
  await awardPractice(userId, cohort.level, artefact, refId ?? row.id, grade, per, row.id);
  revalidatePath("/learn/mentor");
  return { ok: `Graded ${grade}.` };
}
