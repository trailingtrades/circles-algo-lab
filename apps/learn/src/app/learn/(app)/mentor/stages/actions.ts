"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export type StageState = { error?: string; ok?: string };

const STAGES = new Set(["winners", "one"]);

/** Grant or revoke a student's access to a static Academy stage (WINNERS / O.N.E).
 *  Admin: any student. Mentor: only students in cohorts they mentor (same rule as grading). */
export async function setStageAccess(_: StageState, form: FormData): Promise<StageState> {
  const v = await requireViewer(["mentor", "admin"]);
  const userId = String(form.get("user_id") ?? "");
  const stage = String(form.get("stage") ?? "");
  const op = String(form.get("op") ?? "");
  const expires = String(form.get("expires_at") ?? "").trim(); // yyyy-mm-dd or empty = never
  const starts = String(form.get("starts_at") ?? "").trim();   // yyyy-mm-dd or empty = active now
  if (!userId || !STAGES.has(stage) || !["grant", "revoke"].includes(op)) return { error: "Bad request." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("full_name,role,cohort_id,cohorts(mentor_id)").eq("id", userId).single();
  if (!target) return { error: "Student not found." };
  if (v.role === "mentor") {
    const cohort = target.cohorts as unknown as { mentor_id: string | null } | null;
    if (!cohort || cohort.mentor_id !== v.id) return { error: "Not your cohort." };
  }
  if (op === "revoke") {
    const { error } = await admin.from("stage_access").delete().eq("user_id", userId).eq("stage", stage);
    if (error) return { error: error.message };
  } else {
    let expires_at: string | null = null;
    if (expires) {
      const d = new Date(`${expires}T23:59:59+05:30`); // end of that day, IST
      if (Number.isNaN(d.getTime())) return { error: "Expiry date samajh nahi aayi (yyyy-mm-dd)." };
      expires_at = d.toISOString();
    }
    let starts_at: string | null = null;
    if (starts) {
      const d = new Date(`${starts}T00:00:00+05:30`); // start of that day, IST
      if (Number.isNaN(d.getTime())) return { error: "Start date samajh nahi aayi (yyyy-mm-dd)." };
      starts_at = d.toISOString();
    }
    if (starts_at && expires_at && starts_at >= expires_at) return { error: "Start date end se pehle honi chahiye." };
    const { error } = await admin.from("stage_access").upsert(
      { user_id: userId, stage, starts_at, expires_at, granted_by: v.id },
      { onConflict: "user_id,stage" },
    );
    if (error) return { error: error.message };
  }
  revalidatePath("/learn/mentor/stages");
  return { ok: `${target.full_name}: ${stage.toUpperCase()} ${op === "grant" ? "granted" : "revoked"}.` };
}
