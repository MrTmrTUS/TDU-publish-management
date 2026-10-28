-- Lược đồ Supabase cho chế độ BACKEND: "supabase" (dùng thật).
-- Chạy toàn bộ tệp này trong Supabase › SQL Editor, rồi làm theo các bước ở cuối tệp.
--
-- Mô hình:
--   app_users : một dòng / tài khoản (tạo tự động khi đăng ký), trạng thái pending → active → locked, vai trò, lý lịch (profile).
--   app_data  : mọi dữ liệu khác, theo "collection": records (hồ sơ), supports (yêu cầu hỗ trợ), supporters (đăng ký người hỗ trợ),
--               cards (thẻ hỗ trợ), ratings (đánh giá — chỉ quản trị xem), notices (thông báo), notifications, log, settings.
--               Cột readers = những người được xem dòng đó (chủ nhiệm, thành viên, người gửi, người hỗ trợ được giao...).
-- Quyền (RLS) khớp với App.canSee trong assets/js/app.js:
--   quản trị, điều phối, lãnh đạo xem mọi hồ sơ và yêu cầu; người khác chỉ xem dòng có tên mình trong readers.

-- ============ Bảng ============
create table if not exists public.app_users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  status     text not null default 'pending' check (status in ('pending', 'active', 'locked')),
  roles      text[] not null default '{giang_vien}',
  profile    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_data (
  collection text not null check (collection in ('records', 'supports', 'supporters', 'cards', 'ratings', 'notices', 'notifications', 'log', 'settings')),
  id         text not null,
  data       jsonb not null,
  readers    uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (collection, id)
);
create index if not exists app_data_readers_idx on public.app_data using gin (readers);

-- ============ Hàm kiểm tra quyền (security definer để không vòng lặp RLS) ============
create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_users where id = auth.uid() and status = 'active');
$$;

create or replace function public.has_role(r text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_users where id = auth.uid() and status = 'active' and r = any (roles));
$$;

-- ============ Đăng ký: tạo app_users (chờ duyệt) khi có tài khoản mới ============
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_users (id, email, profile)
  values (new.id, lower(new.email), jsonb_build_object(
    'name',   coalesce(new.raw_user_meta_data ->> 'name', ''),
    'unit',   coalesce(new.raw_user_meta_data ->> 'unit', ''),
    'degree', coalesce(new.raw_user_meta_data ->> 'degree', ''),
    'phone',  coalesce(new.raw_user_meta_data ->> 'phone', '')))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Người không phải quản trị chỉ sửa được lý lịch của mình, không tự đổi trạng thái / vai trò / email.
-- (auth.uid() rỗng = thao tác từ SQL Editor / service role của người quản trị hệ thống: không chặn.)
create or replace function public.guard_app_users() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role('quan_tri') then
    new.status := old.status;
    new.roles  := old.roles;
    new.email  := old.email;
  end if;
  return new;
end $$;

drop trigger if exists guard_app_users on public.app_users;
create trigger guard_app_users before update on public.app_users
  for each row execute function public.guard_app_users();

-- Đăng ký người hỗ trợ: chỉ quản trị duyệt (người dùng tự đăng ký ở trạng thái "cho_duyet",
-- và chỉ chuyển qua lại "da_duyet" ↔ "tam_ngung" khi đã được duyệt)
create or replace function public.guard_supporters() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  old_status text := coalesce(case when tg_op = 'UPDATE' then old.data ->> 'status' end, '');
  new_status text := coalesce(new.data ->> 'status', '');
begin
  if new.collection = 'supporters' and auth.uid() is not null and not public.has_role('quan_tri') then
    if new.data ->> 'userId' is distinct from auth.uid()::text then
      raise exception 'Chỉ được đăng ký người hỗ trợ cho chính mình';
    end if;
    if not (new_status = 'cho_duyet'
            or (old_status in ('da_duyet', 'tam_ngung') and new_status in ('da_duyet', 'tam_ngung'))) then
      raise exception 'Trạng thái người hỗ trợ do quản trị viên duyệt';
    end if;
    if tg_op = 'UPDATE' and old_status in ('da_duyet', 'tam_ngung')
       and (new.data -> 'capacity') is distinct from (old.data -> 'capacity')
       and (new.data -> 'capacity')::int > (old.data -> 'capacity')::int then
      raise exception 'Tăng số suất cần quản trị viên duyệt';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_supporters on public.app_data;
create trigger guard_supporters before insert or update on public.app_data
  for each row execute function public.guard_supporters();

-- ============ RLS ============
alter table public.app_users enable row level security;
alter table public.app_data  enable row level security;

-- app_users: tự xem mình (kể cả khi chờ duyệt); người đang hoạt động xem danh bạ người đang hoạt động; quản trị xem tất cả
drop policy if exists users_select on public.app_users;
create policy users_select on public.app_users for select to authenticated
  using (id = auth.uid() or (public.is_active() and status = 'active') or public.has_role('quan_tri'));
drop policy if exists users_update on public.app_users;
create policy users_update on public.app_users for update to authenticated
  using ((id = auth.uid() and public.is_active()) or public.has_role('quan_tri'))
  with check ((id = auth.uid() and public.is_active()) or public.has_role('quan_tri'));

-- app_data: đọc
drop policy if exists data_select_settings on public.app_data;
create policy data_select_settings on public.app_data for select to anon, authenticated
  using (collection = 'settings');  -- danh sách khoa cần cho màn hình đăng ký
drop policy if exists data_select on public.app_data;
create policy data_select on public.app_data for select to authenticated using (
  public.is_active() and (
    collection in ('notices', 'supporters')
    or (collection in ('records', 'supports') and (public.has_role('quan_tri') or public.has_role('dieu_phoi') or public.has_role('lanh_dao') or auth.uid() = any (readers)))
    or (collection = 'cards' and (public.has_role('quan_tri') or public.has_role('dieu_phoi') or auth.uid() = any (readers)))
    or (collection = 'notifications' and auth.uid() = any (readers))
    or (collection in ('ratings', 'log') and public.has_role('quan_tri'))
  ));

-- app_data: thêm mới
drop policy if exists data_insert on public.app_data;
create policy data_insert on public.app_data for insert to authenticated with check (
  public.is_active() and (
    (collection in ('records', 'supports') and (public.has_role('quan_tri') or public.has_role('dieu_phoi') or auth.uid() = any (readers)))
    or collection = 'supporters'                                   -- kiểm tra chi tiết ở trigger guard_supporters
    or collection in ('notifications', 'log')
    or (collection = 'ratings' and data ->> 'by' = auth.uid()::text)
    or (collection = 'notices' and (public.has_role('quan_tri') or public.has_role('dieu_phoi')))
    or (collection in ('cards', 'settings') and public.has_role('quan_tri'))
  ));

-- app_data: sửa. Với hồ sơ / yêu cầu: ai đang có tên trong readers thì sửa được, và sau khi sửa vẫn phải còn tên mình
-- (ứng dụng luôn giữ người đang thao tác trong readers, kể cả người hỗ trợ vừa từ chối việc).
drop policy if exists data_update on public.app_data;
create policy data_update on public.app_data for update to authenticated using (
  public.is_active() and (
    (collection in ('records', 'supports') and (public.has_role('quan_tri') or public.has_role('dieu_phoi') or auth.uid() = any (readers)))
    or (collection = 'supporters' and (public.has_role('quan_tri') or data ->> 'userId' = auth.uid()::text))
    or (collection = 'notifications' and auth.uid() = any (readers))
    or (collection = 'notices' and (public.has_role('quan_tri') or public.has_role('dieu_phoi')))
    or (collection in ('cards', 'settings') and public.has_role('quan_tri'))
  ));

-- app_data: xóa (chỉ thông báo, bởi quản trị / điều phối)
drop policy if exists data_delete on public.app_data;
create policy data_delete on public.app_data for delete to authenticated using (
  collection = 'notices' and (public.has_role('quan_tri') or public.has_role('dieu_phoi')));

grant usage on schema public to anon, authenticated;
grant select on public.app_data to anon;
grant select, insert, update, delete on public.app_data to authenticated;
grant select, update on public.app_users to authenticated;

-- ============ Nhật ký thay đổi phía máy chủ (đối soát) ============
create table if not exists public.app_audit (
  audit_id   bigint generated always as identity primary key,
  collection text,
  record_id  text not null,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);
alter table public.app_audit enable row level security;
drop policy if exists audit_admin_read on public.app_audit;
create policy audit_admin_read on public.app_audit for select to authenticated using (public.has_role('quan_tri'));
grant select on public.app_audit to authenticated;

create or replace function public.app_audit_fn() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.collection, old.collection) in ('notifications') then return coalesce(new, old); end if;
  insert into public.app_audit (collection, record_id, action, old_data, new_data)
  values (coalesce(new.collection, old.collection), coalesce(new.id, old.id), tg_op,
          case when tg_op in ('UPDATE', 'DELETE') then old.data end,
          case when tg_op in ('INSERT', 'UPDATE') then new.data end);
  return coalesce(new, old);
end $$;

drop trigger if exists app_audit_trg on public.app_data;
create trigger app_audit_trg after insert or update or delete on public.app_data
  for each row execute function public.app_audit_fn();

-- ============ Cấu hình ban đầu (sửa danh sách khoa cho đúng) ============
insert into public.app_data (collection, id, data, readers) values ('settings', 'settings', '{
  "units": ["Khoa Y – Dược", "Khoa Kinh tế", "Phòng KHCN & HTQT"],
  "staleDays": 30, "soonDays": 7, "triageWorkdays": 5, "resubmitDays": 30, "holidays": [],
  "supportTypes": [
    {"code": "y_tuong", "label": "Phát triển ý tưởng", "needsCard": false}, {"code": "de_cuong", "label": "Hoàn thiện đề cương", "needsCard": false},
    {"code": "thong_ke", "label": "Thống kê – phân tích", "needsCard": true}, {"code": "dao_duc", "label": "Đạo đức – dữ liệu", "needsCard": false},
    {"code": "viet_bai", "label": "Viết bản thảo", "needsCard": false}, {"code": "phan_bien", "label": "Phản biện nội bộ", "needsCard": false},
    {"code": "tieng_anh", "label": "Hiệu đính tiếng Anh", "needsCard": true}, {"code": "tap_chi", "label": "Lựa chọn tạp chí", "needsCard": false},
    {"code": "tra_loi", "label": "Trả lời phản biện", "needsCard": false}, {"code": "nop_lai", "label": "Nộp lại sau từ chối", "needsCard": false}
  ]}'::jsonb, '{}')
on conflict (collection, id) do nothing;

-- ============ Các bước sau khi chạy tệp này ============
-- 1) Authentication › Providers › Email: bật Email; nên bật "Confirm email".
-- 2) Đăng ký tài khoản quản trị đầu tiên ngay trên trang web (nút "Đăng ký tài khoản"), rồi chạy câu lệnh dưới
--    (thay email) để kích hoạt và gán vai trò quản trị:
-- update public.app_users set status = 'active', roles = '{quan_tri,dieu_phoi}' where email = 'ten@truong.edu.vn';
-- 3) Từ đó, quản trị viên duyệt các tài khoản khác ngay trong trang Quản trị.
