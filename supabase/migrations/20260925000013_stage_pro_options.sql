-- CIRCLE PRO's first track opens: Options 117 at /pro/options/ (Stage 4). Same one-login,
-- per-stage unlock as WINNERS and O.N.E — nginx auth_request → /smart/api/gate/pro_options →
-- stage_access. Widen both stage checks so mentors can grant it and visits log. Both lists are
-- the FULL current stage union (last-writer-wins rewrites + rows may pre-date the ledger).
alter table stage_access drop constraint if exists stage_access_stage_check;
alter table stage_access add constraint stage_access_stage_check check (stage in ('winners', 'winners_plus', 'one', 'pro_options', 'funda'));
alter table stage_visits drop constraint if exists stage_visits_stage_check;
alter table stage_visits add constraint stage_visits_stage_check check (stage in ('winners', 'winners_plus', 'one', 'stage0', 'pro_options', 'funda'));
