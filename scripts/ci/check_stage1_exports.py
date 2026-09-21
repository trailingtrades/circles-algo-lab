#!/usr/bin/env python3
"""
Stage 1 class files vs the day files they were built from (NON-BLOCKING: always exits 0 unless --strict).

apps/learn/files/stage1/manifest.json (written by apps/learn/scripts/export-stage1.mjs, and by any other exporter
that adds its own section under "exports") lists every exported file with its sha256 and the sha256 of each
scripts/content_v3/smart/dayNN.json it was built from. This prints a WARNING (a GitHub annotation in CI) when:
  - a day file changed after the export (the PDF / deck is stale: re-export);
  - a listed file is missing, or its bytes no longer match the manifest (replaced by hand);
  - the export was made while content/*.json was behind the day files (content_in_sync false);
  - a .pdf / .pptx sits in the folder without a manifest entry (it cannot be checked).
Usage: python3 scripts/ci/check_stage1_exports.py [--strict]
"""
import hashlib, json, os, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
FOLDER = os.path.join(ROOT, "apps", "learn", "files", "stage1")
DAYS = os.path.join(ROOT, "scripts", "content_v3", "smart")
MANIFEST = os.path.join(FOLDER, "manifest.json")
GH = os.environ.get("GITHUB_ACTIONS") == "true"


def sha256(path):
  h = hashlib.sha256()
  with open(path, "rb") as f:
    for chunk in iter(lambda: f.read(1 << 20), b""): h.update(chunk)
  return h.hexdigest()


def text_sha256(path):
  """sha256 of a text file with CRLF read as LF, so a Windows checkout (core.autocrlf) and CI agree."""
  with open(path, "rb") as f:
    return hashlib.sha256(f.read().replace(b"\r\n", b"\n")).hexdigest()


def warn(msg):
  print(f"::warning title=Stage 1 exports::{msg}" if GH else f"WARNING: {msg}")


def sections(m):
  """{name: section} for the sectioned manifest; a flat manifest (files at the top) counts as one section."""
  if isinstance(m.get("exports"), dict): return {k: v for k, v in m["exports"].items() if isinstance(v, dict)}
  return {"exports": m} if isinstance(m.get("files"), list) else {}


def main(argv):
  strict = "--strict" in argv
  if not os.path.exists(MANIFEST):
    print("check_stage1_exports: no apps/learn/files/stage1/manifest.json yet (nothing exported): skipped")
    return 0
  try:
    m = json.load(open(MANIFEST, encoding="utf-8"))
  except (OSError, ValueError) as e:
    warn(f"manifest.json cannot be read: {e}")
    return 1 if strict else 0
  now = {}
  for f in sorted(os.listdir(DAYS)) if os.path.isdir(DAYS) else []:
    if f.startswith("day") and f.endswith(".json"): now[f] = text_sha256(os.path.join(DAYS, f))
  problems, listed, checked = 0, set(), 0
  for name, sec in sections(m).items():
    if sec.get("content_in_sync") is False:
      problems += 1
      warn(f"{name}: exported while content/*.json was behind the day files ({', '.join(sec.get('content_behind') or []) or 'see manifest'}); run gen_content.py, then re-export")
    for entry in sec.get("files") or []:
      fname = entry.get("name", "?"); listed.add(fname); checked += 1
      path = os.path.join(FOLDER, fname)
      if not os.path.exists(path):
        problems += 1; warn(f"{fname}: listed in manifest.json ({name}) but missing from apps/learn/files/stage1/"); continue
      if entry.get("sha256") and sha256(path) != entry["sha256"]:
        problems += 1; warn(f"{fname}: bytes differ from manifest.json ({name}); re-run the exporter instead of replacing files by hand")
      stale = [d for d, h in (entry.get("days") or {}).items() if now.get(d) != h]
      if stale:
        problems += 1
        warn(f"{fname} is stale: {', '.join(sorted(stale))} changed after the export. Re-export: python scripts/gen_content.py, then node apps/learn/scripts/export-stage1.mjs (handouts) / the deck builder (decks)")
  for f in sorted(os.listdir(FOLDER)):
    if f.lower().endswith((".pdf", ".pptx")) and f not in listed:
      problems += 1; warn(f"{f}: in apps/learn/files/stage1/ but not in manifest.json, so its freshness cannot be checked")
  print(f"check_stage1_exports: {checked} exported file(s) checked against {len(now)} day files, {problems} warning(s)" + ("" if problems else ": all current"))
  return 1 if (strict and problems) else 0


if __name__ == "__main__": sys.exit(main(sys.argv[1:]))
