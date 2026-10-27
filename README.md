# Dashboard điều phối NCKH & công bố quốc tế — bản MVP

Web dashboard theo tài liệu *Đặc tả ý tưởng dashboard hỗ trợ nghiên cứu khoa học và công bố quốc tế v1.0 (27/10/2026)*.
Bản MVP dùng để thiết kế giao diện, đi qua các luồng chính bằng **dữ liệu giả định** (đặc tả mục 12) và lấy ý kiến trước khi chốt nghiệp vụ.

- Không cần cài đặt hay build: HTML + CSS + JavaScript thuần, chạy trên GitHub Pages.
- Có đăng nhập quản trị viên để nhập liệu, cập nhật và xuất bản dữ liệu.
- Mọi thay đổi tự sinh **nhật ký sự kiện** (giá trị trước/sau, ngày xảy ra và ngày nhập, người ghi, lý do, minh chứng, đính chính).

## Đăng nhập bản thử

| Tài khoản | Mật khẩu |
|---|---|
| `admin` | `Tdu@2026` |

Đổi mật khẩu trước khi dùng thật: **Cấu hình › Tài khoản**, rồi dán mã băm hiển thị vào `passwordSha256` trong `assets/js/config.js`.

## Màn hình đã có (đối chiếu đặc tả mục 5)

| Mã | Màn hình | Trạng thái MVP |
|---|---|---|
| M01 | Công việc nghiên cứu của tôi | Việc cần xử lý theo hạn, hồ sơ tham gia, yêu cầu hỗ trợ, cập nhật gần nhất; cập nhật nhanh. Quản trị viên chọn “xem như” một người. |
| M02 | Danh mục nghiên cứu & bản thảo | Dạng danh sách và dạng theo giai đoạn (cùng dữ liệu); 9 bộ lọc; xuất CSV. |
| M03 | Chi tiết hồ sơ | Tiến độ (bước giai đoạn), việc tiếp theo, mốc công việc + phân bổ thời gian theo tình trạng, hỗ trợ, công bố, tài liệu, lịch sử + đính chính. |
| M04 | Hàng đợi hỗ trợ | Nhóm theo 7 tình trạng hoặc theo chuyên gia; ưu tiên quá hạn / sắp đến hạn / chặn mốc; luồng xử lý đầy đủ theo mục 8. |
| M05 | Tổng quan điều hành | Ảnh chụp tại ngày chốt + sự kiện trong kỳ, K01–K05, K07–K11, điểm nghẽn, nhu cầu so với khả năng, nguồn lực cần quyết định. Mỗi chỉ số có ⓘ định nghĩa; mỗi biểu đồ có bảng số liệu. |
| M06 | Chuyên gia & gói hỗ trợ | Lĩnh vực, gói, điều kiện, khả năng nhận việc, tải hiện tại, lịch sử phân công. |
| M07 | Tạp chí & phương án nộp bài | Phân hạng lưu theo hệ thống, nhóm ngành, năm, nguồn, ngày kiểm tra; thiếu thông tin → “Cần xác minh”. 3–5 phương án/bản thảo. |
| M08 | Báo cáo & cấu hình | Báo cáo K01–K12 (kèm phạm vi, kỳ, ngày chốt, phiên bản quy tắc, dữ liệu thiếu), cảnh báo CB01–CB10, ngưỡng, ngày nghỉ, người dùng, đơn vị, nhập/xuất. |

**Tình huống nghiệm thu đã có xử lý:** NT01–NT10, NT12–NT14, NT16–NT18 (ví dụ NC-01: 16 ngày thực hiện + 7 tạm dừng + 11 chờ nội bộ = 34 ngày lịch).
**Chưa có trong MVP (giai đoạn tiếp theo):** NT11 phân quyền theo vai trò/phạm vi (cần Supabase + nhiều tài khoản), NT15 người dùng ở múi giờ khác (đã tính theo Asia/Ho_Chi_Minh), K06 và K12 (cần đơn vị định nghĩa), gửi nhắc việc qua email, kéo thả trên bảng giai đoạn.

## Chạy trên máy

```bash
python3 -m http.server 8000
# mở http://localhost:8000
```

(Mở trực tiếp tệp `index.html` sẽ không tải được `data/data.json`.)

## Đưa lên GitHub Pages

1. Vào **Settings › Pages** của repo.
2. *Source*: **Deploy from a branch**; *Branch*: chọn nhánh chứa mã (ví dụ `main`) và thư mục `/ (root)`, bấm **Save**.
3. Sau 1–2 phút, trang có tại `https://<tài-khoản>.github.io/TDU-publish-management/`.

## Hai chế độ dữ liệu (`assets/js/config.js` › `BACKEND`)

| Chế độ | Dùng khi | Cách hoạt động |
|---|---|---|
| `static` (mặc định) | Thử nghiệm với **dữ liệu giả định** | Dữ liệu là `data/data.json`. Quản trị viên sửa trên trình duyệt (bản nháp lưu trên máy) → **Cấu hình › Nhập/xuất › Tải data.json** → tải tệp lên thư mục `data/` của repo → trang cập nhật cho mọi người. Ai có đường dẫn đều tải được `data.json`, và mật khẩu chỉ chặn ở giao diện. |
| `supabase` | **Dữ liệu thật** | Dữ liệu và tài khoản nằm trên Supabase (gói miễn phí đủ cho thí điểm). Người chưa đăng nhập không đọc được gì; sửa là lưu ngay; máy chủ ghi thêm nhật ký thay đổi. |

### Chuyển sang Supabase

1. Tạo project tại supabase.com.
2. **SQL Editor**: chạy toàn bộ `supabase/schema.sql`.
3. **Authentication › Providers › Email**: tắt *Allow new users to sign up*.
4. **Authentication › Users › Add user**: tạo tài khoản quản trị; chạy dòng `insert into public.app_admins …` cuối tệp SQL với user id vừa tạo.
5. **Project Settings › API**: chép *Project URL* và *anon public key* vào `SUPABASE_URL`, `SUPABASE_ANON_KEY`; đặt `BACKEND: "supabase"`.
6. Đăng nhập › **Cấu hình › Nhập/xuất › Khôi phục từ JSON** để nạp dữ liệu ban đầu (hoặc bắt đầu trống).

## Nhập dữ liệu từ CSV

**Cấu hình › Nhập/xuất dữ liệu**: chọn loại (Nghiên cứu, Bản thảo, Yêu cầu hỗ trợ, Người dùng) › **Tải tệp mẫu** › điền bằng Excel › *Lưu thành CSV UTF-8* › **Kiểm tra**.
Hệ thống báo kết quả từng dòng (mã trùng, thiếu cột bắt buộc, sai định dạng ngày, mã tham chiếu không tồn tại, ngày kết thúc trước ngày bắt đầu…). Còn lỗi thì không ghi dòng nào.

Ngày nhận `YYYY-MM-DD` hoặc `DD/MM/YYYY`. Danh sách (thành viên, vai trò…) phân tách bằng `;`. Cột danh mục nhận **mã** hoặc **nhãn tiếng Việt**:

| Cột | Mã hợp lệ |
|---|---|
| Giai đoạn nghiên cứu | `y_tuong`, `de_cuong`, `dao_duc`, `du_lieu`, `phan_tich`, `hoan_thanh` |
| Giai đoạn bản thảo | `viet_bai`, `phan_bien_nb`, `san_sang`, `da_nop`, `sua_bai`, `chap_nhan`, `xuat_ban` |
| Tình trạng thực hiện | `dang_thuc_hien`, `cho_noi_bo`, `cho_ben_ngoai`, `tam_dung`, `hoan_thanh` |
| Tình trạng yêu cầu | `moi_gui`, `can_bo_sung`, `da_phan_loai`, `da_phan_cong`, `dang_xu_ly`, `cho_xac_nhan`, `hoan_thanh`, `dong`, `mo_lai` |
| Loại hỗ trợ | `thong_ke`, `phuong_phap`, `phan_bien`, `ngon_ngu`, `chon_tap_chi`, `dao_duc`, `co_van`, `kinh_phi`, `khac` |
| Lộ trình | `moi`, `co_san`, `cuu_ban_thao`, `hoi_cuu` |
| Vai trò | `giang_vien`, `chu_nhiem`, `chuyen_gia`, `dieu_phoi`, `lanh_dao`, `quan_tri` |
| Mức xác minh | `da_xac_minh`, `tu_khai`, `nhap_lai` |

## Cấu trúc thư mục

```
index.html                  Trang duy nhất (SPA, điều hướng bằng #/…)
assets/js/config.js         Cấu hình: tên trường, chế độ dữ liệu, tài khoản, Supabase
assets/js/domain.js         Nghiệp vụ: từ điển trạng thái, ngày làm việc, chỉ số K01–K11, cảnh báo CB01–CB10
assets/js/store.js          Lớp dữ liệu (static / supabase)
assets/js/ui.js             Thành phần giao diện dùng chung, biểu mẫu, CSV
assets/js/app.js            Khung, điều hướng, đăng nhập, ghi nhật ký sự kiện
assets/js/views-*.js        Các màn hình M01–M08
assets/css/styles.css       Giao diện sáng/tối, responsive
data/data.json              Dữ liệu (hiện là dữ liệu minh họa)
supabase/schema.sql         Lược đồ + phân quyền cho chế độ Supabase
tools/generate-sample-data.mjs  Sinh lại dữ liệu minh họa: node tools/generate-sample-data.mjs > data/data.json
```

## Lưu ý

- Ngưỡng cảnh báo, thời hạn 5 ngày làm việc, định nghĩa K10 và lịch ngày nghỉ 2026 là **đề xuất**, cần đơn vị chốt (đặc tả mục 16) — sửa tại **Cấu hình › Ngưỡng & lịch làm việc**; mọi thay đổi được ghi lịch sử.
- Dashboard chỉ lưu siêu dữ liệu quản lý và **đường dẫn** tài liệu; không tải lên dữ liệu người bệnh hay dữ liệu nghiên cứu nhạy cảm.
- Chỉ số tạp chí luôn đi kèm nguồn và năm; không dùng số bài, số ngày hay phân hạng đơn lẻ để đánh giá năng lực giảng viên (DORA, CoARA).
