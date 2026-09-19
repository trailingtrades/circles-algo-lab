"use server";
import { revalidatePath } from "next/cache";
import { getViewer, createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getLang } from "@/lib/i18n/server";
import { t3, tr, type L, type Lang } from "@/lib/i18n/lang";

/** `field` names the input to mark invalid; `saved` bumps on every successful save so the add-form can clear itself. */
export type RowState = { error?: string; ok?: string; field?: string; saved?: number };

const S = {
  preview: t3("Preview only: rows are not saved here.", "Ye sirf preview hai: yahan rows save nahi hoti.", "यह सिर्फ़ प्रीव्यू है: यहाँ रो सेव नहीं होतीं।"),
  signIn: t3("Please sign in again to save.", "Save karne ke liye dobara sign in kijiye.", "सेव करने के लिए फिर से साइन इन करें।"),
  symbol: t3("Symbol: use the NSE ticker, for example TCS or M&M.", "Symbol: NSE ticker likhiye, jaise TCS ya M&M.", "सिंबल: NSE टिकर लिखिए, जैसे TCS या M&M।"),
  date: t3("Entry date: pick a real date from the calendar.", "Entry date: calendar se sahi date chuniye.", "एंट्री डेट: कैलेंडर से सही तारीख़ चुनिए।"),
  qty: t3("Qty: a whole number from 1 to 10,00,000.", "Qty: 1 se 10,00,000 tak ka poora number likhiye.", "मात्रा: 1 से 10,00,000 तक की पूरी संख्या लिखिए।"),
  price: t3("Price: a number above 0 and up to 10,00,000, with at most 2 decimals (e.g. 1520.50).", "Price: 0 se zyada aur 10,00,000 tak, zyada se zyada 2 decimal (jaise 1520.50).", "कीमत: 0 से ज़्यादा और 10,00,000 तक, ज़्यादा से ज़्यादा 2 दशमलव (जैसे 1520.50)।"),
  full: t3("Your watchlist already has 5 rows. Review one and remove it before adding another.", "Watchlist mein pehle se 5 rows hain. Nayi jodne se pehle ek row review karke hataiye.", "वॉचलिस्ट में पहले से 5 रो हैं। नई जोड़ने से पहले एक रो रिव्यू करके हटाइए।"),
  failed: t3("Could not save. Please check the fields and try again.", "Save nahi ho paya. Fields check karke dobara try kijiye.", "सेव नहीं हो पाया। फ़ील्ड जाँचकर फिर से कोशिश करें।"),
  saved: t3("Saved.", "Save ho gaya.", "सेव हो गया।"),
  removed: t3("Row removed.", "Row hata di gayi.", "रो हटा दी गई।"),
  removeFailed: t3("Could not remove the row. Please try again.", "Row nahi hat payi. Dobara try kijiye.", "रो नहीं हट पाई। फिर से कोशिश करें।"),
};
const MAX = 1_000_000; // Rs 10 lakh per share / 10 lakh shares: far above any real NSE value, far below numeric(12,2) and integer limits
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A real calendar date (YYYY-MM-DD from <input type="date">), not "next Monday" and not 2026-02-30. */
function isoDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;
}
/** "1,520.50" -> 1520.5; null when empty; NaN when not a plain positive number within range. Commas are allowed (Indian grouping). */
function amount(raw: string, whole: boolean) {
  const s = raw.replace(/[,\s]/g, ""); if (!s) return null;
  if (!(whole ? /^\d+$/ : /^\d+(\.\d{1,2})?$/).test(s)) return NaN;
  const n = Number(s); return n > 0 && n <= MAX ? n : NaN;
}

/** Mock-portfolio row: virtual only. Full Why x2, top risk + answer, price-stop, Why-stop, review point are the Foundation artefact fields. */
export async function upsertRow(_: RowState, form: FormData): Promise<RowState> {
  if (!supabaseConfigured()) return { error: tr(S.preview, await getLang()) };
  const v = await getViewer();
  const lang: Lang = await getLang(v?.lang);
  const err = (x: L, field?: string): RowState => ({ error: tr(x, lang), field });
  if (!v || v.status !== "active") return err(S.signIn);
  const g = (k: string) => String(form.get(k) ?? "").trim();
  const id = g("id") || null;
  if (id && !UUID.test(id)) return err(S.failed);
  const symbol = g("symbol").toUpperCase().slice(0, 20);
  if (!/^[A-Z0-9&.-]{1,20}$/.test(symbol)) return err(S.symbol, "symbol");
  const entry_date = g("entry_date") || null;
  if (entry_date && !isoDate(entry_date)) return err(S.date, "entry_date");
  const qty = amount(g("qty"), true);
  if (Number.isNaN(qty)) return err(S.qty, "qty");
  const entry_price = amount(g("entry_price"), false), price_stop = amount(g("price_stop"), false);
  if (Number.isNaN(entry_price)) return err(S.price, "entry_price");
  if (Number.isNaN(price_stop)) return err(S.price, "price_stop");
  const sb = await createClient();
  const { count } = await sb.from("portfolio_rows").select("id", { count: "exact", head: true }).eq("user_id", v.id);
  if (!id && (count ?? 0) >= 5) return err(S.full);
  const payload = { user_id: v.id, symbol, full_why: g("full_why").slice(0, 2000), full_why_2: g("full_why_2").slice(0, 2000), top_risk: g("top_risk").slice(0, 1000), risk_answer: g("risk_answer").slice(0, 1000), price_stop, why_stop: g("why_stop").slice(0, 1000), review_point: g("review_point").slice(0, 500), entry_date, qty, entry_price, is_virtual: true };
  const { error } = id ? await sb.from("portfolio_rows").update(payload).eq("id", id).eq("user_id", v.id) : await sb.from("portfolio_rows").insert(payload);
  // Raw database text ("invalid input syntax for type date") never reaches the learner.
  if (error) { console.error("[portfolio] save failed:", error.message); return err(S.failed); }
  revalidatePath("/learn/portfolio"); revalidatePath("/learn/score");
  return { ok: tr(S.saved, lang), saved: Date.now() };
}

export async function deleteRow(_: RowState, form: FormData): Promise<RowState> {
  if (!supabaseConfigured()) return { error: tr(S.preview, await getLang()) };
  const v = await getViewer();
  const lang = await getLang(v?.lang);
  if (!v) return { error: tr(S.signIn, lang) };
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) return { error: tr(S.removeFailed, lang) };
  const sb = await createClient();
  const { error } = await sb.from("portfolio_rows").delete().eq("id", id).eq("user_id", v.id);
  if (error) { console.error("[portfolio] delete failed:", error.message); return { error: tr(S.removeFailed, lang) }; }
  revalidatePath("/learn/portfolio"); return { ok: tr(S.removed, lang) };
}
