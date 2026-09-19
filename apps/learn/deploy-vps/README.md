# CIRCLE S.M.A.R.T — self-hosted on the VPS at learn.optionlab.co.in/smart/

Since 17 Sep 2026 the app runs on the VPS (200.141.9.107), not Vercel. These are reference
copies of the files installed on the box; the box is the source of truth. Anything changed here
reaches the box only by hand — the latest change set and its exact commands are in
`APPLY-2026-09-19.md`.

| File here | On the box | What it is |
|---|---|---|
| `smart-app.conf` | `/etc/nginx/snippets/` | `/smart` proxy, `/smart/about/` static page, sign-in rate limit |
| `academy-paths-gated.conf` | `/etc/nginx/snippets/` | `/winners/` `/one/` behind the stage gate, public `/about/` pages, `/fonts/` |
| `academy-site.conf` | `/etc/nginx/snippets/` | landing `/`, branded 404, closed `/admin.html` (moved out of the server block 19 Sep) |
| `learn-static-headers.conf` | `/etc/nginx/snippets/` | HSTS, CSP, Permissions-Policy etc. for every static location |
| `legacy-app-paths.conf` | `/etc/nginx/snippets/` | Vercel-era `/learn` `/verify` `/api` → `/smart` 301s |
| `learn-ratelimit.conf` | `/etc/nginx/conf.d/` | `limit_req_zone` for the sign-in/invite/reset POSTs (http context) |
| `404.html` | `/var/www/learn-5circles/` | fallback branded not-found page; the Academy deploy's own `dist/404.html` wins (`apply-nginx.sh` never overwrites it) |
| `learn-smart.service`, `smart-pull.sh`, `smart-pull.timer` | `/etc/systemd/system/`, `/usr/local/bin/` | app unit and pull deploy |
| `apply-nginx.sh` | run from a copy in `/root/` | installs the nginx files with backup, `nginx -t` and auto-rollback |

## How a deploy works (pull-based — the provider firewall blocks inbound SSH from runners)

1. `.github/workflows/deploy-smart-vps.yml` builds the standalone bundle
   (`NEXT_PUBLIC_BASE_PATH=/smart`, `NEXT_OUTPUT_STANDALONE=1`) and uploads
   `smart-app.tgz.age` + `env.age` to the rolling `smart-vps` GitHub release, then
   deletes the plaintext `smart-app.tgz` older builds left there. Both are encrypted
   to the VPS's age public key (private key: `/root/.config/smart-deploy.key`, never
   leaves the box): release assets are as public as the repo, and the bundle carries
   the course content with the exam and quiz answer keys.
   The workflow then waits until `/smart/api/health` answers `"build":"<its commit>"`.
2. On the VPS, `smart-pull.timer` runs `smart-pull.sh` every 2 minutes. A new
   bundle asset id triggers: download and decrypt the bundle, decrypt env to `/etc/learn-smart.env`,
   extract to `/opt/learn-smart/releases/<id>-<ts>`, atomically repoint
   `/opt/learn-smart/current`, restart the `learn-smart` unit (node server.js on
   127.0.0.1:3001), health-check `/smart/api/health` for up to 60 s, keep 3 releases.
   **The box copy must be the one that reads `smart-app.tgz.age`** (19 Sep 2026). It still
   takes the old plaintext asset, so install it BEFORE merging the workflow change (`ssh_` from step 0 of `APPLY-2026-09-19.md`; `<branch>` = the PR branch):

       git show origin/<branch>:apps/learn/deploy-vps/smart-pull.sh | ssh_ 'sed "s/\r$//" > /usr/local/bin/smart-pull.sh.new && bash -n /usr/local/bin/smart-pull.sh.new && chmod 755 /usr/local/bin/smart-pull.sh.new && mv /usr/local/bin/smart-pull.sh.new /usr/local/bin/smart-pull.sh && systemctl start smart-pull.service && tail -n 3 /var/log/smart-pull.log'

   If the repo is made private, also put a fine-grained token (this repo only, Contents:
   read-only) in `/root/.config/smart-gh-token` (chmod 600); without it the pull is anonymous.
3. nginx serves the app via `snippets/smart-app.conf` (`location ^~ /smart` proxy);
   the static `/smart/about/` course page on disk wins with its longer prefix.
   Never add a `location = /smart` redirect to `/smart/` — Next canonicalises the
   other way and the two loop forever.

## Debugging on the box

    journalctl -u learn-smart -n 50        # app logs
    tail /var/log/smart-pull.log           # deploy history
    systemctl start smart-pull.service     # force a pull now instead of waiting 2 min
    curl -s http://127.0.0.1:3001/smart/api/health

Gotcha that already bit once: `smart-pull.sh` must not let the `umask 077` used for the
env file leak into the release dirs, or www-data cannot traverse them (CHDIR 200).

## Stage gate (one login, per-stage unlock) — added 17 Sep 2026

`/winners/` and `/one/` can be gated behind the SMART login via nginx `auth_request` →
`/smart/api/gate/<stage>` (stage_access table; mentors grant at /smart/learn/mentor/stages).
The gated nginx variant is `snippets/academy-paths-gated.conf` (kept in sync from this dir).

Enforcement is a one-line include swap in `/etc/nginx/sites-enabled/learn.optionlab.co.in`:

    # ON  (do this only after every current student has an account + grants)
    sed -i --follow-symlinks 's|snippets/academy-paths.conf|snippets/academy-paths-gated.conf|' /etc/nginx/sites-enabled/learn.optionlab.co.in && nginx -t && systemctl reload nginx

    # OFF (instant rollback)
    sed -i --follow-symlinks 's|snippets/academy-paths-gated.conf|snippets/academy-paths.conf|' /etc/nginx/sites-enabled/learn.optionlab.co.in && nginx -t && systemctl reload nginx

`--follow-symlinks` matters: a plain `sed -i` on the sites-enabled symlink replaces it with a
copy, and the next script that edits sites-available (deploy-academy.sh --setup) then edits a
file nginx no longer reads. `apply-nginx.sh` always edits whatever the link resolves to.

The course-detail pages `/winners/about/` and `/one/about/` are public in both variants (19 Sep:
the gated snippet has its own ungated `^~` blocks for them).
