# -*- coding: utf-8 -*-
"""Measuring text so nothing runs off a shape, and distilling long lesson text into slide-sized pieces.

PowerPoint lets a run overflow its box silently, so every string is measured here with the real font file
(Pillow, Segoe UI) before a size is chosen. Calibrated against PowerPoint's own render (21 Sep 2026): Segoe UI
single line spacing is 1.2 x the point size, and PowerPoint wraps greedily at spaces, which is what wrap() does.
Widths are measured slightly wide on purpose (WRAP_SLACK), because a wrong guess must err towards a smaller font,
never towards clipped text.

Every string that still cannot fit at its smallest allowed size is recorded in OVERFLOW (reported by the CLI);
the goal, checked on every build, is an empty list.
"""
from __future__ import annotations

import re
from functools import lru_cache

from PIL import ImageFont

from .theme import FONT_FILES

LH = 1.2            # line height as a multiple of the point size (PowerPoint, Segoe UI, spacing 1.0)
WRAP_SLACK = 0.965  # wrap as if the box were 3.5% narrower than it is
OVERFLOW: list[str] = []


@lru_cache(maxsize=8)
def _font(style: str):
    return ImageFont.truetype(FONT_FILES[style], 200)


def _style(bold=False, italic=False):
    return "bolditalic" if bold and italic else "bold" if bold else "italic" if italic else "regular"


@lru_cache(maxsize=65536)
def _w200(text: str, style: str) -> float:
    return _font(style).getlength(text)


def width_in(text: str, pt: float, bold=False, italic=False) -> float:
    """Width of one line of text, in inches."""
    if not text:
        return 0.0
    return _w200(text, _style(bold, italic)) / 200.0 * pt / 72.0


def wrap(text: str, pt: float, w: float, bold=False, italic=False) -> list[str]:
    """Greedy word wrap, as PowerPoint does it. Explicit newlines start new lines."""
    out = []
    limit = w * WRAP_SLACK
    for para in str(text).split("\n"):
        words = para.split()
        if not words:
            out.append("")
            continue
        cur = words[0]
        for word in words[1:]:
            trial = cur + " " + word
            if width_in(trial, pt, bold, italic) <= limit:
                cur = trial
            else:
                out.append(cur)
                cur = word
        out.append(cur)
    return out


def n_lines(text: str, pt: float, w: float, bold=False, italic=False) -> int:
    return len(wrap(text, pt, w, bold, italic)) if text else 0


def line_h(pt: float, spacing: float = 1.0) -> float:
    return LH * pt * spacing / 72.0


def height(text: str, pt: float, w: float, spacing=1.0, bold=False, italic=False) -> float:
    """Height of a wrapped string, in inches."""
    return n_lines(text, pt, w, bold, italic) * line_h(pt, spacing)


def fits_one_line(text: str, pt: float, w: float, bold=False) -> bool:
    return width_in(text, pt, bold) <= w * WRAP_SLACK


def paras_height(paras, pt, w, spacing=1.0, gap_pt=0.0, bold=False):
    """Height of several paragraphs set at one size, with gap_pt points of space after each but the last."""
    hs = [height(p, pt, w, spacing, bold) for p in paras]
    return sum(hs) + max(0, len(hs) - 1) * gap_pt / 72.0


def fit(text, w, h, pt_max, pt_min, spacing=1.0, bold=False, italic=False, step=0.5):
    """Largest size in [pt_min, pt_max] at which `text` fits the box; None if it does not fit even at pt_min."""
    pt = pt_max
    while pt >= pt_min - 1e-9:
        if height(text, pt, w, spacing, bold, italic) <= h and all(
                width_in(word, pt, bold, italic) <= w * WRAP_SLACK for word in str(text).split()):
            return pt
        pt -= step
    return None


def fit_paras(paras, w, h, pt_max, pt_min, spacing=1.0, gap_ratio=0.45, bold=False, step=0.5):
    """Largest size at which a list of paragraphs (space after each = gap_ratio x size) fits the box."""
    pt = pt_max
    while pt >= pt_min - 1e-9:
        if paras_height(paras, pt, w, spacing, gap_ratio * pt, bold) <= h:
            return pt
        pt -= step
    return None


def fit_single_line(text, w, pt_max, pt_min, bold=False, step=0.5):
    pt = pt_max
    while pt >= pt_min - 1e-9:
        if fits_one_line(text, pt, w, bold):
            return pt
        pt -= step
    return None


def need(pt, where, text, w, h):
    """Record an overflow (a string that does not fit at its smallest size) and return a usable size."""
    OVERFLOW.append(f"{where}: {len(text)} chars do not fit {w:.2f}x{h:.2f}in — {text[:60]}")
    return pt


# ---------------- distilling lesson prose ----------------
_SENT = re.compile(r"(?<=[.?!])[\"')]?\s+(?=[A-Z0-9'\"(])")


def sentences(text: str) -> list[str]:
    """Split prose into sentences (not inside numbers like 0.49% or Rs 1,250.50)."""
    s = [x.strip() for x in _SENT.split(str(text).strip()) if x.strip()]
    return s


def _cap(s: str) -> str:
    s = s.strip()
    return s[:1].upper() + s[1:] if s else s


def _end(s: str) -> str:
    s = s.strip().rstrip(",;:")
    return s if s.endswith((".", "?", "!", ")", "'")) else s + "."


def clauses(text: str) -> list[str]:
    """Sentences, with independent clauses joined by '; ' split into their own statements."""
    out = []
    for s in sentences(text):
        parts = [p for p in s.split("; ") if p.strip()]
        if len(parts) > 1 and all(len(p) >= 28 for p in parts):
            out += [_end(_cap(p)) for p in parts]
        else:
            out.append(s)
    return out


def shorten(s: str, max_chars: int) -> str | None:
    """A long statement cut to its main clause (before a colon or a dash), or None when no clean cut exists."""
    if len(s) <= max_chars:
        return s
    for sep in (": ", " — ", " - "):
        if sep in s:
            head = s.split(sep, 1)[0]
            if 36 <= len(head) <= max_chars and not head.lower().startswith(("one ", "for example", "example")):
                return _end(head)
    return None


_ANAPHORA = re.compile(
    r"^(so|that|this|these|those|it|its|they|them|both|then|but|and|also|such|here|there|which|"
    r"yeh|ye|woh|wo|isliye|isiliye|iska|iske|iski|inka|unka|aur|lekin|par|phir|toh|tab|us|is|aise|waise|dono|wahi|yahi)\b",
    re.I)


_PRONOUN = re.compile(r"\b(they|them|their|theirs|it|its|this|these|those|he|she|his|her|"
                      r"unka|unki|unke|iska|iski|iske|inka|inki|inke|unhe|inhe|isse|usse|woh|wahi|yahi)\b", re.I)


def distill(text: str, w: float, h: float, pt_max=16, pt_min=13.5, max_items=5, min_items=3,
            max_chars=170, gap_ratio=0.5):
    """3-5 short statements from a topic paragraph that fit a w x h box as bullets, and their size.

    Statements keep the author's words and order (the full paragraph is the speaker note): sentences and
    '; '-clauses, long ones cut to their main clause when there is a clean cut, the rest skipped. The first
    sentences of a topic carry its definitions, so the list is filled in order until the box is full.
    """
    cands = []
    dropped = False
    for c in clauses(text):
        s = shorten(c, max_chars)
        # "So ...", "Yeh ..." or "... their net flow" leans on the sentence before it: without that sentence it
        # reads as a non sequitur, so after a skipped sentence the next one must stand on its own
        if s and not (dropped and (_ANAPHORA.match(s) or _PRONOUN.search(s))):
            cands.append(s)
            dropped = False
        else:
            dropped = True
    if len(cands) < min_items:  # a paragraph of long sentences: accept longer statements rather than too few
        cands = [c for c in (shorten(c, 260) or c for c in clauses(text))]
    best = None
    for pt in [x / 2 for x in range(int(pt_max * 2), int(pt_min * 2) - 1, -1)]:
        chosen = []
        for c in cands:
            trial = chosen + [c]
            if paras_height(trial, pt, w, 1.0, gap_ratio * pt) <= h:
                chosen = trial
                if len(chosen) >= max_items:
                    break
            elif len(chosen) >= min_items:
                break
        if len(chosen) >= min_items or (chosen and len(chosen) == len(cands)):
            return chosen, pt
        if best is None or len(chosen) > len(best[0]):
            best = (chosen, pt)
    return best if best and best[0] else (cands[:1], pt_min)


def elide(text: str, w: float, h: float, pt: float, spacing=1.0, italic=False, bold=False) -> str:
    """Drop sentences from the middle (keeping the set-up and the punchline) until the text fits at pt.

    A dropped stretch is marked with an ellipsis, so the slide never pretends to be the whole example; the speaker
    notes always carry the full text."""
    ok = lambda t: height(t, pt, w, spacing, bold, italic) <= h
    ss = sentences(text)
    if ok(text) or len(ss) <= 1:
        return text
    for head in range(len(ss) - 2, 0, -1):          # set-up ... punchline
        t = " ".join(ss[:head] + ["…", ss[-1]])
        if ok(t):
            return t
    for head in range(len(ss) - 1, 0, -1):          # set-up only
        t = " ".join(ss[:head]) + " …"
        if ok(t):
            return t
    return ss[0] + " …"
