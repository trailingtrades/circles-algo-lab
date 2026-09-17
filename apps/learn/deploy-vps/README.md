# CIRCLE S.M.A.R.T — self-hosted on the VPS at learn.optionlab.co.in/smart/

Since 17 Sep 2026 the app runs on the VPS (200.141.9.107), not Vercel. These are reference
copies of the files installed on the box; the box is the source of truth.

## How a deploy works (pull-based — the provider firewall blocks inbound SSH from runners)

1. `.github/workflows/deploy-smart-vps.yml` builds the standalone bundle
   (`NEXT_PUBLIC_BASE_PATH=/smart`, `NEXT_OUTPUT_STANDALONE=1`) and uploads
   `smart-app.tgz` + `env.age` to the rolling `smart-vps` GitHub release.
   `env.age` holds the runtime env encrypted to the VPS's age public key
   (private key: `/root/.config/smart-deploy.key`, never leaves the box).
2. On the VPS, `smart-pull.timer` runs `smart-pull.sh` every 2 minutes. A new
   `smart-app.tgz` asset id triggers: download, decrypt env to `/etc/learn-smart.env`,
   extract to `/opt/learn-smart/releases/<id>-<ts>`, atomically repoint
   `/opt/learn-smart/current`, restart the `learn-smart` unit (node server.js on
   127.0.0.1:3001), health-check `/smart/api/health` for up to 60 s, keep 3 releases.
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
