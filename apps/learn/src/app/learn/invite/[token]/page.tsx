import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { getLang } from "@/lib/i18n/server";
import { t3, tr } from "@/lib/i18n/lang";
import { lookupInvite } from "../actions";
import { InviteForm } from "./InviteForm";
import { AuthLinks } from "../../AuthLinks";
import { LangSelect } from "../../LangSelect";
import { Lock } from "@/components/ui/Icon";
import { WhatsAppFab } from "@/components/ui/WhatsAppFab";

const S = {
  expired: t3("This invite link has expired", "Ye invite link expire ho gaya hai", "यह इनवाइट लिंक एक्सपायर हो गया है"),
  used: t3("This invite link has already been used", "Ye invite link pehle hi use ho chuka hai", "यह इनवाइट लिंक पहले ही इस्तेमाल हो चुका है"),
  unconfigured: t3("Sign-up is not available right now", "Sign-up abhi available nahi hai", "साइन-अप अभी उपलब्ध नहीं है"),
  invalid: t3("This invite link is not valid", "Ye invite link sahi nahi hai", "यह इनवाइट लिंक सही नहीं है"),
  body: t3("An invite link works once and for 7 days. If you already set your password, just sign in. Otherwise, ask your mentor for a new link.", "Invite link sirf ek baar aur 7 din tak chalta hai. Agar password pehle set kar chuke hain, to seedha sign in kijiye. Warna mentor se naya link maangiye.", "इनवाइट लिंक सिर्फ़ एक बार और 7 दिन तक चलता है। अगर पासवर्ड पहले सेट कर चुके हैं, तो सीधे साइन इन कीजिए। वरना मेंटर से नया लिंक माँगिए।"),
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [look, lang] = await Promise.all([lookupInvite(token), getLang()]);
  return (
    <div className="lrn-shell">
      <main className="lrn-main flex flex-col items-center" style={{ paddingTop: 32 }}>
        <div className="lrn-login" style={{ maxWidth: 560 }}>
          <div className="flex justify-end mb-2"><LangSelect /></div>
          {look.ok ? <InviteForm token={token} fullName={look.fullName} cohortName={look.cohortName} email={look.email} /> : (
            <div className="col-card col-empty">
              <Lock size={36} strokeWidth={1.5} aria-hidden />
              <h1 className="col-empty__title" style={{ margin: 0 }}>{tr(S[look.reason], lang)}</h1>
              <p style={{ margin: 0 }}>{tr(S.body, lang)}</p>
            </div>
          )}
          <AuthLinks lang={lang} />
        </div>
      </main>
      <ComplianceFooter tier={1} />
      <WhatsAppFab />
    </div>
  );
}
