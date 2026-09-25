-- CIRCLE W.I.N.N.E.R.S + opens: Algo Ki Kahani at /winners-plus/ (Stage 2+). Same one-login,
-- per-stage unlock as WINNERS and O.N.E — nginx auth_request → /smart/api/gate/winners_plus →
-- stage_access. Widen both stage checks so mentors can grant it and visits log.
alter table stage_access drop constraint if exists stage_access_stage_check;
alter table stage_access add constraint stage_access_stage_check check (stage in ('winners', 'winners_plus', 'one', 'pro_options'));
alter table stage_visits drop constraint if exists stage_visits_stage_check;
alter table stage_visits add constraint stage_visits_stage_check check (stage in ('winners', 'winners_plus', 'one', 'stage0', 'pro_options'));
