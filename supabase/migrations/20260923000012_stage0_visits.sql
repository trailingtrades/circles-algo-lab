-- Stage 0 (CIRCLE S.T.A.R.T, /smart/stage0/) goes behind the sign-in gate: the gate route now
-- logs its visits too. stage_access is untouched — Stage 0 needs sign-in only, never a grant.
alter table stage_visits drop constraint if exists stage_visits_stage_check;
alter table stage_visits add constraint stage_visits_stage_check check (stage in ('winners', 'one', 'stage0'));
