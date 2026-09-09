-- 5C Learn · audit helpers · master prompt §5
-- Every admin action (invite, suspend, move, override, certificate issue/revoke) is written via app.log_audit
-- from server-side code running as the service role. Rows are append-only: no update/delete grants exist.

create or replace function app.log_audit(p_actor uuid, p_action text, p_target_type text, p_target_id uuid, p_before jsonb, p_after jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into audit_log (actor_id, action, target_type, target_id, before, after)
  values (p_actor, p_action, p_target_type, p_target_id, p_before, p_after) returning id into v_id;
  return v_id;
end $$;
revoke all on function app.log_audit(uuid, text, text, uuid, jsonb, jsonb) from public;
grant execute on function app.log_audit(uuid, text, text, uuid, jsonb, jsonb) to service_role;

-- Belt and braces: even the service role cannot rewrite history.
create or replace function app.audit_immutable() returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only' using errcode = '42501'; end $$;
create trigger audit_no_update before update or delete on audit_log for each row execute function app.audit_immutable();

-- Admin override of a score never edits history: it appends a compensating event with a reason (§9).
create or replace function app.override_score(p_actor uuid, p_user uuid, p_level uuid, p_points numeric, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_reason is null or char_length(p_reason) < 5 then raise exception 'override needs a reason' using errcode = '22023'; end if;
  insert into score_events (user_id, level_id, kind, points, ref_type, notes, awarded_by)
  values (p_user, p_level, 'override', p_points, 'admin_override', p_reason, p_actor) returning id into v_id;
  perform app.log_audit(p_actor, 'score.override', 'score_events', v_id, null, jsonb_build_object('user_id', p_user, 'level_id', p_level, 'points', p_points, 'reason', p_reason));
  return v_id;
end $$;
revoke all on function app.override_score(uuid, uuid, uuid, numeric, text) from public;
grant execute on function app.override_score(uuid, uuid, uuid, numeric, text) to service_role;

-- PostgREST only exposes the public schema, so the service-role client reaches the app.* functions through these wrappers.
-- Granted to service_role only: an authenticated JWT cannot call them.
create or replace function public.log_audit(p_actor uuid, p_action text, p_target_type text, p_target_id uuid, p_before jsonb, p_after jsonb)
returns uuid language sql security definer set search_path = public as $$ select app.log_audit(p_actor, p_action, p_target_type, p_target_id, p_before, p_after) $$;
revoke all on function public.log_audit(uuid, text, text, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.log_audit(uuid, text, text, uuid, jsonb, jsonb) to service_role;

create or replace function public.override_score(p_actor uuid, p_user uuid, p_level uuid, p_points numeric, p_reason text)
returns uuid language sql security definer set search_path = public as $$ select app.override_score(p_actor, p_user, p_level, p_points, p_reason) $$;
revoke all on function public.override_score(uuid, uuid, uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.override_score(uuid, uuid, uuid, numeric, text) to service_role;
