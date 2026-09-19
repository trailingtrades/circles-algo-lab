"use server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/auth/tokens";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getLang } from "@/lib/i18n/server";
import { t3, tr } from "@/lib/i18n/lang";
import { AUTH, authKey, passwordProblem } from "@/lib/auth/messages";

export type InviteState = { error?: string };

export type InviteLookup = { ok: true; fullName: string; cohortName: string; email: string } | { ok: false; reason: "invalid" | "expired" | "used" | "unconfigured" };

const M = {
  conduct: t3("Please accept the learner code of conduct to continue.", "Aage badhne ke liye learner code of conduct accept kijiye.", "आगे बढ़ने के लिए लर्नर कोड ऑफ़ कंडक्ट स्वीकार कीजिए।"),
  dead: t3("This invite link no longer works. Please ask your mentor for a new one.", "Ye invite link ab kaam nahi karta. Apne mentor se naya link maangiye.", "यह इनवाइट लिंक अब काम नहीं करता। अपने मेंटर से नया लिंक माँगिए।"),
  createFailed: t3("We could not create your account. Please tell your mentor.", "Aapka account ban nahi paya. Apne mentor ko bataiye.", "आपका अकाउंट नहीं बन पाया। अपने मेंटर को बताइए।"),
  saveFailed: t3("Your account could not be activated. Please open the link again, or tell your mentor.", "Account activate nahi ho paya. Link dobara kholiye, ya mentor ko bataiye.", "अकाउंट एक्टिवेट नहीं हो पाया। लिंक दोबारा खोलिए, या मेंटर को बताइए।"),
};

/** Server-side token check. Never leaks which of the three failure modes applies beyond what the learner needs. */
export async function lookupInvite(rawToken: string): Promise<InviteLookup> {
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, reason: "unconfigured" };
  const admin = createAdminClient();
  const { data } = await admin.from("invites").select("email,full_name,expires_at,accepted_at,cohorts(name)").eq("token_hash", hashToken(rawToken)).maybeSingle();
  if (!data) return { ok: false, reason: "invalid" };
  if (data.accepted_at) return { ok: false, reason: "used" };
  if (new Date(data.expires_at) < new Date()) return { ok: false, reason: "expired" };
  const cohort = data.cohorts as unknown as { name: string } | null;
  return { ok: true, fullName: data.full_name, cohortName: cohort?.name ?? "", email: data.email };
}

type Admin = ReturnType<typeof createAdminClient>;
/** Auth user id for an address. The admin API has no lookup by email, so page through (1000 per page). */
async function findUserId(admin: Admin, email: string): Promise<string | null> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** First login: set own password, accept the code of conduct, activate the profile. The invite is
 *  claimed atomically before anything else happens, so a link works exactly once even with two tabs
 *  open, and every other open invite for the same address dies with it. An invite never demotes or
 *  moves an account that already exists, and never reopens a suspended one. */
export async function acceptInvite(_: InviteState, form: FormData): Promise<InviteState> {
  const lang = await getLang();
  const fail = (x: Parameters<typeof tr>[0]) => ({ error: tr(x, lang) });
  const rawToken = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (form.get("conduct") !== "on") return fail(M.conduct);
  const problem = passwordProblem(password, String(form.get("password2") ?? ""));
  if (problem) return fail(problem);
  if (!rawToken || !supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail(M.dead);

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: inv } = await admin.from("invites").update({ accepted_at: now })
    .eq("token_hash", hashToken(rawToken)).is("accepted_at", null).gt("expires_at", now)
    .select("id,email,full_name,cohort_id,role,user_id").maybeSingle();
  if (!inv) return fail(M.dead);
  // Undo the claim when a later step fails, so the learner can simply try the same link again.
  const release = async () => { await admin.from("invites").update({ accepted_at: null }).eq("id", inv.id); };
  const email = String(inv.email).toLowerCase();

  // 1. The auth user: new, or one that already exists for this address.
  // The password never touches our DB in clear, is never emailed, and is never visible to an admin.
  let userId = (inv.user_id as string | null) ?? null;
  let created = false;
  if (!userId) {
    const { data: made, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: inv.full_name } });
    if (made?.user) { userId = made.user.id; created = true; }
    else if (error?.code === "weak_password") { await release(); return fail(AUTH.weak); }
    else userId = await findUserId(admin, email);
    if (!userId) { await release(); return fail(M.createFailed); }
  }

  // 2. What the invite may do depends on the profile that is already there.
  const { data: before } = await admin.from("profiles").select("full_name,role,status,cohort_id,joined_at").eq("id", userId).maybeSingle();
  if (!created && before?.status === "suspended") { await release(); return fail(AUTH.suspended); }
  if (!created) {
    const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error) { await release(); return fail(AUTH[authKey(error) === "weak" ? "weak" : "generic"]); }
  }
  const staff = before?.role === "mentor" || before?.role === "admin";
  // A brand-new account (or one that never finished activating) takes the invite's role and cohort.
  // An account already in use keeps its own: an invite sent to a mentor's address by mistake must not
  // turn them into a student, and a re-invite must not silently move a learner between cohorts.
  const fresh = (created || !before || before.status === "invited") && !staff;
  const after = fresh
    ? { full_name: inv.full_name, role: inv.role, cohort_id: inv.cohort_id, status: "active", joined_at: before?.joined_at ?? now }
    : { full_name: before?.full_name || inv.full_name, role: before!.role, cohort_id: before?.cohort_id ?? inv.cohort_id, status: "active", joined_at: before?.joined_at ?? now };
  const { error: pe } = await admin.from("profiles").upsert({ id: userId, ...after });
  if (pe) { await release(); return fail(M.saveFailed); }

  // 3. Bookkeeping: link the invite, kill every other open invite for this address (a leftover or
  // forwarded link must not reset the password later), audit, remember the language they chose.
  await admin.from("invites").update({ user_id: userId }).eq("id", inv.id);
  await admin.from("invites").update({ expires_at: now }).in("email", [...new Set([inv.email, email])]).is("accepted_at", null).neq("id", inv.id);
  await admin.rpc("log_audit", { p_actor: userId, p_action: "invite.accepted", p_target_type: "profiles", p_target_id: userId, p_before: before ?? null, p_after: after }).then(() => undefined, () => undefined);
  if (fresh) await admin.from("profiles").update({ lang }).eq("id", userId); // best effort: older DBs allow only en/hi

  const sb = await createClient();
  const { error: signErr } = await sb.auth.signInWithPassword({ email, password });
  if (signErr) redirect("/learn?set=1");
  // An existing account just got a new password: end its sessions on other devices.
  if (!created) await sb.auth.signOut({ scope: "others" });
  redirect("/learn/home?welcome=1");
}
