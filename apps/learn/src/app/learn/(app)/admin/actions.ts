"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { INVITE_TTL_DAYS, newInviteToken } from "@/lib/auth/tokens";
import { sendInviteEmail } from "@/lib/email/resend";

export type AdminState = { error?: string; ok?: string };
import { siteUrl as site } from "@/lib/supabase/env";

async function audit(actor: string, action: string, targetType: string, targetId: string | null, before: unknown, after: unknown) {
  const admin = createAdminClient();
  await admin.rpc("log_audit", { p_actor: actor, p_action: action, p_target_type: targetType, p_target_id: targetId, p_before: before ?? null, p_after: after ?? null });
}

export async function createCohort(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const name = String(form.get("name") ?? "").trim();
  const level = String(form.get("level") ?? "foundation");
  const starts_on = String(form.get("starts_on") ?? "");
  if (!/^[A-Za-z0-9-]{4,60}$/.test(name)) return { error: "Cohort name: letters, digits, hyphens only (e.g. TDP-Foundation-Oct-2026)." };
  if (!["foundation", "intermediate", "advanced"].includes(level) || !starts_on) return { error: "Level aur start date chahiye." };
  const admin = createAdminClient();
  const { data, error } = await admin.from("cohorts").insert({ name, level, starts_on }).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "Is naam ka cohort pehle se hai." : error.message };
  await audit(v.id, "cohort.create", "cohorts", data.id, null, { name, level, starts_on });
  revalidatePath("/learn/admin");
  return { ok: `Cohort ${name} ban gaya.` };
}

/** Bulk import: "Full Name, email" per line (CSV paste or upload). Creates one 7-day single-use invite each and emails it. No self-signup exists anywhere else. */
export async function bulkInvite(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const cohortId = String(form.get("cohort_id") ?? "");
  let text = String(form.get("rows") ?? "");
  const file = form.get("csv");
  if (file instanceof File && file.size > 0) text += "\n" + (await file.text());
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).filter((l) => !/^(name|full[_ ]?name)\s*,/i.test(l));
  if (!cohortId || rows.length === 0) return { error: "Cohort aur kam se kam ek row chahiye: Full Name, email" };
  if (rows.length > 200) return { error: "Ek baar mein max 200 rows." };
  const admin = createAdminClient();
  const { data: cohort } = await admin.from("cohorts").select("id,name").eq("id", cohortId).single();
  if (!cohort) return { error: "Cohort nahi mila." };
  let sent = 0; const bad: string[] = [];
  for (const line of rows) {
    const [nameRaw, emailRaw] = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    const email = (emailRaw ?? "").toLowerCase();
    if (!nameRaw || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { bad.push(line); continue; }
    const { raw, hash } = newInviteToken();
    const expires_at = new Date(Date.now() + INVITE_TTL_DAYS * 86400e3).toISOString();
    const { data: inv, error } = await admin.from("invites").insert({ email, full_name: nameRaw, cohort_id: cohortId, token_hash: hash, expires_at, created_by: v.id }).select("id").single();
    if (error) { bad.push(line); continue; }
    await audit(v.id, "invite.create", "invites", inv.id, null, { email, full_name: nameRaw, cohort_id: cohortId, expires_at });
    try { await sendInviteEmail(email, nameRaw, cohort.name, `${site()}/learn/invite/${raw}`); sent++; } catch { bad.push(`${line} (email failed)`); }
  }
  revalidatePath(`/learn/admin/cohorts/${cohortId}`);
  return { ok: `${sent} invite bheje.`, error: bad.length ? `Skipped ${bad.length}: ${bad.slice(0, 5).join(" | ")}` : undefined };
}

export async function reinvite(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const inviteId = String(form.get("invite_id") ?? "");
  const admin = createAdminClient();
  const { data: old } = await admin.from("invites").select("id,email,full_name,cohort_id,user_id,cohorts(name)").eq("id", inviteId).single();
  if (!old) return { error: "Invite nahi mila." };
  const { raw, hash } = newInviteToken();
  const expires_at = new Date(Date.now() + INVITE_TTL_DAYS * 86400e3).toISOString();
  const { data: inv, error } = await admin.from("invites").insert({ email: old.email, full_name: old.full_name, cohort_id: old.cohort_id, user_id: old.user_id, token_hash: hash, expires_at, created_by: v.id }).select("id").single();
  if (error) return { error: error.message };
  await audit(v.id, "invite.reissue", "invites", inv.id, { previous: old.id }, { expires_at });
  const cohort = old.cohorts as unknown as { name: string } | null;
  await sendInviteEmail(old.email, old.full_name, cohort?.name ?? "", `${site()}/learn/invite/${raw}`);
  revalidatePath(`/learn/admin/cohorts/${old.cohort_id}`);
  return { ok: `Naya invite ${old.email} ko bheja.` };
}

/** Suspend / reactivate: revokes access immediately (guard.ts bounces suspended sessions); progress and certificates are untouched. */
export async function setStatus(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const userId = String(form.get("user_id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["active", "suspended"].includes(status)) return { error: "Invalid status." };
  if (userId === v.id) return { error: "Apna hi account suspend nahi kar sakte." };
  const admin = createAdminClient();
  const { data: before } = await admin.from("profiles").select("status,cohort_id").eq("id", userId).single();
  const { error } = await admin.from("profiles").update({ status }).eq("id", userId);
  if (error) return { error: error.message };
  if (status === "suspended") await admin.auth.admin.signOut(userId, "global").catch(() => undefined);
  await audit(v.id, status === "suspended" ? "user.suspend" : "user.reactivate", "profiles", userId, before, { status });
  revalidatePath(`/learn/admin/cohorts/${before?.cohort_id}`);
  return { ok: status === "suspended" ? "Suspended." : "Reactivated." };
}

export async function moveCohort(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const userId = String(form.get("user_id") ?? "");
  const cohortId = String(form.get("cohort_id") ?? "");
  const admin = createAdminClient();
  const { data: before } = await admin.from("profiles").select("cohort_id").eq("id", userId).single();
  const { error } = await admin.from("profiles").update({ cohort_id: cohortId }).eq("id", userId);
  if (error) return { error: error.message };
  await audit(v.id, "user.move_cohort", "profiles", userId, before, { cohort_id: cohortId });
  revalidatePath(`/learn/admin/cohorts/${before?.cohort_id}`);
  revalidatePath(`/learn/admin/cohorts/${cohortId}`);
  return { ok: "Moved." };
}
