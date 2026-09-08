#!/usr/bin/env python3
"""
INTERIM responsive linter for 5C Learn (Phase 1, decision Q2-B).
Re-implements the failure modes listed in responsive-dashboard-layout/SKILL.md
until Rahul restores the skill's own scripts/check_responsive.py.
Usage: python3 scripts/ci/check_responsive.py <file-or-dir> [...]
Exit 1 on CRITICAL/HIGH.
"""
import re, sys, os

RULES = [
  # (id, severity, regex, message, applies_to_ext)
  ("viewport-missing", "CRITICAL", None, "No <meta name=viewport ... width=device-width>", ".html"),
  ("zoom-blocked", "CRITICAL", r"user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?![.\d])", "Zoom blocked (WCAG 1.4.4)", ".html"),
  ("100vw", "HIGH", r"(?<![\w-])100vw", "100vw includes scrollbar width - use 100% / 100dvw", ".css"),
  ("100vh-mobile", "MEDIUM", r"(?<![\w-])100vh", "100vh sits under mobile browser chrome - use dvh", ".css"),
  ("autofit-unguarded", "HIGH", r"repeat\(\s*auto-(?:fit|fill)\s*,\s*minmax\(\s*\d+px", "auto-fit minmax(Npx) without min(100%, Npx) guard - horizontal scroll on phones", ".css"),
  ("fixed-width-px", "MEDIUM", r"(?<![\w-])width\s*:\s*(?:[5-9]\d{2}|\d{4,})px", "Fixed width >= 500px", ".css"),
  ("disclaimer-clamp", "CRITICAL", r"\.lrn-footer[^{]*\{[^}]*(line-clamp|text-overflow\s*:\s*ellipsis|max-height)", "Disclaimer container is clamped/ellipsised/max-heighted", ".css"),
  ("input-zoom", "HIGH", r"input[^{]*\{[^}]*font-size\s*:\s*(?:1[0-5]|[0-9])px", "Input font-size < 16px triggers iOS auto-zoom", ".css"),
  ("sebi-number-missing", "CRITICAL", None, "INH000020004 not present in rendered HTML", ".html"),
  ("disclaimer-missing", "HIGH", None, "Tier-1 disclaimer text not present in rendered HTML", ".html"),
]
TIER1 = open(os.path.join(os.path.dirname(__file__), "canonical", "tier1.txt"), encoding="utf-8").read()

def scan(path):
  ext = ".html" if path.endswith((".html", ".htm")) else ".css" if path.endswith(".css") else None
  if not ext: return []
  s = open(path, encoding="utf-8", errors="replace").read()
  out = []
  for rid, sev, rx, msg, applies in RULES:
    if applies != ext: continue
    if rid == "viewport-missing":
      if not re.search(r'<meta[^>]+name=["\']viewport["\'][^>]+width=device-width', s): out.append((sev, rid, msg))
    elif rid == "sebi-number-missing":
      if "INH000020004" not in s: out.append((sev, rid, msg))
    elif rid == "disclaimer-missing":
      if TIER1.replace("·", "") not in s.replace("&middot;", "").replace("·", "") and TIER1 not in s: out.append((sev, rid, msg))
    elif rx and re.search(rx, s, re.S | re.I):
      out.append((sev, rid, msg))
  return out

def main(argv):
  files = []
  for a in argv:
    if os.path.isdir(a):
      for r, _, fs in os.walk(a):
        if "node_modules" in r or "/.next/" in r + "/" and "/server/app/" not in r: continue
        files += [os.path.join(r, f) for f in fs if f.endswith((".html", ".css"))]
    else: files.append(a)
  worst = 0; total = 0
  for f in files:
    for sev, rid, msg in scan(f):
      total += 1
      print(f"[{sev}] {rid}: {msg}  ({f})")
      if sev in ("CRITICAL", "HIGH"): worst = 1
  print(f"check_responsive (interim): {len(files)} files, {total} findings, exit {worst}")
  return worst

if __name__ == "__main__": sys.exit(main(sys.argv[1:]))
