import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { COOKIE_OPTIONS, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Per-request client bound to the caller's session cookie. RLS applies. */
export async function createClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, { ...options, ...COOKIE_OPTIONS })); } catch { /* called from a Server Component: proxy.ts refreshes instead */ } },
    },
  });
}

export type Viewer = { id: string; email: string | null; role: "student" | "mentor" | "admin"; status: "invited" | "active" | "suspended"; full_name: string; cohort_id: string | null; lang: "en" | "hi" };

/** Authenticated viewer + profile, or null. Never trusts the JWT for role: reads profiles under RLS. */
export async function getViewer(): Promise<Viewer | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: p } = await sb.from("profiles").select("role,status,full_name,cohort_id,lang").eq("id", user.id).maybeSingle();
  if (!p) return null;
  return { id: user.id, email: user.email ?? null, ...p };
}
