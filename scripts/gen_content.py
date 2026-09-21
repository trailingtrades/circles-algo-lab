#!/usr/bin/env python3
"""Generates /content/*.json for 5C Learn from the Master Curriculum v2 (28 Aug 2026) content in scripts/content_v2/.
Tier 1 (foundation slug): 21 days, full content + quizzes + weekend exam banks, published.
Tier 2 (intermediate slug): 10 weeks x 2 sessions, structured drafts, unpublished until content + quizzes are authored.
Tier 3 (advanced slug): 20 weeks x 1 session, structured drafts, unpublished.
Stage 1 (Tier 1) v3: when scripts/content_v3/smart/ holds all 21 day files it is the source (three languages,
visuals, validated by content_v3/build_smart.py — see docs/SMART_CONTENT_SCHEMA.md); otherwise the v2 modules are used.
Re-run: python3 scripts/gen_content.py  (idempotent; overwrites content/*.json)"""
import json, os, sys, random, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "content_v2"))
sys.path.insert(0, os.path.join(HERE, "content_v3"))
ROOT = os.path.join(HERE, "..", "content")
import tier1_w1, tier1_w2, tier1_w3, tier23  # noqa: E402
import build_smart  # noqa: E402

LEVELS = [
  {"slug":"foundation","sequence":1,"title_en":"Stage 1 · Basic","title_hi":"Stage 1 · Basic","title_dv":"चरण 1 · बेसिक","subtitle_en":"Market + AI Foundation · 21 days · 2 strategies · Algo Level 1","subtitle_hi":"Market + AI Foundation · 21 din · 2 strategies · Algo Level 1","subtitle_dv":"मार्केट + AI की नींव · 21 दिन · 2 स्ट्रैटेजी · एल्गो लेवल 1","unlock_rule":"always"},
  {"slug":"intermediate","sequence":2,"title_en":"Level 2 · Advanced","title_hi":"Level 2 · Advanced","title_dv":"लेवल 2 · एडवांस्ड","subtitle_en":"Systematic Trader · 10 weeks · 6 strategies paper-deployed · Algo Level 2","subtitle_hi":"Systematic Trader · 10 hafte · 6 strategies paper-deploy · Algo Level 2","subtitle_dv":"सिस्टमैटिक ट्रेडर · 10 हफ़्ते · 6 स्ट्रैटेजी पेपर पर · एल्गो लेवल 2","unlock_rule":"previous_level_certificate"},
  {"slug":"advanced","sequence":3,"title_en":"Level 3 · Expert","title_hi":"Level 3 · Expert","title_dv":"लेवल 3 · एक्सपर्ट","subtitle_en":"Quant Desk · 20 weeks · 15 strategies in Python · Algo Level 3","subtitle_hi":"Quant Desk · 20 hafte · 15 strategies Python mein · Algo Level 3","subtitle_dv":"क्वांट डेस्क · 20 हफ़्ते · Python में 15 स्ट्रैटेजी · एल्गो लेवल 3","unlock_rule":"previous_level_certificate"},
]
ACCENTS = ["#00AEEF", "#134A9A", "#f5a623", "#4caf50"]
GENERIC_PROMPT = """You are my research analyst. I am the decision-maker; you never place trades or give buy/sell advice.
{tier} · {title} · Build: {kaam}
Rules:
1. Separate every claim into Fact / Guess / Kachra and label it.
2. Use only the data I paste below; if something is missing, say "missing" instead of guessing.
3. No return forecasts, no targets, no certainty language. Educational analysis only.
4. End with three questions I should answer myself before acting.
Data:
<paste here>"""

def q_obj(t):
  """Legacy v2 tuple -> question. The authored order always put the right answer first, so options are
  shuffled with a seed taken from the stem (stable across runs) — the answer is no longer always A."""
  stem_en, stem_hi, opts, ex_en, ex_hi = t
  options = [{"en": oe, "hi": oh, "distractor": bool(d)} for (oe, oh, d) in opts]
  assert sum(1 for o in options if not o["distractor"]) == 1, stem_en
  random.Random(int(hashlib.sha1(stem_en.encode("utf-8")).hexdigest()[:8], 16)).shuffle(options)
  correct = next(i for i, o in enumerate(options) if not o["distractor"])
  return {"stem_en": stem_en, "stem_hi": stem_hi, "options": options, "correct_index": correct, "explanation_en": ex_en, "explanation_hi": ex_hi, "marks": 1, "difficulty": 1}

levels, weeks, sessions, quizzes, exam_banks = [], [], [], [], []
for L in LEVELS: levels.append(L)
n = 0

# ---- Tier 1 ----
V3 = build_smart.exists()
if V3:
  try:
    w3, s3, q3, e3 = build_smart.build()
  except build_smart.Bad as err:
    print("CONTENT ERROR (scripts/content_v3/smart):", err); sys.exit(1)
  weeks += w3; sessions += s3; quizzes += q3; exam_banks += e3; n = len(s3)
# v3 days without v3 exam papers yet: keep the v2 weekend banks (and the v2 final drawn from them) meanwhile.
V3_EXAMS = V3 and bool(exam_banks)
if V3 and not V3_EXAMS:
  print("note: scripts/content_v3/smart has no exam_w1..3 / exam_final.json yet; using the v2 exam banks")
  for wmod in (tier1_w1, tier1_w2, tier1_w3):
    exam_banks.append({"level": "foundation", "week": wmod.WEEK["number"], "questions": [dict(q_obj(t), marks=2) for t in wmod.EXAM]})
for wmod in (() if V3 else (tier1_w1, tier1_w2, tier1_w3)):
  W = wmod.WEEK
  weeks.append({"level": "foundation", "number": W["number"], "title_en": W["title_en"], "title_hi": W["title_hi"], "theme_accent": W["accent"]})
  for s in wmod.SESSIONS:
    n += 1
    day_in_week = s["day"] - (W["number"] - 1) * 7
    sessions.append({
      "number": n, "level": "foundation", "week": W["number"], "day": day_in_week, "course_day": s["day"],
      "title_en": s["title_en"], "title_hi": s["title_hi"], "core_concept": s["core_concept"], "ai_lab": s["ai_lab"], "psychology": s["psychology"],
      "strategy": s.get("strategy"), "duration_min": 90, "video_url": None, "video_provider": "youtube_unlisted", "is_published": True, "draft": False,
      "summary_hi": s["outcome"],
      "content": {"topics": s["topics"], "kaam": s["kaam"], "outcome": s["outcome"], "tools": s["tools"], "fun": s.get("fun"), "compliance": s.get("compliance"), "journal_prompt": s["journal_prompt"]},
      "prompts": [{"title": p["title"], "level": "foundation", "platform": "any", "body": p["body"]} for p in s["prompts"]],
    })
    quizzes.append({"session": n, "questions": [q_obj(t) for t in s["quiz"]]})
  exam_banks.append({"level": "foundation", "week": W["number"], "questions": [dict(q_obj(t), marks=2) for t in wmod.EXAM]})

# Tier 1 final. v3 authors its own 30-question bank (exam_final.json). Legacy v2: 30 questions sampled
# deterministically across the three weekly banks (10 each), 1 mark each.
if not V3_EXAMS:
  rng = random.Random(20260914)
  final_qs = []
  for b in exam_banks:
    pick = rng.sample(b["questions"], 10)
    final_qs += [dict(q, marks=1) for q in pick]
  exam_banks.append({"level": "foundation", "week": None, "questions": final_qs})

# ---- Tier 2 ----
for wi, (hi, en) in enumerate(tier23.T2_WEEKS, start=1):
  weeks.append({"level": "intermediate", "number": wi, "title_en": en, "title_hi": hi, "theme_accent": ACCENTS[(wi - 1) % 4]})
for (wk, day, te, th, concept, ai, psy, strat, topics, kaam, outcome, tools, fun, comp) in tier23.T2:
  n += 1
  sessions.append({"number": n, "level": "intermediate", "week": wk, "day": day, "course_day": None, "title_en": te, "title_hi": th, "core_concept": concept, "ai_lab": ai, "psychology": psy, "strategy": strat,
    "duration_min": 90, "video_url": None, "video_provider": "youtube_unlisted", "is_published": False, "draft": True, "summary_hi": outcome,
    "content": {"topics": [{"h": "Core topics", "p": topics}], "kaam": kaam, "outcome": outcome, "tools": tools, "fun": fun, "compliance": comp, "journal_prompt": "Aaj ke build mein sabse mushkil hissa kya tha aur kyun?"},
    "prompts": [{"title": ai, "level": "intermediate", "platform": "any", "body": GENERIC_PROMPT.format(tier="Tier 2", title=te, kaam=kaam)}]})
  quizzes.append({"session": n, "questions": []})

# ---- Tier 3 ----
for wi in range(1, 21):
  ph = next(p for (w, p, *_r) in tier23.T3 if w == wi)
  weeks.append({"level": "advanced", "number": wi, "title_en": f"Week {wi} · {tier23.T3_PHASES[ph]}", "title_hi": f"Hafta {wi} · {tier23.T3_PHASES[ph]}", "theme_accent": ACCENTS[(ph - 1) % 4]})
for (wk, ph, te, th, concept, ai, psy, strat, topics, kaam, outcome, tools, fun, comp) in tier23.T3:
  n += 1
  sessions.append({"number": n, "level": "advanced", "week": wk, "day": 1, "course_day": None, "title_en": te, "title_hi": th, "core_concept": concept, "ai_lab": ai, "psychology": psy, "strategy": strat,
    "duration_min": 150, "video_url": None, "video_provider": "youtube_unlisted", "is_published": False, "draft": True, "summary_hi": outcome,
    "content": {"topics": [{"h": tier23.T3_PHASES[ph], "p": topics}], "kaam": kaam, "outcome": outcome, "tools": tools, "fun": fun, "compliance": comp, "journal_prompt": "Aaj ke build mein sabse mushkil hissa kya tha aur kyun?"},
    "prompts": [{"title": ai, "level": "advanced", "platform": "any", "body": GENERIC_PROMPT.format(tier="Tier 3", title=te, kaam=kaam)}]})
  quizzes.append({"session": n, "questions": []})

# ---- Exams ----
exams = [
  {"level": "foundation", "week": 1, "title": "Week 1 Quiz Game", "title_hi": "Week 1 Quiz Game", "title_dv": "हफ़्ता 1 क्विज़ गेम", "total_marks": 30, "pass_marks": 18, "distinction_marks": 26, "time_limit_min": 30, "attempts_allowed": 2},
  {"level": "foundation", "week": 2, "title": "Week 2 Quiz Game", "title_hi": "Week 2 Quiz Game", "title_dv": "हफ़्ता 2 क्विज़ गेम", "total_marks": 30, "pass_marks": 18, "distinction_marks": 26, "time_limit_min": 30, "attempts_allowed": 2},
  {"level": "foundation", "week": 3, "title": "Week 3 Quiz Game", "title_hi": "Week 3 Quiz Game", "title_dv": "हफ़्ता 3 क्विज़ गेम", "total_marks": 30, "pass_marks": 18, "distinction_marks": 26, "time_limit_min": 30, "attempts_allowed": 2},
  {"level": "foundation", "week": None, "title": "Stage 1 Final exam", "title_hi": "Stage 1 Final exam", "title_dv": "चरण 1 फ़ाइनल परीक्षा", "total_marks": 30, "pass_marks": 18, "distinction_marks": 26, "time_limit_min": 60, "attempts_allowed": 2},
  {"level": "intermediate", "week": None, "title": "Level 2 Capstone assessment", "title_hi": "Level 2 Capstone assessment", "title_dv": "लेवल 2 कैपस्टोन मूल्यांकन", "total_marks": 36, "pass_marks": 22, "distinction_marks": 30, "time_limit_min": 60, "attempts_allowed": 2},
  {"level": "advanced", "week": None, "title": "Level 3 Capstone assessment", "title_hi": "Level 3 Capstone assessment", "title_dv": "लेवल 3 कैपस्टोन मूल्यांकन", "total_marks": 36, "pass_marks": 22, "distinction_marks": 30, "time_limit_min": 60, "attempts_allowed": 2},
]

# ---- Resources ----
# Row shape (content/resources.json; the app reads it through apps/learn/src/lib/content/resources.ts):
#   {"level": "foundation" | "intermediate" | "advanced" | None, "week": int | None, "day": int | None (optional),
#    "lang": "en" | "hi" | None (optional), "kind": "deck" | "handout" | "workbook" | "excel" | "link" | "exam",
#    "file_name": str, "note": str, "storage_path": "https://..." | "/learn/..." (a file this app serves) | None}
# `lang` marks one language copy of a file: English readers get "en"; Hinglish AND Hindi readers get "hi" (no
# Devanagari edition); a reader falls back to whichever copy exists. `day` (Stage 1 course day 1-21) pins a file
# to one day instead of the whole week; its week is filled in from the day. A session lists the decks and
# handouts of its week (and of its day); attendance asks for "handout opened" only while one is listed.
def drive(file_id):
  return f"https://drive.google.com/file/d/{file_id}/view"

resources = [
  {"level": "foundation", "week": None, "kind": "excel", "file_name": "5C_AITC_Foundation_MockPortfolio_Template_v1.xlsx", "note": "virtual Rs 10 lakh mock portfolio", "storage_path": drive("1D03lWibwVrePE_iQHc_ae4LPnXI-y7HM")},
  {"level": "intermediate", "week": None, "kind": "workbook", "file_name": "Level 2 Capstone deck template", "note": "coming soon", "storage_path": None},
  {"level": "advanced", "week": None, "kind": "workbook", "file_name": "Level 3 Strategy factory starter repo", "note": "coming soon", "storage_path": None},
  {"level": None, "week": None, "kind": "link", "file_name": "Circles Algo Lab — AI Trading Command Centre", "note": "opens in a new tab", "storage_path": "https://algo.circleoptionlab.com"},
  {"level": None, "week": None, "kind": "link", "file_name": "AI Trading Course — Master Curriculum v2 (PDF)", "note": "the full curriculum, 23 strategies", "storage_path": "https://drive.google.com/file/d/1MJsyuDyzMdXUTBBjojRQoA_G3_Z-pgWL/view"},
  {"level": None, "week": None, "kind": "link", "file_name": "AI Trading Course — Curriculum Index (Google Sheet)", "note": "week and session index of the curriculum", "storage_path": "https://docs.google.com/spreadsheets/d/1ZzMybEjVJpPpG6DFqsJyd5RceOJHgrCwNkYT1f8vIh4/edit"},
]

# Stage 1 (foundation) class files, v3. Removed 21 Sep 2026 (owner decision): the v1 FOUNDATION_PACK (4-week
# decks, handouts and workbook that teach a different sequence; v1 Handout 3 section 11.3 gives a cause for the
# SEBI FY26 87.7% figure, a compliance breach), the two private Google Slides (5Circles_Candlestick_Basics,
# 5Circles_Chart_Patterns: a sign-in wall for students) and the "Rule Card + Journal + Sizing templates" row
# (nothing to link; the templates now live in each day's Today's task, content.artefacts). Until the v3 week
# files ship, Stage 1 days list no class material and attendance is the finished session alone.
# The v3 per-week decks and handouts, one row per language copy (en = English, hi = Hinglish; Hindi readers get
# the Hinglish copy). The app serves them itself to signed-in learners from apps/learn/files/stage1/
# (route app/learn/(app)/files/stage1/[file]); handout PDFs are written by apps/learn/scripts/export-stage1.mjs,
# decks by the deck builder. The rows are always listed here, but a row whose file is not on disk yet stays hidden
# from students at runtime (lib/content/resources.ts hiddenBecause -> lib/content/stage1-files.ts), so a week's
# handout counts for attendance ("handout opened") only once that file ships; until then it is the finished session.
STAGE1_V3_FILES = [
  {"level": "foundation", "week": wk, "lang": lang, "kind": kind,
   "file_name": f"CIRCLE-SMART_Week{wk}_{part}_{edition}.{ext}",
   "note": f"Week {wk} {note} ({'English' if lang == 'en' else 'Hinglish'})",
   "storage_path": f"/learn/files/stage1/CIRCLE-SMART_Week{wk}_{part}_{edition}.{ext}"}
  for wk in (1, 2, 3)
  for kind, part, ext, note in (("handout", "Handout", "pdf", "handout"), ("deck", "Deck", "pptx", "class deck"))
  for lang, edition in (("en", "EN"), ("hi", "HINGLISH"))
]
# Intermediate (Tier 2 Advanced) — v1 pack is 4 weeks; Curriculum v2 spreads Tier 2 over 10 weeks.
INTERMEDIATE_PACK = [
  (1, "deck", "5C_AITC_Intermediate_Week1_Deck_v1.pptx", "v1 pack Week 1 deck", "1l22hxJ3Qtc3Bf2_y5NWI8zxv7dqZdDRU"),
  (1, "handout", "5C_AITC_Intermediate_Handout1_v1.pdf", "v1 pack Week 1 handout", "1WQZ6DnPDLP3E8HK87DdUFevVDLADhq7y"),
  (2, "deck", "5C_AITC_Intermediate_Week2_Deck_v1.pptx", "v1 pack Week 2 deck", "1xtaN08sb-meqfLkgxLOyIbYLzWcq5A1p"),
  (2, "handout", "5C_AITC_Intermediate_Handout2_v1.pdf", "v1 pack Week 2 handout", "1nAlzSyGS29rVJpVy6ex18Ihc6XYRzpjk"),
  (3, "deck", "5C_AITC_Intermediate_Week3_Deck_v1.pptx", "v1 pack Week 3 deck", "19UHqFZA_jpDx0d24eFCDEjlwhWW97QE2"),
  (3, "handout", "5C_AITC_Intermediate_Handout3_v1.pdf", "v1 pack Week 3 handout", "1BonAclVcC2x989qIcUAuflx0anOKCp21"),
  (4, "deck", "5C_AITC_Intermediate_Week4_Deck_v1.pptx", "v1 pack Week 4 deck", "1UUNRwxMTMdTf3Fy67dHhBuELgsSC-C9c"),
  (4, "handout", "5C_AITC_Intermediate_Handout4_v1.pdf", "v1 pack Week 4 handout", "1DZT_c67JHV4F22Nf60go1Osj4_bELgrr"),
  (None, "workbook", "5C_AITC_Intermediate_Workbook_v1.pdf", "Level 2 workbook", "1nW1caJYEO8cPpq_pn8TJqakRvbSsjuKb"),
]
# Advanced (Tier 3 Expert) — v1 pack is 4 weeks; Curriculum v2 spreads Tier 3 over 20 weeks.
ADVANCED_PACK = [
  (1, "deck", "5C_AITC_Advanced_Week1_Deck_v1.pptx", "v1 pack Week 1 deck", "15CMDwls2n6wvVQRAK63Goteqy75jfaFi"),
  (1, "handout", "5C_AITC_Advanced_Handout1_v1.pdf", "v1 pack Week 1 handout", "1OLtyermz0xP2ovtazaQMA6Yai5tgFmtY"),
  (2, "deck", "5C_AITC_Advanced_Week2_Deck_v1.pptx", "v1 pack Week 2 deck", "1A0PJLnLK_w5AQSIW-wvi-C1s2Nr9LTi_"),
  (2, "handout", "5C_AITC_Advanced_Handout2_v1.pdf", "v1 pack Week 2 handout", "1bPR5i_SnzSOTiU9jFOxTx_F1iNKvshcf"),
  (3, "deck", "5C_AITC_Advanced_Week3_Deck_v1.pptx", "v1 pack Week 3 deck", "1Pxp7OnG1NvzRHUzFzhy-F26-yXT7SlNu"),
  (3, "handout", "5C_AITC_Advanced_Handout3_v1.pdf", "v1 pack Week 3 handout", "1x_u05Egcm64NBn8uMfWRcQTOu0qFCU9Q"),
  (4, "deck", "5C_AITC_Advanced_Week4_Deck_v1.pptx", "v1 pack Week 4 deck", "1D2RluYLh0gORK6hGcGaRAPk4dz14TPFX"),
  (4, "handout", "5C_AITC_Advanced_Handout4_v1.pdf", "v1 pack Week 4 handout", "130sqldaMef9F9GYCvSBTYtSEJpWn8RRr"),
  (None, "workbook", "5C_AITC_Advanced_Workbook_v1.pdf", "Level 3 workbook", "1JwSxWTXH-rnXMvXeP1-3ztRekVhxB_gI"),
]
# Level 2 / Level 3 v1 packs: kept as data, hidden from students by the app (21 Sep 2026: Stage 2 is CIRCLE W.I.N.N.E.R.S).
for level, pack in (("intermediate", INTERMEDIATE_PACK), ("advanced", ADVANCED_PACK)):
  for wk, kind, fname, note, fid in pack:
    resources.append({"level": level, "week": wk, "kind": kind, "file_name": fname, "note": note, "storage_path": drive(fid)})
resources += STAGE1_V3_FILES

RES_KINDS = {"deck", "handout", "workbook", "excel", "link", "exam"}
def resource_row(r, i):
  """Checks one resource row and fills the defaults: file_name from the path, week from a Stage 1 day, note ""."""
  where = f"resources[{i}] ({r.get('file_name') or r.get('storage_path')})"
  bad = lambda msg: sys.exit(f"CONTENT ERROR: {where}: {msg}")
  r = dict(r)
  if r.get("level") not in ("foundation", "intermediate", "advanced", None): bad("level must be foundation, intermediate, advanced or None")
  if r.get("kind") not in RES_KINDS: bad(f"kind must be one of {sorted(RES_KINDS)}")
  if "lang" in r and r["lang"] not in ("en", "hi", None): bad('lang must be "en" (English) or "hi" (Hinglish; Hindi readers get it too)')
  sp = r.get("storage_path")
  if sp is not None and not (isinstance(sp, str) and (sp.startswith("https://") or (sp.startswith("/") and not sp.startswith("//")))):
    bad('storage_path must be an https:// link, an in-app path starting with "/", or None')
  if r.get("day") is not None:
    d = r["day"]
    if r.get("level") != "foundation" or isinstance(d, bool) or not isinstance(d, int) or not 1 <= d <= 21: bad("day is a Stage 1 course day, 1-21, on a foundation row")
    wk = (d - 1) // 7 + 1
    if r.get("week") not in (None, wk): bad(f"day {d} is in week {wk}, not week {r['week']}")
    r["week"] = wk
  if not r.get("file_name"):
    if not sp: bad("needs a file_name (or a storage_path to take it from)")
    r["file_name"] = sp.rstrip("/").rsplit("/", 1)[-1]
  r.setdefault("week", None); r.setdefault("note", ""); r.setdefault("storage_path", None)
  # Optional keys only when set, so rows that do not use them stay as they were.
  for k in ("lang", "day"):
    if r.get(k) is None: r.pop(k, None)
  return r
resources = [resource_row(r, i) for i, r in enumerate(resources)]

vocab = {
  "foundation": ["expectancy", "R-multiple", "risk-of-ruin", "verify-before-trust", "AI = analyst, human = trigger", "HH/HL", "S/R zones", "EMA 20/50", "VWAP", "RSI 40-50 pullback", "ATR stop", "Rule Card", "ORB", "EMA Pullback Swing", "1% rule", "position size formula", "5-check health filter", "Style Fit", "flowchart", "alerts are not orders", "30-trade backtest", "F&O = samjho, khelo mat", "no-trade days", "kill-switch for humans", "Daily Routine Card"],
  "intermediate": ["Claude Project", "no-code paper mode", "confluence score", "VWAP bands", "Greeks", "IV rank", "PCR", "credit spread", "iron condor", "SPAN margin", "RS vs NIFTY", "NR7", "momentum rotation", "portfolio heat", "Algo-ID", "Sharpe/Sortino/Calmar", "in-sample vs out-of-sample", "trials ledger", "sprint scorecard", "trading business plan"],
  "advanced": ["adapter pattern", "audit log", "strategy factory", "cointegration", "half-life", "basis", "PEAD", "gap model", "LLM signal filter", "vol surface", "term structure", "0DTE", "GARCH regime", "portfolio Greeks", "ADF x KPSS", "meta-labeling", "purged K-fold", "CPCV", "PSR/DSR", "PBO", "cost model", "risk parity", "fractional Kelly", "kill-switch FSM", "reconciliation"],
  "laws": ["F&O = samjho, khelo mat (Tier 1: no F&O trades, not even paper)", "AI = analyst, human = trigger", "Alerts are not orders (Tier 1)", "Leaderboard ranks rule adherence, never P&L", "Broker-agnostic; no account mandatory; TradingView charting only", "SEBI retail algo framework: circular 4 Feb 2025, binding 1 Apr 2026; broker-as-principal; Algo-ID; unregistered providers barred", "Only F&O-loss stat permitted: SEBI FY26 study (Aug 2026): 87.7% of individual F&O traders in net loss, aggregate Rs 91,685 cr, avg Rs 1.17 lakh per loss-making trader", "Never print repo rate, STT/cost rates or reference rates; students use their own contract note", "Past performance is not indicative of future results, on every backtest output"],
}

def w(name, obj):
  os.makedirs(os.path.dirname(os.path.join(ROOT, name)), exist_ok=True)
  with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f: json.dump(obj, f, ensure_ascii=False, indent=1); f.write("\n")

for stale in ("quizzes/foundation-w1.json", "quizzes/_empty-banks.json", "exams/foundation-w1.json"):
  p = os.path.join(ROOT, stale)
  if os.path.exists(p): os.remove(p)
w("levels.json", levels); w("weeks.json", weeks); w("resources.json", resources); w("exams.json", exams); w("vocabulary.json", vocab)
by_level = {}
for s in sessions: by_level.setdefault(s["level"], []).append(s)
for lv, arr in by_level.items(): w(f"sessions/{lv}.json", arr)
w("quizzes/foundation.json", [q for q in quizzes if q["questions"]])
w("exams/foundation.json", exam_banks)
print(len(levels), "levels,", len(weeks), "weeks,", len(sessions), "sessions,", sum(len(q["questions"]) for q in quizzes), "quiz questions,", sum(len(b["questions"]) for b in exam_banks), "exam questions,", len(exams), "exams,", len(resources), "resources")
