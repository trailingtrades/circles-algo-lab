# 5C Learn — Go-live checklist (baby steps)

Do these in order. Steps marked **Rahul** need your logins. Steps marked **Claude** run from this repo once the secrets exist.
Never paste any key into chat. Keys go only into Supabase or GitHub Secrets (Vercel is gone since 18 Sep 2026).

## Go-live order · 19 Sep 2026 (three languages in S.M.A.R.T + security fixes)

The PR carries two migrations. **0010** (trilingual columns, answer-key and certificate integrity) must be in the
database before the new code runs. **0011** (RLS hardening) must wait until the new code is live: it refuses exam
writes made with the learner's own session, which is how the code running today starts and autosaves exams.

### A · Account side (Rahul, 15 min, any time before C)
1. **Change the admin password.** The 15–16 Sep go-live runs printed a temporary password and set-password links into
   the Actions logs, and the repo is public. Supabase → Authentication → Users → your account → Send password recovery.
   Skip only if you already changed it after 16 Sep, 14:03 UTC.
2. **Delete those logs.** GitHub → Actions → "Go-live setup (Supabase)" → open each run below → ⋯ (top right) →
   Delete all logs: 34972705669, 34973132279, 34973960161, 34974485213, 34977189503, 35105938080.
3. **Stop self-signup.** Supabase → Authentication → Sign In / Providers → turn off "Allow new users to sign up".
   Invites keep working (they use the admin API).
4. **Reset-password email.** Supabase → Authentication → Emails → Reset password → set the link to
   `{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/learn/reset/confirm`
   The link then works on any phone or browser, not only the one that asked, and the go-live `recover` step can use it.
5. **Auth rate limit.** Every sign-in reaches Supabase from the VPS's one address, so the per-address limit is shared
   by all students. Supabase → Authentication → Rate Limits → raise "sign-ups and sign-ins" so a full batch can sign
   in within five minutes.
6. **GitHub secrets** (Settings → Secrets and variables → Actions). Each optional one switches a feature on at the
   next deploy; the deploy log line `env.age carries: …` lists which arrived (names only, never values).

| Secret | Needed for | Value |
|---|---|---|
| `FIRST_ADMIN_EMAIL` | go-live `admin` / `recover` | re-save with only your address — there is no built-in fallback any more |
| `RESEND_API_KEY` | invite and certificate emails | from resend.com, after `5circles.co` shows Verified there |
| `EMAIL_FROM` (secret or variable) | sender name | `Circle S.M.A.R.T <learn@5circles.co>` |
| `MASTER_ADMIN_EMAIL` | the one account that can change roles | your address |
| `CERT_DISPATCH_TOKEN` | certificate PDFs | GitHub → Settings → Developer settings → Fine-grained token, this repo only, Contents: Read and write |
| `CERT_RENDER_MODE` (variable) | certificate PDFs | `dispatch` |

### B · Migration 0010 before the merge (Claude or Rahul, 3 min)
Actions → "Go-live setup (Supabase)" → Run workflow → **Use workflow from: the PR branch** → step `migrate`,
until `20260919000010`. Additive: the live app ignores the new columns.
Expect `== 20260919000010_trilingual_and_integrity.sql`, `== 20260919000011_rls_hardening.sql (after until=…, left for a
later run)`, then the check lines with `rls tables without policy: none`.
If GitHub refuses the branch for the `production` environment, run the same thing from `main` right after the merge
in C — the VPS takes 2–6 minutes to pick up the new build.
Between B and C, do not add quiz questions in the admin editor: 0010's one-question-per-position rule rejects the
old editor's default position 0.

### C · Merge the PR (Rahul) → automatic deploy (6–10 min)
**First, right before you press Merge (2 min, once): clear the exam attempts the old page opened by itself.**
The code running today starts an exam attempt as soon as a student merely opens an exam page. The new code grades
every open attempt whose time is over when the exam page loads, so each of those untouched attempts would become a
0-mark "attempt 1": the student's real sitting would then count as a retake (points capped at 80%, no Distinction).
In short (Hinglish): Merge dabane se theek pehle ye ek query chalaiye, phir Merge.
1. Supabase → SQL Editor → New query.
2. Paste this and press Run (if Supabase warns that the query is destructive, confirm Run):
   ```sql
   with gone as (
     delete from attempts
     where exam_id is not null and submitted_at is null and autosaved_at is null and answers = '{}'::jsonb
     returning id)
   select count(*) as removed from gone;
   ```
3. Expect one row, `removed`, with a number (0 is fine). Press Merge within a few minutes.

Only before the merge: the new build's Start button also creates an empty attempt, so after the merge this query
could delete a real sitting. PR already merged? Skip it and tell Claude. Attempts with a saved answer or a submission
are never touched. The app keeps grading empty expired attempts on purpose: deleting them at runtime would let a
student press Start, read the paper, let the time run out and start again.

`deploy-smart-vps.yml` builds, publishes, the VPS pulls within 2 minutes, then health and smoke tests. Wait for green.

### D · Migration 0011 after the deploy (Claude or Rahul, 2 min)
Same workflow from `main`, step `migrate`, until empty. Applies 0011 only (0010 is already recorded).
Expect `migrations applied: …, latest 20260919000011_rls_hardening.sql`. Any `NOTICE … NOT created` line means
duplicate rows blocked a unique index — send the log to Claude; nothing is broken meanwhile.

### E · Seed at a quiet hour (Claude or Rahul, 3 min)
No class running (after 22:00 IST is safe). Same workflow from `main`, step `seed`. Upserts the rewritten
three-language Stage 1 content from `/content`. Compare the check line (sessions, quiz_q, exam_q) with the PR description.

### F · nginx (Rahul's machine, 5 min)
`apps/learn/deploy-vps/APPLY-2026-09-19.md`, steps 0–4 (5 and 6 are optional). Public `/winners/about/` and
`/one/about/`, security headers on every static page, branded 404, closed `/admin.html`, sign-in rate limit.

### G · Checks (Claude + Rahul, 10 min)
1. Go-live workflow, step `check`: counts as expected, `rls tables without policy: none`.
2. `/smart/learn` signed in as a student: switch English → Hinglish → हिंदी in the header; Session 1 reads in all three.
3. Take a session quiz: DevTools → Network → the session page's response contains no `distractor` and no answer
   index before you submit.
4. Start an exam, answer one question, reload: the answer is still there (autosave now runs on the server).
5. Forgot password for a test account, opened on a phone: the link lands on `/smart/learn/reset/confirm` (needs A4).
6. Invite a test address from Admin → Cohorts: the email arrives (needs `RESEND_API_KEY`) and the link sets a password.
7. Private window, not signed in: `/winners/about/` and `/one/about/` open; `/winners/` goes to sign-in;
   `/admin.html` is 404.

---

## Original setup (15–18 Sep 2026, kept for history)

Steps 5–6 (Vercel) are retired: the app is self-hosted on the VPS since 17 Sep and the Vercel project was deleted on
18 Sep. Runtime settings now travel from GitHub secrets to the VPS inside `env.age` (see A6 above).

## Step 1 · Supabase project (Rahul, 10 min)
1. supabase.com → New project. Name `5c-learn`, region **Mumbai (ap-south-1)**. Save the database password somewhere safe.
2. Project Settings → **API**: copy `Project URL`, `anon public` key, `service_role` key.
3. Project Settings → **Database** → Connection string → **URI** (Session pooler). Replace `[YOUR-PASSWORD]` with the DB password.
4. Authentication → URL Configuration: Site URL = `https://learn.optionlab.co.in/smart`; Redirect URLs include `https://learn.optionlab.co.in/smart/api/auth/callback` (set 18 Sep).

## Step 2 · GitHub Secrets (Rahul, 5 min)
GitHub → repo → Settings → Secrets and variables → **Actions** → New repository secret. Add:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | Project URL from Step 1.2 (optional: the workflows derive it from `SUPABASE_DB_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from Step 1.2 |
| `SUPABASE_DB_URL` | connection string from Step 1.3 (with password) |
| `FIRST_ADMIN_EMAIL` | your login email for the dashboard — the address only |
| `CERT_SIGNING_SECRET` | run `openssl rand -hex 32` or ask Claude to generate one; **never change it after the first certificate** |

Then tell Claude: **"secrets daal diye"**.

## Step 3 · Database setup (Claude, 3 min) — DONE 15 Sep 2026
Claude runs Actions → **Go-live setup (Supabase)** with `step = all`. It applies the 7 migrations, seeds 61 sessions + 105 quiz + 75 exam questions, creates your admin user and has Supabase email you a password-reset link. Claude then reads the check output and confirms counts.
Result (run 12): levels=3 weeks=33 sessions=61 published=21 quiz_q=105 exam_q=75 exams=6 admins=1. The workflow derives the project URL from `SUPABASE_DB_URL`; only `SUPABASE_DB_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be exact.

## Step 4 · Resend email (Rahul, 10 min)
1. resend.com → Domains → Add `5circles.co` → add the DNS records it shows (at your domain registrar) → wait for Verified.
2. API Keys → Create → copy it (shown once) → GitHub secret `RESEND_API_KEY` (A6 above).

## Step 5 · Vercel project — RETIRED 18 Sep 2026
## Step 6 · Domain on Vercel — RETIRED 17 Sep 2026 (learn.optionlab.co.in points at the VPS)

## Step 7 · Smoke test (Claude + Rahul, 10 min)
Superseded by G above for the 19 Sep release. Claude checks: `/smart/learn` loads with the Tier-1 disclaimer, `/smart/verify/lookup` answers for a made-up number, headers present. Rahul: Admin → Cohorts → create `Tier1-Oct-2026` → invite yourself as a student → accept from the email → Session 1: read, quiz, journal → Score page shows points.

## Known gaps before first cohort
- Decks, handouts, templates: not uploaded yet (Resources page shows "pending upload").
- AI-usage disclosure line: DRAFT until the Compliance Officer signs off.
- Curriculum v2 PDF on Drive still cites the retired ~91% FY25 figure; the dashboard uses SEBI FY26 (Aug 2026) 87.7%.
- Tier 2 and Tier 3 sessions are unpublished drafts.

---
Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004
