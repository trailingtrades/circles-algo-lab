#!/usr/bin/env python3
"""Render a 5C Learn certificate PDF from template.html with WeasyPrint.
Usage: python3 build_cert.py '<json>' <out.pdf>
  json keys: learner_name, level_title, cohort_name, session_count, band, cert_no, issued_on, verify_url
Linux/CI: pip install weasyprint qrcode[pil]. Rahul's Windows box: use the standalone weasyprint.exe (pip WeasyPrint fails without GTK).
The Tier-1 disclaimer is pasted verbatim inside template.html and byte-checked by scripts/ci/check_compliance.py."""
import base64, html, io, json, os, sys
import qrcode
from weasyprint import HTML

HERE = os.path.dirname(os.path.abspath(__file__))

def qr_data_uri(url: str) -> str:
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=1, box_size=8)
    q.add_data(url); q.make(fit=True)
    img = q.make_image(fill_color="#0B2545", back_color="white")
    buf = io.BytesIO(); img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def render(data: dict) -> bytes:
    tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    verify_url = data["verify_url"]
    vals = {
        "learner_name": data["learner_name"], "level_title": data["level_title"], "cohort_name": data["cohort_name"],
        "session_count": str(data.get("session_count", 20)), "band": "Distinction" if data["band"] == "distinction" else "Pass",
        "cert_no": data["cert_no"], "issued_on": data["issued_on"], "year": data["issued_on"][-4:] if "-" not in data["issued_on"] else data["issued_on"][:4],
        "verify_url_display": verify_url.replace("https://", "").replace("http://", "").split("?")[0],
    }
    for k, v in vals.items(): tpl = tpl.replace("{{%s}}" % k, html.escape(str(v)))
    tpl = tpl.replace("{{qr_data_uri}}", qr_data_uri(verify_url))
    return HTML(string=tpl, base_url=HERE).write_pdf()

if __name__ == "__main__":
    data = json.loads(sys.argv[1]); out = sys.argv[2]
    pdf = render(data)
    open(out, "wb").write(pdf)
    print(f"wrote {out} ({len(pdf)} bytes)")
