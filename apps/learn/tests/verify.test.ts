/** Forged verify URL / tampered row must be rejected (Phase 5 gate). */
process.env.CERT_SIGNING_SECRET = "test-secret-do-not-use";
import { verifyHash, hashesMatch, shortKey } from "../src/lib/cert/hash";
let pass = 0, fail = 0; const ok = (n: string, c: boolean) => { if (c) pass++; else fail++; console.log(`${c ? "  ok  " : "  FAIL"} ${n}`); };
const row = { cert_no: "5C-FOUND-2026-K7M3QX", user: "00000000-0000-0000-0000-0000000000a1", level: "00000000-0000-0000-0000-0000000000f1", issued: "2026-11-14" };
const good = verifyHash(row.cert_no, row.user, row.level, row.issued);
ok("stored hash verifies", hashesMatch(good, verifyHash(row.cert_no, row.user, row.level, row.issued)));
ok("forged row (different learner) fails", !hashesMatch(good, verifyHash(row.cert_no, "00000000-0000-0000-0000-0000000000b2", row.level, row.issued)));
ok("tampered issue date fails", !hashesMatch(good, verifyHash(row.cert_no, row.user, row.level, "2026-11-15")));
ok("tampered level fails", !hashesMatch(good, verifyHash(row.cert_no, row.user, "00000000-0000-0000-0000-0000000000f2", row.issued)));
ok("guessed hash of wrong length fails without throwing", !hashesMatch(good, "abc"));
ok("QR short key matches only the real hash", shortKey(good) === good.slice(0, 12) && shortKey(good) !== shortKey(verifyHash("5C-FOUND-2026-ZZZZZZ", row.user, row.level, row.issued)));
process.env.CERT_SIGNING_SECRET = "another-secret";
ok("different secret -> different hash (forged deployment cannot mint)", !hashesMatch(good, verifyHash(row.cert_no, row.user, row.level, row.issued)));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
