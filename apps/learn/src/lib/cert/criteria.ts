/** Certificate issue criteria (§11) — pure evaluation over already-loaded facts. */
import { t3, type L } from "../i18n/lang";

export interface CriteriaInput {
  sessionsTotal: number; sessionsComplete: number; finalPct: number | null; weeklyAttempted: number; weeklyTotal: number; artefactsGraded: { grade: string }[]; artefactsRequired: number; fridayReviews: number; fridayTotal?: number; suspended: boolean;
  /** Level slug, for the "Open" links (default foundation). */
  level?: string;
  /** Final-exam score for the result band: best attempt with retakes capped (default finalPct). */
  bandPct?: number | null;
  /** Distinction threshold from the final exam's own marks, e.g. 26/30 (default 30/36). */
  distinctionPct?: number;
  /** Content key of the first weekly exam not yet attempted ("foundation-w2"), so "Open" lands on it. */
  nextWeeklyKey?: string | null;
}
/** `label` / `labelHi` stay for older callers; `text` carries all three languages. `detail` is numbers, or words in three languages. */
export interface Criterion { key: string; text: L; label: string; labelHi: string; labelDv: string; ok: boolean; detail: string | L; href: string }
export const PASS = 0.6, DISTINCTION = 30 / 36;
const passGrade = (g: string) => ["A", "B", "C"].includes(g);
const item = (key: string, text: L, ok: boolean, detail: string | L, href: string): Criterion => ({ key, text, label: text.en, labelHi: text.hi, labelDv: text.dv, ok, detail, href });

export function evaluate(i: CriteriaInput): { ok: boolean; band: "distinction" | "pass" | null; items: Criterion[] } {
  const need = Math.ceil(i.sessionsTotal * 0.9);
  const fridayTotal = i.fridayTotal ?? 4, fridayNeed = Math.max(1, fridayTotal - 1);
  const gradedOk = i.artefactsGraded.filter((g) => passGrade(g.grade)).length;
  const level = i.level ?? "foundation";
  const items: Criterion[] = [
    item("sessions", t3(`At least 90% of sessions complete (${need} of ${i.sessionsTotal})`, `Kam se kam 90% sessions poore (${i.sessionsTotal} mein se ${need})`, `कम से कम 90% सेशन पूरे (${i.sessionsTotal} में से ${need})`), i.sessionsComplete >= need, `${i.sessionsComplete}/${i.sessionsTotal}`, "/learn/path"),
    item("final", t3("Final exam passed (60% or more)", "Final exam pass (60% ya usse zyada)", "फ़ाइनल परीक्षा पास (60% या उससे ज़्यादा)"), (i.finalPct ?? 0) >= PASS, i.finalPct === null ? t3("not attempted", "abhi nahi diya", "अभी नहीं दी") : `${Math.round(i.finalPct * 100)}%`, `/learn/exam/${level}-final`),
    item("weekly", t3(`All ${i.weeklyTotal} weekly exams attempted`, `Saare ${i.weeklyTotal} weekly exams diye`, `सभी ${i.weeklyTotal} वीकली परीक्षाएँ दीं`), i.weeklyAttempted >= i.weeklyTotal, `${i.weeklyAttempted}/${i.weeklyTotal}`, i.nextWeeklyKey ? `/learn/exam/${i.nextWeeklyKey}` : "/learn/path"),
    item("artefacts", t3(`Practice tasks graded C or better by your mentor (${i.artefactsRequired})`, `Practice tasks par mentor ka grade C ya behtar (${i.artefactsRequired})`, `प्रैक्टिस टास्क पर मेंटर का ग्रेड C या बेहतर (${i.artefactsRequired})`), gradedOk >= i.artefactsRequired, `${gradedOk}/${i.artefactsRequired}`, "/learn/portfolio"),
    item("friday", t3(`Weekly review written for at least ${fridayNeed} of ${fridayTotal} weeks`, `${fridayTotal} mein se kam se kam ${fridayNeed} hafton ka weekly review likha`, `${fridayTotal} में से कम से कम ${fridayNeed} हफ़्तों का साप्ताहिक रिव्यू लिखा`), i.fridayReviews >= fridayNeed, `${i.fridayReviews}/${fridayTotal}`, "/learn/path"),
    item("status", t3("Account in good standing (not suspended)", "Account active hai (suspended nahi)", "अकाउंट एक्टिव है (सस्पेंड नहीं)"), !i.suspended, i.suspended ? t3("suspended", "suspended", "सस्पेंड") : t3("active", "active", "एक्टिव"), "/learn/profile"),
  ];
  const ok = items.every((x) => x.ok);
  const bandPct = i.bandPct === undefined ? i.finalPct : i.bandPct;
  return { ok, band: ok ? ((bandPct ?? 0) >= (i.distinctionPct ?? DISTINCTION) ? "distinction" : "pass") : null, items };
}
