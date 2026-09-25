"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/components/admin/format";

export type StageState = { error?: string; ok?: string };

const STAGES = new Set(["winners", "one", "pro_options", "funda"]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** yyyy-mm-dd (IST) -> ISO instant. Start = 00:00 IST that day; end = 23:59:59 IST, so a grant "till 30 Sep" covers all of 30 Sep. */
function istDay(v: string, end: boolean): string | null | "bad" {
  if (!v) return null;
  if (!DAY.test(v)) return "bad";
  const d = new Date(`${v}T${end ? "23:59:59" : "00:00:00"}+05:30`);
  return Number.isNaN(d.getTime()) ? "bad" : d.toISOString();
}

/** Grant, change the dates of, or revoke a student's access to a static Academy stage (WINNERS / O.N.E).
 *  Admin: any student. Mentor: only students in cohorts they mentor (same rule as grading).
 *  Every change is written to the audit log with the row before and after. stage_access has no revoked flag, so a revoke
 *  logs the full grant (who gave it, when, which dates) before the row is deleted: the history lives in the audit log. */
export async function setStageAccess(_: StageState, form: FormData): Promise<StageState> {
  const v = await requireViewer(["mentor", "admin"]);
  const userId = String(form.get("user_id") ?? "");
  const stage = String(form.get("stage") ?? "");
  const op = String(form.get("op") ?? "");
  if (!isUuid(userId) || !STAGES.has(stage) || !["grant", "update", "revoke"].includes(op)) return { error: "Bad request." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("full_name,role,cohort_id,cohorts(mentor_id)").eq("id", userId).maybeSingle();
  if (!target || target.role !== "student") return { error: "Student not found." };
  if (v.role === "mentor") {
    const cohort = target.cohorts as unknown as { mentor_id: string | null } | null;
    if (!cohort || cohort.mentor_id !== v.id) return { error: "Not your cohort." };
  }
  const label = stage === "one" ? "O.N.E" : stage === "pro_options" ? "PRO · Options 117" : stage === "funda" ? "F.U.N.D.A" : "WINNERS";
  const { data: before } = await admin.from("stage_access").select("*").eq("user_id", userId).eq("stage", stage).maybeSingle();
  const log = (action: string, after: unknown) => admin.rpc("log_audit", { p_actor: v.id, p_action: action, p_target_type: "stage_access", p_target_id: userId, p_before: before ? { stage, ...before } : null, p_after: after });

  if (op === "revoke") {
    if (!before) return { ok: `${target.full_name}: ${label} was not granted.` };
    const { error: logErr } = await log("stage.revoke", null);
    if (logErr) return { error: `Not revoked: the audit log could not be written (${logErr.message}).` };
    const { error } = await admin.from("stage_access").delete().eq("user_id", userId).eq("stage", stage);
    if (error) return { error: error.message };
  } else {
    const starts_at = istDay(String(form.get("starts_at") ?? "").trim(), false);
    const expires_at = istDay(String(form.get("expires_at") ?? "").trim(), true);
    if (starts_at === "bad" || expires_at === "bad") return { error: "Dates must be yyyy-mm-dd." };
    if (starts_at && expires_at && starts_at >= expires_at) return { error: "The start date must be before the end date." };
    if (op === "update" && !before) return { error: "No grant to edit; grant it first." };
    // A new grant records who gave it; editing dates keeps the original granter (the audit row names the editor).
    const { error } = op === "grant"
      ? await admin.from("stage_access").upsert({ user_id: userId, stage, starts_at, expires_at, granted_by: v.id }, { onConflict: "user_id,stage" })
      : await admin.from("stage_access").update({ starts_at, expires_at }).eq("user_id", userId).eq("stage", stage);
    if (error) return { error: error.message };
    await log(before ? "stage.update" : "stage.grant", { stage, starts_at, expires_at, by: v.id });
  }
  revalidatePath("/learn/mentor/stages");
  return { ok: `${target.full_name}: ${label} ${op === "revoke" ? "revoked" : op === "update" || before ? "dates saved" : "granted"}.` };
}
