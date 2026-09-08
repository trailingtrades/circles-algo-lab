"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; ok?: string };

export async function updateProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const v = await requireViewer();
  const full_name = String(form.get("full_name") ?? "").trim().slice(0, 80);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 20) || null;
  const aliasRaw = String(form.get("display_alias") ?? "").trim();
  const display_alias = aliasRaw ? aliasRaw.slice(0, 24) : null;
  const lang = form.get("lang") === "hi" ? "hi" : "en";
  if (display_alias && display_alias.length < 2) return { error: "Alias 2–24 characters ka ho." };
  const sb = await createClient();
  const { error } = await sb.from("profiles").update({ full_name, phone, display_alias, lang }).eq("id", v.id);
  if (error) return { error: error.message };
  revalidatePath("/learn/profile");
  return { ok: "Saved." };
}

export async function changePassword(_: ProfileState, form: FormData): Promise<ProfileState> {
  await requireViewer();
  const password = String(form.get("password") ?? "");
  const again = String(form.get("password2") ?? "");
  if (password.length < 10) return { error: "Password kam se kam 10 characters ka ho." };
  if (password !== again) return { error: "Dono passwords match nahi karte." };
  const sb = await createClient();
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: "Password badal gaya." };
}
