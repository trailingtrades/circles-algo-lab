-- Curriculum v2 (28 Aug 2026): Tier 1 = 21 days (3 weeks x 7), Tier 2 = 10 weeks x 2, Tier 3 = 20 weeks x 1. 61 sessions.
-- Relaxes the v0 structural checks (4 weeks x 5 days x 60 sessions) and adds per-session structured content.
alter table weeks drop constraint if exists weeks_number_check;
alter table weeks add constraint weeks_number_check check (number between 1 and 30);
alter table sessions drop constraint if exists sessions_day_check;
alter table sessions add constraint sessions_day_check check (day between 1 and 7);
alter table sessions drop constraint if exists sessions_number_check;
alter table sessions add constraint sessions_number_check check (number between 1 and 200);

alter table levels add column if not exists subtitle_en text not null default '';
alter table levels add column if not exists subtitle_hi text not null default '';

alter table sessions add column if not exists strategy text;                                   -- named strategy taught/practised, null if none
alter table sessions add column if not exists course_day smallint;                             -- Tier 1: D1..D21; null for other tiers
alter table sessions add column if not exists content jsonb not null default '{}'::jsonb;      -- {topics:[{h,p}], kaam, outcome, tools:[], fun, compliance, journal_prompt}

comment on column sessions.content is 'Structured learner-facing content (Hinglish, Roman script). Editable in admin; seeded from /content/sessions/*.json.';
