-- Stage 0 (CIRCLE S.T.A.R.T, /smart/stage0/) goes behind the sign-in gate: the gate route now
-- logs its visits too. stage_access is untouched — Stage 0 needs sign-in only, never a grant.
-- The list is the FULL current stage union, not just what existed when this was written: these
-- constraint rewrites are last-writer-wins, and the live DB can already hold rows for stages
-- whose SQL ran outside the ledger (pro_options did) — a narrower list fails on those rows.
alter table stage_visits drop constraint if exists stage_visits_stage_check;
alter table stage_visits add constraint stage_visits_stage_check check (stage in ('winners', 'winners_plus', 'one', 'stage0', 'pro_options', 'funda'));
