"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { maybeIssue } from "@/lib/cert/issue";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LevelSlug } from "@/lib/content/course";

/** Learner-triggered re-check. Issuance itself is server-side and criteria-gated; nothing here can award anything. */
export async function checkNow(level: LevelSlug): Promise<{ issued: boolean }> {
  if (!supabaseConfigured()) return { issued: false };
  const v = await getViewer(); if (!v || v.status !== "active") return { issued: false };
  const r = await maybeIssue(v.id, level);
  revalidatePath("/learn/certificate");
  return { issued: !!r };
}
export async function downloadUrl(certId: string): Promise<string | null> {
  const v = await getViewer(); if (!v) return null;
  const admin = createAdminClient();
  const { data: c } = await admin.from("certificates").select("pdf_storage_path,user_id").eq("id", certId).single();
  if (!c || c.user_id !== v.id || !c.pdf_storage_path) return null;
  const { data } = await admin.storage.from("certificates").createSignedUrl(c.pdf_storage_path, 300);
  return data?.signedUrl ?? null;
}
