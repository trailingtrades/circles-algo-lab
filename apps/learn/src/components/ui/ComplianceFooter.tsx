import { CREDENTIAL_LINE, TIER1, TIER2 } from "@/lib/compliance/strings";

/** Never collapsible, never clamped. Tier is chosen by the screen; credential line is always present. */
export function ComplianceFooter({ tier = 1 }: { tier?: 1 | 2 }) {
  return (
    <footer className="lrn-footer" role="contentinfo">
      <p className="lrn-footer__cred">{CREDENTIAL_LINE}</p>
      <p>{tier === 1 ? TIER1 : TIER2}</p>
    </footer>
  );
}
