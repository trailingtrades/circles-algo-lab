import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { lookupInvite } from "../actions";
import { InviteForm } from "./InviteForm";
import { Lock } from "@/components/ui/Icon";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const look = await lookupInvite(token);
  return (
    <div className="lrn-shell">
      <main className="lrn-main flex flex-col items-center" style={{ paddingTop: 32 }}>
        <div className="lrn-login" style={{ maxWidth: 560 }}>
          {look.ok ? <InviteForm token={token} fullName={look.fullName} cohortName={look.cohortName} email={look.email} /> : (
            <div className="col-card col-empty">
              <Lock size={36} strokeWidth={1.5} aria-hidden />
              <p className="col-empty__title">{look.reason === "expired" ? "Invite link expire ho gaya" : look.reason === "used" ? "Ye link pehle hi use ho chuka hai" : look.reason === "unconfigured" ? "Platform abhi configure nahi hua" : "Invite link valid nahi hai"}</p>
              <p style={{ margin: 0 }}>Apne mentor se naya invite link maangiye. Link 7 din tak aur sirf ek baar chalta hai.</p>
            </div>
          )}
        </div>
      </main>
      <ComplianceFooter tier={1} />
    </div>
  );
}
