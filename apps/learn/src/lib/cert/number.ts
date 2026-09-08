/** Certificate number: 5C-<LEVEL>-<YYYY>-<6-char base32> (§11). Pure; safe on client and server. */
const B32 = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // Crockford-style, no I/L/O/U/0/1 lookalikes
export const LEVEL_CODE: Record<string, string> = { foundation: "FOUND", intermediate: "INTER", advanced: "ADVAN" };
export function certNo(levelSlug: string, year: number, random: Uint8Array): string {
  const code = LEVEL_CODE[levelSlug] ?? levelSlug.toUpperCase().slice(0, 5);
  let s = ""; for (let i = 0; i < 6; i++) s += B32[random[i] % B32.length];
  return `5C-${code}-${year}-${s}`;
}
export const CERT_NO_RE = /^5C-(FOUND|INTER|ADVAN)-(20\d{2})-([ABCDEFGHJKMNPQRSTVWXYZ23456789]{6})$/;
export const isCertNo = (s: string) => CERT_NO_RE.test(s.trim().toUpperCase());
