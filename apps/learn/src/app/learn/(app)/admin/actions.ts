"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { INVITE_TTL_DAYS, newInviteToken } from "@/lib/auth/tokens";
import { sendInviteEmail } from "@/lib/email/resend";
import { siteUrl as site } from "@/lib/supabase/env";
import { isUuid } from "@/components/admin/format";
import { isMasterAdmin } from "./master";

/** An invite link the admin has to hand over personally (email is not configured, or the send failed).
 *  Returned once in the action state and never stored: the DB keeps only the token's sha256. */
export type InviteLink = { name: string; email: string; link: string; why: string };
export type AdminState = { error?: string; ok?: string; links?: InviteLink[]; skipped?: string[] };
type Admin = ReturnType<typeof createAdminClient>;

async function audit(actor: string, action: string, targetType: string, targetId: string | null, before: unknown, after: unknown) {
  const { error } = await createAdminClient().rpc("log_audit", { p_actor: actor, p_action: action, p_target_type: targetType, p_target_id: targetId, p_before: before ?? null, p_after: after ?? null });
  if (error) console.error(`[audit] ${action} not logged:`, error.message);
}
const EMAIL_RE = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/;
const LEVELS = ["foundation", "intermediate", "advanced"];
const inviteLink = (raw: string) => `${site()}/learn/invite/${raw}`;
const expiry = () => new Date(Date.now() + INVITE_TTL_DAYS * 86400e3).toISOString();

/** Mentor candidates: an active mentor or admin profile. Returns the name, or an error for the form. */
async function staffMember(admin: Admin, id: string): Promise<{ full_name: string } | { error: string }> {
  const { data: m } = await admin.from("profiles").select("full_name,role,status").eq("id", id).maybeSingle();
  if (!m || !["mentor", "admin"].includes(m.role) || m.status !== "active") return { error: "Pick an active mentor or admin (set the role on People first)." };
  return { full_name: m.full_name || "Mentor" };
}

export async function createCohort(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const name = String(form.get("name") ?? "").trim();
  const level = String(form.get("level") ?? "foundation");
  const starts_on = String(form.get("starts_on") ?? "");
  const ends_on = String(form.get("ends_on") ?? "").trim() || null;
  const mentor_id = String(form.get("mentor_id") ?? "") || null;
  if (!/^[A-Za-z0-9-]{4,60}$/.test(name)) return { error: "Cohort name: letters, digits and hyphens only (e.g. TDP-Foundation-Oct-2026)." };
  if (!LEVELS.includes(level) || !starts_on) return { error: "Choose a level and a start date." };
  if (ends_on && ends_on <= starts_on) return { error: "The end date must be after the start date." };
  const admin = createAdminClient();
  if (mentor_id) { if (!isUuid(mentor_id)) return { error: "Bad mentor." }; const m = await staffMember(admin, mentor_id); if ("error" in m) return m; }
  const { data, error } = await admin.from("cohorts").insert({ name, level, starts_on, ends_on, mentor_id }).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "A cohort with this name already exists." : error.message };
  await audit(v.id, "cohort.create", "cohorts", data.id, null, { name, level, starts_on, ends_on, mentor_id });
  revalidatePath("/learn/admin"); revalidatePath("/learn/mentor");
  return { ok: `Cohort ${name} created.` };
}

/** Batch dates: start + end editable any time (informational schedule; access windows live on stage_access). */
export async function setCohortDates(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const cohortId = String(form.get("cohort_id") ?? "");
  const starts_on = String(form.get("starts_on") ?? "");
  const ends_on = String(form.get("ends_on") ?? "").trim() || null;
  if (!isUuid(cohortId) || !starts_on) return { error: "A start date is required." };
  if (ends_on && ends_on <= starts_on) return { error: "The end date must be after the start date." };
  const admin = createAdminClient();
  const { data: before } = await admin.from("cohorts").select("starts_on,ends_on").eq("id", cohortId).maybeSingle();
  if (!before) return { error: "Cohort not found." };
  const { error } = await admin.from("cohorts").update({ starts_on, ends_on }).eq("id", cohortId);
  if (error) return { error: error.message };
  await audit(v.id, "cohort.dates", "cohorts", cohortId, before, { starts_on, ends_on });
  revalidatePath(`/learn/admin/cohorts/${cohortId}`);
  return { ok: "Dates saved." };
}

/** Assign (or clear) the cohort's mentor. RLS app.mentor_cohorts(), grading and stage grants all key off cohorts.mentor_id. */
export async function setCohortMentor(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const cohortId = String(form.get("cohort_id") ?? "");
  const mentorId = String(form.get("mentor_id") ?? "") || null;
  if (!isUuid(cohortId) || (mentorId && !isUuid(mentorId))) return { error: "Bad request." };
  const admin = createAdminClient();
  const { data: before } = await admin.from("cohorts").select("name,mentor_id").eq("id", cohortId).maybeSingle();
  if (!before) return { error: "Cohort not found." };
  if ((before.mentor_id ?? null) === mentorId) return { ok: "No change." };
  let who = "";
  if (mentorId) { const m = await staffMember(admin, mentorId); if ("error" in m) return m; who = m.full_name; }
  const { error } = await admin.from("cohorts").update({ mentor_id: mentorId }).eq("id", cohortId);
  if (error) return { error: error.message };
  await audit(v.id, "cohort.mentor", "cohorts", cohortId, { mentor_id: before.mentor_id ?? null }, { mentor_id: mentorId });
  revalidatePath(`/learn/admin/cohorts/${cohortId}`); revalidatePath("/learn/admin"); revalidatePath("/learn/mentor"); revalidatePath("/learn/mentor/stages");
  return { ok: mentorId ? `${who} now mentors ${before.name}.` : `${before.name} has no mentor now.` };
}

/* Only the master admin (see ./master.ts) may change roles; other admins keep every other power.
   The DB trigger already limits role changes to admins, this narrows it further at the action layer. */
export async function setRole(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  if (!isMasterAdmin(v.email)) return { error: "Only the master admin can change roles." };
  const userId = String(form.get("user_id") ?? "");
  const role = String(form.get("role") ?? "");
  if (!isUuid(userId) || !["student", "mentor", "admin"].includes(role)) return { error: "Invalid role." };
  if (userId === v.id) return { error: "You cannot change your own role." };
  const admin = createAdminClient();
  const { data: before } = await admin.from("profiles").select("role,full_name").eq("id", userId).maybeSingle();
  if (!before) return { error: "User not found." };
  if (before.role === role) return { ok: "No change." };
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  await audit(v.id, "user.role", "profiles", userId, { role: before.role }, { role });
  revalidatePath("/learn/admin/people");
  return { ok: `${before.full_name || "User"} is now ${role}.` };
}

/** One CSV line to cells: handles "Sharma, Priya" style quoting and "" escapes; comma, semicolon or tab (a paste from a sheet). */
function csvCells(line: string): string[] {
  const out: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === "," || c === ";" || c === "\t") { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** Lower-cased emails of every auth account (paged; listUsers returns at most 1000 per page). */
async function accountEmails(admin: Admin): Promise<Set<string>> {
  const out = new Set<string>();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    for (const u of data.users) if (u.email) out.add(u.email.toLowerCase());
    if (data.users.length < 1000) break;
  }
  return out;
}

/** "sent", or the reason the admin must share the link by hand. A skipped send (no RESEND_API_KEY on this server) is NOT a send. */
async function deliver(email: string, name: string, cohortName: string, link: string): Promise<string> {
  try { const r = await sendInviteEmail(email, name, cohortName, link); return r.skipped ? "Email is not set up on this server" : "sent"; }
  catch (e) { console.error("[invite] email failed:", (e as Error).message); return "The email failed to send"; }
}

/** Bulk import: "Full Name, email" per line (paste, CSV upload or a two-column paste from a sheet). One 7-day single-use
 *  invite each. Skipped, and reported: duplicates in the batch, emails that already have an account (an invite would reset
 *  that account's password) and emails with an open invite (use Re-invite). No self-signup exists anywhere else. */
export async function bulkInvite(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const cohortId = String(form.get("cohort_id") ?? "");
  let text = String(form.get("rows") ?? "");
  const file = form.get("csv");
  if (file instanceof File && file.size > 0) { if (file.size > 200_000) return { error: "CSV too large (max 200 KB)." }; text += "\n" + (await file.text()); }
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^\uFEFF/, "").trim()).filter(Boolean).filter((l) => !/^"?(name|full[_ ]?name|email)"?\s*[,;\t]/i.test(l));
  if (!isUuid(cohortId) || lines.length === 0) return { error: "Add at least one row: Full Name, email" };
  if (lines.length > 200) return { error: "At most 200 rows per import." };
  const admin = createAdminClient();
  const { data: cohort } = await admin.from("cohorts").select("id,name").eq("id", cohortId).maybeSingle();
  if (!cohort) return { error: "Cohort not found." };

  const skipped: string[] = []; const rows: { name: string; email: string }[] = []; const seen = new Set<string>();
  for (const line of lines) {
    const cells = csvCells(line);
    const email = (cells.find((c) => c.includes("@")) ?? "").toLowerCase();
    const name = (cells.find((c) => c && !c.includes("@")) ?? "").slice(0, 80);
    if (!name || !EMAIL_RE.test(email)) { skipped.push(`${line.slice(0, 80)}: needs "Full Name, email"`); continue; }
    if (seen.has(email)) { skipped.push(`${email}: listed twice in this import`); continue; }
    seen.add(email); rows.push({ name, email });
  }
  let accounts: Set<string>;
  try { accounts = await accountEmails(admin); } catch (e) { return { error: `Could not check existing accounts, nothing was sent: ${(e as Error).message}` }; }
  const now = new Date().toISOString();
  const { data: open } = rows.length ? await admin.from("invites").select("email").in("email", rows.map((r) => r.email)).is("accepted_at", null).gt("expires_at", now) : { data: [] as { email: string }[] };
  const openSet = new Set((open ?? []).map((i) => String(i.email).toLowerCase()));

  let sent = 0; const links: InviteLink[] = [];
  for (const r of rows) {
    if (accounts.has(r.email)) { skipped.push(`${r.email}: already has an account (use Move on the roster; for a lost password, Forgot password)`); continue; }
    if (openSet.has(r.email)) { skipped.push(`${r.email}: already has an open invite (use Re-invite on its cohort page)`); continue; }
    const { raw, hash } = newInviteToken();
    const expires_at = expiry();
    const { data: inv, error } = await admin.from("invites").insert({ email: r.email, full_name: r.name, cohort_id: cohortId, role: "student", token_hash: hash, expires_at, created_by: v.id }).select("id").single();
    if (error) { skipped.push(`${r.email}: ${error.message}`); continue; }
    await audit(v.id, "invite.create", "invites", inv.id, null, { email: r.email, full_name: r.name, cohort_id: cohortId, expires_at });
    const link = inviteLink(raw);
    const res = await deliver(r.email, r.name, cohort.name, link);
    if (res === "sent") sent++; else links.push({ name: r.name, email: r.email, link, why: res });
  }
  revalidatePath(`/learn/admin/cohorts/${cohortId}`); revalidatePath("/learn/admin/people");
  if (sent + links.length === 0) return { error: "No invites created.", skipped };
  const parts = [sent && `${sent} emailed`, links.length && `${links.length} to share by hand (links below, shown only once)`].filter(Boolean);
  return { ok: `Invites created: ${parts.join(", ")}.`, links, skipped };
}

/** New link for an invite that was not accepted. Every other open invite for the same email expires at once, so only the
 *  newest link can set a password. Accepted invites and emails that already have an account are refused. */
export async function reinvite(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const inviteId = String(form.get("invite_id") ?? "");
  if (!isUuid(inviteId)) return { error: "Bad request." };
  const admin = createAdminClient();
  const { data: old } = await admin.from("invites").select("id,email,full_name,cohort_id,role,accepted_at,cohorts(name)").eq("id", inviteId).maybeSingle();
  if (!old) return { error: "Invite not found." };
  if (old.accepted_at) return { error: "This invite was already accepted. The learner signs in, or uses Forgot password." };
  const email = String(old.email).toLowerCase(); const variants = [...new Set([String(old.email), email])];
  const { data: took } = await admin.from("invites").select("id").in("email", variants).not("accepted_at", "is", null).limit(1);
  let hasAccount = !!took?.length;
  if (!hasAccount) { try { hasAccount = (await accountEmails(admin)).has(email); } catch (e) { return { error: `Could not check existing accounts: ${(e as Error).message}` }; } }
  if (hasAccount) return { error: `${email} already has an account. Use Forgot password, or Move on the roster.` };
  const { raw, hash } = newInviteToken();
  const nowIso = new Date().toISOString(); const expires_at = expiry();
  const { data: inv, error } = await admin.from("invites").insert({ email, full_name: old.full_name, cohort_id: old.cohort_id, role: old.role ?? "student", token_hash: hash, expires_at, created_by: v.id }).select("id").single();
  if (error) return { error: error.message };
  const { data: retired, error: retireErr } = await admin.from("invites").update({ expires_at: nowIso }).in("email", variants).is("accepted_at", null).gt("expires_at", nowIso).neq("id", inv.id).select("id");
  await audit(v.id, "invite.reissue", "invites", inv.id, { previous: old.id, retired: (retired ?? []).map((r) => r.id) }, { email, expires_at });
  const link = inviteLink(raw);
  const res = await deliver(email, old.full_name, (old.cohorts as unknown as { name: string } | null)?.name ?? "", link);
  revalidatePath(`/learn/admin/cohorts/${old.cohort_id}`); revalidatePath("/learn/admin/people");
  const note = retireErr ? ` Warning: older links could not be expired (${retireErr.message}).` : " Older links no longer work.";
  return res === "sent" ? { ok: `New invite emailed to ${email}.${note}` } : { ok: `New invite created for ${email}.${note}`, links: [{ name: old.full_name, email, link, why: res }] };
}

/** Suspend / reactivate. Progress and certificates are untouched. Suspension also bans the auth user, so refresh tokens
 *  stop working (auth.admin.signOut needs the user's JWT, not an id, so the old call silently did nothing). */
export async function setStatus(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const userId = String(form.get("user_id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!isUuid(userId) || !["active", "suspended"].includes(status)) return { error: "Bad request." };
  if (userId === v.id) return { error: "You cannot suspend your own account." };
  const admin = createAdminClient();
  const { data: before } = await admin.from("profiles").select("status,cohort_id,role,full_name").eq("id", userId).maybeSingle();
  if (!before) return { error: "User not found." };
  if (before.role === "admin" && !isMasterAdmin(v.email)) return { error: "Only the master admin can suspend or reactivate an admin." };
  const { error } = await admin.from("profiles").update({ status }).eq("id", userId);
  if (error) return { error: error.message };
  const { error: banErr } = await admin.auth.admin.updateUserById(userId, { ban_duration: status === "suspended" ? "876000h" : "none" });
  await audit(v.id, status === "suspended" ? "user.suspend" : "user.reactivate", "profiles", userId, { status: before.status }, { status, sign_in_blocked: banErr ? `failed: ${banErr.message}` : status === "suspended" });
  if (before.cohort_id) revalidatePath(`/learn/admin/cohorts/${before.cohort_id}`);
  revalidatePath("/learn/admin/people");
  const who = before.full_name || "User";
  if (banErr) return { error: `Status saved, but the sign-in ${status === "suspended" ? "block" : "unblock"} failed: ${banErr.message}` };
  return { ok: status === "suspended" ? `${who} suspended; sign-in blocked.` : `${who} reactivated.` };
}

export async function moveCohort(_: AdminState, form: FormData): Promise<AdminState> {
  const v = await requireViewer(["admin"]);
  const userId = String(form.get("user_id") ?? "");
  const cohortId = String(form.get("cohort_id") ?? "");
  if (!isUuid(userId) || !isUuid(cohortId)) return { error: "Bad request." };
  const admin = createAdminClient();
  const [{ data: before }, { data: target }] = await Promise.all([
    admin.from("profiles").select("cohort_id").eq("id", userId).maybeSingle(),
    admin.from("cohorts").select("name").eq("id", cohortId).maybeSingle(),
  ]);
  if (!before) return { error: "User not found." };
  if (!target) return { error: "Cohort not found." };
  if (before.cohort_id === cohortId) return { ok: "Already in that cohort." };
  const { error } = await admin.from("profiles").update({ cohort_id: cohortId }).eq("id", userId);
  if (error) return { error: error.message };
  await audit(v.id, "user.move_cohort", "profiles", userId, before, { cohort_id: cohortId });
  if (before.cohort_id) revalidatePath(`/learn/admin/cohorts/${before.cohort_id}`);
  revalidatePath(`/learn/admin/cohorts/${cohortId}`); revalidatePath("/learn/admin/people");
  return { ok: `Moved to ${target.name}.` };
}
