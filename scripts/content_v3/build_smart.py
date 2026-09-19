#!/usr/bin/env python3
"""CIRCLE S.M.A.R.T Stage 1 (Tier 1) content, v3 source -> app/DB shapes, with a strict validator.

Source: scripts/content_v3/smart/{weeks.json, day01.json .. day21.json, exam_w1.json .. exam_w3.json, exam_final.json}
Format: docs/SMART_CONTENT_SCHEMA.md. Called by scripts/gen_content.py; run alone to validate only:
    python scripts/content_v3/build_smart.py            # validate, print a summary
    python scripts/content_v3/build_smart.py day05.json # validate one file (quick loop while authoring)
"""
import json, os, re, sys, random, glob

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "smart")

DEVA = re.compile(r"[ऀ-ॿ]")
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF\U0001F900-\U0001F9FF⭐⭕⌚-⌛⏩-⏺]")
# Promise language, all three languages. Allowed only in tipster story panels and wrong quiz options.
BANNED = [
  # the CI list (scripts/ci/check_compliance.py) ...
  r"guarante", r"assured?\s+(return|profit|income)", r"risk[- ]free", r"sure[- ]?shot", r"100\s*%\s*(accura|profit|return|success|sure)", r"pakka\s+(profit|munafa|return|paisa)",
  r"(munafa|profit|return)\s+pakka", r"loss\s+nahi\s+hoga", r"no[- ]loss", r"can'?t\s+lose", r"never\s+wrong", r"kabhi\s+galat\s+nahi", r"loss\s+hoga\s+hi\s+nahi",
  r"double\s+(your|apna|aapka)?\s*(money|paisa)", r"pakka\s+multibagger",
  # ... plus what the CI list missed
  r"zero[- ]risk", r"fixed\s+return", r"jackpot",
  r"गारंटी", r"पक्का\s*(मुनाफ़ा|मुनाफा|प्रॉफ़िट|प्रॉफिट|रिटर्न)", r"(मुनाफ़ा|मुनाफा|रिटर्न)\s*पक्का", r"निश्चित\s*(मुनाफ़ा|मुनाफा|रिटर्न)", r"जोखिम[\s-]*मुक्त", r"सुनिश्चित\s*रिटर्न", r"नो[\s-]*लॉस",
]
BANNED_RE = re.compile("|".join(BANNED), re.I)
RATES_RE = re.compile(r"(repo\s*rate|रेपो\s*रेट|reference\s*rate|STT)\s*(is|hai|है|of|=|:)?\s*[\d.]+\s*%", re.I)
OLD_STATS_RE = re.compile(r"\b(9[0-9](\.\d)?|89|8[0-6](\.\d)?)\s?%[^.]{0,80}(F&O|traders?|ट्रेडर)", re.I)

TONES = {"brand", "up", "down", "gold", "muted"}
CHARS = {"mentor", "aman", "priya", "tipster", "narrator"}
MOODS = {"neutral", "happy", "worried", "thinking", "sad", "excited"}
OPS = {"+", "-", "x", "÷", "="}

class Bad(Exception):
  pass

def L(x, where, allow_banned=False, short=False):
  """Validate a three-language string {en, hi, dv}."""
  if not isinstance(x, dict) or set(x.keys()) - {"en", "hi", "dv"}:
    raise Bad(f"{where}: expected {{en, hi, dv}}, got {str(x)[:80]}")
  for k in ("en", "hi", "dv"):
    v = x.get(k)
    if not isinstance(v, str) or not v.strip():
      raise Bad(f"{where}.{k}: missing or empty")
    if EMOJI.search(v):
      raise Bad(f"{where}.{k}: emoji not allowed")
    if not allow_banned and BANNED_RE.search(v):
      raise Bad(f"{where}.{k}: promise language '{BANNED_RE.search(v).group(0)}' (allowed only in tipster panels / wrong options)")
    if RATES_RE.search(v):
      raise Bad(f"{where}.{k}: prints a rate ({RATES_RE.search(v).group(0)}) — link to the source instead")
    if OLD_STATS_RE.search(v) and "87.7" not in v:
      raise Bad(f"{where}.{k}: looks like an unapproved F&O-loss statistic: {OLD_STATS_RE.search(v).group(0)}")
    if "87.7" in v and not re.search(r"FY26|FY 26|FY-26", v):
      raise Bad(f"{where}.{k}: 87.7% must carry its source (SEBI FY26 study, Aug 2026)")
  if DEVA.search(x["en"]): raise Bad(f"{where}.en: Devanagari in English text")
  if DEVA.search(x["hi"]): raise Bad(f"{where}.hi: Devanagari in Hinglish (Roman script only)")
  dv = x["dv"]
  latin_only = not DEVA.search(dv)
  if latin_only and not (dv == x["en"] or len(dv) <= 24):
    raise Bad(f"{where}.dv: no Devanagari — write the Hindi in Devanagari: {dv[:60]}")
  if re.search(r"[०-९]", dv): raise Bad(f"{where}.dv: use 0-9 digits, not Devanagari digits")
  return x

def opt_L(x, where, **kw):
  return None if x is None else L(x, where, **kw)

def num(v, where):
  if not isinstance(v, (int, float)) or v != v or v in (float("inf"), float("-inf")):
    raise Bad(f"{where}: expected a number, got {v!r}")
  return v

def tone(v, where):
  if v is not None and v not in TONES: raise Bad(f"{where}: tone must be one of {sorted(TONES)}")

def count(arr, lo, hi, where):
  if not isinstance(arr, list) or not (lo <= len(arr) <= hi):
    raise Bad(f"{where}: expected {lo}-{hi} items, got {len(arr) if isinstance(arr, list) else type(arr).__name__}")

def visual(v, where):
  if not isinstance(v, dict) or "kind" not in v: raise Bad(f"{where}: visual needs a kind")
  k = v["kind"]
  opt_L(v.get("title"), f"{where}.title"); opt_L(v.get("caption"), f"{where}.caption")
  if k == "flow":
    count(v.get("nodes"), 2, 6, f"{where}.nodes")
    for i, n in enumerate(v["nodes"]): L(n.get("label"), f"{where}.nodes[{i}].label"); opt_L(n.get("sub"), f"{where}.nodes[{i}].sub"); tone(n.get("tone"), f"{where}.nodes[{i}].tone")
    if v.get("arrows") is not None:
      count(v["arrows"], len(v["nodes"]) - 1, len(v["nodes"]) - 1, f"{where}.arrows")
      for i, a in enumerate(v["arrows"]): L(a, f"{where}.arrows[{i}]")
  elif k == "steps":
    count(v.get("items"), 2, 6, f"{where}.items")
    for i, s in enumerate(v["items"]):
      L(s.get("label"), f"{where}.items[{i}].label"); opt_L(s.get("sub"), f"{where}.items[{i}].sub")
      if s.get("tag") is not None and (not isinstance(s["tag"], str) or len(s["tag"]) > 8): raise Bad(f"{where}.items[{i}].tag: short string (<=8)")
  elif k == "compare":
    count(v.get("cols"), 2, 3, f"{where}.cols")
    for i, c in enumerate(v["cols"]):
      L(c.get("head"), f"{where}.cols[{i}].head"); tone(c.get("tone"), f"{where}.cols[{i}].tone")
      count(c.get("points"), 1, 5, f"{where}.cols[{i}].points")
      for j, p in enumerate(c["points"]): L(p, f"{where}.cols[{i}].points[{j}]")
  elif k == "calc":
    count(v.get("rows"), 1, 8, f"{where}.rows")
    for i, r in enumerate(v["rows"]):
      L(r.get("label"), f"{where}.rows[{i}].label")
      if not isinstance(r.get("value"), str): raise Bad(f"{where}.rows[{i}].value: pre-formatted string")
      if r.get("op") is not None and r["op"] not in OPS: raise Bad(f"{where}.rows[{i}].op: one of {sorted(OPS)}")
    res = v.get("result") or {}
    L(res.get("label"), f"{where}.result.label")
    if not isinstance(res.get("value"), str): raise Bad(f"{where}.result.value: pre-formatted string")
  elif k == "bars":
    count(v.get("items"), 2, 6, f"{where}.items")
    for i, b in enumerate(v["items"]): L(b.get("label"), f"{where}.items[{i}].label"); num(b.get("value"), f"{where}.items[{i}].value"); tone(b.get("tone"), f"{where}.items[{i}].tone")
  elif k == "line":
    count(v.get("series"), 1, 3, f"{where}.series")
    for i, s in enumerate(v["series"]):
      L(s.get("name"), f"{where}.series[{i}].name"); tone(s.get("tone"), f"{where}.series[{i}].tone")
      count(s.get("points"), 5, 60, f"{where}.series[{i}].points")
      for p in s["points"]: num(p, f"{where}.series[{i}].points")
    opt_L(v.get("x_label"), f"{where}.x_label", short=True); opt_L(v.get("y_label"), f"{where}.y_label", short=True)
    for i, m in enumerate(v.get("marks") or []): num(m.get("x"), f"{where}.marks[{i}].x"); L(m.get("label"), f"{where}.marks[{i}].label")
  elif k == "candles":
    count(v.get("bars"), 1, 40, f"{where}.bars")
    for i, b in enumerate(v["bars"]):
      if not (isinstance(b, list) and len(b) == 4): raise Bad(f"{where}.bars[{i}]: [open, high, low, close]")
      o, h, l, c = [num(x, f"{where}.bars[{i}]") for x in b]
      if h < max(o, c) or l > min(o, c) or h < l: raise Bad(f"{where}.bars[{i}]: high must be >= open/close >= low ({b})")
    if v.get("volume") is not None:
      count(v["volume"], len(v["bars"]), len(v["bars"]), f"{where}.volume")
    for i, lv in enumerate(v.get("levels") or []): num(lv.get("y"), f"{where}.levels[{i}].y"); L(lv.get("label"), f"{where}.levels[{i}].label"); tone(lv.get("tone"), f"{where}.levels[{i}].tone")
    for i, m in enumerate(v.get("marks") or []):
      if not isinstance(m.get("i"), int) or not (0 <= m["i"] < len(v["bars"])): raise Bad(f"{where}.marks[{i}].i: bar index out of range")
      L(m.get("label"), f"{where}.marks[{i}].label"); tone(m.get("tone"), f"{where}.marks[{i}].tone")
  elif k == "mindmap":
    L(v.get("center"), f"{where}.center")
    count(v.get("branches"), 3, 6, f"{where}.branches")
    for i, b in enumerate(v["branches"]):
      L(b.get("label"), f"{where}.branches[{i}].label"); tone(b.get("tone"), f"{where}.branches[{i}].tone")
      count(b.get("points"), 1, 4, f"{where}.branches[{i}].points")
      for j, p in enumerate(b["points"]): L(p, f"{where}.branches[{i}].points[{j}]")
  elif k == "story":
    count(v.get("panels"), 3, 6, f"{where}.panels")
    for i, p in enumerate(v["panels"]):
      if p.get("who") not in CHARS: raise Bad(f"{where}.panels[{i}].who: one of {sorted(CHARS)}")
      if p.get("mood") is not None and p["mood"] not in MOODS: raise Bad(f"{where}.panels[{i}].mood: one of {sorted(MOODS)}")
      L(p.get("say"), f"{where}.panels[{i}].say", allow_banned=p["who"] == "tipster")
    opt_L(v.get("moral"), f"{where}.moral")
  else:
    raise Bad(f"{where}: unknown visual kind '{k}'")
  return v

def quiz_item(q, where):
  L(q.get("stem"), f"{where}.stem")
  opts = q.get("options")
  count(opts, 4, 4, f"{where}.options")
  right = [i for i, o in enumerate(opts) if o.get("correct") is True]
  if len(right) != 1: raise Bad(f"{where}: exactly one option must have correct: true (found {len(right)})")
  for i, o in enumerate(opts): L(o.get("text"), f"{where}.options[{i}]", allow_banned=o.get("correct") is not True)
  L(q.get("explanation"), f"{where}.explanation")
  return q

def load(name):
  p = os.path.join(SRC, name)
  with open(p, encoding="utf-8") as f:
    try: return json.load(f)
    except json.JSONDecodeError as e: raise Bad(f"{name}: invalid JSON: {e}")

# strategy is {en, hi, dv} (or a legacy English string / null). The sessions.strategy column keeps the English
# name; the translated name rides in content.tags.strategy so the session header chip follows the learner's language.
def strategy_en(d):
  s = d.get("strategy")
  return s["en"] if isinstance(s, dict) else s

def tags_with_strategy(d):
  s = d.get("strategy")
  return {**d["tags"], "strategy": s} if isinstance(s, dict) else d["tags"]

def validate_day(d, name):
  w = name
  if not isinstance(d.get("day"), int) or not 1 <= d["day"] <= 21: raise Bad(f"{w}: day 1..21")
  L(d.get("title"), f"{w}.title")
  tags = d.get("tags") or {}
  for k in ("concept", "ai_lab", "psychology"): L(tags.get(k), f"{w}.tags.{k}")
  s = d.get("strategy")
  if isinstance(s, dict): L(s, f"{w}.strategy")
  elif s is not None and not isinstance(s, str): raise Bad(f"{w}.strategy: {{en, hi, dv}}, string or null")
  visual(d.get("story"), f"{w}.story")
  if d["story"]["kind"] != "story": raise Bad(f"{w}.story: kind must be story")
  count(d.get("topics"), 4, 6, f"{w}.topics")
  nvis = 0
  for i, t in enumerate(d["topics"]):
    L(t.get("h"), f"{w}.topics[{i}].h"); L(t.get("p"), f"{w}.topics[{i}].p", allow_banned=bool(t.get("scam_example")))
    opt_L(t.get("example"), f"{w}.topics[{i}].example", allow_banned=bool(t.get("scam_example"))); opt_L(t.get("remember"), f"{w}.topics[{i}].remember")
    if t.get("visual") is not None: visual(t["visual"], f"{w}.topics[{i}].visual"); nvis += 1
  if nvis < 2: raise Bad(f"{w}: at least 2 topics need a visual (found {nvis})")
  count(d.get("key_terms"), 3, 6, f"{w}.key_terms")
  for i, k in enumerate(d["key_terms"]): L(k.get("term"), f"{w}.key_terms[{i}].term"); L(k.get("meaning"), f"{w}.key_terms[{i}].meaning")
  visual(d.get("mindmap"), f"{w}.mindmap")
  if d["mindmap"]["kind"] != "mindmap": raise Bad(f"{w}.mindmap: kind must be mindmap")
  L(d.get("kaam"), f"{w}.kaam")
  count(d.get("kaam_steps"), 3, 6, f"{w}.kaam_steps")
  for i, s in enumerate(d["kaam_steps"]): L(s, f"{w}.kaam_steps[{i}]")
  if not isinstance(d.get("kaam_min"), int) or not 5 <= d["kaam_min"] <= 90: raise Bad(f"{w}.kaam_min: 5-90")
  L(d.get("outcome"), f"{w}.outcome")
  count(d.get("tools"), 1, 6, f"{w}.tools")
  for i, t in enumerate(d["tools"]): L(t, f"{w}.tools[{i}]")
  opt_L(d.get("fun"), f"{w}.fun")
  if d.get("compliance") is not None:
    c = d["compliance"]
    if not isinstance(c, str) or DEVA.search(c): raise Bad(f"{w}.compliance: English string or null")
    if re.search(r"draft|pending|sign-?off", c, re.I): raise Bad(f"{w}.compliance: internal status text must not be shown to learners")
  count(d.get("prompts"), 1, 3, f"{w}.prompts")
  for i, p in enumerate(d["prompts"]):
    L(p.get("title"), f"{w}.prompts[{i}].title")
    if not isinstance(p.get("body"), str) or len(p["body"]) < 80 or DEVA.search(p["body"]): raise Bad(f"{w}.prompts[{i}].body: English prompt, 80+ chars")
    if BANNED_RE.search(p["body"]): raise Bad(f"{w}.prompts[{i}].body: promise language")
  L(d.get("journal_prompt"), f"{w}.journal_prompt")
  L(d.get("motivation"), f"{w}.motivation")
  count(d.get("quiz"), 5, 5, f"{w}.quiz")
  for i, q in enumerate(d["quiz"]): quiz_item(q, f"{w}.quiz[{i}]")
  return d

# ---- conversion ----
def shuffled(q, rng, target):
  """Place the correct option at `target` (0-3), distractors in a seeded order. Returns the app/DB question shape."""
  right = next(o for o in q["options"] if o["correct"])
  wrong = [o for o in q["options"] if not o["correct"]]
  rng.shuffle(wrong)
  order = wrong[:target] + [right] + wrong[target:]
  return {
    "stem_en": q["stem"]["en"], "stem_hi": q["stem"]["hi"], "stem_dv": q["stem"]["dv"],
    "options": [{"en": o["text"]["en"], "hi": o["text"]["hi"], "dv": o["text"]["dv"], "distractor": not o["correct"]} for o in order],
    "correct_index": target,
    "explanation_en": q["explanation"]["en"], "explanation_hi": q["explanation"]["hi"], "explanation_dv": q["explanation"]["dv"],
    "marks": 1, "difficulty": 1,
  }

def balanced_targets(n, seed):
  """n answer positions spread evenly over A-D, in a seeded order (no position more than ceil(n/4))."""
  base = [i % 4 for i in range(n)]
  random.Random(seed).shuffle(base)
  return base

def exists():
  return len(glob.glob(os.path.join(SRC, "day*.json"))) == 21

EXAM_FILES = ((1, "exam_w1.json", 15, 2), (2, "exam_w2.json", 15, 2), (3, "exam_w3.json", 15, 2), (None, "exam_final.json", 30, 1))
def exams_exist():
  """All four v3 exam banks are authored. Until then build() returns no exam banks and gen_content.py keeps
  the v2 weekend banks, so the 21 v3 days can ship before the exam papers are written."""
  return all(os.path.exists(os.path.join(SRC, name)) for _, name, _, _ in EXAM_FILES)

def build():
  """Returns (weeks, sessions, quizzes, exam_banks) for Tier 1. Raises Bad on any validation error."""
  weeks_src = load("weeks.json")
  count(weeks_src, 3, 3, "weeks.json")
  weeks = []
  for wk in weeks_src:
    L(wk.get("title"), f"weeks.json[{wk.get('number')}].title")
    weeks.append({"level": "foundation", "number": wk["number"], "title_en": wk["title"]["en"], "title_hi": wk["title"]["hi"], "title_dv": wk["title"]["dv"], "theme_accent": wk.get("accent", "#00AEEF")})
  sessions, quizzes = [], []
  all_q = []
  for day in range(1, 22):
    name = f"day{day:02d}.json"
    d = validate_day(load(name), name)
    if d["day"] != day: raise Bad(f"{name}: day field says {d['day']}")
    week = (day - 1) // 7 + 1
    sessions.append({
      "number": day, "level": "foundation", "week": week, "day": day - (week - 1) * 7, "course_day": day,
      "title_en": d["title"]["en"], "title_hi": d["title"]["hi"], "title_dv": d["title"]["dv"],
      "core_concept": d["tags"]["concept"]["en"], "ai_lab": d["tags"]["ai_lab"]["en"], "psychology": d["tags"]["psychology"]["en"],
      "strategy": strategy_en(d), "duration_min": d.get("duration_min", 60), "video_url": None, "video_provider": "youtube_unlisted",
      "is_published": True, "draft": False, "summary_hi": d["outcome"]["hi"],
      "content": {"v": 2, "story": d["story"], "topics": d["topics"], "key_terms": d["key_terms"], "mindmap": d["mindmap"],
                  "kaam": d["kaam"], "kaam_steps": d["kaam_steps"], "kaam_min": d["kaam_min"], "outcome": d["outcome"], "tools": d["tools"],
                  "fun": d.get("fun"), "compliance": d.get("compliance"), "journal_prompt": d["journal_prompt"], "motivation": d["motivation"], "tags": tags_with_strategy(d)},
      "prompts": [{"title": p["title"], "level": "foundation", "platform": "any", "body": p["body"]} for p in d["prompts"]],
    })
    all_q.append((day, d["quiz"]))
  targets = balanced_targets(sum(len(q) for _, q in all_q), 20260919)
  t = 0
  for day, qs in all_q:
    rng = random.Random(1000 + day)
    out = []
    for q in qs:
      out.append(shuffled(q, rng, targets[t])); t += 1
    quizzes.append({"session": day, "questions": out})
  exam_banks = []
  for wk, name, size, marks in (EXAM_FILES if exams_exist() else ()):
    b = load(name)
    if b.get("week") != wk: raise Bad(f"{name}: week must be {wk}")
    count(b.get("questions"), size, size, f"{name}.questions")
    for i, q in enumerate(b["questions"]): quiz_item(q, f"{name}.questions[{i}]")
    tg = balanced_targets(size, 7000 + (wk or 9))
    rng = random.Random(5000 + (wk or 9))
    exam_banks.append({"level": "foundation", "week": wk, "questions": [dict(shuffled(q, rng, tg[i]), marks=marks) for i, q in enumerate(b["questions"])]})
  stems = {}
  for qz in quizzes:
    for q in qz["questions"]: stems.setdefault(q["stem_en"].strip().lower(), []).append(f"S{qz['session']}")
  dup = {k: v for k, v in stems.items() if len(v) > 1}
  if dup: raise Bad(f"duplicate quiz stems: {list(dup.items())[:3]}")
  longest = sum(1 for qz in quizzes for q in qz["questions"] if max(range(4), key=lambda i: len(q["options"][i]["en"])) == q["correct_index"])
  total = sum(len(qz["questions"]) for qz in quizzes)
  if longest / total > 0.4:
    raise Bad(f"the correct option is the longest English option in {longest}/{total} session questions (max 40%) — lengthen the distractors")
  return weeks, sessions, quizzes, exam_banks

if __name__ == "__main__":
  try:
    if len(sys.argv) > 1:
      for n in sys.argv[1:]:
        n = os.path.basename(n)
        if n.startswith("day"): validate_day(load(n), n)
        elif n.startswith("exam"):
          b = load(n)
          for i, q in enumerate(b.get("questions") or []): quiz_item(q, f"{n}.questions[{i}]")
        print("ok", n)
    else:
      w, s, q, e = build()
      nv = sum(1 + sum(1 for t in x["content"]["topics"] if t.get("visual")) + 1 for x in s)
      print(f"Stage 1 OK: {len(w)} weeks, {len(s)} days, {sum(len(x['questions']) for x in q)} quiz Q, {sum(len(b['questions']) for b in e)} exam Q, {nv} visuals")
  except Bad as err:
    print("CONTENT ERROR:", err); sys.exit(1)
