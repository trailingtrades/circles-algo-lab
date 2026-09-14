#!/usr/bin/env python3
"""Generates /content/*.json for 5C Learn from the Master Curriculum v2 (28 Aug 2026) content in scripts/content_v2/.
Tier 1 (foundation slug): 21 days, full content + quizzes + weekend exam banks, published.
Tier 2 (intermediate slug): 10 weeks x 2 sessions, structured drafts, unpublished until content + quizzes are authored.
Tier 3 (advanced slug): 20 weeks x 1 session, structured drafts, unpublished.
Re-run: python3 scripts/gen_content.py  (idempotent; overwrites content/*.json)"""
import json, os, sys, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "content_v2"))
ROOT = os.path.join(HERE, "..", "content")
import tier1_w1, tier1_w2, tier1_w3, tier23  # noqa: E402

LEVELS = [
  {"slug":"foundation","sequence":1,"title_en":"Tier 1 · Basic","title_hi":"Tier 1 · Basic","subtitle_en":"Market + AI Foundation · 21 days · 2 strategies · Algo Level 1","subtitle_hi":"Market + AI Foundation · 21 din · 2 strategies · Algo Level 1","unlock_rule":"always"},
  {"slug":"intermediate","sequence":2,"title_en":"Tier 2 · Advanced","title_hi":"Tier 2 · Advanced","subtitle_en":"Systematic Trader · 10 weeks · 6 strategies paper-deployed · Algo Level 2","subtitle_hi":"Systematic Trader · 10 hafte · 6 strategies paper-deploy · Algo Level 2","unlock_rule":"previous_level_certificate"},
  {"slug":"advanced","sequence":3,"title_en":"Tier 3 · Expert","title_hi":"Tier 3 · Expert","subtitle_en":"Quant Desk · 20 weeks · 15 strategies in Python · Algo Level 3","subtitle_hi":"Quant Desk · 20 hafte · 15 strategies Python mein · Algo Level 3","unlock_rule":"previous_level_certificate"},
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
  stem_en, stem_hi, opts, ex_en, ex_hi = t
  options = [{"en": oe, "hi": oh, "distractor": bool(d)} for (oe, oh, d) in opts]
  correct = [i for i, (_, _, d) in enumerate(opts) if not d]
  assert len(correct) == 1, stem_en
  return {"stem_en": stem_en, "stem_hi": stem_hi, "options": options, "correct_index": correct[0], "explanation_en": ex_en, "explanation_hi": ex_hi, "marks": 1, "difficulty": 1}

levels, weeks, sessions, quizzes, exam_banks = [], [], [], [], []
for L in LEVELS: levels.append(L)
n = 0

# ---- Tier 1 ----
for wmod in (tier1_w1, tier1_w2, tier1_w3):
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

# Tier 1 final: 30 questions sampled deterministically across the three weekly banks (10 each), 1 mark each.
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
  {"level": "foundation", "week": 1, "title": "Tier 1 Weekend Quiz Game 1", "total_marks": 30, "pass_marks": 18, "distinction_marks": 26, "time_limit_min": 30, "attempts_allowed": 2},
  {"level": "foundation", "week": 2, "title": "Tier 1 Weekend Quiz Game 2", "total_marks": 30, "pass_marks": 18, "distinction_marks": 26, "time_limit_min": 30, "attempts_allowed": 2},
  {"level": "foundation", "week": 3, "title": "Tier 1 Weekend Quiz Game 3", "total_marks": 30, "pass_marks": 18, "distinction_marks": 26, "time_limit_min": 30, "attempts_allowed": 2},
  {"level": "foundation", "week": None, "title": "Tier 1 Final exam", "total_marks": 30, "pass_marks": 18, "distinction_marks": 26, "time_limit_min": 60, "attempts_allowed": 2},
  {"level": "intermediate", "week": None, "title": "Tier 2 Capstone assessment", "total_marks": 36, "pass_marks": 22, "distinction_marks": 30, "time_limit_min": 60, "attempts_allowed": 2},
  {"level": "advanced", "week": None, "title": "Tier 3 Capstone assessment", "total_marks": 36, "pass_marks": 22, "distinction_marks": 30, "time_limit_min": 60, "attempts_allowed": 2},
]

# ---- Resources ----
resources = [
  {"level": "foundation", "week": None, "kind": "excel", "file_name": "5C_AITC_Foundation_MockPortfolio_Template_v1.xlsx", "note": "virtual Rs 10 lakh mock portfolio (Google Drive)", "storage_path": "https://drive.google.com/file/d/1vGXOWT8KI59zSG43WC-CT0BvyYZQBLua/view"},
  {"level": "foundation", "week": None, "kind": "workbook", "file_name": "Tier 1 Rule Card + Journal + Sizing templates (Google Sheets)", "note": "templates pending upload", "storage_path": None},
  {"level": "intermediate", "week": None, "kind": "workbook", "file_name": "Tier 2 Capstone deck template", "note": "pending upload", "storage_path": None},
  {"level": "advanced", "week": None, "kind": "workbook", "file_name": "Tier 3 Strategy factory starter repo", "note": "pending upload", "storage_path": None},
  {"level": None, "week": None, "kind": "link", "file_name": "Circles Algo Lab — AI Trading Command Centre", "note": "existing dashboard, opens in a new tab", "storage_path": "https://algo.circleoptionlab.com"},
  {"level": None, "week": None, "kind": "link", "file_name": "AI Trading Course — Master Curriculum v2 (PDF)", "note": "full 3-tier curriculum, 23 strategies (Google Drive)", "storage_path": "https://drive.google.com/file/d/1MJsyuDyzMdXUTBBjojRQoA_G3_Z-pgWL/view"},
]
for w in (1, 2, 3):
  resources.append({"level": "foundation", "week": w, "kind": "deck", "file_name": f"5C_AITC_Tier1_W{w}_Deck.pptx", "note": "deck pending upload", "storage_path": None})
  resources.append({"level": "foundation", "week": w, "kind": "handout", "file_name": f"5C_AITC_Tier1_W{w}_Handout.pdf", "note": "handout pending upload", "storage_path": None})

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
