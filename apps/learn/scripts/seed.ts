/**
 * Seeds course content from /content/*.json into Postgres (local, or Supabase via DATABASE_URL). Needs migrations through 0010.
 * Idempotent. Levels, weeks, sessions and exams are upserts on their natural keys (level slug · level+week · session number ·
 * level+week, or level for the final); resources are replaced. Each quiz / exam bank is replaced in its own transaction with
 * sequence 0..n-1, so a bank is always wholly old or wholly new. Every bank is validated before anything is written.
 * Quiz options go to the DB as words only ({en, hi, dv?}): the answer lives in correct_index, which students cannot read.
 * The Devanagari (*_dv) fields are optional; when content has none, an existing DB value is kept.
 *   DATABASE_URL=postgresql://... npx tsx scripts/seed.ts
 */
import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const C = join(__dirname, "..", "..", "..", "content");
const J = (f: string) => JSON.parse(readFileSync(join(C, f), "utf8"));

type Opt = { en: string; hi: string; dv?: string | null; distractor?: boolean; correct?: boolean };
type Q = { stem_en: string; stem_hi: string; stem_dv?: string | null; options: Opt[]; correct_index: number; explanation_en?: string; explanation_hi?: string; explanation_dv?: string | null; marks?: number; difficulty?: number };
type Bank = { label: string; col: "session_id" | "exam_id"; key: string; questions: Q[] };
const dv = (x: unknown) => (typeof x === "string" && x.trim() ? x : null);
/** Words only: the legacy `distractor` / v3 `correct` flag would hand the answer to anyone who can read `options`. */
const words = (o: Opt) => (dv(o.dv) ? { en: o.en, hi: o.hi, dv: o.dv } : { en: o.en, hi: o.hi });
/** Refuse a question whose key is out of range or disagrees with its own option flags (e.g. shuffled without moving correct_index). */
function checkQuestion(q: Q, where: string) {
  if (!q.stem_en || !q.stem_hi || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) throw new Error(`${where}: needs stem_en, stem_hi and 2-6 options`);
  if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index >= q.options.length) throw new Error(`${where}: correct_index ${q.correct_index} out of range`);
  if (q.options.some((o) => "distractor" in o || "correct" in o)) {
    const right = q.options.flatMap((o, i) => (o.correct === true || o.distractor === false ? [i] : []));
    if (right.length !== 1 || right[0] !== q.correct_index) throw new Error(`${where}: correct_index ${q.correct_index} does not match the option flags (${right.join(",") || "none"})`);
  }
}
const examKey = (level: string, week: number | null) => `${level}-${week ? `w${week}` : "final"}`;

async function main() {
  // ---- load + validate everything before the first write ----
  const levels = J("levels.json"), weeks = J("weeks.json"), resources = J("resources.json"), exams = J("exams.json");
  const sessions = ["foundation", "intermediate", "advanced"].flatMap((lv) => J(`sessions/${lv}.json`));
  const numbers = new Set<number>(sessions.map((s: { number: number }) => s.number));
  const banks: Bank[] = [];
  for (const b of J("quizzes/foundation.json") as { session: number; questions: Q[] }[]) {
    if (!numbers.has(b.session)) throw new Error(`quiz bank for session ${b.session}: no such session in content/sessions`);
    banks.push({ label: `Session ${b.session} quiz`, col: "session_id", key: String(b.session), questions: b.questions });
  }
  for (const f of readdirSync(join(C, "exams")).filter((x) => x.endsWith(".json")).sort())
    for (const b of J(`exams/${f}`) as { level: string; week: number | null; questions: Q[] }[])
      banks.push({ label: `Exam ${examKey(b.level, b.week)}`, col: "exam_id", key: examKey(b.level, b.week), questions: b.questions });
  for (const b of banks) b.questions.forEach((q, i) => checkQuestion(q, `${b.label} Q${i + 1}`));

  const db = new Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5499/learn_test" });
  await db.connect();
  const levelId: Record<string, string> = {}, weekId: Record<string, string> = {}, sessionId: Record<string, string> = {}, examId: Record<string, string> = {};
  const wk = (level: string, n: number | null | undefined, what: string) => {
    if (!n) return null;
    const id = weekId[`${level}-${n}`]; if (!id) throw new Error(`${what}: ${level} week ${n} is not in content/weeks.json`);
    return id;
  };
  let urls = 0;
  try {
    // ---- 1. structure, resources, exams: one transaction ----
    await db.query("begin");
    for (const l of levels) {
      const r = await db.query(`insert into levels (slug,title_en,title_hi,title_dv,sequence,unlock_rule,subtitle_en,subtitle_hi,subtitle_dv) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        on conflict (slug) do update set title_en=excluded.title_en, title_hi=excluded.title_hi, title_dv=coalesce(excluded.title_dv, levels.title_dv), sequence=excluded.sequence,
          unlock_rule=excluded.unlock_rule, subtitle_en=excluded.subtitle_en, subtitle_hi=excluded.subtitle_hi, subtitle_dv=coalesce(excluded.subtitle_dv, levels.subtitle_dv) returning id`,
        [l.slug, l.title_en, l.title_hi, dv(l.title_dv), l.sequence, l.unlock_rule, l.subtitle_en ?? "", l.subtitle_hi ?? "", dv(l.subtitle_dv)]);
      levelId[l.slug] = r.rows[0].id;
    }
    for (const w of weeks) {
      if (!levelId[w.level]) throw new Error(`weeks.json: unknown level ${w.level}`);
      const r = await db.query(`insert into weeks (level_id,number,title_en,title_hi,title_dv,theme_accent) values ($1,$2,$3,$4,$5,$6)
        on conflict (level_id,number) do update set title_en=excluded.title_en, title_hi=excluded.title_hi, title_dv=coalesce(excluded.title_dv, weeks.title_dv), theme_accent=excluded.theme_accent returning id`,
        [levelId[w.level], w.number, w.title_en, w.title_hi, dv(w.title_dv), w.theme_accent]);
      weekId[`${w.level}-${w.number}`] = r.rows[0].id;
    }
    // Admin edits to these columns are overwritten (content JSON is the source of truth); video_url is the one field kept.
    for (const s of sessions) {
      const r = await db.query(`insert into sessions (week_id,day,number,title_en,title_hi,title_dv,core_concept,ai_lab,psychology,duration_min,video_url,video_provider,is_published,is_draft,summary_hi,prompts,strategy,course_day,content)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        on conflict (number) do update set week_id=excluded.week_id, day=excluded.day, title_en=excluded.title_en, title_hi=excluded.title_hi, title_dv=coalesce(excluded.title_dv, sessions.title_dv),
          core_concept=excluded.core_concept, ai_lab=excluded.ai_lab, psychology=excluded.psychology, duration_min=excluded.duration_min, video_url=coalesce(sessions.video_url, excluded.video_url),
          video_provider=excluded.video_provider, is_published=excluded.is_published, is_draft=excluded.is_draft, summary_hi=excluded.summary_hi, prompts=excluded.prompts, strategy=excluded.strategy,
          course_day=excluded.course_day, content=excluded.content returning id`,
        [wk(s.level, s.week, `session ${s.number}`), s.day, s.number, s.title_en, s.title_hi, dv(s.title_dv), s.core_concept, s.ai_lab, s.psychology, s.duration_min, s.video_url, s.video_provider,
          s.is_published, s.draft, s.summary_hi, JSON.stringify(s.prompts), s.strategy ?? null, s.course_day ?? null, JSON.stringify(s.content ?? {})]);
      sessionId[String(s.number)] = r.rows[0].id;
    }
    // Resources have no natural key: remove what the seed wrote before (any row with a URL, no file, or a content file name), then insert.
    // Drive / web links go to external_url for every kind; a bare Storage object path would go to storage_path.
    await db.query("delete from resources where storage_path is null or external_url is not null or file_name = any($1)", [resources.map((r: { file_name: string }) => r.file_name)]);
    for (const r of resources) {
      const url: string | null = r.storage_path ?? null, web = !!url && /^https?:\/\//i.test(url);
      if (url) urls++;
      await db.query(`insert into resources (session_id,week_id,level_id,kind,storage_path,external_url,file_name,note) values (null,$1,$2,$3,$4,$5,$6,$7)`,
        [wk(r.level, r.week, r.file_name), r.week ? null : (r.level ? levelId[r.level] : null), r.kind, url && !web ? url : null, web ? url : null, r.file_name, r.note]);
    }
    for (const e of exams) {
      const target = e.week ? "(level_id, week_id) where week_id is not null" : "(level_id) where week_id is null";   // unique keys from migration 0010
      const r = await db.query(`insert into exams (level_id,week_id,title,title_hi,title_dv,total_marks,pass_marks,distinction_marks,time_limit_min,attempts_allowed) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict ${target} do update set title=excluded.title, title_hi=excluded.title_hi, title_dv=coalesce(excluded.title_dv, exams.title_dv), total_marks=excluded.total_marks,
          pass_marks=excluded.pass_marks, distinction_marks=excluded.distinction_marks, time_limit_min=excluded.time_limit_min, attempts_allowed=excluded.attempts_allowed returning id`,
        [levelId[e.level], wk(e.level, e.week, e.title), e.title, e.title_hi ?? null, dv(e.title_dv), e.total_marks, e.pass_marks, e.distinction_marks, e.time_limit_min, e.attempts_allowed]);
      examId[examKey(e.level, e.week)] = r.rows[0].id;
    }
    await db.query("commit");
  } catch (e) {
    await db.query("rollback").catch(() => undefined); await db.end();
    throw new Error(`structure not seeded (rolled back, nothing changed): ${(e as Error).message}`);
  }

  // ---- 2. banks: one transaction each ----
  const done: string[] = [], skipped: string[] = []; let quizQ = 0, examQ = 0;
  const pos = [0, 0, 0, 0, 0, 0];
  for (const b of banks) {
    const owner = b.col === "session_id" ? sessionId[b.key] : examId[b.key];
    if (!owner) { skipped.push(`${b.label} (no exam row in exams.json)`); continue; }
    const rows = b.questions.map((q, i) => ({ stem_en: q.stem_en, stem_hi: q.stem_hi, stem_dv: dv(q.stem_dv), options: q.options.map(words), correct_index: q.correct_index,
      explanation_en: q.explanation_en ?? "", explanation_hi: q.explanation_hi ?? "", explanation_dv: dv(q.explanation_dv), marks: q.marks ?? 1, difficulty: q.difficulty ?? 1, seq: i }));
    try {
      await db.query("begin");
      await db.query(`delete from quiz_questions where ${b.col}=$1`, [owner]);
      await db.query(`insert into quiz_questions (${b.col},stem_en,stem_hi,stem_dv,options,correct_index,explanation_en,explanation_hi,explanation_dv,marks,difficulty,sequence)
        select $1, x.stem_en, x.stem_hi, x.stem_dv, x.options, x.correct_index, x.explanation_en, x.explanation_hi, x.explanation_dv, x.marks, x.difficulty, x.seq
          from jsonb_to_recordset($2::jsonb) as x(stem_en text, stem_hi text, stem_dv text, options jsonb, correct_index smallint, explanation_en text, explanation_hi text, explanation_dv text, marks smallint, difficulty smallint, seq smallint)`,
        [owner, JSON.stringify(rows)]);
      await db.query("commit");
    } catch (e) {
      await db.query("rollback").catch(() => undefined); await db.end();
      throw new Error(`${b.label} not replaced (rolled back; ${done.length} banks before it were saved): ${(e as Error).message}`);
    }
    done.push(b.label);
    if (b.col === "session_id") quizQ += rows.length; else examQ += rows.length;
    for (const q of rows) pos[q.correct_index]++;
  }
  await db.end();

  // ---- 3. summary ----
  const has = (xs: Record<string, unknown>[], k: string) => `${xs.filter((x) => dv(x[k])).length}/${xs.length}`;
  const allQ = banks.flatMap((b) => b.questions) as unknown as Record<string, unknown>[];
  console.log([
    "seed complete",
    `  structure : ${levels.length} levels, ${weeks.length} weeks, ${sessions.length} sessions (${sessions.filter((s: { is_published: boolean }) => s.is_published).length} published)`,
    `  exams     : ${Object.keys(examId).length} (upserted: marks, pass/distinction, time limit, attempts)`,
    `  resources : ${resources.length} (${urls} with a URL)`,
    `  banks     : ${done.filter((x) => x.startsWith("Session")).length} quiz banks / ${quizQ} questions, ${done.filter((x) => x.startsWith("Exam")).length} exam banks / ${examQ} questions`,
    `  answers   : A ${pos[0]} · B ${pos[1]} · C ${pos[2]} · D ${pos[3]}${pos[4] + pos[5] ? ` · E/F ${pos[4] + pos[5]}` : ""}`,
    `  Hindi (dv): level titles ${has(levels, "title_dv")}, week titles ${has(weeks, "title_dv")}, session titles ${has(sessions, "title_dv")}, question stems ${has(allQ, "stem_dv")}`,
    ...skipped.map((s) => `  skipped   : ${s}`),
  ].join("\n"));
}
main().catch((e) => { console.error(`seed FAILED: ${(e as Error).message}`); process.exit(1); });
