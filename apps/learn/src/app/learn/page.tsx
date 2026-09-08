"use client";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { CREDENTIAL_LINE, COMPANY } from "@/lib/compliance/strings";
import { signIn } from "./actions";
import { AlertCircle } from "@/components/ui/Icon";

function LoginInner() {
  const { t, lang, setLang } = useLang();
  const [state, action, pending] = useActionState(signIn, {});
  const params = useSearchParams();
  const notice = params.get("suspended") ? "Ye account suspended hai. Apne mentor se sampark kijiye." : params.get("set") ? "Password set ho gaya. Ab sign in kijiye." : params.get("error") === "link" ? "Link expire ho gaya ya galat hai." : null;
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
          <form className="col-card" action={action} aria-label="Sign in">
            {notice && <p className="lrn-notice" role="status"><AlertCircle size={16} aria-hidden /> {notice}</p>}
            <div className="lrn-field"><label htmlFor="email">Email</label><input id="email" name="email" className="col-input" type="email" autoComplete="email" inputMode="email" required /></div>
            <div className="lrn-field"><label htmlFor="pw">Password</label><input id="pw" name="password" className="col-input" type="password" autoComplete="current-password" required /></div>
            {state.error && <p className="lrn-error" role="alert"><AlertCircle size={16} aria-hidden /> {state.error}</p>}
            <button type="submit" className="col-btn col-btn--primary w-full justify-center" disabled={pending}>{pending ? "Signing in" : "Sign in"}</button>
            <p className="lrn-muted mt-3 text-center" style={{ fontSize: "var(--col-text-body-sm)" }}>{t("inviteHint")}</p>
            <p className="text-center" style={{ fontSize: "var(--col-text-body-sm)", margin: "4px 0 0" }}><Link href="/learn/reset" className="lrn-link">Forgot password?</Link></p>
            <button type="button" className="lrn-toggle mt-3 w-full" onClick={() => setLang(lang === "en" ? "hi" : "en")}>{lang === "en" ? "Hinglish mein dekhein" : "View in English"}</button>
          </form>
          <p className="col-eyebrow mt-4 text-center">{CREDENTIAL_LINE}</p>
        </div>
      </main>
      <ComplianceFooter tier={1} grievance />
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}
