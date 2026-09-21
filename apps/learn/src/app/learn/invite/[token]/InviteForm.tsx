"use client";
import { useState } from "react";
import { useAuthAction } from "@/lib/auth/useAuthAction";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3 } from "@/lib/i18n/lang";
import { acceptInvite } from "../actions";
import { ShieldCheck, Target, Activity, ArrowRight, AlertCircle } from "@/components/ui/Icon";

/* First login: three short cards on how the course works, then password + code of conduct (§7). */
const CARDS = [
  { icon: Target, title: t3("We score your process", "Yahan process ka score hota hai", "यहाँ प्रोसेस का स्कोर होता है"), body: t3("Your score comes from quizzes, your journal and the weekly review. The mock portfolio's return never counts, because a return can be luck and a process cannot.", "Score quiz, journal aur weekly review se banta hai. Mock portfolio ka return kabhi count nahi hota, kyunki return kismat se bhi aa sakta hai, process nahi.", "स्कोर क्विज़, जर्नल और साप्ताहिक रिव्यू से बनता है। मॉक पोर्टफ़ोलियो का रिटर्न कभी नहीं गिना जाता, क्योंकि रिटर्न किस्मत से भी आ सकता है, प्रोसेस नहीं।") },
  { icon: Activity, title: t3("AI is the analyst, you decide", "AI analyst hai, faisla aapka", "AI एनालिस्ट है, फ़ैसला आपका"), body: t3("The AI Lab gives you prompts: the AI does the research, you make the call. There is no live market data and no order placement here; everything uses virtual money.", "AI Lab mein prompts milenge: research AI karega, faisla aap lenge. Yahan koi live market data ya order placement nahi hai; sab virtual paise se hota hai.", "AI Lab में प्रॉम्प्ट मिलेंगे: रिसर्च AI करेगा, फ़ैसला आप लेंगे। यहाँ कोई लाइव मार्केट डेटा या ऑर्डर प्लेसमेंट नहीं है; सब वर्चुअल पैसे से होता है।") },
  { icon: ShieldCheck, title: t3("F&O: understand it before anything else", "F&O: pehle samjhiye, khelna nahi", "F&O: पहले समझिए, खेलना नहीं"), body: t3("SEBI FY26 study (Aug 2026): 87.7% of individual F&O traders made a net loss. This course teaches you how F&O works, not to jump in.", "SEBI FY26 study (Aug 2026): 87.7% individual F&O traders net loss mein the. Is course mein F&O samajhna hai, usmein kood padna nahi.", "SEBI FY26 स्टडी (अगस्त 2026): 87.7% इंडिविजुअल F&O ट्रेडर्स नेट लॉस में थे। इस कोर्स में F&O समझना है, उसमें कूद पड़ना नहीं।") },
];

const S = {
  welcome: t3("Welcome", "Swagat hai", "स्वागत है"),
  next: t3("Next", "Aage", "आगे"),
  toPassword: t3("Set my password", "Mera password set karein", "मेरा पासवर्ड सेट करें"),
  cohort: t3("Batch", "Batch", "बैच"),
  title: t3("Set your password", "Apna password set kijiye", "अपना पासवर्ड सेट कीजिए"),
  account: t3("Account", "Account", "अकाउंट"),
  private: t3("Only you know this password; even an admin cannot see it.", "Ye password sirf aap jaante hain; admin ko bhi nahi dikhta.", "यह पासवर्ड सिर्फ़ आप जानते हैं; एडमिन को भी नहीं दिखता।"),
  pw: t3("Password (at least 10 characters)", "Password (kam se kam 10 characters)", "पासवर्ड (कम से कम 10 कैरेक्टर)"),
  pw2: t3("Repeat password", "Password dobara", "पासवर्ड दोबारा"),
  conduct: t3("I accept the learner code of conduct: this is an education platform that uses virtual money only; I will not treat any content as investment advice, and I will not share my login.", "Main learner code of conduct accept karta/karti hoon: ye sirf virtual paise wala education platform hai; main kisi bhi content ko investment advice nahi maanunga/maanungi, aur apna login kisi se share nahi karunga/karungi.", "मैं लर्नर कोड ऑफ़ कंडक्ट स्वीकार करता/करती हूँ: यह सिर्फ़ वर्चुअल पैसे वाला एजुकेशन प्लेटफ़ॉर्म है; मैं किसी भी कंटेंट को निवेश सलाह नहीं मानूँगा/मानूँगी, और अपना लॉगिन किसी से शेयर नहीं करूँगा/करूँगी।"),
  create: t3("Create my account", "Mera account banaiye", "मेरा अकाउंट बनाइए"),
  creating: t3("Creating your account…", "Account ban raha hai…", "अकाउंट बन रहा है…"),
};

export function InviteForm({ token, fullName, cohortName, email }: { token: string; fullName: string; cohortName: string; email: string }) {
  const { tx } = useLang();
  const [step, setStep] = useState(0);
  const [state, action, pending] = useAuthAction(acceptInvite, {});
  if (step < CARDS.length) {
    const C = CARDS[step];
    return (
      <div className="col-card lrn-onboard" aria-live="polite">
        <span className="col-eyebrow">{tx(S.welcome)}, {fullName} · {step + 1} / {CARDS.length}</span>
        <C.icon size={40} strokeWidth={1.5} aria-hidden style={{ color: "var(--col-brand)", margin: "16px 0 8px" }} />
        <h1 className="lrn-title" style={{ fontSize: 22 }}>{tx(C.title)}</h1>
        <p className="lrn-muted">{tx(C.body)}</p>
        <button type="button" className="col-btn col-btn--primary mt-3" onClick={() => setStep(step + 1)}>{tx(step + 1 === CARDS.length ? S.toPassword : S.next)} <ArrowRight size={16} aria-hidden /></button>
      </div>
    );
  }
  return (
    <form className="col-card" action={action}>
      <input type="hidden" name="token" value={token} />
      {cohortName && <span className="col-eyebrow">{tx(S.cohort)} · {cohortName}</span>}
      <h1 className="lrn-title mt-2" style={{ fontSize: 22 }}>{tx(S.title)}</h1>
      <p className="lrn-muted">{tx(S.account)}: <span className="lrn-num">{email}</span>. {tx(S.private)}</p>
      <div className="lrn-field"><label htmlFor="pw">{tx(S.pw)}</label><input id="pw" name="password" className="col-input" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></div>
      <div className="lrn-field"><label htmlFor="pw2">{tx(S.pw2)}</label><input id="pw2" name="password2" className="col-input" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></div>
      <label className="lrn-check"><input type="checkbox" name="conduct" required /><span>{tx(S.conduct)}</span></label>
      {state.error && <p className="lrn-error" role="alert"><AlertCircle size={16} aria-hidden /> {state.error}</p>}
      <button type="submit" className="col-btn col-btn--primary w-full justify-center mt-3" disabled={pending}>{tx(pending ? S.creating : S.create)}</button>
    </form>
  );
}
