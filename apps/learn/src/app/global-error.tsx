"use client";
import { useSyncExternalStore } from "react";
import { CREDENTIAL_LINE, TIER1 } from "@/lib/compliance/strings";
import { htmlLang, isLang, LANG_COOKIE, t3, tr, type Lang } from "@/lib/i18n/lang";

/* Root-level error boundary: must render its own <html>/<body>; globals.css is already loaded by the failed tree in most cases, so keep styling inline-safe.
   The root layout (and its LangProvider) is what failed, so the language comes straight from the cookie the switch writes. */
const S = {
  title: t3("Something went wrong", "Kuch gadbad ho gayi", "कुछ गड़बड़ हो गई"),
  body: t3("Please try once more. If it still does not work, tell your mentor.", "Ek baar dobara try kijiye. Phir bhi na chale, to apne mentor ko bataiye.", "एक बार फिर कोशिश कीजिए। फिर भी न चले, तो अपने मेंटर को बताइए।"),
  retry: t3("Try again", "Dobara try kijiye", "फिर से कोशिश कीजिए"),
  signIn: t3("Back to sign in", "Sign in par wapas", "साइन इन पर वापस"),
};
const noSubscribe = () => () => {};
function cookieLang(): Lang {
  const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
  return m && isLang(m[1]) ? m[1] : "en";
}

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const lang = useSyncExternalStore(noSubscribe, cookieLang, (): Lang => "en");
  return (
    <html lang={htmlLang(lang)}>
      <body style={{ margin: 0, background: "#050608", color: "#f2f5f9", fontFamily: '"IBM Plex Sans", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <main style={{ flex: 1, padding: 24, maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{tr(S.title, lang)}</h1>
          <p style={{ color: "#97a1b3" }}>{tr(S.body, lang)}</p>
          <p style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
            <button type="button" onClick={reset} style={{ height: 38, padding: "0 16px", borderRadius: 9999, border: "none", background: "#0b74b8", color: "#fff", fontWeight: 600, cursor: "pointer" }}>{tr(S.retry, lang)}</button>
            {/* A full page load on purpose: the client router is part of what may have failed. */}
            <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/learn`} style={{ color: "#5cc8f5" }}>{tr(S.signIn, lang)}</a>
          </p>
        </main>
        <footer style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: 16, fontSize: 12, lineHeight: 1.5, color: "#97a1b3", overflowWrap: "anywhere" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#f2f5f9", fontFamily: '"IBM Plex Mono", Consolas, monospace' }}>{CREDENTIAL_LINE}</p>
          <p style={{ margin: 0 }}>{TIER1}</p>
        </footer>
      </body>
    </html>
  );
}
