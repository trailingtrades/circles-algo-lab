"use client";
import Image from "next/image";
import { useLang } from "@/lib/i18n/LangProvider";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { CREDENTIAL_LINE, COMPANY } from "@/lib/compliance/strings";

export default function LoginPage() {
  const { t, lang, setLang } = useLang();
  return (
    <div className="lrn-shell">
      <main className="lrn-main flex flex-col items-center justify-center" style={{ paddingTop: 48 }}>
        <div className="lrn-login">
          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            <Image src="/brand/logo.png" alt="5 Circles" width={64} height={64} priority />
            <h1 className="lrn-title">5C Learn</h1>
            <p className="col-eyebrow">{COMPANY.tagline}</p>
            <p className="lrn-muted" style={{ margin: 0 }}>{t("welcome")}</p>
          </div>
          <form className="col-card" onSubmit={(e) => e.preventDefault()} aria-label="Sign in">
            <div className="lrn-field"><label htmlFor="email">Email</label><input id="email" className="col-input" type="email" autoComplete="email" inputMode="email" /></div>
            <div className="lrn-field"><label htmlFor="pw">Password</label><input id="pw" className="col-input" type="password" autoComplete="current-password" /></div>
            <button type="submit" className="col-btn col-btn--primary w-full justify-center">Sign in</button>
            <p className="lrn-muted mt-3 text-center" style={{ fontSize: "var(--col-text-body-sm)" }}>{t("inviteHint")}</p>
            <button type="button" className="lrn-toggle mt-2 w-full" onClick={() => setLang(lang === "en" ? "hi" : "en")}>{lang === "en" ? "Hinglish mein dekhein" : "View in English"}</button>
          </form>
          <p className="col-eyebrow mt-4 text-center">{CREDENTIAL_LINE}</p>
        </div>
      </main>
      <ComplianceFooter tier={1} />
    </div>
  );
}
