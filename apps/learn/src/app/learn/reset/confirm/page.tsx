"use client";
import { useActionState } from "react";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { confirmReset } from "../../actions";

export default function ResetConfirmPage() {
  const [state, action, pending] = useActionState(confirmReset, {});
  return (
    <div className="lrn-shell">
      <main className="lrn-main flex flex-col items-center justify-center" style={{ paddingTop: 48 }}>
        <div className="lrn-login">
          <h1 className="lrn-title">Choose a new password</h1>
          <form className="col-card" action={action}>
            <div className="lrn-field"><label htmlFor="pw">New password</label><input id="pw" name="password" className="col-input" type="password" autoComplete="new-password" minLength={10} required /></div>
            <div className="lrn-field"><label htmlFor="pw2">Repeat password</label><input id="pw2" name="password2" className="col-input" type="password" autoComplete="new-password" minLength={10} required /></div>
            {state.error && <p className="lrn-error" role="alert">{state.error}</p>}
            <button type="submit" className="col-btn col-btn--primary w-full justify-center" disabled={pending}>Save password</button>
          </form>
        </div>
      </main>
      <ComplianceFooter tier={1} />
    </div>
  );
}
