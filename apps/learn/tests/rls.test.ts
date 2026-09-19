/**
 * 5C Learn · RLS proof · Phase 2 gate.
 * Proves: student A cannot read student B's rows; a student cannot write score_events / certificates / scores;
 * a student cannot promote themself; mentors see only their cohort; anon sees nothing. Since 0011: a student's
 * JWT cannot write the fields the server owns (attempts at all, session completion, journal timestamps/kind).
 * If `npm run db:seed` ran first, the seeded banks are checked too (no answer flag in options, 0..n-1 order).
 * Runs against a fresh Postgres with tests/00_local_auth_shim.sql + migrations applied.
 *   DATABASE_URL=postgresql://postgres@localhost:5499/learn_test npx tsx supabase/tests/rls.test.ts
 */
import { Client } from "pg";

const url = process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5499/learn_test";
const db = new Client({ connectionString: url });
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${detail}`); } };

/** Run fn inside a transaction impersonating a Supabase JWT, then roll back. */
async function as(uid: string | null, role: "anon" | "authenticated", fn: () => Promise<void>) {
  await db.query("begin");
  try {
    await db.query(`set local role ${role}`);
    const claims = uid ? { sub: uid, role } : { role };
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await fn();
  } finally { await db.query("rollback"); }
}
/** Probe inside a savepoint so an expected error does not abort the outer impersonation transaction. */
async function denied(q: string, params: unknown[] = []): Promise<{ denied: boolean; msg: string; rows: number }> {
  await db.query("savepoint probe");
  try { const r = await db.query(q, params); await db.query("release savepoint probe"); return { denied: false, msg: "", rows: r.rowCount ?? 0 }; }
  catch (e) { await db.query("rollback to savepoint probe"); const m = (e as Error).message; return { denied: /permission denied|violates row-level security|only admin|append-only|violates check constraint|written by the server/i.test(m), msg: m, rows: 0 }; }
}

async function main() {
  await db.connect();
  // ---------- seeded content (runs only right after `npm run db:seed`: this test truncates everything below) ----------
  const seeded = (await db.query("select count(*)::int as n from sessions")).rows[0].n >= 21;
  console.log(seeded ? "\n# Seeded content" : "\n# Seeded content: skipped (run npm run db:seed first)");
  if (seeded) {
    const flags = (await db.query(`select count(*)::int as n from quiz_questions where options::text ~ '"(distractor|correct)"'`)).rows[0].n;
    ok("seeded options carry no answer flag (distractor / correct)", flags === 0, `${flags} rows`);
    const gaps = (await db.query(`select count(*)::int as n from (select coalesce(session_id, exam_id) as bank, count(*) as c, min(sequence) as lo, max(sequence) as hi, count(distinct sequence) as d
      from quiz_questions group by 1) b where lo <> 0 or hi <> c - 1 or d <> c`)).rows[0].n;
    ok("every seeded bank is numbered 0..n-1 (screen position i = answer-key row i)", gaps === 0, `${gaps} banks`);
    const pos = (await db.query("select count(distinct correct_index)::int as d from quiz_questions")).rows[0].d;
    ok("seeded answers are not all in one position", pos >= 3, `${pos} positions`);
    const dupEx = (await db.query("select count(*)::int as n from (select 1 from exams group by level_id, week_id having count(*) > 1) x")).rows[0].n;
    ok("one exam row per level+week (seed upserts, never duplicates)", dupEx === 0, `${dupEx}`);
  }

  // ---------- seed (as superuser = service role equivalent) ----------
  const ids = { admin: "00000000-0000-0000-0000-00000000000a", mentor: "00000000-0000-0000-0000-00000000000b", A: "00000000-0000-0000-0000-0000000000a1", B: "00000000-0000-0000-0000-0000000000b2", C: "00000000-0000-0000-0000-0000000000c3" };
  await db.query("truncate audit_log, certificates, scores, score_events, portfolio_rows, journal_entries, session_progress, attempts, quiz_questions, exams, resources, sessions, weeks, levels, invites, profiles, cohorts, auth.users cascade");
  for (const [k, id] of Object.entries(ids)) await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [id, `${k}@test.local`, { full_name: k }]);
  const c1 = (await db.query("insert into cohorts (name, level, starts_on) values ('TDP-Foundation-Oct-2026','foundation','2026-10-01') returning id")).rows[0].id;
  const c2 = (await db.query("insert into cohorts (name, level, starts_on) values ('TDP-Foundation-Nov-2026','foundation','2026-11-01') returning id")).rows[0].id;
  await db.query("update profiles set role='admin', status='active' where id=$1", [ids.admin]);
  await db.query("update profiles set role='mentor', status='active' where id=$1", [ids.mentor]);
  await db.query("update cohorts set mentor_id=$1 where id=$2", [ids.mentor, c1]);
  await db.query("update profiles set status='active', cohort_id=$2 where id=$1", [ids.A, c1]);
  await db.query("update profiles set status='active', cohort_id=$2 where id=$1", [ids.B, c1]);
  await db.query("update profiles set status='active', cohort_id=$2 where id=$1", [ids.C, c2]);
  const lvl = (await db.query("insert into levels (slug,title_en,title_hi,sequence) values ('foundation','Foundation','Foundation',1) returning id")).rows[0].id;
  const wk = (await db.query("insert into weeks (level_id,number,title_en,title_hi) values ($1,1,'W1','W1') returning id", [lvl])).rows[0].id;
  const sess = (await db.query("insert into sessions (week_id,day,number,title_en,title_hi,is_published) values ($1,1,1,'S1','S1',true) returning id", [wk])).rows[0].id;
  await db.query("insert into quiz_questions (session_id, stem_en, stem_hi, options, correct_index, explanation_en) values ($1,'Q','Q','[{\"en\":\"a\"},{\"en\":\"b\"}]',1,'because')", [sess]);
  const sess2 = (await db.query("insert into sessions (week_id,day,number,title_en,title_hi,is_published) values ($1,2,2,'S2','S2',true) returning id", [wk])).rows[0].id;
  const exam = (await db.query("insert into exams (level_id,week_id,title,total_marks,pass_marks,distinction_marks,time_limit_min,attempts_allowed) values ($1,$2,'W1',30,18,26,30,2) returning id", [lvl, wk])).rows[0].id;
  const openAttempt = (await db.query("insert into attempts (user_id, exam_id, attempt_no, deadline_at, answers) values ($1,$2,1,now() + interval '30 minutes','{}') returning id", [ids.A, exam])).rows[0].id;
  // S2 finished for A the way the server does it (quiz + journal, then maybeComplete with the service role).
  await db.query("insert into session_progress (user_id, session_id, status, watched_pct, completed_at) values ($1,$2,'complete',0,now())", [ids.A, sess2]);
  for (const u of [ids.A, ids.B, ids.C]) {
    await db.query("insert into journal_entries (user_id, session_id, body) values ($1,$2,'private note')", [u, sess]);
    await db.query("insert into portfolio_rows (user_id, symbol) values ($1,'DEMO')", [u]);
    await db.query("insert into score_events (user_id, level_id, kind, points) values ($1,$2,'attendance',10)", [u, lvl]);
    await db.query("insert into scores (user_id, level_id, total) values ($1,$2,10)", [u, lvl]);
  }
  await db.query("insert into certificates (user_id, level_id, cert_no, band, verify_hash) values ($1,$2,'5C-FOUND-2026-AAAAAA','pass','x')", [ids.B, lvl]);

  console.log("\n# Student A (cohort 1)");
  await as(ids.A, "authenticated", async () => {
    const p = await db.query("select id from profiles");
    ok("A sees only own profile", p.rowCount === 1 && p.rows[0].id === ids.A, `got ${p.rowCount}`);
    const j = await db.query("select user_id from journal_entries");
    ok("A sees only own journal (not B's)", j.rowCount === 1 && j.rows[0].user_id === ids.A);
    const pf = await db.query("select user_id from portfolio_rows");
    ok("A sees only own portfolio rows", pf.rowCount === 1 && pf.rows[0].user_id === ids.A);
    const se = await db.query("select user_id from score_events");
    ok("A sees only own score_events", se.rowCount === 1 && se.rows[0].user_id === ids.A);
    const sc = await db.query("select user_id from scores");
    ok("A sees only own scores", sc.rowCount === 1 && sc.rows[0].user_id === ids.A);
    const ce = await db.query("select id from certificates");
    ok("A cannot see B's certificate", ce.rowCount === 0);
    const jb = await db.query("select * from journal_entries where user_id=$1", [ids.B]);
    ok("A querying B's journal by id returns 0 rows", jb.rowCount === 0);

    let r = await denied("insert into score_events (user_id, level_id, kind, points) values ($1,$2,'exam',250)", [ids.A, lvl]);
    ok("A cannot insert score_events", r.denied, r.msg);
    r = await denied("update scores set total = 1000 where user_id=$1", [ids.A]);
    ok("A cannot update scores", r.denied || r.rows === 0, r.msg);
    r = await denied("insert into certificates (user_id, level_id, cert_no, band, verify_hash) values ($1,$2,'5C-FOUND-2026-FORGED','distinction','y')", [ids.A, lvl]);
    ok("A cannot insert certificates", r.denied, r.msg);
    r = await denied("delete from score_events where user_id=$1", [ids.A]);
    ok("A cannot delete score_events", r.denied, r.msg);
    r = await denied("update profiles set role='admin' where id=$1", [ids.A]);
    ok("A cannot promote self to admin", r.denied, r.msg);
    r = await denied("update profiles set cohort_id=$2 where id=$1", [ids.A, c2]);
    ok("A cannot move own cohort", r.denied, r.msg);
    r = await denied("update profiles set display_alias='ProcessFirst' where id=$1", [ids.A]);
    ok("A can set own display alias", !r.denied && r.rows === 1, r.msg);
    r = await denied("insert into journal_entries (user_id, body) values ($1,'forged for B')", [ids.B]);
    ok("A cannot write a journal entry as B", r.denied, r.msg);
    r = await denied("insert into portfolio_rows (user_id, symbol, is_virtual) values ($1,'REAL',false)", [ids.A]);
    ok("A cannot create a non-virtual portfolio row", r.denied, r.msg);
    r = await denied("select correct_index from quiz_questions");
    ok("A cannot read correct_index", r.denied, r.msg);
    r = await denied("select explanation_en from quiz_questions");
    ok("A cannot read explanation before grading", r.denied, r.msg);
    const q = await db.query("select stem_en, options from quiz_questions");
    ok("A can read the question stem + options", q.rowCount === 1);
    r = await denied("select stem_dv from quiz_questions");
    ok("A can read the Devanagari stem", !r.denied, r.msg);
    r = await denied("select explanation_dv from quiz_questions");
    ok("A cannot read the Devanagari explanation before grading", r.denied, r.msg);

    // ---- server-owned fields (0011): attempts are written by the server end to end ----
    r = await denied("insert into attempts (user_id, session_id, answers, score, max_score, passed, submitted_at) values ($1,$2,'{\"0\":1}',999,1,true,now())", [ids.A, sess]);
    ok("A cannot write a graded session-quiz attempt", r.denied, r.msg);
    r = await denied("insert into attempts (user_id, exam_id, attempt_no, deadline_at, answers) values ($1,$2,1,now() + interval '30 days','{}')", [ids.A, exam]);
    ok("A cannot open an exam attempt with a far deadline", r.denied, r.msg);
    r = await denied("update attempts set answers='{\"0\":2}', autosaved_at=now() where id=$1", [openAttempt]);
    ok("A cannot write answers into an open attempt directly (late answers would be graded)", r.denied, r.msg);
    r = await denied("update attempts set submitted_at=now(), deadline_at=now() + interval '1 day', attempt_no=1 where id=$1", [openAttempt]);
    ok("A cannot submit, extend or renumber an attempt", r.denied, r.msg);
    // Belt and braces: even if someone re-grants the table, the guard trigger refuses a client write.
    await db.query("savepoint regrant"); await db.query("reset role"); await db.query("grant insert, update on attempts to authenticated"); await db.query("set local role authenticated");
    r = await denied("insert into attempts (user_id, exam_id, answers) values ($1,$2,'{}')", [ids.A, exam]);
    ok("guard trigger refuses a client attempt write even with a table grant", r.denied && /written by the server/.test(r.msg), r.msg);
    await db.query("rollback to savepoint regrant"); await db.query("set local role authenticated");

    // ---- session_progress: completion is the server's. The upsert below is the statement PostgREST sends. ----
    const upsert = (row: Record<string, unknown>) => { const k = Object.keys(row); return db.query(`insert into session_progress (${k.join(",")}) values (${k.map((_, i) => `$${i + 1}`).join(",")}) on conflict (user_id, session_id) do update set ${k.map((c) => `${c} = excluded.${c}`).join(", ")} returning status, completed_at, watched_pct`, Object.values(row)); };
    let pr = await upsert({ user_id: ids.A, session_id: sess, watched_pct: 100, status: "in_progress" });
    ok("A can record progress with the app's upsert (watched %, status in_progress)", pr.rows[0].status === "in_progress" && pr.rows[0].watched_pct === 100, JSON.stringify(pr.rows[0]));
    pr = await upsert({ user_id: ids.A, session_id: sess, status: "complete" });
    ok("A cannot mark a session complete (kept in_progress)", pr.rows[0].status === "in_progress" && pr.rows[0].completed_at === null, JSON.stringify(pr.rows[0]));
    r = await denied("update session_progress set completed_at=now() where user_id=$1", [ids.A]);
    ok("A cannot set completed_at", r.denied, r.msg);
    pr = await upsert({ user_id: ids.A, session_id: sess2, handout_opened: true, status: "in_progress" });
    ok("a late 'handout opened' upsert never undoes a server-completed session", pr.rows[0].status === "complete" && pr.rows[0].completed_at !== null, JSON.stringify(pr.rows[0]));
    r = await denied("insert into session_progress (user_id, session_id, status) values ($1,$2,'in_progress')", [ids.B, sess]);
    ok("A cannot write progress for B", r.denied, r.msg);

    // ---- journal: kind and created_at feed the weekly-review rule and the Consistency board ----
    r = await denied("insert into journal_entries (user_id, session_id, kind, body, created_at) values ($1,$2,'friday_review','backdated',now() - interval '3 days')", [ids.A, sess]);
    ok("A cannot backdate a journal entry", r.denied, r.msg);
    const je = await db.query("insert into journal_entries (user_id, session_id, kind, body) values ($1,$2,'reflection','today, from the app') returning id", [ids.A, sess]);
    ok("A can write a journal entry the way the app does", je.rowCount === 1);
    r = await denied("update journal_entries set kind='friday_review' where id=$1", [je.rows[0].id]);
    ok("A cannot turn a reflection into a weekly review", r.denied, r.msg);
    r = await denied("insert into journal_entries (user_id, session_id, kind, body) values ($1,$2,'friday_review','x')", [ids.A, sess]);
    ok("A cannot write a weekly review directly (saveJournal writes it with the service role)", r.denied && /written by the server/.test(r.msg), r.msg);
    await db.query("savepoint rv"); await db.query("reset role");
    const rv = (await db.query("insert into journal_entries (user_id, session_id, kind, body) values ($1,$2,'friday_review','Week one review, from the server.') returning id", [ids.A, sess])).rows[0].id;
    r = await denied("insert into journal_entries (user_id, session_id, kind, body) values ($1,$2,'friday_review','A second review, same session.')", [ids.A, sess]);
    ok("one weekly review per learner and session (journal_one_review)", !!r.msg && /journal_one_review/.test(r.msg), r.msg);
    await db.query("set local role authenticated");
    r = await denied("delete from journal_entries where id=$1", [rv]);
    ok("A cannot delete a weekly review (delete + rewrite would earn the board's +2 again)", r.denied || r.rows === 0, r.msg);
    await db.query("rollback to savepoint rv"); await db.query("set local role authenticated");
    r = await denied("update journal_entries set body='edited note' where id=$1", [je.rows[0].id]);
    ok("A can edit own journal text", !r.denied && r.rows === 1, r.msg);

    // ---- profile + portfolio keep working with the app's own columns ----
    r = await denied("update profiles set full_name='A Kumar', phone=null, display_alias='Ak', lang='dv' where id=$1", [ids.A]);
    ok("A can update name, phone, alias and language (incl. Hindi 'dv')", !r.denied && r.rows === 1, r.msg);
    r = await denied("insert into portfolio_rows (user_id, symbol, full_why, full_why_2, top_risk, risk_answer, price_stop, why_stop, review_point, entry_date, qty, entry_price, is_virtual) values ($1,'TCS','a','b','c','d',100,'e','f',null,1,110,true)", [ids.A]);
    ok("A can add a virtual portfolio row with the app's columns", !r.denied && r.rows === 1, r.msg);
    r = await denied("truncate score_events");
    ok("A cannot truncate score_events", r.denied, r.msg);
    r = await denied("update levels set title_en='x'");
    ok("A cannot edit course content", r.denied || r.rows === 0, r.msg);
    r = await denied("select * from audit_log");
    ok("A cannot read audit_log", r.denied || r.rows === 0, r.msg);
    r = await denied("select * from invites");
    ok("A cannot read invites", r.denied || r.rows === 0, r.msg);
    const co = await db.query("select id from cohorts");
    ok("A sees only own cohort", co.rowCount === 1 && co.rows[0].id === c1);
  });

  console.log("\n# Mentor of cohort 1");
  await as(ids.mentor, "authenticated", async () => {
    const p = await db.query("select id from profiles order by id");
    ok("mentor sees self + A + B, not C", p.rowCount === 3 && !p.rows.some(r => r.id === ids.C), `got ${p.rowCount}`);
    const j = await db.query("select user_id from journal_entries");
    ok("mentor sees cohort-1 journals only", j.rowCount === 2 && !j.rows.some(r => r.user_id === ids.C));
    const r = await denied("insert into score_events (user_id, level_id, kind, points) values ($1,$2,'practice',50)", [ids.A, lvl]);
    ok("mentor cannot write score_events directly (server grades)", r.denied, r.msg);
    const r2 = await denied("update profiles set status='suspended' where id=$1", [ids.A]);
    ok("mentor cannot suspend a student", r2.denied || r2.rows === 0, r2.msg);
    const r3 = await denied("update session_progress set status='complete' where user_id=$1", [ids.A]);
    ok("mentor cannot complete a student's session directly", r3.denied || r3.rows === 0, r3.msg);
  });

  console.log("\n# Admin");
  await as(ids.admin, "authenticated", async () => {
    const p = await db.query("select id from profiles");
    ok("admin sees all 5 profiles", p.rowCount === 5);
    const a = await db.query("select count(*)::int as n from audit_log");
    ok("admin can read audit_log", a.rows[0].n >= 0);
    const r = await denied("insert into certificates (user_id, level_id, cert_no, band, verify_hash) values ($1,$2,'5C-FOUND-2026-ADMIN1','pass','z')", [ids.A, lvl]);
    ok("even admin JWT cannot insert certificates client-side (server-only)", r.denied, r.msg);
    const r2 = await denied("update sessions set title_en='edited without the compliance scan'");
    ok("admin JWT cannot edit content directly (admin actions use the service role + compliance scan)", r2.denied, r2.msg);
    const r3 = await denied("insert into invites (email, full_name, cohort_id, token_hash, expires_at) values ('x@t.local','X',$1,'h',now())", [c1]);
    ok("admin JWT cannot mint invites directly (server action only)", r3.denied, r3.msg);
  });

  await as(ids.A, "authenticated", async () => {
    const r = await denied("select public.log_audit($1,'x','profiles',$1,null,null)", [ids.A]);
    ok("A cannot call log_audit wrapper", r.denied, r.msg);
    const r2 = await denied("select public.override_score($1,$1,$2,500,'give myself points')", [ids.A, lvl]);
    ok("A cannot call override_score wrapper", r2.denied, r2.msg);
  });

  console.log("\n# Suspended learner (JWT still valid)");
  await db.query("update profiles set status='suspended' where id=$1", [ids.C]);
  await as(ids.C, "authenticated", async () => {
    const r = await denied("update journal_entries set body='after suspension' where user_id=$1", [ids.C]);
    ok("suspended learner cannot edit journal entries", r.denied || r.rows === 0, r.msg);
    const r2 = await denied("insert into journal_entries (user_id, body) values ($1,'after suspension')", [ids.C]);
    ok("suspended learner cannot add journal entries", r2.denied, r2.msg);
  });
  await db.query("update profiles set status='active' where id=$1", [ids.C]);

  console.log("\n# Anonymous");
  await as(null, "anon", async () => {
    for (const t of ["profiles", "certificates", "scores", "sessions", "cohorts", "stage_access", "attempts"]) {
      const r = await denied(`select * from ${t}`);
      ok(`anon cannot read ${t}`, r.denied, r.msg);
    }
  });

  console.log("\n# Audit immutability (service role)");
  await db.query("begin");
  await db.query("select app.log_audit($1,'test.action','profiles',$2,null,'{}'::jsonb)", [ids.admin, ids.A]);
  const r = await denied("delete from audit_log");
  ok("audit_log rows cannot be deleted even by service role", r.denied, r.msg);
  const r2 = await denied("update audit_log set action='tampered'");
  ok("audit_log rows cannot be updated", r2.denied, r2.msg);
  const ov = await db.query("select app.override_score($1,$2,$3,25,'manual regrade after mentor review') as id", [ids.admin, ids.A, lvl]);
  const ev = await db.query("select count(*)::int as n from score_events where user_id=$1", [ids.A]);
  ok("override appends a new event (history untouched)", !!ov.rows[0].id && ev.rows[0].n === 2);
  const r3 = await denied("select app.override_score($1,$2,$3,25,'x')", [ids.admin, ids.A, lvl]);
  ok("override without a real reason is rejected", r3.denied || /reason/.test(r3.msg), r3.msg);
  await db.query("rollback");

  await db.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
