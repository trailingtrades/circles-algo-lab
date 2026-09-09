-- 5C Learn · certificate engine support (Phase 5, §11)
-- Public verify endpoint rate limit: hashed client IP, sliding 60s window, checked server-side.
create table if not exists verify_requests (
  id bigserial primary key,
  ip_hash text not null,
  at timestamptz not null default now()
);
create index if not exists verify_requests_ip_at on verify_requests (ip_hash, at desc);
alter table verify_requests enable row level security; alter table verify_requests force row level security;
grant all on verify_requests to service_role;
-- (no policies: only the service role, via the route handler, touches this table)

create or replace function app.verify_rate_ok(p_ip_hash text, p_limit int default 30) returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from verify_requests where at < now() - interval '10 minutes';
  select count(*) into n from verify_requests where ip_hash = p_ip_hash and at > now() - interval '60 seconds';
  insert into verify_requests (ip_hash) values (p_ip_hash);
  return n < p_limit;
end $$;
create or replace function public.verify_rate_ok(p_ip_hash text, p_limit int default 30) returns boolean language sql security definer set search_path = public as $$ select app.verify_rate_ok(p_ip_hash, p_limit) $$;
revoke all on function app.verify_rate_ok(text,int), public.verify_rate_ok(text,int) from public, anon, authenticated;
grant execute on function app.verify_rate_ok(text,int), public.verify_rate_ok(text,int) to service_role;

-- Certificates are never deleted (§11). Revocation flips status and keeps the row.
create or replace function app.certificates_no_delete() returns trigger language plpgsql as $$
begin raise exception 'certificates are never deleted; revoke instead' using errcode = '42501'; end $$;
create trigger certificates_no_delete before delete on certificates for each row execute function app.certificates_no_delete();
alter table certificates add column if not exists issued_by text not null default 'system';
alter table certificates add column if not exists revoked_by uuid references profiles(id) on delete set null;
