-- 5C Learn · scoring engine + leaderboards (master prompt §9, §10)
-- Every point is an immutable score_events row. scores is DERIVED by app.recompute_scores() and never hand-edited.

-- ---------- immutability + idempotency ----------
create or replace function app.score_events_immutable() returns trigger language plpgsql as $$
begin raise exception 'score_events is append-only' using errcode = '42501'; end $$;
create trigger score_events_no_update before update or delete on score_events for each row execute function app.score_events_immutable();
-- One award per (user, kind, ref): re-running an awarder never double-counts. Overrides are exempt (each has its own id).
create unique index if not exists score_events_once on score_events (user_id, kind, ref_type, ref_id) where kind <> 'override';

-- ---------- attempts: exam timing ----------
alter table attempts add column if not exists deadline_at timestamptz;
alter table attempts add column if not exists autosaved_at timestamptz;

-- ---------- practice artefacts: mentor grades on PROCESS only ----------
create table if not exists practice_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  level_id uuid not null references levels(id) on delete cascade,
  artefact text not null,                                  -- 'full_why' | 'valuation_note' | 'chart_note' | 'dossier' | 'thesis_memo'
  ref_id uuid,                                             -- portfolio_rows.id etc.
  process_grade char(1) not null check (process_grade in ('A','B','C','D','F')),
  outcome_sign char(1) check (outcome_sign in ('+','-','0')), -- shown separately, NEVER scored (§9)
  feedback text,
  graded_by uuid references profiles(id) on delete set null,
  graded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, level_id, artefact, ref_id)
);
create trigger touch_practice_grades before update on practice_grades for each row execute function app.touch_updated_at();
alter table practice_grades enable row level security; alter table practice_grades force row level security;
grant select on practice_grades to authenticated; grant all on practice_grades to service_role;
create policy practice_grades_select on practice_grades for select to authenticated using (app.can_see_user(user_id));

-- Level-appropriate artefact ladder (§9) and points per artefact so the practice component sums to 250.
create table if not exists artefact_ladder (
  level_slug app.level_slug not null,
  artefact text not null,
  title text not null,
  points numeric(6,2) not null,
  primary key (level_slug, artefact)
);
insert into artefact_ladder values
  ('foundation','full_why','Mock-portfolio rows with Full Why x2, top risk + answer, price-stop, Why-stop, review point',250),
  ('intermediate','valuation_note','Valuation note (range + assumptions)',125),
  ('intermediate','chart_note','Chart-note (A/B/C zones, breakout checklist)',125),
  ('advanced','dossier','8-page dossier',150),
  ('advanced','thesis_memo','2-page thesis-memo',100)
on conflict do nothing;
alter table artefact_ladder enable row level security;
grant select on artefact_ladder to authenticated, anon; grant all on artefact_ladder to service_role;
create policy artefact_ladder_read on artefact_ladder for select using (true);

-- ---------- the engine ----------
-- Component caps (§9): attendance 200 · quiz 200 · exams 250 · practice 250 · discipline 100 = 1000.
-- Deterministic: same score_events rows -> same scores row, always. Overrides are added to the total, uncapped, and reported in notes.
create or replace function app.recompute_scores(p_user uuid, p_level uuid) returns scores language plpgsql security definer set search_path = public as $$
declare r scores; v_att numeric; v_quiz numeric; v_exam numeric; v_prac numeric; v_disc numeric; v_over numeric;
begin
  select coalesce(sum(points) filter (where kind='attendance'),0), coalesce(sum(points) filter (where kind='quiz'),0),
         coalesce(sum(points) filter (where kind='exam'),0), coalesce(sum(points) filter (where kind='practice'),0),
         coalesce(sum(points) filter (where kind='discipline'),0), coalesce(sum(points) filter (where kind='override'),0)
    into v_att, v_quiz, v_exam, v_prac, v_disc, v_over
    from score_events where user_id = p_user and level_id = p_level;
  v_att := least(v_att, 200); v_quiz := least(v_quiz, 200); v_exam := least(v_exam, 250); v_prac := least(v_prac, 250); v_disc := least(v_disc, 100);
  insert into scores (user_id, level_id, attendance_pts, quiz_pts, exam_pts, practice_pts, discipline_pts, total, updated_at)
  values (p_user, p_level, v_att, v_quiz, v_exam, v_prac, v_disc, greatest(0, least(1000, v_att + v_quiz + v_exam + v_prac + v_disc + v_over)), now())
  on conflict (user_id, level_id) do update set attendance_pts = excluded.attendance_pts, quiz_pts = excluded.quiz_pts, exam_pts = excluded.exam_pts,
    practice_pts = excluded.practice_pts, discipline_pts = excluded.discipline_pts, total = excluded.total, updated_at = now()
  returning * into r;
  -- percentile within the learner's cohort (cohort-scoped by design, §10.2)
  update scores s set percentile = sub.pct from (
    select s2.user_id, round(100.0 * (count(*) over (order by s2.total) - 1) / greatest(count(*) over () - 1, 1), 2) as pct
    from scores s2 join profiles p2 on p2.id = s2.user_id
    where s2.level_id = p_level and p2.cohort_id = (select cohort_id from profiles where id = p_user) and p2.status = 'active'
  ) sub where s.user_id = sub.user_id and s.level_id = p_level;
  select * into r from scores where user_id = p_user and level_id = p_level;
  return r;
end $$;

-- Append an event (idempotent on ref) and recompute. Service role only.
create or replace function app.award(p_user uuid, p_level uuid, p_kind app.score_kind, p_points numeric, p_ref_type text, p_ref_id uuid, p_notes text)
returns boolean language plpgsql security definer set search_path = public as $$
declare inserted boolean := false;
begin
  if p_kind = 'override' then raise exception 'use override_score() for overrides' using errcode = '22023'; end if;
  insert into score_events (user_id, level_id, kind, points, ref_type, ref_id, notes) values (p_user, p_level, p_kind, p_points, p_ref_type, p_ref_id, p_notes)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  perform app.recompute_scores(p_user, p_level);
  return inserted;
end $$;
-- override_score (0003) must also recompute
create or replace function app.override_score(p_actor uuid, p_user uuid, p_level uuid, p_points numeric, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_reason is null or char_length(p_reason) < 5 then raise exception 'override needs a reason' using errcode = '22023'; end if;
  insert into score_events (user_id, level_id, kind, points, ref_type, notes, awarded_by) values (p_user, p_level, 'override', p_points, 'admin_override', p_reason, p_actor) returning id into v_id;
  perform app.log_audit(p_actor, 'score.override', 'score_events', v_id, null, jsonb_build_object('user_id', p_user, 'level_id', p_level, 'points', p_points, 'reason', p_reason));
  perform app.recompute_scores(p_user, p_level);
  return v_id;
end $$;

create or replace function public.award(p_user uuid, p_level uuid, p_kind app.score_kind, p_points numeric, p_ref_type text, p_ref_id uuid, p_notes text)
returns boolean language sql security definer set search_path = public as $$ select app.award(p_user, p_level, p_kind, p_points, p_ref_type, p_ref_id, p_notes) $$;
create or replace function public.recompute_scores(p_user uuid, p_level uuid) returns scores language sql security definer set search_path = public as $$ select app.recompute_scores(p_user, p_level) $$;
revoke all on function app.award(uuid,uuid,app.score_kind,numeric,text,uuid,text), public.award(uuid,uuid,app.score_kind,numeric,text,uuid,text), app.recompute_scores(uuid,uuid), public.recompute_scores(uuid,uuid) from public, anon, authenticated;
grant execute on function app.award(uuid,uuid,app.score_kind,numeric,text,uuid,text), public.award(uuid,uuid,app.score_kind,numeric,text,uuid,text), app.recompute_scores(uuid,uuid), public.recompute_scores(uuid,uuid) to service_role;

-- ---------- display names (§10.3): "First L." unless the student chose an alias. Never photo/city/P&L. ----------
create or replace function app.display_name(p_user uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(display_alias, ''),
    split_part(full_name, ' ', 1) || case when position(' ' in full_name) > 0 then ' ' || left(split_part(full_name, ' ', array_length(string_to_array(full_name, ' '), 1)), 1) || '.' else '' end)
  from profiles where id = p_user
$$;

-- ---------- leaderboards (§10): cohort-scoped, Process Score only, top-10 by name, everyone else sees own row + band ----------
-- Returned row set for the CALLER: the top 10 rows (named) plus the caller's own row (flagged). Nothing about anyone below rank 10.
create type app.board_row as (rank int, display_name text, value numeric, is_me boolean, band text);

create or replace function app.board_process(p_level uuid) returns setof app.board_row language sql stable security definer set search_path = public as $$
  with cohort as (select p.id from profiles p where p.cohort_id = app.my_cohort() and p.status = 'active' and p.role = 'student'),
  ranked as (select s.user_id, s.total as value, rank() over (order by s.total desc, s.updated_at asc) as rnk, count(*) over () as n
             from scores s join cohort c on c.id = s.user_id where s.level_id = p_level)
  select rnk::int, case when rnk <= 10 or user_id = auth.uid() then app.display_name(user_id) else null end, value, user_id = auth.uid(),
         case when rnk <= 10 then 'Top 10' when rnk <= ceil(n * 0.25) then 'Top 25%' when rnk <= ceil(n * 0.5) then 'Top 50%' else 'Keep going' end
  from ranked where rnk <= 10 or user_id = auth.uid() order by rnk
$$;

-- Consistency: journal days + on-time Friday reviews in the current ISO week (weekly reset, §10.6). Winnable by a beginner.
create or replace function app.board_consistency() returns setof app.board_row language sql stable security definer set search_path = public as $$
  with cohort as (select p.id from profiles p where p.cohort_id = app.my_cohort() and p.status = 'active' and p.role = 'student'),
  v as (select c.id as user_id,
          (select count(distinct (created_at at time zone 'Asia/Kolkata')::date) from journal_entries j where j.user_id = c.id and created_at >= date_trunc('week', now() at time zone 'Asia/Kolkata'))
        + (select count(*) from journal_entries j where j.user_id = c.id and j.kind = 'friday_review' and created_at >= date_trunc('week', now() at time zone 'Asia/Kolkata')) * 2 as value
        from cohort c),
  ranked as (select user_id, value, rank() over (order by value desc) as rnk, count(*) over () as n from v)
  select rnk::int, case when rnk <= 10 or user_id = auth.uid() then app.display_name(user_id) else null end, value, user_id = auth.uid(),
         case when rnk <= 10 then 'Top 10' when rnk <= ceil(n * 0.25) then 'Top 25%' when rnk <= ceil(n * 0.5) then 'Top 50%' else 'Keep going' end
  from ranked where rnk <= 10 or user_id = auth.uid() order by rnk
$$;

-- Most improved: Process Score points earned in the last 14 days (delta), from score_events alone.
create or replace function app.board_improved(p_level uuid) returns setof app.board_row language sql stable security definer set search_path = public as $$
  with cohort as (select p.id from profiles p where p.cohort_id = app.my_cohort() and p.status = 'active' and p.role = 'student'),
  v as (select c.id as user_id, coalesce((select sum(points) from score_events e where e.user_id = c.id and e.level_id = p_level and e.kind <> 'override' and e.awarded_at >= now() - interval '14 days'), 0) as value from cohort c),
  ranked as (select user_id, value, rank() over (order by value desc) as rnk, count(*) over () as n from v)
  select rnk::int, case when rnk <= 10 or user_id = auth.uid() then app.display_name(user_id) else null end, value, user_id = auth.uid(),
         case when rnk <= 10 then 'Top 10' when rnk <= ceil(n * 0.25) then 'Top 25%' when rnk <= ceil(n * 0.5) then 'Top 50%' else 'Keep going' end
  from ranked where rnk <= 10 or user_id = auth.uid() order by rnk
$$;

-- Mentor-visible full ranking (§10.9) — every row, names included, only for the mentor's own cohorts or admin.
create or replace function app.board_full(p_cohort uuid, p_level uuid) returns table (rank int, user_id uuid, full_name text, total numeric) language sql stable security definer set search_path = public as $$
  select rank() over (order by s.total desc)::int, p.id, p.full_name, s.total
  from scores s join profiles p on p.id = s.user_id
  where p.cohort_id = p_cohort and s.level_id = p_level and p.role = 'student'
    and (app.is_admin() or p_cohort in (select app.mentor_cohorts()))
  order by s.total desc
$$;

create or replace function public.board_process(p_level uuid) returns setof app.board_row language sql stable security definer set search_path = public as $$ select * from app.board_process(p_level) $$;
create or replace function public.board_consistency() returns setof app.board_row language sql stable security definer set search_path = public as $$ select * from app.board_consistency() $$;
create or replace function public.board_improved(p_level uuid) returns setof app.board_row language sql stable security definer set search_path = public as $$ select * from app.board_improved(p_level) $$;
create or replace function public.board_full(p_cohort uuid, p_level uuid) returns table (rank int, user_id uuid, full_name text, total numeric) language sql stable security definer set search_path = public as $$ select * from app.board_full(p_cohort, p_level) $$;
grant execute on function app.display_name(uuid), app.board_process(uuid), app.board_consistency(), app.board_improved(uuid), app.board_full(uuid,uuid),
  public.board_process(uuid), public.board_consistency(), public.board_improved(uuid), public.board_full(uuid,uuid) to authenticated, service_role;
