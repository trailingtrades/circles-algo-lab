-- 5C Learn · content extras + level gating (Phase 3)
alter table sessions add column if not exists summary_hi text not null default '';
alter table sessions add column if not exists prompts jsonb not null default '[]'::jsonb;   -- [{title, level, platform, body}]
alter table sessions add column if not exists video_provider text not null default 'youtube_unlisted';
alter table sessions add column if not exists is_draft boolean not null default true;
alter table resources add column if not exists note text;
alter table resources add column if not exists external_url text;

-- Admin per-student level override (§8 "Admin can override per student, logged in audit_log").
create table if not exists level_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  level_id uuid not null references levels(id) on delete cascade,
  reason text not null check (char_length(reason) >= 5),
  granted_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, level_id)
);
alter table level_unlocks enable row level security;
alter table level_unlocks force row level security;
grant select on level_unlocks to authenticated;
grant all on level_unlocks to service_role;
create policy level_unlocks_select on level_unlocks for select to authenticated using (app.can_see_user(user_id));

create or replace function app.unlock_level(p_actor uuid, p_user uuid, p_level uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into level_unlocks (user_id, level_id, reason, granted_by) values (p_user, p_level, p_reason, p_actor)
  on conflict (user_id, level_id) do update set reason = excluded.reason, granted_by = excluded.granted_by returning id into v_id;
  perform app.log_audit(p_actor, 'level.unlock_override', 'level_unlocks', v_id, null, jsonb_build_object('user_id', p_user, 'level_id', p_level, 'reason', p_reason));
  return v_id;
end $$;
create or replace function public.unlock_level(p_actor uuid, p_user uuid, p_level uuid, p_reason text)
returns uuid language sql security definer set search_path = public as $$ select app.unlock_level(p_actor, p_user, p_level, p_reason) $$;
revoke all on function app.unlock_level(uuid, uuid, uuid, text), public.unlock_level(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function app.unlock_level(uuid, uuid, uuid, text), public.unlock_level(uuid, uuid, uuid, text) to service_role;

-- A level is open for a user when: sequence 1, or an issued certificate for the previous level exists, or an admin override exists.
create or replace function app.level_open(p_user uuid, p_level uuid) returns boolean language sql stable security definer set search_path = public as $$
  with me as (select sequence from levels where id = p_level)
  select coalesce((select sequence from me) = 1, false)
      or exists (select 1 from level_unlocks where user_id = p_user and level_id = p_level)
      or exists (select 1 from certificates c join levels prev on prev.id = c.level_id
                 where c.user_id = p_user and c.status = 'issued' and prev.sequence = (select sequence from me) - 1)
$$;
grant execute on function app.level_open(uuid, uuid) to authenticated, service_role;

-- The external Algo Lab link belongs to no level; every stored file still needs exactly one owner.
alter table resources drop constraint if exists resources_check;
alter table resources add constraint resources_owner_check check (kind = 'link' or num_nonnulls(session_id, week_id, level_id) = 1);
