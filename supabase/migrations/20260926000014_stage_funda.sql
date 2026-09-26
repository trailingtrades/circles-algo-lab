-- CIRCLE F.U.N.D.A opens: "Dhandhe Ki Kahani", the fundamental-analysis course, at /funda/
-- (the new Stage 2; WINNERS, O.N.E and PRO move to Stages 3, 4 and 5 on the ladder). Same
-- one-login, per-stage unlock as the others — nginx auth_request → /smart/api/gate/funda →
-- stage_access. Widen both stage checks so mentors can grant it and visits log. Both lists are
-- the FULL current stage union (last-writer-wins rewrites + rows may pre-date the ledger).
alter table stage_access drop constraint if exists stage_access_stage_check;
alter table stage_access add constraint stage_access_stage_check check (stage in ('winners', 'winners_plus', 'one', 'pro_options', 'funda'));
alter table stage_visits drop constraint if exists stage_visits_stage_check;
alter table stage_visits add constraint stage_visits_stage_check check (stage in ('winners', 'winners_plus', 'one', 'stage0', 'pro_options', 'funda'));
