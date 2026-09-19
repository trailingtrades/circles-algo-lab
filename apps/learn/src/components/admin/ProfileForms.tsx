"use client";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { updateProfile, changePassword } from "@/app/learn/(app)/profile/actions";
import { signOut, signOutEverywhere } from "@/app/learn/actions";
import { useLang } from "@/lib/i18n/LangProvider";
import { LANGS, t3, type Lang } from "@/lib/i18n/lang";

const S = {
  details: t3("Your details", "Aapki details", "आपकी जानकारी"),
  email: t3("Email", "Email", "ईमेल"),
  fullName: t3("Full name", "Poora naam", "पूरा नाम"),
  nameKept: t3("Certificates already issued keep the name they were issued with.", "Jo certificate issue ho chuke hain, un par wahi naam rahega jo issue ke waqt tha.", "जो सर्टिफ़िकेट जारी हो चुके हैं, उन पर वही नाम रहेगा जो जारी होते समय था।"),
  phone: t3("Phone", "Phone", "फ़ोन"),
  alias: t3("Leaderboard name (optional)", "Leaderboard par naam (optional)", "लीडरबोर्ड पर नाम (वैकल्पिक)"),
  aliasHint: t3("Default: first name + last initial", "Default: pehla naam + surname ka pehla akshar", "डिफ़ॉल्ट: पहला नाम + सरनेम का पहला अक्षर"),
  lang: t3("Course language", "Course ki bhasha", "कोर्स की भाषा"),
  langHint: t3("Lessons, quizzes and buttons switch to this language on every device you sign in on.", "Lessons, quiz aur buttons isi bhasha mein dikhenge, har device par jahan aap sign in karein.", "पाठ, क्विज़ और बटन इसी भाषा में दिखेंगे, हर उस डिवाइस पर जहाँ आप साइन इन करें।"),
  save: t3("Save", "Save kijiye", "सेव करें"),
  password: t3("Change password", "Password badliye", "पासवर्ड बदलें"),
  newPw: t3("New password (at least 10 characters)", "Naya password (kam se kam 10 characters)", "नया पासवर्ड (कम से कम 10 अक्षर)"),
  repeatPw: t3("Repeat the new password", "Naya password dobara likhiye", "नया पासवर्ड दोबारा लिखिए"),
  updatePw: t3("Update password", "Password update kijiye", "पासवर्ड अपडेट करें"),
  device: t3("This device", "Ye device", "यह डिवाइस"),
  deviceBody: t3("Sign out of the course on this device.", "Is device par course se sign out kijiye.", "इस डिवाइस पर कोर्स से साइन आउट करें।"),
  signOut: t3("Sign out", "Sign out", "साइन आउट"),
  allBody: t3("Lost a phone, or signed in on a shared computer? This signs you out on every device, this one included.", "Phone kho gaya, ya kisi shared computer par sign in kiya tha? Isse har device se sign out ho jayega, is device se bhi.", "फ़ोन खो गया, या किसी शेयर्ड कंप्यूटर पर साइन इन किया था? इससे हर डिवाइस से साइन आउट हो जाएगा, इस डिवाइस से भी।"),
  signOutAll: t3("Sign out on all devices", "Saare devices se sign out", "सभी डिवाइस से साइन आउट"),
};

export function ProfileForms({ email, fullName, phone, alias, lang, hasCert = false }: { email: string; fullName: string; phone: string; alias: string; lang: Lang | string; hasCert?: boolean }) {
  const { tx, lang: current, setLang } = useLang();
  const [s1, a1, p1] = useActionState(updateProfile, {});
  const [s2, a2, p2] = useActionState(changePassword, {});
  const [, startSave] = useTransition();
  // Saved: switch the whole app (localStorage + cookie + refresh) the same way the header toggle does.
  // Only once per save — a later header toggle must not be pulled back to the language saved here.
  const handled = useRef(s1);
  useEffect(() => { if (handled.current === s1) return; handled.current = s1; if (s1.ok && s1.lang && s1.lang !== current) setLang(s1.lang); }, [s1, current, setLang]);
  return (
    <div className="lrn-grid mt-4">
      {/* Submitted through a transition, not the form action, so React does not reset the fields and a validation error keeps what was typed. */}
      <form action={a1} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startSave(() => a1(fd)); }} className="col-card" aria-labelledby="det">
        <h2 id="det" className="lrn-session__title">{tx(S.details)}</h2>
        <div className="lrn-field mt-3"><label htmlFor="pf-email">{tx(S.email)}</label><input id="pf-email" className="col-input lrn-num" value={email} readOnly disabled /></div>
        <div className="lrn-field"><label htmlFor="full_name">{tx(S.fullName)}</label><input id="full_name" name="full_name" className="col-input" defaultValue={fullName} maxLength={80} minLength={2} autoComplete="name" required aria-describedby={hasCert ? "full_name-hint" : undefined} />{hasCert && <span id="full_name-hint" className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{tx(S.nameKept)}</span>}</div>
        <div className="lrn-field"><label htmlFor="phone">{tx(S.phone)}</label><input id="phone" name="phone" type="tel" className="col-input" defaultValue={phone} inputMode="tel" autoComplete="tel" maxLength={20} /></div>
        <div className="lrn-field"><label htmlFor="display_alias">{tx(S.alias)}</label><input id="display_alias" name="display_alias" className="col-input" defaultValue={alias} maxLength={24} placeholder={tx(S.aliasHint)} /></div>
        <div className="lrn-field"><label htmlFor="lang">{tx(S.lang)}</label>
          <select key={lang} id="lang" name="lang" className="col-input" defaultValue={lang} aria-describedby="lang-hint">{LANGS.map((l) => <option key={l.k} value={l.k} lang={l.html}>{l.label}</option>)}</select>
          <span id="lang-hint" className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{tx(S.langHint)}</span></div>
        {s1.error && <p className="lrn-error" role="alert">{s1.error}</p>}
        {s1.ok && <p className="lrn-notice" role="status">{s1.ok}</p>}
        <button className="col-btn col-btn--primary" disabled={p1}>{tx(S.save)}</button>
      </form>
      <form action={a2} className="col-card" aria-labelledby="pw">
        <h2 id="pw" className="lrn-session__title">{tx(S.password)}</h2>
        <div className="lrn-field mt-3"><label htmlFor="npw">{tx(S.newPw)}</label><input id="npw" name="password" type="password" className="col-input" autoComplete="new-password" minLength={10} required /></div>
        <div className="lrn-field"><label htmlFor="npw2">{tx(S.repeatPw)}</label><input id="npw2" name="password2" type="password" className="col-input" autoComplete="new-password" minLength={10} required /></div>
        {s2.error && <p className="lrn-error" role="alert">{s2.error}</p>}
        {s2.ok && <p className="lrn-notice" role="status">{s2.ok}</p>}
        <button className="col-btn col-btn--navy" disabled={p2}>{tx(S.updatePw)}</button>
      </form>
      <form action={signOut} className="col-card" aria-labelledby="dev">
        <h2 id="dev" className="lrn-session__title">{tx(S.device)}</h2>
        <p className="lrn-session__sub mt-2">{tx(S.deviceBody)}</p>
        <button className="col-btn col-btn--ghost mt-3">{tx(S.signOut)}</button>
        <p className="lrn-session__sub mt-4">{tx(S.allBody)}</p>
        <button formAction={signOutEverywhere} className="col-btn col-btn--ghost col-btn--sm mt-2">{tx(S.signOutAll)}</button>
      </form>
    </div>
  );
}
