"use server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/auth/tokens";
import { supabaseConfigured } from "@/lib/supabase/env";

export type InviteState = { error?: string };

export type InviteLookup = { ok: true; fullName: string; cohortName: string; email: string } | { ok: false; reason: "invalid" | "expired" | "used" | "unconfigured" };

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

/** First login: set own password, accept the code of conduct, activate profile. Single-use: the invite is marked accepted in the same step. */
export async function acceptInvite(_: InviteState, form: FormData): Promise<InviteState> {
  const rawToken = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const again = String(form.get("password2") ?? "");
  const conduct = form.get("conduct") === "on";
  if (!conduct) return { error: "Learner code of conduct accept karna zaroori hai." };
  if (password.length < 10) return { error: "Password kam se kam 10 characters ka ho." };
  if (password !== again) return { error: "Dono passwords match nahi karte." };

  const look = await lookupInvite(rawToken);
  if (!look.ok) return { error: "Ye invite link ab valid nahi hai. Apne mentor se naya link maangiye." };

  const admin = createAdminClient();
  const { data: inv } = await admin.from("invites").select("id,email,full_name,cohort_id,role,user_id").eq("token_hash", hashToken(rawToken)).single();
  if (!inv) return { error: "Invite nahi mila." };

  // Create the auth user (or set the password on a re-invite of an existing one). Password never touches the DB in clear, never emailed, never admin-visible.
  let userId = inv.user_id as string | null;
  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({ email: inv.email, password, email_confirm: true, user_metadata: { full_name: inv.full_name } });
    if (error || !created.user) {
      // Existing auth user (re-invite): find and update.
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === inv.email.toLowerCase());
      if (!existing) return { error: "Account create nahi ho paya. Mentor ko batayiye." };
      userId = existing.id;
      const { error: e2 } = await admin.auth.admin.updateUserById(userId, { password });
      if (e2) return { error: "Password set nahi ho paya." };
    } else userId = created.user.id;
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return { error: "Password set nahi ho paya." };
  }

  const { data: before } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  const after = { full_name: inv.full_name, role: inv.role, cohort_id: inv.cohort_id, status: "active", joined_at: before?.joined_at ?? new Date().toISOString() };
  await admin.from("profiles").upsert({ id: userId, ...after });
  await admin.from("invites").update({ accepted_at: new Date().toISOString(), user_id: userId }).eq("id", inv.id);
  await admin.rpc("log_audit", { p_actor: userId, p_action: "invite.accepted", p_target_type: "profiles", p_target_id: userId, p_before: before ?? null, p_after: after }).then(() => undefined, () => undefined);

  const sb = await createClient();
  const { error: signErr } = await sb.auth.signInWithPassword({ email: inv.email, password });
  if (signErr) redirect("/learn?set=1");
  redirect("/learn/home?welcome=1");
}
