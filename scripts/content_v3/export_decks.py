#!/usr/bin/env python3
"""Stage 1 (CIRCLE S.M.A.R.T) week decks: native, editable PowerPoint, built from the day JSON.

    python scripts/content_v3/export_decks.py                       # 3 weeks x English + Hinglish
    python scripts/content_v3/export_decks.py --week 2 --lang en    # one deck
    python scripts/content_v3/export_decks.py --allow-invalid       # dry run while content is still being edited
    python scripts/content_v3/export_decks.py --with-answers        # MENTOR edition (answers in notes) -> .mentor-decks/

Output: apps/learn/files/stage1/CIRCLE-SMART_Week{1,2,3}_Deck_{EN,HINGLISH}.pptx (or --out DIR).
Language keys: the English deck prints `en`, the Hinglish deck prints `hi` (SMART hi = Hinglish, Roman script).
There is no Devanagari deck (owner decision, 21 Sep 2026).

Every day is loaded and validated with build_smart.py's own validate_day() first. A week with an invalid day is
not written unless --allow-invalid is passed (then it is built and the failures are listed at the end). Quiz
options are shuffled exactly as the app shuffles them (build_smart.shuffled with the build's seeds), so the letters
on a slide match the app. Learner decks carry no quiz answers; the --with-answers mentor edition puts them in the
speaker notes and is written outside the served folder. Exam banks never go into a deck.
After a build, the "decks" section of manifest.json in the output folder records each deck's sha256 and the sha256
of the day files it was built from (scripts/ci/check_stage1_exports.py warns when a deck goes stale); the handout
exporter's section is left as it is.
Needs python-pptx and Pillow, and the Segoe UI font files (Windows) to measure text so nothing overflows.
Layout code: scripts/content_v3/deck/ (theme, fit, canvas, visuals, slides).
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import os
import random
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import build_smart as bs  # noqa: E402
from deck import fit  # noqa: E402
from deck.canvas import Canvas  # noqa: E402
from deck import slides as S  # noqa: E402
from deck.theme import REPO  # noqa: E402

OUT = os.path.join(REPO, "apps", "learn", "files", "stage1")
LANG_FILE = {"en": "EN", "hi": "HINGLISH"}


def load_days():
    """All 21 day files, each validated. Returns ({day: data}, {day: error or None})."""
    days, errors = {}, {}
    for n in range(1, 22):
        name = f"day{n:02d}.json"
        try:
            d = bs.load(name)
        except bs.Bad as e:
            errors[n] = str(e)
            continue
        days[n] = d
        try:
            bs.validate_day(d, name)
            if d.get("day") != n:
                raise bs.Bad(f"{name}: day field says {d.get('day')}")
            errors[n] = None
        except (bs.Bad, KeyError, TypeError, AttributeError) as e:
            errors[n] = str(e)
    return days, errors


def app_quiz_order(days):
    """Each day's 5 questions in the app's shuffled order (same seeds and targets as build_smart.build)."""
    out = {}
    allq = [(n, days[n]["quiz"]) for n in range(1, 22) if n in days]
    if len(allq) == 21:
        targets = bs.balanced_targets(sum(len(q) for _, q in allq), 20260919)
    else:  # a day file does not parse right now: keep going with a per-day order (letters may differ from the app)
        targets = None
    t = 0
    ok = targets is not None
    for n, qs in allq:
        rng = random.Random(1000 + n)
        tg = targets or bs.balanced_targets(len(qs), 1000 + n)
        res = []
        for k, q in enumerate(qs):
            try:
                res.append(bs.shuffled(q, rng, tg[t] if targets else tg[k]))
            except (KeyError, TypeError, StopIteration, IndexError):
                ok = False   # a question mid-edit (no correct option yet): leave it out of the dry run
            t += 1
        out[n] = res
    return out, ok


def next_label(ctx, days, n):
    if n == 21:
        return ctx.u("stage2")
    nd = days.get(n + 1)
    return f"{ctx.u('day')} {n + 1} · {ctx.t(nd['title'])}" if nd else f"{ctx.u('day')} {n + 1}"


def build_week(week, lang, days, quizzes, weeks_src, out_dir):
    wk = next(w for w in weeks_src if w["number"] == week)
    cv = Canvas()
    ctx = S.Ctx(cv, lang, week, bs.L(wk["title"], f"weeks.json[{week}].title")[lang])
    nums = list(range((week - 1) * 7 + 1, week * 7 + 1))
    wdays = [days[n] for n in nums if n in days]
    S.cover(ctx, wdays)
    S.week_map(ctx, wdays)
    for d in wdays:
        n = d["day"]
        S.divider(ctx, d)
        S.story(ctx, d)
        topics = d.get("topics") or []
        for i, t in enumerate(topics):
            S.topic(ctx, d, i, t, len(topics))
        S.key_terms(ctx, d)
        S.recap(ctx, d)
        S.task(ctx, d)
        for k, a in enumerate(d.get("artefacts") or []):
            S.artefact(ctx, d, k, a)
        S.game(ctx, d)
        S.ai_lab(ctx, d)
        qs = quizzes.get(n) or []
        for qi, q in enumerate(qs):
            S.quiz(ctx, d, qi, q, len(qs))
        S.close(ctx, d, next_label(ctx, days, n))
    S.disclaimer(ctx)
    os.makedirs(out_dir, exist_ok=True)
    edition = "_MENTOR" if S.WITH_ANSWERS else ""
    path = os.path.join(out_dir, f"CIRCLE-SMART_Week{week}_Deck_{LANG_FILE[lang]}{edition}.pptx")
    cv.save(path)
    return path, cv.count


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def text_sha256(path):
    """sha256 of a text file with CRLF read as LF, so a Windows checkout (core.autocrlf) and CI agree."""
    with open(path, "rb") as f:
        return hashlib.sha256(f.read().replace(b"\r\n", b"\n")).hexdigest()


def git(*args):
    try:
        return subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True, timeout=30).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def write_manifest(out_dir, made):
    """Add or refresh the "decks" section of manifest.json (the handout exporter owns its own section), so
    scripts/ci/check_stage1_exports.py can warn when a day file changes after a deck was built."""
    mpath = os.path.join(out_dir, "manifest.json")
    try:
        with open(mpath, encoding="utf-8") as f:
            manifest = json.load(f)
    except (OSError, ValueError):
        manifest = {}
    try:
        bs.build()
        validation = "ok"
    except bs.Bad as e:
        validation = f"failed: CONTENT ERROR: {str(e)[:300]}"
    prev = {e.get("name"): e for e in (((manifest.get("exports") or {}).get("decks") or {}).get("files") or [])}
    for path, n, week, lang in made:
        days = [f"day{d:02d}.json" for d in range((week - 1) * 7 + 1, min(21, week * 7 + 1) + 1)]  # + next day's title
        prev[os.path.basename(path)] = {
            "name": os.path.basename(path), "kind": "deck", "week": week, "lang": lang,
            "bytes": os.path.getsize(path), "slides": n, "sha256": sha256(path),
            "days": {d: text_sha256(os.path.join(bs.SRC, d)) for d in days if os.path.exists(os.path.join(bs.SRC, d))}}
    manifest.setdefault("about", "Stage 1 class files in this folder, with the sha256 of every "
                                 "scripts/content_v3/smart/dayNN.json each one was built from.")
    manifest.setdefault("exports", {})
    manifest["exports"]["decks"] = {
        "generator": "scripts/content_v3/export_decks.py",
        "generated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "git_commit": git("rev-parse", "HEAD"), "git_dirty": bool(git("status", "--porcelain")),
        "validator": validation,
        "note": "Decks are built from the day files directly (not from content/*.json).",
        "files": [prev[k] for k in sorted(prev)],
    }
    with open(mpath, "w", encoding="utf-8") as f:
        f.write(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n")
    return mpath, validation


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--week", type=int, choices=[1, 2, 3], action="append", help="repeatable; default all three")
    ap.add_argument("--lang", choices=["en", "hi"], action="append", help="en = English, hi = Hinglish; default both")
    ap.add_argument("--out", default=OUT, help="output folder (default apps/learn/files/stage1)")
    ap.add_argument("--with-answers", action="store_true",
                    help="MENTOR edition: quiz answers in the speaker notes, file names end _MENTOR, written to "
                         ".mentor-decks/ (git-ignored) unless --out is given; never served to learners")
    ap.add_argument("--allow-invalid", action="store_true",
                    help="build weeks whose days fail validation (dry run); the failures are listed")
    a = ap.parse_args(argv)
    if a.with_answers:
        S.WITH_ANSWERS = True
        if a.out == OUT:
            a.out = os.path.join(REPO, ".mentor-decks")
        os.makedirs(a.out, exist_ok=True)
    weeks = a.week or [1, 2, 3]
    langs = a.lang or ["en", "hi"]

    weeks_src = bs.load("weeks.json")
    days, errors = load_days()
    quizzes, app_order = app_quiz_order(days)
    bad = {n: e for n, e in errors.items() if e}

    made, skipped = [], []
    for week in weeks:
        nums = range((week - 1) * 7 + 1, week * 7 + 1)
        wbad = [n for n in nums if n in bad]
        missing = [n for n in nums if n not in days]
        if missing or (wbad and not a.allow_invalid):
            skipped.append((week, wbad, missing))
            continue
        for lang in langs:
            try:
                path, n = build_week(week, lang, days, quizzes, weeks_src, a.out)
            except (KeyError, TypeError, AttributeError, IndexError, ValueError) as e:
                if not a.allow_invalid:
                    raise
                # dry run: a day that is mid-edit may be malformed; report it and keep building the other decks
                skipped.append((week, [f"{lang} deck crashed: {type(e).__name__}: {e}"], []))
                continue
            made.append((path, n, week, lang))

    print()
    for path, n, _, _ in made:
        shown = os.path.relpath(path, REPO) if os.path.abspath(path).startswith(REPO) else path
        print(f"  {shown:<62} {n:>4} slides  {os.path.getsize(path) / 1024:8.0f} KB")
    if not app_order:
        print("\n  NOTE: not every day file parses, so quiz letters use a per-day order (may differ from the app).")
    if bad:
        print(f"\n  {'BUILT FROM' if a.allow_invalid else 'NOT BUILT:'} content that fails validation "
              f"(build_smart.validate_day):")
        for n, e in sorted(bad.items()):
            print(f"    day{n:02d}: {e[:220]}")
    for week, wbad, missing in skipped:
        why = f"missing day files {missing}" if missing else f"invalid days {wbad} (pass --allow-invalid for a dry run)"
        print(f"\n  SKIPPED week {week}: {why}")
    if fit.OVERFLOW:
        print(f"\n  {len(fit.OVERFLOW)} text block(s) could not be fitted at their smallest size:")
        for o in fit.OVERFLOW[:40]:
            print("    " + o)
    else:
        print("\n  Text fit: every block measured and fitted (0 overflows).")
    if made and not a.with_answers:
        mpath, validation = write_manifest(a.out, made)
        print(f"\n  {os.path.basename(mpath)}: decks section updated (validator: {validation[:120]})")
    print()
    if skipped or (bad and not a.allow_invalid):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
