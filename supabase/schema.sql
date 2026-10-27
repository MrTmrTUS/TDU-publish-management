-- Lược đồ Supabase cho chế độ BACKEND: "supabase" (dữ liệu thật).
-- Chạy trong Supabase › SQL Editor. Sau đó:
--   1) Authentication › Providers › Email: tắt "Allow new users to sign up" (chỉ quản trị viên tạo tài khoản).
--   2) Authentication › Users › Add user: tạo tài khoản quản trị viên (email + mật khẩu).
--   3) Thêm user_id của tài khoản đó vào bảng app_admins (câu lệnh cuối tệp).
--   4) Điền SUPABASE_URL và SUPABASE_ANON_KEY vào assets/js/config.js, đặt BACKEND: "supabase".
--   5) Nạp dữ liệu: đăng nhập › Cấu hình › Nhập/xuất dữ liệu › Khôi phục từ JSON.

create table if not exists public.records (
  id          text primary key,
  collection  text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);
create index if not exists records_collection_idx on public.records (collection);

-- Danh sách tài khoản được quyền đọc/ghi. MVP: một nhóm quản trị; phân quyền theo vai trò và phạm vi khoa ở giai đoạn sau.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note    text
);

alter table public.records    enable row level security;
alter table public.app_admins enable row level security;

create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- Không có chính sách cho vai trò anon => người chưa đăng nhập không đọc được gì.
drop policy if exists records_admin_all on public.records;
create policy records_admin_all on public.records
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists admins_self_read on public.app_admins;
create policy admins_self_read on public.app_admins
  for select to authenticated using (user_id = auth.uid());

-- Nhật ký thay đổi phía máy chủ (bổ sung cho nhật ký nghiệp vụ trong ứng dụng)
create table if not exists public.records_audit (
  audit_id   bigint generated always as identity primary key,
  record_id  text not null,
  collection text,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);
alter table public.records_audit enable row level security;
drop policy if exists audit_admin_read on public.records_audit;
create policy audit_admin_read on public.records_audit for select to authenticated using (public.is_app_admin());

create or replace function public.records_audit_fn() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.records_audit (record_id, collection, action, old_data, new_data)
  values (coalesce(new.id, old.id), coalesce(new.collection, old.collection), tg_op,
          case when tg_op in ('UPDATE', 'DELETE') then old.data end,
          case when tg_op in ('INSERT', 'UPDATE') then new.data end);
  return coalesce(new, old);
end $$;

drop trigger if exists records_audit_trg on public.records;
create trigger records_audit_trg after insert or update or delete on public.records
  for each row execute function public.records_audit_fn();

-- Bước 3: thay <USER_ID> bằng id của tài khoản quản trị (Authentication › Users)
-- insert into public.app_admins (user_id, note) values ('<USER_ID>', 'Quản trị viên');
