"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured, siteUrl } from "@/lib/supabase/env";

export type AuthState = { error?: string };

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) return { error: "Supabase project not configured yet." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Email aur password dono chahiye." };
  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email ya password galat hai." };
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from("profiles").select("status").eq("id", user!.id).maybeSingle();
  if (p?.status === "suspended") { await sb.auth.signOut(); return { error: "Ye account suspended hai. Apne mentor se sampark kijiye." }; }
  redirect("/learn/home");
}

export async function signOut() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/learn");
}

/** Standard Supabase reset email. Supabase rate-limits this endpoint per address. */
export async function requestReset(_: AuthState, form: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) return { error: "Supabase project not configured yet." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email chahiye." };
  const sb = await createClient();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/api/auth/callback?next=/learn/reset/confirm` });
  // Always the same answer: never reveal whether an address exists.
  return { error: "" };
}

export async function confirmReset(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  const again = String(form.get("password2") ?? "");
  if (password.length < 10) return { error: "Password kam se kam 10 characters ka ho." };
  if (password !== again) return { error: "Dono passwords match nahi karte." };
  const sb = await createClient();
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: "Reset link expire ho gaya. Dobara request kijiye." };
  redirect("/learn/home");
}
