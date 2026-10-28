-- Giả lập phần nền của Supabase để chạy schema.sql trên PostgreSQL thường (chỉ dùng cho kiểm thử, KHÔNG chạy trên Supabase).
-- Giả lập phần nền của Supabase: vai trò anon/authenticated, schema auth, auth.uid()
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
