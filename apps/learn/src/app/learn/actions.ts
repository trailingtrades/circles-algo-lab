"use server";
import { redirect } from "next/navigation";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/env";
import { getLang } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/lang";
import { AUTH, authKey, authMessage, passwordProblem } from "@/lib/auth/messages";
import { appUrl, safeAppPath, safeStagePath, siteOrigin } from "@/lib/auth/paths";

export type AuthState = { error?: string; ok?: boolean };

type Sb = Awaited<ReturnType<typeof createClient>>;
/** Only ACTIVE profiles may hold a session. Supabase self sign-up is open on the project, so a stranger
 *  can have a valid password; the invite is what activates an account. Returns the status when refused. */
async function refuseInactive(sb: Sb, userId: string): Promise<"suspended" | "inactive" | null> {
  const { data: p } = await sb.from("profiles").select("status").eq("id", userId).maybeSingle();
  if (p?.status === "active") return null;
  await sb.auth.signOut({ scope: "local" });
  return p?.status === "suspended" ? "suspended" : "inactive";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const lang = await getLang();
  if (!supabaseConfigured()) return { error: tr(AUTH.unconfigured, lang) };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: tr(AUTH.missing, lang) };
  const sb = await createClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: authMessage(error, lang) };
  const refused = await refuseInactive(sb, data.user.id);
  if (refused) return { error: tr(AUTH[refused], lang) };
  // The stage gate (nginx auth_request) sends signed-out students here with ?next=/winners/… or /one/….
  // Those pages live OUTSIDE the app's basePath, so that redirect is absolute; in-app paths get the basePath from redirect().
  const next = String(form.get("next") ?? "");
  const stage = safeStagePath(next);
  if (stage) redirect(siteOrigin() + stage);
  redirect(safeAppPath(next));
}

/** "Sign out on this device": the other devices a student uses stay signed in. */
export async function signOut() {
  const sb = await createClient();
  await sb.auth.signOut({ scope: "local" });
  redirect("/learn");
}

/** Every device, e.g. after a lost phone. */
export async function signOutEverywhere() {
  const sb = await createClient();
  await sb.auth.signOut({ scope: "global" });
  redirect("/learn");
}

/** Reset email. Deliberately NOT the PKCE flow the cookie client uses: PKCE keeps a code verifier in
 *  the requesting browser, so a link requested on a laptop and opened on a phone (or in Gmail's in-app
 *  browser) failed. This implicit-flow request makes Supabase's standard email link land on
 *  /learn/reset/confirm with the recovery session in the URL fragment, which works in any browser.
 *  Needs no Supabase dashboard change (the Site URL host is allowed as a redirect). */
export async function requestReset(_: AuthState, form: FormData): Promise<AuthState> {
  const lang = await getLang();
  if (!supabaseConfigured()) return { error: tr(AUTH.unconfigured, lang) };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: tr(AUTH.emailMissing, lang) };
  const pub = createPublicClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await pub.auth.resetPasswordForEmail(email, { redirectTo: appUrl("/learn/reset/confirm") });
  // Unknown addresses get the same answer as known ones; only "slow down" and "can't reach" are worth saying.
  const k = error ? authKey(error) : null;
  if (k === "rate" || k === "network") return { error: tr(AUTH[k], lang) };
  return { ok: true };
}

/** The reset link's session arrives in the URL fragment (see requestReset), which only the browser can
 *  read; the confirm page hands it here once so it becomes the usual httpOnly cookie session. */
export async function adoptRecovery(accessToken: string, refreshToken: string): Promise<{ ok: boolean; reason?: "suspended" | "inactive" | "expired" }> {
  if (!supabaseConfigured() || typeof accessToken !== "string" || typeof refreshToken !== "string" || accessToken.length > 8192 || refreshToken.length > 512) return { ok: false, reason: "expired" };
  const sb = await createClient();
  const { data, error } = await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error || !data.user) return { ok: false, reason: "expired" };
  const refused = await refuseInactive(sb, data.user.id);
  return refused ? { ok: false, reason: refused } : { ok: true };
}

export async function confirmReset(_: AuthState, form: FormData): Promise<AuthState> {
  const lang = await getLang();
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password, String(form.get("password2") ?? ""));
  if (problem) return { error: tr(problem, lang) };
  if (!supabaseConfigured()) return { error: tr(AUTH.unconfigured, lang) };
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: tr(AUTH.expired, lang) };
  const refused = await refuseInactive(sb, user.id);
  if (refused) redirect(`/learn?${refused}=1`);
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: authMessage(error, lang) };
  // Whoever knew the old password is signed out everywhere else.
  await sb.auth.signOut({ scope: "others" });
  redirect("/learn/home");
}
