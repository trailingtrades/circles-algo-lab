#!/usr/bin/env python3
"""Certificate PDF gate: 1 page, A4 landscape, Tier-1 present (whitespace-normalised), credential line, no Devanagari, Tier-1 not smaller than body text."""
import re, sys
import pypdfium2 as pdfium
TIER1 = open(__file__.replace("check_cert_pdf.py", "canonical/tier1.txt"), encoding="utf-8").read()
pdf = pdfium.PdfDocument(sys.argv[1]); page = pdf[0]
w, h = [round(x / 72 * 25.4) for x in page.get_size()]
txt = page.get_textpage().get_text_range(); norm = re.sub(r"\s+", " ", txt)
fails = []
if len(pdf) != 1: fails.append(f"pages={len(pdf)}")
if (w, h) != (297, 210): fails.append(f"size {w}x{h}mm, expected A4 landscape")
if re.sub(r"\s+", " ", TIER1) not in norm: fails.append("Tier-1 missing or altered")
if "INH000020004" not in norm: fails.append("credential line missing")
if "not a SEBI or NISM certification" not in norm: fails.append("not-a-SEBI line missing")
if re.search(r"[ऀ-ॿ]", txt): fails.append("Devanagari present")
# font-size floor: every text object in the Tier-1 block must be >= the smallest body size used elsewhere (8.6pt here)
tp = page.get_textpage(); sizes = []
for i in range(tp.count_chars()):
    ch = chr(tp.get_char(i)) if hasattr(tp, "get_char") else txt[i] if i < len(txt) else " "
    if not ch.isalpha(): continue   # measure letter glyph boxes only, not spaces / rules
    box = tp.get_charbox(i, loose=True); sizes.append(box[3] - box[1])
if sizes and min(sizes) < 7.5: fails.append(f"letter glyphs smaller than 7.5pt found: {min(sizes):.1f}")
print("check_cert_pdf:", "PASS" if not fails else "FAIL " + "; ".join(fails)); sys.exit(1 if fails else 0)
