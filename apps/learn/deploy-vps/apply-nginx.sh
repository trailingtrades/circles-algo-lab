#!/bin/bash
# Installs the 19 Sep 2026 nginx changes for learn.optionlab.co.in (see APPLY-2026-09-19.md).
# Runs ON the VPS as root, from the folder the deploy-vps files were copied to. Order: check the
# box looks like the reference -> back up everything it will touch and write rollback.sh beside
# the backup -> edit the server block -> install files -> nginx -t -> reload. Any failure before
# the reload restores the backup, so nginx keeps serving the old config. Safe to run twice.
set -euo pipefail
SRC=$(cd "$(dirname "$0")" && pwd)
LINK=/etc/nginx/sites-enabled/learn.optionlab.co.in
SITE=$(readlink -f "$LINK")   # the file nginx really loads: an old `sed -i` on the link may have turned it into a plain copy
SNIP=/etc/nginx/snippets; CONFD=/etc/nginx/conf.d; WEB=/var/www/learn-5circles
BK=/root/nginx-backup-$(date +%Y%m%d-%H%M%S)
NAMES="learn-static-headers.conf academy-site.conf academy-paths-gated.conf smart-app.conf legacy-app-paths.conf learn-ratelimit.conf 404.html"
dest() { case "$1" in learn-ratelimit.conf) echo "$CONFD/$1" ;; 404.html) echo "$WEB/$1" ;; *) echo "$SNIP/$1" ;; esac; }

echo "→ preflight"
[ -f "$SITE" ] || { echo "FAIL: no server block at $LINK" >&2; exit 1; }
for n in $NAMES; do [ -f "$SRC/$n" ] || { echo "FAIL: $SRC/$n is missing — copy the whole deploy-vps folder" >&2; exit 1; }; done
if grep -q $'\r' "$SRC"/*.conf "$SRC"/404.html; then echo "FAIL: CRLF line endings in $SRC — run: sed -i 's/\r\$//' $SRC/*" >&2; exit 1; fi
grep -qE '^[[:space:]]*include[[:space:]]+/etc/nginx/conf\.d/\*\.conf;' /etc/nginx/nginx.conf \
  || { echo "FAIL: /etc/nginx/nginx.conf does not include conf.d/*.conf, so the rate-limit zone would not load — apply by hand" >&2; exit 1; }
grep -qE '^[[:space:]]*include[[:space:]]+/etc/nginx/snippets/academy-paths(-gated)?\.conf;' "$SITE" \
  || { echo "FAIL: no academy-paths include in $SITE — the layout differs from the reference, apply by hand" >&2; exit 1; }
grep -q 'snippets/smart-app.conf;' "$SITE" || { echo "FAIL: smart-app.conf is not included in $SITE" >&2; exit 1; }
grep -q 'snippets/academy-paths-gated.conf;' "$SITE" \
  || echo "!  stage gate is OFF (ungated academy-paths.conf is included): the gated snippet is installed but stays dormant"
[ -L "$LINK" ] && echo "   $LINK -> $SITE" \
  || echo "!  $LINK is a plain file, not a symlink: editing it in place. Afterwards consider: cp $LINK /etc/nginx/sites-available/learn.optionlab.co.in && ln -sfn ../sites-available/learn.optionlab.co.in $LINK"
nginx -t 2>/dev/null || { echo "FAIL: nginx -t fails BEFORE any change — fix that first:" >&2; nginx -t; exit 1; }

echo "→ backup: $BK"
mkdir -p "$BK"; cp -a "$SITE" "$BK/site.conf"
{
  echo '#!/bin/bash'
  echo "# Puts nginx for learn.optionlab.co.in back to how it was before $(basename "$BK")."
  echo 'set -e'
  echo "cp -a '$BK/site.conf' '$SITE'"
  for n in $NAMES; do
    d=$(dest "$n")
    if [ -f "$d" ]; then cp -a "$d" "$BK/$n"; echo "cp -a '$BK/$n' '$d'"; else echo "rm -f '$d'"; fi
  done
  echo 'nginx -t && systemctl reload nginx && echo "rolled back; nginx reloaded"'
} > "$BK/rollback.sh"
chmod 700 "$BK/rollback.sh"
trap 'rc=$?; echo "FAIL: a step exited with $rc — restoring the backup" >&2; bash "$BK/rollback.sh"; exit $rc' ERR

echo "→ server block: root and Mentor Desk locations move to academy-site.conf"
python3 - "$SITE" <<'PY'
import re, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
TAG = "# moved to snippets/academy-site.conf 2026-09-19: "
def comment_out(s, path):
    # A brace block with nothing nested, as in the reference server block. Commented lines no longer
    # start with `location`, so a second run finds nothing to do.
    pat = re.compile(r"^[ \t]*location[ \t]+=[ \t]+" + re.escape(path) + r"[ \t]*\{[^{}]*\}[ \t]*$", re.M)
    hits = list(pat.finditer(s))
    if len(hits) > 1: sys.exit(f"more than one 'location = {path}' block in {p} — apply by hand")
    if not hits: print(f"   location = {path}: not in the server block (already moved)"); return s
    m = hits[0]
    block = "\n".join(l[:len(l) - len(l.lstrip())] + TAG + l.lstrip() if l.strip() else l for l in m.group(0).split("\n"))
    print(f"   location = {path}: commented out in the server block")
    return s[:m.start()] + block + s[m.end():]
s = comment_out(s, "/")
s = comment_out(s, "/admin.html")
if re.search(r"^[ \t]*include[ \t]+/etc/nginx/snippets/academy-site\.conf;", s, re.M):
    print("   include academy-site.conf: already present")
else:
    m = re.search(r"^([ \t]*)include[ \t]+/etc/nginx/snippets/academy-paths(?:-gated)?\.conf;[^\n]*$", s, re.M)
    s = s[:m.end()] + "\n" + m.group(1) + "include /etc/nginx/snippets/academy-site.conf;" + s[m.end():]
    print("   include academy-site.conf: added after the academy-paths include")
open(p, "w", encoding="utf-8").write(s)
PY

echo "→ installing files"
for n in $NAMES; do
  d=$(dest "$n")
  # The Academy deploy (ctc-tools deploy-academy.sh) owns /404.html and ships it with the landing's own
  # footer; this copy is only the fallback for a box that has none yet.
  if [ "$n" = 404.html ] && [ -f "$d" ]; then echo "   $d: kept (the Academy deploy's copy)"; continue; fi
  install -m 644 "$SRC/$n" "$d"; echo "   $d"
done
chown www-data:www-data "$WEB/404.html"

echo "→ nginx -t"
if nginx -t; then
  trap - ERR
  systemctl reload nginx
  echo "OK: nginx reloaded. Rollback, if ever needed: bash $BK/rollback.sh"
else
  trap - ERR
  echo "FAIL: nginx -t failed — restoring the backup; nginx kept serving the old config throughout" >&2
  bash "$BK/rollback.sh"; exit 1
fi

echo "→ quick look from the box itself (the full check runs from your machine)"
H=learn.optionlab.co.in
for p in / /smart/about/ /winners/about/ /one/about/ /smart/about /winners/ /admin.html /no-such-page; do
  printf '   %-18s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --resolve $H:443:127.0.0.1 "https://$H$p" || true)"
done
