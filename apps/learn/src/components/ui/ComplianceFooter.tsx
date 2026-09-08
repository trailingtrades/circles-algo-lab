import { CREDENTIAL_LINE, TIER1, TIER2, COMPANY } from "@/lib/compliance/strings";

/** Never collapsible, never clamped. Tier is chosen by the screen; credential line is always present. */
export function ComplianceFooter({ tier = 1, grievance = false }: { tier?: 1 | 2; grievance?: boolean }) {
  return (
    <footer className="lrn-footer" role="contentinfo">
      <p className="lrn-footer__cred">{CREDENTIAL_LINE}</p>
      <p>{tier === 1 ? TIER1 : TIER2}</p>
      {grievance && <p style={{ marginTop: 8 }}>{COMPANY.legal} · {COMPANY.regType} · Registration granted {COMPANY.regGranted} · Principal Officer: {COMPANY.principalOfficer} · Compliance Officer: {COMPANY.complianceOfficer} · Grievances: contact the Compliance Officer; unresolved matters may be escalated to SEBI SCORES (scores.sebi.gov.in) or the ODR portal (smartodr.in).</p>}
    </footer>
  );
}
