import { Header } from "@/components/shell/Header";
import { AcademyStrip } from "@/components/shell/AcademyStrip";
import { BottomNav } from "@/components/shell/Nav";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { WhatsAppFab } from "@/components/ui/WhatsAppFab";
import { AlertCircle } from "@/components/ui/Icon";
import { createClient, getViewer, type Viewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getLang } from "@/lib/i18n/server";
import { t3, tr } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import { signOut } from "@/app/learn/actions";

const S = {
  suspended: t3("This account is suspended. Please contact your mentor.", "Ye account suspended hai. Apne mentor se baat kijiye.", "यह अकाउंट सस्पेंड है। अपने मेंटर से बात कीजिए।"),
  invited: t3("Your account is not active yet. Open the invite link your mentor sent to set your password, or ask your mentor to activate it.", "Aapka account abhi active nahi hai. Mentor ka bheja invite link kholkar password set kijiye, ya mentor se account active karwaiye.", "आपका अकाउंट अभी एक्टिव नहीं है। मेंटर का भेजा इनवाइट लिंक खोलकर पासवर्ड सेट कीजिए, या मेंटर से अकाउंट एक्टिव करवाइए।"),
  missing: t3("We could not load your account. Please sign in again.", "Aapka account load nahi ho paya. Dobara sign in kijiye.", "आपका अकाउंट लोड नहीं हो पाया। फिर से साइन इन कीजिए।"),
  back: t3("Back to sign in", "Sign in par wapas", "साइन इन पर वापस"),
};

/** Which later stages this learner may open, for the Academy strip. Staff see every stage; a failed
 *  read leaves it unknown (plain links, nginx's gate still decides) rather than falsely locking. */
async function stageAccess(v: Viewer): Promise<{ winners: boolean; winners_plus: boolean; one: boolean } | undefined> {
  if (v.role !== "student") return { winners: true, winners_plus: true, one: true };
  const sb = await createClient();
  const { data, error } = await sb.from("stage_access").select("stage,starts_at,expires_at").eq("user_id", v.id);
  if (error || !data) return undefined;
  const now = Date.now();
  const open = (s: string) => data.some((r) => r.stage === s && (!r.starts_at || new Date(r.starts_at).getTime() <= now) && (!r.expires_at || new Date(r.expires_at).getTime() >= now));
  return { winners: open("winners"), winners_plus: open("winners_plus"), one: open("one") };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const live = supabaseConfigured();
  const v = live ? await getViewer() : null;
  const lang = await getLang(v?.lang);
  const skip = <a href="#main" className="lrn-skip">{tr(T.skip, lang)}</a>;

  // Every app page needs an ACTIVE viewer. proxy.ts has already bounced visitors with no session, so
  // reaching here without an active profile means suspended, invited-but-not-accepted, or a session
  // whose profile is gone. A redirect to /learn would loop (the proxy sends signed-in users on /learn
  // back to /learn/home), so show the reason with a sign-out button that clears the session first.
  if (live && v?.status !== "active") {
    const why = !v ? S.missing : v.status === "suspended" ? S.suspended : S.invited;
    return (
      <div className="lrn-shell">
        {skip}
        <AcademyStrip />
        <main className="lrn-main" id="main">
          <div className="lrn-max">
            <div className="col-card col-empty" role="alert" style={{ maxWidth: 520, margin: "48px auto" }}>
              <AlertCircle size={32} strokeWidth={1.5} aria-hidden />
              <p className="col-empty__title">{tr(why, lang)}</p>
              <form action={signOut}><button type="submit" className="col-btn col-btn--primary">{tr(S.back, lang)}</button></form>
            </div>
          </div>
        </main>
        <ComplianceFooter tier={1} />
      </div>
    );
  }

  const name = v?.full_name?.split(" ")[0] || (live ? "" : "Priya"); // demo shows the same demo learner as home
  const unlocked = v ? await stageAccess(v) : undefined;
  return (
    <div className="lrn-shell">
      {skip}
      <AcademyStrip unlocked={unlocked} />
      <Header studentName={name} role={v?.role} />
      <OfflineBanner />
      <div className="lrn-body">
        <main className="lrn-main" id="main"><div className="lrn-max">{children}</div></main>
      </div>
      <ComplianceFooter tier={1} />
      <WhatsAppFab />
      <BottomNav role={v?.role} />
    </div>
  );
}
