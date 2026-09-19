"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardPractice } from "@/lib/scoring/award";
import { practicePoints } from "@/lib/scoring/rules";
import type { LevelSlug } from "@/lib/content/course";
import { isUuid } from "@/components/admin/format";
export type GradeState = { error?: string; ok?: string };

const sum = (rows: { points: number | string }[] | null) => (rows ?? []).reduce((a, r) => a + Number(r.points), 0);

/** Mentor grades an artefact on PROCESS (A–F). Outcome +/− is recorded for display only and never reaches score_events (§9).
 *  The artefact must be on the cohort level's ladder. Foundation grades each mock-portfolio row (ref_id = the row);
 *  higher levels grade each ladder artefact once per student (ref_id null). */
export async function gradeArtefact(_: GradeState, form: FormData): Promise<GradeState> {
  const v = await requireViewer(["mentor", "admin"]);
  const userId = String(form.get("user_id") ?? ""); const refId = String(form.get("ref_id") ?? "") || null; const artefact = String(form.get("artefact") ?? "");
  const grade = String(form.get("process_grade") ?? "") as "A" | "B" | "C" | "D" | "F";
  const outcome = String(form.get("outcome_sign") ?? "") || null; const feedback = String(form.get("feedback") ?? "").trim().slice(0, 1000);
  if (!isUuid(userId) || (refId && !isUuid(refId))) return { error: "Bad request." };
  if (!["A", "B", "C", "D", "F"].includes(grade)) return { error: "Grade A–F." };
  if (outcome && !["+", "-", "0"].includes(outcome)) return { error: "Outcome is +, − or 0." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role,cohort_id,cohorts(level,mentor_id)").eq("id", userId).maybeSingle();
  const cohort = target?.cohorts as unknown as { level: LevelSlug; mentor_id: string | null } | null;
  if (!target || target.role !== "student") return { error: "Student not found." };
  if (!cohort) return { error: "This student has no cohort." };
  if (v.role === "mentor" && cohort.mentor_id !== v.id) return { error: "Not your cohort." };
  const [{ data: lv }, { data: ladder }] = await Promise.all([
    admin.from("levels").select("id").eq("slug", cohort.level).maybeSingle(),
    admin.from("artefact_ladder").select("points").eq("level_slug", cohort.level).eq("artefact", artefact).maybeSingle(),
  ]);
  if (!lv) return { error: "Level not seeded yet." };
  if (!ladder) return { error: "That artefact is not on this level's ladder." };
  // Foundation: 5 portfolio rows share the 250-point artefact, so each complete row is worth 50 and must be a real row of this student.
  const perRow = cohort.level === "foundation";
  if (perRow) {
    if (!refId) return { error: "Pick the portfolio row being graded." };
    const { data: row } = await admin.from("portfolio_rows").select("id").eq("id", refId).eq("user_id", userId).maybeSingle();
    if (!row) return { error: "That portfolio row does not belong to this student." };
  }
  const ref = perRow ? refId : null;
  const per = perRow ? Number(ladder.points) / 5 : Number(ladder.points);

  const q = admin.from("practice_grades").select("*").eq("user_id", userId).eq("level_id", lv.id).eq("artefact", artefact);
  const { data: before } = await (ref ? q.eq("ref_id", ref) : q.is("ref_id", null)).maybeSingle();
  const fields = { process_grade: grade, outcome_sign: outcome, feedback, graded_by: v.id, graded_at: new Date().toISOString() };
  // Update the existing grade in place (keeps its id, so the points history below stays attached); insert on first grade.
  const { data: saved, error } = before
    ? await admin.from("practice_grades").update(fields).eq("id", before.id).select("id").single()
    : await admin.from("practice_grades").insert({ user_id: userId, level_id: lv.id, artefact, ref_id: ref, ...fields }).select("id").single();
  if (error) return { error: error.code === "23505" ? "Someone just graded this. Refresh and try again." : error.message };
  await admin.rpc("log_audit", { p_actor: v.id, p_action: before ? "practice.regrade" : "practice.grade", p_target_type: "practice_grades", p_target_id: saved.id, p_before: before ? { process_grade: before.process_grade, outcome_sign: before.outcome_sign, feedback: before.feedback } : null, p_after: { artefact, grade, outcome, feedback } });

  // Points. score_events is append-only and award() dedupes on (user, kind, ref), so the first grade's event can never change.
  // A regrade adds a correction event (fresh ref, notes "regrade <grade id>") worth the difference, so the practice total
  // always equals the current grade's value.
  const refType = `practice_${artefact}`;
  const [{ data: first }, { data: fixes }] = await Promise.all([
    admin.from("score_events").select("points").eq("user_id", userId).eq("kind", "practice").eq("ref_type", refType).eq("ref_id", saved.id),
    admin.from("score_events").select("points").eq("user_id", userId).eq("kind", "practice").eq("ref_type", refType).like("notes", `regrade ${saved.id}%`),
  ]);
  if (!first?.length) {
    await awardPractice(userId, cohort.level, artefact, ref ?? saved.id, grade, per, saved.id); // also runs the certificate check
  } else {
    const delta = Math.round((practicePoints(grade, per) - sum(first) - sum(fixes)) * 100) / 100;
    if (delta !== 0) {
      const { error: e2 } = await admin.rpc("award", { p_user: userId, p_level: lv.id, p_kind: "practice", p_points: delta, p_ref_type: refType, p_ref_id: randomUUID(), p_notes: `regrade ${saved.id}: ${before?.process_grade ?? "?"} to ${grade}` });
      if (e2) return { error: `Grade saved, but the score update failed: ${e2.message}` };
    }
    try { const { maybeIssue } = await import("@/lib/cert/issue"); await maybeIssue(userId, cohort.level); } catch (e) { console.error("[cert] issue check failed:", (e as Error).message); }
  }
  revalidatePath("/learn/mentor");
  return { ok: before ? `Regraded ${before.process_grade} to ${grade}.` : `Graded ${grade}.` };
}
