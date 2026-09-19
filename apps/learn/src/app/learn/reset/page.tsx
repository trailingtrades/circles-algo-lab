"use client";
import { useAuthAction } from "@/lib/auth/useAuthAction";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3 } from "@/lib/i18n/lang";
import { AlertCircle } from "@/components/ui/Icon";
import { requestReset } from "../actions";
import { AuthLinks } from "../AuthLinks";
import { LangSelect } from "../LangSelect";

const S = {
  title: t3("Reset your password", "Password reset kijiye", "पासवर्ड रीसेट कीजिए"),
  intro: t3("Enter the email you sign in with. If it has an Academy account, we will email you a reset link. The link works once, for 1 hour, and you can open it on any phone or computer.", "Jis email se sign in karte hain, woh daaliye. Agar us par Academy account hai, to reset link email par aayega. Link ek hi baar, 1 ghante tak chalta hai, aur kisi bhi phone ya computer par khul sakta hai.", "जिस ईमेल से साइन इन करते हैं, वह डालिए। अगर उस पर Academy अकाउंट है, तो रीसेट लिंक ईमेल पर आएगा। लिंक एक ही बार, 1 घंटे तक चलता है, और किसी भी फ़ोन या कंप्यूटर पर खुल सकता है।"),
  email: t3("Email", "Email", "ईमेल"),
  send: t3("Send reset link", "Reset link bhejiye", "रीसेट लिंक भेजिए"),
  sending: t3("Sending…", "Bhej rahe hain…", "भेज रहे हैं…"),
  sent: t3("If this email is registered, a reset link is on its way. Check your inbox and spam folder; it can take a few minutes.", "Agar ye email registered hai, to reset link bhej diya gaya hai. Inbox aur spam dono check kijiye; aane mein kuch minute lag sakte hain.", "अगर यह ईमेल रजिस्टर्ड है, तो रीसेट लिंक भेज दिया गया है। इनबॉक्स और स्पैम दोनों देखिए; आने में कुछ मिनट लग सकते हैं।"),
};

export default function ResetPage() {
  const { tx, lang } = useLang();
  const [state, action, pending] = useAuthAction(requestReset, {});
  return (
    <div className="lrn-shell">
      <main className="lrn-main flex flex-col items-center justify-center" style={{ paddingTop: 32 }}>
        <div className="lrn-login">
          <div className="flex justify-end mb-2"><LangSelect /></div>
          <h1 className="lrn-title">{tx(S.title)}</h1>
          <p className="lrn-muted">{tx(S.intro)}</p>
          <form className="col-card" action={action}>
            {state.ok ? <p className="lrn-notice" role="status" style={{ margin: 0 }}>{tx(S.sent)}</p> : (
              <>
                <div className="lrn-field"><label htmlFor="email">{tx(S.email)}</label><input id="email" name="email" className="col-input" type="email" autoComplete="email" inputMode="email" required /></div>
                {state.error && <p className="lrn-error" role="alert"><AlertCircle size={16} aria-hidden /> {state.error}</p>}
                <button type="submit" className="col-btn col-btn--primary w-full justify-center" disabled={pending}>{tx(pending ? S.sending : S.send)}</button>
              </>
            )}
          </form>
          <AuthLinks lang={lang} />
        </div>
      </main>
      <ComplianceFooter tier={1} />
    </div>
  );
}
