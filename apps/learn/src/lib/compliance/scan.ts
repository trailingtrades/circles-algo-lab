/** TS port of scripts/ci/check_compliance.py rules for runtime use (admin editor saves, compliance report screen). Pure. */
import { TIER1, TIER2, TIER3, CREDENTIAL_LINE } from "./strings";
const BANNED: [RegExp, string][] = [[/guarante/i, "guarantee"], [/assured?\s+return/i, "assured return"], [/risk[- ]free/i, "risk-free"], [/sure[- ]?shot/i, "sure-shot"], [/100\s*%\s*accura/i, "100% accurate"], [/pakka\s+(profit|munafa)/i, "pakka profit"], [/munafa\s+pakka/i, "munafa pakka"], [/loss\s+nahi\s+hoga/i, "loss nahi hoga"], [/no[- ]loss/i, "no-loss"], [/can'?t\s+lose/i, "can't lose"], [/never\s+wrong/i, "never wrong"], [/kabhi\s+galat\s+nahi/i, "kabhi galat nahi"], [/double\s+(your|apna)?\s*(money|paisa)/i, "double your money"], [/pakka\s+multibagger/i, "pakka multibagger"]];
const DEVANAGARI = /[\u0900-\u097F]/; const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const OLD_STAT = [/\b93\s*%/, /1\.8\s*lakh\s*cr/i];
export function scanText(text: string, opts: { allowScamExample?: boolean } = {}): string[] {
  let s = text; for (const w of [TIER1, TIER2, TIER3, CREDENTIAL_LINE]) s = s.split(w).join(" ");
  const out: string[] = [];
  if (!opts.allowScamExample) for (const [re, label] of BANNED) if (re.test(s)) out.push(`banned phrase: ${label}`);
  if (DEVANAGARI.test(s)) out.push("Devanagari script (Roman-script Hinglish only)");
  if (EMOJI.test(s.replace(/\u26A0\uFE0F/g, ""))) out.push("emoji in product copy");
  for (const m of s.matchAll(/87\.7/g)) if (!/FY26/.test(s.slice(Math.max(0, m.index! - 200), m.index! + 200))) out.push("87.7 without the FY26 stamp");
  for (const re of OLD_STAT) if (re.test(s) && !/historical|series|PoP/i.test(s)) out.push("old F&O stat without historical-series label");
  return out;
}
