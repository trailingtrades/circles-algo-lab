import Link from "next/link";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { HelpCircle } from "@/components/ui/Icon";
import { getLang } from "@/lib/i18n/server";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { t3, tr } from "@/lib/i18n/lang";
import { AuthLinks } from "@/app/learn/AuthLinks";
import { WhatsAppFab } from "@/components/ui/WhatsAppFab";

const S = {
  title: t3("Page not found", "Page nahi mila", "पेज नहीं मिला"),
  body: t3("This page does not exist, or it has moved.", "Ye page yahan nahi hai, ya kahin aur chala gaya hai.", "यह पेज यहाँ नहीं है, या कहीं और चला गया है।"),
  home: t3("Go to my course", "Mere course par chaliye", "मेरे कोर्स पर चलिए"),
};

export default async function NotFound() {
  // Same pick as the root layout (cookie, then the signed-in profile), so this text matches the footer.
  const lang = await getLang(supabaseConfigured() ? (await getViewer())?.lang : null);
  return (
    <div className="lrn-shell">
      <main className="lrn-main flex items-center justify-center">
        <div className="lrn-login">
          <div className="col-card col-empty">
            <HelpCircle size={36} strokeWidth={1.5} aria-hidden />
            <h1 className="col-empty__title" style={{ margin: 0 }}>{tr(S.title, lang)}</h1>
            <p style={{ margin: 0 }}>{tr(S.body, lang)}</p>
            <Link href="/learn/home" className="col-btn col-btn--primary mt-3">{tr(S.home, lang)}</Link>
          </div>
          <AuthLinks lang={lang} signIn={false} />
        </div>
      </main>
      <ComplianceFooter tier={1} />
      <WhatsAppFab />
    </div>
  );
}
