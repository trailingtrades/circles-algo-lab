// No "server-only" import so the HMAC can be unit-tested; only ever import this from server code (it reads CERT_SIGNING_SECRET).
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { certNo } from "./number";

/** verify_hash = HMAC-SHA256(cert_no|user_id|level_id|issued_on) with CERT_SIGNING_SECRET (§11). A forged row/URL cannot produce it.
 *  learner_name (the name frozen at issue) is deliberately NOT in the input: every certificate already issued, and
 *  certificates/render_from_db.py, use this exact formula. Learners cannot write the certificates table (RLS), so the
 *  snapshot column alone stops the "rename yourself after issue" problem. */
export function verifyHash(cert_no: string, user_id: string, level_id: string, issued_on: string) {
  const secret = process.env.CERT_SIGNING_SECRET; if (!secret) throw new Error("CERT_SIGNING_SECRET missing");
  return createHmac("sha256", secret).update(`${cert_no}|${user_id}|${level_id}|${issued_on}`).digest("hex");
}
export const hashesMatch = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
/** Short key embedded in the QR URL (?k=): first 12 hex chars of the hash. */
export const shortKey = (hash: string) => hash.slice(0, 12);
export const newCertNo = (levelSlug: string, year = new Date().getFullYear()) => certNo(levelSlug, year, randomBytes(6));
