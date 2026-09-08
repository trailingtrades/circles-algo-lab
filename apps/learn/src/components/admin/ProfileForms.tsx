"use client";
import { useActionState } from "react";
import { updateProfile, changePassword } from "@/app/learn/(app)/profile/actions";
import { signOut } from "@/app/learn/actions";

export function ProfileForms({ email, fullName, phone, alias, lang }: { email: string; fullName: string; phone: string; alias: string; lang: string }) {
  const [s1, a1, p1] = useActionState(updateProfile, {});
  const [s2, a2, p2] = useActionState(changePassword, {});
  return (
    <div className="lrn-grid mt-4">
      <form action={a1} className="col-card" aria-labelledby="det">
        <h2 id="det" className="lrn-session__title">Details</h2>
        <div className="lrn-field mt-3"><label>Email</label><input className="col-input lrn-num" value={email} readOnly disabled /></div>
        <div className="lrn-field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" className="col-input" defaultValue={fullName} maxLength={80} required /></div>
        <div className="lrn-field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" className="col-input" defaultValue={phone} inputMode="tel" maxLength={20} /></div>
        <div className="lrn-field"><label htmlFor="display_alias">Leaderboard alias (optional)</label><input id="display_alias" name="display_alias" className="col-input" defaultValue={alias} maxLength={24} placeholder="Default: First name + last initial" /></div>
        <div className="lrn-field"><label htmlFor="lang">Teaching copy language</label>
          <select id="lang" name="lang" className="col-input" defaultValue={lang}><option value="en">English</option><option value="hi">Hinglish</option></select></div>
        {s1.error && <p className="lrn-error" role="alert">{s1.error}</p>}
        {s1.ok && <p className="lrn-notice" role="status">{s1.ok}</p>}
        <button className="col-btn col-btn--primary" disabled={p1}>Save</button>
      </form>
      <form action={a2} className="col-card" aria-labelledby="pw">
        <h2 id="pw" className="lrn-session__title">Change password</h2>
        <div className="lrn-field mt-3"><label htmlFor="npw">New password</label><input id="npw" name="password" type="password" className="col-input" autoComplete="new-password" minLength={10} required /></div>
        <div className="lrn-field"><label htmlFor="npw2">Repeat</label><input id="npw2" name="password2" type="password" className="col-input" autoComplete="new-password" minLength={10} required /></div>
        {s2.error && <p className="lrn-error" role="alert">{s2.error}</p>}
        {s2.ok && <p className="lrn-notice" role="status">{s2.ok}</p>}
        <button className="col-btn col-btn--navy" disabled={p2}>Update password</button>
      </form>
      <form action={signOut} className="col-card">
        <h2 className="lrn-session__title">Session</h2>
        <p className="lrn-session__sub">Is device se sign out kijiye.</p>
        <button className="col-btn col-btn--ghost mt-3">Sign out</button>
      </form>
    </div>
  );
}
