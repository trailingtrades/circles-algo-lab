/** TS port of scripts/ci/check_compliance.py for runtime use (admin editor saves, compliance report screen). Pure, no imports beyond the canonical strings.
 *  SMART is trilingual, so Devanagari is allowed. Fields that must stay Roman script (English, Hinglish) pass `romanOnly`;
 *  scanJson() applies that per key the same way CI does: Devanagari only under "dv" / "*_dv". */
import { TIER1, TIER2, TIER3, CREDENTIAL_LINE } from "./strings";

// Promise / assured-return language. Allowed only inside a labelled scam example or a wrong quiz option (the banned-phrase check is skipped there).
const BANNED: [RegExp, string][] = [[/guarante/i, "guarantee"], [/assured?\s+(returns?|profits?|income)/i, "assured return / profit"], [/risk[- ]free/i, "risk-free"], [/zero[- ]risk/i, "zero risk"], [/fixed\s+returns?/i, "fixed return"], [/sure[- ]?shot/i, "sure-shot"], [/100\s*%\s*accura/i, "100% accurate"], [/pakka\s+(profit|munafa|return)/i, "pakka profit"], [/(profit|munafa|return)\s+pakka/i, "munafa pakka"], [/loss\s+nahi\s+hoga/i, "loss nahi hoga"], [/loss\s+hoga\s+hi\s+nahi/i, "loss hoga hi nahi"], [/no[- ]loss/i, "no-loss"], [/can'?t\s+lose/i, "can't lose"], [/never\s+wrong/i, "never wrong"], [/kabhi\s+galat\s+nahi/i, "kabhi galat nahi"], [/double\s+(your|apna)?\s*(money|paisa)/i, "double your money"], [/pakka\s+multibagger/i, "pakka multibagger"]];
// Same rules in हिंदी ("तय कमाई का वादा", a promise of fixed income, names the scam and is allowed). The optional nukta (\u093C) covers both spellings of मुनाफ़ा / फ़्री; input is NFC-normalised first.
const BANNED_DV: [RegExp, string][] = [[/गारंटी/, "गारंटी"], [/पक्का\s*(मुनाफ\u093C?ा|प्रॉफ\u093C?िट|रिटर्न|कमाई)/, "पक्का मुनाफ़ा / रिटर्न"], [/(मुनाफ\u093C?ा|प्रॉफ\u093C?िट|रिटर्न|कमाई)\s*पक्का/, "मुनाफ़ा पक्का"], [/(निश्चित|सुनिश्चित|तय|फ\u093C?िक्स्ड)\s*(मुनाफ\u093C?ा|रिटर्न|कमाई)(?!\s*(का|के|की)\s*वाद)/, "निश्चित रिटर्न"], [/जोखिम[\s-]*(मुक्त|रहित)/, "जोखिम-मुक्त"], [/(ज\u093C?ीरो|शून्य)\s*(रिस्क|जोखिम)/, "ज़ीरो रिस्क"], [/रिस्क[\s-]*फ\u093C?्री/, "रिस्क-फ़्री"], [/नो[\s-]*लॉस/, "नो-लॉस"], [/(नुकसान|लॉस)\s*(कभी\s*)?नहीं\s*होगा/, "नुकसान नहीं होगा"], [/पैसा\s*डबल/, "पैसा डबल"]]; // dv: हिंदी promise phrases (BANNED)
// Reference rates are never printed (they go stale and read as advice): repo rate, STT %, RBI reference rate.
const RATES: [RegExp, string][] = [[/(repo|रेपो)\s*(rate|रेट)[^.\n]{0,20}?\d+(\.\d+)?\s*%/i, "repo rate printed"], [/\bSTT\b[^.\n]{0,20}?\d+(\.\d+)?\s*%/i, "STT rate printed"], [/RBI\s+reference\s+rate[^.\n]{0,25}?\d/i, "RBI reference rate printed"]]; // dv: रेपो रेट
const DEVANAGARI = /[\u0900-\u097F]/;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/u;
const OLD_STAT = [/\b93\s*%/g, /1\.8\s*lakh\s*cr/gi];

export type ScanOpts = { allowScamExample?: boolean; romanOnly?: boolean };

const stripCanonical = (text: string) => { let s = text.normalize("NFC"); for (const w of [TIER1, TIER2, TIER3, CREDENTIAL_LINE]) s = s.split(w).join(" "); return s; };

function phraseIssues(s: string, opts: ScanOpts): string[] {
  const out: string[] = [];
  if (!opts.allowScamExample) for (const [re, label] of [...BANNED, ...BANNED_DV]) if (re.test(s)) out.push(`banned phrase: ${label}`);
  for (const [re, label] of RATES) if (re.test(s)) out.push(label);
  if (opts.romanOnly && DEVANAGARI.test(s)) out.push("Devanagari in an English / Hinglish field (Hindi goes in the हिंदी field)");
  if (EMOJI.test(s)) out.push("emoji in product copy");
  return out;
}
/** Stat stamping. Each match is judged by the text around IT (a "time series" elsewhere in a lesson must not excuse a stale stat). */
function statIssues(s: string, window: number): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/(?<![\d.])87\.7\s*%/g)) if (!/FY26/.test(s.slice(Math.max(0, m.index - window), m.index + m[0].length + window))) out.push("87.7% without the FY26 stamp");
  for (const re of OLD_STAT) for (const m of s.matchAll(re)) if (!/historical|series|PoP/i.test(s.slice(Math.max(0, m.index - 120), m.index + m[0].length + 120))) out.push("old F&O stat without historical-series label");
  return out;
}

export function scanText(text: string, opts: ScanOpts = {}): string[] {
  const s = stripCanonical(text);
  return [...new Set([...phraseIssues(s, opts), ...statIssues(s, 200)])];
}

/** Scan a JSON value (session content, prompts) the way CI scans content/*.json: every string is checked; wrong options,
 *  labelled scam examples and the tipster's story lines skip the banned-phrase check; Devanagari only under dv keys. */
export function scanJson(value: unknown): string[] {
  const out = new Set<string>();
  const walk = (o: unknown, key: string, scam: boolean) => {
    if (Array.isArray(o)) { for (const v of o) walk(v, key, scam); return; }
    if (o && typeof o === "object") {
      const r = o as Record<string, unknown>;
      const ctx = scam || r.distractor === true || r.correct === false || r.scam_example === true || r.who === "tipster";
      for (const [k, v] of Object.entries(r)) walk(v, k, ctx);
      return;
    }
    if (typeof o === "string") for (const i of phraseIssues(stripCanonical(o), { allowScamExample: scam, romanOnly: !(key === "dv" || key.endsWith("_dv")) })) out.add(key ? `${i} (in "${key}")` : i);
  };
  walk(value, "", false);
  // JSON keeps the FY26 stamp a few hundred characters from the figure once three languages sit in between — wider window, as in CI.
  for (const i of statIssues(stripCanonical(JSON.stringify(value) ?? ""), 900)) out.add(i);
  return [...out];
}
