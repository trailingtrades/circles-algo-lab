"use client";
import { AlertTriangle, RefreshCw } from "@/components/ui/Icon";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3 } from "@/lib/i18n/lang";

const S = {
  title: t3("Something went wrong", "Kuch gadbad ho gayi", "कुछ गड़बड़ हो गई"),
  body: t3("This page did not load. Please try once more. If it still does not open, tell your mentor", "Page load nahi ho paya. Ek baar dobara try kijiye. Phir bhi na khule to apne mentor ko batayiye", "पेज लोड नहीं हो पाया। एक बार फिर कोशिश कीजिए। फिर भी न खुले तो अपने मेंटर को बताइए"),
  ref: t3("reference", "reference", "रेफ़रेंस"),
};

/** Route-level error boundary inside the app shell (header + footer stay, SEBI line stays visible). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { tx, t } = useLang();
  return (
    <div className="col-card col-empty" role="alert">
      <AlertTriangle size={36} strokeWidth={1.5} aria-hidden />
      <p className="col-empty__title">{tx(S.title)}</p>
      <p style={{ margin: 0 }}>{tx(S.body)}{error.digest ? ` (${tx(S.ref)} ${error.digest})` : ""}.</p>
      <button type="button" className="col-btn col-btn--primary mt-3" onClick={reset}><RefreshCw size={16} aria-hidden /> {t("tryAgain")}</button>
    </div>
  );
}
