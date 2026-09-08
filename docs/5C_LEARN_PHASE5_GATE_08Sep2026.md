# 5C Learn — PHASE 5 Gate Report (Certificates & admin)
**Date:** 08-Sep-2026 · **Branch:** `claude/5c-learn-dashboard-build-taxape`
**Decisions applied:** Q4-B grievance block = SCORES + ODR + Compliance Officer name, no email until an `@5circles.co` address exists · Q2-A single signatory (Rahul Sarawgi) · Q3-A no CIRI on the certificate.

## Built
**Certificate (print artefact — `five-circles-design-system`)**
- `certificates/template.html` + `build_cert.py` (WeasyPrint; `pip install weasyprint qrcode[pil]` on Linux/CI, standalone `weasyprint.exe` on Windows). A4 landscape, Baloo 2 (display, caps) / Poppins (body), Deep Navy `#0B2545` frame, Circles Blue `#00AEEF` accents, Amber Gold `#F2A93B` seal. Fonts self-hosted (`certificates/fonts/`, OFL via fontsource).
- Contents per §11: learner name · level · cohort · session count · band (Pass / Distinction, never a percentage or rank) · issue date · `5C-<LEVEL>-<YYYY>-<6 base32>` number · QR to the verify URL · Rahul Sarawgi signature block with the **credential line beneath it** · "This certifies course completion only. It is not a SEBI or NISM certification and confers no licence to advise." · full Tier-1 at the foot at 8.6pt, equal to the smallest body text.
- Sample: `docs/phase5-screens/sample-certificate.pdf` (+ PNG). Gate script `scripts/ci/check_cert_pdf.py`: 1 page, 297×210 mm, Tier-1 present verbatim, credential line, not-a-SEBI line, no Devanagari, no letter glyph under 7.5pt.

**Engine (`apps/learn/src/lib/cert/`)**
- `criteria.ts` — six §11 criteria, pure, 13 tests (18/20 sessions · final ≥60% · 3 weekly attempted · artefact ladder graded ≥C · ≥3/4 Friday reviews · not suspended; distinction at ≥30/36).
- `number.ts` — Crockford-style base32, no I/L/O/U/0/1. `hash.ts` — `verify_hash = HMAC-SHA256(cert_no|user_id|level_id|issued_on, CERT_SIGNING_SECRET)`, constant-time compare, 12-char QR key.
- `issue.ts` — service-role only: gathers facts, evaluates, inserts the row, renders the PDF via `build_cert.py`, uploads to the private `certificates` Storage bucket, audits, emails a Tier-2-footered notice. Triggered automatically after exam, practice-grade and Friday-review awards; also from the learner's "Check again" and the admin sweep. Never deletes (`0006` trigger).
- `/learn/certificate` — live checklist with "Go" links, Issue / Check again, download via 5-minute signed URL, verify link + copy.
- `/verify/[certId]` — public, no login. Lookup box, rate-limited (30/min per hashed IP via `verify_rate_ok`), HMAC recomputed on every hit, `?k=` QR key checked when present. Shows number, learner name, level, issue date, Valid/Revoked (+date), issuing-entity block, credential line, Tier-1. **No email, phone, cohort, score or rank.**

**Admin**
- `/learn/admin/content` + `/learn/admin/content/[n]` — session editor (titles, tags, Hinglish summary, video URL, prompts JSON, publish/draft) and quiz editor (add/edit/delete). Every save runs the runtime compliance scanner (`lib/compliance/scan.ts`, same rules as CI) and is audited. Session/quiz screens now read from the DB when connected (`lib/content/live.ts`) — **a typo fix needs no redeploy**.
- `/learn/admin/certificates` — issued list, revoke with mandatory reason (row kept, public page flips to Revoked), issuance sweep, per-student level override (audited).
- `/learn/admin/compliance` — scan report over content JSON, UI strings and DB rows.
- Login + verify pages carry the Q4-B grievance block.

## Gate results
| Gate | Result |
|---|---|
| Real certificate PDF rendered and visually QA'd | **Pass** — rendered twice; first pass had the signature block colliding with the disclaimer note and an ugly QR URL wrap, both fixed; final page reviewed |
| Forged verify URL rejected | **Pass** — 7 HMAC tests (wrong learner / date / level / secret / guessed key) + unknown number returns "not found"; tampered DB row fails the recomputed HMAC |
| Tier-1 legible at print size | **Pass** — 8.6pt, same as the smallest body line; PDF gate enforces ≥7.5pt letter glyphs |
| Cert number / criteria tests | 13/13 |
| Full suite (gating, rules, cert, verify, RLS, scoring) | 16 · 10 · 13 · 7 · 41 · 20, all pass |
| `check_compliance.py` (src, built, content, supabase, certificates) | 260 files, 0 failures |
| `check_responsive.py` + 12 screenshots at 360/1366 | 0 findings, no overflow, SEBI line everywhere |
| tsc / eslint / build | Clean; CI now renders the sample PDF and runs the PDF gate |

## Findings
1. `responsive`/compliance checker false-positive: `scan.ts` carried the Devanagari and warning-glyph codepoints inside regex literals. Rewritten as `\u` escapes. Rule stays strict.
2. `fitz`/poppler are absent in the container; `pypdfium2` is used for rasterising and the PDF gate.
3. Storage bucket `certificates` is created on first issue (private). Supabase Storage RLS for the bucket is not in the SQL migrations (storage schema is not in the local shim); downloads go through 5-minute signed URLs from the service role, so no learner can list or fetch another learner's file.
4. Verify page in preview mode says "not configured" — needs `SUPABASE_SERVICE_ROLE_KEY` and `CERT_SIGNING_SECRET`. Generate the secret with 32+ random bytes and never rotate it without re-signing existing rows.
5. Open from Phase 3: quiz banks for 55 sessions and 11 exam papers are still empty; the editor is now the place to fill them.

---
Investment in securities market is subject to market risks. Read all related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors. Past performance is not indicative of future results. The analyst or dependents may hold positions in the securities discussed. 5 Circles Pvt Ltd · SEBI Registered Research Analyst · Reg. No. INH000020004
