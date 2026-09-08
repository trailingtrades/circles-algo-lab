"use client";
import Link from "next/link";
import { useActionState } from "react";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { requestReset } from "../actions";

export default function ResetPage() {
  const [state, action, pending] = useActionState(requestReset, {});
  const sent = state.error === "";
  return (
    <div className="lrn-shell">
      <main className="lrn-main flex flex-col items-center justify-center" style={{ paddingTop: 48 }}>
        <div className="lrn-login">
          <h1 className="lrn-title">Reset password</h1>
          <p className="lrn-muted">Apna email dijiye. Agar account hai to reset link aayega. Link 1 ghante mein expire hota hai.</p>
          <form className="col-card" action={action}>
            {sent ? <p className="lrn-notice" role="status">Agar ye email registered hai, to reset link bhej diya gaya hai. Inbox aur spam dono check kijiye.</p> : (
              <>
                <div className="lrn-field"><label htmlFor="email">Email</label><input id="email" name="email" className="col-input" type="email" autoComplete="email" required /></div>
                {state.error && <p className="lrn-error" role="alert">{state.error}</p>}
                <button type="submit" className="col-btn col-btn--primary w-full justify-center" disabled={pending}>Send reset link</button>
              </>
            )}
            <p className="text-center mt-3" style={{ fontSize: "var(--col-text-body-sm)" }}><Link href="/learn" className="lrn-link">Back to sign in</Link></p>
          </form>
        </div>
      </main>
      <ComplianceFooter tier={1} />
    </div>
  );
}
