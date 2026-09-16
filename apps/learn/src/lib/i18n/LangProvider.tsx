"use client";
import * as React from "react";
import { T, type Lang, type TKey } from "./strings";

/* Shared state with the other 5 Circles surfaces (Winners dashboard):
   keys are prefixed `5cd.` and values are JSON-encoded — the theme key is
   `5cd.theme` and its value is `"dark"` WITH the quotes, never bare `dark`.
   Winners' own JSON.parse throws on a bare string and silently falls back,
   so a student would lose their theme/language moving between surfaces.
   `5cd.lang` holds "en" / "hg" (Hinglish) / "hi" (Devanagari). 5C Learn has
   no Devanagari (§1.5), so "hg" AND "hi" both land on our Hinglish, and we
   write "hg" — never "hi" — so Winners shows Hinglish, not Devanagari.
   The old fc_* bare-string keys stay as a legacy fallback + mirror so the
   Algo Lab page keeps agreeing too. */
const LS = "5cd.";
const LEGACY_LANG = "fc_lang";
const LEGACY_THEME = "fc_theme";
type Theme = "dark" | "light";

/* Tiny localStorage-backed store so prefs hydrate via useSyncExternalStore (no setState-in-effect). */
const listeners = new Set<() => void>();
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function rawRead(key: string): string | null { try { return window.localStorage.getItem(key); } catch { return null; } }
function rawWrite(key: string, v: string) { try { window.localStorage.setItem(key, v); } catch { /* private mode */ } }
function loadShared(k: string): unknown { const v = rawRead(LS + k); if (v == null) return null; try { return JSON.parse(v); } catch { return null; } }
function saveShared(k: string, v: string) { rawWrite(LS + k, JSON.stringify(v)); }

const getLang = (): Lang => {
  const shared = loadShared("lang");
  if (shared === "en") return "en";
  if (shared === "hg" || shared === "hi") return "hi"; // both map to our Roman Hinglish
  return rawRead(LEGACY_LANG) === "hi" ? "hi" : "en";
};
const getTheme = (): Theme => {
  const shared = loadShared("theme");
  if (shared === "light" || shared === "dark") return shared;
  return rawRead(LEGACY_THEME) === "light" ? "light" : "dark";
};

interface Ctx { lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; t: (k: TKey) => string; }
const LangCtx = React.createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = React.useSyncExternalStore(subscribe, getLang, () => "en" as Lang);
  const theme = React.useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);
  React.useEffect(() => {
    // Winners switches theme by stamping data-theme on documentElement (dark is the
    // default — there is no attribute-less state). The body classes stay for the
    // legacy .col-light rules, which the winners.css bridge keeps in agreement.
    document.documentElement.setAttribute("data-theme", theme);
    const b = document.body;
    b.classList.toggle("col-light", theme === "light");
    b.classList.toggle("col-ground-light", theme === "light");
    b.classList.toggle("col-ground-dark", theme !== "light");
  }, [theme]);
  const setLang = (l: Lang) => { saveShared("lang", l === "hi" ? "hg" : "en"); rawWrite(LEGACY_LANG, l); listeners.forEach((fn) => fn()); };
  const setTheme = (t: Theme) => { saveShared("theme", t); rawWrite(LEGACY_THEME, t); listeners.forEach((fn) => fn()); };
  const t = React.useCallback((k: TKey) => T[k][lang], [lang]);
  return <LangCtx.Provider value={{ lang, setLang, theme, setTheme, t }}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const c = React.useContext(LangCtx);
  if (!c) throw new Error("useLang outside LangProvider");
  return c;
}
