/**
 * Canonical 5 Circles compliance strings.
 * Source: fivecircles-brand-kit-2/references/compliance.md — pasted verbatim.
 * CI byte-compares these against scripts/ci/canonical/*.txt. Never edit here.
 */
export const SEBI_REG_NO = "INH000020004";

export const CREDENTIAL_LINE =
  "5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004";

/** Tier-1, plain-text variant (approved glyph-free form for product UI). */
export const TIER1 =
  "Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004";

/** Tier-2. The warning glyph is part of the approved wording — do not strip it. */
export const TIER2 =
  "⚠️ Investment in securities market is subject to market risks. SEBI registration and NISM certification do not guarantee returns. — 5 Circles Pvt Ltd · SEBI RA Reg. No. INH000020004";

/** Tier-3. */
export const TIER3 =
  "— 5 Circles · SEBI RA INH000020004 · Investments subject to market risk";

export const COMPANY = {
  legal: "5 Circles Private Limited",
  short: "5 Circles Pvt Ltd",
  tagline: "Changing Phase of Investment",
  regType: "Non-Individual Research Analyst",
  regGranted: "06 March 2025",
  principalOfficer: "Rahul Sarawgi",
  complianceOfficer: "Suchita Sarawgi",
  email: "info@5circles.co",
  phone: "+91 638 749 7277",
  site: "5circles.co",
} as const;
