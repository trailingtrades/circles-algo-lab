-- 5C Learn · schema · master prompt §6
-- uuid PKs, created_at/updated_at everywhere, snake_case. Content is data, not code.
create extension if not exists "pgcrypto";

create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

create or replace function app.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- enums ----------
create type app.user_role as enum ('student','mentor','admin');
create type app.user_status as enum ('invited','active','suspended');
create type app.level_slug as enum ('foundation','intermediate','advanced');
create type app.resource_kind as enum ('deck','handout','workbook','exam','excel','link');
create type app.progress_status as enum ('not_started','in_progress','complete');
create type app.journal_kind as enum ('reflection','galti_log','friday_review');
create type app.cert_status as enum ('issued','revoked');
create type app.score_kind as enum ('attendance','quiz','exam','practice','discipline','override');

-- ---------- cohorts / profiles ----------
create table cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level app.level_slug not null,
  starts_on date not null,
  ends_on date,
  mentor_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role app.user_role not null default 'student',
  phone text,
  cohort_id uuid references cohorts(id) on delete set null,
  status app.user_status not null default 'invited',
  display_alias text check (display_alias is null or char_length(display_alias) between 2 and 24),
  lang text not null default 'en' check (lang in ('en','hi')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table cohorts add constraint cohorts_mentor_fk foreign key (mentor_id) references profiles(id) on delete set null;
create index on profiles (cohort_id);
create index on profiles (role);

-- Create a profile row the moment an auth user exists (invite flow fills the rest).
create or replace function app.handle_new_auth_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function app.handle_new_auth_user();

-- ---------- invites (admin-issued accounts, §5) ----------
create table invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  cohort_id uuid not null references cohorts(id) on delete cascade,
  role app.user_role not null default 'student',
  token_hash text not null unique,          -- sha256 of the single-use token; raw token only ever lives in the email
  expires_at timestamptz not null,
  accepted_at timestamptz,
  user_id uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on invites (lower(email));

-- ---------- course structure ----------
create table levels (
  id uuid primary key default gen_random_uuid(),
  slug app.level_slug not null unique,
  title_en text not null,
  title_hi text not null,
  sequence smallint not null unique,
  unlock_rule text not null default 'previous_level_certificate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table weeks (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id) on delete cascade,
  number smallint not null check (number between 1 and 4),
  title_en text not null,
  title_hi text not null,
  theme_accent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level_id, number)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  day smallint not null check (day between 1 and 5),
  number smallint not null unique check (number between 1 and 60),
  title_en text not null,
  title_hi text not null,
  core_concept text not null default '',
  ai_lab text not null default '',
  psychology text not null default '',
  duration_min smallint not null default 60,
  video_url text,
  deck_asset_id uuid,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_id, day)
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  week_id uuid references weeks(id) on delete cascade,
  level_id uuid references levels(id) on delete cascade,
  kind app.resource_kind not null,
  storage_path text,
  file_name text not null,
  size_bytes bigint,
  version text not null default '1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(session_id, week_id, level_id) = 1)
);

create table exams (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id) on delete cascade,
  week_id uuid references weeks(id) on delete cascade,   -- null = final
  title text not null,
  total_marks smallint not null,
  pass_marks smallint not null,
  distinction_marks smallint not null,
  time_limit_min smallint not null default 30,
  attempts_allowed smallint not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pass_marks <= distinction_marks and distinction_marks <= total_marks)
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  exam_id uuid references exams(id) on delete cascade,
  stem_en text not null,
  stem_hi text not null,
  options jsonb not null,                      -- [{"en":..,"hi":..,"distractor":true}]
  correct_index smallint not null,             -- column-level: never readable by students (see rls migration)
  explanation_en text not null default '',
  explanation_hi text not null default '',
  marks smallint not null default 1,
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  sequence smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(session_id, exam_id) = 1),
  check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  check (correct_index >= 0)
);

-- ---------- learner activity ----------
create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exam_id uuid references exams(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  score numeric(6,2),          -- server-graded only (see app.guard_attempt)
  max_score numeric(6,2),
  passed boolean,
  attempt_no smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(exam_id, session_id) = 1)
);
create index on attempts (user_id);

create table session_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  status app.progress_status not null default 'not_started',
  watched_pct smallint not null default 0 check (watched_pct between 0 and 100),
  handout_opened boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  kind app.journal_kind not null default 'reflection',
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on journal_entries (user_id, created_at desc);

create table portfolio_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  symbol text not null,
  full_why text not null default '',
  full_why_2 text not null default '',
  top_risk text not null default '',
  risk_answer text not null default '',
  price_stop numeric(12,2),
  why_stop text not null default '',
  review_point text not null default '',
  entry_date date,
  qty integer check (qty is null or qty > 0),
  entry_price numeric(12,2),
  is_virtual boolean not null default true check (is_virtual = true),   -- VIRTUAL, always. No real money.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on portfolio_rows (user_id);

-- ---------- scoring: immutable events, derived scores ----------
create table score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  level_id uuid references levels(id) on delete set null,
  kind app.score_kind not null,
  points numeric(7,2) not null,
  ref_type text,
  ref_id uuid,
  notes text,
  awarded_by uuid references profiles(id) on delete set null,
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on score_events (user_id, level_id);

create table scores (
  user_id uuid not null references profiles(id) on delete cascade,
  level_id uuid not null references levels(id) on delete cascade,
  attendance_pts numeric(7,2) not null default 0,
  quiz_pts numeric(7,2) not null default 0,
  exam_pts numeric(7,2) not null default 0,
  practice_pts numeric(7,2) not null default 0,
  discipline_pts numeric(7,2) not null default 0,
  total numeric(7,2) not null default 0,
  percentile numeric(5,2),
  updated_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

create table certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete restrict,
  level_id uuid not null references levels(id) on delete restrict,
  cohort_id uuid references cohorts(id) on delete set null,
  cert_no text not null unique,
  issued_on date not null default current_date,
  band text not null check (band in ('pass','distinction')),
  verify_hash text not null,
  pdf_storage_path text,
  status app.cert_status not null default 'issued',
  revoked_reason text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'issued' or (revoked_reason is not null and revoked_at is not null))
);

-- ---------- audit ----------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_type text not null,
  target_id uuid,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index on audit_log (at desc);

-- updated_at triggers
do $$ declare t text; begin
  for t in select unnest(array['cohorts','profiles','invites','levels','weeks','sessions','resources','exams','quiz_questions','attempts','session_progress','journal_entries','portfolio_rows','certificates']) loop
    execute format('create trigger touch_%I before update on %I for each row execute function app.touch_updated_at()', t, t);
  end loop; end $$;

-- ---------- guards ----------
-- Students may write answers; only the service role may write a score. Client-supplied scores are discarded.
create or replace function app.guard_attempt() returns trigger language plpgsql as $$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' and current_user <> 'service_role' and not app.is_service() then
    new.score := case when tg_op = 'UPDATE' then old.score else null end;
    new.max_score := case when tg_op = 'UPDATE' then old.max_score else null end;
    new.passed := case when tg_op = 'UPDATE' then old.passed else null end;
    if tg_op = 'UPDATE' and old.submitted_at is not null then
      raise exception 'attempt already submitted' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Non-admins can only touch their own cosmetic profile fields.
create or replace function app.guard_profile() returns trigger language plpgsql as $$
begin
  if app.is_service() or app.is_admin() then return new; end if;
  if new.role is distinct from old.role or new.cohort_id is distinct from old.cohort_id
     or new.status is distinct from old.status or new.id is distinct from old.id or new.joined_at is distinct from old.joined_at then
    raise exception 'only admin may change role/cohort/status' using errcode = '42501';
  end if;
  return new;
end $$;
