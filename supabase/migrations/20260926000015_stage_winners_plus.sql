-- CIRCLE W.I.N.N.E.R.S + opens: Algo Ki Kahani at /winners-plus/ (Stage 3+, beside WINNERS on
-- the funda-renumbered ladder). Same one-login, per-stage unlock — nginx auth_request →
-- /smart/api/gate/winners_plus → stage_access. Runs AFTER 0014 (stage_funda) and re-states the
-- FULL stage list: these constraint rewrites are last-writer-wins, so every migration that
-- widens them must carry the union or it silently drops a sibling stage.
alter table stage_access drop constraint if exists stage_access_stage_check;
alter table stage_access add constraint stage_access_stage_check check (stage in ('winners', 'winners_plus', 'one', 'pro_options', 'funda'));
alter table stage_visits drop constraint if exists stage_visits_stage_check;
alter table stage_visits add constraint stage_visits_stage_check check (stage in ('winners', 'winners_plus', 'one', 'stage0', 'pro_options', 'funda'));
