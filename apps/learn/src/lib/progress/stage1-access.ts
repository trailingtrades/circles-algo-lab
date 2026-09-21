/* Who may open a Stage 1 week's printable handout, its day pages and its class files (PDF / PPTX).
 * One rule for the print route (/learn/print/...), the file route (/learn/files/stage1/...) and the links on the
 * session and Resources pages, so a link is shown exactly when it opens:
 *   - staff (mentor, admin): every week, every day, published or not;
 *   - a learner: a WEEK opens once its first day is unlocked (the handout is that week's class material, and the
 *     session page lists it on every day of the week); a single DAY opens when that day is unlocked (gate()).
 * Students only ever get published days. Pure (no I/O): the caller passes the learner state. */
import { SESSIONS, type Session } from "@/lib/content/course";
import { t3 } from "@/lib/i18n/lang";
import { gate, isPublished, type Gate, type LearnerState } from "./gating";

export const STAGE1_WEEKS = [1, 2, 3] as const;
export const isStage1Week = (w: number) => (STAGE1_WEEKS as readonly number[]).includes(w);

/** Stage 1 days of a week in course order. Students get the published days only. */
export function stage1Days(state: LearnerState, week: number, staff: boolean): Session[] {
  return SESSIONS.filter((s) => s.level === "foundation" && s.week === week && (staff || isPublished(state, s))).sort((a, b) => a.number - b.number);
}

const notYet: Gate = { status: "locked", why: t3("This week is not published yet.", "Ye hafta abhi publish nahi hua hai.", "यह हफ़्ता अभी पब्लिश नहीं हुआ है।"), reason: "This week is not published yet.", reasonHi: "Ye hafta abhi publish nahi hua hai.", unlockHref: null };

/** null = open. Otherwise the gate of the week's first day (why it is shut and what opens it). */
export function weekGate(state: LearnerState, week: number, staff: boolean): Gate | null {
  if (staff) return null;
  const first = stage1Days(state, week, false)[0];
  if (!first) return notYet;
  const g = gate(state, first);
  return g.status === "locked" ? g : null;
}

/** null = open. A single day follows the app's own unlock rule. */
export function dayGate(state: LearnerState, s: Session, staff: boolean): Gate | null {
  if (staff) return null;
  const g = gate(state, s);
  return g.status === "locked" ? g : null;
}
