-- CIRCLE S.M.A.R.T · RLS hardening (audit, 19 Sep 2026).
-- A learner reaches Postgres through PostgREST with their own JWT: the public key plus their session cookie is
-- enough to send any INSERT/UPDATE their grants allow. Everything that decides a score, an unlock, a certificate
-- or a leaderboard place (quiz grading, exam grading, session completion, attempt numbers, exam deadlines,
-- journal timestamps, weekly reviews) is written by server actions with the service role (src/app/**/actions.ts), so
-- this migration takes those fields away from `authenticated` and pins them with triggers:
--   1. Table privileges: start from nothing, grant back exactly what the app writes with the learner's session.
--   2. Guard triggers pin server-owned values, so a broader grant coming back later does not reopen the hole.
--   3. Sessions the old "Mark as watched" upsert knocked back to in_progress are marked complete again.
--   4. One quiz attempt per session, one row per exam attempt number, one weekly review per review-day session
--      (catches double clicks and twin tabs).
--   5. Consistency board: a weekly review counts once a week, and the week starts Monday 00:00 IST.
--   6. Housekeeping: the go-live migrations ledger is not client-readable; tables without RLS are reported.
--   7. Exam papers: quiz_questions rows of an exam are no longer readable by learners (session quizzes still are).
-- Idempotent: revoke/grant repeat cleanly, functions are create-or-replace, triggers are dropped first.

-- ---------- 1. privileges ----------
-- Supabase's default privileges can hand ALL (insert/update/delete/truncate) on every new public table to
-- anon and authenticated; 0002 only trimmed SELECT. RLS stops most of it, but grants are the first gate.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
revoke all on all tables in schema public from anon;
grant select on artefact_ladder to anon;                      -- public ladder titles (0005); nothing else for anon
-- New tables start with no client write privileges; grant them explicitly, as below.
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from authenticated;
alter default privileges in schema public revoke all on tables from anon;

-- What the learner's own session writes. Every other write (grading, completion, admin, mentor) uses the service role.
grant update (full_name, phone, display_alias, lang) on profiles to authenticated;                           -- profile/actions.ts
grant insert (user_id, symbol, full_why, full_why_2, top_risk, risk_answer, price_stop, why_stop, review_point, entry_date, qty, entry_price, is_virtual) on portfolio_rows to authenticated;
grant update (user_id, symbol, full_why, full_why_2, top_risk, risk_answer, price_stop, why_stop, review_point, entry_date, qty, entry_price, is_virtual) on portfolio_rows to authenticated;
grant delete on portfolio_rows to authenticated;                                                             -- portfolio/actions.ts (virtual only)
grant insert (user_id, session_id, kind, body) on journal_entries to authenticated;                          -- session/actions.ts saveJournal (reflection, galti_log); created_at = DB clock
grant update (body) on journal_entries to authenticated;
grant delete on journal_entries to authenticated;
-- A weekly review ('friday_review') counts toward the certificate and the Consistency board, so saveJournal writes
-- it with the service role after its checks (unlocked, review day, 10+ characters, once per session) and the guard
-- below refuses one from a learner's session. Nor can a learner delete one: delete + rewrite in a later week would
-- earn the board's weekly +2 again from the same review day.
alter policy journal_delete on journal_entries using (user_id = auth.uid() and kind <> 'friday_review');
-- Upserts from session/actions.ts. PostgREST's ON CONFLICT DO UPDATE sets every payload column, keys included,
-- so the keys need UPDATE too (the trigger below pins them). completed_at is never granted.
grant insert (user_id, session_id, status, watched_pct, handout_opened) on session_progress to authenticated;
grant update (user_id, session_id, status, watched_pct, handout_opened) on session_progress to authenticated;
-- attempts: nothing. Quiz grading (session/actions.ts) and every exam write — start, autosave, submit, auto-close
-- (exam/actions.ts + exam/server.ts) — use the service role. A client UPDATE of `answers` after the deadline would
-- otherwise be graded when the attempt is auto-closed.

-- Suspended accounts keep their JWT until it expires: writes need an active profile, not just a matching id.
alter policy progress_update on session_progress using (user_id = auth.uid() and app.is_active()) with check (user_id = auth.uid());
alter policy journal_update on journal_entries using (user_id = auth.uid() and app.is_active()) with check (user_id = auth.uid());
alter policy portfolio_update on portfolio_rows using (user_id = auth.uid() and app.is_active()) with check (user_id = auth.uid() and is_virtual);

-- ---------- 2. guards ----------
-- True for PostgREST requests made with a learner/staff JWT (or none). The service role, migrations, the seed
-- and security-definer functions run as other roles and are not guarded.
create or replace function app.is_client() returns boolean language sql stable as $$
  select current_user in ('authenticated', 'anon') and not app.is_service()
$$;
revoke all on function app.is_client() from public;
grant execute on function app.is_client() to anon, authenticated, service_role;

-- attempts: server-written end to end, so a client write is refused outright even if a grant comes back
-- (numbering drives the 80% retake cap, deadline_at the on-time point, submitted_at the unlocks and certificate).
create or replace function app.guard_attempt() returns trigger language plpgsql as $$
begin
  if app.is_client() then raise exception 'attempts are written by the server' using errcode = '42501'; end if;
  return new;
end $$;
-- (the guard_attempt trigger from 0002 already calls this function)

-- session_progress: completion (quiz + journal) is decided by the server. A learner write can neither claim it
-- nor undo it; "Mark as watched" upserts status 'in_progress' and used to knock a finished session back.
create or replace function app.guard_progress() returns trigger language plpgsql as $$
begin
  if not app.is_client() then return new; end if;
  if tg_op = 'INSERT' then
    new.completed_at := null;
    if new.status = 'complete' then new.status := 'in_progress'; end if;
  else
    new.id := old.id; new.user_id := old.user_id; new.session_id := old.session_id; new.created_at := old.created_at; new.completed_at := old.completed_at;
    new.status := case when old.status = 'complete' then 'complete'::app.progress_status
                       when new.status = 'complete' then 'in_progress'::app.progress_status
                       else new.status end;
  end if;
  return new;
end $$;
drop trigger if exists guard_progress on session_progress;
create trigger guard_progress before insert or update on session_progress for each row execute function app.guard_progress();

-- journal_entries: the Consistency board and the weekly-review rule count by kind and created_at. A weekly review
-- is written by the server only (saveJournal checks the review day, the length and one per session first).
create or replace function app.guard_journal() returns trigger language plpgsql as $$
begin
  if not app.is_client() then return new; end if;
  if tg_op = 'INSERT' then
    if new.kind = 'friday_review' then raise exception 'weekly reviews are written by the server' using errcode = '42501'; end if;
    new.created_at := now(); new.updated_at := now();
  else
    new.id := old.id; new.user_id := old.user_id; new.session_id := old.session_id; new.kind := old.kind; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists guard_journal on journal_entries;
create trigger guard_journal before insert or update on journal_entries for each row execute function app.guard_journal();

-- ---------- 3. repair ----------
-- Same rule as the server's maybeComplete(): a submitted quiz attempt plus a journal entry = complete.
-- Only ever upgrades a row; completed_at keeps any real value.
update session_progress p
   set status = 'complete', completed_at = coalesce(p.completed_at, now())
 where p.status <> 'complete'
   and exists (select 1 from attempts a where a.user_id = p.user_id and a.session_id = p.session_id and a.submitted_at is not null)
   and exists (select 1 from journal_entries j where j.user_id = p.user_id and j.session_id = p.session_id);

-- ---------- 4. one attempt per quiz, one row per exam attempt number, one weekly review per session ----------
-- submitQuiz checks for an earlier attempt and then inserts; two quick submits could both get through.
-- saveJournal does the same for a weekly review (check, then insert).
do $$
begin
  if exists (select 1 from attempts where session_id is not null group by user_id, session_id having count(*) > 1) then
    raise notice 'attempts_one_quiz NOT created: a learner has two attempts on one session quiz. Once only one is left per learner and quiz, run: create unique index attempts_one_quiz on attempts(user_id, session_id) where session_id is not null';
  else
    create unique index if not exists attempts_one_quiz on attempts(user_id, session_id) where session_id is not null;
  end if;
  if exists (select 1 from attempts where exam_id is not null group by user_id, exam_id, attempt_no having count(*) > 1) then
    raise notice 'attempts_exam_no NOT created: two exam attempts share an attempt number. Once renumbered, run: create unique index attempts_exam_no on attempts(user_id, exam_id, attempt_no) where exam_id is not null';
  else
    create unique index if not exists attempts_exam_no on attempts(user_id, exam_id, attempt_no) where exam_id is not null;
  end if;
  if exists (select 1 from journal_entries where kind = 'friday_review' and session_id is not null group by user_id, session_id having count(*) > 1) then
    raise notice 'journal_one_review NOT created: a learner has two weekly reviews on one session. Once one is left (or the extra is re-kinded to reflection), run: create unique index journal_one_review on journal_entries(user_id, session_id) where kind = ''friday_review''';
  else
    create unique index if not exists journal_one_review on journal_entries(user_id, session_id) where kind = 'friday_review';
  end if;
end $$;

-- ---------- 5. Consistency board ----------
-- Journal days this week + 2 for a weekly review, counted once a week (one-line "Weekly review" entries used to
-- add 2 each, without limit). The week starts Monday 00:00 IST: date_trunc on the IST wall clock gives a plain
-- timestamp, which compared with timestamptz meant Monday 05:30 IST on a UTC server; `at time zone` turns it back.
create or replace function app.board_consistency() returns setof app.board_row language sql stable security definer set search_path = public as $$
  with wk as (select date_trunc('week', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' as since),
  cohort as (select p.id from profiles p where p.cohort_id = app.my_cohort() and p.status = 'active' and p.role = 'student'),
  v as (select c.id as user_id,
          (select count(distinct (j.created_at at time zone 'Asia/Kolkata')::date) from journal_entries j, wk where j.user_id = c.id and j.created_at >= wk.since)
        + (select least(count(*), 1) from journal_entries j, wk where j.user_id = c.id and j.kind = 'friday_review' and j.created_at >= wk.since) * 2 as value
        from cohort c),
  ranked as (select user_id, value, rank() over (order by value desc) as rnk, count(*) over () as n from v)
  select rnk::int, case when rnk <= 10 or user_id = auth.uid() then app.display_name(user_id) else null end, value, user_id = auth.uid(),
         case when rnk <= 10 then 'Top 10' when rnk <= ceil(n * 0.25) then 'Top 25%' when rnk <= ceil(n * 0.5) then 'Top 50%' else 'Keep going' end
  from ranked where rnk <= 10 or user_id = auth.uid() order by rnk
$$;

-- ---------- 6. housekeeping ----------
-- golive-setup.yml keeps its ledger in public._migrations (no RLS): not for clients.
do $$
begin
  if to_regclass('public._migrations') is not null then execute 'revoke all on public._migrations from anon, authenticated'; end if;
end $$;
-- Any public table without RLS is readable by whoever holds SELECT on it: list them in the migration output.
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity and c.relname <> '_migrations' loop
    raise notice 'public.% has row level security OFF', t;
  end loop;
end $$;

-- ---------- 7. exam papers stay server-side ----------
-- The timed exam is served and graded on the server from the bundled content (exam/server.ts); the exam rows
-- seeded into quiz_questions are only a copy. Under the 0002 quiz_read policy any active learner could list
-- every exam stem and option through PostgREST before starting the clock. Session quiz rows stay readable:
-- liveQuizPublic reads them with the learner's own session. Admins keep full access through quiz_admin.
drop policy if exists quiz_read on quiz_questions;
create policy quiz_read on quiz_questions for select to authenticated using (app.is_active() and session_id is not null);
