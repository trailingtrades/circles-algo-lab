# 5C LEARN — MEMORY FILE (paste at the top of any new chat)

Owner: Rahul Sarawgi, 5 Circles Pvt Ltd, SEBI Registered Research Analyst, Reg. No. INH000020004.
Chat language: Hinglish (Roman script). Regulatory/disclaimer text: English, verbatim.
Working style: deliver files not chat; verify before claiming; flag errors/compliance gaps; MCQ decisions, not open questions.

## Two SEPARATE products in ONE repo (never mix)
Repo: github.com/trailingtrades/circles-algo-lab (default branch `main`)

| Product | Where in repo | Live | Notes |
|---|---|---|---|
| Algo Lab (single-file HTML) | `/index.html` (repo root) | algo.circleoptionlab.com | Independent. Do not import 5C Learn code/CSS into it. |
| 5C Learn (learner dashboard, Next.js + Supabase) | `/apps/learn/` + `/content/` + `/supabase/` + `/certificates/` + `/docs/` | Not deployed yet (Vercel config ready) | Independent. `apps/learn/vercel.json` ignoreCommand builds only on `apps/learn`, `content`, `supabase` changes. |

Rule: a task on one product must not edit the other's files. Check `git diff --stat` before commit.

## 5C Learn — where everything lives
- Course content (source of truth, JSON): `content/levels.json`, `content/weeks.json`, `content/sessions/{foundation,intermediate,advanced}.json` (60 sessions), `content/quizzes/foundation.json`, `content/exams.json`, `content/exams/foundation-w1.json`, `content/resources.json`, `content/vocabulary.json`
- Content generator: `scripts/gen_content.py` — DB seed: `apps/learn/scripts/seed.ts` — demo seed (never on prod): `apps/learn/scripts/seed-demo.ts`
- App: `apps/learn/src/app/learn/...` (login, invite, home, path, session, exam, score, leaderboard, portfolio, certificate, resources, profile, mentor, admin)
- DB: `supabase/migrations/20260908000001…0006` (RLS on every table). Test-only shim `supabase/tests/00_local_auth_shim.sql` — NEVER apply to real Supabase.
- Certificates: `certificates/template.html`, `build_cert.py`, `render_from_db.py`; GitHub Action `.github/workflows/cert-render.yml`
- CI: `.github/workflows/learn-ci.yml`; gates in `scripts/ci/` (compliance, responsive, cert PDF)
- Docs: `docs/5C_LEARN_HANDOFF_08Sep2026.md` (full handoff), `docs/5C_LEARN_DEPLOY_VERCEL.md`, phase gate reports `docs/5C_LEARN_PHASE0..6_*.md`
- Static preview (12 screens, demo data, no JS): `docs/5C_LEARN_PREVIEW.html`
- Env: `apps/learn/.env.example` committed; real keys never. `SUPABASE_SERVICE_ROLE_KEY` server-only. `CERT_SIGNING_SECRET` never rotated after first certificate.

## §1 Non-negotiables (always in force)
1. SEBI Reg. No. INH000020004 on every screen. 2. Tier-1 disclaimer verbatim, never clamped/translated. 3. Never white text on #00AEEF. 4. No assured-returns language, EN or Hinglish. 5. Roman-script Hinglish only, zero Devanagari. 6. Leaderboard ranks PROCESS, never money. 7. No live market data/orders/advisory; virtual money only. 8. No emoji in product UI. 9. Broker-agnostic. 10. Only permitted F&O-loss stat: SEBI FY26 study (Aug 2026) 87.7% / Rs 91,685 cr / Rs 1.17 lakh, always stamped "SEBI FY26 study, Aug 2026". Never print repo rate, STT/cost rates, or the RBI reference rate (link to source instead).

## Status (14 Sep 2026)
- PR #1 (5C Learn build) and PR #2 (Algo Lab index.html fixes) merged to `main`.
- Branch `claude/5c-learn-dashboard-build-taxape` ahead of main: Drive links in resources + preview skeleton fix.
- Content is DRAFT generated from the master prompt (60 sessions). Real decks/handouts/videos are NOT in GitHub or Drive.
- Drive material found: `5Circles_AI_Trading_Course_Curriculum_v2.pdf` (Tier 1 21 days / Tier 2 10 wk / Tier 3 20 wk, uses stale ~91% FY25 stat), MockPortfolio xlsx, Question Bank.

## OPEN DECISION (blocks content work)
A) 60-session structure (master prompt) is canonical → need `CLAUDE.md` + `5C_AITC_HANDOFF_02Sep2026.md` uploaded.
B) Curriculum v2 (Drive PDF) is canonical → re-seed dashboard to Tier 1 (21 days, ORB + EMA Pullback).

## Go-live checklist (Rahul)
Supabase project + env → run migrations → first admin invite → Resend domain → Vercel project (Root Directory `apps/learn`, region bom1) → GitHub secrets for cert-render → phone/laptop click-through.

## Known open items
Q8 domain; Compliance Officer @5circles.co email; second signatory; quiz banks for sessions 6–60; 11 exam papers; videos; deck/handout uploads.
