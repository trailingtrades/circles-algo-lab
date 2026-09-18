-- Stage grants get an optional start date (Rahul, 18 Sep 2026): before starts_at the gate
-- answers 403 exactly like an expired grant, so a batch can be sold today and opened on
-- its start date. Null = active immediately (existing rows unchanged).
alter table stage_access add column if not exists starts_at timestamptz;
