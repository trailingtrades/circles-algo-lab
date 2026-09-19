"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanText, scanJson } from "@/lib/compliance/scan";
import { youtubeEmbed } from "@/lib/content/course";
import { VISUAL_KINDS } from "@/lib/content/visuals";
import { isUuid } from "@/components/admin/format";
export type EditState = { error?: string; ok?: string };

async function audit(actor: string, action: string, type: string, id: string | null, before: unknown, after: unknown) {
  const { error } = await createAdminClient().rpc("log_audit", { p_actor: actor, p_action: action, p_target_type: type, p_target_id: id, p_before: before ?? null, p_after: after ?? null });
  if (error) console.error(`[audit] ${action} not logged:`, error.message);
}
/** Only the columns a save touched, so the audit row stays readable (a lesson's content JSON is large). */
const subset = (row: Record<string, unknown> | null, keys: string[]) => (row ? Object.fromEntries(keys.map((k) => [k, row[k] ?? null])) : null);
const blocked = (issues: string[]) => ({ error: `Compliance scan blocked the save: ${issues.slice(0, 4).join(" | ")}${issues.length > 4 ? ` (+${issues.length - 4} more)` : ""}` });

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
/** Text = plain string (legacy) or {en, hi, dv?}. */
const isText = (x: unknown) => typeof x === "string" || (isObj(x) && typeof x.en === "string" && typeof x.hi === "string" && (x.dv === undefined || x.dv === null || typeof x.dv === "string"));
const arr = (x: unknown): unknown[] | null => (Array.isArray(x) ? x : null);

/** Same guards the <Visual> renderer uses: a visual that fails them would silently not draw. */
function visualProblem(v: unknown): string | null {
  if (!isObj(v) || !VISUAL_KINDS.includes(v.kind as never)) return `unknown kind (use one of ${VISUAL_KINDS.join(", ")})`;
  const ok: Record<string, () => boolean> = {
    flow: () => !!arr(v.nodes)?.length, steps: () => !!arr(v.items)?.length, compare: () => !!arr(v.cols)?.length,
    calc: () => !!arr(v.rows) && isObj(v.result), bars: () => !!arr(v.items)?.length,
    line: () => !!arr(v.series)?.length && arr(v.series)!.every((s) => isObj(s) && !!arr(s.points)?.length),
    candles: () => !!arr(v.bars)?.length, mindmap: () => !!arr(v.branches)?.length && v.center != null, story: () => !!arr(v.panels)?.length,
  };
  return ok[v.kind as string]() ? null : `${v.kind as string} is missing its data (see docs/SMART_CONTENT_SCHEMA.md)`;
}

/** Structural check of sessions.content (v2, see lib/content/session-v2.ts). Returns human-readable problems. */
function contentProblems(c: unknown): string[] {
  if (!isObj(c)) return ["must be a JSON object"];
  const p: string[] = [];
  const topics = arr(c.topics);
  if (!topics?.length) p.push("topics: at least one topic");
  else topics.forEach((t, i) => {
    if (!isObj(t) || !isText(t.h) || !isText(t.p)) { p.push(`topics[${i}]: needs h and p`); return; }
    for (const k of ["example", "remember"]) if (t[k] != null && !isText(t[k])) p.push(`topics[${i}].${k}: text or {en, hi, dv}`);
    if (t.visual != null) { const e = visualProblem(t.visual); if (e) p.push(`topics[${i}].visual: ${e}`); }
  });
  for (const k of ["kaam", "outcome", "journal_prompt"]) if (!isText(c[k])) p.push(`${k}: required, text or {en, hi, dv}`);
  for (const k of ["fun", "motivation"]) if (c[k] != null && !isText(c[k])) p.push(`${k}: text, {en, hi, dv} or null`);
  if (c.compliance != null && typeof c.compliance !== "string") p.push("compliance: an English string or null");
  if (!arr(c.tools)?.every(isText)) p.push("tools: an array of text");
  if (c.kaam_steps != null && !arr(c.kaam_steps)?.every(isText)) p.push("kaam_steps: an array of text");
  if (c.kaam_min != null && !(typeof c.kaam_min === "number" && c.kaam_min > 0 && c.kaam_min <= 240)) p.push("kaam_min: minutes, 1 to 240");
  if (c.key_terms != null && !arr(c.key_terms)?.every((k) => isObj(k) && isText(k.term) && isText(k.meaning))) p.push("key_terms: [{term, meaning}]");
  if (c.story != null) { const e = isObj(c.story) && c.story.kind === "story" ? visualProblem(c.story) : "needs kind \"story\""; if (e) p.push(`story: ${e}`); }
  if (c.mindmap != null) { const e = isObj(c.mindmap) && c.mindmap.kind === "mindmap" ? visualProblem(c.mindmap) : "needs kind \"mindmap\""; if (e) p.push(`mindmap: ${e}`); }
  if (c.tags != null && !(isObj(c.tags) && Object.values(c.tags).every((x) => x == null || isText(x)))) p.push("tags: {concept, ai_lab, psychology} as text");
  return p;
}

const ROMAN_FIELDS = ["title_en", "title_hi", "core_concept", "ai_lab", "psychology", "strategy", "summary_hi"];

/** Session editor: titles in three languages, tags, strategy, video, prompts, the lesson body (sessions.content, v2 JSON) and
 *  publish/draft flags. Every save is validated, compliance-scanned (the lesson body too) and audited. */
export async function saveSession(_: EditState, form: FormData): Promise<EditState> {
  const v = await requireViewer(["admin"]);
  const n = Number(form.get("number")); const g = (k: string) => String(form.get(k) ?? "").trim();
  if (!Number.isInteger(n) || n < 1) return { error: "Bad session number." };
  const title_en = g("title_en"); if (!title_en) return { error: "The English title is required." };
  const duration_min = Number(g("duration_min") || 60);
  if (!Number.isInteger(duration_min) || duration_min < 5 || duration_min > 600) return { error: "Duration: whole minutes, 5 to 600." };
  const video_url = g("video_url") || null;
  if (video_url && !youtubeEmbed(video_url)) return { error: "Video URL: use a YouTube watch (youtube.com/watch?v=), youtu.be or embed link. Shorts and Live links do not play here." };
  let prompts: unknown;
  try { prompts = JSON.parse(g("prompts") || "[]"); } catch (e) { return { error: `Prompts: not valid JSON (${(e as Error).message}).` }; }
  if (!Array.isArray(prompts) || !prompts.every((p) => isObj(p) && isText(p.title) && typeof p.body === "string")) return { error: "Prompts must be a JSON array of {title, level, platform, body}." };

  const admin = createAdminClient();
  const { data: before } = await admin.from("sessions").select("*").eq("number", n).maybeSingle();
  if (!before) return { error: "This session is not in the database yet (run the seed)." };
  const patch: Obj = { title_en, title_hi: g("title_hi") || title_en, core_concept: g("core_concept"), ai_lab: g("ai_lab"), psychology: g("psychology"), strategy: g("strategy") || null, summary_hi: g("summary_hi"), video_url, duration_min, is_published: form.get("is_published") === "on", is_draft: form.get("is_draft") === "on", prompts };

  // Lesson body: blank keeps what is stored; an unchanged body is not re-validated, so a title fix never trips on it.
  const rawContent = g("content");
  if (rawContent) {
    let content: unknown;
    try { content = JSON.parse(rawContent); } catch (e) { return { error: `Lesson content: not valid JSON (${(e as Error).message}).` }; }
    if (JSON.stringify(content) !== JSON.stringify(before.content ?? null)) {
      const probs = contentProblems(content);
      if (probs.length) return { error: `Lesson content: ${probs.slice(0, 4).join("; ")}${probs.length > 4 ? ` (+${probs.length - 4} more)` : ""}` };
      patch.content = content;
    }
  }
  // हिंदी title: the title_dv column arrives with migration 0010.
  const title_dv = g("title_dv");
  if ("title_dv" in before) patch.title_dv = title_dv || null; else if (title_dv) return { error: "The Hindi title needs migration 0010 applied first." };

  const issues = [
    ...ROMAN_FIELDS.flatMap((k) => (typeof patch[k] === "string" ? scanText(patch[k] as string, { romanOnly: true }).map((i) => `${k}: ${i}`) : [])),
    ...scanText(title_dv).map((i) => `title_dv: ${i}`),
    ...scanJson(prompts).map((i) => `prompts: ${i}`),
    ...("content" in patch ? scanJson(patch.content).map((i) => `content: ${i}`) : []),
  ];
  if (issues.length) return blocked(issues);
  const { error } = await admin.from("sessions").update(patch).eq("id", before.id);
  if (error) return { error: error.message };
  await audit(v.id, "content.session.update", "sessions", before.id, subset(before, Object.keys(patch)), patch);
  revalidatePath(`/learn/session/${n}`); revalidatePath(`/learn/admin/content/${n}`); revalidatePath("/learn/admin/content"); revalidatePath("/learn/path"); revalidatePath("/learn/home");
  return { ok: "Saved. Learners see it now." };
}

type Option = { en: string; hi: string; dv?: string };
const Q_TEXT = ["stem_en", "stem_hi", "explanation_en", "explanation_hi"] as const;

/** Question editor. Options are stored as {en, hi, dv?} only: which one is right lives in correct_index, a column students
 *  cannot read (a per-option flag inside `options` leaked the answer). New questions go to the end of the list. */
export async function saveQuestion(_: EditState, form: FormData): Promise<EditState> {
  const v = await requireViewer(["admin"]);
  const g = (k: string) => String(form.get(k) ?? "").trim();
  const id = g("id") || null; const sessionN = Number(g("session_number"));
  if ((id && !isUuid(id)) || !Number.isInteger(sessionN)) return { error: "Bad request." };
  const pick = Number(g("correct")); const options: Option[] = []; let correct = -1;
  for (let i = 0; i < 6; i++) {
    const en = g(`opt_en_${i}`), hi = g(`opt_hi_${i}`), dv = g(`opt_dv_${i}`);
    if (!en && !hi && !dv) continue;
    if (!en) return { error: `Option ${i + 1}: the English text is required.` };
    if (i === pick) correct = options.length;
    options.push(dv ? { en, hi: hi || en, dv } : { en, hi: hi || en });
  }
  if (options.length < 2) return { error: "Give at least 2 options." };
  if (correct < 0) return { error: "Mark which option is correct." };
  const stem_en = g("stem_en"); if (!stem_en) return { error: "The English question text is required." };
  const marks = Number(g("marks") || 1), difficulty = Number(g("difficulty") || 1);
  if (!Number.isInteger(marks) || marks < 1 || marks > 10) return { error: "Marks: a whole number, 1 to 10." };
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) return { error: "Difficulty: 1, 2 or 3." };
  const q: Obj = { stem_en, stem_hi: g("stem_hi") || stem_en, options, correct_index: correct, explanation_en: g("explanation_en"), explanation_hi: g("explanation_hi") || g("explanation_en"), marks, difficulty };
  const dvCols = { stem_dv: g("stem_dv") || null, explanation_dv: g("explanation_dv") || null };

  // A question that quotes scam wording as a labelled example skips the phrase check; a wrong option may quote it too (context, as in CI).
  const scam = form.get("scam_example") === "on";
  const issues = [
    ...Q_TEXT.flatMap((k) => scanText(String(q[k]), { allowScamExample: scam, romanOnly: true }).map((i) => `${k}: ${i}`)),
    ...(["stem_dv", "explanation_dv"] as const).flatMap((k) => scanText(dvCols[k] ?? "", { allowScamExample: scam }).map((i) => `${k}: ${i}`)),
    ...options.flatMap((o, i) => (["en", "hi", "dv"] as const).flatMap((l) => (o[l] ? scanText(o[l]!, { allowScamExample: scam || i !== correct, romanOnly: l !== "dv" }).map((x) => `option ${i + 1} (${l}): ${x}`) : []))),
  ];
  if (issues.length) return blocked(issues);

  const admin = createAdminClient();
  const { data: s } = await admin.from("sessions").select("id").eq("number", sessionN).maybeSingle(); if (!s) return { error: "Session not found." };
  const { data: before } = id ? await admin.from("quiz_questions").select("*").eq("id", id).eq("session_id", s.id).maybeSingle() : { data: null };
  if (id && !before) return { error: "Question not found." };
  // Position: grading pairs the i-th question shown with the i-th answer-key row, so two questions must never share one.
  let sequence: number;
  if (g("sequence") === "") {
    const { data: last } = await admin.from("quiz_questions").select("sequence").eq("session_id", s.id).order("sequence", { ascending: false }).limit(1).maybeSingle();
    sequence = before ? Number(before.sequence) : last ? Number(last.sequence) + 1 : 0;
  } else sequence = Number(g("sequence"));
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 999) return { error: "Position: a whole number from 0." };
  let clashQ = admin.from("quiz_questions").select("id").eq("session_id", s.id).eq("sequence", sequence);
  if (id) clashQ = clashQ.neq("id", id);
  const { data: clash } = await clashQ.limit(1);
  if (clash?.length) return { error: `Another question already uses position ${sequence}. Pick a free position.` };
  q.sequence = sequence;
  // stem_dv / explanation_dv arrive with migration 0010; option dv text lives inside `options` and needs no migration.
  const hasDv = before ? "stem_dv" in before : !(await admin.from("quiz_questions").select("stem_dv").limit(1)).error;
  if (hasDv) Object.assign(q, dvCols); else if (dvCols.stem_dv || dvCols.explanation_dv) return { error: "Hindi question text needs migration 0010 applied first." };

  const { data: row, error } = id ? await admin.from("quiz_questions").update(q).eq("id", id).select("id").single() : await admin.from("quiz_questions").insert({ ...q, session_id: s.id }).select("id").single();
  if (error) return { error: error.code === "23505" ? `Position ${sequence} is already taken.` : error.message };
  await audit(v.id, id ? "content.question.update" : "content.question.create", "quiz_questions", row.id, subset(before, Object.keys(q)), q);
  revalidatePath(`/learn/admin/content/${sessionN}`); revalidatePath(`/learn/session/${sessionN}`);
  return { ok: id ? "Question saved." : "Question added." };
}

export async function deleteQuestion(_: EditState, form: FormData): Promise<EditState> {
  const v = await requireViewer(["admin"]);
  const id = String(form.get("id") ?? ""); const sessionN = Number(form.get("session_number"));
  if (!isUuid(id)) return { error: "Bad request." };
  const admin = createAdminClient();
  const { data: before } = await admin.from("quiz_questions").select("*").eq("id", id).maybeSingle();
  if (!before) return { error: "Question not found." };
  const { error } = await admin.from("quiz_questions").delete().eq("id", id);
  if (error) return { error: error.message };
  await audit(v.id, "content.question.delete", "quiz_questions", id, before, null);
  revalidatePath(`/learn/admin/content/${sessionN}`); revalidatePath(`/learn/session/${sessionN}`);
  return { ok: "Deleted." };
}
