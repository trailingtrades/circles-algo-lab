/* Three languages, one vocabulary (safe to import from server AND client code).
 *
 *   app code  | data keys / DB suffix | shared 5cd.lang value (Winners, O.N.E, landing)
 *   ----------+-----------------------+------------------------------------------------
 *   "en"      | en  / *_en            | "en"   English
 *   "hi"      | hi  / *_hi            | "hg"   Hinglish — Hindi in Roman script
 *   "dv"      | dv  / *_dv            | "hi"   हिंदी — Hindi in Devanagari
 *
 * "hi" meant Roman Hinglish in this app before Devanagari existed, and the DB columns
 * (title_hi, stem_hi, explanation_hi …) already hold Hinglish, so the app keeps that
 * meaning and adds "dv". The ONLY place the Winners codes appear is the storage
 * boundary (toShared / fromShared) — nowhere else should "hg" be written. */
export type Lang = "en" | "hi" | "dv";
export const LANGS: readonly { k: Lang; label: string; short: string; html: string }[] = [
  { k: "en", label: "English", short: "EN", html: "en" },
  { k: "hi", label: "Hinglish", short: "Hing", html: "hi-Latn" },
  { k: "dv", label: "हिंदी", short: "हिं", html: "hi" },
];
export const isLang = (v: unknown): v is Lang => v === "en" || v === "hi" || v === "dv";

/** A string in all three languages. */
export type L = { en: string; hi: string; dv: string };
/** Legacy two-language string (EN + Hinglish) — still accepted everywhere an L is. */
export type L2 = { en: string; hi: string; dv?: string };
export type Text = L | L2 | string;

/** Pick the right language. Fallback order: dv -> hi -> en (a Devanagari reader is closer to
 *  Hinglish than to English); hi -> en; en -> hi. A bare string is returned as-is. */
export function tr(x: Text | null | undefined, lang: Lang): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (lang === "dv") return x.dv || x.hi || x.en || "";
  if (lang === "hi") return x.hi || x.en || "";
  return x.en || x.hi || "";
}
/** Build an L inline: t3("Home", "Home", "होम"). */
export const t3 = (en: string, hi: string, dv: string): L => ({ en, hi, dv });

/** Cookie the server reads so server-rendered pages follow the header toggle. Not httpOnly
 *  on purpose (the client writes it); it holds only "en" | "hi" | "dv". */
export const LANG_COOKIE = "5cd_lang";
export const toShared = (l: Lang): "en" | "hg" | "hi" => (l === "en" ? "en" : l === "hi" ? "hg" : "hi");
export function fromShared(v: unknown): Lang | null {
  if (v === "en") return "en";
  if (v === "hg") return "hi";
  if (v === "hi") return "dv";
  return null;
}
/** Value for <html lang>: Roman Hinglish is tagged hi-Latn so screen readers do not try Devanagari phonetics. */
export const htmlLang = (l: Lang) => LANGS.find((x) => x.k === l)!.html;
