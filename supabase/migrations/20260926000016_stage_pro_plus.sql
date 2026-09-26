-- CIRCLE PRO+ opens: "Prabandhak Ki Kahani", the risk-management course, at /pro-plus/ (Stage 5+,
-- after CIRCLE PRO on the ladder). Same one-login, per-stage unlock — nginx auth_request →
-- /smart/api/gate/pro_plus → stage_access. Runs AFTER 0015 (stage_winners_plus) and re-states the
-- FULL stage list: these constraint rewrites are last-writer-wins, so every migration that
-- widens them must carry the union or it silently drops a sibling stage.
alter table stage_access drop constraint if exists stage_access_stage_check;
alter table stage_access add constraint stage_access_stage_check check (stage in ('winners', 'winners_plus', 'one', 'pro_options', 'pro_plus', 'funda'));
alter table stage_visits drop constraint if exists stage_visits_stage_check;
alter table stage_visits add constraint stage_visits_stage_check check (stage in ('winners', 'winners_plus', 'one', 'stage0', 'pro_options', 'pro_plus', 'funda'));
