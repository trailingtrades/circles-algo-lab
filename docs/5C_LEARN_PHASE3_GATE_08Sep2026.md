# 5C Learn — PHASE 3 Gate Report (Content & learning)
**Date:** 08-Sep-2026 · **Branch:** `claude/5c-learn-dashboard-build-taxape`
**Decisions applied:** Q1-C skeleton content from §8 + canonical vocabulary (all sessions `draft: true`) · Q6-A YouTube unlisted · Q3-C link-only file placeholders.

## Built
**Content (`/content/`, source of truth — content is data, not code)**
- `levels.json` (3) · `weeks.json` (12, Hinglish + EN titles, theme accents) · `sessions/{foundation,intermediate,advanced}.json` (60: EN title, Hinglish subtitle, core concept, AI Lab, psychology tag, Hinglish summary, one copy-ready master prompt each) · `resources.json` (41 placeholders: 12 decks incl. Foundation W1 pinned to **v1.1**, 12 handouts, 9 weekly + 3 final exam papers, 3 workbooks, MockPortfolio.xlsx, Algo Lab link) · `exams.json` (12; final = 36Q, pass 22, distinction 30 = ≥83%) · `vocabulary.json` (canonical terms + course-wide laws) · `quizzes/foundation-w1.json` (15 authored questions, distractors flagged).
- `scripts/gen_content.py` regenerates all of it; `apps/learn/scripts/seed.ts` upserts into Postgres by natural keys (idempotent, keeps admin-set video URLs).

**Database** — `20260908000004_content_gating.sql`: `sessions.summary_hi/prompts/video_provider/is_draft`, `resources.note/external_url`, `level_unlocks` (admin per-student override, audited via `unlock_level()`), `app.level_open()`.

**App**
- `lib/content/course.ts` — typed content access; `quizPublic()` strips `correct_index` + explanations; `youtubeEmbed()` builds the privacy-enhanced embed.
- `lib/progress/gating.ts` — pure rules: level opens on previous-level certificate or admin override; session N opens when N-1 has quiz submitted + journal saved; every locked state carries an EN + Hinglish reason and the unblocking link. 16 unit tests.
- `lib/progress/load.ts` — learner state from Supabase (RLS) or a demo state when unconfigured.
- `/learn/path` — 3 × 4 × 5 ladder with week rings and status pills. `/learn/session/[n]` — Watch (YouTube unlisted embed, mark-watched) · Read (deck/handout, "Open handout" tracked) · AI Lab (`PromptBlock`, Copy with 1.6s "Copied" + execCommand fallback) · Quiz (`QuizBlock`, one-shot, server-graded, "Recommended answer" label) · Journal (reflection / galti-log / Friday review) · bottom "Session complete gate" checklist. `/learn/resources` — per-level tables, locked levels show locked, Algo Lab link out. Home now driven by real gating ("Aaj ka ek kaam" = first open session).
- Server actions grade against the answer key with the service role (client never sees answers), flip `session_progress` to complete when quiz + journal exist.
- `Circle` added to `Icon.tsx` (51st glyph, lucide-static, same shell).

## Gate results
| Gate | Result |
|---|---|
| All 60 sessions render | **Pass** — crawl of 63 routes, all 200 with SEBI number |
| Locked states correct (demo: S1–S2 done, S3 in progress) | **Pass** — 3 open, 57 locked; S4+ locked on S3 quiz+journal, S21/S41 locked on level certificate |
| Zero Devanagari in built output + crawled HTML | **Pass** (0 codepoints; earlier finding in `index.html` remains a separate ticket) |
| Zero emoji in UI | Pass |
| `check_compliance.py` (src, built, content, supabase) | 181 files, 0 failures |
| `check_responsive.py` | 0 findings; 18 screenshots at 360/1366 in `docs/phase3-screens/`, no page overflow |
| Gating unit tests / RLS suite (seeded DB) | 16/16 · 41/41 |
| tsc / eslint / build | Clean |
| CI | Now seeds content and runs the gating tests before the RLS suite |

## Findings
1. Turbopack refuses imports above the app dir; `next.config.ts` sets `turbopack.root` to the monorepo root so `/content` resolves. Keep `content/` at the repo root.
2. Quiz banks exist for Foundation W1 only (15 Q). The other 55 sessions show "Quiz coming soon" and cannot reach *complete* until a bank exists — the gate needs a quiz submission. Filling banks is the Phase 5 admin editor's first job (or edit `content/quizzes/*.json`).
3. Session titles/concepts are a v0 skeleton mapped from §8 themes and the canonical vocabulary, not from the built decks (context files absent). Every session carries a visible `draft content` chip until edited.
4. Investor-story sessions (S9, S37, S57) are titled "(qualitative)" and their prompts forbid returns/picks, per the course law.

---
Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004
