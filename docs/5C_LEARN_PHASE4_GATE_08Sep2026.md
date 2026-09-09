# 5C Learn — PHASE 4 Gate Report (Assessment & scoring)
**Date:** 08-Sep-2026 · **Branch:** `claude/5c-learn-dashboard-build-taxape`
**Decisions applied:** Q7-A Rahul grades practice artefacts (250 pts stay) · Q2-A Foundation W1 exam bank authored (20 Q) · Q3-A leaderboard default `First name + L.`, alias optional.

## Built
**Database — `20260908000005_scoring.sql`**
- `score_events` is append-only (trigger blocks update/delete for everyone, service role included) and idempotent per `(user, kind, ref_type, ref_id)`.
- `app.recompute_scores(user, level)` — deterministic: caps attendance 200 · quiz 200 · exams 250 · practice 250 · discipline 100, adds overrides, clamps 0–1000, sets cohort percentile. `app.award()` appends + recomputes; `override_score()` now recomputes too.
- `practice_grades` (mentor Process grade A–F, Outcome +/−/0 stored **separately and never scored**), `artefact_ladder` (Foundation Full Why 250 · Intermediate valuation note 125 + chart-note 125 · Advanced dossier 150 + thesis-memo 100), `attempts.deadline_at/autosaved_at`.
- Leaderboard SQL, §10 baked in: `board_process(level)`, `board_consistency()` (journal days + Friday review, ISO week, IST, weekly reset), `board_improved(level)` (points last 14 days). All cohort-scoped via `app.my_cohort()`, return **top 10 named + caller's own row only**, band for everyone else, `display_name()` = alias or "First L.". `board_full()` for mentors/admin only. No function touches `portfolio_rows`, `entry_price` or `qty` (asserted by test).

**App**
- `lib/scoring/rules.ts` — pure amounts (quiz pro-rata, exam pro-rata with 80% retake cap, grade→points, TS mirror of recompute, **next-3-actions** teaching tool). `lib/scoring/award.ts` — service-role awarders; exam uses best-attempt delta so the sum always equals the best attempt.
- Awards hooked into session actions: quiz on submit, attendance when video ≥80% + handout, galti-log and on-time Friday review discipline points.
- `/learn/exam/[id]` — server-created attempt with server deadline, resume on refresh, autosave every 15s, auto-submit at 0:00, one submit, server grading, instant score + "Recommended answer" explanations, pass ≥60% / distinction ≥30/36, attempt limit enforced. `aria-live` timer.
- `/learn/score` — `ScoreBreakdown` (five bars, each expands to its `score_events`) + `RankChip` (position or band, never a money-like number) + next 3 actions + Tier-2.
- `/learn/leaderboard` — three tabs, own-position card, table, Hinglish note "Ye score aapke process ka hai — profit ka nahi.", credential line + Tier-2. No email/WhatsApp of ranks anywhere.
- `/learn/portfolio` — Rs 10 lakh virtual, max 5 rows, Full Why ×2 / top risk + answer / price-stop / Why-stop / review point, VIRTUAL badge on the screen and every row, `is_virtual` check-constrained, no quotes fetched, no P&L computed.
- `/learn/mentor` — at-risk list (no activity 7 days / failed exam twice / zero journal), full ranking (teaching view), ungraded artefacts with Process A–F + Outcome + feedback; every grade audited.
- Nav: Score added; home shows live Process Score + rank chip + exam link.

## Gate results
| Gate | Result |
|---|---|
| Score recomputation deterministic and reproducible from `score_events` alone | **Pass** — delete `scores`, recompute all → byte-identical (test) |
| Manual review: no money figure on any leaderboard | **Pass** — crawl asserts no ₹/Rs/P&L/return text on all three tabs; SQL asserted to never read portfolio columns; source review clean |
| Scoring/leaderboard suite | 20/20 (idempotent awards, caps, immutability, override-as-new-event, top-10 + own row, cohort scope, alias, bottom student sees band only, student cannot call `award()` or `board_full()`) |
| Rules (pure) / gating / RLS | 10/10 · 16/16 · 41/41 |
| `check_compliance.py` | 213 files, 0 failures (scam-language distractors context-classed via `scam_example`) |
| `check_responsive.py` + 16 screenshots at 360/1366 | 0 findings, no overflow, SEBI line everywhere |
| tsc / eslint / build | Clean |

## Findings
1. **Compliance checker needed a second context class.** The exam bank legitimately quotes "sure-shot multibagger" as a Kachra example; added a `scam_example: true` flag that the checker honours (alongside `distractor: true`). The 87.7% option now carries the FY26 stamp inline so the 200-char rule holds inside JSON.
2. Exam runner's clock is cosmetic; the server deadline (`attempts.deadline_at`) decides on-time. Late submissions are graded but lose the on-time discipline point.
3. Only the Foundation W1 exam has a bank. Other 11 exams show "Question bank pending" with the runner ready.
4. Mentor page currently lists all active cohorts for admins and mentors; `board_full()` still enforces cohort ownership in SQL, so a mentor sees rankings only for cohorts assigned to them.

---
Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004
