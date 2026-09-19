#!/usr/bin/env python3
"""
5C Learn compliance gate (master prompt §15). Scans UI source, content JSON and
built HTML. Context-classes guarantee hits: the canonical disclaimer strings are
whitelisted; quiz options flagged "distractor": true are whitelisted, and so are story panels spoken by the
"tipster" (scam lessons quote the promise to teach it). Devanagari (हिंदी) is allowed only in the
Devanagari slots: JSON keys "dv" / "*_dv", and TS/TSX lines that carry a dv: value or a t3(...) call.
Usage: python3 scripts/ci/check_compliance.py <paths...>   Exit 1 on any failure.
"""
import re, sys, os, json, unicodedata
HERE = os.path.dirname(__file__)
TIER1 = open(os.path.join(HERE, "canonical/tier1.txt"), encoding="utf-8").read()
CRED = open(os.path.join(HERE, "canonical/credential.txt"), encoding="utf-8").read()
TIER2 = "⚠️ Investment in securities market is subject to market risks. SEBI registration and NISM certification do not guarantee returns. — 5 Circles Pvt Ltd · SEBI RA Reg. No. INH000020004"
TIER3 = "— 5 Circles · SEBI RA INH000020004 · Investments subject to market risk"
WHITELIST = [TIER1, TIER2, TIER3, CRED]

# Mirrors src/lib/compliance/scan.ts (BANNED + BANNED_DV + RATES): keep the two lists in step.
BANNED = [r"guarante", r"assured?\s+(returns?|profits?|income)", r"risk[- ]free", r"sure[- ]?shot", r"100\s*%\s*accura", r"pakka\s+(profit|munafa|return)", r"(profit|munafa|return)\s+pakka", r"loss\s+nahi\s+hoga", r"no[- ]loss", r"can'?t\s+lose", r"never\s+wrong", r"kabhi\s+galat\s+nahi", r"loss\s+hoga\s+hi\s+nahi", r"double\s+(your|apna)?\s*(money|paisa)", r"pakka\s+multibagger",
          r"zero[- ]risk", r"fixed\s+returns?",
          # हिंदी (text is NFC-normalised first, so the nukta is always a separate ़ and is optional here)
          r"गारंटी",
          r"पक्का\s*(मुनाफ़?ा|प्रॉफ़?िट|रिटर्न|कमाई)",
          r"(मुनाफ़?ा|प्रॉफ़?िट|रिटर्न|कमाई)\s*पक्का",
          r"(निश्चित|सुनिश्चित|तय|फ़?िक्स्ड)\s*(मुनाफ़?ा|रिटर्न|कमाई)(?!\s*(का|के|की)\s*वाद)",
          r"जोखिम[\s-]*(मुक्त|रहित)",
          r"(ज़?ीरो|शून्य)\s*(रिस्क|जोखिम)",
          r"रिस्क[\s-]*फ़?्री",
          r"नो[\s-]*लॉस",
          r"(नुकसान|लॉस)\s*(कभी\s*)?नहीं\s*होगा",
          r"पैसा\s*डबल"]
# Reference rates are never printed (they go stale and read as advice). Checked even inside scam examples.
RATES = [r"(repo|रेपो)\s*(rate|रेट)[^.\n]{0,20}?\d+(\.\d+)?\s*%", r"\bSTT\b[^.\n]{0,20}?\d+(\.\d+)?\s*%", r"RBI\s+reference\s+rate[^.\n]{0,25}?\d"]
DEVANAGARI = re.compile(r"[ऀ-ॿ]")
EMOJI = re.compile(r"[\U0001F000-\U0001FAFF☀-➿⬀-⯿️]")
OLD_STAT = [r"\b93\s*%", r"1\.8\s*lakh\s*cr"]
SRC_EXT = (".ts", ".tsx", ".json", ".html", ".md")

def strip_whitelisted(s):
  for w in WHITELIST: s = s.replace(w, " ")
  s = s.replace(TIER1.replace("·", "&middot;"), " ")
  return s

def check_file(path):
  fails = []
  raw = unicodedata.normalize("NFC", open(path, encoding="utf-8", errors="replace").read())
  s = strip_whitelisted(raw)
  # 1. banned phrases (context-classed: distractors in JSON skipped)
  if path.endswith(".json"):
    try:
      def walk(o, key=""):
        if isinstance(o, dict):
          # quiz distractors (legacy flag or v3 "correct": false), labelled scam examples and the tipster's
          # story lines are legitimate context for scam wording
          if o.get("distractor") is True or o.get("correct") is False or o.get("scam_example") is True or o.get("who") == "tipster": return
          for k, v in o.items(): walk(v, k)
        elif isinstance(o, list):
          for v in o: walk(v, key)
        elif isinstance(o, str):
          for b in BANNED:
            if re.search(b, o, re.I): fails.append(f"banned /{b}/: {o[:80]}")
          for b in RATES:
            if re.search(b, o, re.I): fails.append(f"reference rate printed /{b}/: {o[:80]}")
          if DEVANAGARI.search(o) and not (key == "dv" or key.endswith("_dv")):
            fails.append(f"Devanagari outside a dv slot (key '{key}'): {o[:60]!r}")
      walk(json.loads(raw))
    except json.JSONDecodeError as e: fails.append(f"invalid JSON: {e}")
  else:
    for i, line in enumerate(s.split("\n"), 1):
      if "check_compliance" in path or "canonical" in path: break
      if re.search(r"BANNED|banned|distractor|prohibited|RATES", line): continue
      for b in BANNED:
        if re.search(b, line, re.I): fails.append(f"line {i} banned /{b}/: {line.strip()[:80]}")
      for b in RATES:
        if re.search(b, line, re.I): fails.append(f"line {i} reference rate printed: {line.strip()[:80]}")
  # 2. Devanagari: JSON is checked per key above; in source files only on lines that fill a dv slot
  if not path.endswith(".json"):
    for i, line in enumerate(raw.split("\n"), 1):
      if DEVANAGARI.search(line) and not re.search(r"\bdv\s*[:=]|[\"']dv[\"']|\bt3\(|_dv\b|हिंदी|हिं\b|html_lang|LANGS", line):
        fails.append(f"line {i}: Devanagari outside a dv slot: {line.strip()[:80]}"); break
  # 3. emoji outside whitelisted strings
  if not path.endswith(("check_compliance.py",)):
    for m in EMOJI.finditer(s): fails.append(f"emoji U+{ord(m.group()):04X} outside compliance strings: {s[max(0,m.start()-20):m.end()+10]!r}"); break
  # 4. stat stamping
  # The stat is always written as a percentage; a bare 87.7 inside a price series (287.7, 87.72) is not the stat.
  for m in re.finditer(r"(?<![\d.])87\.7\s*%", raw):
    # JSON question objects hold the stamp in the stem or explanation, a few hundred characters away once
    # three languages and shuffled options sit in between — so JSON gets a wider window.
    w = 900 if path.endswith(".json") else 200
    if "FY26" not in raw[max(0, m.start()-w):m.end()+w]: fails.append(f"87.7% at {m.start()} not within {w} chars of FY26")
  for o in OLD_STAT:
    for m in re.finditer(o, raw):
      if not re.search(r"historical|series|PoP", raw[max(0,m.start()-120):m.end()+120], re.I): fails.append(f"old F&O stat /{o}/ at {m.start()} without historical-series label")
  # 5. cyan fill + white text (CSS/TSX heuristics)
  for m in re.finditer(r"background(?:-color)?\s*:\s*(?:var\(--col-brand\)|#00aeef)[^}]*color\s*:\s*(?:#fff(?:fff)?|white)", raw, re.I):
    fails.append(f"cyan background with white text at {m.start()}")
  # 6. built HTML must carry the number + byte-identical Tier-1
  if path.endswith(".html") and "/.next/" in path and "/app/" in path and 'http-equiv="refresh"' not in raw and not path.endswith("_global-error.html"):  # _global-error.html is Next's internal pre-hydration shell; the custom src/app/global-error.tsx carries the footer at runtime
    if "INH000020004" not in raw: fails.append("rendered route missing INH000020004")
    if TIER1 not in raw and TIER1.replace("·", "&middot;") not in raw: fails.append("rendered route missing byte-identical Tier-1")
  # 6b. certificate template must carry the byte-identical Tier-1 and the credential line, and the not-a-SEBI-certification line
  if path.endswith("certificates/template.html"):
    if TIER1 not in raw: fails.append("certificate template: Tier-1 not byte-identical")
    if CRED not in raw: fails.append("certificate template: credential line missing")
    if "not a SEBI or NISM certification" not in raw: fails.append("certificate template: missing 'not a SEBI or NISM certification' line")
  # 7. Tier-1 drift in source strings
  if path.endswith("compliance/strings.ts"):
    m = re.search(r'export const TIER1 =\s*"([^"]+)"', raw)
    if not m or m.group(1) != TIER1: fails.append("TIER1 in strings.ts drifted from canonical/tier1.txt")
    m = re.search(r'export const CREDENTIAL_LINE =\s*"([^"]+)"', raw)
    if not m or m.group(1) != CRED: fails.append("CREDENTIAL_LINE drifted from canonical/credential.txt")
  return fails

def main(argv):
  files = []
  for a in argv:
    if os.path.isdir(a):
      for r, ds, fs in os.walk(a):
        ds[:] = [d for d in ds if d not in ("node_modules", "static", "cache", "types")]
        files += [os.path.join(r, f) for f in fs if f.endswith(SRC_EXT) and not f.endswith(".d.ts")]
    else: files.append(a)
  n = 0
  for f in files:
    for msg in check_file(f):
      n += 1; print(f"FAIL {f}: {msg}")
  print(f"check_compliance: {len(files)} files scanned, {n} failures")
  return 1 if n else 0

if __name__ == "__main__": sys.exit(main(sys.argv[1:]))
