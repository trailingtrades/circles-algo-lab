# 5C LEARN · HANDOFF — 08-Sep-2026
**Product:** 5C Learn — the AI Trading Course learner dashboard · **Owner:** Rahul Sarawgi, 5 Circles Pvt Ltd
**Repo:** `trailingtrades/circles-algo-lab` · **Branch:** `claude/5c-learn-dashboard-build-taxape` · **App:** `apps/learn/` (Next.js 16, App Router, TypeScript, Tailwind v4) · **DB:** Supabase Postgres (`supabase/migrations/` 0001–0006)
**Status:** Phases 0–6 built and gated. Not yet connected to a real Supabase project or deployed. Rahul's phone + laptop click-through is the final gate.

---
## 1. Quick-resume card
| | |
|---|---|
| Run locally | `cd apps/learn && npm ci && npm run dev` (preview mode without env: every screen renders with demo data) |
| Full gates | `npm run build && npm run test:all && python3 ../../scripts/ci/check_compliance.py src .next/server/app ../../content ../../supabase ../../certificates && python3 ../../scripts/ci/check_responsive.py src .next/server/app` |
| Local DB | Postgres 16 on port 5499 with `supabase/tests/00_local_auth_shim.sql` → `npm run db:reset && npm run db:seed && npm run db:seed:demo` |
| Audits | `npm run audit:a11y` (axe) · `npm run audit:lh` (Lighthouse mobile) — both need `npx next start -p 3123` running |
| Certificate | `python3 certificates/build_cert.py '<json>' out.pdf` → `python3 scripts/ci/check_cert_pdf.py out.pdf` |
| Docs | `docs/5C_LEARN_PHASE{0..6}_*.md` (each phase's gate report), `docs/phase*-screens/`, `docs/phase6-reports/` |

## 2. Locked decisions (from the master prompt + the six phase gates)
Q1-A app lives in this repo under `apps/learn/`, Algo Lab `index.html` untouched · Q2-B interim `check_responsive.py` until the skill zip is restored · Q3-A Resend · Q5-A ≤50 students (free tier) · Q6-A YouTube unlisted · Q7-A Rahul grades practice artefacts (250 pts kept) · Q9-C content skeleton from §8 (all sessions `draft: true`) · Q4-B grievance block = SCORES + ODR + Compliance Officer name, no email · single signatory · no CIRI on the certificate · leaderboard default `First name + L.`, alias optional.

## 3. What exists
- **Auth & roles:** admin-issued accounts only (no signup route), 7-day single-use invites, Supabase magic-link reset, httpOnly/secure/lax cookies, server-side role gate, suspension revokes instantly, every admin action in `audit_log` (append-only).
- **RLS:** all tables; student = own rows, mentor = assigned cohort, admin = all; `score_events` / `scores` / `certificates` have no client write path; `quiz_questions.correct_index` column-denied. Proof suite: 41 assertions.
- **Content:** 3 levels · 12 weeks · 60 sessions · 41 resource placeholders · 12 exams · Foundation W1 quiz (15 Q) + exam (20 Q). Source `/content/*.json` → `db:seed`; once connected, the admin editor writes the DB and pages read the DB (`lib/content/live.ts`), so typo fixes need no redeploy.
- **Learning:** path ladder, session screen (Watch / Read / AI Lab / Quiz / Journal), session-complete gate (quiz + journal), level gating (previous-level certificate or audited admin override).
- **Scoring:** immutable `score_events`, deterministic `recompute_scores()` with §9 caps (200/200/250/250/100), best-attempt exams with 80% retake cap, mentor Process grades A–F (Outcome stored separately, never scored), next-3-actions.
- **Leaderboards:** Process Score · Consistency · Most Improved; cohort-scoped; top-10 named, everyone else own row + band; Tier-2 + credential line on screen; no P&L anywhere (SQL asserted).
- **Certificates:** six criteria, auto-issue server-side, `5C-<LEVEL>-<YYYY>-<6 base32>`, HMAC `verify_hash`, WeasyPrint A4 landscape PDF (Baloo 2 / Poppins, navy frame, gold seal, QR, signature block with credential line, Tier-1 at body size), private Storage bucket, Tier-2 email, public `/verify/[certId]` with lookup + rate limit, revoke with reason (row never deleted).
- **Admin:** cohorts, bulk import (paste/CSV), roster actions, content + quiz editor with runtime compliance scan, certificates, level override, compliance report.
- **Hardening:** error boundaries (route + global, SEBI line stays), loading skeletons, offline banner, skip link, focus rings, `aria-live` on quiz/exam/timer.

## 4. Gate results at handoff
| Gate | Result |
|---|---|
| Test suites (gating 16 · rules 10 · cert 13 · verify 7 · RLS 41 · scoring 20) | all pass |
| Compliance checker (src + built HTML + content + supabase + certificates) | 0 failures |
| sebi-proofreader `compliance_scan.py` over 1,011 extracted UI strings | 6 hits, all context-classed (3 quiz distractors, 1 labelled scam example, Tier-1 itself ×2) — see `docs/phase6-reports/sebi-proofreader-scan.txt` |
| axe WCAG 2.1 AA, 17 routes × 2 themes | 0 violations (3 light-theme contrast issues found and fixed) |
| Lighthouse mobile (login / home / session / leaderboard) | Performance 97 / 97 / 94 / 98 · Accessibility 100 ×4 · Best practices 100 ×4 · CLS 0 |
| Responsive 320–1920 | no page overflow, SEBI line visible at 320 |
| Certificate PDF gate | 1 page, A4 landscape, Tier-1 verbatim, ≥7.5pt glyphs |

## 5. Go-live checklist (Rahul)
1. Create the Supabase project. Apply `supabase/migrations/0001…0006` in order (SQL editor or `supabase db push`). **Never apply `supabase/tests/00_local_auth_shim.sql`.**
2. `.env.local` from `.env.example`: Supabase URL + anon + service-role, `CERT_SIGNING_SECRET` (32+ random bytes, never rotate without re-signing), `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`.
3. Seed content: `DATABASE_URL=<supabase pooler url> npm run db:seed`. Do **not** run `db:seed:demo` on production (it writes into `auth.users` directly, which only works on the local shim).
4. First admin: create the user in Supabase Auth → `update profiles set role='admin', status='active' where id='<uid>'`.
5. Verify `5circles.co` in Resend. Confirm the sender `learn@5circles.co`.
6. Deploy on Linux (Vercel/Node): `pip install weasyprint qrcode[pil]` must exist on the box that renders certificates; otherwise render via a small worker or CI job. Set the domain (learn.5circles.co recommended; Q8 still open).
7. Fill quiz banks for sessions 6–60 and exam papers W2/W3/final ×3 through `/learn/admin/content` (or `content/quizzes/*.json` + `db:seed`).
8. Attach class recordings (YouTube unlisted) per session in the editor. Upload decks/handouts/workbooks to Storage and set `resources.storage_path`.
9. Phone + laptop click-through: login → invite → session 1 → quiz → journal → exam → score → leaderboard → certificate → verify.

## 6. Open items still needing Rahul
- Q8 domain · confirmation of the Compliance Officer's `@5circles.co` address (grievance block shows name + SCORES + ODR only until then) · second signatory (only Rahul's signature exists) · restore `responsive-dashboard-layout.zip` to the skill library · deprecate the older `fivecircles-brand-kit` · `index.html` (Algo Lab) stamps the 87.7% figure as "FY25" where it must read "SEBI FY26 study, Aug 2026", plus two Devanagari typos and an Inter font — separate fix on `main`.

## 7. Course-wide laws encoded (do not regress)
F&O = samjho, khelo mat · investor stories qualitative only · AI = analyst, human = trigger · SEBI retail algo framework awareness only (live since 01-Apr-2026) · return copy nahi hota, process hota hai · only SEBI FY26 (Aug 2026) F&O-loss figures, always stamped · Roman-script Hinglish only · no emoji in product UI · never white on `#00AEEF` · Tier-1 never clamped.

---
Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004
