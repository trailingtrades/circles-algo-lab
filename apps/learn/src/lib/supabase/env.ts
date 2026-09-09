export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/** Session cookies: httpOnly + secure (prod) + sameSite=lax — master prompt §5. All auth runs server-side; the browser never holds a Supabase client. */
export const COOKIE_OPTIONS = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
/** Public site origin: explicit env first, then Vercel's deployment URL, then localhost. */
export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
