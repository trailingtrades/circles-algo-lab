-- CIRCLE PRO's first track opens: Options 117 at /pro/options/ (Stage 4). Same one-login,
-- per-stage unlock as WINNERS and O.N.E — nginx auth_request → /smart/api/gate/pro_options →
-- stage_access. Widen both stage checks so mentors can grant it and visits log.
alter table stage_access drop constraint if exists stage_access_stage_check;
alter table stage_access add constraint stage_access_stage_check check (stage in ('winners', 'one', 'pro_options'));
alter table stage_visits drop constraint if exists stage_visits_stage_check;
alter table stage_visits add constraint stage_visits_stage_check check (stage in ('winners', 'one', 'stage0', 'pro_options'));
