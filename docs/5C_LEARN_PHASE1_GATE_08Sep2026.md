# 5C Learn — PHASE 1 Gate Report
**Date:** 08-Sep-2026 · **Branch:** `claude/5c-learn-dashboard-build-taxape` · **App:** `apps/learn/` (Next.js 16, App Router, TypeScript, Tailwind v4)
**Decisions applied:** Q1-A (this repo, `apps/learn/`), Q2-B (interim `check_responsive.py`), Q9-C (no context files; content in Phase 3).

## Built
- Scaffold with `tokens.css`, `tailwind-theme.css`, `Icon.tsx`, 4 IBM Plex woff2 (self-hosted at `/fonts/`), both logo PNGs — all verbatim from `circleoptionlab-design`.
- App shell: 56px `.col-header` with logo + credential line, 220px sidebar at ≥768px, 64px bottom nav below, `ComplianceFooter` (credential line + Tier-1, never clamped).
- EN/Hinglish toggle and dark/light toggle, persisted under `fc_lang` / `fc_theme` (same keys as the Algo Lab page).
- Components: `ProgressRing`, `SessionCard`, `ComplianceFooter`, `Header`, `Sidebar`/`BottomNav`.
- Screens: `/learn` login (Tier-1, no signup link), `/learn/home` static demo, stubs with empty states for path/portfolio/leaderboard/certificate/resources/profile, branded `not-found` and `global-error` both carrying the credential line + Tier-1.
- `src/lib/compliance/strings.ts` — single source for Tier-1/2/3 + credential line; CI byte-compares it to `scripts/ci/canonical/*.txt`.
- CI: `.github/workflows/learn-ci.yml` (tsc, lint, build, contrast, compliance, responsive) and `.githooks/pre-commit` (enable with `git config core.hooksPath .githooks`).

## Gate results
| Gate | Result |
|---|---|
| Screenshots at 320 / 360 / 768 / 1366 / 1536 / 1920 | 24 PNGs in `docs/phase1-screens/` (home + login × dark-EN + light-HI) |
| Page-body horizontal scroll at any width | None (`scrollWidth == clientWidth` at all 24 renders) |
| Credential line visible at 320px without horizontal scroll | Yes — footer credential line fully inside viewport at 320 |
| Tier-1 in footer, unclamped | 478 chars rendered at every width; no line-clamp / ellipsis / max-height |
| Body font | `"IBM Plex Sans"` at every render (no Inter / Poppins / system-ui fallback) |
| `scripts/ci/check_responsive.py` (interim) | 10 files, 0 findings |
| `scripts/ci/check_compliance.py` | 104 files, 0 failures (SEBI number in every rendered route, Tier-1 byte-identical, 0 Devanagari, 0 emoji, 0 banned phrases, no cyan+white) |
| `verify-contrast.py` | Unchanged tokens; every text-on-fill pairing used is AA. Only pre-known fails (cyan+white, raw `#388e3c`) are unused. |
| `tsc --noEmit` / `eslint` / `next build` | Clean |

## Known limits / carried forward
- `check_responsive.py` is the interim rewrite (Q2-B). Swap in the skill's own script when Rahul restores the zip.
- `_global-error.html` in `.next/` is Next's internal pre-hydration shell and is excluded from the rendered-route check; the custom `global-error.tsx` carries the footer at runtime.
- Header credential line hides below 480px (footer one stays); at 320–479px the number is footer-only, still on-screen.
- Home data is static demo copy. No auth, no Supabase yet (Phase 2).
- Tier-2 disclaimer is defined but not yet placed (leaderboard is Phase 4).

---
Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004
