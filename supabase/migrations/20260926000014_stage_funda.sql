-- CIRCLE F.U.N.D.A opens: "Dhandhe Ki Kahani", the fundamental-analysis course, at /funda/
-- (the new Stage 2; WINNERS, O.N.E and PRO move to Stages 3, 4 and 5 on the ladder). Same
-- one-login, per-stage unlock as the others — nginx auth_request → /smart/api/gate/funda →
-- stage_access. Widen both stage checks so mentors can grant it and visits log.
alter table stage_access drop constraint if exists stage_access_stage_check;
alter table stage_access add constraint stage_access_stage_check check (stage in ('winners', 'one', 'pro_options', 'funda'));
alter table stage_visits drop constraint if exists stage_visits_stage_check;
alter table stage_visits add constraint stage_visits_stage_check check (stage in ('winners', 'one', 'stage0', 'pro_options', 'funda'));
