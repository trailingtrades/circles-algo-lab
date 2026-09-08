/**
 * Seeds course content from /content/*.json into Postgres (local or Supabase via DATABASE_URL).
 * Idempotent: upserts by natural keys (level slug, week number, session number). Quiz banks are replaced per session.
 *   DATABASE_URL=postgresql://... npx tsx scripts/seed.ts
 */
import { Client } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const C = join(__dirname, "..", "..", "..", "content");
const J = (f: string) => JSON.parse(readFileSync(join(C, f), "utf8"));

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5499/learn_test" });
  await db.connect(); await db.query("begin");
  const levelId: Record<string, string> = {}; const weekId: Record<string, string> = {}; const sessionId: Record<number, string> = {};
  for (const l of J("levels.json")) {
    const r = await db.query(`insert into levels (slug,title_en,title_hi,sequence,unlock_rule) values ($1,$2,$3,$4,$5)
      on conflict (slug) do update set title_en=excluded.title_en, title_hi=excluded.title_hi, sequence=excluded.sequence, unlock_rule=excluded.unlock_rule returning id`, [l.slug, l.title_en, l.title_hi, l.sequence, l.unlock_rule]);
    levelId[l.slug] = r.rows[0].id;
  }
  for (const w of J("weeks.json")) {
    const r = await db.query(`insert into weeks (level_id,number,title_en,title_hi,theme_accent) values ($1,$2,$3,$4,$5)
      on conflict (level_id,number) do update set title_en=excluded.title_en, title_hi=excluded.title_hi, theme_accent=excluded.theme_accent returning id`, [levelId[w.level], w.number, w.title_en, w.title_hi, w.theme_accent]);
    weekId[`${w.level}-${w.number}`] = r.rows[0].id;
  }
  let n = 0;
  for (const lv of ["foundation", "intermediate", "advanced"]) for (const s of J(`sessions/${lv}.json`)) {
    const r = await db.query(`insert into sessions (week_id,day,number,title_en,title_hi,core_concept,ai_lab,psychology,duration_min,video_url,video_provider,is_published,is_draft,summary_hi,prompts)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      on conflict (number) do update set week_id=excluded.week_id, day=excluded.day, title_en=excluded.title_en, title_hi=excluded.title_hi, core_concept=excluded.core_concept, ai_lab=excluded.ai_lab, psychology=excluded.psychology, duration_min=excluded.duration_min, video_url=coalesce(sessions.video_url, excluded.video_url), video_provider=excluded.video_provider, is_published=excluded.is_published, is_draft=excluded.is_draft, summary_hi=excluded.summary_hi, prompts=excluded.prompts returning id`,
      [weekId[`${s.level}-${s.week}`], s.day, s.number, s.title_en, s.title_hi, s.core_concept, s.ai_lab, s.psychology, s.duration_min, s.video_url, s.video_provider, s.is_published, s.draft, s.summary_hi, JSON.stringify(s.prompts)]);
    sessionId[s.number] = r.rows[0].id; n++;
  }
  await db.query("delete from resources where storage_path is null or external_url is not null");
  for (const r of J("resources.json")) {
    const isLink = r.kind === "link";
    await db.query(`insert into resources (session_id,week_id,level_id,kind,storage_path,external_url,file_name,note) values (null,$1,$2,$3,null,$4,$5,$6)`,
      [r.week ? weekId[`${r.level}-${r.week}`] : null, r.week ? null : (r.level ? levelId[r.level] : null), r.kind, isLink ? r.storage_path : null, r.file_name, r.note]);
  }
  for (const e of J("exams.json")) {
    await db.query(`insert into exams (level_id,week_id,title,total_marks,pass_marks,distinction_marks,time_limit_min,attempts_allowed)
      select $1,$2,$3,$4,$5,$6,$7,$8 where not exists (select 1 from exams where level_id=$1 and week_id is not distinct from $2)`,
      [levelId[e.level], e.week ? weekId[`${e.level}-${e.week}`] : null, e.title, e.total_marks, e.pass_marks, e.distinction_marks, e.time_limit_min, e.attempts_allowed]);
  }
  let q = 0;
  for (const bank of J("quizzes/foundation-w1.json")) {
    await db.query("delete from quiz_questions where session_id=$1", [sessionId[bank.session]]);
    for (const [i, qq] of bank.questions.entries()) {
      await db.query(`insert into quiz_questions (session_id,stem_en,stem_hi,options,correct_index,explanation_en,explanation_hi,marks,difficulty,sequence) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [sessionId[bank.session], qq.stem_en, qq.stem_hi, JSON.stringify(qq.options), qq.correct_index, qq.explanation_en, qq.explanation_hi, qq.marks, qq.difficulty, i]); q++;
    }
  }
  await db.query("commit"); await db.end();
  console.log(`seeded: ${Object.keys(levelId).length} levels, ${Object.keys(weekId).length} weeks, ${n} sessions, ${q} quiz questions`);
}
main().catch(e => { console.error(e); process.exit(1); });
