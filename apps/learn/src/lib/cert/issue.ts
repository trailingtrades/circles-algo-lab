import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluate, type CriteriaInput } from "./criteria";
import { verifyHash, newCertNo, shortKey } from "./hash";
import { sendCertificateEmail } from "@/lib/email/resend";
import { LEVELS, type LevelSlug } from "@/lib/content/course";
import { RETAKE_CAP } from "@/lib/scoring/rules";
import { siteUrl as site } from "@/lib/supabase/env";

const exec = promisify(execFile);
const CERT_DIR = join(process.cwd(), "..", "..", "certificates");
const BUCKET = "certificates";
export const isLevelSlug = (v: unknown): v is LevelSlug => LEVELS.some((l) => l.slug === v);

/** Gather the facts for §11 criteria — service role, one user, one level.
 *  Session completion is worked out the way the learner's screens do it (a submitted quiz + a journal entry),
 *  not from session_progress.status, which other writes can flip back to in_progress. */
export async function gatherCriteria(userId: string, level: LevelSlug): Promise<CriteriaInput> {
  const admin = createAdminClient();
  const { data: lv } = await admin.from("levels").select("id").eq("slug", level).single();
  const { data: wk } = await admin.from("weeks").select("id,number").eq("level_id", lv!.id);
  const weekNo = new Map((wk ?? []).map((w) => [w.id as string, w.number as number]));
  const [{ data: sessions }, { data: quizzes }, { data: journals }, { data: exams }, { data: attempts }, { data: grades }, { data: ladder }, { data: prof }] = await Promise.all([
    admin.from("sessions").select("id,week_id").in("week_id", [...weekNo.keys()]),
    admin.from("attempts").select("session_id").eq("user_id", userId).not("session_id", "is", null).not("submitted_at", "is", null),
    admin.from("journal_entries").select("session_id,kind").eq("user_id", userId).not("session_id", "is", null),
    admin.from("exams").select("id,week_id,total_marks,distinction_marks").eq("level_id", lv!.id),
    admin.from("attempts").select("exam_id,score,max_score,attempt_no").eq("user_id", userId).not("exam_id", "is", null).not("submitted_at", "is", null),
    admin.from("practice_grades").select("process_grade,artefact").eq("user_id", userId).eq("level_id", lv!.id),
    admin.from("artefact_ladder").select("artefact").eq("level_slug", level),
    admin.from("profiles").select("status").eq("id", userId).single(),
  ]);
  const weekOf = new Map((sessions ?? []).map((s) => [s.id as string, weekNo.get(s.week_id as string) ?? 0]));
  const quizDone = new Set((quizzes ?? []).map((a) => a.session_id));
  const noted = new Set((journals ?? []).map((j) => j.session_id));
  const complete = [...weekOf.keys()].filter((id) => quizDone.has(id) && noted.has(id)).length;
  // Weekly reviews count per WEEK, not per entry: two reviews on one day are still one week.
  const reviewWeeks = new Set((journals ?? []).filter((j) => j.kind === "friday_review" && weekOf.has(j.session_id!)).map((j) => weekOf.get(j.session_id!)));
  const finalExam = (exams ?? []).find((e) => e.week_id === null);
  const pct = (a: { score: unknown; max_score: unknown }) => (Number(a.max_score) > 0 ? Number(a.score) / Number(a.max_score) : 0);
  const finals = (attempts ?? []).filter((a) => a.exam_id === finalExam?.id);
  const finalBest = finals.length ? Math.max(...finals.map(pct)) : null;
  // The band uses the same retake cap as the points: a retake after seeing the answers cannot earn Distinction.
  const bandPct = finals.length ? Math.max(...finals.map((a) => (Number(a.attempt_no) > 1 ? Math.min(pct(a), RETAKE_CAP) : pct(a)))) : null;
  const weekly = (exams ?? []).filter((e) => e.week_id !== null).sort((a, b) => (weekNo.get(a.week_id!) ?? 0) - (weekNo.get(b.week_id!) ?? 0));
  const triedExam = new Set((attempts ?? []).map((a) => a.exam_id));
  const nextWeekly = weekly.find((e) => !triedExam.has(e.id));
  // Foundation: 5 graded rows count as the ladder; other levels: one grade per artefact in the ladder.
  const required = level === "foundation" ? 5 : (ladder ?? []).length;
  const weeksInLevel = weekNo.size;
  return {
    sessionsTotal: weekOf.size, sessionsComplete: complete, finalPct: finalBest, weeklyAttempted: weekly.filter((e) => triedExam.has(e.id)).length, weeklyTotal: weekly.length,
    artefactsGraded: (grades ?? []).map((g) => ({ grade: g.process_grade })), artefactsRequired: required, fridayReviews: Math.min(weeksInLevel, reviewWeeks.size), fridayTotal: weeksInLevel, suspended: prof?.status === "suspended",
    level, bandPct, distinctionPct: finalExam && finalExam.total_marks > 0 ? finalExam.distinction_marks / finalExam.total_marks : undefined, nextWeeklyKey: nextWeekly ? `${level}-w${weekNo.get(nextWeekly.week_id!)}` : null,
  };
}

export type IssueResult = { id: string; cert_no: string; status: string; created: boolean };
type CertRow = { id: string; cert_no: string; status: string };

/** Issue if (and only if) every criterion is true and this learner has NO certificate row for the level yet.
 *  Any existing row blocks issuance, a revoked one included: a revocation is an admin decision, and a scoring
 *  event or a learner click must never quietly reverse it. Server-side, service role. */
export async function maybeIssue(userId: string, level: LevelSlug): Promise<IssueResult | null> {
  const admin = createAdminClient();
  const { data: lv } = await admin.from("levels").select("id,title_en").eq("slug", level).maybeSingle();
  if (!lv) return null;
  // limit() not maybeSingle(): if a race ever left two rows, maybeSingle errors, reads as "none", and issues a third.
  const existing = async (): Promise<CertRow | null> => { const { data } = await admin.from("certificates").select("id,cert_no,status").eq("user_id", userId).eq("level_id", lv.id).order("created_at", { ascending: false }).limit(5); return (data ?? []).find((c) => c.status === "issued") ?? data?.[0] ?? null; };
  const had = await existing();
  if (had) return { ...had, created: false };
  const facts = await gatherCriteria(userId, level);
  const ev = evaluate(facts);
  if (!ev.ok || !ev.band) return null;
  const { data: prof } = await admin.from("profiles").select("full_name,cohort_id,cohorts(name)").eq("id", userId).single();
  const cohort = (prof?.cohorts as unknown as { name: string } | null)?.name ?? "";
  // The name is frozen on the certificate row: the public verify page and the PDF show this, not the editable profile name.
  const learner_name = (prof?.full_name ?? "").trim();
  const issued_on = new Date().toISOString().slice(0, 10);
  let cert_no = newCertNo(level);
  for (let i = 0; i < 5; i++) { const { data: clash } = await admin.from("certificates").select("id").eq("cert_no", cert_no).limit(1); if (!clash?.length) break; cert_no = newCertNo(level); }
  const verify_hash = verifyHash(cert_no, userId, lv.id, issued_on);
  const base = { user_id: userId, level_id: lv.id, cohort_id: prof?.cohort_id ?? null, cert_no, issued_on, band: ev.band, verify_hash, status: "issued" };
  let ins = await admin.from("certificates").insert({ ...base, learner_name }).select("id,cert_no,status").single();
  // Deployed before migration 0010 (no learner_name column yet): issue without the snapshot rather than not at all.
  if (ins.error && /learner_name/.test(ins.error.message)) ins = await admin.from("certificates").insert(base).select("id,cert_no,status").single();
  if (ins.error) {
    // 23505 = the certificates_one_issued index (0010) caught a concurrent issue: the other request won.
    if (ins.error.code === "23505") { const won = await existing(); if (won) return { ...won, created: false }; }
    throw new Error(ins.error.message);
  }
  const row = ins.data as CertRow;
  const verifyUrl = `${site()}/verify/${cert_no}?k=${shortKey(verify_hash)}`;
  try {
    if (process.env.CERT_RENDER_MODE === "dispatch") throw new Error("dispatch");
    const pdf = await renderPdf({ learner_name, level_title: lv.title_en, cohort_name: cohort, session_count: facts.sessionsTotal, band: ev.band, cert_no, issued_on, verify_url: verifyUrl });
    const path = `${userId}/${cert_no}.pdf`;
    await admin.storage.createBucket(BUCKET, { public: false }).catch(() => undefined);
    const up = await admin.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (!up.error) await admin.from("certificates").update({ pdf_storage_path: path }).eq("id", row.id);
  } catch (e) {
    // No WeasyPrint on this host: hand the render to the GitHub Actions job. The row already exists; the PDF fills in within minutes.
    const ok = await dispatchRender(row.id);
    if (!ok) console.error("[cert] pdf render failed and no dispatch configured:", (e as Error).message);
  }
  await admin.rpc("log_audit", { p_actor: null, p_action: "certificate.issue", p_target_type: "certificates", p_target_id: row.id, p_before: null, p_after: { user_id: userId, level, cert_no, band: ev.band, learner_name } });
  const { data: u } = await admin.auth.admin.getUserById(userId);
  if (u?.user?.email) sendCertificateEmail(u.user.email, learner_name, lv.title_en, cert_no, `${site()}/learn/certificate`).catch(() => undefined);
  return { ...row, created: true };
}

/** Fire the cert-render workflow via repository_dispatch. Needs GITHUB_DISPATCH_TOKEN (fine-grained PAT, contents:write on the repo) and GITHUB_REPO ("owner/name"). */
async function dispatchRender(certificateId: string): Promise<boolean> {
  const token = process.env.GITHUB_DISPATCH_TOKEN, repo = process.env.GITHUB_REPO;
  if (!token || !repo) return false;
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" }, body: JSON.stringify({ event_type: "render-certificate", client_payload: { certificate_id: certificateId } }) });
  if (!res.ok) console.error("[cert] dispatch failed:", res.status); return res.ok;
}

export async function renderPdf(data: Record<string, unknown>): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "cert-"));
  const out = join(dir, "cert.pdf");
  try { await exec("python3", [join(CERT_DIR, "build_cert.py"), JSON.stringify(data), out], { timeout: 60_000 }); return await readFile(out); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

/** Sweep: try issuing for every active student in a cohort of this level. Used by the admin "check now" button.
 *  Returns how many certificates were NEWLY issued (not ones that already existed). */
export async function sweepLevel(level: LevelSlug) {
  if (!isLevelSlug(level)) return 0;
  const admin = createAdminClient();
  const [{ data: lv }, { data: cohorts }] = await Promise.all([
    admin.from("levels").select("id").eq("slug", level).maybeSingle(),
    admin.from("cohorts").select("id").eq("level", level),
  ]);
  if (!lv || !cohorts?.length) return 0;
  const [{ data: students }, { data: have }] = await Promise.all([
    admin.from("profiles").select("id").eq("role", "student").eq("status", "active").in("cohort_id", cohorts.map((c) => c.id as string)),
    admin.from("certificates").select("user_id").eq("level_id", lv.id),
  ]);
  const skip = new Set((have ?? []).map((c) => c.user_id));
  const todo = (students ?? []).filter((s) => !skip.has(s.id));
  let issued = 0;
  // Five learners at a time: finishes well inside the proxy timeout without hammering the database.
  for (let i = 0; i < todo.length; i += 5) {
    const rs = await Promise.all(todo.slice(i, i + 5).map((s) => maybeIssue(s.id, level).catch(() => null)));
    issued += rs.filter((r) => r?.created).length;
  }
  return issued;
}
