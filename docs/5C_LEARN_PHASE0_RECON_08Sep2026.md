# 5C Learn — PHASE 0 Recon & File Plan
**Date:** 08-Sep-2026 · **Branch:** `claude/5c-learn-dashboard-build-taxape` · **Repo:** `trailingtrades/circles-algo-lab`
**Status:** No code written. Awaiting Rahul's approval of §4 file plan and answers to §6.

---

## 1. What the repo actually is

| Item | Found |
|---|---|
| Files | 4: `index.html` (1.46 MB, single self-contained page), `README.md`, `CNAME`, `.nojekyll` |
| Product | **Circles Algo Lab** — 36 NSE algo strategies, backtests, Pine/Python, 4-level course. Static GitHub Pages site at `algo.circleoptionlab.com` |
| Framework | None. No `package.json`, no Next.js, no Supabase, no CI, no tests |
| Branches | `main`, `claude/5c-learn-dashboard-build-taxape` (identical to main) |
| Node / npm | v22.22.2 / 10.9.7 available in the build container |
| WeasyPrint | Not installed in container (`pip install weasyprint` needed for Phase 5 CI) |

**This is not the repo the master prompt describes.** See §2, item 1.

## 2. Contradictions between the master prompt and reality

| # | Master prompt says | Reality | Impact / recommendation |
|---|---|---|---|
| 1 | Repo is `trailingtrades/circles-traders-club`; do not touch `public/ai-trading-dashboard.html` and `public/AI-DASHBOARD-MEMORY.md` | Session repo is **`circles-algo-lab`**. Neither file exists here. There is no `public/` dir. | Either (a) 5C Learn lives here as a new Next.js app alongside the static `index.html`, or (b) session should be re-opened on `circles-traders-club`. **Recommend (a)** — see §6 Q1 — and link out to the Algo Lab page as a resource. |
| 2 | Branch `claude/5c-learn-dashboard` | Assigned branch is `claude/5c-learn-dashboard-build-taxape` | Using the assigned branch. Cosmetic. |
| 3 | Read `D:\Downloads\CLAUDE.md`, `5C_AITC_HANDOFF_02Sep2026.md`, `AIDASHBOARDMEMORY.md` before any code | **None of the three exist** in the cloud container (Windows paths). Not in repo, not in skills. | Phase 3 content seed (60 sessions, quiz banks, canonical vocabulary) **cannot be built from the skill library alone**. The three files must be committed to `/content/source/` or pasted before Phase 3. §8 of the prompt carries enough structure for Phase 1–2. |
| 4 | Existing Algo Lab dashboard must not be contradicted | Existing `index.html` violates three §1 rules itself: (a) embeds **Inter** as body font (§4 bans it), (b) contains **5 Devanagari characters** (`usके`, `आधी` — typos inside Hinglish strings), (c) quotes **87.7% stamped "FY25"** 13 times, never "FY26"; `FY26` appears 0 times. | Out of scope for this build (do not touch `index.html`), but the §15 CI check "every `87.7` within 200 chars of `FY26`" will **fail on day one** if run repo-wide. Scope CI to `apps/learn/**` and `content/**`, and log a separate fix ticket for `index.html`. |
| 5 | §15: "Old F&O stat `93%` must not appear" | `93%` appears twice in `index.html` as `'93% PoP'` — an options probability-of-profit example, **not** the old SEBI stat | Legit context. Confirms the CI check needs context-classing, not a bare grep. |
| 6 | §3 #3: `responsive-dashboard-layout` supplies `check_responsive.py`, `responsive-base.css`, `dashboard-shell.html`, 4 reference files | Cloud copy has **only `SKILL.md`** (7.6 KB). All 7 linked files missing — confirms §18 item 1. | Phase 1 gate 2 (`check_responsive.py` clean) is decorative until Rahul re-uploads `responsive-dashboard-layout.zip`. Fallback: write a minimal checker from the ~20 failure modes listed in SKILL.md. See §6 Q2. |
| 7 | §12: `Icon.tsx` has 50 glyphs | Has **51 exports** (50 icons + the `ICONS` map). Fine. | None. |
| 8 | §2: Tier-2 disclaimer uses `⚠️` (U+26A0 U+FE0F) | `compliance.md` Tier-1 uses `⚠` (no VS16); Tier-2 uses `⚠️`. Plain-text Tier-1 variant exists; no plain Tier-2. | Matches prompt. Emoji-scan whitelist must cover both codepoint forms. |
| 9 | §2 grievance: "confirm exact email/link with Rahul" | `identity.md` already publishes the escalation matrix: Compliance Officer Suchita Sarawgi, `suchitasarawgi.co@gmail.com`, +91 9151802012; SCORES + ODR at `smartodr.in`; 21-working-day commitment. | Usable as-is **if Rahul confirms** the Gmail address is what should appear in-app. See §6 Q4. |
| 10 | §5 Supabase Auth email+password; §4 env `RESEND_API_KEY` | No Supabase project, no email provider exists yet. Both are paid-tier decisions above cohort size. | Blocked on §6 Q3, Q5. |
| 11 | §3 both `fivecircles-brand-kit` and `-2` are installed | Confirmed: both present in `synced/`. | Build reads **kit-2 only**. Deprecation of kit-1 is a skill-library action, not a repo action. |

## 3. What already exists and can be reused

**From `circleoptionlab-design` (copy verbatim, do not retype):**
- `tokens.css` (13.4 KB) — 24 `.col-*` classes incl. `.col-card`, `.col-btn--primary/--navy/--ghost`, `.col-chip--up/--down`, `.col-tabs`, `.col-header`, `.col-input`, `.col-table`, `.col-empty`, `.col-light` toggle
- `tailwind-theme.css` — Tailwind v4 `@theme` block, phone legibility `@layer base` (16px inputs <640px)
- `Icon.tsx` — 50 Lucide glyphs, zero deps
- 4 woff2 fonts + `LICENSE-OFL.txt`
- `five-circles-logo.png` / `five-circles-logo-white.png`
- `scripts/verify-contrast.py`

**From `fivecircles-brand-kit-2`:**
- Tier-1 (plain + glyph), Tier-2, Tier-3, credential line — will be stored once in `packages/compliance/strings.ts` and byte-compared in CI
- `assets/signature/founder-signature-transparent.png` (certificate, Phase 5)
- Identity facts for footer / verify page

**From `sebi-proofreader`:**
- `compliance_scan.py` — 17 prohibited patterns EN+Hinglish. **No context-classing** — it will flag the Tier-1 disclaimer's own "in no way guarantee" and every quiz distractor. The context-classing `sebi_proofreader.py` referenced in §15 lives in `D:\Downloads\handout1\build\` — **not available here**. Must be re-supplied or re-implemented (small: whitelist the canonical disclaimer strings + a `distractor: true` flag on quiz options).

**From the existing `index.html`:**
- `localStorage` keys `fc_lang` and `fc_theme` — the new app **must reuse these exact keys** so a learner who toggles Hinglish on the Algo Lab page gets Hinglish in 5C Learn.
- Link target for `/learn/resources`: `https://algo.circleoptionlab.com`

## 4. Proposed file plan (monorepo-lite inside this repo)

Keep `index.html`, `CNAME`, `.nojekyll` untouched at root. GitHub Pages keeps serving the Algo Lab. 5C Learn is a separate deployable in `apps/learn/`.

```
apps/learn/
  package.json · next.config.ts · tsconfig.json · .env.example · postcss.config.mjs
  public/fonts/IBMPlex*.woff2 (4) · public/brand/logo.png · logo-white.png · founder-signature-transparent.png
  src/app/globals.css                        # @import tailwindcss; @import tokens; @import tailwind-theme
  src/app/layout.tsx                         # <html lang="en">, viewport meta, .col-root .col-ground-dark, LangProvider
  src/app/learn/page.tsx                     # login (public)
  src/app/learn/invite/[token]/page.tsx      # set password + code of conduct + 3 onboarding cards
  src/app/verify/[certId]/page.tsx           # public verify (no auth)
  src/app/learn/(app)/layout.tsx             # shell: 56px header + sidebar / bottom nav + ComplianceFooter
  src/app/learn/(app)/home/page.tsx
  src/app/learn/(app)/path/page.tsx
  src/app/learn/(app)/session/[n]/page.tsx
  src/app/learn/(app)/exam/[id]/page.tsx
  src/app/learn/(app)/portfolio/page.tsx
  src/app/learn/(app)/leaderboard/page.tsx
  src/app/learn/(app)/certificate/page.tsx
  src/app/learn/(app)/resources/page.tsx
  src/app/learn/(app)/profile/page.tsx
  src/app/learn/(app)/mentor/page.tsx
  src/app/learn/(app)/admin/**                # cohorts · invites · content · quiz · certificates · audit · compliance
  src/app/api/**                              # route handlers, service-role only: invite, score-recompute, cert-issue, verify
  src/components/ui/Icon.tsx                  # verbatim from skill
  src/components/ui/{ProgressRing,SessionCard,QuizBlock,PromptBlock,ScoreBreakdown,RankChip,LockedGate,ComplianceFooter,LangToggle,ThemeToggle}.tsx
  src/components/shell/{Header,Sidebar,BottomNav}.tsx
  src/lib/compliance/strings.ts              # Tier-1/2/3 + credential line, single source, CI byte-checks it
  src/lib/i18n/{en,hi}.ts · useLang.ts       # fc_lang key
  src/lib/supabase/{client,server,admin}.ts
  src/lib/scoring/engine.ts                  # pure fn: score_events[] -> scores; deterministic, tested
  src/lib/cert/{criteria,number,hmac}.ts
  src/styles/tokens.css · tailwind-theme.css # verbatim from skill
supabase/
  migrations/0001_schema.sql · 0002_rls.sql · 0003_audit.sql · 0004_views.sql
  functions/issue-certificate/index.ts
  seed/seed.ts                               # reads /content/*.json
  tests/rls.test.ts                          # student A cannot read B; student cannot write score_events/certificates
content/
  levels.json · weeks.json · sessions/{foundation,intermediate,advanced}.json
  quizzes/*.json · exams/*.json · vocabulary.json
  source/                                    # CLAUDE.md, HANDOFF, AIDASHBOARDMEMORY — to be supplied
certificates/
  template.html · template.css               # five-circles-design-system (print) — Baloo 2 / Poppins
  build_cert.py                              # WeasyPrint
scripts/ci/
  check_compliance.py                        # ports compliance_scan + context-classing + custom §15 checks
  check_devanagari.py · check_emoji.py · check_tier1_bytes.py · check_stat_stamp.py · check_cyan_white.py
  check_responsive.py                        # restored from zip, or minimal rewrite (Q2)
.github/workflows/ci.yml                     # lint · typecheck · unit · rls tests · all scripts/ci/*
.husky/pre-commit
docs/5C_LEARN_PHASE0_RECON_08Sep2026.md      # this file
```

**Not created:** any signup route, any P&L board, any AI chat, any real-price fetch (§16).

## 5. Audit findings (fix regardless of the build)

1. `index.html` uses **Inter** as the primary UI font. Banned by §4 / `circleoptionlab-design`. Separate ticket.
2. `index.html` carries **2 Devanagari typos** (`usके`, `आधी`). Two-character fix; violates §1.5 today on a live page.
3. `index.html` stamps **87.7% as FY25** (13×). §1.10 mandates "SEBI FY26 study, Aug 2026". Live compliance drift on `algo.circleoptionlab.com`. Needs a fix on `main` independent of this build.
4. `responsive-dashboard-layout` is a stub on cloud — confirmed (7.6 KB, one file).
5. `compliance_scan.py` has no context-classing; the referenced richer script is on Rahul's Windows box only.
6. `identity.md` lists three personal Gmail addresses on the SEBI escalation matrix and an 8-digit Customer Care number — pre-existing, will surface on the in-app grievance footer if copied verbatim.
7. `circleoptionlab-design` open question (is "CircleOptionLab" a product name?) is now half-answered by this repo's own `CNAME`: `algo.circleoptionlab.com` is live. Treat as a real product domain.

## 6. Decisions needed before Phase 1 (MCQ)

**Q1. Repo placement**
- A) `apps/learn/` inside `circles-algo-lab` on this branch (recommended — session is already here, static site untouched)
- B) Re-open session on `circles-traders-club` as the prompt says
- C) New repo `5c-learn`

**Q2. `check_responsive.py` missing**
- A) Rahul re-uploads `responsive-dashboard-layout.zip` to the skill library before Phase 1 (recommended)
- B) I write a minimal checker from SKILL.md's listed failure modes, mark it "interim"
- C) Skip gate 2 for Phase 1, restore in Phase 6

**Q3. Transactional email**
- A) Resend (free 3k/month, simplest with Next.js)
- B) Supabase built-in SMTP (rate-limited to ~4/hr on free tier — too low for bulk invites)
- C) Gmail SMTP via `info@5circles.co`
- D) SendGrid

**Q4. Grievance footer**
- A) Show Compliance Officer name + `suchitasarawgi.co@gmail.com` + phone + SCORES + ODR link, verbatim from identity.md
- B) Show SCORES + ODR links + "Compliance Officer: Suchita Sarawgi" with no email until an `@5circles.co` address exists
- C) Different address (specify)

**Q5. First-launch cohort size**
- A) ≤50 students, 1–2 cohorts (Supabase free tier holds)
- B) 50–200 (Supabase Pro, ~$25/mo — paid, needs approval)
- C) >200

**Q6. Class videos**
- A) YouTube unlisted · B) Vimeo · C) Google Drive / OneDrive · D) Not recorded yet (Watch tab = placeholder)

**Q7. Practice-artefact grading (250 pts)**
- A) Rahul grades · B) A named mentor grades · C) Nobody available — move 150 pts to Quiz/Exams, keep 100 as self-attested checklist

**Q8. Domain**
- A) `learn.5circles.co` · B) `5circles.co/learn` · C) `learn.circleoptionlab.com` (matches Algo Lab)

**Q9. Context files (CLAUDE.md, HANDOFF, AIDASHBOARDMEMORY)**
- A) Commit them to `content/source/` on this branch · B) Paste into chat before Phase 3 · C) Phase 1–2 proceed without them; Phase 3 blocked until supplied

---
Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004
