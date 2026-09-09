# 5C Learn — PHASE 2 Gate Report (Auth & roles)
**Date:** 08-Sep-2026 · **Branch:** `claude/5c-learn-dashboard-build-taxape`
**Decisions applied:** Q3-A Resend · Q5-A ≤50 students (Supabase free tier) · Supabase project: local Postgres now, real project connected later (option B).

## Built
**Database (`supabase/migrations/`)**
- `20260908000001_schema.sql` — every table from §6 plus `invites`; uuid PKs, `created_at`/`updated_at`, snake_case, enums in schema `app`. `portfolio_rows.is_virtual` is check-constrained to `true`. `attempts` guard trigger discards any client-supplied score. `profiles` guard trigger blocks non-admin changes to role/cohort/status.
- `20260908000002_rls.sql` — RLS enabled and forced on all 17 tables. Student = own rows; mentor = assigned cohort(s) via `cohorts.mentor_id`; admin = all. `score_events`, `scores`, `certificates` have **no write policy for any JWT** — only the service role writes them. `quiz_questions.correct_index` / explanations are column-denied to students (table grant replaced by an explicit safe-column grant).
- `20260908000003_audit.sql` — `audit_log` is append-only (trigger blocks update/delete even for the service role). `override_score()` appends a compensating `score_events` row with a mandatory reason and audits it; history is never mutated (§9). Public wrappers `log_audit` / `override_score` granted to `service_role` only.
- `supabase/tests/00_local_auth_shim.sql` — local-only stand-in for Supabase's `auth` schema and roles so migrations run unchanged on plain Postgres.

**App (`apps/learn/`)**
- `src/proxy.ts` — refreshes the session on every request, bounces unauthenticated traffic to `/learn`, cookies `httpOnly` + `secure` (prod) + `sameSite=lax`. All auth is server-side; the browser never holds a Supabase client.
- `lib/supabase/{server,admin,env}.ts`, `lib/auth/guard.ts` (`requireViewer(roles)` reads role from `profiles` under RLS, never from the JWT; suspended → signed out immediately), `lib/auth/tokens.ts` (32-byte token, only sha256 stored, 7-day TTL).
- Login (`/learn`) with suspended/reset notices; `/learn/reset` + `/learn/reset/confirm` (Supabase magic-link reset, provider rate-limited); `/api/auth/callback`.
- Invite flow `/learn/invite/[token]`: server-side lookup (invalid / expired / used), 3 Hinglish onboarding cards, password set (min 10), learner code of conduct checkbox, single-use acceptance, auto sign-in. Passwords never emailed, never admin-visible.
- Admin `/learn/admin`: create cohort; `/learn/admin/cohorts/[id]`: bulk import by paste or CSV (`Full Name, email`, max 200/run), roster with suspend / reactivate / move cohort, invites with re-invite. Every action writes `audit_log` with actor, target, before/after.
- Profile: name, phone, leaderboard alias, teaching-copy language, password change, sign out.
- Email: `lib/email/resend.ts` — invite mail with Tier-2 footer + credential line (approved wording incl. the glyph). Skips gracefully when `RESEND_API_KEY` is unset.
- `.env.example` updated (`NEXT_PUBLIC_SITE_URL`, `EMAIL_FROM`, `DATABASE_URL`). No signup route exists anywhere.

## Gate results
| Gate | Result |
|---|---|
| Automated proof: student A cannot read student B's rows | **Pass** — profiles, journal, portfolio, score_events, scores, certificates, cohorts all isolated (`apps/learn/tests/rls.test.ts`) |
| Automated proof: student cannot write `score_events` / `certificates` / `scores` | **Pass** — insert/update/delete all denied; even an admin JWT cannot insert certificates client-side |
| Extra proofs | Self-promotion to admin denied · cohort self-move denied · journal-as-B denied · non-virtual portfolio row denied · `correct_index` unreadable · self-supplied attempt score discarded · mentor scoped to own cohort · anon reads nothing · audit rows immutable · override appends, never edits · RPC wrappers denied to JWTs |
| RLS suite | **41 passed, 0 failed** on Postgres 16 |
| `check_compliance.py` (src + built HTML + content + supabase) | 160 files, 0 failures |
| `check_responsive.py` (interim) | 11 files, 0 findings |
| New screens at 360 / 1366 | 10 PNGs in `docs/phase2-screens/`, no page overflow, SEBI line on every one |
| tsc / eslint / build | Clean |
| CI | `.github/workflows/learn-ci.yml` now spins up Postgres 16, applies migrations, runs the RLS suite on every push |

## Findings while building
1. **Column-level REVOKE does not override a table-level GRANT in Postgres.** First draft left `correct_index` readable by students. The test caught it; fixed by replacing the table grant with an explicit column grant. Client code must select explicit columns from `quiz_questions`.
2. Migrations/scripts run as the DB owner without a JWT, so `app.is_service()` also recognises superuser/`service_role` DB roles; otherwise the profile guard blocked seeding.
3. `identity.md` grievance contacts (personal Gmail, 8-digit phone) still pending Rahul's confirmation (Q4) before they appear in-app.

## Not done in this phase (by design)
- Real Supabase project not connected: needs the three keys in env, then `supabase db push` (or paste the three migration files in the SQL editor in order). Do **not** run the local auth shim there.
- Resend sender domain (`5circles.co`) must be verified in Resend before invites deliver.
- Mentor assignment UI (setting `cohorts.mentor_id`) is a one-line admin update; screen lands with the mentor dashboard in Phase 4/5.

## Manual steps for Rahul (once)
1. Create the Supabase project → copy URL, anon key, service-role key into `.env.local` (never commit).
2. Apply the three migrations in order.
3. Insert the first admin: create the user in Supabase Auth, then `update profiles set role='admin', status='active' where id='<uid>'`.
4. Verify `5circles.co` in Resend, set `RESEND_API_KEY` and `EMAIL_FROM`.

---
Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004
