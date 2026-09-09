#!/usr/bin/env python3
"""
5C Learn compliance gate (master prompt §15). Scans UI source, content JSON and
built HTML. Context-classes guarantee hits: the canonical disclaimer strings are
whitelisted; quiz options flagged "distractor": true are whitelisted.
Usage: python3 scripts/ci/check_compliance.py <paths...>   Exit 1 on any failure.
"""
import re, sys, os, json
HERE = os.path.dirname(__file__)
TIER1 = open(os.path.join(HERE, "canonical/tier1.txt"), encoding="utf-8").read()
CRED = open(os.path.join(HERE, "canonical/credential.txt"), encoding="utf-8").read()
TIER2 = "⚠️ Investment in securities market is subject to market risks. SEBI registration and NISM certification do not guarantee returns. — 5 Circles Pvt Ltd · SEBI RA Reg. No. INH000020004"
TIER3 = "— 5 Circles · SEBI RA INH000020004 · Investments subject to market risk"
WHITELIST = [TIER1, TIER2, TIER3, CRED]

BANNED = [r"guarante", r"assured?\s+return", r"risk[- ]free", r"sure[- ]?shot", r"100\s*%\s*accura", r"pakka\s+(profit|munafa)", r"munafa\s+pakka", r"loss\s+nahi\s+hoga", r"no[- ]loss", r"can'?t\s+lose", r"never\s+wrong", r"kabhi\s+galat\s+nahi", r"loss\s+hoga\s+hi\s+nahi", r"double\s+(your|apna)?\s*(money|paisa)", r"pakka\s+multibagger"]
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
  raw = open(path, encoding="utf-8", errors="replace").read()
  s = strip_whitelisted(raw)
  # 1. banned phrases (context-classed: distractors in JSON skipped)
  if path.endswith(".json"):
    try:
      def walk(o):
        if isinstance(o, dict):
          if o.get("distractor") is True or o.get("scam_example") is True: return  # quiz distractors and labelled scam examples are legitimate context
          for v in o.values(): walk(v)
        elif isinstance(o, list):
          for v in o: walk(v)
        elif isinstance(o, str):
          for b in BANNED:
            if re.search(b, o, re.I): fails.append(f"banned /{b}/: {o[:80]}")
      walk(json.loads(raw))
    except json.JSONDecodeError as e: fails.append(f"invalid JSON: {e}")
  else:
    for i, line in enumerate(s.split("\n"), 1):
      if "check_compliance" in path or "canonical" in path: break
      for b in BANNED:
        if re.search(b, line, re.I) and not re.search(r"BANNED|banned|distractor|prohibited", line): fails.append(f"line {i} banned /{b}/: {line.strip()[:80]}")
  # 2. Devanagari
  for m in DEVANAGARI.finditer(raw): fails.append(f"Devanagari U+{ord(m.group()):04X} at offset {m.start()}: {raw[max(0,m.start()-20):m.end()+10]!r}"); break
  # 3. emoji outside whitelisted strings
  if not path.endswith(("check_compliance.py",)):
    for m in EMOJI.finditer(s): fails.append(f"emoji U+{ord(m.group()):04X} outside compliance strings: {s[max(0,m.start()-20):m.end()+10]!r}"); break
  # 4. stat stamping
  # The stat is always written as a percentage; a bare 87.7 inside a price series (287.7, 87.72) is not the stat.
  for m in re.finditer(r"(?<![\d.])87\.7\s*%", raw):
    if "FY26" not in raw[max(0, m.start()-200):m.end()+200]: fails.append(f"87.7% at {m.start()} not within 200 chars of FY26")
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
