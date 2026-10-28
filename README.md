# Cổng hỗ trợ và quản lý nghiên cứu TDU — bản MVP

Hệ thống online quản lý và hỗ trợ nghiên cứu khoa học của Trường Đại học Thành Đông, theo
[sáng kiến v2.0](docs/sang-kien-he-thong-v2.md) và *Kế hoạch thúc đẩy NCKH và công bố 2026–2028*.

Giảng viên tự đăng ký tài khoản, cập nhật lý lịch và hồ sơ nghiên cứu, gửi yêu cầu hỗ trợ và đề xuất người hỗ trợ, dùng thẻ hỗ trợ.
Điều phối viên phân công. Người hỗ trợ nhận việc và bàn giao. Lãnh đạo xem số liệu tự tổng hợp. Quản trị viên duyệt tài khoản, duyệt người hỗ trợ, cấp thẻ, quản lý danh mục.

## Dùng thử ngay (bản demo)

Mở trang, bấm một tài khoản mẫu (mật khẩu chung `Tdu@2026`):

| Tài khoản | Vai trò | Nên thử |
| --- | --- | --- |
| `giangvien@tdu.example` | Giảng viên – chủ nhiệm đề tài | Trang của tôi; xác nhận YC-008 và chấm sao; gửi yêu cầu mới (dùng thẻ); tạo hồ sơ, mời thành viên |
| `dieuphoi@tdu.example` | Điều phối viên | Hàng đợi điều phối; phân công YC-003, YC-007 (người hết suất không chọn được) |
| `hotro@tdu.example` | Người hỗ trợ (thống kê) | Nhận hoặc từ chối YC-009; bàn giao YC-001 |
| `lanhdao@tdu.example` | Lãnh đạo | Báo cáo: chỉ tiêu 3 và 12 của Kế hoạch, hồ sơ cần chú ý, suất người hỗ trợ |
| `admin@tdu.example` | Quản trị viên | Duyệt tài khoản “Nguyễn Văn Mới”, duyệt người hỗ trợ “Tạ Quang Vinh”, cấp thẻ, xem đánh giá |

Bản demo lưu dữ liệu trên trình duyệt của từng người xem: mỗi người thử độc lập, không ai thấy thay đổi của ai.
**Không nhập dữ liệu thật vào bản demo.** Đặt lại dữ liệu mẫu: Quản trị › Dữ liệu › Đặt lại dữ liệu demo.

## Chức năng (giai đoạn 1 của sáng kiến + thẻ hỗ trợ)

| Phân hệ | Có gì |
| --- | --- |
| Đăng nhập / đăng ký | Tự đăng ký bằng email trường (giới hạn tên miền trong `config.js`) → chờ quản trị duyệt |
| Trang của tôi | Thống kê hồ sơ đúng hạn / sắp đến hạn / quá hạn (như hệ thống của Bộ KHCN), thẻ lý lịch, việc cần làm theo vai trò, thẻ hỗ trợ còn lại, thông báo mới |
| Lý lịch khoa học | Học hàm, học vị, đơn vị, ORCID, Scopus ID, Google Scholar, lĩnh vực, công bố tiêu biểu, mức hoàn thiện; danh bạ nhà khoa học |
| Hồ sơ nghiên cứu | 14 trạng thái (Phụ lục 3) gom 5 chặng; danh sách hoặc bảng theo chặng; chủ nhiệm + thành viên; cập nhật tiến độ; minh chứng là đường dẫn Drive/OneDrive; lịch sử; cảnh báo |
| Yêu cầu hỗ trợ | Giảng viên gửi và đề xuất người → điều phối chốt (hạn 5 ngày làm việc) → người hỗ trợ nhận hoặc từ chối → bàn giao → người gửi xác nhận đạt / chưa đạt, chấm 1–5 sao |
| Người hỗ trợ | Tự đăng ký (loại hỗ trợ, chuyên môn, số suất) → quản trị duyệt; danh bạ hiện suất còn lại; hết suất thì không đặt được; tạm ngừng nhận việc |
| Thẻ hỗ trợ | Hạn mức theo năm cho các loại “cần thẻ”; mỗi yêu cầu trừ 1 lượt, hủy thì hoàn lại; quản trị cấp hàng loạt theo khoa |
| Thông báo & văn bản | Thông báo, văn bản, biểu mẫu, hướng dẫn; chuông thông báo cá nhân |
| Báo cáo | Chỉ tiêu 3 (giảng viên có hồ sơ hoạt động) và 12 (yêu cầu được phân công đúng hạn), hồ sơ theo trạng thái và khoa, cần chú ý, nhu cầu hỗ trợ, suất, thẻ; xuất CSV |
| Quản trị | Tài khoản và vai trò, duyệt người hỗ trợ, đánh giá (chỉ quản trị xem), danh mục khoa / loại hỗ trợ / ngưỡng / ngày nghỉ, sao lưu – khôi phục, nhập hồ sơ từ CSV, nhật ký |

**Chưa có trong MVP:** gửi email nhắc việc (hiện chỉ có thông báo trong hệ thống), kết nối HEMIS / ORCID, đăng nhập bằng tài khoản Google hoặc Microsoft, phân hệ kinh phí, chương trình – sự kiện, cơ sở dữ liệu tạp chí (giai đoạn 2–3 của lộ trình).

## Hai chế độ chạy (`assets/js/config.js` › `BACKEND`)

| Chế độ | Dùng khi | Cách hoạt động |
| --- | --- | --- |
| `demo` (mặc định) | Chạy thử, góp ý giao diện | Tài khoản và dữ liệu mẫu từ `data/demo.json`, lưu trên trình duyệt người xem |
| `supabase` | Dùng thật | Tài khoản qua Supabase Auth; dữ liệu trên Postgres; phân quyền ở máy chủ bằng RLS |

### Chuyển sang dùng thật (Supabase, gói miễn phí đủ cho thí điểm 2 khoa)

1. Tạo project tại supabase.com.
2. **SQL Editor**: chạy toàn bộ `supabase/schema.sql` (sửa danh sách khoa ở cuối tệp nếu cần).
3. **Authentication › Providers › Email**: bật Email, nên bật *Confirm email*.
4. Trong `assets/js/config.js`: điền `SUPABASE_URL`, `SUPABASE_ANON_KEY` (Project Settings › API), đặt `BACKEND: "supabase"`, đặt `ALLOWED_EMAIL_DOMAINS` (ví dụ `["thanhdong.edu.vn"]`).
5. Đăng ký tài khoản quản trị đầu tiên trên trang web, rồi chạy trong SQL Editor:
   `update public.app_users set status = 'active', roles = '{quan_tri,dieu_phoi}' where email = 'ten@truong.edu.vn';`
6. Từ đó quản trị viên duyệt các tài khoản khác ngay trong trang Quản trị.

**Phân quyền ở máy chủ** (`supabase/schema.sql`):
- Người chưa đăng nhập hoặc chưa được duyệt chỉ đọc được danh sách khoa.
- Giảng viên chỉ đọc và sửa hồ sơ, yêu cầu có tên mình (chủ nhiệm, thành viên, người gửi, người hỗ trợ được giao), chỉ thấy thẻ của mình.
- Lãnh đạo, điều phối, quản trị xem mọi hồ sơ; lãnh đạo không sửa.
- Đánh giá người hỗ trợ và nhật ký chỉ quản trị đọc được.
- Không ai tự nâng vai trò, tự duyệt mình làm người hỗ trợ hay tự tăng suất.
- Mọi thay đổi dữ liệu được ghi vào bảng `app_audit`.

## Kiểm thử

- `supabase/tests/run.sh`: 42 bài kiểm thử phân quyền chạy trên PostgreSQL cục bộ, có giả lập phần xác thực của Supabase. Hiện đạt 42/42.
- Đã chạy thử trên trình duyệt với cả 5 vai trò, đủ các luồng: đăng ký → duyệt; gửi yêu cầu dùng thẻ; hết lượt và hết suất bị chặn; phân công, nhận, từ chối, bàn giao, xác nhận kèm chấm sao; quyền xem hồ sơ; giao diện điện thoại.
- **Chưa chạy với một project Supabase thật.** Lớp kết nối `assets/js/store.js` dùng thư viện chính thức `supabase-js`; lần đầu chuyển sang Supabase cần thử lại các luồng trên.

## Chạy trên máy

```bash
python3 -m http.server 8000   # rồi mở http://localhost:8000
```

## Đưa lên GitHub Pages

**Settings › Pages** → *Deploy from a branch* → chọn nhánh chứa mã, thư mục `/ (root)` → **Save**.

## Cấu trúc

```
index.html                      Trang duy nhất
assets/js/config.js             Tên trường, chế độ chạy, tên miền email, khóa Supabase
assets/js/domain.js             Trạng thái hồ sơ, luồng hỗ trợ, suất, thẻ, cảnh báo, ngày làm việc
assets/js/store.js              Lưu trữ: demo (trình duyệt) / Supabase
assets/js/ui.js                 Thành phần giao diện, biểu mẫu, CSV
assets/js/app.js                Khung, phân quyền, thông báo, đăng nhập / đăng ký
assets/js/views-home.js         Trang của tôi, Báo cáo, Thông báo & văn bản
assets/js/views-records.js      Hồ sơ nghiên cứu
assets/js/views-support.js      Yêu cầu hỗ trợ, Người hỗ trợ, Thẻ hỗ trợ
assets/js/views-people.js       Lý lịch, danh bạ, Quản trị
data/demo.json                  Dữ liệu demo (sinh bằng tools/generate-demo-data.mjs)
supabase/schema.sql             Lược đồ + phân quyền cho chế độ dùng thật
supabase/tests/                 Kiểm thử phân quyền
docs/sang-kien-he-thong-v2.md   Bản sáng kiến
```
