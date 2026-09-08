#!/usr/bin/env python3
"""
WCAG 2.1 contrast verification for the CircleOptionLab / 5 Circles color
system. Every number quoted in SKILL.md's "Colour ramp" section comes from
running this script, not from eyeballing hex codes. Re-run it yourself
before trusting a color pairing this file doesn't already cover, or after
changing any token in tokens.css / tailwind-theme.css.

Usage: python3 scripts/verify-contrast.py
No dependencies beyond the standard library.
"""


def _linearize(channel_8bit: float) -> float:
    c = channel_8bit / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(hex_color: str) -> float:
    hex_color = hex_color.lstrip("#")
    r, g, b = (int(hex_color[i:i + 2], 16) for i in (0, 2, 4))
    r, g, b = _linearize(r), _linearize(g), _linearize(b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(hex_a: str, hex_b: str) -> float:
    l1, l2 = relative_luminance(hex_a), relative_luminance(hex_b)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def verdict(ratio: float) -> str:
    if ratio >= 4.5:
        return "AA-normal-text OK"
    if ratio >= 3.0:
        return "AA-large-text-only (18px+/14px-bold+)"
    return "FAILS AA"


# Every pairing this design system actually uses in text-on-fill contexts.
# (label, foreground, background)
PAIRINGS = [
    ("Brand cyan on WHITE text",        "#00AEEF", "#FFFFFF"),
    ("Brand cyan on Ink text",          "#00AEEF", "#0B1B33"),
    ("Button blue on WHITE text",       "#0b74b8", "#FFFFFF"),
    ("Button blue on Ink text",         "#0b74b8", "#0B1B33"),
    ("Navy on WHITE text",              "#134A9A", "#FFFFFF"),
    ("Ink on WHITE",                    "#0B1B33", "#FFFFFF"),
    ("Dark ground on WHITE text",       "#050608", "#FFFFFF"),
    ("Light ground on Ink text",        "#f6f8fb", "#0B1B33"),
    ("Light UP (raw) on light ground",  "#388e3c", "#f6f8fb"),
    ("Light UP (raw) on white card",    "#388e3c", "#FFFFFF"),
    ("Light UP (SAFE FIX) on ground",   "#2e7d32", "#f6f8fb"),
    ("Light UP (SAFE FIX) on card",     "#2e7d32", "#FFFFFF"),
    ("Light DOWN on light ground",      "#cc2f3c", "#f6f8fb"),
    ("Dark UP on dark base",            "#4caf50", "#050608"),
    ("Dark DOWN on dark base",          "#f23645", "#050608"),
    ("Dark UP on card",                 "#4caf50", "#0d0f13"),
    ("Dark DOWN on card",               "#f23645", "#0d0f13"),
]

if __name__ == "__main__":
    print(f"{'Pairing':38s} {'Ratio':>8s}   Verdict")
    print("-" * 70)
    for label, fg, bg in PAIRINGS:
        r = contrast_ratio(fg, bg)
        print(f"{label:38s} {r:6.2f}:1   {verdict(r)}")
