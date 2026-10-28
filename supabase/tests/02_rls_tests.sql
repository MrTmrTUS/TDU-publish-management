-- Kiểm thử phân quyền (RLS): mỗi dòng in PASS/FAIL. Chạy theo supabase/tests/run.sh trên CSDL trống.
\set QUIET on
\pset format unaligned
\pset tuples_only on
-- người dùng: A quản trị, C điều phối, L lãnh đạo, G1 G2 giảng viên, S người hỗ trợ, P chờ duyệt
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','a@t.vn','{"name":"Admin","unit":"KHCN"}'),
 ('00000000-0000-0000-0000-00000000000c','c@t.vn','{"name":"Coord"}'),
 ('00000000-0000-0000-0000-00000000000d','l@t.vn','{"name":"Leader"}'),
 ('00000000-0000-0000-0000-000000000001','g1@t.vn','{"name":"GV1","unit":"YD"}'),
 ('00000000-0000-0000-0000-000000000002','g2@t.vn','{"name":"GV2","unit":"KT"}'),
 ('00000000-0000-0000-0000-000000000005','s@t.vn','{"name":"Supporter"}'),
 ('00000000-0000-0000-0000-00000000000f','p@t.vn','{"name":"Pending"}');
select 'trigger tạo app_users: ' || count(*) || ' dòng, tất cả pending=' || bool_and(status='pending') from app_users;
update app_users set status='active', roles='{quan_tri}' where email='a@t.vn';
update app_users set status='active', roles='{dieu_phoi,giang_vien}' where email='c@t.vn';
update app_users set status='active', roles='{lanh_dao}' where email='l@t.vn';
update app_users set status='active' where email in ('g1@t.vn','g2@t.vn','s@t.vn');
-- dữ liệu nền (bằng postgres)
insert into app_data (collection,id,data,readers) values
 ('records','HS-1','{"id":"HS-1","ownerId":"00000000-0000-0000-0000-000000000001"}','{00000000-0000-0000-0000-000000000001}'),
 ('records','HS-2','{"id":"HS-2","ownerId":"00000000-0000-0000-0000-000000000002"}','{00000000-0000-0000-0000-000000000002}'),
 ('supports','YC-1','{"id":"YC-1","supporterId":"00000000-0000-0000-0000-000000000005"}','{00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000005}'),
 ('cards','th-g1','{"id":"th-g1","holderId":"00000000-0000-0000-0000-000000000001"}','{00000000-0000-0000-0000-000000000001}'),
 ('cards','th-g2','{"id":"th-g2"}','{00000000-0000-0000-0000-000000000002}'),
 ('notices','tb-1','{"id":"tb-1"}','{}'),
 ('ratings','dg-1','{"id":"dg-1"}','{}'),
 ('log','l-1','{"id":"l-1"}','{}'),
 ('supporters','sp-s','{"id":"sp-s","userId":"00000000-0000-0000-0000-000000000005","status":"da_duyet","capacity":2}','{}');

create or replace function pg_temp.t(name text, ok boolean) returns text language sql as $$ select case when ok then 'PASS  ' else 'FAIL  ' end || name $$;
grant execute on function pg_temp.t(text, boolean) to anon, authenticated;

-- ===== Giảng viên G1 =====
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select pg_temp.t('G1 thấy danh bạ người hoạt động, không thấy người chờ duyệt', (select count(*) from app_users) = 6 and not exists (select 1 from app_users where status='pending'));
select pg_temp.t('G1 chỉ thấy hồ sơ của mình', (select string_agg(id, ',') from app_data where collection='records') = 'HS-1');
select pg_temp.t('G1 thấy yêu cầu có tên mình', (select count(*) from app_data where collection='supports') = 1);
select pg_temp.t('G1 chỉ thấy thẻ của mình', (select string_agg(id, ',') from app_data where collection='cards') = 'th-g1');
select pg_temp.t('G1 không thấy đánh giá và nhật ký', (select count(*) from app_data where collection in ('ratings','log')) = 0);
select pg_temp.t('G1 thấy thông báo và người hỗ trợ', (select count(*) from app_data where collection in ('notices','supporters')) = 2);
update app_users set profile = profile || '{"orcid":"0000-0001-0000-0000"}', status='active', roles='{quan_tri}' where id = auth.uid();
select pg_temp.t('G1 sửa được lý lịch nhưng không tự nâng vai trò', (select profile->>'orcid' = '0000-0001-0000-0000' and roles = '{giang_vien}' from app_users where id = auth.uid()));
update app_users set profile = '{"name":"hack"}' where email = 'g2@t.vn';
reset role; select pg_temp.t('G1 không sửa được lý lịch người khác', (select profile->>'name' from app_users where email='g2@t.vn') = 'GV2');
set role authenticated;
do $$ begin insert into app_data values ('records','HS-3','{"id":"HS-3"}','{00000000-0000-0000-0000-000000000001}'); raise notice 'PASS  G1 tạo hồ sơ có tên mình';
  exception when others then raise notice 'FAIL  G1 tạo hồ sơ: %', sqlerrm; end $$;
do $$ begin insert into app_data values ('records','HS-4','{"id":"HS-4"}','{00000000-0000-0000-0000-000000000002}'); raise notice 'FAIL  G1 tạo hồ sơ chỉ có người khác';
  exception when others then raise notice 'PASS  G1 không tạo hồ sơ không có tên mình'; end $$;
update app_data set data = data || '{"x":1}' where collection='records' and id='HS-2';
reset role; select pg_temp.t('G1 không sửa được hồ sơ người khác', (select data->>'x' from app_data where id='HS-2') is null);
set role authenticated;
do $$ begin insert into app_data values ('cards','th-x','{}','{00000000-0000-0000-0000-000000000001}'); raise notice 'FAIL  G1 tự cấp thẻ';
  exception when others then raise notice 'PASS  G1 không tự cấp thẻ'; end $$;
update app_data set data = '{"units":[]}' where collection='settings';
reset role; select pg_temp.t('G1 không sửa được cấu hình', (select jsonb_array_length(data->'units') from app_data where collection='settings') > 0);
set role authenticated;
do $$ begin insert into app_data values ('ratings','dg-2','{"by":"00000000-0000-0000-0000-000000000001","stars":5}','{}'); raise notice 'PASS  G1 gửi đánh giá';
  exception when others then raise notice 'FAIL  G1 gửi đánh giá: %', sqlerrm; end $$;
do $$ begin insert into app_data values ('ratings','dg-3','{"by":"00000000-0000-0000-0000-000000000002","stars":1}','{}'); raise notice 'FAIL  G1 giả danh người khác chấm điểm';
  exception when others then raise notice 'PASS  G1 không giả danh người khác chấm điểm'; end $$;
select pg_temp.t('G1 vẫn không đọc được đánh giá vừa gửi', (select count(*) from app_data where collection='ratings') = 0);
do $$ begin insert into app_data values ('supporters','sp-g1','{"userId":"00000000-0000-0000-0000-000000000001","status":"da_duyet"}','{}'); raise notice 'FAIL  G1 tự duyệt mình làm người hỗ trợ';
  exception when others then raise notice 'PASS  G1 không tự duyệt người hỗ trợ (%)', sqlerrm; end $$;
do $$ begin insert into app_data values ('supporters','sp-g1','{"userId":"00000000-0000-0000-0000-000000000001","status":"cho_duyet","capacity":2}','{}'); raise notice 'PASS  G1 đăng ký người hỗ trợ (chờ duyệt)';
  exception when others then raise notice 'FAIL  G1 đăng ký người hỗ trợ: %', sqlerrm; end $$;
do $$ begin update app_data set data = data || '{"status":"da_duyet"}' where id='sp-g1'; raise notice 'FAIL  G1 tự chuyển sang đã duyệt';
  exception when others then raise notice 'PASS  G1 không tự chuyển sang đã duyệt'; end $$;
do $$ begin insert into app_data values ('supporters','sp-fake','{"userId":"00000000-0000-0000-0000-000000000002","status":"cho_duyet"}','{}'); raise notice 'FAIL  G1 đăng ký hộ người khác';
  exception when others then raise notice 'PASS  G1 không đăng ký hộ người khác'; end $$;
do $$ begin insert into app_data values ('notifications','n-1','{"userId":"00000000-0000-0000-0000-000000000002"}','{00000000-0000-0000-0000-000000000002}'); raise notice 'PASS  G1 gửi thông báo cho G2';
  exception when others then raise notice 'FAIL  G1 gửi thông báo: %', sqlerrm; end $$;
select pg_temp.t('G1 không đọc thông báo của G2', (select count(*) from app_data where collection='notifications') = 0);
do $$ begin insert into app_data values ('notices','tb-2','{}','{}'); raise notice 'FAIL  G1 đăng thông báo chung';
  exception when others then raise notice 'PASS  G1 không đăng thông báo chung'; end $$;

-- ===== Người hỗ trợ S: từ chối việc (bỏ mình khỏi readers) =====
reset role; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
update app_data set data = data || '{"supporterId":"","status":"cho_duyet"}', readers = '{00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000005}' where collection='supports' and id='YC-1';
reset role; select pg_temp.t('S từ chối việc vẫn lưu được (giữ quyền xem)', (select data->>'status' from app_data where id='YC-1') = 'cho_duyet');
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
do $$ begin update app_data set readers = '{00000000-0000-0000-0000-000000000002}' where collection='supports' and id='YC-1'; raise notice 'FAIL  S trao dòng cho người khác rồi tự rút';
  exception when others then raise notice 'PASS  S không trao dòng cho người khác rồi tự rút'; end $$;
update app_data set data = data || '{"status":"tam_ngung"}' where id='sp-s';
reset role; select pg_temp.t('S tự tạm ngừng nhận việc', (select data->>'status' from app_data where id='sp-s') = 'tam_ngung');
set role authenticated;
do $$ begin update app_data set data = data || '{"capacity":10}' where id='sp-s'; raise notice 'FAIL  S tự tăng suất';
  exception when others then raise notice 'PASS  S không tự tăng suất'; end $$;

-- ===== Người chờ duyệt P và khách chưa đăng nhập =====
reset role; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000f',false);
select pg_temp.t('P chờ duyệt chỉ thấy chính mình', (select count(*) from app_users) = 1);
select pg_temp.t('P chờ duyệt chỉ đọc được cấu hình', (select string_agg(distinct collection, ',') from app_data) = 'settings');
do $$ begin insert into app_data values ('records','HS-P','{}','{00000000-0000-0000-0000-00000000000f}'); raise notice 'FAIL  P chờ duyệt tạo hồ sơ';
  exception when others then raise notice 'PASS  P chờ duyệt không tạo được hồ sơ'; end $$;
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select pg_temp.t('Khách: chỉ đọc cấu hình (danh sách khoa)', (select string_agg(collection, ',') from app_data) = 'settings');
do $$ begin perform 1 from app_users; raise notice 'FAIL  Khách đọc app_users'; exception when others then raise notice 'PASS  Khách không đọc được app_users'; end $$;

-- ===== Lãnh đạo L: xem tất cả, không sửa =====
reset role; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
select pg_temp.t('Lãnh đạo xem mọi hồ sơ', (select count(*) from app_data where collection='records') = 3);
update app_data set data = data || '{"x":2}' where collection='records';
reset role; select pg_temp.t('Lãnh đạo không sửa hồ sơ', not exists (select 1 from app_data where collection='records' and data->>'x' = '2'));

-- ===== Điều phối C =====
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
update app_data set data = data || '{"status":"cho_nhan","supporterId":"00000000-0000-0000-0000-000000000005"}' where collection='supports' and id='YC-1';
reset role; select pg_temp.t('Điều phối phân công được', (select data->>'status' from app_data where id='YC-1') = 'cho_nhan');
set role authenticated;
do $$ begin insert into app_data values ('notices','tb-3','{}','{}'); delete from app_data where collection='notices' and id='tb-3'; raise notice 'PASS  Điều phối đăng và xóa thông báo';
  exception when others then raise notice 'FAIL  Điều phối thông báo: %', sqlerrm; end $$;
select pg_temp.t('Điều phối không đọc đánh giá', (select count(*) from app_data where collection='ratings') = 0);

-- ===== Quản trị A =====
reset role; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
update app_users set status = 'active' where email = 'p@t.vn';
update app_data set data = data || '{"status":"da_duyet"}' where id = 'sp-g1';
select pg_temp.t('Quản trị duyệt tài khoản', (select status from app_users where email='p@t.vn') = 'active');
select pg_temp.t('Quản trị duyệt người hỗ trợ', (select data->>'status' from app_data where id='sp-g1') = 'da_duyet');
select pg_temp.t('Quản trị đọc đánh giá + nhật ký', (select count(*) from app_data where collection in ('ratings','log')) = 3);
select pg_temp.t('Quản trị đọc nhật ký máy chủ', (select count(*) from app_audit) > 0);
reset role;
select pg_temp.t('Nhật ký máy chủ ghi các thay đổi', (select count(*) from app_audit) >= 8);
