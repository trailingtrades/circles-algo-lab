"use client";
import { CREDENTIAL_LINE, TIER1 } from "@/lib/compliance/strings";
/* Root-level error boundary: must render its own <html>/<body>; globals.css is already loaded by the failed tree in most cases, so keep styling inline-safe. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#050608", color: "#f2f5f9", fontFamily: '"IBM Plex Sans", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <main style={{ flex: 1, padding: 24, maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: "#97a1b3" }}>Kuch gadbad ho gayi. Ek baar dobara try kijiye; agar phir bhi na chale, apne mentor ko batayiye.</p>
          <button type="button" onClick={reset} style={{ height: 38, padding: "0 16px", borderRadius: 9999, border: "none", background: "#0b74b8", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </main>
        <footer style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: 16, fontSize: 12, lineHeight: 1.5, color: "#97a1b3", overflowWrap: "anywhere" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#f2f5f9", fontFamily: '"IBM Plex Mono", Consolas, monospace' }}>{CREDENTIAL_LINE}</p>
          <p style={{ margin: 0 }}>{TIER1}</p>
        </footer>
      </body>
    </html>
  );
}
