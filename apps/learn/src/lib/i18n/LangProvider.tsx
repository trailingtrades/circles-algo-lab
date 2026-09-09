"use client";
import * as React from "react";
import { T, type Lang, type TKey } from "./strings";

const LANG_KEY = "fc_lang";   // shared with the Algo Lab page
const THEME_KEY = "fc_theme"; // shared with the Algo Lab page
type Theme = "dark" | "light";

/* Tiny localStorage-backed store so prefs hydrate via useSyncExternalStore (no setState-in-effect). */
const listeners = new Set<() => void>();
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function read(key: string): string | null { try { return window.localStorage.getItem(key); } catch { return null; } }
function write(key: string, v: string) { try { window.localStorage.setItem(key, v); } catch { /* private mode */ } listeners.forEach((l) => l()); }
const getLang = (): Lang => (read(LANG_KEY) === "hi" ? "hi" : "en");
const getTheme = (): Theme => (read(THEME_KEY) === "light" ? "light" : "dark");

interface Ctx { lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; t: (k: TKey) => string; }
const LangCtx = React.createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = React.useSyncExternalStore(subscribe, getLang, () => "en" as Lang);
  const theme = React.useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);
  React.useEffect(() => {
    const b = document.body; // tokens.css scopes light overrides to .col-root.col-light — body carries .col-root
    b.classList.toggle("col-light", theme === "light");
    b.classList.toggle("col-ground-light", theme === "light");
    b.classList.toggle("col-ground-dark", theme !== "light");
  }, [theme]);
  const setLang = (l: Lang) => write(LANG_KEY, l);
  const setTheme = (t: Theme) => write(THEME_KEY, t);
  const t = React.useCallback((k: TKey) => T[k][lang], [lang]);
  return <LangCtx.Provider value={{ lang, setLang, theme, setTheme, t }}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const c = React.useContext(LangCtx);
  if (!c) throw new Error("useLang outside LangProvider");
  return c;
}
