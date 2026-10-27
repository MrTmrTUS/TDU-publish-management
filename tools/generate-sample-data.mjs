// Sinh dữ liệu minh họa (GIẢ ĐỊNH) cho bản đơn giản. Chạy: node tools/generate-sample-data.mjs > data/data.json
const BASE = "2026-10-27";
const d = n => new Date(Date.parse(BASE) + n * 864e5).toISOString().slice(0, 10); // n ngày so với ngày gốc
const at = n => d(n) + "T09:00:00+07:00";

const units = ["Khoa Y", "Khoa Dược", "Khoa Điều dưỡng", "Khoa Kinh tế"];

// [mã, tên, rút gọn, khoa, nhóm, tác giả, liên hệ, phụ trách, trạng thái, vào trạng thái (ngày), cập nhật (ngày), tạp chí, Q, việc tiếp theo, hạn (ngày), rủi ro]
const R = [
  ["HS-001", "Yếu tố liên quan đến tuân thủ điều trị tăng huyết áp tại trạm y tế xã", "Tuân thủ điều trị THA", "Khoa Y", "Nhóm Y tế công cộng", "Nguyễn Thu Hà; Trần Minh Đức; Tạ Quang Vinh", "TS. Nguyễn Thu Hà", "ThS. Đỗ Hải Yến", "phan_tich", -34, -11, "", "", "Chốt lịch tư vấn thống kê, rà soát kế hoạch phân tích", 7, ""],
  ["HS-002", "Năng lực lâm sàng của sinh viên điều dưỡng năm cuối", "Năng lực lâm sàng SV ĐD", "Khoa Điều dưỡng", "Nhóm Giáo dục điều dưỡng", "Lê Thị Hồng; Đặng Quốc Bảo", "TS. Lê Thị Hồng", "TS. Lê Thị Hồng", "sua_bai", -54, -7, "BMC Medical Education", "Q1", "Hoàn thiện bảng trả lời phản biện", 6, ""],
  ["HS-003", "Hành vi chấp nhận ví điện tử của người tiêu dùng Hải Phòng", "Ví điện tử Hải Phòng", "Khoa Kinh tế", "Nhóm Marketing số", "Hoàng Lan Anh; Vũ Thị Mến", "TS. Hoàng Lan Anh", "TS. Hoàng Lan Anh", "dang_phan_bien", -42, -42, "Cogent Business & Management", "Q2", "Theo dõi quyết định của tạp chí", "", ""],
  ["HS-004", "Tác động của chuyển đổi số đến hiệu quả doanh nghiệp nhỏ và vừa", "Chuyển đổi số DNNVV", "Khoa Kinh tế", "", "Phạm Văn Khoa", "ThS. Phạm Văn Khoa", "ThS. Đỗ Hải Yến", "de_cuong", -22, -14, "", "", "Ghép cố vấn phương pháp", 4, ""],
  ["HS-005", "Thực trạng sử dụng kháng sinh tại cơ sở y tế tuyến huyện", "Kháng sinh tuyến huyện", "Khoa Dược", "Nhóm Dược lâm sàng", "Tạ Quang Vinh; Trần Minh Đức", "ThS. Tạ Quang Vinh", "ThS. Tạ Quang Vinh", "tam_dung", -25, -25, "", "", "Rà soát điều kiện tiếp tục khi bệnh viện cấp lại quyền truy cập", 14, ""],
  ["HS-006", "Chất lượng thông tin kế toán tại doanh nghiệp logistics", "Kế toán logistics", "Khoa Kinh tế", "Nhóm Kế toán – Kiểm toán", "Vũ Thị Mến; Phạm Văn Khoa", "ThS. Vũ Thị Mến", "ThS. Đỗ Hải Yến", "phan_bien_nb", -35, -12, "Sustainability", "Q2", "Bố trí người phản biện nội bộ thay thế", -2, ""],
  ["HS-007", "Kiến thức phòng chống nhiễm khuẩn của điều dưỡng bệnh viện tỉnh", "Phòng chống nhiễm khuẩn", "Khoa Điều dưỡng", "Nhóm Giáo dục điều dưỡng", "Trần Minh Đức; Lê Thị Hồng", "ThS. Trần Minh Đức", "ThS. Trần Minh Đức", "dao_duc", -68, -19, "", "", "Theo dõi lịch họp Hội đồng đạo đức bệnh viện", 24, ""],
  ["HS-008", "Ý định khởi nghiệp của sinh viên khối kinh tế", "Khởi nghiệp SV", "Khoa Kinh tế", "", "Hoàng Lan Anh", "TS. Hoàng Lan Anh", "TS. Hoàng Lan Anh", "y_tuong", -104, -58, "", "", "Hoàn thiện câu hỏi nghiên cứu", -42, ""],
  ["HS-009", "Mô hình giáo dục sức khỏe cho người bệnh đái tháo đường type 2", "GDSK đái tháo đường", "Khoa Y", "Nhóm Y tế công cộng", "Nguyễn Thu Hà; Lê Thị Hồng", "TS. Nguyễn Thu Hà", "TS. Nguyễn Thu Hà", "xuat_ban", -42, -42, "Heliyon", "Q1", "", "", ""],
  ["HS-010", "Các yếu tố quyết định rủi ro tín dụng của ngân hàng thương mại cổ phần", "Rủi ro tín dụng NHTM", "Khoa Kinh tế", "Nhóm Tài chính", "Phạm Văn Khoa; Vũ Thị Mến", "ThS. Phạm Văn Khoa", "ThS. Phạm Văn Khoa", "bi_tu_choi", -11, -11, "Sustainability", "Q2", "", "", ""],
  ["HS-011", "Mô hình kê đơn kháng sinh tại bệnh viện huyện (bản thảo có sẵn)", "Kê đơn kháng sinh", "Khoa Dược", "Nhóm Dược lâm sàng", "Trần Minh Đức", "ThS. Trần Minh Đức", "TS. Lý Gia Huy", "viet_bai", -231, -208, "", "", "Đưa vào chương trình cứu bản thảo", "", ""],
  ["HS-012", "Các yếu tố thúc đẩy ngân hàng xanh tại Việt Nam", "Ngân hàng xanh", "Khoa Kinh tế", "Nhóm Tài chính", "Hoàng Lan Anh", "TS. Hoàng Lan Anh", "TS. Hoàng Lan Anh", "chap_nhan", -17, -17, "Cogent Business & Management", "Q2", "Kiểm tra bản in thử", 19, ""],
  ["HS-013", "Tự đánh giá và đánh giá của giảng viên hướng dẫn về kỹ năng lâm sàng", "Tự đánh giá kỹ năng LS", "Khoa Điều dưỡng", "Nhóm Giáo dục điều dưỡng", "Lê Thị Hồng", "TS. Lê Thị Hồng", "TS. Lê Thị Hồng", "viet_bai", -78, -15, "", "", "Viết phần kết quả", 34, ""],
  ["HS-014", "Hiệu quả can thiệp dược lâm sàng trên người bệnh suy thận", "Dược lâm sàng suy thận", "Khoa Dược", "Nhóm Dược lâm sàng", "Lý Gia Huy; Tạ Quang Vinh", "TS. Lý Gia Huy", "TS. Lý Gia Huy", "du_lieu", -40, -6, "", "", "Hoàn thành nhập liệu 200 hồ sơ bệnh án", 20, "Chưa rõ quyền sử dụng dữ liệu bệnh viện đối tác"],
  ["HS-015", "Tổng quan hệ thống về can thiệp giảm té ngã ở người cao tuổi", "Tổng quan té ngã NCT", "Khoa Y", "Nhóm Y tế công cộng", "Nguyễn Thu Hà; Đặng Quốc Bảo", "TS. Nguyễn Thu Hà", "PGS.TS. Đặng Quốc Bảo", "san_sang", -5, -5, "BMC Geriatrics", "Q1", "Định dạng theo hướng dẫn tác giả và nộp bài", 5, ""],
  ["HS-016", "Đánh giá chất lượng dịch vụ nhà thuốc cộng đồng", "Chất lượng nhà thuốc", "Khoa Dược", "", "Tạ Quang Vinh", "ThS. Tạ Quang Vinh", "ThS. Tạ Quang Vinh", "dang_phan_bien", -20, -20, "Tạp chí Dược học", "trong_nuoc", "Chờ quyết định của tạp chí", "", ""]
];

const label = { y_tuong: "Ý tưởng", de_cuong: "Đề cương", dao_duc: "Đạo đức", du_lieu: "Thu thập dữ liệu", phan_tich: "Phân tích", viet_bai: "Viết bài", phan_bien_nb: "Phản biện nội bộ",
  san_sang: "Sẵn sàng nộp", dang_phan_bien: "Đang phản biện", sua_bai: "Sửa bài", bi_tu_choi: "Bị từ chối – chờ nộp lại", chap_nhan: "Chấp nhận", xuat_ban: "Xuất bản", tam_dung: "Tạm dừng" };

const records = R.map(([id, title, shortTitle, unit, group, authors, contact, owner, status, since, upd, journal, quartile, nextAction, due, risk]) => {
  const created = d(Math.min(since, upd) - 30);
  const history = [{ at: at(Math.min(since, upd) - 30), by: "admin", text: "Tạo hồ sơ", note: "Tiếp nhận vào hệ thống" }];
  history.push({ at: at(since), by: "admin", text: `Trạng thái: … → ${label[status]}`, note: "" });
  if (upd > since) history.push({ at: at(upd), by: "admin", text: nextAction ? `Việc tiếp theo: ${nextAction}` : "Cập nhật", note: "" });
  return { id, title, shortTitle, unit, group, authors, contact, owner, status, statusSince: d(since), createdAt: created, updatedAt: d(Math.max(since, upd)),
    journal, quartile, nextAction, due: due === "" ? "" : d(due), risk, doi: status === "xuat_ban" ? "10.9999/sample.2026.001 (giả định)" : "", docsUrl: "",
    note: status === "tam_dung" ? "Bệnh viện đối tác tạm dừng cấp quyền truy cập hồ sơ bệnh án" : "", history };
});

// [mã, hồ sơ, loại, nội dung, người gửi, trạng thái, gửi (ngày), người hỗ trợ, hạn (ngày), xong (ngày), kết quả]
const supports = [
  ["YC-001", "HS-001", "thong_ke", "Tư vấn chọn mô hình hồi quy logistic đa biến và xử lý dữ liệu thiếu", "TS. Nguyễn Thu Hà", "dang_xu_ly", -11, "TS. Bùi Thanh Sơn", 10, "", ""],
  ["YC-002", "HS-002", "tra_loi", "Góp ý phương pháp cho bản trả lời phản biện 2", "TS. Lê Thị Hồng", "dang_xu_ly", -22, "PGS.TS. Đặng Quốc Bảo", 4, "", ""],
  ["YC-003", "HS-004", "y_tuong", "Cần ghép cố vấn có kinh nghiệm công bố về chuyển đổi số", "ThS. Phạm Văn Khoa", "moi", -14, "", "", "", ""],
  ["YC-004", "HS-006", "phan_bien", "Phản biện nội bộ bản thảo v1.1", "ThS. Vũ Thị Mến", "dang_xu_ly", -35, "TS. Cao Ngọc Bích", -2, "", ""],
  ["YC-005", "HS-012", "tieng_anh", "Hiệu đính tiếng Anh bản sửa vòng 1", "TS. Hoàng Lan Anh", "xong", -84, "ThS. Ngô Mai Phương", -63, -67, "Bản thảo đã hiệu đính (track changes)"],
  ["YC-006", "HS-003", "tap_chi", "Lập 3–5 phương án tạp chí cho bài ví điện tử", "TS. Hoàng Lan Anh", "xong", -70, "ThS. Đỗ Hải Yến", -52, -47, "Phiếu lựa chọn 4 tạp chí, mục tiêu Cogent B&M"],
  ["YC-007", "HS-010", "nop_lai", "Tư vấn chọn tạp chí dự phòng sau khi bị từ chối", "ThS. Phạm Văn Khoa", "moi", -4, "", "", "", ""],
  ["YC-008", "HS-014", "dao_duc", "Làm rõ thỏa thuận sử dụng dữ liệu với bệnh viện đối tác", "TS. Lý Gia Huy", "moi", -3, "", "", "", ""],
  ["YC-009", "HS-015", "tieng_anh", "Hiệu đính tiếng Anh trước khi nộp", "TS. Nguyễn Thu Hà", "xong", -20, "ThS. Ngô Mai Phương", -8, -9, "Bản hiệu đính hoàn chỉnh"],
  ["YC-010", "HS-005", "kinh_phi", "Hỗ trợ thủ tục gia hạn kinh phí do tạm dừng thu thập dữ liệu", "ThS. Tạ Quang Vinh", "dang_xu_ly", -21, "Văn phòng Khoa Dược", 9, "", ""]
].map(([id, recordId, type, detail, requester, status, created, assignee, due, doneAt, result]) =>
  ({ id, recordId, type, detail, requester, status, createdAt: d(created), assignee, due: due === "" ? "" : d(due), doneAt: doneAt === "" ? "" : d(doneAt), result }));

console.log(JSON.stringify({
  meta: { version: 2, sample: true, updatedAt: BASE + "T00:00:00.000Z", note: "Dữ liệu minh họa giả định — xóa tại Cài đặt trước khi nhập dữ liệu thật." },
  settings: { units, staleDays: 30, soonDays: 7, triageWorkdays: 5, resubmitDays: 30,
    holidays: ["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-04-27", "2026-04-30", "2026-05-01", "2026-08-31", "2026-09-01", "2026-09-02"] },
  records, supports
}, null, 1));
