import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Single-use invite token: 32 random bytes, base64url. Only the sha256 is stored. */
export function newInviteToken() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}
export function hashToken(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
export const INVITE_TTL_DAYS = 7;
