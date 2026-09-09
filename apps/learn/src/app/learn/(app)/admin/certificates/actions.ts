"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sweepLevel } from "@/lib/cert/issue";
import type { LevelSlug } from "@/lib/content/course";
export type CertAdminState = { error?: string; ok?: string };

/** Revocation: admin-only, reason mandatory, row never deleted; public page flips to Revoked with the date (§11). */
export async function revoke(_: CertAdminState, form: FormData): Promise<CertAdminState> {
  const v = await requireViewer(["admin"]);
  const id = String(form.get("id")); const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 10) return { error: "Reason: kam se kam 10 characters." };
  const admin = createAdminClient();
  const { data: before } = await admin.from("certificates").select("*").eq("id", id).single();
  if (!before) return { error: "Not found." }; if (before.status === "revoked") return { error: "Already revoked." };
  const { error } = await admin.from("certificates").update({ status: "revoked", revoked_reason: reason, revoked_at: new Date().toISOString(), revoked_by: v.id }).eq("id", id);
  if (error) return { error: error.message };
  await admin.rpc("log_audit", { p_actor: v.id, p_action: "certificate.revoke", p_target_type: "certificates", p_target_id: id, p_before: { status: before.status }, p_after: { status: "revoked", reason } });
  revalidatePath("/learn/admin/certificates");
  return { ok: "Revoked." };
}
export async function sweep(_: CertAdminState, form: FormData): Promise<CertAdminState> {
  await requireViewer(["admin"]);
  const level = String(form.get("level")) as LevelSlug;
  const n = await sweepLevel(level);
  revalidatePath("/learn/admin/certificates");
  return { ok: `${n} certificate(s) issued for ${level}.` };
}
export async function unlockLevel(_: CertAdminState, form: FormData): Promise<CertAdminState> {
  const v = await requireViewer(["admin"]);
  const userId = String(form.get("user_id")); const level = String(form.get("level")); const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 5) return { error: "Reason chahiye." };
  const admin = createAdminClient();
  const { data: lv } = await admin.from("levels").select("id").eq("slug", level).single();
  const { error } = await admin.rpc("unlock_level", { p_actor: v.id, p_user: userId, p_level: lv!.id, p_reason: reason });
  if (error) return { error: error.message };
  return { ok: "Level unlocked for this student (audited)." };
}
