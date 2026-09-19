"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { maybeIssue, isLevelSlug } from "@/lib/cert/issue";
import { createAdminClient } from "@/lib/supabase/admin";

export type CheckResult = { state: "issued" | "revoked" | "not_yet" | "unavailable" };

/** Learner-triggered re-check. Issuance itself is server-side and criteria-gated; nothing here can award anything,
 *  and a revoked certificate stays revoked (maybeIssue never re-issues over an existing row). */
export async function checkNow(level: unknown): Promise<CheckResult> {
  if (!supabaseConfigured() || !isLevelSlug(level)) return { state: "unavailable" };
  const v = await getViewer(); if (!v || v.status !== "active") return { state: "unavailable" };
  try {
    const r = await maybeIssue(v.id, level);
    revalidatePath("/learn/certificate");
    return { state: !r ? "not_yet" : r.status === "revoked" ? "revoked" : "issued" };
  } catch (e) { console.error("[cert] learner check failed:", (e as Error).message); return { state: "unavailable" }; }
}

/** Short-lived signed URL for the learner's own PDF. Refused for a revoked certificate. */
export async function downloadUrl(certId: string): Promise<string | null> {
  const v = await getViewer(); if (!v) return null;
  const admin = createAdminClient();
  const { data: c } = await admin.from("certificates").select("pdf_storage_path,user_id,status").eq("id", String(certId)).maybeSingle();
  if (!c || c.user_id !== v.id || c.status !== "issued" || !c.pdf_storage_path) return null;
  const { data } = await admin.storage.from("certificates").createSignedUrl(c.pdf_storage_path, 300);
  return data?.signedUrl ?? null;
}
