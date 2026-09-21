# -*- coding: utf-8 -*-
"""The slide kinds of a Stage 1 week deck, built from one validated day file at a time.

Per week: cover, week map, then per day: divider, story (comic), one slide per topic, key terms, recap map,
today's task, one slide per template (artefact), class activity, AI Lab, five quiz slides and the journal close;
the deck ends on the Tier-1 disclaimer. Speaker notes carry the mentor's talk track: the full topic text and
example, the whole story, every prompt in full, and the quiz answers (which never appear on a slide).
"""
from __future__ import annotations

import math
import re

from pptx.enum.shapes import MSO_SHAPE

from . import fit
from .canvas import CONTENT_BOTTOM, M, MIDDLE, RIGHT, W
from .theme import (BRAND_TEXT, CARD, CARD2, CAST, CYAN, CYAN_SOFT, DARK_TX, DARK_TX2, INK, INK2, INK3, LINE,
                    LINE2, NAVY, NAVY_DEEP, TONE_SOFT, TONE_TEXT, WEEK_ACCENT, WHITE, tier1, ui)
from .visuals import L, body_size, need_height, render, split_table, table_plan, wants_wide

CT = 1.46                     # content top (below kicker + title)
REM_Y, REM_H = 6.3, 0.56      # the takeaway bar
CW = W - 2 * M                # content width


# Learner decks carry no quiz answers: students download these files from the app, and the day quizzes score
# points there. export_decks.py --with-answers flips this for a mentor edition written outside the repo.
WITH_ANSWERS = False


class Ctx:
    """One deck being built: canvas, language, week, and the accent of that week."""

    def __init__(self, cv, lang, week, week_title):
        self.cv, self.lang, self.week, self.week_title = cv, lang, week, week_title
        self.acc = WEEK_ACCENT[week]

    def t(self, x):
        return L(x, self.lang)

    def u(self, key):
        return ui(key, self.lang)

    def where(self, day, part):
        return f"W{self.week}/{self.lang}/day{day:02d}/{part}"

    def foot(self, day=None):
        w = f"{self.u('week')} {self.week}"
        return f"{w} · {self.u('day')} {day}" if day else w


# ------------------------------------------------------------------ shared pieces
def header(ctx, s, kicker, title, where, size=26, color=INK):
    """Kicker line + slide title (one line if it can, else two). Returns the y below the title."""
    cv = ctx.cv
    cv.text(s, M, 0.36, CW, 0.26, kicker, 11, ctx.acc["text"], bold=True, caps=True)
    pt = fit.fit_single_line(title, CW, size, 20, bold=True)
    if pt:
        cv.text(s, M, 0.62, CW, 0.5, title, pt, color, bold=True)
        return 0.62 + fit.line_h(pt) + 0.2
    pt = fit.fit(title, CW, 0.78, 22, 15, bold=True)
    if not pt:
        pt = 15
        fit.need(pt, where + "/title", title, CW, 0.78)
    h = fit.height(title, pt, CW, bold=True)
    cv.text(s, M, 0.6, CW, h + 0.04, title, pt, color, bold=True)
    return 0.6 + h + 0.12


def takeaway(ctx, s, label, text, where, y=REM_Y, h=REM_H):
    cv = ctx.cv
    cv.box(s, M, y, CW, h, fill=NAVY, line=None, radius=0.1)
    cw_ = cv.pill(s, M + 0.14, y + (h - 0.3) / 2, label, 10.5, CYAN, NAVY_DEEP, h=0.3, pad=0.14)
    tx = M + 0.14 + cw_ + 0.2
    tw = W - M - 0.2 - tx
    pt = fit.fit(text, tw, h - 0.08, 15, 10.5, bold=True)
    if not pt:
        pt = 10.5
        fit.need(pt, where + "/takeaway", text, tw, h)
    cv.text(s, tx, y, tw, h, text, pt, WHITE, bold=True, anchor=MIDDLE)


def callout(ctx, s, x, y, w, h, label, text, where, fill=None, pt_max=14, pt_min=11):
    """A tinted box with a small caps label and body text (shrunk, then trimmed in the middle, to fit)."""
    cv = ctx.cv
    fill = fill or TONE_SOFT["gold"]
    cv.box(s, x, y, w, h, fill=fill, line=None, radius=0.12)
    cv.text(s, x + 0.2, y + 0.14, w - 0.4, 0.24, label, 10.5, TONE_TEXT["gold"], bold=True, caps=True)
    tw, th = w - 0.4, h - 0.5
    pt = fit.fit(text, tw, th, pt_max, pt_min)
    if not pt:
        pt = pt_min
        text = fit.elide(text, tw, th, pt)
    cv.text(s, x + 0.2, y + 0.42, tw, th, text, pt, INK)


def notes_join(*parts):
    return "\n\n".join(p for p in parts if p)


def strategy_of(ctx, d):
    s = d.get("strategy")
    if not s:
        return ""
    return s if isinstance(s, str) else ctx.t(s)


# ------------------------------------------------------------------ bookends
def cover(ctx, days):
    cv = ctx.cv
    s = cv.slide(bg=NAVY_DEEP)
    cv.logo(s, M, 0.55, 1.05)
    cv.text(s, M + 1.3, 0.7, 8, 0.34, ctx.u("stage"), 15, CYAN, bold=True)
    cv.text(s, M + 1.3, 1.08, 8, 0.34, f"{ctx.u('stage1')} · {ctx.u('week')} {ctx.week}", 15, DARK_TX2, bold=True)
    title = ctx.week_title
    pt = fit.fit(title, 11.2, 2.0, 46, 30, bold=True) or 30
    th = fit.height(title, pt, 11.2, bold=True)
    cv.text(s, M, 2.55, 11.2, th + 0.05, title, pt, WHITE, bold=True)
    y = 2.55 + th + 0.3
    first, last = days[0]["day"], days[-1]["day"]
    cv.text(s, M, y, 11, 0.4, f"{ctx.u('day')} {first}-{last}", 18, CYAN, bold=True)
    cv.text(s, M, y + 0.48, 11, 0.4, ctx.u("promise"), 17, DARK_TX2)
    cv.pill(s, M, 5.55, ctx.u("edition"), 12, CYAN, NAVY_DEEP, h=0.4, pad=0.2)
    cv.footer(s, ctx.foot(), dark=True)
    cv.notes(s, notes_join(f"{ctx.u('stage')} · {ctx.u('stage1')} · {ctx.u('week')} {ctx.week}: {title}",
                           ctx.u("n_cover_mentor" if WITH_ANSWERS else "n_cover")))


def week_map(ctx, days):
    cv = ctx.cv
    s = cv.slide()
    header(ctx, s, f"{ctx.u('week')} {ctx.week} · {ctx.week_title}", ctx.u("week_map"), ctx.where(0, "map"))
    n = len(days)
    gap = 0.1
    rh = (CONTENT_BOTTOM - CT - gap * (n - 1)) / n
    lines = []
    for i, d in enumerate(days):
        y = CT + i * (rh + gap)
        cv.box(s, M, y, CW, rh, fill=CARD, line=LINE, radius=0.1)
        chip = cv.box(s, M + 0.14, y + (rh - 0.44) / 2, 1.05, 0.44, fill=ctx.acc["fill"], line=None, radius=0.22)
        cv.label(chip, f"{ctx.u('day')} {d['day']}", 13, ctx.acc["on"], bold=True)
        title = ctx.t(d["title"])
        concept = ctx.t(d["tags"]["concept"])
        tx, tw = M + 1.4, CW - 1.4 - 2.6
        tpt = fit.fit_single_line(title, tw, 15, 11.5, bold=True) or 11.5
        cpt = fit.fit_single_line(concept, tw, 11.5, 9.5) or 9.5
        concept = concept if fit.fits_one_line(concept, cpt, tw) else fit.wrap(concept, cpt, tw)[0].rstrip(",;:") + " …"
        cv.text(s, tx, y + rh / 2 - fit.line_h(tpt) - 0.01, tw, fit.line_h(tpt) + 0.02, title, tpt, INK, bold=True)
        cv.text(s, tx, y + rh / 2 + 0.02, tw, fit.line_h(cpt) + 0.02, concept, cpt, INK2)
        right = f"{d.get('duration_min', 60)} {ctx.u('min')}"
        if d["day"] % 7 == 0:
            rw = fit.width_in(ctx.u("review_day"), 10, True) + 0.3
            cv.pill(s, W - M - 0.16 - rw, y + (rh - 0.28) / 2, ctx.u("review_day"), 10, TONE_SOFT["gold"],
                    TONE_TEXT["gold"], h=0.28)
            cv.text(s, W - M - 0.16 - rw - 1.0, y, 0.9, rh, right, 12, INK3, bold=True, align=RIGHT, anchor=MIDDLE)
        else:
            cv.text(s, W - M - 1.6, y, 1.44, rh, right, 12, INK3, bold=True, align=RIGHT, anchor=MIDDLE)
        lines.append(f"{ctx.u('day')} {d['day']}: {ctx.t(d['title'])} — {ctx.t(d['tags']['concept'])}")
    cv.footer(s, ctx.foot())
    cv.notes(s, "\n".join(lines))


def disclaimer(ctx):
    cv = ctx.cv
    s = cv.slide(bg=NAVY_DEEP)
    cv.logo(s, M, 0.5, 0.75)
    cv.text(s, M + 1.0, 0.7, 8, 0.4, ctx.u("disclaimer"), 24, WHITE, bold=True)
    txt = tier1()
    pt = fit.fit(txt, CW - 0.6, 3.3, 20, 13, spacing=1.12) or 13
    th = fit.height(txt, pt, CW - 0.6, spacing=1.12)
    cv.box(s, M, 1.7, CW, th + 0.6, fill=None, line=CYAN, lw=1.25, radius=0.14, dash=True)
    cv.text(s, M + 0.3, 2.0, CW - 0.6, th + 0.05, txt, pt, DARK_TX, spacing=1.12)
    y = 1.7 + th + 0.9
    na = ctx.u("notadvice")
    npt = fit.fit(na, CW, 0.9, 15, 11) or 11
    cv.text(s, M, y, CW, 0.9, na, npt, DARK_TX2)
    cv.footer(s, ctx.foot(), dark=True)
    cv.notes(s, txt)


# ------------------------------------------------------------------ per day
def divider(ctx, d):
    cv, lang, acc = ctx.cv, ctx.lang, ctx.acc
    s = cv.slide()
    day = d["day"]
    cv.box(s, M, 0.5, 4.1, 6.3, fill=acc["fill"], line=None, radius=0.22)
    cv.text(s, M + 0.4, 0.95, 3.4, 0.4, ctx.u("day"), 22, acc["on"], bold=True, caps=True)
    cv.text(s, M + 0.32, 1.35, 3.6, 2.0, f"{day:02d}", 120, acc["on"], bold=True)
    cv.text(s, M + 0.4, 3.65, 3.4, 0.34, f"{ctx.u('week')} {ctx.week}", 16, acc["on"], bold=True, caps=True)
    wt = ctx.week_title
    wpt = fit.fit(wt, 3.3, 1.1, 14, 11) or 11
    cv.text(s, M + 0.4, 4.05, 3.3, 1.2, wt, wpt, acc["on"])
    y_pill = 6.1
    cv.pill(s, M + 0.4, y_pill, f"{d.get('duration_min', 60)} {ctx.u('min')}", 12, WHITE, NAVY_DEEP, h=0.36, pad=0.18)
    if day % 7 == 0:
        dw = fit.width_in(f"{d.get('duration_min', 60)} {ctx.u('min')}", 12, True) / fit.WRAP_SLACK + 0.36
        cv.pill(s, M + 0.4 + dw + 0.12, y_pill, ctx.u("review_day"), 12, WHITE, NAVY_DEEP, h=0.36, pad=0.18)
    x0, xw = 5.0, W - M - 5.0
    cv.text(s, x0, 0.72, xw, 0.26, f"{ctx.u('stage')} · {ctx.u('stage1')}", 11, INK3, bold=True, caps=True)
    title = ctx.t(d["title"])
    pt = fit.fit(title, xw, 1.75, 36, 22, bold=True) or 22
    th = fit.height(title, pt, xw, bold=True)
    cv.text(s, x0, 1.05, xw, th + 0.05, title, pt, INK, bold=True)
    y = 1.05 + th + 0.35
    rows = [("concept", ctx.t(d["tags"]["concept"])), ("ai_lab", ctx.t(d["tags"]["ai_lab"])),
            ("psychology", ctx.t(d["tags"]["psychology"]))]
    strat = strategy_of(ctx, d)
    if strat:
        rows.append(("strategy", strat))
    chip_w = max(fit.width_in(ctx.u(k), 10, True) for k, _ in rows) + 0.34
    tx, tw = x0 + chip_w + 0.2, xw - chip_w - 0.2
    for k, val in rows:
        vpt = fit.fit(val, tw, 0.64, 18, 12) or 12
        vh = max(0.32, fit.height(val, vpt, tw))
        strat_row = k == "strategy"
        chip = cv.box(s, x0, y + (min(vh, 0.32) - 0.32) / 2 + 0.01, chip_w, 0.32,
                      fill=acc["fill"] if strat_row else CARD2, line=None, radius=0.16)
        cv.label(chip, ctx.u(k), 10, acc["on"] if strat_row else INK2, bold=True)
        cv.text(s, tx, y + (0.32 - fit.line_h(vpt)) / 2 if vh <= 0.34 else y, tw, vh + 0.04, val, vpt, INK)
        y += vh + 0.24
    out = ctx.t(d.get("outcome"))
    if out:
        y += 0.2
        avail = 6.8 - y
        opt = fit.fit(out, xw, avail - 0.36, 16, 11)
        if opt:
            oh = fit.height(out, opt, xw)
            cv.text(s, x0, y, xw, 0.24, ctx.u("outcome"), 10.5, acc["text"], bold=True, caps=True)
            cv.text(s, x0, y + 0.3, xw, oh + 0.04, out, opt, INK2)
    cv.footer(s, ctx.foot(day))
    cv.notes(s, notes_join(
        f"{ctx.u('day')} {day}: {title}",
        "\n".join(f"{ctx.u(k)}: {v}" for k, v in rows),
        f"{ctx.u('outcome')}: {out}" if out else ""))


def story(ctx, d):
    st = d["story"]
    panels = st.get("panels") or []
    title = ctx.t(st.get("title")) or ctx.u("story")
    moral = ctx.t(st.get("moral"))
    day = d["day"]
    area_bottom = (REM_Y - 0.14) if moral else CONTENT_BOTTOM
    # one slide if every panel fits at a readable size, else two slides of up to three panels
    one = _story_layout(ctx, panels, CT, area_bottom, min_pt=12.5)
    groups = [panels] if one else [panels[:math.ceil(len(panels) / 2)], panels[math.ceil(len(panels) / 2):]]
    base = 0
    for gi, grp in enumerate(groups):
        s = ctx.cv.slide()
        kick = f"{ctx.u('day')} {day} · {ctx.u('story')}" + (f" · {gi + 1}/{len(groups)}" if len(groups) > 1 else "")
        top = header(ctx, s, kick, title, ctx.where(day, "story"))
        last = gi == len(groups) - 1
        bottom = (REM_Y - 0.14) if (moral and last) else CONTENT_BOTTOM
        lay = _story_layout(ctx, grp, max(CT, top), bottom, min_pt=10)
        if not lay:
            lay = _story_layout(ctx, grp, max(CT, top), bottom, min_pt=8, force=True)
            fit.need(0, ctx.where(day, "story"), " ".join(ctx.t(p["say"]) for p in grp), CW, bottom - CT)
        _draw_story(ctx, s, grp, lay, base)
        base += len(grp)
        if moral and last:
            takeaway(ctx, s, ctx.u("lesson"), moral, ctx.where(day, "story/moral"))
        ctx.cv.footer(s, ctx.foot(day))
        lines = []
        for p in grp:
            who = p.get("who")
            name = CAST[who][ctx.lang] if who in CAST else ""
            lines.append(f"{name}: {ctx.t(p['say'])}" if name else f"({ctx.t(p['say'])})")
        ctx.cv.notes(s, notes_join(title, "\n".join(lines), f"{ctx.u('lesson')}: {moral}" if (moral and last) else ""))


def _panel_need(ctx, p, pt, pw):
    """Height a panel needs at size pt: a caption box for the narrator, else avatar row + speech bubble."""
    txt = ctx.t(p["say"])
    if p.get("who") == "narrator" or p.get("who") not in CAST:
        return fit.height(txt, pt, pw - 0.44, italic=True) + 0.5
    return 0.84 + fit.height(txt, pt, pw - 0.56) + 0.36 + 0.16


def _story_layout(ctx, panels, top, bottom, min_pt, force=False):
    n = len(panels)
    cols = 2 if n == 4 else min(3, n)
    rows = math.ceil(n / cols)
    gap = 0.18
    pw = (CW - gap * (cols - 1)) / cols
    avail = bottom - top - gap * (rows - 1)
    for pt in [x / 2 for x in range(34, int(min_pt * 2) - 1, -1)]:  # 17 .. min
        rh = [max(_panel_need(ctx, p, pt, pw) for p in panels[r * cols:(r + 1) * cols]) for r in range(rows)]
        if sum(rh) <= avail:
            break
    else:
        if not force:
            return None
        pt = min_pt
        rh = [avail / rows] * rows
    # panels of a row share one height; spare room goes to the panels, never more than a comfortable 1.6 x
    spare = avail - sum(rh)
    rh = [h + min(spare / rows, 0.35) for h in rh]
    y0 = top + min(0.1, max(0.0, avail - sum(rh)))   # the strip hangs from the title, like a comic page
    return {"cols": cols, "rows": rows, "pw": pw, "rh": rh, "gap": gap, "top": y0, "pt": pt}


def _draw_story(ctx, s, panels, lay, base):
    cv = ctx.cv
    n = len(panels)
    for i, p in enumerate(panels):
        r, c = divmod(i, lay["cols"])
        in_row = min(lay["cols"], n - r * lay["cols"])
        offset = (lay["cols"] - in_row) * (lay["pw"] + lay["gap"]) / 2    # centre a short last row
        px = M + offset + c * (lay["pw"] + lay["gap"])
        py = lay["top"] + sum(lay["rh"][:r]) + r * lay["gap"]
        pw, ph, pt = lay["pw"], lay["rh"][r], lay["pt"]
        txt = ctx.t(p["say"])
        who = p.get("who")
        num = str(base + i + 1)
        if who == "narrator" or who not in CAST:
            cv.box(s, px, py, pw, ph, fill=TONE_SOFT["gold"], line=None, radius=0.14)
            cv.text(s, px + pw - 0.42, py + 0.1, 0.3, 0.24, num, 10, TONE_TEXT["gold"], bold=True, align=RIGHT)
            cv.text(s, px + 0.22, py + 0.25, pw - 0.44, ph - 0.5, txt, pt, INK, italic=True, anchor=MIDDLE)
            continue
        cast = CAST[who]
        cv.box(s, px, py, pw, ph, fill=CARD, line=LINE, radius=0.14)
        av = cv.oval(s, px + 0.16, py + 0.14, 0.52, fill=cast["colour"])
        cv.label(av, cast["initial"], 17, WHITE, bold=True)
        cv.text(s, px + 0.8, py + 0.26, pw - 1.3, 0.32, cast[ctx.lang], 14, cast["colour"], bold=True)
        cv.text(s, px + pw - 0.42, py + 0.1, 0.3, 0.24, num, 10, INK3, bold=True, align=RIGHT)
        th = fit.height(txt, pt, pw - 0.56)
        bx, by, bw = px + 0.14, py + 0.84, pw - 0.28
        bh = min(ph - 0.98, th + 0.36)
        bub = cv.box(s, bx, by, bw, bh, fill=CARD2, line=LINE2, lw=0.75, radius=None,
                     shape=MSO_SHAPE.ROUNDED_RECTANGULAR_CALLOUT)
        tip_x, tip_y = px + 0.44, py + 0.64
        try:
            bub.adjustments[0] = (tip_x - (bx + bw / 2)) / bw
            bub.adjustments[1] = (tip_y - (by + bh / 2)) / bh
            bub.adjustments[2] = min(0.16667, 0.12 / min(bw, bh))
        except (IndexError, ValueError):
            pass
        # the words sit in their own box on the bubble: a callout shape insets its text by its corner geometry
        cv.text(s, bx + 0.14, by + 0.18, bw - 0.28, th + 0.04, txt, pt, INK)


def _layout_kind(v):
    if not v:
        return "none"
    return "wide" if wants_wide(v) else "side"


def topic(ctx, d, i, t, n_topics):
    cv, lang = ctx.cv, ctx.lang
    s = cv.slide()
    day = d["day"]
    where = ctx.where(day, f"topic{i + 1}")
    head = ctx.t(t["h"])
    top = max(CT, header(ctx, s, f"{ctx.u('day')} {day} · {ctx.u('topic')} {i + 1}/{n_topics}", head, where))
    body = ctx.t(t["p"])
    ex = ctx.t(t.get("example"))
    rem = ctx.t(t.get("remember"))
    v = t.get("visual")
    bottom = (REM_Y - 0.16) if rem else CONTENT_BOTTOM
    kind = _layout_kind(v)
    colw = (CW - 0.26) / 2
    rx = M + colw + 0.26
    bul_pt = None
    band_h = 0.0
    if kind == "wide":
        # the band is as tall as the visual needs; a visual that needs most of the slide gets a slide of its own
        band_max = bottom - top - 1.55
        need = need_height(v, lang, CW)
        if need > band_max:
            kind = "split"
        else:
            band_h = max(need, 1.9)
    elif kind == "side" and v.get("kind") == "table" and not table_plan(
            v, lang, *body_size(v, lang, colw, bottom - top), pt_min=10):
        kind = "split"
    if kind == "split":
        _topic_text(ctx, s, body, ex, top, bottom, colw, rx, where)
    elif kind == "side":
        bh_max = 2.75 if ex else bottom - top
        bullets, bul_pt = fit.distill(body, colw - 0.3, bh_max, 16, 13.5)
        bh = fit.paras_height(bullets, bul_pt, colw - 0.3, 1.0, 0.5 * bul_pt)
        cv.text(s, M, top, colw, bh + 0.05, bullets, bul_pt, INK, gap=0.5 * bul_pt, bullet="•",
                bullet_color=ctx.acc["fill"], indent=0.3)
        if ex:
            ey = top + bh + 0.22
            callout(ctx, s, M, ey, colw, bottom - ey, ctx.u("example"), ex, where + "/example", pt_min=12)
        render(cv, s, v, rx, top, colw, bottom - top, lang, where + "/visual")
    elif kind == "wide":
        row_h = bottom - top - band_h - 0.18
        bw_ = colw if ex else CW
        bullets, bul_pt = fit.distill(body, bw_ - 0.3, row_h, 15, 13, max_items=4)
        bh = fit.paras_height(bullets, bul_pt, bw_ - 0.3, 1.0, 0.5 * bul_pt)
        cv.text(s, M, top, bw_, bh + 0.05, bullets, bul_pt, INK, gap=0.5 * bul_pt, bullet="•",
                bullet_color=ctx.acc["fill"], indent=0.3)
        if ex:
            callout(ctx, s, rx, top, colw, row_h, ctx.u("example"), ex, where + "/example", pt_max=14, pt_min=12)
        render(cv, s, v, M, bottom - band_h, CW, band_h, lang, where + "/visual")
    else:
        _topic_text(ctx, s, body, ex, top, bottom, colw, rx, where)
    if rem:
        takeaway(ctx, s, ctx.u("remember"), rem, where + "/remember")
    cv.footer(s, ctx.foot(day))
    vis_note = ""
    if v:
        vis_note = " · ".join(x for x in (ctx.t(v.get("title")), ctx.t(v.get("caption"))) if x)
    note = notes_join(head, body, f"{ctx.u('n_example')}: {ex}" if ex else "",
                      f"{ctx.u('n_remember')}: {rem}" if rem else "",
                      f"{ctx.u('n_visual')}: {vis_note}" if vis_note else "")
    cv.notes(s, note)
    if kind == "split":
        s2 = cv.slide()
        top2 = max(CT, header(ctx, s2, f"{ctx.u('day')} {day} · {ctx.u('topic')} {i + 1}/{n_topics} · "
                                       f"{ctx.u('continued')}", head, where))
        render(cv, s2, v, M, top2, CW, CONTENT_BOTTOM - top2, lang, where + "/visual")
        cv.footer(s2, ctx.foot(day))
        cv.notes(s2, note)


def _topic_text(ctx, s, body, ex, top, bottom, colw, rx, where):
    """A topic without a visual on this slide: bullets on the left, the example on the right."""
    bw_ = colw if ex else CW
    bullets, bul_pt = fit.distill(body, bw_ - 0.3, bottom - top, 17, 14)
    ctx.cv.text(s, M, top, bw_, bottom - top, bullets, bul_pt, INK, gap=0.5 * bul_pt, bullet="•",
                bullet_color=ctx.acc["fill"], indent=0.3)
    if ex:
        callout(ctx, s, rx, top, colw, bottom - top, ctx.u("example"), ex, where + "/example", pt_max=16, pt_min=12)


def key_terms(ctx, d):
    cv = ctx.cv
    s = cv.slide()
    day = d["day"]
    where = ctx.where(day, "key_terms")
    top = max(CT, header(ctx, s, f"{ctx.u('day')} {day} · {ctx.u('recap')}", ctx.u("key_terms"), where))
    kts = d.get("key_terms") or []
    n = len(kts)
    cols = 3 if n == 3 else 2
    rows = math.ceil(n / cols)
    gap = 0.18
    cw = (CW - gap * (cols - 1)) / cols
    chh = (CONTENT_BOTTOM - top - gap * (rows - 1)) / rows
    inner = cw - 0.44
    terms = [ctx.t(k["term"]) for k in kts]
    means = [ctx.t(k["meaning"]) for k in kts]

    def card_fits(i, pt):
        return fit.height(terms[i], pt + 2, inner, bold=True) + fit.height(means[i], pt, inner) + 0.3 <= chh

    def best(i):
        return next((pt for pt in [x / 2 for x in range(32, 19, -1)] if card_fits(i, pt)), None)

    sizes = [best(i) for i in range(n)]
    for i in range(n):
        if sizes[i] is None:
            sizes[i] = 10.5
            fit.need(0, f"{where}[{i}]", means[i], inner, chh)
    # the size three cards in four can take is the size for this slide; a longer meaning steps down on its own
    base = sorted(sizes)[len(sizes) // 2]
    for i in range(n):
        pt = min(base, sizes[i])
        tpt = pt + 2
        r, c = divmod(i, cols)
        x = M + c * (cw + gap)
        y = top + r * (chh + gap)
        cv.box(s, x, y, cw, chh, fill=CARD, line=LINE, radius=0.12)
        th = fit.height(terms[i], tpt, inner, bold=True)
        mh = fit.height(means[i], pt, inner)
        y0 = y + max(0.14, (chh - th - mh - 0.08) / 2)
        cv.text(s, x + 0.22, y0, inner, th + 0.02, terms[i], tpt, ctx.acc["text"], bold=True)
        cv.text(s, x + 0.22, y0 + th + 0.06, inner, mh + 0.04, means[i], pt, INK)
    cv.footer(s, ctx.foot(day))
    cv.notes(s, "\n".join(f"{terms[i]}: {means[i]}" for i in range(n)))


def recap(ctx, d):
    cv = ctx.cv
    s = cv.slide()
    day = d["day"]
    mm = d["mindmap"]
    top = max(CT, header(ctx, s, f"{ctx.u('day')} {day} · {ctx.u('recap')}", ctx.u("recap_title"), ctx.where(day, "recap")))
    render(cv, s, mm, M, top, CW, CONTENT_BOTTOM - top, ctx.lang, ctx.where(day, "mindmap"), show_title=False,
           card=False)
    cv.footer(s, ctx.foot(day))
    lines = [ctx.t(mm["center"])]
    for b in mm.get("branches") or []:
        lines.append(f"{ctx.t(b['label'])}: " + "; ".join(ctx.t(p) for p in b.get("points") or []))
    cv.notes(s, "\n".join(lines))


def task(ctx, d):
    cv = ctx.cv
    day = d["day"]
    where = ctx.where(day, "task")
    kaam = ctx.t(d["kaam"])
    steps = [ctx.t(x) for x in d.get("kaam_steps") or []]
    out = ctx.t(d.get("outcome"))
    mins = f"{d.get('kaam_min', 15)} {ctx.u('min')}"
    title = ctx.u("task")

    def draw(steps_part, first_no, with_kaam, with_out, cont):
        s = cv.slide()
        kick = f"{ctx.u('day')} {day} · {ctx.u('task')}" + (f" · {ctx.u('continued')}" if cont else "")
        top = max(CT, header(ctx, s, kick, title, where))
        tw_ = fit.width_in(mins, 13, True) / fit.WRAP_SLACK + 0.36
        cv.pill(s, W - M - tw_, 0.66, mins, 13, ctx.acc["fill"], ctx.acc["on"], h=0.4, pad=0.18)
        y = top
        if with_kaam:
            kpt = fit.fit(kaam, CW, 0.8, 17, 13, bold=True) or 13
            kh = fit.height(kaam, kpt, CW, bold=True)
            cv.text(s, M, y, CW, kh + 0.04, kaam, kpt, INK, bold=True)
            y += kh + 0.2
        oh = 0
        if with_out and out:
            opt = fit.fit(out, CW - 0.4, 0.95, 13, 11) or 11
            oh = fit.height(out, opt, CW - 0.4) + 0.52
        bottom = CONTENT_BOTTOM - (oh + 0.16 if oh else 0)
        lay = _steps_fit(steps_part, CW, bottom - y)
        spt, hs, gap = lay
        for k, st in enumerate(steps_part):
            ry = y + sum(hs[:k]) + gap * k
            cv.box(s, M, ry, CW, hs[k], fill=CARD, line=LINE, radius=0.1)
            nb = cv.oval(s, M + 0.14, ry + min(0.12, (hs[k] - 0.4) / 2), 0.4, fill=ctx.acc["fill"])
            cv.label(nb, str(first_no + k), 13, ctx.acc["on"], bold=True)
            cv.box(s, W - M - 0.44, ry + min(0.14, (hs[k] - 0.28) / 2), 0.28, 0.28, fill=CARD, line=INK3, lw=1.25,
                   radius=0.04)
            sh = fit.height(st, spt, CW - 1.35)
            cv.text(s, M + 0.72, ry + (hs[k] - sh) / 2, CW - 1.35, sh + 0.04, st, spt, INK)
        if oh:
            oy = CONTENT_BOTTOM - oh
            cv.box(s, M, oy, CW, oh, fill=TONE_SOFT["brand"], line=None, radius=0.12)
            cv.text(s, M + 0.2, oy + 0.12, CW - 0.4, 0.24, ctx.u("outcome"), 10.5, BRAND_TEXT, bold=True, caps=True)
            cv.text(s, M + 0.2, oy + 0.4, CW - 0.4, oh - 0.45, out, opt, INK)
        cv.footer(s, ctx.foot(day))
        return s

    # one slide when the steps fit at a readable size, else split them over two
    kpt = fit.fit(kaam, CW, 0.8, 17, 13, bold=True) or 13
    opt_ = (fit.fit(out, CW - 0.4, 0.95, 13, 11) or 11) if out else 11
    fixed = fit.height(kaam, kpt, CW, bold=True) + 0.2 + ((fit.height(out, opt_, CW - 0.4) + 0.68) if out else 0)
    probe = _steps_fit(steps, CW, CONTENT_BOTTOM - CT - fixed, strict=True)
    if probe:
        s = draw(steps, 1, True, True, False)
        slides_ = [s]
    else:
        k = math.ceil(len(steps) / 2)
        slides_ = [draw(steps[:k], 1, True, False, False), draw(steps[k:], k + 1, False, True, True)]
    tools = "; ".join(ctx.t(x) for x in d.get("tools") or [])
    note = notes_join(kaam, "\n".join(f"{i + 1}. {x}" for i, x in enumerate(steps)), f"{ctx.u('outcome')}: {out}",
                      f"{ctx.u('tools')}: {tools}" if tools else "", d.get("compliance") or "")
    for s in slides_:
        cv.notes(s, note)


def _steps_fit(steps, w, h, strict=False):
    gap = 0.1
    tw = w - 1.35
    for pt in [x / 2 for x in range(32, 23, -1)]:  # 16 .. 12
        hs = [max(0.52, fit.height(st, pt, tw) + 0.22) for st in steps]
        if sum(hs) + gap * (len(steps) - 1) <= h:
            return pt, hs, gap
    if strict:
        return None
    pt = 11
    hs = [max(0.5, fit.height(st, pt, tw) + 0.2) for st in steps]
    if sum(hs) + gap * (len(steps) - 1) > h:
        fit.need(pt, "task steps", " ".join(steps), w, h)
    return pt, hs, gap


def artefact(ctx, d, k, a):
    cv = ctx.cv
    day = d["day"]
    where = ctx.where(day, f"artefact{k + 1}")
    title = ctx.t(a["title"])
    note = ctx.t(a.get("note"))
    v = a["visual"]
    parts, made = [v], []
    for pi in range(4):
        if pi >= len(parts):
            break
        s = cv.slide()
        kick = f"{ctx.u('day')} {day} · {ctx.u('template')}" + (f" · {ctx.u('continued')}" if pi else "")
        top = max(CT, header(ctx, s, kick, title, where))
        if note and pi == 0:
            npt = fit.fit(note, CW, 0.6, 15, 12) or 12
            nh = fit.height(note, npt, CW)
            cv.text(s, M, top, CW, nh + 0.04, note, npt, INK2, italic=True)
            top += nh + 0.2
        if pi == 0 and v.get("kind") == "table":
            bw, bh = body_size(v, ctx.lang, CW, CONTENT_BOTTOM - top, show_title=False)
            if not table_plan(v, ctx.lang, bw, bh, pt_min=10, keep_blank=True):
                # a log too long for one slide continues on the next: header repeated, blank rows and note at the end
                parts = split_table(v, ctx.lang, bw, bh) or [v]
        render(cv, s, parts[pi], M, top, CW, CONTENT_BOTTOM - top, ctx.lang, where, show_title=False)
        cv.footer(s, ctx.foot(day))
        made.append(s)
    rows = []
    if v.get("kind") == "table":
        rows.append(" | ".join(ctx.t(h) for h in v.get("head") or []))
        for r in v.get("rows") or []:
            rows.append(" | ".join(ctx.t(c) for c in r))
        if v.get("blank_rows"):
            rows.append(f"+ {v['blank_rows']} ___")
    for s in made:
        cv.notes(s, notes_join(title, note, "\n".join(rows), ctx.t(v.get("note")) if v.get("note") else ""))


def game(ctx, d):
    fun = ctx.t(d.get("fun"))
    if not fun:
        return
    cv = ctx.cv
    s = cv.slide()
    day = d["day"]
    where = ctx.where(day, "game")
    name, body = ctx.u("game"), fun
    m = re.match(r"^(.{3,70}?):\s+(.+)$", fun, re.S)
    if m and not re.search(r"[.?!]\s", m.group(1)):
        name, body = m.group(1).strip(), m.group(2).strip()
        body = body[:1].upper() + body[1:]
    top = max(CT, header(ctx, s, f"{ctx.u('day')} {day} · {ctx.u('game')}", name, where))
    sub = ctx.u("game_sub")
    cv.text(s, M, top, CW, 0.3, sub, 13, INK3, italic=True)
    y = top + 0.5
    ch = CONTENT_BOTTOM - y
    cv.box(s, M, y, CW, ch, fill=CARD, line=LINE, radius=0.14)
    paras = []
    for sent in fit.sentences(body):
        if paras and len(paras[-1]) < 40:
            paras[-1] += " " + sent
        else:
            paras.append(sent)
    pt = fit.fit_paras(paras, CW - 1.0, ch - 0.7, 20, 12.5, gap_ratio=0.35)
    if not pt:
        pt = 12.5
        body_txt = fit.elide(body, CW - 1.0, ch - 0.7, pt)
        paras = [body_txt]
        fit.need(pt, where, body, CW - 1.0, ch - 0.7)
    cv.text(s, M + 0.5, y + 0.55, CW - 1.0, ch - 0.7, paras, pt, INK, gap=0.35 * pt)
    cv.footer(s, ctx.foot(day))
    cv.notes(s, fun)


def prompt_preview(body: str) -> str:
    """What the prompt makes the AI do, in the prompt's own words: its role line (when short) and first instruction."""
    ss = fit.sentences(body)
    if not ss:
        return body
    first = ss[0]
    if re.match(r"^(you are|act as|i am|pretend)", first, re.I) and len(ss) > 1 and len(first) > 90:
        ss = ss[1:]           # a long role line says less than the instruction after it
    out = ss[0]
    for nxt in ss[1:3]:       # short openings get the next sentence too, so the card says what the AI will do
        if len(out) >= 110:
            break
        out += " " + nxt
    return out


def ai_lab(ctx, d):
    cv = ctx.cv
    s = cv.slide()
    day = d["day"]
    where = ctx.where(day, "ai_lab")
    top = max(CT, header(ctx, s, f"{ctx.u('day')} {day} · {ctx.u('ai_lab')}", ctx.t(d["tags"]["ai_lab"]), where))
    prompts = d.get("prompts") or []
    n = max(1, len(prompts))
    gap = 0.2
    cw = (CW - gap * (n - 1)) / n
    rule = ctx.u("ai_rule")
    rpt = fit.fit(rule, CW - 0.5, 0.6, 13.5, 11, bold=True) or 11
    rh = fit.height(rule, rpt, CW - 0.5, bold=True) + 0.3
    how_h = 0.5
    foot_h = 0.3
    card_bottom = CONTENT_BOTTOM - foot_h - rh - 0.16 - how_h - 0.16
    ch = card_bottom - top
    inner = cw - 0.44
    for k, p in enumerate(prompts):
        x = M + k * (cw + gap)
        cv.box(s, x, top, cw, ch, fill=CARD, line=LINE, radius=0.14)
        cv.text(s, x + 0.22, top + 0.18, inner, 0.24, f"Prompt {k + 1}", 10.5, ctx.acc["text"], bold=True, caps=True)
        title = ctx.t(p["title"])
        tpt = fit.fit(title, inner, 0.95, 20, 13, bold=True) or 13
        th = fit.height(title, tpt, inner, bold=True)
        cv.text(s, x + 0.22, top + 0.48, inner, th + 0.04, title, tpt, INK, bold=True)
        y = top + 0.48 + th + 0.22
        cv.text(s, x + 0.22, y, inner, 0.22, ctx.u("prompt_lang"), 9.5, INK3, bold=True, caps=True)
        y += 0.3
        prev = prompt_preview(p["body"])
        avail = top + ch - y - 0.16
        ppt = fit.fit("“" + prev + "”", inner, avail, 13.5, 12, italic=True)
        if not ppt:
            ppt = 12
            words = prev.split()
            while words and fit.height("“" + " ".join(words) + " …”", ppt, inner, italic=True) > avail:
                words.pop()
            prev = " ".join(words).rstrip(",;:") + " …"
        cv.text(s, x + 0.22, y, inner, avail, "“" + prev + "”", ppt, INK2, italic=True)
    # how to run it, in three moves
    hy = card_bottom + 0.16
    steps = [ctx.u("ai_how1"), ctx.u("ai_how2"), ctx.u("ai_how3")]
    sw = (CW - 0.2 * 2) / 3
    spt = min(fit.fit_single_line(t, sw - 0.62, 13, 10) or 10 for t in steps)
    for k, t in enumerate(steps):
        sx = M + k * (sw + 0.2)
        b = cv.oval(s, sx, hy + (how_h - 0.38) / 2, 0.38, fill=ctx.acc["fill"])
        cv.label(b, str(k + 1), 12, ctx.acc["on"], bold=True)
        cv.text(s, sx + 0.5, hy, sw - 0.55, how_h, t, spt, INK, bold=True, anchor=MIDDLE)
    ry = hy + how_h + 0.16
    cv.box(s, M, ry, CW, rh, fill=CYAN_SOFT, line=None, radius=0.12)
    cv.text(s, M + 0.25, ry, CW - 0.5, rh, rule, rpt, INK, bold=True, anchor=MIDDLE)
    cv.text(s, M, CONTENT_BOTTOM - foot_h + 0.04, CW, 0.26, ctx.u("full_prompt"), 10.5, INK3, italic=True)
    cv.footer(s, ctx.foot(day))
    cv.notes(s, notes_join(*[f"Prompt {k + 1}: {ctx.t(p['title'])}\n{p['body']}" for k, p in enumerate(prompts)]))


def quiz(ctx, d, qi, q, nq):
    """q is the app's shuffled question (build_smart.shuffled), so the letters match what learners see."""
    cv = ctx.cv
    s = cv.slide()
    day = d["day"]
    where = ctx.where(day, f"quiz{qi + 1}")
    lang = ctx.lang
    cv.text(s, M, 0.36, CW, 0.26, f"{ctx.u('day')} {day} · {ctx.u('quiz')} · {ctx.u('question')} {qi + 1}/{nq}", 11,
            ctx.acc["text"], bold=True, caps=True)
    stem = q[f"stem_{lang}"]
    spt = fit.fit(stem, CW, 1.9, 24, 15, bold=True)
    if not spt:
        spt = 15
        fit.need(spt, where + "/stem", stem, CW, 1.9)
    sh = fit.height(stem, spt, CW, bold=True)
    cv.text(s, M, 0.7, CW, sh + 0.05, stem, spt, INK, bold=True)
    y = 0.7 + sh + 0.3
    opts = [o[lang] for o in q["options"]]
    vote_h = 0.4
    avail = CONTENT_BOTTOM - vote_h - y
    gap = 0.14
    tw = CW - 1.1
    chosen = None
    for pt in [x / 2 for x in range(40, 25, -1)]:  # 20 .. 13
        hs = [max(0.78, fit.height(o, pt, tw) + 0.3) for o in opts]
        if sum(hs) + gap * 3 <= avail:
            chosen = (pt, hs)
            break
    if not chosen:
        pt = 13
        hs = [max(0.5, fit.height(o, pt, tw) + 0.2) for o in opts]
        fit.need(pt, where + "/options", " | ".join(opts), CW, avail)
    else:
        pt, hs = chosen
    for k, o in enumerate(opts):
        ry = y + sum(hs[:k]) + gap * k
        cv.box(s, M, ry, CW, hs[k], fill=CARD, line=LINE, radius=0.12)
        b = cv.oval(s, M + 0.16, ry + (hs[k] - 0.44) / 2, 0.44, fill=ctx.acc["soft"], line=ctx.acc["fill"], lw=1.25)
        cv.label(b, "ABCD"[k], 14, ctx.acc["text"], bold=True)
        oh = fit.height(o, pt, tw)
        cv.text(s, M + 0.85, ry + (hs[k] - oh) / 2, tw, oh + 0.04, o, pt, INK)
    cv.text(s, M, CONTENT_BOTTOM - vote_h + 0.08, CW, 0.3, ctx.u("vote"), 13, INK3, italic=True)
    cv.footer(s, ctx.foot(day))
    ci = q["correct_index"]
    if WITH_ANSWERS:
        cv.notes(s, notes_join(stem, f"{ctx.u('n_answer')}: {'ABCD'[ci]} — {opts[ci]}",
                               f"{ctx.u('n_why')}: {q[f'explanation_{lang}']}"))
    else:
        cv.notes(s, notes_join(stem, ctx.u("n_noanswer")))


def close(ctx, d, next_label):
    cv = ctx.cv
    s = cv.slide()
    day = d["day"]
    where = ctx.where(day, "close")
    top = max(CT, header(ctx, s, f"{ctx.u('day')} {day} · {ctx.u('journal')}", ctx.t(d["title"]), where, size=22,
                         color=INK2))
    comp = d.get("compliance") or ""
    comp_h = 0.0
    if comp:
        cpt = fit.fit(comp, CW, 0.62, 9.5, 8) or 8
        comp_h = fit.height(comp, cpt, CW) + 0.08
        cv.text(s, M, CONTENT_BOTTOM - comp_h + 0.06, CW, comp_h, comp, cpt, INK3)
    bottom = CONTENT_BOTTOM - comp_h - 0.62
    colw = (CW - 0.3) / 2
    # journal card
    jp = ctx.t(d["journal_prompt"])
    cv.box(s, M, top, colw, bottom - top, fill=CARD, line=LINE, radius=0.14)
    cv.text(s, M + 0.3, top + 0.25, colw - 0.6, 0.26, ctx.u("journal"), 11, ctx.acc["text"], bold=True, caps=True)
    jpt = fit.fit(jp, colw - 0.6, bottom - top - 0.8, 21, 13) or 13
    cv.text(s, M + 0.3, top + 0.62, colw - 0.6, bottom - top - 0.8, jp, jpt, INK)
    # motivation, quietly
    mo = ctx.t(d["motivation"])
    rx = M + colw + 0.3
    cv.box(s, rx, top, colw, bottom - top, fill=ctx.acc["soft"], line=None, radius=0.14)
    cv.text(s, rx + 0.3, top + 0.05, 1.0, 1.0, "“", 66, ctx.acc["text"], bold=True)
    mpt = fit.fit(mo, colw - 0.6, bottom - top - 1.3, 22, 13, italic=True) or 13
    mh = fit.height(mo, mpt, colw - 0.6, italic=True)
    cv.text(s, rx + 0.3, top + 1.05 + max(0.0, (bottom - top - 1.3 - mh) / 2 - 0.2), colw - 0.6, mh + 0.05, mo, mpt,
            INK, italic=True)
    # what comes next
    nl = f"{ctx.u('next')}: {next_label}"
    npt = fit.fit_single_line(nl, CW - 0.4, 13, 10, bold=True) or 10
    cv.pill(s, M, bottom + 0.16, nl, npt, NAVY, WHITE, h=0.36, pad=0.2)
    cv.footer(s, ctx.foot(day))
    cv.notes(s, notes_join(f"{ctx.u('journal')}: {jp}", mo, nl, comp))
