"use client";
import { AlertTriangle, RefreshCw } from "@/components/ui/Icon";
/** Route-level error boundary inside the app shell (header + footer stay, SEBI line stays visible). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="col-card col-empty" role="alert">
      <AlertTriangle size={36} strokeWidth={1.5} aria-hidden />
      <p className="col-empty__title">Kuch gadbad ho gayi</p>
      <p style={{ margin: 0 }}>Page load nahi ho paya. Ek baar dobara try kijiye. Agar phir bhi na chale, apne mentor ko batayiye{error.digest ? ` (ref ${error.digest})` : ""}.</p>
      <button type="button" className="col-btn col-btn--primary mt-3" onClick={reset}><RefreshCw size={16} aria-hidden /> Try again</button>
    </div>
  );
}
