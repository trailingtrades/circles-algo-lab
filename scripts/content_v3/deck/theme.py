# -*- coding: utf-8 -*-
"""Look and fixed words of the Stage 1 (CIRCLE S.M.A.R.T) week decks.

The palette is the S.M.A.R.T app's light theme (apps/learn/src/styles/winners.css, [data-theme=light], and the
text-safe tone shades in styles/visuals.css), so a projected slide and the learner's phone read as one product.
Two brand-kit rules are built in here, so a slide cannot break them by accident:
  - never white text on cyan #00AEEF (2.5:1). Cyan is an accent fill with ink text on it; white text sits on
    navy #134A9A or darker.
  - the credential footer goes on every slide, and the last slide is the Tier-1 disclaimer, verbatim, read from
    scripts/ci/canonical/tier1.txt (the same file CI byte-compares the app against).
"""
from __future__ import annotations

import os

from pptx.dml.color import RGBColor

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))


def rgb(h: str) -> RGBColor:
    return RGBColor.from_string(h.lstrip("#").upper())


# ---- ground, cards, ink (app light theme) ----
BG = rgb("F4F7FB")        # --bg: the off-white ground
CARD = rgb("FFFFFF")      # --panel
CARD2 = rgb("EEF3F9")     # --panel-2
LINE = rgb("D3DEE7")      # --line
LINE2 = rgb("A9BCCB")     # --line-2
INK = rgb("18232F")       # --ink
INK2 = rgb("47596B")      # --ink-2
INK3 = rgb("57687A")      # --ink-3 (5.2:1 on the ground)
WHITE = rgb("FFFFFF")

# ---- brand ----
CYAN = rgb("00AEEF")      # accent fill only; text on it is INK / NAVY_DEEP
CYAN_SOFT = rgb("E0F4FC")
MID = rgb("0093D6")       # brand-tone lines and bars (3.3:1 on white, enough for a graphic)
NAVY = rgb("134A9A")      # white text on it is 8.5:1
NAVY_DEEP = rgb("0B1B33") # dark bookend slides (cover, disclaimer)
BRAND_TEXT = rgb("095A90")  # --vz-t-brand (light): brand-coloured TEXT on white / panel-2
DARK_TX = rgb("E8EEF6")   # text on the dark bookends
DARK_TX2 = rgb("A8B8CE")

# ---- tones: fill (shapes, lines) / text (AA on white) / soft (tinted card) ----
TONE_FILL = {"brand": MID, "up": rgb("16A34A"), "down": rgb("F0554E"), "gold": rgb("F5A524"), "muted": INK3}
TONE_TEXT = {"brand": BRAND_TEXT, "up": rgb("166534"), "down": rgb("991B1B"), "gold": rgb("92400E"), "muted": INK2}
TONE_SOFT = {"brand": rgb("E1F1FA"), "up": rgb("DCF3E4"), "down": rgb("FDE4E3"), "gold": rgb("FEF1DA"), "muted": rgb("E8EDF2")}
BULL, BEAR = TONE_FILL["up"], TONE_FILL["down"]
BULL_VOL, BEAR_VOL = rgb("A7DDB9"), rgb("F8B9B6")   # the app draws volume at 45% opacity; these are that tint on white


def tone(t, default="brand"):
    return t if t in TONE_FILL else default


# ---- one accent per week (weeks.json accent), with the text colour that is safe ON it and AS text ----
WEEK_ACCENT = {
    1: {"fill": CYAN, "on": NAVY_DEEP, "text": BRAND_TEXT, "soft": CYAN_SOFT},
    2: {"fill": NAVY, "on": WHITE, "text": NAVY, "soft": rgb("E3EAF5")},
    3: {"fill": rgb("F5A623"), "on": NAVY_DEEP, "text": rgb("92400E"), "soft": rgb("FEF1DA")},
}

# ---- story cast: name colour (AA as text on white) doubles as the avatar fill under white initials ----
CAST = {
    "mentor": {"en": "Mentor", "hi": "Mentor", "colour": rgb("0A669F"), "initial": "M"},
    "aman": {"en": "Aman", "hi": "Aman", "colour": rgb("0F766E"), "initial": "A"},
    "priya": {"en": "Priya", "hi": "Priya", "colour": rgb("4338CA"), "initial": "P"},
    "tipster": {"en": "Tip-wala", "hi": "Tip-wala", "colour": rgb("991B1B"), "initial": "T"},
}

# ---- type ----
# IBM Plex Sans is the app face, but it is not installed on the machines that project these decks, and PowerPoint
# substitutes an unknown face with different widths (text that fit here would overflow there). Segoe UI is the app's
# own fallback in --ff and ships with Windows and Office, so what is measured here is what the room sees.
FONT = "Segoe UI"
FONT_FILES = {
    "regular": "C:/Windows/Fonts/segoeui.ttf",
    "bold": "C:/Windows/Fonts/segoeuib.ttf",
    "italic": "C:/Windows/Fonts/segoeuii.ttf",
    "bolditalic": "C:/Windows/Fonts/segoeuiz.ttf",
}

FOOTER = "5 Circles Pvt Ltd · SEBI RA INH000020004"
LOGO = os.path.join(REPO, "apps", "learn", "public", "brand", "logo.png")
LOGO_WHITE = os.path.join(REPO, "apps", "learn", "public", "brand", "logo-white.png")
TIER1_FILE = os.path.join(REPO, "scripts", "ci", "canonical", "tier1.txt")


def tier1() -> str:
    """The approved Tier-1 disclaimer, byte for byte (never retyped here, so it cannot drift)."""
    with open(TIER1_FILE, encoding="utf-8") as f:
        return f.read()


# ---- fixed words the deck prints itself: en = English deck, hi = Hinglish deck (Roman script only) ----
UI = {
    "stage": {"en": "CIRCLE S.M.A.R.T", "hi": "CIRCLE S.M.A.R.T"},
    "stage1": {"en": "Stage 1", "hi": "Stage 1"},
    "week": {"en": "Week", "hi": "Week"},
    "day": {"en": "Day", "hi": "Day"},
    "min": {"en": "min", "hi": "min"},
    "edition": {"en": "Class deck · English", "hi": "Class deck · Hinglish"},
    "promise": {"en": "Virtual money only. We score the process, never the profit.",
                "hi": "Sirf virtual paisa. Score process ka hota hai, profit ka nahi."},
    "week_map": {"en": "This week, day by day", "hi": "Is hafte ka plan, din-ba-din"},
    "review_day": {"en": "Weekly review", "hi": "Weekly review"},
    "concept": {"en": "Concept", "hi": "Concept"},
    "ai_lab": {"en": "AI Lab", "hi": "AI Lab"},
    "psychology": {"en": "Mindset", "hi": "Mindset"},
    "strategy": {"en": "Strategy", "hi": "Strategy"},
    "story": {"en": "Story", "hi": "Kahani"},
    "lesson": {"en": "The lesson", "hi": "Seekh"},
    "topic": {"en": "Topic", "hi": "Topic"},
    "example": {"en": "Example", "hi": "Udaharan"},
    "remember": {"en": "Remember", "hi": "Yaad rakhiye"},
    "illustrative": {"en": "Illustrative", "hi": "Sirf samjhane ke liye"},
    "key_terms": {"en": "Key terms of the day", "hi": "Aaj ke naye shabd"},
    "recap": {"en": "Recap", "hi": "Recap"},
    "recap_title": {"en": "Today on one page", "hi": "Aaj ka saar, ek page par"},
    "task": {"en": "Today's task", "hi": "Aaj ka kaam"},
    "outcome": {"en": "By the end", "hi": "Aaj ke baad"},
    "tools": {"en": "Tools", "hi": "Tools"},
    "template": {"en": "Your template", "hi": "Aapka template"},
    "game": {"en": "Class activity", "hi": "Class activity"},
    "game_sub": {"en": "Play it with classmates, friends or family. Score the process, not the money.",
                 "hi": "Classmates, dost ya family ke saath kheliye. Score process ka, paise ka nahi."},
    "prompt_lang": {"en": "Prompt opens with", "hi": "Prompt ki shuruaat (English mein)"},
    "ai_how1": {"en": "Copy the prompt from the app", "hi": "App se prompt copy kijiye"},
    "ai_how2": {"en": "Paste it into any AI chat", "hi": "Kisi bhi AI chat mein paste kijiye"},
    "ai_how3": {"en": "Check every Fact yourself", "hi": "Har Fact khud check kijiye"},
    "full_prompt": {"en": "Full prompt: speaker notes, and the AI Lab tab in the app.",
                    "hi": "Poora prompt: speaker notes mein, aur app ke AI Lab tab mein."},
    "ai_rule": {"en": "AI is the analyst; you are the one who decides. Never paste PAN, client ID, passwords, OTPs or API keys into any AI, and never forward AI output as a buy or sell call.",
                "hi": "AI analyst hai, faisla aap karte hain. Kisi bhi AI mein PAN, client ID, password, OTP ya API key kabhi paste mat kijiye, aur AI ka jawab kabhi buy ya sell call bana kar aage mat bhejiye."},
    "quiz": {"en": "Quick quiz", "hi": "Quick quiz"},
    "question": {"en": "Question", "hi": "Sawaal"},
    "vote": {"en": "Think first, then vote: A, B, C or D?", "hi": "Pehle sochiye, phir haath uthaiye: A, B, C ya D?"},
    "journal": {"en": "Journal, tonight", "hi": "Aaj raat ka journal"},
    "next": {"en": "Next", "hi": "Agla"},
    "stage2": {"en": "Stage 2: CIRCLE W.I.N.N.E.R.S", "hi": "Stage 2: CIRCLE W.I.N.N.E.R.S"},
    "disclaimer": {"en": "Disclaimer", "hi": "Disclaimer"},
    "notadvice": {"en": "Educational material. Nothing in this deck is investment advice or a recommendation. Company names and chart prices are made up for illustration.",
                  "hi": "Padhaai ki samagri. Is deck mein kuch bhi investment ki salaah ya recommendation nahi hai. Company ke naam aur chart ke prices sirf samjhane ke liye banaye gaye hain."},
    "continued": {"en": "continued", "hi": "aage"},
    "volume": {"en": "Volume", "hi": "Volume"},
    "high": {"en": "High", "hi": "High"},
    "low": {"en": "Low", "hi": "Low"},
    "open": {"en": "Open", "hi": "Open"},
    "close": {"en": "Close", "hi": "Close"},
    "body": {"en": "Body", "hi": "Body"},
    "upper_wick": {"en": "Upper wick", "hi": "Upper wick"},
    "lower_wick": {"en": "Lower wick", "hi": "Lower wick"},
    "bullish": {"en": "Green candle: close above open", "hi": "Green candle: close, open se upar"},
    "bearish": {"en": "Red candle: close below open", "hi": "Red candle: close, open se neeche"},
    # speaker-notes labels
    "n_answer": {"en": "Answer", "hi": "Sahi jawab"},
    "n_why": {"en": "Why", "hi": "Kyun"},
    "n_example": {"en": "Example", "hi": "Udaharan"},
    "n_remember": {"en": "Remember", "hi": "Yaad rakhiye"},
    "n_visual": {"en": "On the slide", "hi": "Slide par"},
    "n_note": {"en": "Mentor note", "hi": "Mentor note"},
    "n_cover": {"en": "Week deck for class. Each day runs: divider, story, one slide per topic, key terms, recap map, today's task, templates, class activity, AI Lab, a 5-question quiz and the journal close. The talk track for every slide is in these notes. Quiz answers are not in this file: learners answer in the app, where the explanation appears after they submit.",
                "hi": "Class ke liye week deck. Har din ka kram: divider, kahani, har topic ki ek slide, naye shabd, recap map, aaj ka kaam, template, class activity, AI Lab, 5 sawaalon ka quiz aur journal. Har slide ka talk track in notes mein hai. Quiz ke jawab is file mein nahi hain: learner app mein jawab dete hain, aur submit ke baad wahin explanation dikhta hai."},
    "n_cover_mentor": {"en": "MENTOR EDITION, not for learners. Each day runs: divider, story, one slide per topic, key terms, recap map, today's task, templates, class activity, AI Lab, a 5-question quiz and the journal close. The talk track for every slide is in these notes; quiz answers are in the notes only.",
                       "hi": "MENTOR EDITION, learners ke liye nahi. Har din ka kram: divider, kahani, har topic ki ek slide, naye shabd, recap map, aaj ka kaam, template, class activity, AI Lab, 5 sawaalon ka quiz aur journal. Har slide ka talk track in notes mein hai; quiz ke jawab sirf notes mein hain."},
    "n_noanswer": {"en": "Let the class vote, then ask two learners to defend their pick. Learners check the answer in the app quiz, where the explanation appears after they submit. (Mentor edition: export_decks.py --with-answers.)",
                   "hi": "Class se vote karwaiye, phir do learners se unka jawab defend karwaiye. Sahi jawab learner app ke quiz mein dekhte hain, submit ke baad wahin explanation aata hai. (Mentor edition: export_decks.py --with-answers.)"},
}


def ui(key: str, lang: str) -> str:
    return UI[key][lang]
