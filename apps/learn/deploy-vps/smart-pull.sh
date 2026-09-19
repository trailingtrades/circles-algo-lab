#!/bin/bash
# CIRCLE S.M.A.R.T pull deploy — polls the smart-vps release of trailingtrades/circles-algo-lab
# (public repo) and swaps in a new build when the smart-app.tgz asset changes. Secrets arrive as
# env.age, encrypted to /root/.config/smart-deploy.key. Run by smart-pull.timer every 2 minutes.
set -euo pipefail
API=https://api.github.com/repos/trailingtrades/circles-algo-lab/releases/tags/smart-vps
STATE=/opt/learn-smart/.deployed-asset-id
LOG=/var/log/smart-pull.log
json=$(curl -fsSL -H "Accept: application/vnd.github+json" "$API" 2>/dev/null) || exit 0
read -r id tgz_url env_url <<< "$(echo "$json" | python3 -c "
import json,sys
d=json.load(sys.stdin); a={x[\"name\"]:x for x in d.get(\"assets\",[])}
t=a.get(\"smart-app.tgz\"); e=a.get(\"env.age\")
print(t[\"id\"] if t else \"\", t[\"browser_download_url\"] if t else \"\", e[\"browser_download_url\"] if e else \"\")")"
[ -n "$id" ] || exit 0
[ -f "$STATE" ] && [ "$(cat "$STATE")" = "$id" ] && exit 0
echo "$(date -Is) deploying asset $id" >> "$LOG"
curl -fsSL -o /tmp/smart-app.tgz "$tgz_url"
if [ -n "$env_url" ]; then
  curl -fsSL -o /tmp/env.age "$env_url"
  # Decrypt beside the live file and swap only on success: a failed decrypt must not leave an empty
  # env behind for the next restart (the unit restarts on its own).
  (umask 077; age -d -i /root/.config/smart-deploy.key /tmp/env.age > /etc/learn-smart.env.new && mv /etc/learn-smart.env.new /etc/learn-smart.env); rm -f /tmp/env.age
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
