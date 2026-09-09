/**
 * Demo cohort seed (Phase 6, decision Q1-A). Fake names, fake emails (@example.invalid), one admin, one mentor, 12 students
 * with varied progress so every screen has data. Safe to delete: `delete from cohorts where name like 'DEMO-%'` cascades.
 *   DATABASE_URL=... npx tsx scripts/seed-demo.ts      (local Postgres with the auth shim; on Supabase use the admin API to create auth users first)
 */
import { Client } from "pg";
const NAMES = ["Priya Sharma", "Arjun Mehta", "Neha Kulkarni", "Rohan Verma", "Sneha Iyer", "Kabir Singh", "Ananya Das", "Vikram Nair", "Ishita Bose", "Aditya Rao", "Meera Pillai", "Saurabh Jain"];
async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5499/learn_test" }); await db.connect();
  await db.query("begin");
  await db.query("delete from cohorts where name like 'DEMO-%'");
  const uid = (i: number) => `d0000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
  const mk = async (i: number, email: string, name: string) => { await db.query("insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,$3) on conflict (id) do update set email=excluded.email", [uid(i), email, { full_name: name }]); await db.query("update profiles set full_name=$2 where id=$1", [uid(i), name]); };
  await mk(1, "admin@example.invalid", "Rahul Sarawgi"); await db.query("update profiles set role='admin', status='active' where id=$1", [uid(1)]);
  await mk(2, "mentor@example.invalid", "Abhishek Mentor"); await db.query("update profiles set role='mentor', status='active' where id=$1", [uid(2)]);
  const cohort = (await db.query("insert into cohorts (name, level, starts_on, mentor_id) values ('DEMO-Foundation-Oct-2026','foundation','2026-10-01',$1) returning id", [uid(2)])).rows[0].id;
  const lvl = (await db.query("select id from levels where slug='foundation'")).rows[0].id;
  const sessions = (await db.query("select id, number, day from sessions where number <= 20 order by number")).rows;
  for (let i = 0; i < NAMES.length; i++) {
    const id = uid(10 + i); await mk(10 + i, `student${i + 1}@example.invalid`, NAMES[i]);
    await db.query("update profiles set status='active', cohort_id=$2, joined_at=now() where id=$1", [id, cohort]);
    const done = Math.min(20, Math.floor((i + 1) * 1.6));           // 1..20 sessions complete
    for (const s of sessions.slice(0, done)) {
      await db.query("insert into session_progress (user_id, session_id, status, watched_pct, handout_opened, completed_at) values ($1,$2,'complete',100,true,now() - interval '1 day' * $3)", [id, s.id, 20 - s.number]);
      await db.query("insert into attempts (user_id, session_id, answers, submitted_at, attempt_no) values ($1,$2,'{}',now(),1)", [id, s.id]);
      await db.query("update attempts set score=$3, max_score=3, passed=true where user_id=$1 and session_id=$2", [id, s.id, 2 + (i % 2)]);
      await db.query("insert into journal_entries (user_id, session_id, kind, body, created_at) values ($1,$2,$3,'Demo entry: ek Fact, ek Guess, ek Kachra.', now() - interval '1 day' * $4)", [id, s.id, s.day === 5 ? "friday_review" : "reflection", 20 - s.number]);
      await db.query("select app.award($1,$2,'attendance',10,'session_complete',$3,'video 80%+ and handout opened')", [id, lvl, s.id]);
      await db.query("select app.award($1,$2,'quiz',$4,'session_quiz',$3,'quiz')", [id, lvl, s.id, (2 + (i % 2)) / 3 * 10]);
      if (s.day === 5) await db.query("select app.award($1,$2,'discipline',10,'friday_on_time',$3,'friday review')", [id, lvl, s.id]);
    }
    if (i % 3 === 0) await db.query("insert into portfolio_rows (user_id, symbol, full_why, full_why_2, top_risk, risk_answer, price_stop, why_stop, review_point) values ($1,'DEMOCO','Demo business reason one.','Independent reason two.','Demand slowdown','Order book covers 18 months',100,'Thesis breaks if margins fall two quarters','Review after Q2 results')", [id]);
  }
  await db.query("commit"); await db.end();
  console.log(`demo cohort seeded: 1 admin, 1 mentor, ${NAMES.length} students (all @example.invalid)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
