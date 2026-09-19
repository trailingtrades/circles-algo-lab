-- CIRCLE S.M.A.R.T: three languages (EN / Hinglish / हिंदी) + answer-key and certificate integrity.
-- Additive and idempotent: safe to apply before the matching app deploy (old code ignores the new columns).
-- Convention: *_en English, *_hi Hinglish (Roman script, unchanged meaning), *_dv Hindi in Devanagari.

-- 1. Language preference: allow Devanagari Hindi.
alter table profiles drop constraint if exists profiles_lang_check;
alter table profiles add constraint profiles_lang_check check (lang in ('en','hi','dv'));

-- 2. Devanagari columns next to the existing EN/Hinglish ones.
alter table levels add column if not exists title_dv text;
alter table levels add column if not exists subtitle_dv text;
alter table weeks add column if not exists title_dv text;
alter table sessions add column if not exists title_dv text;
alter table quiz_questions add column if not exists stem_dv text;
alter table quiz_questions add column if not exists explanation_dv text;

-- 3. Answer key: students may read quiz options, never correct_index or explanations before submitting.
--    Re-assert the column-level grant (now including stem_dv).
revoke select on quiz_questions from authenticated;
grant select (id, session_id, exam_id, stem_en, stem_hi, stem_dv, options, marks, difficulty, sequence, created_at, updated_at) on quiz_questions to authenticated;
-- The seed used to store {"distractor": true|false} inside each option, which revealed the answer to
-- anyone who could read `options`. Strip it from rows already in the table; the new seed never writes it.
update quiz_questions
   set options = (select jsonb_agg(o - 'distractor' order by ord) from jsonb_array_elements(options) with ordinality as t(o, ord))
 where options::text like '%"distractor"%';

-- 4. Stable question order: grading pairs the i-th question shown with the i-th answer-key row, so two
--    rows must never share a position. Renumber (keeping the current order), then enforce it.
with r as (
  select id, (row_number() over (partition by session_id order by sequence, created_at, id) - 1)::smallint as rn
    from quiz_questions where session_id is not null
)
update quiz_questions q set sequence = r.rn from r where q.id = r.id and q.sequence <> r.rn;
with r as (
  select id, (row_number() over (partition by exam_id order by sequence, created_at, id) - 1)::smallint as rn
    from quiz_questions where exam_id is not null
)
update quiz_questions q set sequence = r.rn from r where q.id = r.id and q.sequence <> r.rn;
create unique index if not exists quiz_questions_session_seq on quiz_questions(session_id, sequence) where session_id is not null;
create unique index if not exists quiz_questions_exam_seq on quiz_questions(exam_id, sequence) where exam_id is not null;

-- 5. Certificates: freeze the name printed on the certificate at issue time (the public verify page shows
--    this, not the learner's current, self-editable profile name) ...
alter table certificates add column if not exists learner_name text;
update certificates c set learner_name = p.full_name from profiles p where p.id = c.user_id and c.learner_name is null;
-- ... and allow only one issued certificate per learner per level (stops duplicate-issuance races).
do $$
begin
  if exists (select 1 from certificates where status = 'issued' group by user_id, level_id having count(*) > 1) then
    raise notice 'certificates_one_issued NOT created: duplicate issued certificates exist — revoke the extras, then re-run';
  else
    create unique index if not exists certificates_one_issued on certificates(user_id, level_id) where status = 'issued';
  end if;
end $$;
