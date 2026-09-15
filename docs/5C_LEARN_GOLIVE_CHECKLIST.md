# 5C Learn — Go-live checklist (baby steps)

Do these in order. Steps marked **Rahul** need your logins. Steps marked **Claude** run from this repo once the secrets exist.
Never paste any key into chat. Keys go only into Supabase, Vercel, or GitHub Secrets.

## Step 1 · Supabase project (Rahul, 10 min)
1. supabase.com → New project. Name `5c-learn`, region **Mumbai (ap-south-1)**. Save the database password somewhere safe.
2. Project Settings → **API**: copy `Project URL`, `anon public` key, `service_role` key.
3. Project Settings → **Database** → Connection string → **URI** (Session pooler). Replace `[YOUR-PASSWORD]` with the DB password.
4. Authentication → URL Configuration: Site URL = `https://learn.5circles.co` (or the Vercel URL until the domain is ready). Redirect URLs: add `https://learn.5circles.co/api/auth/callback` and `https://*.vercel.app/api/auth/callback`.

## Step 2 · GitHub Secrets (Rahul, 5 min)
GitHub → repo → Settings → Secrets and variables → **Actions** → New repository secret. Add:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | Project URL from Step 1.2 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from Step 1.2 |
| `SUPABASE_DB_URL` | connection string from Step 1.3 (with password) |
| `FIRST_ADMIN_EMAIL` | your login email for the dashboard |
| `CERT_SIGNING_SECRET` | run `openssl rand -hex 32` or ask Claude to generate one; **never change it after the first certificate** |
| `NEXT_PUBLIC_SITE_URL` | `https://learn.5circles.co` (or the Vercel URL for now) |

Then tell Claude: **"secrets daal diye"**.

## Step 3 · Database setup (Claude, 3 min) — DONE 15 Sep 2026
Claude runs Actions → **Go-live setup (Supabase)** with `step = all`. It applies the 7 migrations, seeds 61 sessions + 105 quiz + 75 exam questions, creates your admin user and emails you a set-password link. Claude then reads the check output and confirms counts.
Result (run 12): levels=3 weeks=33 sessions=61 published=21 quiz_q=105 exam_q=75 exams=6 admins=1. The workflow derives the project URL from `SUPABASE_DB_URL` and tolerates a mis-pasted `FIRST_ADMIN_EMAIL`; only `SUPABASE_DB_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be exact.

## Step 4 · Resend email (Rahul, 10 min)
1. resend.com → Domains → Add `5circles.co` → add the DNS records it shows (at your domain registrar) → wait for Verified.
2. API Keys → Create → copy it (shown once).

## Step 5 · Vercel project (Rahul, 10 min)
1. vercel.com → Add New → Project → Import `trailingtrades/circles-algo-lab`.
2. **Root Directory**: `apps/learn`. Turn ON "Include source files outside of the Root Directory".
3. Framework: Next.js (auto). Node 22.
4. Environment Variables (Production + Preview). Tip: click the first Key box and paste a whole `KEY=value` block; Vercel splits the lines.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `CERT_SIGNING_SECRET` | same value as the GitHub secret |
| `NEXT_PUBLIC_SITE_URL` | `https://learn.5circles.co` (or the Vercel URL) |
| `RESEND_API_KEY` | from Step 4 |
| `EMAIL_FROM` | `5C Learn <learn@5circles.co>` |
| `CERT_RENDER_MODE` | `dispatch` |
| `GITHUB_REPO` | `trailingtrades/circles-algo-lab` |
| `GITHUB_DISPATCH_TOKEN` | GitHub → Settings → Developer settings → Fine-grained token, this repo only, Contents: Read & write |

5. Deploy. Copy the `*.vercel.app` URL and tell Claude: **"deploy ho gaya, URL: ..."**.

## Step 6 · Domain (Rahul, 5 min + DNS wait)
Vercel → Project → Domains → add `learn.5circles.co`. At the registrar add CNAME `learn` → `cname.vercel-dns.com`. Then update `NEXT_PUBLIC_SITE_URL` in Vercel and GitHub Secrets, and Site URL in Supabase Auth. Redeploy.

## Step 7 · Smoke test (Claude + Rahul, 10 min)
Claude checks: `/learn` loads with Tier-1 disclaimer, `/verify/lookup` answers for a made-up number, headers present. Rahul: open the set-password email, log in, Admin → Cohorts → create `Tier1-Oct-2026` → invite yourself as a student → accept from the email → Session 1: read, quiz, journal → Score page shows points.

## Known gaps before first cohort
- Decks, handouts, templates: not uploaded yet (Resources page shows "pending upload").
- AI-usage disclosure line: DRAFT until the Compliance Officer signs off.
- Curriculum v2 PDF on Drive still cites the retired ~91% FY25 figure; the dashboard uses SEBI FY26 (Aug 2026) 87.7%.
- Tier 2 and Tier 3 sessions are unpublished drafts.

---
Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004
