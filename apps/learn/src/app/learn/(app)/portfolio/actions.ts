"use server";
import { revalidatePath } from "next/cache";
import { getViewer, createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
export type RowState = { error?: string; ok?: string };

/** Mock-portfolio row: virtual only. Full Why x2, top risk + answer, price-stop, Why-stop, review point are the Foundation artefact fields. */
export async function upsertRow(_: RowState, form: FormData): Promise<RowState> {
  if (!supabaseConfigured()) return { error: "Preview mode: rows are not saved until the Supabase project is connected." };
  const v = await getViewer(); if (!v || v.status !== "active") return { error: "Sign in required." };
  const g = (k: string) => String(form.get(k) ?? "").trim();
  const id = g("id") || null;
  const symbol = g("symbol").toUpperCase().slice(0, 20);
  if (!/^[A-Z0-9&.-]{1,20}$/.test(symbol)) return { error: "Symbol: NSE ticker style, e.g. TCS or M&M." };
  const num = (k: string) => { const s = g(k); if (!s) return null; const n = Number(s); return Number.isFinite(n) && n > 0 ? n : NaN; };
  const price_stop = num("price_stop"), entry_price = num("entry_price"), qty = num("qty");
  if ([price_stop, entry_price, qty].some((x) => Number.isNaN(x))) return { error: "Numbers must be positive." };
  const sb = await createClient();
  const { count } = await sb.from("portfolio_rows").select("id", { count: "exact", head: true }).eq("user_id", v.id);
  if (!id && (count ?? 0) >= 5) return { error: "Watchlist mein max 5 rows. Ek row review karke hataiye." };
  const payload = { user_id: v.id, symbol, full_why: g("full_why").slice(0, 2000), full_why_2: g("full_why_2").slice(0, 2000), top_risk: g("top_risk").slice(0, 1000), risk_answer: g("risk_answer").slice(0, 1000), price_stop, why_stop: g("why_stop").slice(0, 1000), review_point: g("review_point").slice(0, 500), entry_date: g("entry_date") || null, qty: qty ? Math.round(qty) : null, entry_price, is_virtual: true };
  const { error } = id ? await sb.from("portfolio_rows").update(payload).eq("id", id).eq("user_id", v.id) : await sb.from("portfolio_rows").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/learn/portfolio"); revalidatePath("/learn/score");
  return { ok: "Saved." };
}
export async function deleteRow(_: RowState, form: FormData): Promise<RowState> {
  if (!supabaseConfigured()) return { error: "Preview mode." };
  const v = await getViewer(); if (!v) return { error: "Sign in required." };
  const sb = await createClient();
  const { error } = await sb.from("portfolio_rows").delete().eq("id", String(form.get("id"))).eq("user_id", v.id);
  if (error) return { error: error.message };
  revalidatePath("/learn/portfolio"); return { ok: "Removed." };
}
