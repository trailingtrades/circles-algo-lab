#!/usr/bin/env python3
"""Generates the v0 content skeleton for 5C Learn from master prompt §8 (decision Q1-C).
Every session is marked draft:true — Rahul edits titles/concepts/prompts in the admin editor (Phase 5) or in these JSON files.
Re-run: python3 scripts/gen_content.py  (idempotent; overwrites content/*.json)"""
import json, os
ROOT = os.path.join(os.path.dirname(__file__), "..", "content")

LEVELS = [
  {"slug":"foundation","sequence":1,"title_en":"Foundation","title_hi":"Foundation","sessions":"1-20","unlock_rule":"always"},
  {"slug":"intermediate","sequence":2,"title_en":"Intermediate","title_hi":"Intermediate","sessions":"21-40","unlock_rule":"previous_level_certificate"},
  {"slug":"advanced","sequence":3,"title_en":"Advanced","title_hi":"Advanced","sessions":"41-60","unlock_rule":"previous_level_certificate"},
]
# (week title Hinglish, week title EN, accent, [ (title_en, title_hi, core_concept, ai_lab, psychology) x5 ])
WEEKS = {
 "foundation": [
  ("Bazaar Ki Neenv","Foundations of the market","#00AEEF",[
    ("Why the market exists","Bazaar kyun hai","R-C-D-T-F","Master prompt: setup","Curiosity vs FOMO"),
    ("What a share really is","Share asli mein kya hai","Full Why","5 AI patterns","Ownership mindset"),
    ("Teen Batti: Fact, Guess, Kachra","Teen batti","Fact/Guess/Kachra","LOOT-scan","Confirmation bias"),
    ("The six-item gate","Six-item gate","six-item gate","Master prompt v2","Impatience"),
    ("Friday review: your first week","Friday review","1% rule","Galti-log prompt","Ownership")]),
  ("Company Share aur Keemat","Company, share and price","#134A9A",[
    ("How a company makes money","Company paisa kaise banati hai","Full Why","Annual report reader prompt","Storytelling bias"),
    ("Price vs value","Price aur value alag hain","\"aaj kharidta?\"","Fact/Guess/Kachra sorter","Anchoring"),
    ("Reading a simple P&L","Simple P&L padhna","Full Why","Statement summariser","Overconfidence"),
    ("Investor stories: Kedia to Jhunjhunwala (qualitative)","Investor stories, sirf soch","\"aaj kharidta?\"","Story extractor prompt","Hero worship"),
    ("Friday review: week 2","Friday review","1% rule","Galti-log prompt","Discipline nahi, design")]),
  ("Trading Ki Maths","The maths of trading","#f5a623",[
    ("Risk per trade and the 1% rule","1% rule","1% rule","Position size calculator prompt","Loss aversion"),
    ("Price-stop and Why-stop","Price-stop / Why-stop","price-stop / Why-stop","Stop-logic checker","Hope trading"),
    ("The 50% trap","50% trap","50% trap","Drawdown maths prompt","Revenge trading"),
    ("F&O: samjho, khelo mat","F&O: samjho, khelo mat","F&O awareness","SEBI FY26 study reader","Gambling loop"),
    ("Friday review: week 3","Friday review","1% rule","Galti-log prompt","Consistency")]),
  ("AI Algo aur Loot-Proofing","AI, algos and loot-proofing","#4caf50",[
    ("AI as analyst, human as trigger","AI analyst hai, trigger aap","AI = analyst, human = trigger","Master prompt: full","Automation bias"),
    ("The 5 AI patterns","5 AI patterns","5 AI patterns","Pattern drill prompt","Over-reliance"),
    ("LOOT-scan: spotting scams","LOOT-scan","LOOT-scan","LOOT-scan prompt","Greed"),
    ("SEBI retail algo framework (awareness only)","SEBI retail algo framework","SEBI algo framework (01-Apr-2026)","Framework explainer prompt","Rule respect"),
    ("Final review and mock-portfolio handover","Final review","Full Why x2","Mock portfolio reviewer","Discipline nahi, design")]),
 ],
 "intermediate": [
  ("Valuation Ki Gehrai","Depth of valuation","#00AEEF",[
    ("Range and assumptions","Range + assumptions","range+assumptions","Assumption lister prompt","False precision"),
    ("ROCE-pair and DuPont engines","ROCE-pair / DuPont","ROCE-pair/DuPont engines","DuPont decomposer","Complexity bias"),
    ("Value traps","Value trap","value trap","Value-trap screener prompt","Bargain illusion"),
    ("Cyclical-PE inversion","Cyclical-PE inversion","cyclical-PE inversion","Cycle mapper prompt","Recency bias"),
    ("Friday review: week 5","Friday review","process-grades","Galti-log prompt","Patience")]),
  ("Charts Ka Agla Level","Charts, next level","#134A9A",[
    ("The chart-note","Chart-note","chart-note","Chart-note drafter","Pattern seeking"),
    ("A/B/C zones","A/B/C zones","A/B/C zones","Zone labeller prompt","Overtrading"),
    ("Breakout checklist","Breakout checklist","breakout checklist","Checklist enforcer prompt","FOMO"),
    ("Heat-check","Heat-check","heat-check","Heat-check prompt","Euphoria"),
    ("Friday review: week 6","Friday review","process-grades","Galti-log prompt","Discipline")]),
  ("Risk Ka Engineering","Engineering risk","#f5a623",[
    ("Drawdown pyramid","Drawdown pyramid","drawdown pyramid","Drawdown simulator prompt","Denial"),
    ("Circuit-breaker rules","Circuit-breaker","circuit-breaker","Rule writer prompt","Tilt"),
    ("Expectancy","Expectancy","expectancy","Expectancy calculator prompt","Outcome bias"),
    ("Process-grades A to F","Process-grades","process-grades","Process grader prompt","Result fixation"),
    ("Friday review: week 7","Friday review","process-grades","Galti-log prompt","Honesty")]),
  ("AI Power-User & Capstone","AI power-user and capstone","#4caf50",[
    ("Prompt chains for research","Prompt chains","master prompt","Chain builder prompt","Automation bias"),
    ("Investor stories: Damani and Pabrai (qualitative)","Investor stories, sirf soch","\"aaj kharidta?\"","Story extractor prompt","Cloning trap"),
    ("One-pager v3","One-pager v3","one-pager v3","One-pager drafter","Verbosity"),
    ("Capstone: valuation note + chart-note","Capstone","valuation note + chart-note","Capstone reviewer prompt","Perfectionism"),
    ("Final review","Final review","process-grades","Galti-log prompt","Ownership")]),
 ],
 "advanced": [
  ("Business Ki Forensics","Business forensics","#00AEEF",[
    ("Two-stories rule","Two-stories rule","two-stories rule","Two-stories prompt","Narrative bias"),
    ("Cash-conversion","Cash-conversion","cash-conversion","Cash-conversion checker","Accrual blindness"),
    ("Three clocks, five roads","Three clocks / five roads","three clocks · five roads","Clock mapper prompt","Time blindness"),
    ("Incremental ROCE and fresh-Rs100","Incremental ROCE / fresh-₹100","incremental ROCE · fresh-₹100","Incremental ROCE prompt","Headline bias"),
    ("Friday review: week 9","Friday review","promise-ledger","Galti-log prompt","Skepticism")]),
  ("Valuation Studio","Valuation studio","#134A9A",[
    ("Owner earnings and FCF-yield","Owner earnings / FCF-yield","owner earnings · FCF-yield","Owner earnings prompt","Precision illusion"),
    ("Reverse-DCF","Reverse-DCF","reverse-DCF","Reverse-DCF prompt","Expectation gap"),
    ("Variant perception","Variant perception","variant perception","Variant perception prompt","Consensus comfort"),
    ("Compare-card and bear-ceiling","Compare-card / bear-ceiling","compare-card · bear-ceiling","Compare-card prompt","Optimism"),
    ("Friday review: week 10","Friday review","promise-ledger","Galti-log prompt","Humility")]),
  ("Portfolio Pro","Portfolio pro","#f5a623",[
    ("Evidence tiers T0-T3","Evidence-tiers T0–T3","evidence-tiers T0–T3","Evidence tier sorter","Source blindness"),
    ("The honest mirror","Honest mirror","honest mirror","Honest mirror prompt","Self-deception"),
    ("Thesis-memo","Thesis-memo","thesis-memo","Thesis-memo drafter","Thesis-creep"),
    ("Predict-first and thesis-creep","Predict-first / thesis-creep","predict-first · thesis-creep","Predict-first logger","Hindsight bias"),
    ("Friday review: week 11","Friday review","promise-ledger","Galti-log prompt","Consistency")]),
  ("Professional's Craft","The professional's craft","#4caf50",[
    ("Three-pass red-team","Three-pass red-team","three-pass red-team","Red-team prompt","Ego"),
    ("Investor stories: Munger and Buffett (qualitative)","Investor stories, sirf soch","\"aaj kharidta?\"","Story extractor prompt","Idol copying"),
    ("The 8-page dossier","8-page dossier","dossier","Dossier assembler prompt","Scope creep"),
    ("Pehla Kadam","Pehla Kadam","Pehla Kadam","First-step planner prompt","Paralysis"),
    ("The oath and final review","The oath","the oath","Galti-log prompt","Commitment")]),
 ],
}
RESOURCES = {
 "foundation": {"decks":[104,90,84,76],"deck_versions":["v1.1","v1","v1","v1"],"workbook":True,"excel":True},
 "intermediate": {"decks":[70,67,68,62],"deck_versions":["v1"]*4,"workbook":True,"excel":False},
 "advanced": {"decks":[69,67,67,64],"deck_versions":["v1"]*4,"workbook":True,"excel":False},
}
PROMPT = """You are my research analyst. I am the decision-maker; you never place trades or give buy/sell advice.
Session {n} · {title_en} · Concept: {concept}
Task: {ai_lab}
Rules:
1. Separate every claim into Fact / Guess / Kachra and label it.
2. Use only the data I paste below; if something is missing, say "missing" instead of guessing.
3. No return forecasts, no targets, no "sure" language. Educational analysis only.
4. End with three questions I should answer myself before acting.
Data:
<paste here>"""

levels, weeks, sessions, resources = [], [], [], []
n = 0
for L in LEVELS:
  levels.append({k: L[k] for k in ("slug","sequence","title_en","title_hi","unlock_rule")})
  for wi, (wt_hi, wt_en, accent, days) in enumerate(WEEKS[L["slug"]], start=1):
    weeks.append({"level":L["slug"],"number":wi,"title_en":wt_en,"title_hi":wt_hi,"theme_accent":accent})
    r = RESOURCES[L["slug"]]
    resources.append({"level":L["slug"],"week":wi,"kind":"deck","file_name":f"5C_AITC_{L['slug'].title()}_W{wi}_Deck_{r['deck_versions'][wi-1]}.pptx","note":f"{r['decks'][wi-1]} slides","storage_path":None})
    resources.append({"level":L["slug"],"week":wi,"kind":"handout","file_name":f"5C_AITC_{L['slug'].title()}_W{wi}_Handout.pdf","note":"11 pages","storage_path":None})
    if wi < 4: resources.append({"level":L["slug"],"week":wi,"kind":"exam","file_name":f"5C_AITC_{L['slug'].title()}_W{wi}_Exam.pdf","note":"weekly exam paper","storage_path":None})
    for di, (te, th, concept, ai, psy) in enumerate(days, start=1):
      n += 1
      sessions.append({"number":n,"level":L["slug"],"week":wi,"day":di,"title_en":te,"title_hi":th,"core_concept":concept,"ai_lab":ai,"psychology":psy,
                       "duration_min":60,"video_url":None,"video_provider":"youtube_unlisted","is_published":True,"draft":True,
                       "summary_hi":f"Aaj ka core concept: {concept}. AI Lab mein {ai}. Psychology angle: {psy}.",
                       "prompts":[{"title":ai,"level":L["slug"],"platform":"any","body":PROMPT.format(n=n,title_en=te,concept=concept,ai_lab=ai)}]})
  resources.append({"level":L["slug"],"week":None,"kind":"exam","file_name":f"5C_AITC_{L['slug'].title()}_Final_Exam_36Q.pdf","note":"final exam, 36 questions","storage_path":None})
  resources.append({"level":L["slug"],"week":None,"kind":"workbook","file_name":f"5C_AITC_{L['slug'].title()}_Workbook_12pp.pdf","note":"12-page workbook","storage_path":None})
  if RESOURCES[L["slug"]]["excel"]: resources.append({"level":L["slug"],"week":None,"kind":"excel","file_name":"5C_AITC_MockPortfolio.xlsx","note":"virtual Rs 10 lakh mock portfolio","storage_path":None})
resources.append({"level":None,"week":None,"kind":"link","file_name":"Circles Algo Lab — AI Trading Command Centre","note":"existing dashboard, opens in a new tab","storage_path":"https://algo.circleoptionlab.com"})

exams = []
for L in LEVELS:
  for wi in (1,2,3): exams.append({"level":L["slug"],"week":wi,"title":f"{L['title_en']} Week {wi} exam","total_marks":50,"pass_marks":30,"distinction_marks":42,"time_limit_min":30,"attempts_allowed":2})
  exams.append({"level":L["slug"],"week":None,"title":f"{L['title_en']} Final exam","total_marks":36,"pass_marks":22,"distinction_marks":30,"time_limit_min":60,"attempts_allowed":2})

# Foundation W1 quizzes: authored from the canonical vocabulary. Every other session ships with an empty bank until Rahul fills it.
Q = {
 1:[("What does the 'R' in R-C-D-T-F stand for in this course?","R-C-D-T-F mein 'R' kya hai?",[("Risk","Risk",False),("Return","Return",True),("Rumour","Rumour",True),("Ratio","Ratio",True)],"Check the Session 1 deck: R-C-D-T-F is the course's own frame for reading any market claim. Your notes carry the exact expansion."),
    ("Who is the 'trigger' in this course's AI rule?","Is course ke AI rule mein 'trigger' kaun hai?",[("The AI model","AI model",True),("The human","Insaan",False),("The broker","Broker",True),("The news channel","News channel",True)],"AI = analyst, human = trigger. AI research karta hai; decision aap lete hain."),
    ("Which of these is a course-approved way to describe F&O?","F&O ke liye course ka approved line kaun sa hai?",[("Samjho, khelo mat","Samjho, khelo mat",False),("Quick doubling tool","Paisa double karne ka tool",True),("Risk-free hedge","Risk-free hedge",True),("Only for experts","Sirf experts ke liye",True)],"Course-wide law: F&O = samjho, khelo mat. Awareness only, every level.")],
 2:[("A 'Full Why' must contain at least how many independent reasons?","'Full Why' mein kam se kam kitne independent reasons chahiye?",[("One","Ek",True),("Two","Do",False),("Five","Paanch",True),("Ten","Das",True)],"Full Why x2 is the mock-portfolio gate: two independent reasons, each one you could defend to a stranger."),
    ("Owning a share makes you:","Share kharidne par aap ban jaate hain:",[("A lender to the company","Company ke lender",True),("A part-owner of the business","Business ke part-owner",False),("A customer of the exchange","Exchange ke customer",True),("A guaranteed earner","Pakka kamaane wale",True)],"A share is part-ownership. That is why the course asks for a business 'why', not a price 'why'."),
    ("Which of the 5 AI patterns should you run FIRST on a new stock idea?","Naye stock idea par sabse pehle kaun sa AI pattern?",[("Summarise the annual report","Annual report summarise",False),("Ask for a price target","Price target maango",True),("Ask if it will go up","Upar jayega kya, poochho",True),("Ask for a tip","Tip maango",True)],"Pattern 1 is always evidence-gathering. Targets and tips are never a pattern in this course.")],
 3:[("A broker's note says 'stock will double by Diwali'. Under teen batti this is:","Broker note: 'Diwali tak double'. Teen batti mein ye kya hai?",[("Fact","Fact",True),("Guess","Guess",True),("Kachra","Kachra",False),("Data","Data",True)],"A promise with no evidence and a fixed return is Kachra. Guesses have reasoning; Kachra has only a claim."),
    ("'Revenue grew 18% YoY per the audited annual report' is:","'Audited report ke hisaab se revenue 18% badha' ye kya hai?",[("Fact","Fact",False),("Guess","Guess",True),("Kachra","Kachra",True),("Opinion","Opinion",True)],"Audited, sourced, past-tense: Fact. Fact does not mean 'buy'; it just means verified."),
    ("What is LOOT-scan for?","LOOT-scan kis kaam ka hai?",[("Finding multibaggers","Multibagger dhoondhna",True),("Spotting scam and loot patterns in a pitch","Pitch mein scam/loot pattern pakadna",False),("Timing entries","Entry time karna",True),("Ranking brokers","Broker rank karna",True)],"LOOT-scan is the course's scam detector. Run it on every unsolicited tip before you even read the stock name.")],
 4:[("How many items are in the six-item gate?","Six-item gate mein kitne items hain?",[("Four","Chaar",True),("Six","Chhe",False),("Eight","Aath",True),("Twelve","Baarah",True)],"Six. The gate exists so a stock has to pass the same six checks every time, regardless of how good it feels."),
    ("If a stock passes 5 of 6 gate items you should:","Stock 6 mein se 5 pass kare to:",[("Buy a small quantity","Thoda kharido",True),("Wait until all six pass","Chhe pass hone tak ruko",False),("Ask AI to override","AI se override karwao",True),("Skip the gate","Gate skip karo",True)],"The gate is binary. 'Almost' is how the 50% trap starts."),
    ("The six-item gate is applied:","Six-item gate kab lagta hai?",[("Only on IPOs","Sirf IPO par",True),("Before every mock-portfolio entry","Har mock-portfolio entry se pehle",False),("Only in Advanced level","Sirf Advanced mein",True),("Once a year","Saal mein ek baar",True)],"Every entry, every time. Discipline nahi, design.")],
 5:[("The 1% rule limits:","1% rule kis cheez ko limit karta hai?",[("Profit per trade","Har trade ka profit",True),("Risk per trade as a share of capital","Capital ka kitna risk ek trade mein",False),("Number of trades per day","Din mein trades",True),("Brokerage","Brokerage",True)],"1% of capital is the maximum you allow one idea to cost you. It caps the damage, not the upside."),
    ("A Friday review is about:","Friday review kis baare mein hai?",[("Counting profit","Profit ginna",True),("Reviewing process and galti-log","Process aur galti-log review",False),("Picking next week's winners","Agle hafte ke winners",True),("Ranking classmates","Classmates ki ranking",True)],"Return copy nahi hota, process hota hai. Friday review grades the process, never the P&L."),
    ("Your galti-log should record:","Galti-log mein kya likhna hai?",[("Only losing trades","Sirf losing trades",True),("Every process mistake, win or lose","Har process galti, jeet ya haar",False),("Broker complaints","Broker complaints",True),("Market news","Market news",True)],"A winning trade with a broken process is still a galti. Log the process, not the outcome.")],
}
quizzes = []
for s in sessions:
  bank = []
  for (se, sh, opts, expl) in Q.get(s["number"], []):
    options = [{"en":oe,"hi":oh,"distractor":bool(d)} for (oe,oh,d) in opts]
    correct = next(i for i,(oe,oh,d) in enumerate(opts) if not d)
    bank.append({"stem_en":se,"stem_hi":sh,"options":options,"correct_index":correct,"explanation_en":expl,"explanation_hi":expl,"marks":1,"difficulty":1})
  quizzes.append({"session":s["number"],"questions":bank})

vocab = {"foundation":["R-C-D-T-F","teen batti","Full Why","six-item gate","1% rule","price-stop / Why-stop","50% trap","\"aaj kharidta?\"","Fact/Guess/Kachra","LOOT-scan","master prompt","5 AI patterns","\"discipline nahi, design\""],
 "intermediate":["range+assumptions","ROCE-pair/DuPont engines","value trap","cyclical-PE inversion","chart-note","A/B/C zones","breakout checklist","heat-check","drawdown pyramid / circuit-breaker","expectancy","process-grades","one-pager v3"],
 "advanced":["two-stories rule","cash-conversion","three clocks","five roads","incremental ROCE","fresh-₹100","promise-ledger","owner earnings","FCF-yield","reverse-DCF","variant perception","compare-card","bear-ceiling","evidence-tiers T0–T3","honest mirror","thesis-memo","predict-first","thesis-creep","three-pass red-team","Pehla Kadam","the oath"],
 "laws":["F&O = samjho, khelo mat (every level)","Investor stories qualitative only: no returns, no picks (Kedia → Jhunjhunwala → Damani → Pabrai → Munger → Buffett)","AI = analyst, human = trigger","SEBI retail algo framework live since 01-Apr-2026: awareness only","Return copy nahi hota, process hota hai","Only F&O-loss stat permitted: SEBI FY26 study (Aug 2026) — 87.7% of individual F&O traders in net loss, aggregate net loss Rs 91,685 cr, avg Rs 1.17 lakh per loss-making trader"]}

def w(name, obj):
  with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f: json.dump(obj, f, ensure_ascii=False, indent=1); f.write("\n")
w("levels.json", levels); w("weeks.json", weeks); w("resources.json", resources); w("exams.json", exams); w("vocabulary.json", vocab)
by_level = {}
for s in sessions: by_level.setdefault(s["level"], []).append(s)
for lv, arr in by_level.items(): w(f"sessions/{lv}.json", arr)
w("quizzes/foundation-w1.json", [q for q in quizzes if q["questions"]])
w("quizzes/_empty-banks.json", [q["session"] for q in quizzes if not q["questions"]])
print(len(levels), "levels,", len(weeks), "weeks,", len(sessions), "sessions,", len(resources), "resources,", len(exams), "exams,", sum(len(q["questions"]) for q in quizzes), "questions")
