"use client";
import { useActionState, useState } from "react";
import { acceptInvite } from "../actions";
import { ShieldCheck, Target, Activity, ArrowRight } from "@/components/ui/Icon";

/* First-login onboarding: 3 Hinglish cards, then password + code of conduct (§7). */
const CARDS = [
  { icon: Target, title: "Process pehle, profit baad mein", body: "Yahan score aapke process ka hai — quiz, journal, Friday review. Mock portfolio ka return kabhi count nahi hota. Return copy nahi hota, process hota hai." },
  { icon: Activity, title: "AI analyst hai, trigger aap hain", body: "AI Lab mein prompts milenge. AI research karega, decision aap loge. Yahan koi live market data ya order placement nahi hai — sab virtual." },
  { icon: ShieldCheck, title: "F&O: samjho, khelo mat", body: "SEBI FY26 study (Aug 2026): 87.7% individual F&O traders net loss mein the. Course mein F&O samajhna hai, khelna nahi." },
];

export function InviteForm({ token, fullName, cohortName, email }: { token: string; fullName: string; cohortName: string; email: string }) {
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState(acceptInvite, {});
  if (step < CARDS.length) {
    const C = CARDS[step];
    return (
      <div className="col-card lrn-onboard" aria-live="polite">
        <span className="col-eyebrow">Welcome, {fullName} · {step + 1} / {CARDS.length}</span>
        <C.icon size={40} strokeWidth={1.5} aria-hidden style={{ color: "var(--col-brand)", margin: "16px 0 8px" }} />
        <h1 className="lrn-title" style={{ fontSize: 22 }}>{C.title}</h1>
        <p className="lrn-muted">{C.body}</p>
        <button type="button" className="col-btn col-btn--primary mt-3" onClick={() => setStep(step + 1)}>{step + 1 === CARDS.length ? "Set my password" : "Next"} <ArrowRight size={16} aria-hidden /></button>
      </div>
    );
  }
  return (
    <form className="col-card" action={action}>
      <input type="hidden" name="token" value={token} />
      <span className="col-eyebrow">Cohort · {cohortName}</span>
      <h1 className="lrn-title mt-2" style={{ fontSize: 22 }}>Set your password</h1>
      <p className="lrn-muted">Account: <span className="lrn-num">{email}</span>. Password sirf aap jaante hain — admin ko bhi nahi dikhta.</p>
      <div className="lrn-field"><label htmlFor="pw">Password (min 10 characters)</label><input id="pw" name="password" className="col-input" type="password" autoComplete="new-password" minLength={10} required /></div>
      <div className="lrn-field"><label htmlFor="pw2">Repeat password</label><input id="pw2" name="password2" className="col-input" type="password" autoComplete="new-password" minLength={10} required /></div>
      <label className="lrn-check"><input type="checkbox" name="conduct" required /><span>I accept the learner code of conduct: this is an education platform with virtual money only; I will not treat any content as investment advice, and I will not share my login.</span></label>
      {state.error && <p className="lrn-error" role="alert">{state.error}</p>}
      <button type="submit" className="col-btn col-btn--primary w-full justify-center mt-3" disabled={pending}>{pending ? "Creating account" : "Create my account"}</button>
    </form>
  );
}
