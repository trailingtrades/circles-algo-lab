#!/usr/bin/env python3
"""CI renderer: fetch one certificate row from Supabase (service role), render with build_cert.py, upload to the private
`certificates` bucket, set pdf_storage_path. Usage: render_from_db.py <certificate_id>. Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL."""
import hashlib, hmac, os, sys, requests
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_cert import render  # noqa: E402

url, key, site = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_SERVICE_ROLE_KEY"], os.environ.get("SITE_URL", "").rstrip("/")
H = {"apikey": key, "Authorization": f"Bearer {key}"}
cid = sys.argv[1]
r = requests.get(f"{url}/rest/v1/certificates", headers=H, params={"id": f"eq.{cid}", "select": "id,cert_no,user_id,level_id,issued_on,band,verify_hash,cohort_id,profiles(full_name),levels(title_en),cohorts(name)"}); r.raise_for_status()
rows = r.json(); assert rows, f"certificate {cid} not found"; c = rows[0]
# Re-derive the HMAC as a tamper check before rendering anything
expected = hmac.new(os.environ["CERT_SIGNING_SECRET"].encode(), f"{c['cert_no']}|{c['user_id']}|{c['level_id']}|{c['issued_on']}".encode(), hashlib.sha256).hexdigest()
assert hmac.compare_digest(expected, c["verify_hash"]), "verify_hash mismatch — refusing to render"
data = {"learner_name": c["profiles"]["full_name"], "level_title": c["levels"]["title_en"], "cohort_name": (c.get("cohorts") or {}).get("name", ""), "session_count": 20,
        "band": c["band"], "cert_no": c["cert_no"], "issued_on": c["issued_on"], "verify_url": f"{site}/verify/{c['cert_no']}?k={expected[:12]}"}
pdf = render(data)
path = f"{c['user_id']}/{c['cert_no']}.pdf"
requests.post(f"{url}/storage/v1/bucket", headers=H, json={"id": "certificates", "name": "certificates", "public": False})  # idempotent (409 if exists)
u = requests.post(f"{url}/storage/v1/object/certificates/{path}", headers={**H, "Content-Type": "application/pdf", "x-upsert": "true"}, data=pdf); u.raise_for_status()
p = requests.patch(f"{url}/rest/v1/certificates", headers={**H, "Content-Type": "application/json", "Prefer": "return=minimal"}, params={"id": f"eq.{cid}"}, json={"pdf_storage_path": path}); p.raise_for_status()
print(f"rendered {c['cert_no']} -> certificates/{path} ({len(pdf)} bytes)")
