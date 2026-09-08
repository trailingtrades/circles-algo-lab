-- 5C Learn · row level security · master prompt §5
-- Student: own rows only. Mentor: assigned cohort(s). Admin: all. Service role bypasses RLS (server-side only).

-- ---------- helpers (security definer, stable) ----------
-- True for the service role (PostgREST JWT), the service_role DB role, or a superuser/owner running migrations and scripts.
create or replace function app.is_service() returns boolean language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'service_role'
      or current_user = 'service_role'
      or exists (select 1 from pg_roles where rolname = current_user and rolsuper)
$$;

create or replace function app.current_role() returns app.user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function app.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active')
$$;

create or replace function app.is_active() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active')
$$;

create or replace function app.my_cohort() returns uuid language sql stable security definer set search_path = public as $$
  select cohort_id from profiles where id = auth.uid()
$$;

-- Cohorts this mentor is assigned to.
create or replace function app.mentor_cohorts() returns setof uuid language sql stable security definer set search_path = public as $$
  select c.id from cohorts c join profiles p on p.id = auth.uid()
  where p.role = 'mentor' and p.status = 'active' and c.mentor_id = p.id
$$;

create or replace function app.can_see_user(target uuid) returns boolean language sql stable security definer set search_path = public as $$
  select target = auth.uid()
      or app.is_admin()
      or exists (select 1 from profiles t where t.id = target and t.cohort_id in (select app.mentor_cohorts()))
$$;

revoke all on function app.current_role(), app.is_admin(), app.is_active(), app.my_cohort(), app.mentor_cohorts(), app.can_see_user(uuid), app.is_service() from public;
grant execute on function app.current_role(), app.is_admin(), app.is_active(), app.my_cohort(), app.mentor_cohorts(), app.can_see_user(uuid), app.is_service() to anon, authenticated, service_role;

-- ---------- triggers that depend on helpers ----------
create trigger guard_attempt before insert or update on attempts for each row execute function app.guard_attempt();
create trigger guard_profile before update on profiles for each row execute function app.guard_profile();

-- ---------- grants ----------
grant select on all tables in schema public to authenticated;
grant insert, update on attempts, session_progress, journal_entries, portfolio_rows to authenticated;
grant delete on journal_entries, portfolio_rows to authenticated;
grant update (full_name, phone, display_alias, lang) on profiles to authenticated;
-- Correct answers and explanations never leave the server for a student. A column-level REVOKE does not
-- subtract from a table-level GRANT in Postgres, so the table grant is removed and only safe columns are granted.
-- Client code must select explicit columns from quiz_questions (select * is denied for students by design).
revoke select on quiz_questions from authenticated;
grant select (id, session_id, exam_id, stem_en, stem_hi, options, marks, difficulty, sequence, created_at, updated_at) on quiz_questions to authenticated;
-- nothing for anon; the public verify page runs through a service-role route handler
revoke all on all tables in schema public from anon;
grant all on all tables in schema public to service_role;

-- ---------- enable RLS everywhere ----------
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop; end $$;

-- ---------- profiles ----------
create policy profiles_select on profiles for select to authenticated using (app.can_see_user(id));
create policy profiles_update_self on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on profiles for all to authenticated using (app.is_admin()) with check (app.is_admin());

-- ---------- cohorts ----------
create policy cohorts_select on cohorts for select to authenticated
  using (id = app.my_cohort() or app.is_admin() or id in (select app.mentor_cohorts()));
create policy cohorts_admin on cohorts for all to authenticated using (app.is_admin()) with check (app.is_admin());

-- ---------- invites: admin only ----------
create policy invites_admin on invites for all to authenticated using (app.is_admin()) with check (app.is_admin());

-- ---------- course content: readable by any active user; editable by admin ----------
create policy levels_read on levels for select to authenticated using (app.is_active());
create policy weeks_read on weeks for select to authenticated using (app.is_active());
create policy sessions_read on sessions for select to authenticated using (app.is_active() and (is_published or app.is_admin() or app.current_role() = 'mentor'));
create policy resources_read on resources for select to authenticated using (app.is_active());
create policy exams_read on exams for select to authenticated using (app.is_active());
create policy quiz_read on quiz_questions for select to authenticated using (app.is_active());
create policy levels_admin on levels for all to authenticated using (app.is_admin()) with check (app.is_admin());
create policy weeks_admin on weeks for all to authenticated using (app.is_admin()) with check (app.is_admin());
create policy sessions_admin on sessions for all to authenticated using (app.is_admin()) with check (app.is_admin());
create policy resources_admin on resources for all to authenticated using (app.is_admin()) with check (app.is_admin());
create policy exams_admin on exams for all to authenticated using (app.is_admin()) with check (app.is_admin());
create policy quiz_admin on quiz_questions for all to authenticated using (app.is_admin()) with check (app.is_admin());

-- ---------- learner-owned rows ----------
create policy attempts_select on attempts for select to authenticated using (app.can_see_user(user_id));
create policy attempts_insert on attempts for insert to authenticated with check (user_id = auth.uid() and app.is_active());
create policy attempts_update on attempts for update to authenticated using (user_id = auth.uid() and submitted_at is null) with check (user_id = auth.uid());

create policy progress_select on session_progress for select to authenticated using (app.can_see_user(user_id));
create policy progress_write on session_progress for insert to authenticated with check (user_id = auth.uid() and app.is_active());
create policy progress_update on session_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy journal_select on journal_entries for select to authenticated using (app.can_see_user(user_id));
create policy journal_insert on journal_entries for insert to authenticated with check (user_id = auth.uid() and app.is_active());
create policy journal_update on journal_entries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy journal_delete on journal_entries for delete to authenticated using (user_id = auth.uid());

create policy portfolio_select on portfolio_rows for select to authenticated using (app.can_see_user(user_id));
create policy portfolio_insert on portfolio_rows for insert to authenticated with check (user_id = auth.uid() and app.is_active() and is_virtual);
create policy portfolio_update on portfolio_rows for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and is_virtual);
create policy portfolio_delete on portfolio_rows for delete to authenticated using (user_id = auth.uid());

-- ---------- scoring & certificates: read-only for everyone but the service role ----------
create policy score_events_select on score_events for select to authenticated using (app.can_see_user(user_id));
create policy scores_select on scores for select to authenticated using (app.can_see_user(user_id));
create policy certificates_select on certificates for select to authenticated using (app.can_see_user(user_id));
-- (no insert/update/delete policies: authenticated writes are denied; grants above also omit them)

-- ---------- audit: admin read only ----------
create policy audit_admin_read on audit_log for select to authenticated using (app.is_admin());
