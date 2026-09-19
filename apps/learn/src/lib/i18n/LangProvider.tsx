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

/** The language this device actually chose (shared 5cd.lang, legacy fc_lang, or the cookie a switch
 *  or sign-in wrote), or null when it never chose one. Null is NOT "en": the server's pick (the
 *  signed-in learner's profile language, else English) stands, and nothing is pinned in its place. */
function readChoice(): Lang | null {
  const shared = fromShared(loadShared("lang"));
  if (shared) return shared;
  const legacy = rawRead(LEGACY_LANG);
  if (legacy === "hi") return "hi";
  return readCookie() ?? (legacy === "en" ? "en" : null);
}
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
  const getLang = React.useCallback((): Lang => readChoice() ?? initialLang, [initialLang]);
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
    // Keep the cookie in step with the client choice (WINNERS or the landing may have written
    // only localStorage). A device with no choice writes nothing: pinning the fallback "en" here
    // would hide the profile's language from every later server render.
    if (readChoice() !== null && readCookie() !== lang) writeCookie(lang);
    // Re-render the server parts whenever the client language differs from the one the server
    // rendered with — wherever the switch came from (this tab, another tab, WINNERS, the landing).
    // Another tab has already written the cookie by the time its storage event lands here, so the
    // cookie check above cannot be the trigger. After the refresh RootLayout reads the new cookie,
    // initialLang equals lang and this stops; with cookies blocked it runs once per full load.
    if (lang !== initialLang) router.refresh();
  }, [lang, initialLang, router]);
  const setLang = React.useCallback((l: Lang) => {
    saveShared("lang", toShared(l));
    rawWrite(LEGACY_LANG, l === "en" ? "en" : "hi");
    writeCookie(l);
    listeners.forEach((fn) => fn()); // the effect above does the one router.refresh()
  }, []);
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
