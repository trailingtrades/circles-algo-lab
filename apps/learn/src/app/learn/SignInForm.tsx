"use client";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { useAuthAction } from "@/lib/auth/useAuthAction";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3 } from "@/lib/i18n/lang";
import { AlertCircle } from "@/components/ui/Icon";
import { signIn } from "./actions";
import { waLink } from "./AuthLinks";

const S = {
  form: t3("Sign in", "Sign in", "साइन इन"),
  email: t3("Email", "Email", "ईमेल"),
  password: t3("Password", "Password", "पासवर्ड"),
  submit: t3("Sign in", "Sign in karein", "साइन इन करें"),
  pending: t3("Signing in…", "Sign in ho raha hai…", "साइन इन हो रहा है…"),
  forgot: t3("Forgot password?", "Password bhool gaye?", "पासवर्ड भूल गए?"),
  hint: t3("New here, or lost your invite link?", "Naye hain, ya invite link nahi mil raha?", "नए हैं, या इनवाइट लिंक नहीं मिल रहा?"),
  wa: t3("Message us on WhatsApp", "WhatsApp par message kijiye", "WhatsApp पर मैसेज कीजिए"),
  linkBad: t3("That email link has expired or is not valid. Please ask for a new one.", "Ye email link expire ho gaya hai ya sahi nahi hai. Naya link maangiye.", "यह ईमेल लिंक एक्सपायर हो गया है या सही नहीं है। नया लिंक माँगिए।"),
};

const noSubscribe = () => () => {};
const readHash = () => window.location.hash;

/** Server-computed notice (?suspended, ?set, ?error=link …), with an optional follow-up link. */
export type Notice = { text: string; href?: string; label?: string } | null;

export function SignInForm({ next, notice }: { next: string; notice: Notice }) {
  const { tx, lang } = useLang();
  const [state, action, pending] = useAuthAction(signIn, {});
  // Supabase's own email links put their result in the URL fragment, which never reaches the server.
  const hash = useSyncExternalStore(noSubscribe, readHash, () => "");
  useEffect(() => {
    // A reset link that fell back to the site root still carries its recovery session: finish the reset.
    if (/(^|[#&])type=recovery(&|$)/.test(hash) && hash.includes("access_token=")) {
      window.location.replace(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/learn/reset/confirm${hash}`);
    }
  }, [hash]);
  const shown: Notice = notice ?? (/(^|[#&])error(_code)?=/.test(hash) ? { text: tx(S.linkBad) } : null);
  return (
    <form className="col-card" action={action} aria-label={tx(S.form)}>
      <input type="hidden" name="next" value={next} />
      {shown && (
        <p className="lrn-notice" role="status">
          <AlertCircle size={16} aria-hidden />
          <span>{shown.text}{shown.href && <> <Link href={shown.href} className="lrn-link">{shown.label}</Link></>}</span>
        </p>
      )}
      <div className="lrn-field"><label htmlFor="email">{tx(S.email)}</label><input id="email" name="email" className="col-input" type="email" autoComplete="email" inputMode="email" required /></div>
      <div className="lrn-field"><label htmlFor="pw">{tx(S.password)}</label><input id="pw" name="password" className="col-input" type="password" autoComplete="current-password" required /></div>
      {state.error && <p className="lrn-error" role="alert"><AlertCircle size={16} aria-hidden /> {state.error}</p>}
      <button type="submit" className="col-btn col-btn--primary w-full justify-center" disabled={pending}>{tx(pending ? S.pending : S.submit)}</button>
      <p className="text-center mt-3" style={{ fontSize: "var(--col-text-body-sm)", margin: "12px 0 0" }}><Link href="/learn/reset" className="lrn-link">{tx(S.forgot)}</Link></p>
      <p className="lrn-muted text-center" style={{ fontSize: "var(--col-text-body-sm)", margin: "8px 0 0" }}>
        {tx(S.hint)} <a href={waLink(lang, "invite")} className="lrn-link" target="_blank" rel="noopener noreferrer">{tx(S.wa)}</a>
      </p>
    </form>
  );
}
