#!/bin/bash
# CIRCLE S.M.A.R.T pull deploy — polls the smart-vps release of trailingtrades/circles-algo-lab and
# swaps in a new build when the bundle asset changes. Release assets are readable by anyone who can
# read the repo, so the bundle arrives as smart-app.tgz.age (it carries the course content, exam and
# quiz answer keys included) and the secrets as env.age, both encrypted to /root/.config/smart-deploy.key.
# The plaintext smart-app.tgz of builds before 19 Sep 2026 is still accepted, so this copy can go on the
# box before the workflow that publishes .age is merged. Run by smart-pull.timer every 2 minutes.
# Private repo: put a fine-grained token (this repo only, Contents: read-only) in /root/.config/smart-gh-token
# (chmod 600). Without that file the calls are anonymous, which only works while the repo is public.
set -euo pipefail
API=https://api.github.com/repos/trailingtrades/circles-algo-lab/releases/tags/smart-vps
KEY=/root/.config/smart-deploy.key
TOKEN_FILE=/root/.config/smart-gh-token
STATE=/opt/learn-smart/.deployed-asset-id
LOG=/var/log/smart-pull.log
# The token reaches curl on stdin (-H @-), never on the command line (ps would show it). curl drops it on
# the redirect to the asset storage host, which would reject it.
gh_get() {
  if [ -s "$TOKEN_FILE" ]; then printf 'Authorization: Bearer %s\n' "$(tr -d '[:space:]' < "$TOKEN_FILE")" | curl -fsSL -H @- "$@"
  else curl -fsSL "$@"; fi
}
json=$(gh_get -H "Accept: application/vnd.github+json" "$API" 2>/dev/null) || exit 0
# API asset URLs (not browser_download_url): they work anonymously for a public repo and with the token for a private one.
read -r id kind tgz_url env_url <<< "$(echo "$json" | python3 -c '
import json,sys
a={x["name"]:x for x in json.load(sys.stdin).get("assets",[])}
t,k=(a["smart-app.tgz.age"],"age") if "smart-app.tgz.age" in a else (a.get("smart-app.tgz"),"plain")
e=a.get("env.age")
# No bundle (e.g. mid-upload): print nothing. Blank leading fields would let read shift the env URL into id.
t and print(t["id"], k, t["url"], e["url"] if e else "")')"
[ -n "$id" ] || exit 0
[ -f "$STATE" ] && [ "$(cat "$STATE")" = "$id" ] && exit 0
echo "$(date -Is) deploying asset $id ($kind)" >> "$LOG"
gh_get -H "Accept: application/octet-stream" -o /tmp/smart-app.tgz.dl "$tgz_url"
if [ "$kind" = age ]; then
  # Decrypt before the env is touched, so a bad bundle never leaves a new env paired with the old build.
  (umask 077; age -d -i "$KEY" -o /tmp/smart-app.tgz /tmp/smart-app.tgz.dl); rm -f /tmp/smart-app.tgz.dl
else
  mv /tmp/smart-app.tgz.dl /tmp/smart-app.tgz
fi
if [ -n "$env_url" ]; then
  gh_get -H "Accept: application/octet-stream" -o /tmp/env.age "$env_url"
  # Decrypt beside the live file and swap only on success: a failed decrypt must not leave an empty
  # env behind for the next restart (the unit restarts on its own).
  (umask 077; age -d -i "$KEY" /tmp/env.age > /etc/learn-smart.env.new && mv /etc/learn-smart.env.new /etc/learn-smart.env); rm -f /tmp/env.age
fi
REL="$id-$(date +%Y%m%d%H%M%S)"
mkdir -p "/opt/learn-smart/releases/$REL"
tar -xzf /tmp/smart-app.tgz -C "/opt/learn-smart/releases/$REL"; rm -f /tmp/smart-app.tgz
chown -R www-data:www-data "/opt/learn-smart/releases/$REL"
ln -sfn "/opt/learn-smart/releases/$REL/apps/learn" /opt/learn-smart/current
systemctl restart learn-smart
ok=""
for i in $(seq 1 30); do
  sleep 2
  curl -sf -o /dev/null http://127.0.0.1:3001/smart/api/health && { ok=1; break; }
done
[ -n "$ok" ] || { echo "$(date -Is) health check failed after 60s" >> "$LOG"; systemctl status learn-smart --no-pager -n 5 >> "$LOG"; exit 7; }
echo "$id" > "$STATE"
# First deploy: swap the nginx redirect stub for the app proxy.
SITE=/etc/nginx/sites-enabled/learn.optionlab.co.in
if ! grep -q "snippets/smart-app.conf" "$SITE"; then
  sed -i --follow-symlinks "s|include /etc/nginx/snippets/academy-paths.conf;|include /etc/nginx/snippets/academy-paths.conf;\n\n    include /etc/nginx/snippets/smart-app.conf;|" "$SITE"
  [ -f /var/www/learn-5circles/smart/index.html ] && mv /var/www/learn-5circles/smart/index.html "/var/www/learn-5circles/smart/index.html.pre-app.$(date +%Y%m%d)"
  nginx -t && systemctl reload nginx
fi
ls -1dt /opt/learn-smart/releases/* | tail -n +4 | xargs -r rm -rf
echo "$(date -Is) deployed asset $id OK" >> "$LOG"
