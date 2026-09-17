-- Academy stage entitlements: one Supabase login, per-stage unlock (Rahul, 17 Sep 2026).
-- The static WINNERS / O.N.E pages on the VPS are gated by nginx auth_request against
-- /smart/api/gate/<stage> in the learn app; that route answers from stage_access and logs
-- each visit into stage_visits. Writes go through the service role only (server actions
-- verify the caller is admin/mentor first), same posture as scores.

create table if not exists stage_access (
  user_id    uuid not null references profiles(id) on delete cascade,
  stage      text not null check (stage in ('winners', 'one')),
  expires_at timestamptz,           -- null = no expiry
  granted_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, stage)
);

create table if not exists stage_visits (
  id      bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  stage   text not null check (stage in ('winners', 'one')),
  at      timestamptz not null default now()
);
create index if not exists stage_visits_user_at on stage_visits (user_id, at desc);
create index if not exists stage_visits_stage_at on stage_visits (stage, at desc);

alter table stage_access enable row level security;
alter table stage_visits enable row level security;

-- Students see their own entitlements; staff see what app.can_see_user allows (own cohorts, admin all).
create policy stage_access_select on stage_access for select to authenticated using (app.can_see_user(user_id));
create policy stage_visits_select on stage_visits for select to authenticated using (app.can_see_user(user_id));
-- No insert/update/delete policies: only the service role writes, after a server-side role check.

grant select on stage_access, stage_visits to authenticated;
