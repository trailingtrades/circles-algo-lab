"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuthAction } from "@/lib/auth/useAuthAction";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3, tr } from "@/lib/i18n/lang";
import { AUTH } from "@/lib/auth/messages";
import { AlertCircle } from "@/components/ui/Icon";
import { adoptRecovery, confirmReset } from "../../actions";
import { AuthLinks } from "../../AuthLinks";
import { LangSelect } from "../../LangSelect";

const S = {
  title: t3("Choose a new password", "Naya password chuniye", "नया पासवर्ड चुनिए"),
  intro: t3("At least 10 characters. After saving, you stay signed in here and every other device is signed out.", "Kam se kam 10 characters. Save karne ke baad aap yahan signed in rahenge, baaki sab devices se sign out ho jayega.", "कम से कम 10 कैरेक्टर। सेव करने के बाद आप यहाँ साइन इन रहेंगे, बाकी सभी डिवाइस से साइन आउट हो जाएगा।"),
  checking: t3("Checking your reset link…", "Reset link check ho raha hai…", "रीसेट लिंक जाँचा जा रहा है…"),
  password: t3("New password", "Naya password", "नया पासवर्ड"),
  again: t3("Repeat new password", "Naya password dobara", "नया पासवर्ड दोबारा"),
  save: t3("Save password", "Password save kijiye", "पासवर्ड सेव कीजिए"),
  saving: t3("Saving…", "Save ho raha hai…", "सेव हो रहा है…"),
  again2: t3("Request a new reset link", "Naya reset link maangiye", "नया रीसेट लिंक माँगिए"),
};

const noSubscribe = () => () => {};
// Supabase reports a dead link in the fragment (implicit flow) or the query (newer servers): read both.
const readUrl = () => `${window.location.search.slice(1)}&${window.location.hash.slice(1)}`;

/* Two ways in: the callback route already set a session cookie (token_hash links), or Supabase's
   standard email link put the recovery session in the URL fragment (see requestReset). The fragment
   is handed to the server once, then wiped from the address bar so it never lands in history. */
export default function ResetConfirmPage() {
  const { tx, lang } = useLang();
  const [state, action, pending] = useAuthAction(confirmReset, {});
  const p = new URLSearchParams(useSyncExternalStore(noSubscribe, readUrl, () => ""));
  const access = p.get("access_token");
  const refresh = p.get("refresh_token");
  const linkError = p.get("error_code") || p.get("error");
  const [adopt, setAdopt] = useState<"idle" | "ok" | "expired" | "suspended" | "inactive">("idle");
  useEffect(() => {
    if (!access || !refresh) return;
    let live = true;
    adoptRecovery(access, refresh).then((r) => {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (live) setAdopt(r.ok ? "ok" : r.reason ?? "expired");
    }, () => { if (live) setAdopt("expired"); });
    return () => { live = false; };
  }, [access, refresh]);
  const problem = linkError ? AUTH.expired : adopt === "expired" ? AUTH.expired : adopt === "suspended" ? AUTH.suspended : adopt === "inactive" ? AUTH.inactive : null;
  const checking = !problem && Boolean(access && refresh) && adopt === "idle";
  return (
    <div className="lrn-shell">
      <main className="lrn-main flex flex-col items-center justify-center" style={{ paddingTop: 32 }}>
        <div className="lrn-login">
          <div className="flex justify-end mb-2"><LangSelect /></div>
          <h1 className="lrn-title">{tx(S.title)}</h1>
          {problem ? (
            <div className="col-card">
              <p className="lrn-error" role="alert" style={{ margin: 0 }}><AlertCircle size={16} aria-hidden /> {tr(problem, lang)}</p>
              {problem !== AUTH.suspended && <p style={{ margin: "12px 0 0" }}><Link href="/learn/reset" className="lrn-link">{tx(S.again2)}</Link></p>}
            </div>
          ) : checking ? (
            <p className="col-card lrn-muted" role="status">{tx(S.checking)}</p>
          ) : (
            <>
              <p className="lrn-muted">{tx(S.intro)}</p>
              <form className="col-card" action={action}>
                <div className="lrn-field"><label htmlFor="pw">{tx(S.password)}</label><input id="pw" name="password" className="col-input" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></div>
                <div className="lrn-field"><label htmlFor="pw2">{tx(S.again)}</label><input id="pw2" name="password2" className="col-input" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></div>
                {state.error && <p className="lrn-error" role="alert"><AlertCircle size={16} aria-hidden /> {state.error}</p>}
                <button type="submit" className="col-btn col-btn--primary w-full justify-center" disabled={pending}>{tx(pending ? S.saving : S.save)}</button>
              </form>
            </>
          )}
          <AuthLinks lang={lang} />
        </div>
      </main>
      <ComplianceFooter tier={1} />
    </div>
  );
}
