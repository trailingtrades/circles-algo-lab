"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { getLang } from "@/lib/i18n/server";
import { isLang, LANG_COOKIE, t3, tr, type Lang } from "@/lib/i18n/lang";
import { AUTH, authKey, passwordProblem } from "@/lib/auth/messages";

// Any script counts as a letter (Hindi, Tamil, Latin ...); built at runtime because tsconfig targets ES2017.
const LETTER = new RegExp("\\p{L}", "u");

export type ProfileState = { error?: string; ok?: string; lang?: Lang };

const S = {
  name: t3("Please enter your full name (at least 2 letters).", "Apna poora naam likhiye (kam se kam 2 akshar).", "अपना पूरा नाम लिखिए (कम से कम 2 अक्षर)।"),
  phone: t3("Phone: digits only, for example +91 98765 43210.", "Phone: sirf number likhiye, jaise +91 98765 43210.", "फ़ोन: सिर्फ़ नंबर लिखिए, जैसे +91 98765 43210।"),
  alias: t3("Leaderboard name: 2 to 24 characters.", "Leaderboard naam: 2 se 24 characters ka ho.", "लीडरबोर्ड नाम: 2 से 24 अक्षर का हो।"),
  saved: t3("Saved.", "Save ho gaya.", "सेव हो गया।"),
  failed: t3("Could not save right now. Please try again.", "Abhi save nahi ho paya. Dobara try kijiye.", "अभी सेव नहीं हो पाया। फिर से कोशिश करें।"),
  pwChanged: t3("Password changed.", "Password badal gaya.", "पासवर्ड बदल गया।"),
  pwFailed: t3("Could not change the password. Please sign in again and retry.", "Password nahi badal paya. Dobara sign in karke try kijiye.", "पासवर्ड नहीं बदल पाया। फिर से साइन इन करके कोशिश करें।"),
};

export async function updateProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const v = await requireViewer();
  const picked = form.get("lang");
  // Messages come back in the language just chosen: that is what the page switches to.
  const lang: Lang = isLang(picked) ? picked : await getLang(v.lang);
  const full_name = String(form.get("full_name") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (full_name.length < 2 || !LETTER.test(full_name)) return { error: tr(S.name, lang) };
  const phone = String(form.get("phone") ?? "").trim().slice(0, 20) || null;
  if (phone && !/^\+?[\d\s-]{7,20}$/.test(phone)) return { error: tr(S.phone, lang) };
  const aliasRaw = String(form.get("display_alias") ?? "").replace(/\s+/g, " ").trim();
  const display_alias = aliasRaw ? aliasRaw.slice(0, 24) : null;
  if (display_alias && display_alias.length < 2) return { error: tr(S.alias, lang) };
  const sb = await createClient();
  let { error } = await sb.from("profiles").update({ full_name, phone, display_alias, lang }).eq("id", v.id);
  // Before migration 0010 the lang check allows only en/hi: save the rest and let the cookie below carry "dv".
  if (error?.code === "23514" && lang === "dv") ({ error } = await sb.from("profiles").update({ full_name, phone, display_alias }).eq("id", v.id));
  if (error) { console.error("[profile] update failed:", error.message); return { error: tr(S.failed, lang) }; }
  // The same cookie the header switch writes, so every server-rendered page follows the new choice at once.
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 31_536_000, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  revalidatePath("/learn", "layout");
  return { ok: tr(S.saved, lang), lang };
}

export async function changePassword(_: ProfileState, form: FormData): Promise<ProfileState> {
  const v = await requireViewer();
  const lang = await getLang(v.lang);
  const password = String(form.get("password") ?? "");
  // Same rules as the invite and reset forms (10 to 72 characters, both entries equal).
  const problem = passwordProblem(password, String(form.get("password2") ?? ""));
  if (problem) return { error: tr(problem, lang) };
  const sb = await createClient();
  const { error } = await sb.auth.updateUser({ password });
  if (error) {
    const k = authKey(error);
    if (k === "generic") console.error("[profile] password change failed:", error.code, error.message);
    // An expired session reads "link expired" in AUTH; here the useful advice is to sign in again.
    return { error: tr(k === "expired" ? S.pwFailed : AUTH[k], lang) };
  }
  // Whoever knew the old password is signed out everywhere else; this device stays signed in.
  await sb.auth.signOut({ scope: "others" });
  return { ok: tr(S.pwChanged, lang) };
}
