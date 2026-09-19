"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { T, type TKey } from "./strings";
import { fromShared, htmlLang, isLang, LANG_COOKIE, toShared, tr, type Lang, type Text } from "./lang";

/* One language choice shared by every 5 Circles surface (landing, SMART, WINNERS, O.N.E):
   localStorage `5cd.lang`, JSON-encoded ("en" | "hg" | "hi" — WITH the quotes; Winners'
   JSON.parse drops a bare string). App code uses en / hi (Hinglish) / dv (Devanagari); the
   mapping lives in lang.ts (toShared / fromShared) and nowhere else.
   Server components cannot read localStorage, so every switch also writes the `5cd_lang`
   cookie and refreshes the route: the whole page — lessons, quizzes, buttons — changes, not
   just the client widgets. `fc_lang` is still mirrored for the Algo Lab page (en / hi). */
const LS = "5cd.";
const LEGACY_LANG = "fc_lang";
const LEGACY_THEME = "fc_theme";
type Theme = "dark" | "light";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key.startsWith(LS) || e.key.startsWith("fc_")) cb(); };
  window.addEventListener("storage", onStorage); // another tab (or WINNERS in another tab) switched
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}
function rawRead(key: string): string | null { try { return window.localStorage.getItem(key); } catch { return null; } }
function rawWrite(key: string, v: string) { try { window.localStorage.setItem(key, v); } catch { /* private mode */ } }
function loadShared(k: string): unknown { const v = rawRead(LS + k); if (v == null) return null; try { return JSON.parse(v); } catch { return v; } }
function saveShared(k: string, v: string) { rawWrite(LS + k, JSON.stringify(v)); }
function readCookie(): Lang | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
  return m && isLang(m[1]) ? m[1] : null;
}
function writeCookie(l: Lang) {
  // path=/ so the landing and the other stages can read it too; one year; Lax like the auth cookies.
  document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
}

const getLang = (): Lang => {
  const shared = fromShared(loadShared("lang"));
  if (shared) return shared;
  const legacy = rawRead(LEGACY_LANG);
  return legacy === "hi" ? "hi" : readCookie() ?? "en";
};
const getTheme = (): Theme => {
  const shared = loadShared("theme");
  if (shared === "light" || shared === "dark") return shared;
  return rawRead(LEGACY_THEME) === "light" ? "light" : "dark";
};

interface Ctx { lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; t: (k: TKey) => string; tx: (x: Text | null | undefined) => string }
const LangCtx = React.createContext<Ctx | null>(null);

/** `initialLang` is what the server rendered with (cookie / profile), so the first client paint matches it. */
export function LangProvider({ children, initialLang = "en" }: { children: React.ReactNode; initialLang?: Lang }) {
  const router = useRouter();
  const lang = React.useSyncExternalStore(subscribe, getLang, () => initialLang);
  const theme = React.useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);
  React.useEffect(() => {
    // Winners switches theme by stamping data-theme on documentElement (dark is the default —
    // there is no attribute-less state). The body classes stay for the legacy .col-light rules.
    document.documentElement.setAttribute("data-theme", theme);
    const b = document.body;
    b.classList.toggle("col-light", theme === "light");
    b.classList.toggle("col-ground-light", theme === "light");
    b.classList.toggle("col-ground-dark", theme !== "light");
  }, [theme]);
  React.useEffect(() => {
    document.documentElement.lang = htmlLang(lang);
    document.documentElement.dataset.lang = lang;
    // The choice came from somewhere the server could not see (WINNERS, the landing, another
    // tab): store it in the cookie and re-render the server parts once.
    if (readCookie() !== lang) { writeCookie(lang); if (lang !== initialLang) router.refresh(); }
  }, [lang, initialLang, router]);
  const setLang = React.useCallback((l: Lang) => {
    saveShared("lang", toShared(l));
    rawWrite(LEGACY_LANG, l === "en" ? "en" : "hi");
    writeCookie(l);
    listeners.forEach((fn) => fn());
    router.refresh();
  }, [router]);
  const setTheme = React.useCallback((t: Theme) => { saveShared("theme", t); rawWrite(LEGACY_THEME, t); listeners.forEach((fn) => fn()); }, []);
  const t = React.useCallback((k: TKey) => tr(T[k], lang), [lang]);
  const tx = React.useCallback((x: Text | null | undefined) => tr(x, lang), [lang]);
  return <LangCtx.Provider value={{ lang, setLang, theme, setTheme, t, tx }}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const c = React.useContext(LangCtx);
  if (!c) throw new Error("useLang outside LangProvider");
  return c;
}
