# Scale, uptime & bot protection — honest assessment and runbook (25 Sep 2026)

Rahul's brief: (1) handle 1,00,000 customers and never go down, (2) a proper admin tab with
enrolled-student and paid-course numbers, (3) keep malicious bots and crawlers out.
This doc records what shipped in this change-set, what the numbers really mean, and the two
account-side steps only Rahul can do. Companion files: `apps/learn/deploy-vps/APPLY-2026-09-25.md`
(the exact VPS commands), `apps/learn/deploy-vps/learn-botguard.conf`, `learn-perf.conf`.

---

## 1. The honest capacity picture (verify before you claim)

**"1 lakh customers" ≠ 1 lakh people on the site at once.** For a course platform the working
ratio is 1–3% of enrolled accounts online in a peak hour, i.e. **1,000–3,000 concurrent users
at 1 lakh enrolled** — with spikes when a class starts or a WhatsApp broadcast lands.

What each layer does at that load, as of this change-set:

| Layer | What it serves | Verdict at 1 lakh enrolled |
|---|---|---|
| algo.circleoptionlab.com | single static page on GitHub Pages (Fastly CDN) | Fine at any load. No action needed. |
| Academy landing + /funda/ /winners/ /one/ /pro/ | static files from nginx on the VPS | nginx serves static files in the tens of thousands r/s; the 9–15 MB course files are bandwidth-bound, not CPU-bound — the per-IP connection cap (this change-set) stops one address hogging the pipe. |
| /smart app | one Node process (Next.js standalone) | The bottleneck. This change-set moves all hashed static assets to nginx's cache and gives Node a keepalive pool + 65k file descriptors, so Node only renders pages. A single process on a small VPS realistically sustains a few hundred page-renders/second — enough for 2–3k concurrent students, NOT enough headroom for a viral spike on top. |
| Supabase (auth + DB) | every sign-in, quiz, score | Scales with the paid tier; the free/small tiers cap connections and auth emails (2/hr on free mailer!). At 1 lakh accounts this must be on a paid plan with the connection pooler URL in use. |

**"Never goes down" cannot be promised by any single VPS** — a kernel update, a disk failure, a
provider outage or one `nginx -t` mistake takes everything on 200.141.9.107 down with it. The
architecture that actually delivers "students basically never notice":

1. **Cloudflare free tier in front of learn.optionlab.co.in** (Rahul, DNS host side — ~30 min).
   This is the single biggest win and costs nothing: absorbs DDoS before it reaches the VPS,
   caches the big static course files at 300+ edge locations (the VPS then serves each file
   once per edge, not once per student), adds managed bot blocking on top of ours, and hides
   the origin IP. Steps: add the domain to Cloudflare → import DNS → orange-cloud the
   learn.optionlab.co.in record → SSL mode "Full (strict)". Nothing on the VPS changes; the
   only follow-up is switching nginx's `$remote_addr` trust to `CF-Connecting-IP`
   (`ngx_http_realip_module`, ask Claude for the 5-line snippet when the cutover happens,
   because the rate-limit keys must then use the real client IP, not Cloudflare's).
2. **Uptime monitoring with a phone alert** (10 min, free): UptimeRobot or Better Stack pinging
   `https://learn.optionlab.co.in/smart/api/health` every minute. Today, nobody is told when
   the site dies; students on WhatsApp are the current monitoring. This closes that gap.
3. Already true (worth knowing): `Restart=always` restarts a crashed Node in 3 s; the pull
   deploy health-checks before switching releases and keeps 3 releases for instant rollback;
   Supabase is managed and replicated on Supabase's side.

When the course crosses ~2–3k concurrent (roughly 1 lakh enrolled and an active batch
calendar), the next steps in order of value: VPS with more cores + `PM2/cluster` or a second
`learn-smart` unit on :3002 behind the same upstream (nginx load-balances the pool with one
line), then Supabase compute upgrade. Not needed today; the repo layout already supports it
(`upstream smart_node` exists now precisely so a second `server 127.0.0.1:3002;` line is the
whole change).

## 2. What shipped in this change-set (repo side — live after merge + APPLY doc)

**App (deploys automatically on merge via smart-pull):**
- `/smart/learn/admin` is now a numbers-first **Overview dashboard**: enrolled students
  (active / invited / suspended / joined-last-30-days), paid-course table for all four
  purchasable stages (F.U.N.D.A, W.I.N.N.E.R.S, O.N.E, PRO · Options 117) with active,
  scheduled, expiring-in-14-days, expired grants and last-7-day opens, Razorpay page status
  per stage, this-week activity (learning actions, quiz/exam submissions, stage opens),
  students-by-cohort, and the audit trail. Every number is a COUNT-only HEAD query, so the
  page stays instant at any roster size (PostgREST caps row responses at 1000 — list-based
  counting would silently lie past that; this doesn't).
- Cohort management moved to `/smart/learn/admin/cohorts` (linked from the Overview).

**Edge (nginx/systemd — reaches the box only via `APPLY-2026-09-25.md`):**
- Bad-bot User-Agent map: SEO scrapers (Semrush, Ahrefs, MJ12…), AI-training crawlers (GPTBot,
  CCBot, Bytespider, ClaudeBot…), HTTP-library defaults (python-requests, Scrapy, wget…) get
  403 on every path. curl (deploy health checks), WhatsApp/facebookexternalhit link previews,
  TelegramBot and real search engines are deliberately allowed. Verified against a live nginx
  in the dev container: browser/WhatsApp/Googlebot 200, Semrush/GPTBot/Scrapy 403.
- Flood limit on the app: 30 r/s per address, burst 100, then the same `rate_limited` 429 the
  forms already translate. Per-address cap of 30 concurrent connections site-wide. Classroom
  knobs documented in the APPLY doc.
- `/robots.txt` served by nginx (landing + sales pages indexable, app and gated stages
  disallowed, AI-training bots opted out) and `X-Robots-Tag: noindex` on the whole `/smart`
  app. A repo-root `robots.txt` now also ships on algo.circleoptionlab.com.
- Performance: nginx now caches `/smart/_next/static/*` (hashed, immutable → 30 d, serves
  stale through app restarts), all proxying + stage-gate auth_requests reuse a keepalive pool
  to Node, and the app unit gets `LimitNOFILE=65536`. Verified live in the dev container:
  second asset request served from cache without touching the backend; parallel flood returns
  429s with the correct body.

## 3. What is NOT done yet (needs Rahul / a later PR)

1. **Cloudflare in front** — §1.1 above. Biggest uptime + bot win, account-side only.
2. **Uptime monitor** — §1.2 above.
3. **Supabase plan check** — confirm the project is on a paid plan before real enrolment
   volume; the free mailer's 2 emails/hour would break invite/reset flows for a real batch.
4. **Razorpay Payment Pages** — `PAY_URLS` in `apps/learn/src/lib/payments.ts` are still empty,
   so every paid-course CTA falls back to the WhatsApp line and the admin Overview shows
   "WhatsApp enrolment" per stage. Filling them (and later the webhook auto-grant) is its own task.
5. **VPS OS hygiene** — unattended-upgrades, fail2ban on SSH: sensible, small, not in this set.

---

Published by **5 Circles Pvt Ltd** — SEBI Registered Research Analyst, Reg. No. **INH000020004**.
Internal operations document; carries no investment advice. Educational platform content only.
