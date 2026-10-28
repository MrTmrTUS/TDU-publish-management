// Sinh dữ liệu demo (GIẢ ĐỊNH) cho Cổng hỗ trợ và quản lý nghiên cứu. Chạy: node tools/generate-demo-data.mjs > data/demo.json
// Mật khẩu chung của mọi tài khoản demo: Tdu@2026. Email dùng tên miền dành riêng .example (không gửi được thư thật).
import { createHash } from "node:crypto";

const BASE = "2026-10-28";
const d = n => new Date(Date.parse(BASE) + n * 864e5).toISOString().slice(0, 10);
const at = (n, h = 9) => `${d(n)}T${String(h).padStart(2, "0")}:00:00.000Z`;
const PW = createHash("sha256").update("Tdu@2026").digest("hex");

const YD = "Khoa Y – Dược", KT = "Khoa Kinh tế", KHCN = "Phòng KHCN & HTQT", NN = "Khoa Ngoại ngữ";
const units = [YD, KT, KHCN, NN];

const U = (id, email, name, degree, unit, roles, extra = {}) => Object.assign({ id, email: email + "@tdu.example", name, degree, title: "", unit, phone: "", orcid: "", scopusId: "", scholarUrl: "",
  fields: "", bio: "", publications: "", roles, status: "active", createdAt: at(-120) }, extra);
const users = [
  U("u-admin", "admin", "ThS. Đỗ Hải Yến", "ThS.", KHCN, ["quan_tri"], { demo: true, demoLabel: "Quản trị viên (Phòng KHCN)", title: "Chuyên viên Phòng KHCN", fields: "Quản lý khoa học", phone: "0912 000 001" }),
  U("u-dp", "dieuphoi", "TS. Lý Gia Huy", "TS.", KHCN, ["dieu_phoi", "giang_vien"], { demo: true, demoLabel: "Điều phối viên", title: "Phó trưởng Phòng KHCN", fields: "Dược lý", orcid: "0000-0002-1825-0097" }),
  U("u-ld", "lanhdao", "PGS.TS. Mai Đình Toàn", "PGS.TS.", KHCN, ["lanh_dao"], { demo: true, demoLabel: "Lãnh đạo (Phó Hiệu trưởng)", title: "Phó Hiệu trưởng", fields: "Kinh tế phát triển" }),
  U("u-ha", "giangvien", "TS. Nguyễn Thu Hà", "TS.", YD, ["giang_vien"], { demo: true, demoLabel: "Giảng viên – chủ nhiệm đề tài", title: "Giảng viên", fields: "Y tế công cộng; Dịch tễ học",
    phone: "0912 000 004", orcid: "0000-0001-5109-3700", bio: "Nghiên cứu tuân thủ điều trị bệnh mạn tính tại tuyến cơ sở.", publications: "Nguyễn T.H. và cs. (2025). Giáo dục sức khỏe cho người bệnh đái tháo đường type 2. Heliyon (giả định).\nNguyễn T.H. (2024). Tuân thủ điều trị tăng huyết áp tại trạm y tế xã. Tạp chí Y học Việt Nam (giả định)." }),
  U("u-son", "hotro", "TS. Bùi Thanh Sơn", "TS.", KHCN, ["giang_vien"], { demo: true, demoLabel: "Người hỗ trợ (thống kê)", title: "Chuyên gia thống kê", fields: "Thống kê y sinh; Mô hình hồi quy" }),
  U("u-duc", "duc", "ThS. Trần Minh Đức", "ThS.", YD, ["giang_vien"], { fields: "Dược lâm sàng" }),
  U("u-hong", "hong", "TS. Lê Thị Hồng", "TS.", YD, ["giang_vien"], { fields: "Điều dưỡng; Giáo dục y khoa" }),
  U("u-bao", "bao", "PGS.TS. Đặng Quốc Bảo", "PGS.TS.", YD, ["giang_vien"], { fields: "Phương pháp nghiên cứu lâm sàng" }),
  U("u-lananh", "lananh", "TS. Hoàng Lan Anh", "TS.", KT, ["giang_vien"], { fields: "Marketing; Hành vi người tiêu dùng", orcid: "0000-0003-1415-9269" }),
  U("u-khoa", "khoa", "ThS. Phạm Văn Khoa", "ThS.", KT, ["giang_vien"], { fields: "Tài chính ngân hàng" }),
  U("u-men", "men", "ThS. Vũ Thị Mến", "ThS.", KT, ["giang_vien"], { fields: "Kế toán" }),
  U("u-bich", "bich", "TS. Cao Ngọc Bích", "TS.", KT, ["giang_vien"], { fields: "Quản trị kinh doanh" }),
  U("u-phuong", "phuong", "ThS. Ngô Mai Phương", "ThS.", NN, ["giang_vien"], { fields: "Biên tập tiếng Anh học thuật" }),
  U("u-vinh", "vinh", "ThS. Tạ Quang Vinh", "ThS.", YD, ["giang_vien"], { fields: "Y học dự phòng" }),
  U("u-moi", "nguyenvanmoi", "ThS. Nguyễn Văn Mới", "ThS.", KT, ["giang_vien"], { status: "pending", createdAt: at(-1) })
];
const passwords = Object.fromEntries(users.map(u => [u.email, PW]));

const supporters = [
  { id: "sp-u-son", userId: "u-son", types: ["thong_ke"], expertise: "Hồi quy logistic, mô hình hỗn hợp, PLS-SEM; 12 bài Scopus về y tế công cộng (giả định).", capacity: 3, conditions: "Có đề cương và bộ dữ liệu đã làm sạch", status: "da_duyet", registeredAt: d(-90), approvedAt: d(-88) },
  { id: "sp-u-bao", userId: "u-bao", types: ["y_tuong", "de_cuong", "tra_loi", "phan_bien"], expertise: "Mentor phương pháp nghiên cứu lâm sàng; phản biện cho 3 tạp chí quốc tế.", capacity: 2, conditions: "Đăng ký trước 3 ngày", status: "da_duyet", registeredAt: d(-90), approvedAt: d(-88) },
  { id: "sp-u-phuong", userId: "u-phuong", types: ["tieng_anh"], expertise: "Hiệu đính tiếng Anh học thuật, bản thảo ≤ 6.000 từ.", capacity: 3, conditions: "Bản thảo đã qua phản biện nội bộ", status: "da_duyet", registeredAt: d(-80), approvedAt: d(-79) },
  { id: "sp-u-bich", userId: "u-bich", types: ["phan_bien", "tap_chi"], expertise: "Phản biện nội bộ khối kinh tế; tư vấn chọn tạp chí Scopus.", capacity: 1, conditions: "", status: "da_duyet", registeredAt: d(-70), approvedAt: d(-69) },
  { id: "sp-u-vinh", userId: "u-vinh", types: ["dao_duc"], expertise: "Thư ký Hội đồng đạo đức bệnh viện; hướng dẫn hồ sơ đạo đức.", capacity: 2, conditions: "", status: "cho_duyet", registeredAt: d(-2) }
].map(s => Object.assign({ readers: [] }, s));

// [mã, tên, rút gọn, khoa, nhóm, chủ nhiệm, thành viên, trạng thái, vào trạng thái, cập nhật, tạp chí, Q, việc tiếp theo, hạn, rủi ro]
const R = [
  ["HS-001", "Yếu tố liên quan đến tuân thủ điều trị tăng huyết áp tại trạm y tế xã", "Tuân thủ điều trị THA", YD, "Nhóm Y tế công cộng", "u-ha", ["u-duc"], "phan_tich", -35, -3, "", "", "Hoàn thiện kế hoạch phân tích cùng chuyên gia thống kê", 7, ""],
  ["HS-002", "Năng lực lâm sàng của sinh viên điều dưỡng năm cuối", "Năng lực lâm sàng SV ĐD", YD, "Nhóm Giáo dục y khoa", "u-hong", [], "sua_bai", -55, -6, "BMC Medical Education", "Q1", "Hoàn thiện bảng trả lời phản biện", 6, ""],
  ["HS-003", "Hành vi chấp nhận ví điện tử của người tiêu dùng Hải Phòng", "Ví điện tử Hải Phòng", KT, "Nhóm Marketing số", "u-lananh", ["u-men"], "dang_phan_bien", -43, -43, "Cogent Business & Management", "Q2", "Theo dõi quyết định của tạp chí", "", ""],
  ["HS-004", "Tác động của chuyển đổi số đến hiệu quả doanh nghiệp nhỏ và vừa", "Chuyển đổi số DNNVV", KT, "", "u-khoa", [], "de_cuong", -23, -9, "", "", "Tìm cố vấn phương pháp", 4, ""],
  ["HS-005", "Thực trạng sử dụng kháng sinh tại cơ sở y tế tuyến huyện", "Kháng sinh tuyến huyện", YD, "Nhóm Dược lâm sàng", "u-ha", ["u-duc"], "tam_dung", -26, -26, "", "", "Rà soát điều kiện tiếp tục khi bệnh viện cấp lại quyền truy cập", 14, ""],
  ["HS-006", "Chất lượng thông tin kế toán tại doanh nghiệp logistics", "Kế toán logistics", KT, "Nhóm Kế toán – Kiểm toán", "u-men", ["u-khoa"], "phan_bien_nb", -36, -10, "Sustainability", "Q2", "Nhận góp ý phản biện nội bộ", -2, ""],
  ["HS-007", "Hiệu quả can thiệp dược lâm sàng trên người bệnh suy thận", "Dược lâm sàng suy thận", YD, "Nhóm Dược lâm sàng", "u-duc", ["u-ha"], "du_lieu", -41, -2, "", "", "Hoàn thành nhập liệu 200 hồ sơ bệnh án", 20, "Chưa rõ quyền sử dụng dữ liệu bệnh viện đối tác"],
  ["HS-008", "Ý định khởi nghiệp của sinh viên khối kinh tế", "Khởi nghiệp SV", KT, "", "u-lananh", [], "y_tuong", -105, -59, "", "", "Hoàn thiện câu hỏi nghiên cứu", -43, ""],
  ["HS-009", "Mô hình giáo dục sức khỏe cho người bệnh đái tháo đường type 2", "GDSK đái tháo đường", YD, "Nhóm Y tế công cộng", "u-ha", ["u-hong"], "xuat_ban", -43, -43, "Heliyon", "Q1", "", "", ""],
  ["HS-010", "Các yếu tố quyết định rủi ro tín dụng của ngân hàng thương mại cổ phần", "Rủi ro tín dụng NHTM", KT, "Nhóm Tài chính", "u-khoa", ["u-men"], "bi_tu_choi", -12, -12, "Sustainability", "Q2", "", "", ""],
  ["HS-011", "Mô hình kê đơn kháng sinh tại bệnh viện huyện (bản thảo có sẵn)", "Kê đơn kháng sinh", YD, "Nhóm Dược lâm sàng", "u-duc", [], "viet_bai", -232, -209, "", "", "Đăng ký chương trình cứu bản thảo", "", ""],
  ["HS-012", "Các yếu tố thúc đẩy ngân hàng xanh tại Việt Nam", "Ngân hàng xanh", KT, "Nhóm Tài chính", "u-lananh", [], "chap_nhan", -18, -18, "Cogent Business & Management", "Q2", "Kiểm tra bản in thử", 19, ""],
  ["HS-013", "Tự đánh giá và đánh giá của giảng viên hướng dẫn về kỹ năng lâm sàng", "Tự đánh giá kỹ năng LS", YD, "Nhóm Giáo dục y khoa", "u-hong", [], "viet_bai", -79, -16, "", "", "Viết phần kết quả", 34, ""],
  ["HS-014", "Đánh giá chất lượng dịch vụ nhà thuốc cộng đồng", "Chất lượng nhà thuốc", KT, "", "u-men", [], "san_sang", -6, -6, "Tạp chí Kinh tế và Dự báo", "trong_nuoc", "Định dạng và nộp bài", 5, ""]
];
const L = { y_tuong: "Ý tưởng", de_cuong: "Đề cương", dao_duc: "Đạo đức", du_lieu: "Thu thập dữ liệu", phan_tich: "Phân tích", viet_bai: "Viết bài", phan_bien_nb: "Phản biện nội bộ",
  san_sang: "Sẵn sàng nộp", dang_phan_bien: "Đang phản biện", sua_bai: "Sửa bài", bi_tu_choi: "Bị từ chối – chờ nộp lại", chap_nhan: "Chấp nhận", xuat_ban: "Xuất bản", tam_dung: "Tạm dừng" };
const records = R.map(([id, title, shortTitle, unit, group, ownerId, memberIds, status, since, upd, journal, quartile, nextAction, due, risk]) => ({
  id, title, shortTitle, unit, group, ownerId, memberIds, status, statusSince: d(since), createdAt: d(Math.min(since, upd) - 30), createdBy: ownerId, updatedAt: d(Math.max(since, upd)),
  journal, quartile, nextAction, due: due === "" ? "" : d(due), risk, doi: status === "xuat_ban" ? "10.9999/demo.2026.001" : "", docsUrl: "https://drive.google.com/drive/folders/demo-" + id.toLowerCase(),
  note: status === "tam_dung" ? "Bệnh viện đối tác tạm dừng cấp quyền truy cập hồ sơ bệnh án" : "",
  evidence: status === "dang_phan_bien" || status === "chap_nhan" || status === "xuat_ban" ? [{ label: status === "xuat_ban" ? "Trang xuất bản chính thức" : status === "chap_nhan" ? "Thư chấp nhận" : "Biên nhận nộp bài", url: "https://drive.google.com/file/d/demo-" + id.toLowerCase(), date: d(since), by: ownerId }] : [],
  history: [{ at: at(Math.min(since, upd) - 30), by: ownerId, text: "Tạo hồ sơ", note: "" }, { at: at(since), by: ownerId, text: "Trạng thái: … → " + L[status], note: "" }].concat(upd > since ? [{ at: at(upd), by: ownerId, text: "Việc tiếp theo: " + nextAction, note: "" }] : [])
}));

const cards = [];
users.filter(u => u.status === "active" && u.roles.includes("giang_vien")).forEach(u => {
  cards.push({ id: `th-2026-thong_ke-${u.id}`, holderId: u.id, type: "thong_ke", year: "2026", quota: 2, issuedAt: d(-60), issuedBy: "u-admin", readers: [u.id] });
  cards.push({ id: `th-2026-tieng_anh-${u.id}`, holderId: u.id, type: "tieng_anh", year: "2026", quota: 2, issuedAt: d(-60), issuedBy: "u-admin", readers: [u.id] });
});

// [mã, hồ sơ, loại, nội dung, người gửi, đề xuất, người hỗ trợ, trạng thái, ngày gửi, phân công, nhận, hạn, bàn giao, xác nhận, dùng thẻ?, kết quả]
const SP = [
  ["YC-001", "HS-001", "thong_ke", "Tư vấn chọn mô hình hồi quy logistic đa biến và xử lý dữ liệu thiếu", "u-ha", "u-son", "u-son", "dang_xu_ly", -12, -9, -8, 9, null, null, true, ""],
  ["YC-002", "HS-002", "tra_loi", "Góp ý phương pháp cho bản trả lời phản biện 2", "u-hong", "u-bao", "u-bao", "dang_xu_ly", -20, -18, -18, 3, null, null, false, ""],
  ["YC-003", "HS-004", "y_tuong", "Cần ghép cố vấn có kinh nghiệm công bố về chuyển đổi số", "u-khoa", "u-bao", "", "cho_duyet", -9, null, null, "", null, null, false, ""],
  ["YC-004", "HS-006", "phan_bien", "Phản biện nội bộ bản thảo v1.1 trước khi nộp Sustainability", "u-men", "u-bich", "u-bich", "dang_xu_ly", -34, -32, -31, -2, null, null, false, ""],
  ["YC-005", "HS-012", "tieng_anh", "Hiệu đính tiếng Anh bản sửa vòng 1", "u-lananh", "u-phuong", "u-phuong", "hoan_thanh", -85, -84, -84, -64, -68, -66, true, "Bản thảo đã hiệu đính (track changes)"],
  ["YC-006", "HS-003", "tap_chi", "Lập 3–5 phương án tạp chí cho bài ví điện tử", "u-lananh", "", "u-bich", "hoan_thanh", -71, -68, -68, -53, -49, -47, false, "Phiếu lựa chọn 4 tạp chí, mục tiêu Cogent B&M"],
  ["YC-007", "HS-010", "nop_lai", "Tư vấn chọn tạp chí dự phòng sau khi bị từ chối", "u-khoa", "", "", "cho_duyet", -1, null, null, "", null, null, false, ""],
  ["YC-008", "HS-001", "tieng_anh", "Hiệu đính tiếng Anh phần giới thiệu và phương pháp", "u-ha", "u-phuong", "u-phuong", "cho_xac_nhan", -16, -15, -14, -1, -2, null, true, "Bản hiệu đính phần giới thiệu và phương pháp"],
  ["YC-009", "HS-007", "thong_ke", "Tính cỡ mẫu và kế hoạch phân tích cho nghiên cứu can thiệp", "u-duc", "u-son", "u-son", "cho_nhan", -3, -1, null, 12, null, null, true, ""],
  ["YC-010", "HS-005", "dao_duc", "Hỗ trợ thủ tục gia hạn quyền truy cập dữ liệu", "u-ha", "", "", "huy", -25, null, null, "", null, null, false, ""]
];
const recById = Object.fromEntries(records.map(r => [r.id, r]));
const supports = SP.map(([id, recordId, type, detail, requesterId, proposedSupporterId, supporterId, status, created, assigned, accepted, due, delivered, confirmed, useCard, result]) => {
  const r = recById[recordId];
  const h = [{ at: at(created), by: requesterId, text: `Gửi yêu cầu${proposedSupporterId ? ", đề xuất người hỗ trợ" : ""}${useCard ? ", dùng 1 lượt thẻ" : ""}` }];
  if (assigned != null) h.push({ at: at(assigned, 10), by: "u-dp", text: "Phân công người hỗ trợ" });
  if (accepted != null) h.push({ at: at(accepted, 14), by: supporterId, text: "Nhận việc" });
  if (delivered != null) h.push({ at: at(delivered, 15), by: supporterId, text: "Bàn giao: " + result });
  if (confirmed != null) h.push({ at: at(confirmed, 16), by: requesterId, text: "Xác nhận đạt" });
  if (status === "huy") h.push({ at: at(created + 2), by: requesterId, text: "Hủy: bệnh viện đã tự gia hạn, không cần hỗ trợ" });
  return { id, recordId, type, detail, requesterId, proposedSupporterId, supporterId, coordinatorId: assigned != null ? "u-dp" : "", status,
    cardId: useCard ? `th-2026-${type}-${requesterId}` : "", createdAt: at(created), assignedAt: assigned != null ? at(assigned, 10) : "", acceptedAt: accepted != null ? at(accepted, 14) : "",
    due: due === "" ? "" : d(due), deliveredAt: delivered != null ? at(delivered, 15) : "", confirmedAt: confirmed != null ? at(confirmed, 16) : "", result, resultUrl: result ? "https://drive.google.com/file/d/demo-" + id.toLowerCase() : "",
    cancelReason: status === "huy" ? "Bệnh viện đã tự gia hạn, không cần hỗ trợ" : "", history: h,
    readers: [...new Set([requesterId, r.ownerId, ...r.memberIds, supporterId].filter(Boolean))] };
});
// Quyền xem hồ sơ: chủ nhiệm, thành viên, người hỗ trợ được giao
records.forEach(r => { r.readers = [...new Set([r.ownerId, ...r.memberIds, ...supports.filter(s => s.recordId === r.id && s.supporterId).map(s => s.supporterId)])]; });

const ratings = [
  { id: "dg-YC-005", supportId: "YC-005", supporterId: "u-phuong", stars: 5, comment: "Hiệu đính kỹ, đúng hạn.", by: "u-lananh", at: at(-66, 16), readers: [] },
  { id: "dg-YC-006", supportId: "YC-006", supporterId: "u-bich", stars: 4, comment: "Phương án hợp lý, bàn giao trễ 4 ngày.", by: "u-lananh", at: at(-47, 16), readers: [] }
];
const notices = [
  { id: "tb-01", kind: "van_ban", title: "Kế hoạch thúc đẩy NCKH và công bố của giảng viên giai đoạn 2026–2028", body: "Kế hoạch nêu mục tiêu, chỉ tiêu, quy trình hỗ trợ bản thảo và cơ chế hỗ trợ. Giảng viên đọc mục 5.3 (đầu mối hỗ trợ một cửa) và Phụ lục 3 (trạng thái hồ sơ).", url: "", pinned: true, publishedAt: d(-30), by: "u-admin" },
  { id: "tb-02", kind: "huong_dan", title: "Hướng dẫn sử dụng Cổng hỗ trợ và quản lý nghiên cứu", body: "1. Cập nhật lý lịch khoa học (ORCID, lĩnh vực).\n2. Tạo hồ sơ cho từng nghiên cứu / bản thảo, mời thành viên nhóm.\n3. Mỗi khi có tiến triển: bấm “Cập nhật tiến độ” (dưới 2 phút).\n4. Cần giúp: “Gửi yêu cầu hỗ trợ”, có thể đề xuất người hỗ trợ còn suất.\n5. Khi người hỗ trợ bàn giao: xác nhận và chấm sao.", url: "", pinned: false, publishedAt: d(-28), by: "u-admin" },
  { id: "tb-03", kind: "bieu_mau", title: "Phiếu lựa chọn và sàng lọc tạp chí (Phụ lục 2)", body: "Dùng trước khi nộp bài và trước khi đề nghị hỗ trợ kinh phí. Tổng 22 điểm; kết luận Ưu tiên / Có điều kiện / Không đề xuất.", url: "", pinned: false, publishedAt: d(-20), by: "u-dp" },
  { id: "tb-04", kind: "thong_bao", title: "Trại viết bài khoa học đợt 2 (tháng 11/2026)", body: "Đăng ký theo nhóm, mang bản thảo đã có kết quả. Có mentor phương pháp và biên tập viên tiếng Anh.", url: "", pinned: false, publishedAt: d(-5), by: "u-dp" }
].map(n => Object.assign({ readers: [] }, n));
const N = (id, userId, text, href, ago, read = false) => ({ id, userId, readers: [userId], text, href, at: at(ago, 11), read });
const notifications = [
  N("n-1", "u-ha", "YC-008: đã bàn giao kết quả — mời xác nhận", "#/ho-tro/YC-008", -2),
  N("n-2", "u-ha", "Bạn được cấp 2 lượt thẻ “Thống kê – phân tích” năm 2026", "#/the-ho-tro", -60, true),
  N("n-3", "u-son", "YC-009: TS. Bùi Thanh Sơn được phân công hỗ trợ “Thống kê – phân tích”", "#/ho-tro/YC-009", -1),
  N("n-4", "u-dp", "Yêu cầu mới YC-007: Nộp lại sau từ chối — cần phân công", "#/ho-tro/YC-007", -1),
  N("n-5", "u-dp", "Yêu cầu mới YC-003: Phát triển ý tưởng — cần phân công", "#/ho-tro/YC-003", -9, true),
  N("n-6", "u-admin", "ThS. Tạ Quang Vinh đăng ký làm người hỗ trợ — cần duyệt", "#/quan-tri?tab=nguoi-ho-tro", -2)
];
const log = [
  { id: "l-1", at: at(-60), by: "u-admin", text: "Cấp 26 thẻ hỗ trợ năm 2026 (thống kê, hiệu đính)", href: "", readers: [] },
  { id: "l-2", at: at(-9), by: "u-khoa", text: "Gửi yêu cầu YC-003", href: "#/ho-tro/YC-003", readers: [] },
  { id: "l-3", at: at(-1), by: "u-khoa", text: "Gửi yêu cầu YC-007", href: "#/ho-tro/YC-007", readers: [] }
];

const settings = {
  units, staleDays: 30, soonDays: 7, triageWorkdays: 5, resubmitDays: 30,
  holidays: ["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-04-27", "2026-04-30", "2026-05-01", "2026-08-31", "2026-09-01", "2026-09-02"],
  supportTypes: [
    { code: "y_tuong", label: "Phát triển ý tưởng", needsCard: false }, { code: "de_cuong", label: "Hoàn thiện đề cương", needsCard: false },
    { code: "thong_ke", label: "Thống kê – phân tích", needsCard: true }, { code: "dao_duc", label: "Đạo đức – dữ liệu", needsCard: false },
    { code: "viet_bai", label: "Viết bản thảo", needsCard: false }, { code: "phan_bien", label: "Phản biện nội bộ", needsCard: false },
    { code: "tieng_anh", label: "Hiệu đính tiếng Anh", needsCard: true }, { code: "tap_chi", label: "Lựa chọn tạp chí", needsCard: false },
    { code: "tra_loi", label: "Trả lời phản biện", needsCard: false }, { code: "nop_lai", label: "Nộp lại sau từ chối", needsCard: false }
  ]
};

console.log(JSON.stringify({ meta: { version: 3, demo: true, note: "Dữ liệu demo giả định." }, settings, users, passwords, supporters, records, supports, cards, ratings, notices, notifications, log }, null, 1));
