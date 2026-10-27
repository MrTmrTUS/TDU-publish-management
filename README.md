# Dashboard theo dõi nghiên cứu & công bố

Dashboard web đơn giản để theo dõi **hồ sơ nghiên cứu đang ở đâu, đang vướng gì, cần hỗ trợ gì**. Bám theo *Kế hoạch thúc đẩy NCKH và công bố 2026–2028*:
bảng pipeline bản thảo (Phụ lục 3), đầu mối hỗ trợ một cửa (mục 5.3) và cảnh báo (mục 5.10).

- Không cần cài đặt hay build: HTML + CSS + JavaScript thuần, chạy trên GitHub Pages.
- Có tài khoản quản trị để nhập và cập nhật dữ liệu.

## Đăng nhập bản thử

Tài khoản `admin`, mật khẩu `Tdu@2026`. Đổi tại **Cài đặt › Tài khoản** rồi dán mã băm hiển thị vào `passwordSha256` trong `assets/js/config.js`.

## Bốn màn hình

| Màn hình | Dùng để |
|---|---|
| **Tổng quan** | Số hồ sơ đang theo dõi, đang ở tạp chí, đã chấp nhận/xuất bản, yêu cầu hỗ trợ đang mở; hồ sơ đang ở đâu (theo trạng thái); danh sách cần chú ý; đang cần hỗ trợ gì; bảng theo khoa. Dùng cho giao ban hằng tháng. |
| **Hồ sơ nghiên cứu** | Bảng pipeline (mã, tên, khoa/nhóm, tác giả liên hệ, trạng thái, tạp chí/Q, việc tiếp theo, hạn, cập nhật, cảnh báo); xem dạng danh sách hoặc theo chặng; lọc; xuất CSV. Mỗi hồ sơ có trang chi tiết với nút **Cập nhật tiến độ** và lịch sử cập nhật. |
| **Yêu cầu hỗ trợ** | 3 cột: *Mới gửi → Đang xử lý → Đã xong*. Người hỗ trợ bấm **Nhận xử lý** (ghi tên và hạn), rồi **Hoàn thành** (ghi kết quả). |
| **Cài đặt & dữ liệu** | Danh sách khoa, ngưỡng nhắc việc, ngày nghỉ lễ; nhập hồ sơ từ Excel (CSV); xuất bản, sao lưu; đổi mật khẩu. |

**Trạng thái hồ sơ** (Phụ lục 3), gom thành 5 chặng:

| Chặng | Trạng thái |
|---|---|
| Chuẩn bị nghiên cứu | Ý tưởng · Đề cương · Đạo đức · Thu thập dữ liệu · Phân tích |
| Viết & phản biện nội bộ | Viết bài · Phản biện nội bộ · Sẵn sàng nộp |
| Đang ở tạp chí | Đang phản biện · Sửa bài · Bị từ chối – chờ nộp lại |
| Đã có kết quả | Chấp nhận · Xuất bản |
| Tạm dừng | Tạm dừng (cần lý do và mốc xem xét lại) |

**Cảnh báo “cần chú ý”** (có thể đổi ngưỡng trong Cài đặt):
- Hồ sơ quá 30 ngày chưa cập nhật.
- Việc tiếp theo quá hạn; hạn sửa bài còn ≤ 7 ngày.
- Bị từ chối nhưng chưa có kế hoạch nộp lại, hoặc quá 30 ngày chưa nộp lại.
- Hồ sơ có ghi rủi ro (đạo đức, dữ liệu, tác giả, tạp chí nghi săn mồi…).
- Yêu cầu hỗ trợ quá 5 ngày làm việc chưa có người nhận, hoặc quá hạn hoàn thành.

## Chạy trên máy

```bash
python3 -m http.server 8000
# mở http://localhost:8000
```

## Đưa lên GitHub Pages

**Settings › Pages** → *Deploy from a branch* → chọn nhánh chứa mã, thư mục `/ (root)` → **Save**. Sau 1–2 phút trang có tại `https://<tài-khoản>.github.io/TDU-publish-management/`.

## Lưu dữ liệu ở đâu (`assets/js/config.js` › `BACKEND`)

| Chế độ | Dùng khi | Cách hoạt động |
|---|---|---|
| `static` (mặc định) | Chạy thử với dữ liệu giả định | Dữ liệu là tệp `data/data.json`. Sửa trên trình duyệt → **Cài đặt › Tải data.json** → tải tệp lên thư mục `data/` của repo. Ai có đường dẫn đều tải được tệp này, mật khẩu chỉ chặn ở giao diện. |
| `supabase` | Dữ liệu thật | Dữ liệu và tài khoản trên Supabase (gói miễn phí đủ dùng). Chưa đăng nhập thì không đọc được gì; sửa là lưu ngay. |

Chuyển sang Supabase: tạo project → chạy `supabase/schema.sql` trong SQL Editor → tắt đăng ký tự do, tạo tài khoản quản trị và thêm vào bảng `app_admins` (hướng dẫn ở đầu tệp SQL) → điền `SUPABASE_URL`, `SUPABASE_ANON_KEY`, đặt `BACKEND: "supabase"` → đăng nhập, **Cài đặt › Khôi phục từ JSON** để nạp dữ liệu.

## Nhập hồ sơ từ Excel

**Cài đặt › Tải tệp mẫu** → điền → *Lưu thành CSV UTF-8* → **Kiểm tra**. Cột bắt buộc: Mã, Tên hồ sơ, Khoa (phải có trong danh sách khoa), Trạng thái (ghi đúng tên như bảng trên). Ngày ghi `DD/MM/YYYY`. Hệ thống báo lỗi từng dòng; còn lỗi thì không ghi dòng nào.

## Cấu trúc

```
index.html               Trang duy nhất
assets/js/config.js      Cấu hình: tên trường, chế độ dữ liệu, tài khoản
assets/js/domain.js      Trạng thái, loại hỗ trợ, ngày làm việc, quy tắc cảnh báo
assets/js/store.js       Lưu dữ liệu (static / supabase)
assets/js/ui.js          Thành phần giao diện dùng chung
assets/js/app.js         Khung, điều hướng, đăng nhập, lịch sử cập nhật
assets/js/views.js       4 màn hình và các biểu mẫu
assets/css/styles.css    Giao diện sáng/tối, dùng được trên điện thoại
data/data.json           Dữ liệu (hiện là dữ liệu minh họa)
supabase/schema.sql      Lược đồ cho chế độ Supabase
tools/generate-sample-data.mjs   Sinh lại dữ liệu minh họa
```
