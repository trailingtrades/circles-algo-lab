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
import { LEVELS, EXAMS, type LevelSlug } from "@/lib/content/course";

const exec = promisify(execFile);
const CERT_DIR = join(process.cwd(), "..", "..", "certificates");
const BUCKET = "certificates";
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

/** Gather the facts for §11 criteria — service role, one user, one level. */
export async function gatherCriteria(userId: string, level: LevelSlug): Promise<CriteriaInput> {
  const admin = createAdminClient();
  const { data: lv } = await admin.from("levels").select("id").eq("slug", level).single();
  const [{ data: sessions }, { data: prog }, { data: exams }, { data: attempts }, { data: grades }, { data: ladder }, { data: journals }, { data: prof }] = await Promise.all([
    admin.from("sessions").select("id").in("week_id", (await admin.from("weeks").select("id").eq("level_id", lv!.id)).data!.map((w) => w.id)),
    admin.from("session_progress").select("session_id,status").eq("user_id", userId).eq("status", "complete"),
    admin.from("exams").select("id,week_id,total_marks").eq("level_id", lv!.id),
    admin.from("attempts").select("exam_id,score,max_score,submitted_at").eq("user_id", userId).not("exam_id", "is", null).not("submitted_at", "is", null),
    admin.from("practice_grades").select("process_grade,artefact").eq("user_id", userId).eq("level_id", lv!.id),
    admin.from("artefact_ladder").select("artefact").eq("level_slug", level),
    admin.from("journal_entries").select("session_id").eq("user_id", userId).eq("kind", "friday_review"),
    admin.from("profiles").select("status").eq("id", userId).single(),
  ]);
  const ids = new Set((sessions ?? []).map((s) => s.id));
  const complete = (prog ?? []).filter((p) => ids.has(p.session_id)).length;
  const finalExam = (exams ?? []).find((e) => e.week_id === null);
  const finalBest = (attempts ?? []).filter((a) => a.exam_id === finalExam?.id).map((a) => Number(a.score) / Number(a.max_score)).sort((a, b) => b - a)[0] ?? null;
  const weeklyIds = new Set((exams ?? []).filter((e) => e.week_id !== null).map((e) => e.id));
  const weeklyAttempted = new Set((attempts ?? []).filter((a) => weeklyIds.has(a.exam_id!)).map((a) => a.exam_id)).size;
  // Foundation: 5 graded rows count as the ladder; other levels: one grade per artefact in the ladder.
  const required = level === "foundation" ? 5 : (ladder ?? []).length;
  const fridays = (journals ?? []).filter((j) => ids.has(j.session_id!)).length;
  return { sessionsTotal: ids.size, sessionsComplete: complete, finalPct: finalBest, weeklyAttempted, weeklyTotal: weeklyIds.size, artefactsGraded: (grades ?? []).map((g) => ({ grade: g.process_grade })), artefactsRequired: required, fridayReviews: Math.min(4, fridays), suspended: prof?.status === "suspended" };
}

/** Issue if (and only if) every criterion is true and no issued certificate exists. Server-side, service role. Returns the cert row or null. */
export async function maybeIssue(userId: string, level: LevelSlug) {
  const admin = createAdminClient();
  const { data: lv } = await admin.from("levels").select("id,title_en").eq("slug", level).single();
  const { data: existing } = await admin.from("certificates").select("id,cert_no,status").eq("user_id", userId).eq("level_id", lv!.id).eq("status", "issued").maybeSingle();
  if (existing) return existing;
  const facts = await gatherCriteria(userId, level);
  const ev = evaluate(facts);
  if (!ev.ok || !ev.band) return null;
  const { data: prof } = await admin.from("profiles").select("full_name,cohort_id,cohorts(name)").eq("id", userId).single();
  const cohort = (prof?.cohorts as unknown as { name: string } | null)?.name ?? "";
  const issued_on = new Date().toISOString().slice(0, 10);
  let cert_no = newCertNo(level);
  for (let i = 0; i < 5; i++) { const { data: clash } = await admin.from("certificates").select("id").eq("cert_no", cert_no).maybeSingle(); if (!clash) break; cert_no = newCertNo(level); }
  const verify_hash = verifyHash(cert_no, userId, lv!.id, issued_on);
  const { data: row, error } = await admin.from("certificates").insert({ user_id: userId, level_id: lv!.id, cohort_id: prof?.cohort_id ?? null, cert_no, issued_on, band: ev.band, verify_hash, status: "issued" }).select("id,cert_no,status").single();
  if (error) throw new Error(error.message);
  const verifyUrl = `${site()}/verify/${cert_no}?k=${shortKey(verify_hash)}`;
  try {
    const pdf = await renderPdf({ learner_name: prof!.full_name, level_title: lv!.title_en, cohort_name: cohort, session_count: facts.sessionsTotal, band: ev.band, cert_no, issued_on, verify_url: verifyUrl });
    const path = `${userId}/${cert_no}.pdf`;
    await admin.storage.createBucket(BUCKET, { public: false }).catch(() => undefined);
    const up = await admin.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (!up.error) await admin.from("certificates").update({ pdf_storage_path: path }).eq("id", row.id);
  } catch (e) { console.error("[cert] pdf render/upload failed:", (e as Error).message); }
  await admin.rpc("log_audit", { p_actor: null, p_action: "certificate.issue", p_target_type: "certificates", p_target_id: row.id, p_before: null, p_after: { user_id: userId, level, cert_no, band: ev.band } });
  const { data: u } = await admin.auth.admin.getUserById(userId);
  if (u?.user?.email) sendCertificateEmail(u.user.email, prof!.full_name, lv!.title_en, cert_no, `${site()}/learn/certificate`).catch(() => undefined);
  return row;
}

export async function renderPdf(data: Record<string, unknown>): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "cert-"));
  const out = join(dir, "cert.pdf");
  try { await exec("python3", [join(CERT_DIR, "build_cert.py"), JSON.stringify(data), out], { timeout: 60_000 }); return await readFile(out); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

/** Sweep: try issuing for every active student in a level. Used by the admin "check now" button and after scoring events. */
export async function sweepLevel(level: LevelSlug) {
  const admin = createAdminClient();
  const { data: students } = await admin.from("profiles").select("id").eq("role", "student").eq("status", "active");
  let issued = 0;
  for (const s of students ?? []) { const r = await maybeIssue(s.id, level).catch(() => null); if (r) issued++; }
  void LEVELS; void EXAMS;
  return issued;
}
