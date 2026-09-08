/** Scoring engine + leaderboard proof (Phase 4 gate). Deterministic recompute from score_events alone; §10 rules. */
import { Client } from "pg";
const db = new Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5499/learn_test" });
let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d = "") => { if (c) pass++; else fail++; console.log(`${c ? "  ok  " : "  FAIL"} ${n} ${c ? "" : d}`); };
async function as(uid: string, fn: () => Promise<void>) { await db.query("begin"); try { await db.query("set local role authenticated"); await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: uid, role: "authenticated" })]); await fn(); } finally { await db.query("rollback"); } }

async function main() {
  await db.connect();
  await db.query("truncate audit_log, certificates, scores, score_events, practice_grades, level_unlocks, portfolio_rows, journal_entries, session_progress, attempts, invites, profiles, cohorts, auth.users cascade");
  const U = (i: number) => `00000000-0000-0000-0000-0000000000${String(i).padStart(2, "0")}`;
  const cohort = (await db.query("insert into cohorts (name, level, starts_on) values ('C1','foundation','2026-10-01') returning id")).rows[0].id;
  const other = (await db.query("insert into cohorts (name, level, starts_on) values ('C2','foundation','2026-10-01') returning id")).rows[0].id;
  for (let i = 1; i <= 14; i++) { await db.query("insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,$3)", [U(i), `u${i}@t.local`, { full_name: `Student${i} Kumar` }]); await db.query("update profiles set status='active', cohort_id=$2 where id=$1", [U(i), i <= 12 ? cohort : other]); }
  await db.query("update profiles set display_alias='ProcessFirst' where id=$1", [U(3)]);
  const lvl = (await db.query("select id from levels where slug='foundation'")).rows[0].id;
  const ref = (n: number) => `10000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
  // 12 students in cohort 1 with distinct totals; two in cohort 2
  for (let i = 1; i <= 14; i++) {
    for (let k = 0; k < i; k++) await db.query("select app.award($1,$2,'quiz',10,'session',$3,'quiz')", [U(i), lvl, ref(k + 1)]);
    await db.query("select app.award($1,$2,'exam',$3,'exam',$4,'best attempt')", [U(i), lvl, i * 5, ref(50)]);
  }
  // caps: student 1 gets 30 attendance events x 10 = 300 -> capped 200
  for (let k = 0; k < 30; k++) await db.query("select app.award($1,$2,'attendance',10,'session',$3,'complete')", [U(1), lvl, ref(k + 1)]);
  console.log("\n# Engine");
  const dup = (await db.query("select app.award($1,$2,'quiz',10,'session',$3,'quiz again') as inserted", [U(1), lvl, ref(1)])).rows[0].inserted;
  ok("re-awarding the same ref is a no-op (idempotent)", dup === false);
  const s1 = (await db.query("select * from scores where user_id=$1", [U(1)])).rows[0];
  ok("attendance capped at 200", Number(s1.attendance_pts) === 200, s1.attendance_pts);
  ok("total = capped components", Number(s1.total) === 200 + 10 + 5, s1.total);
  const snap = (await db.query("select user_id, attendance_pts, quiz_pts, exam_pts, practice_pts, discipline_pts, total from scores order by user_id")).rows;
  await db.query("delete from scores");
  for (let i = 1; i <= 14; i++) await db.query("select app.recompute_scores($1,$2)", [U(i), lvl]);
  const again = (await db.query("select user_id, attendance_pts, quiz_pts, exam_pts, practice_pts, discipline_pts, total from scores order by user_id")).rows;
  ok("scores reproducible from score_events alone (delete + recompute = identical)", JSON.stringify(snap) === JSON.stringify(again));
  await db.query("begin"); try { await db.query("update score_events set points = 999"); ok("score_events cannot be updated", false); } catch (e) { ok("score_events cannot be updated", /append-only/.test((e as Error).message)); } await db.query("rollback");
  await db.query("begin"); try { await db.query("delete from score_events"); ok("score_events cannot be deleted", false); } catch (e) { ok("score_events cannot be deleted", /append-only/.test((e as Error).message)); } await db.query("rollback");
  const r = null;
  await db.query("select app.override_score($1,$2,$3,-15,'duplicate quiz credit removed after review')", [U(2), U(1), lvl]);
  const s1b = (await db.query("select total from scores where user_id=$1", [U(1)])).rows[0];
  ok("override appends a compensating event and recompute reflects it", Number(s1b.total) === 200, s1b.total);
  const evs = (await db.query("select count(*)::int as n from score_events where user_id=$1", [U(1)])).rows[0].n;
  ok("history untouched by override (events only grow)", evs === 30 + 1 + 1 + 1);
  void r;

  console.log("\n# Leaderboard (§10) — as student 12 (rank 3) and student 2 (bottom)");
  await as(U(12), async () => {
    const rows = (await db.query("select * from board_process($1)", [lvl])).rows;
    ok("returns top 10 + me only", rows.length === 10 && rows.filter((x) => x.is_me).length === 1, String(rows.length));
    ok("cohort-scoped: students 13/14 (other cohort) never appear", !rows.some((x) => x.display_name?.startsWith("Student13") || x.display_name?.startsWith("Student14")));
    ok("names are First + last initial", rows.some((x) => x.display_name === "Student14 K." ) === false && rows.every((x) => x.display_name === null || /^Student\d+ K\.$/.test(x.display_name) || x.display_name === "ProcessFirst"));
  });
  await as(U(3), async () => {
    const rows = (await db.query("select * from board_process($1)", [lvl])).rows;
    ok("alias respected on own row", rows.find((x) => x.is_me)?.display_name === "ProcessFirst");
    ok("value is the Process Score, no money column", Object.keys(rows[0]).every((k) => !/pnl|return|profit|inr|rupee/i.test(k)));
  });
  await as(U(2), async () => {
    const rows = (await db.query("select * from board_process($1)", [lvl])).rows;
    const me = rows.find((x) => x.is_me)!;
    ok("bottom student sees own row + band, not the rest of the tail", rows.length === 11 && me.rank === 12 && me.band === "Keep going", `${rows.length} ${me?.rank} ${me?.band}`);
    ok("nobody below rank 10 is named to the bottom student", rows.filter((x) => x.rank > 10 && !x.is_me).length === 0);
    const cons = (await db.query("select * from board_consistency()")).rows;
    ok("consistency board works with zero journals", cons.length >= 1);
    const imp = (await db.query("select * from board_improved($1)", [lvl])).rows;
    ok("most-improved board returns rows", imp.length >= 1);
    let denied = false; try { await db.query("select * from board_full($1,$2)", [cohort, lvl]); } catch { denied = true; }
    const full = denied ? [] : (await db.query("select * from board_full($1,$2)", [cohort, lvl])).rows;
    ok("student cannot see the mentor full ranking", denied || full.length === 0);
    let d2 = false; try { await db.query("select award($1,$2,'exam',250,'exam',$3,'self')", [U(2), lvl, ref(99)]); } catch { d2 = true; }
    ok("student cannot call award()", d2);
  });
  const sql = (await db.query("select pg_get_functiondef('app.board_process(uuid)'::regprocedure) as d union all select pg_get_functiondef('app.board_consistency()'::regprocedure) union all select pg_get_functiondef('app.board_improved(uuid)'::regprocedure)")).rows.map((x) => x.d).join("\n");
  ok("no leaderboard SQL touches portfolio_rows / entry_price / qty (no P&L board can exist)", !/portfolio_rows|entry_price|qty/.test(sql));
  await db.end();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
