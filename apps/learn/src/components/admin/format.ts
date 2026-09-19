/** Staff-screen formatting shared by admin and mentor pages (pure; server or client).
 *  Dates always render in IST: the VPS clock may not be on Asia/Kolkata, and a server-rendered
 *  client component would otherwise hydrate with a different string in the browser. */
const TZ = "Asia/Kolkata";
type D = string | number | Date | null | undefined;
const ok = (d: D): d is string | number | Date => d != null && d !== "" && !Number.isNaN(new Date(d).getTime());
/** "19 Sep, 04:30 pm" */
export const fmtDateTime = (d: D) => (ok(d) ? new Date(d).toLocaleString("en-IN", { timeZone: TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : null);
/** "19 Sep 2026" */
export const fmtDate = (d: D) => (ok(d) ? new Date(d).toLocaleDateString("en-IN", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }) : null);
/** yyyy-mm-dd of that instant in IST, for <input type="date"> defaults. */
export const isoDayIST = (d: D) => (ok(d) ? new Date(d).toLocaleDateString("en-CA", { timeZone: TZ }) : "");

/** Mirrors title_en in content/levels.json (kept here so client forms do not pull the whole course bundle). */
export const LEVEL_LABEL: Record<string, string> = { foundation: "Stage 1 · Basic", intermediate: "Level 2 · Advanced", advanced: "Level 3 · Expert" };
export const levelLabel = (slug: string | null | undefined) => (slug ? LEVEL_LABEL[slug] ?? slug : "—");

/** Clock checks for server-rendered staff pages (kept out of component bodies: render stays a pure function of its data). */
export const isPast = (d: D) => ok(d) && new Date(d).getTime() < Date.now();
export const isFuture = (d: D) => ok(d) && new Date(d).getTime() > Date.now();
export const daysAgoIso = (n: number) => new Date(Date.now() - n * 86400e3).toISOString();

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);
