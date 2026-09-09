# 5C Learn — Vercel deploy guide
**Stack:** Next.js 16 on Vercel (region `bom1`, Mumbai) · Supabase (Postgres/Auth/Storage) · Resend · GitHub Actions for certificate PDFs.

## 1. Vercel project settings (once)
| Setting | Value |
|---|---|
| Repository | `trailingtrades/circles-algo-lab` |
| Production branch | `main` (merge `claude/5c-learn-dashboard-build-taxape` first) |
| **Root Directory** | `apps/learn` |
| Include source files outside of the Root Directory | **ON** (the app imports `/content/*.json` from the repo root) |
| Framework preset | Next.js (auto) |
| Node.js version | 22.x |
| Build / install commands | defaults (`npm ci`, `next build`) |

`apps/learn/vercel.json` already sets: region `bom1`, security headers (HSTS, CSP allowing only Supabase + youtube-nocookie, `frame-ancestors 'none'`), immutable caching for fonts/brand, and an `ignoreCommand` so pushes that only touch the Algo Lab `index.html` do not redeploy 5C Learn.

The Algo Lab (`/index.html`, GitHub Pages at `algo.circleoptionlab.com`) is unaffected: Vercel builds only `apps/learn`.

## 2. Environment variables (Vercel → Settings → Environment Variables, Production + Preview)
| Name | Where from | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same | public |
| `SUPABASE_SERVICE_ROLE_KEY` | same | **server-only, never `NEXT_PUBLIC_`** |
| `CERT_SIGNING_SECRET` | `openssl rand -hex 32` | never rotate after the first certificate is issued |
| `NEXT_PUBLIC_SITE_URL` | `https://learn.5circles.co` (or the chosen domain) | used in invite links, QR codes, reset redirects; falls back to Vercel's URL if unset |
| `RESEND_API_KEY` | Resend dashboard | domain `5circles.co` must be verified in Resend |
| `EMAIL_FROM` | `5C Learn <learn@5circles.co>` | must be on the verified domain |
| `CERT_RENDER_MODE` | `dispatch` | Vercel cannot run WeasyPrint; PDFs are rendered by GitHub Actions |
| `GITHUB_REPO` | `trailingtrades/circles-algo-lab` | |
| `GITHUB_DISPATCH_TOKEN` | fine-grained PAT, this repo only, permission **Contents: read & write** | lets the app fire the `render-certificate` workflow |

## 3. GitHub repository secrets (for `.github/workflows/cert-render.yml`)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CERT_SIGNING_SECRET`, `NEXT_PUBLIC_SITE_URL` — same values as above.
Flow: learner meets all six criteria → app inserts the `certificates` row and emails → app POSTs `repository_dispatch` → job renders the PDF, verifies the HMAC, uploads to the private `certificates` bucket, sets `pdf_storage_path` (≈1–2 min) → Download button goes live. Manual re-render: Actions → "Render certificate PDF" → Run workflow with the certificate id.

## 4. Supabase (once)
1. Apply `supabase/migrations/0001…0006` in order (SQL editor or `supabase db push`). Never the local auth shim.
2. Auth → URL configuration: Site URL = `NEXT_PUBLIC_SITE_URL`; Redirect URLs add `https://<domain>/api/auth/callback` and `https://*.vercel.app/api/auth/callback` for previews.
3. Auth → Email: keep Supabase's built-in sender for password reset only (rate-limited; fine). Invites and certificate mails go through Resend.
4. Storage: bucket `certificates` is created on first render (private). No public buckets.
5. Seed content: `DATABASE_URL=<pooler URL> npm run db:seed` from `apps/learn`. Not `db:seed:demo`.
6. First admin: create the user in Auth, then `update profiles set role='admin', status='active' where id='<uid>'`.

## 5. Domain
Add `learn.5circles.co` (Q8 still open) in Vercel → Domains, CNAME to `cname.vercel-dns.com`. Then set `NEXT_PUBLIC_SITE_URL` to match and redeploy.

## 6. Smoke test after first deploy
`/learn` shows Tier-1 + grievance block · `/verify/lookup` answers "No certificate…" for a made-up number · admin login → create cohort → invite yourself → accept → session 1 quiz → `/learn/score` shows points → `/learn/admin/certificates` → Check now (nothing issues yet, expected) · Actions tab shows no failed runs.

---
Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004
