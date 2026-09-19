"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sweepLevel, isLevelSlug } from "@/lib/cert/issue";
import { isUuid } from "@/components/admin/format";
export type CertAdminState = { error?: string; ok?: string };
const asLevel = (x: FormDataEntryValue | null) => { const v = String(x); return isLevelSlug(v) ? v : null; };

/** Revocation: admin-only, reason mandatory, row never deleted; public page flips to Revoked with the date (§11). */
export async function revoke(_: CertAdminState, form: FormData): Promise<CertAdminState> {
  const v = await requireViewer(["admin"]);
  const id = String(form.get("id") ?? ""); const reason = String(form.get("reason") ?? "").trim();
  if (!isUuid(id)) return { error: "Bad request." };
  if (reason.length < 10) return { error: "Give a reason of at least 10 characters." };
  const admin = createAdminClient();
  const { data: before } = await admin.from("certificates").select("status").eq("id", id).maybeSingle();
  if (!before) return { error: "Not found." }; if (before.status === "revoked") return { error: "Already revoked." };
  const { error } = await admin.from("certificates").update({ status: "revoked", revoked_reason: reason, revoked_at: new Date().toISOString(), revoked_by: v.id }).eq("id", id);
  if (error) return { error: error.message };
  await admin.rpc("log_audit", { p_actor: v.id, p_action: "certificate.revoke", p_target_type: "certificates", p_target_id: id, p_before: { status: before.status }, p_after: { status: "revoked", reason } });
  revalidatePath("/learn/admin/certificates");
  return { ok: "Revoked." };
}

/** Re-run the issuance check for a level (students in that level's cohorts). Reports only certificates this run created. */
export async function sweep(_: CertAdminState, form: FormData): Promise<CertAdminState> {
  await requireViewer(["admin"]);
  const level = asLevel(form.get("level")); if (!level) return { error: "Unknown level." };
  const created = await sweepLevel(level);
  revalidatePath("/learn/admin/certificates");
  return { ok: created > 0 ? `${created} new certificate(s) issued.` : "Check finished. No new certificates." };
}

export async function unlockLevel(_: CertAdminState, form: FormData): Promise<CertAdminState> {
  const v = await requireViewer(["admin"]);
  const userId = String(form.get("user_id") ?? ""); const level = asLevel(form.get("level")); const reason = String(form.get("reason") ?? "").trim();
  if (!isUuid(userId) || !level || level === "foundation") return { error: "Pick a student and a level to unlock." };
  if (reason.length < 5) return { error: "A reason is required." };
  const admin = createAdminClient();
  const { data: lv } = await admin.from("levels").select("id").eq("slug", level).maybeSingle();
  if (!lv) return { error: "Level not seeded yet." };
  const { error } = await admin.rpc("unlock_level", { p_actor: v.id, p_user: userId, p_level: lv.id, p_reason: reason });
  if (error) return { error: error.message };
  revalidatePath("/learn/admin/certificates");
  return { ok: "Level unlocked for this student (audited)." };
}
