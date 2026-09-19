import "server-only";
import { Resend } from "resend";
import { TIER2, CREDENTIAL_LINE } from "@/lib/compliance/strings";

const FROM = process.env.EMAIL_FROM ?? "Circle S.M.A.R.T <learn@5circles.co>";

/** True when this server can actually send mail. Without a key every send is a logged no-op ({ skipped: true }). */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

/** Names and cohort labels are typed by staff; escape them so a stray "<" cannot break (or inject into) the email. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Tier-2 footer on every platform email (§2). The warning glyph is part of the approved wording. */
function wrap(bodyHtml: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0B1B33;max-width:560px">
${bodyHtml}
<hr style="border:none;border-top:1px solid #e2e7f0;margin:24px 0">
<p style="font-size:12px;color:#4b5670;margin:0 0 8px"><strong>${CREDENTIAL_LINE}</strong></p>
<p style="font-size:12px;color:#4b5670;margin:0">${TIER2}</p>
</div>`;
}

export async function sendInviteEmail(to: string, fullName: string, cohortName: string, link: string) {
  const html = wrap(`<p>Namaste ${esc(fullName)},</p>
<p>Aapka <strong>Circle S.M.A.R.T</strong> account tayyar hai — cohort <strong>${esc(cohortName)}</strong> ke liye.</p>
<p>Neeche wale link se apna password set kijiye. Ye link <strong>sirf ek baar</strong> chalega aur <strong>7 din</strong> mein expire ho jayega.</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#134A9A;color:#ffffff;padding:10px 18px;border-radius:9999px;text-decoration:none;font-weight:600">Set my password</a></p>
<p style="font-size:13px;color:#4b5670">Link kaam na kare to apne mentor se naya invite maangiye. Password kabhi email par nahi bheja jata.</p>`);
  return send(to, "Aapka Circle S.M.A.R.T invite — password set kijiye", html);
}

/** Resolves { skipped: true } when no key is configured — callers must NOT count that as sent. Throws on a Resend error. */
async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn(`[email] RESEND_API_KEY missing — not sent: "${subject}"`); return { id: null, skipped: true }; }
  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Resend: ${error.message}`);
  return { id: data?.id ?? null, skipped: false };
}

export async function sendCertificateEmail(to: string, fullName: string, levelTitle: string, certNo: string, link: string) {
  const html = wrap(`<p>Badhai ho ${esc(fullName)},</p>
<p>Aapka <strong>${esc(levelTitle)}</strong> level ka Certificate of Completion issue ho gaya hai. Certificate No. <strong>${esc(certNo)}</strong>.</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#134A9A;color:#ffffff;padding:10px 18px;border-radius:9999px;text-decoration:none;font-weight:600">Download from Circle S.M.A.R.T</a></p>
<p style="font-size:13px;color:#4b5670">This certifies course completion only. It is not a SEBI or NISM certification and confers no licence to advise.</p>`);
  return send(to, `Aapka ${levelTitle} certificate tayyar hai — Circle S.M.A.R.T`, html);
}
