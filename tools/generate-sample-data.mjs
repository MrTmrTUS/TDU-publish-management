// Sinh dữ liệu minh họa (GIẢ ĐỊNH) theo mục 12 của đặc tả, ngày chốt 27/10/2026.
// Chạy: node tools/generate-sample-data.mjs > data/data.json
// Mỗi bản ghi dựng một tình huống nghiệm thu (NTxx) hoặc cảnh báo (CBxx) để kiểm tra giao diện và logic.

const units = [
  { id: "u-yd", code: "YD", name: "Khoa Y – Dược" },
  { id: "u-kt", code: "KT", name: "Khoa Kinh tế" },
  { id: "u-khcn", code: "KHCN", name: "Phòng Khoa học công nghệ & HTQT" },
  { id: "u-nn", code: "NN", name: "Khoa Ngoại ngữ" }
];

const P = (id, name, unitId, roles, expertise = "") => ({ id, name, unitId, roles, expertise, email: "", active: true });
const people = [
  P("p01", "TS. Nguyễn Thu Hà", "u-yd", ["giang_vien", "chu_nhiem"], "Y tế công cộng"),
  P("p02", "ThS. Trần Minh Đức", "u-yd", ["giang_vien"], "Dược lâm sàng"),
  P("p03", "TS. Lê Thị Hồng", "u-yd", ["giang_vien", "chu_nhiem"], "Điều dưỡng"),
  P("p04", "ThS. Phạm Văn Khoa", "u-kt", ["giang_vien", "chu_nhiem"], "Tài chính"),
  P("p05", "TS. Hoàng Lan Anh", "u-kt", ["giang_vien", "chu_nhiem"], "Marketing"),
  P("p06", "ThS. Vũ Thị Mến", "u-kt", ["giang_vien"], "Kế toán"),
  P("p07", "PGS.TS. Đặng Quốc Bảo", "u-yd", ["chuyen_gia", "giang_vien"], "Phương pháp nghiên cứu lâm sàng"),
  P("p08", "TS. Bùi Thanh Sơn", "u-khcn", ["chuyen_gia"], "Thống kê y sinh"),
  P("p09", "ThS. Ngô Mai Phương", "u-nn", ["chuyen_gia"], "Biên tập tiếng Anh học thuật"),
  P("p10", "ThS. Đỗ Hải Yến", "u-khcn", ["dieu_phoi"], "Điều phối cấp trường"),
  P("p11", "TS. Lý Gia Huy", "u-yd", ["dieu_phoi", "giang_vien"], "Điều phối khoa Y – Dược"),
  P("p12", "PGS.TS. Mai Đình Toàn", "u-khcn", ["lanh_dao"], "Phó Hiệu trưởng phụ trách KHCN"),
  P("p13", "TS. Cao Ngọc Bích", "u-kt", ["chuyen_gia", "giang_vien"], "Phản biện nội bộ kinh tế"),
  P("p14", "ThS. Tạ Quang Vinh", "u-yd", ["giang_vien"], "Y học dự phòng")
];

const providers = [
  { id: "pv1", name: "Tư vấn thống kê", personId: "p08", unitName: "Phòng KHCN & HTQT", supportTypes: ["thong_ke"], capacity: 3, packages: "Rà soát kế hoạch phân tích (5 ngày LV); chạy mô hình và giải thích (10 ngày LV)", conditions: "Có đề cương và bộ dữ liệu đã làm sạch", active: true },
  { id: "pv2", name: "Mentor phương pháp", personId: "p07", unitName: "Khoa Y – Dược", supportTypes: ["phuong_phap", "co_van"], capacity: 3, packages: "Góp ý phương pháp, bảng trả lời phản biện", conditions: "Đăng ký trước 3 ngày", active: true },
  { id: "pv3", name: "Biên tập tiếng Anh", personId: "p09", unitName: "Khoa Ngoại ngữ", supportTypes: ["ngon_ngu"], capacity: 4, packages: "Biên tập ngôn ngữ ≤ 6.000 từ (7 ngày LV)", conditions: "Bản thảo đã qua phản biện nội bộ", active: true },
  { id: "pv4", name: "Phản biện nội bộ – Kinh tế", personId: "p13", unitName: "Khoa Kinh tế", supportTypes: ["phan_bien", "phuong_phap"], capacity: 2, packages: "Phản biện nội bộ 1 vòng (10 ngày LV)", conditions: "", active: true },
  { id: "pv5", name: "Tổ tư vấn chọn tạp chí", personId: "", unitName: "Phòng KHCN & HTQT", supportTypes: ["chon_tap_chi"], capacity: 5, packages: "Lập 3–5 phương án tạp chí kèm nguồn xác minh", conditions: "Có tóm tắt và bản thảo hoàn chỉnh", active: true },
  { id: "pv6", name: "Thư ký Hội đồng đạo đức", personId: "", unitName: "Hội đồng đạo đức (bên ngoài)", supportTypes: ["dao_duc"], capacity: 3, packages: "Hướng dẫn hồ sơ đạo đức", conditions: "", active: true }
];

const journals = [
  { id: "j01", name: "Heliyon", issn: "2405-8440", publisher: "Elsevier (Cell Press)", scope: "Đa ngành", url: "", apc: "Có phí (xem trang tạp chí)", notes: "",
    verifications: [
      { system: "Scopus/SJR", category: "Multidisciplinary", year: 2025, value: "Q1", source: "SCImago Journal Rank", checkedAt: "2026-09-02", checkedBy: "p10" },
      { system: "WoS JCR", category: "Multidisciplinary Sciences", year: 2025, value: "Q2", source: "Journal Citation Reports", checkedAt: "2026-09-02", checkedBy: "p10" }] },
  { id: "j02", name: "BMC Medical Education", issn: "1472-6920", publisher: "BMC", scope: "Giáo dục y khoa", url: "", apc: "Có phí", notes: "",
    verifications: [{ system: "WoS JCR", category: "Education, Scientific Disciplines", year: 2025, value: "Q1", source: "Journal Citation Reports", checkedAt: "2026-08-20", checkedBy: "p10" }] },
  { id: "j03", name: "Journal of Asian Finance, Economics and Business", issn: "2288-4637", publisher: "KODISA", scope: "Kinh tế – tài chính", url: "", apc: "", notes: "Tình trạng chỉ mục cần kiểm tra lại",
    verifications: [{ system: "Scopus/SJR", category: "", year: "", value: "Q3", source: "", checkedAt: "", checkedBy: "" }] },
  { id: "j04", name: "Cogent Business & Management", issn: "2331-1975", publisher: "Taylor & Francis", scope: "Quản trị kinh doanh", url: "", apc: "Có phí", notes: "",
    verifications: [{ system: "Scopus/SJR", category: "Business, Management and Accounting", year: 2024, value: "Q2", source: "SCImago Journal Rank", checkedAt: "2026-04-15", checkedBy: "p10" }] },
  { id: "j05", name: "Tạp chí Y học Việt Nam", issn: "1859-1868", publisher: "Tổng hội Y học Việt Nam", scope: "Y học", url: "", apc: "", notes: "",
    verifications: [{ system: "HĐGSNN", category: "Y học", year: 2025, value: "0–0,5 điểm", source: "Danh mục HĐGSNN 2025", checkedAt: "2026-07-30", checkedBy: "p11" }] },
  { id: "j06", name: "Sustainability", issn: "2071-1050", publisher: "MDPI", scope: "Phát triển bền vững", url: "", apc: "Có phí", notes: "",
    verifications: [{ system: "WoS JCR", category: "Environmental Studies", year: 2025, value: "Q2", source: "Journal Citation Reports", checkedAt: "2026-08-12", checkedBy: "p10" }] },
  { id: "j07", name: "International Journal of Environmental Research and Public Health", issn: "1660-4601", publisher: "MDPI", scope: "Y tế công cộng", url: "", apc: "Có phí", notes: "Kiểm tra lại tình trạng chỉ mục WoS",
    verifications: [] }
];

const projects = [
  { id: "NC-01", title: "Yếu tố liên quan đến tuân thủ điều trị tăng huyết áp tại trạm y tế xã", shortTitle: "Tuân thủ điều trị THA", type: "de_tai_truong", unitId: "u-yd", leadId: "p01", memberIds: ["p02", "p14"], field: "Y tế công cộng", route: "moi",
    intakeDate: "2026-06-02", intakeStage: "de_cuong", stage: "phan_tich", stageEnteredAt: "2026-09-23", status: "cho_noi_bo", statusReason: "Chờ tư vấn thống kê",
    nextAction: "Chốt lịch, rà soát kế hoạch phân tích", nextDue: "2026-11-03", ownerId: "p10", lastUpdate: "2026-10-16", targetMilestone: "Hoàn thành phân tích trước 15/12/2026", dateSource: "", verifyLevel: "da_xac_minh" },
  { id: "NC-02", title: "Năng lực lâm sàng của sinh viên điều dưỡng năm cuối", shortTitle: "Năng lực lâm sàng SV ĐD", type: "de_tai_truong", unitId: "u-yd", leadId: "p03", memberIds: ["p07"], field: "Điều dưỡng", route: "moi",
    intakeDate: "2026-01-12", intakeStage: "du_lieu", stage: "hoan_thanh", stageEnteredAt: "2026-05-28", status: "dang_thuc_hien", statusReason: "",
    nextAction: "Hoàn thiện bảng trả lời phản biện MS-002", nextDue: "2026-11-03", ownerId: "p03", lastUpdate: "2026-10-20", targetMilestone: "2 bản thảo được nộp", dateSource: "", verifyLevel: "da_xac_minh" },
  { id: "NC-03", title: "Hành vi chấp nhận ví điện tử của người tiêu dùng Hải Phòng", shortTitle: "Ví điện tử Hải Phòng", type: "noi_bo", unitId: "u-kt", leadId: "p05", memberIds: ["p06"], field: "Marketing", route: "moi",
    intakeDate: "2026-02-20", intakeStage: "phan_tich", stage: "hoan_thanh", stageEnteredAt: "2026-07-10", status: "cho_ben_ngoai", statusReason: "Chờ tạp chí xử lý MS-003",
    nextAction: "Theo dõi theo mốc phù hợp của tạp chí", nextDue: "", ownerId: "p05", lastUpdate: "2026-09-15", targetMilestone: "1 bài Scopus", dateSource: "", verifyLevel: "da_xac_minh" },
  { id: "NC-04", title: "Tác động của chuyển đổi số đến hiệu quả doanh nghiệp nhỏ và vừa", shortTitle: "Chuyển đổi số DNNVV", type: "noi_bo", unitId: "u-kt", leadId: "p04", memberIds: [], field: "Tài chính", route: "moi",
    intakeDate: "2026-10-05", intakeStage: "de_cuong", stage: "de_cuong", stageEnteredAt: "2026-10-05", status: "cho_noi_bo", statusReason: "Chờ ghép cố vấn",
    nextAction: "Xác nhận cố vấn và lịch trao đổi", nextDue: "2026-10-31", ownerId: "p10", lastUpdate: "2026-10-13", targetMilestone: "Đề cương được duyệt", dateSource: "", verifyLevel: "da_xac_minh" },
  { id: "NC-05", title: "Thực trạng sử dụng kháng sinh tại cơ sở y tế tuyến huyện", shortTitle: "Kháng sinh tuyến huyện", type: "hop_tac", unitId: "u-yd", leadId: "p14", memberIds: ["p02"], field: "Dược lâm sàng", route: "moi",
    intakeDate: "2026-04-08", intakeStage: "de_cuong", stage: "du_lieu", stageEnteredAt: "2026-07-01", status: "tam_dung", statusReason: "Bệnh viện đối tác tạm dừng cấp quyền truy cập hồ sơ bệnh án đến khi hoàn tất kiểm tra nội bộ",
    nextAction: "Rà soát điều kiện tiếp tục", nextDue: "2026-11-10", ownerId: "p14", lastUpdate: "2026-10-02", targetMilestone: "Thu đủ 400 hồ sơ", dateSource: "", verifyLevel: "da_xac_minh" },
  { id: "NC-06", title: "Chất lượng thông tin kế toán tại doanh nghiệp logistics", shortTitle: "Thông tin kế toán logistics", type: "noi_bo", unitId: "u-kt", leadId: "p06", memberIds: ["p04"], field: "Kế toán", route: "moi",
    intakeDate: "2026-03-02", intakeStage: "phan_tich", stage: "hoan_thanh", stageEnteredAt: "2026-08-25", status: "cho_noi_bo", statusReason: "Người góp ý đang quá tải",
    nextAction: "Bố trí thời gian hoặc người phản biện thay thế", nextDue: "2026-10-30", ownerId: "p10", lastUpdate: "2026-10-15", targetMilestone: "", dateSource: "", verifyLevel: "da_xac_minh" },
  { id: "NC-07", title: "Kiến thức phòng chống nhiễm khuẩn của điều dưỡng bệnh viện tỉnh", shortTitle: "Phòng chống nhiễm khuẩn", type: "hop_tac", unitId: "u-yd", leadId: "p02", memberIds: ["p03"], field: "Điều dưỡng", route: "moi",
    intakeDate: "2026-08-01", intakeStage: "de_cuong", stage: "dao_duc", stageEnteredAt: "2026-08-20", status: "cho_ben_ngoai", statusReason: "Chờ Hội đồng đạo đức bệnh viện xét duyệt",
    nextAction: "Theo dõi lịch họp Hội đồng đạo đức", nextDue: "2026-11-20", ownerId: "p02", lastUpdate: "2026-10-08", targetMilestone: "", dateSource: "", verifyLevel: "da_xac_minh" },
  { id: "NC-08", title: "Ý định khởi nghiệp của sinh viên khối kinh tế", shortTitle: "Ý định khởi nghiệp SV", type: "noi_bo", unitId: "u-kt", leadId: "p05", memberIds: [], field: "Quản trị", route: "moi",
    intakeDate: "2026-07-15", intakeStage: "y_tuong", stage: "y_tuong", stageEnteredAt: "2026-07-15", status: "dang_thuc_hien", statusReason: "",
    nextAction: "Hoàn thiện câu hỏi nghiên cứu", nextDue: "2026-09-15", ownerId: "p05", lastUpdate: "2026-08-30", targetMilestone: "", dateSource: "", verifyLevel: "da_xac_minh" },
  { id: "NC-09", title: "Mô hình giáo dục sức khỏe cho người bệnh đái tháo đường type 2", shortTitle: "GDSK đái tháo đường", type: "de_tai_truong", unitId: "u-yd", leadId: "p01", memberIds: ["p03"], field: "Y tế công cộng", route: "hoi_cuu",
    intakeDate: "2026-02-01", intakeStage: "hoan_thanh", stage: "hoan_thanh", stageEnteredAt: "2026-02-01", status: "hoan_thanh", statusReason: "",
    nextAction: "", nextDue: "", ownerId: "p01", lastUpdate: "2026-09-15", targetMilestone: "1 bài WoS/Scopus", dateSource: "Nhập lại từ hồ sơ đề tài 2025", verifyLevel: "nhap_lai" },
  { id: "NC-10", title: "Rủi ro tín dụng của ngân hàng thương mại cổ phần", shortTitle: "Rủi ro tín dụng NHTM", type: "noi_bo", unitId: "u-kt", leadId: "p04", memberIds: ["p06"], field: "Tài chính", route: "co_san",
    intakeDate: "2026-06-10", intakeStage: "hoan_thanh", stage: "hoan_thanh", stageEnteredAt: "2026-06-10", status: "dang_thuc_hien", statusReason: "",
    nextAction: "Chọn phương án tạp chí mới sau từ chối", nextDue: "", ownerId: "p04", lastUpdate: "2026-10-16", targetMilestone: "", dateSource: "", verifyLevel: "tu_khai" }
];

const manuscripts = [
  { id: "MS-001", title: "Medication adherence among hypertensive patients at commune health stations in Northern Vietnam", articleType: "nghien_cuu_goc", projectIds: ["NC-01"], unitId: "u-yd", correspondingId: "p01", authorIds: ["p01", "p02", "p14"], route: "moi",
    intakeDate: "2026-09-01", stage: "viet_bai", stageEnteredAt: "2026-09-01", status: "dang_thuc_hien", statusReason: "", version: "v0.3", nextAction: "Hoàn thiện phần phương pháp", nextDue: "2026-11-20", ownerId: "p01", lastUpdate: "2026-10-22",
    journalOptions: [{ journalId: "j02", role: "muc_tieu", fit: "Phù hợp phạm vi; cần chuyển góc nhìn sang giáo dục bệnh nhân", requirements: "≤ 4.000 từ; STROBE", cost: "Có phí", note: "" },
                     { journalId: "j07", role: "du_phong", fit: "Phù hợp phạm vi y tế công cộng", requirements: "", cost: "Có phí", note: "Chưa xác minh chỉ mục" },
                     { journalId: "j05", role: "du_phong", fit: "Trong nước, phù hợp", requirements: "", cost: "", note: "" }] },
  { id: "MS-002", title: "Clinical competence of final-year nursing students: a cross-sectional study", articleType: "nghien_cuu_goc", projectIds: ["NC-02"], unitId: "u-yd", correspondingId: "p03", authorIds: ["p03", "p07"], route: "moi",
    intakeDate: "2026-04-15", stage: "sua_bai", stageEnteredAt: "2026-09-03", status: "dang_thuc_hien", statusReason: "", version: "R1", nextAction: "Hoàn thiện bảng trả lời, góp ý bản sửa", nextDue: "2026-11-03", ownerId: "p03", lastUpdate: "2026-10-20",
    journalOptions: [{ journalId: "j02", role: "muc_tieu", fit: "Đã nộp", requirements: "", cost: "Có phí", note: "" }] },
  { id: "MS-003", title: "E-wallet adoption among consumers in Hai Phong: a PLS-SEM approach", articleType: "nghien_cuu_goc", projectIds: ["NC-03"], unitId: "u-kt", correspondingId: "p05", authorIds: ["p05", "p06"], route: "moi",
    intakeDate: "2026-07-10", stage: "da_nop", stageEnteredAt: "2026-09-15", status: "cho_ben_ngoai", statusReason: "Tạp chí đang xử lý", version: "v1.0", nextAction: "Theo dõi theo mốc phù hợp của tạp chí", nextDue: "", ownerId: "p05", lastUpdate: "2026-09-15",
    journalOptions: [{ journalId: "j04", role: "muc_tieu", fit: "Đã nộp", requirements: "", cost: "Có phí", note: "" }, { journalId: "j03", role: "du_phong", fit: "Phạm vi phù hợp", requirements: "", cost: "", note: "Cần xác minh" }] },
  { id: "MS-004", title: "Self-assessed versus preceptor-assessed clinical skills in nursing students", articleType: "ngan", projectIds: ["NC-02"], unitId: "u-yd", correspondingId: "p03", authorIds: ["p03"], route: "moi",
    intakeDate: "2026-08-10", stage: "viet_bai", stageEnteredAt: "2026-08-10", status: "dang_thuc_hien", statusReason: "", version: "v0.2", nextAction: "Viết phần kết quả", nextDue: "2026-11-30", ownerId: "p03", lastUpdate: "2026-10-12", journalOptions: [] },
  { id: "MS-006", title: "Accounting information quality in Vietnamese logistics firms", articleType: "nghien_cuu_goc", projectIds: ["NC-06"], unitId: "u-kt", correspondingId: "p06", authorIds: ["p06", "p04"], route: "moi",
    intakeDate: "2026-08-25", stage: "phan_bien_nb", stageEnteredAt: "2026-09-22", status: "cho_noi_bo", statusReason: "Người góp ý đang quá tải", version: "v1.1", nextAction: "Bố trí thời gian hoặc người thay thế", nextDue: "2026-10-30", ownerId: "p10", lastUpdate: "2026-10-15",
    journalOptions: [{ journalId: "j06", role: "muc_tieu", fit: "", requirements: "", cost: "Có phí", note: "" }, { journalId: "j03", role: "du_phong", fit: "", requirements: "", cost: "", note: "" }] },
  { id: "MS-009", title: "A nurse-led health education model for patients with type 2 diabetes", articleType: "nghien_cuu_goc", projectIds: ["NC-09"], unitId: "u-yd", correspondingId: "p01", authorIds: ["p01", "p03"], route: "hoi_cuu",
    intakeDate: "2026-02-01", stage: "xuat_ban", stageEnteredAt: "2026-09-15", status: "hoan_thanh", statusReason: "", version: "Final", nextAction: "", nextDue: "", ownerId: "p01", lastUpdate: "2026-09-15", journalOptions: [] },
  { id: "MS-010", title: "Credit risk determinants of Vietnamese joint-stock commercial banks", articleType: "nghien_cuu_goc", projectIds: ["NC-10"], unitId: "u-kt", correspondingId: "p04", authorIds: ["p04", "p06"], route: "co_san",
    intakeDate: "2026-06-10", stage: "sua_bai", stageEnteredAt: "2026-10-16", status: "dang_thuc_hien", statusReason: "Bị từ chối, cần chọn phương án tiếp theo", version: "v2.0", nextAction: "Chọn phương án tạp chí mới", nextDue: "", ownerId: "p04", lastUpdate: "2026-10-16",
    journalOptions: [{ journalId: "j06", role: "muc_tieu", fit: "Đã nộp — bị từ chối", requirements: "", cost: "", note: "" }] },
  { id: "MS-011", title: "Antibiotic prescribing patterns in district hospitals (bản thảo có sẵn)", articleType: "nghien_cuu_goc", projectIds: [], unitId: "u-yd", correspondingId: "p02", authorIds: ["p02"], route: "cuu_ban_thao",
    intakeDate: "2026-03-10", stage: "viet_bai", stageEnteredAt: "2026-03-10", status: "tam_dung", statusReason: "Tác giả bận giảng dạy học kỳ II", version: "v0.8", nextAction: "Xác minh khả năng tham gia chương trình cứu bản thảo", nextDue: "", ownerId: "p11", lastUpdate: "2026-04-02", journalOptions: [] },
  { id: "MS-012", title: "Determinants of green banking adoption in Vietnam", articleType: "nghien_cuu_goc", projectIds: ["NC-03"], unitId: "u-kt", correspondingId: "p05", authorIds: ["p05"], route: "co_san",
    intakeDate: "2026-02-01", stage: "chap_nhan", stageEnteredAt: "2026-10-10", status: "dang_thuc_hien", statusReason: "", version: "Accepted", nextAction: "Kiểm tra bản in thử", nextDue: "2026-11-15", ownerId: "p05", lastUpdate: "2026-10-10", journalOptions: [] }
];

const submissions = [
  { id: "SUB-002-1", manuscriptId: "MS-002", journalId: "j02", journalRef: "BMED-D-26-0412", submittedAt: "2026-06-20", decision: "can_sua", decisionAt: "2026-09-03", endedAt: "", evidenceUrl: "",
    revisionRounds: [{ round: 1, dueAt: "2026-11-03", submittedAt: "" }] },
  { id: "SUB-003-1", manuscriptId: "MS-003", journalId: "j04", journalRef: "OABM-2026-0917", submittedAt: "2026-09-15", decision: "dang_xu_ly", decisionAt: "", endedAt: "", evidenceUrl: "", revisionRounds: [] },
  { id: "SUB-009-1", manuscriptId: "MS-009", journalId: "j01", journalRef: "HELIYON-D-26-1102", submittedAt: "2026-03-10", decision: "chap_nhan", decisionAt: "2026-08-05", endedAt: "2026-08-05", evidenceUrl: "",
    revisionRounds: [{ round: 1, dueAt: "2026-06-30", submittedAt: "2026-06-25" }] },
  { id: "SUB-010-1", manuscriptId: "MS-010", journalId: "j06", journalRef: "sustainability-3301245", submittedAt: "2026-07-01", decision: "tu_choi", decisionAt: "2026-10-16", endedAt: "2026-10-16", evidenceUrl: "", revisionRounds: [] },
  { id: "SUB-012-1", manuscriptId: "MS-012", journalId: "j03", journalRef: "JAFEB-26-118", submittedAt: "2026-02-10", decision: "tu_choi", decisionAt: "2026-04-28", endedAt: "2026-04-28", evidenceUrl: "", revisionRounds: [] },
  { id: "SUB-012-2", manuscriptId: "MS-012", journalId: "j04", journalRef: "OABM-2026-0533", submittedAt: "2026-05-15", decision: "chap_nhan", decisionAt: "2026-10-10", endedAt: "2026-10-10", evidenceUrl: "",
    revisionRounds: [{ round: 1, dueAt: "2026-08-20", submittedAt: "2026-08-18" }] }
];

const publications = [
  { id: "PUB-001", manuscriptId: "MS-009", title: "A nurse-led health education model for patients with type 2 diabetes", journalId: "j01", doi: "10.9999/sample.heliyon.2026.001", publishedAt: "2026-09-15", sourceUrl: "", unitIds: ["u-yd"], versionType: "chinh_thuc", verified: true, notes: "DOI giả định" },
  { id: "PUB-002", manuscriptId: "MS-003", title: "E-wallet adoption among consumers in Hai Phong (preprint)", journalId: "", doi: "10.9999/sample.preprint.2026.077", publishedAt: "2026-09-20", sourceUrl: "", unitIds: ["u-kt"], versionType: "preprint", verified: false, notes: "Bản sơ bộ — không tính là công bố tạp chí (NT10)" },
  { id: "PUB-003", manuscriptId: "MS-009", title: "Nurse-led education model, type 2 diabetes (nhập trùng)", journalId: "j01", doi: "10.9999/sample.heliyon.2026.001", publishedAt: "2026-09-15", sourceUrl: "", unitIds: ["u-yd"], versionType: "chinh_thuc", verified: false, notes: "Nhập trùng từ báo cáo khoa — cần đối soát (NT10)" }
];

const S = (o) => Object.assign({ id: "", parentType: "", parentId: "", workItemId: "", requesterId: "", unitId: "", problem: "", supportType: "", expectedOutput: "", docsUrl: "",
  confirmedCause: "", confirmedBy: "", blocking: "", priority: "", priorityReason: "", coordinatorId: "", providerId: "", status: "moi_gui",
  submittedAt: "", triagedAt: "", firstResponseAt: "", assignedAt: "", startedAt: "", dueOriginal: "", dueAdjusted: "", extensionReason: "", deliveredAt: "", confirmedAt: "",
  deliverable: "", evidenceUrl: "", feedback: "", acceptance: "", closedAt: "", closeReason: "", linkedSupportId: "" }, o);
const supports = [
  S({ id: "YC-001", parentType: "projects", parentId: "NC-01", workItemId: "W-001", requesterId: "p01", unitId: "u-yd", problem: "Cần tư vấn chọn mô hình hồi quy logistic đa biến và xử lý dữ liệu thiếu", supportType: "thong_ke", expectedOutput: "Kế hoạch phân tích đã rà soát", confirmedCause: "Chưa có kế hoạch phân tích chi tiết", confirmedBy: "p10", blocking: "cao", priority: "cao", priorityReason: "Chặn mốc phân tích", coordinatorId: "p10", providerId: "pv1", status: "da_phan_cong", submittedAt: "2026-10-16", triagedAt: "2026-10-20", firstResponseAt: "2026-10-20", assignedAt: "2026-10-21", dueOriginal: "2026-11-06", acceptance: "Chủ nhiệm xác nhận kế hoạch phân tích dùng được" }),
  S({ id: "YC-002", parentType: "manuscripts", parentId: "MS-002", requesterId: "p03", unitId: "u-yd", problem: "Góp ý phương pháp cho bản sửa theo phản biện 2", supportType: "phuong_phap", expectedOutput: "Nhận xét bản sửa và bảng trả lời", confirmedCause: "Phản biện yêu cầu phân tích độ nhạy", confirmedBy: "p11", blocking: "cao", priority: "cao", priorityReason: "Hạn sửa bài 03/11", coordinatorId: "p11", providerId: "pv2", status: "dang_xu_ly", submittedAt: "2026-10-05", triagedAt: "2026-10-07", firstResponseAt: "2026-10-07", assignedAt: "2026-10-07", startedAt: "2026-10-08", dueOriginal: "2026-10-31", acceptance: "Tác giả xác nhận" }),
  S({ id: "YC-003", parentType: "projects", parentId: "NC-04", requesterId: "p04", unitId: "u-kt", problem: "Cần ghép cố vấn có kinh nghiệm công bố về chuyển đổi số", supportType: "co_van", expectedOutput: "Cố vấn được xác nhận và lịch trao đổi", status: "moi_gui", submittedAt: "2026-10-13", coordinatorId: "p10" }),
  S({ id: "YC-004", parentType: "manuscripts", parentId: "MS-006", requesterId: "p06", unitId: "u-kt", problem: "Phản biện nội bộ bản thảo v1.1", supportType: "phan_bien", expectedOutput: "Phiếu phản biện nội bộ", confirmedCause: "Cần phản biện trước khi nộp", confirmedBy: "p10", blocking: "cao", priority: "trung_binh", coordinatorId: "p10", providerId: "pv4", status: "dang_xu_ly", submittedAt: "2026-09-22", triagedAt: "2026-09-24", firstResponseAt: "2026-09-24", assignedAt: "2026-09-25", startedAt: "2026-09-28", dueOriginal: "2026-10-15", dueAdjusted: "2026-10-30", extensionReason: "Người phản biện quá tải — gia hạn, xác nhận bởi ThS. Đỗ Hải Yến", acceptance: "Tác giả và điều phối xác nhận" }),
  S({ id: "YC-005", parentType: "manuscripts", parentId: "MS-012", requesterId: "p05", unitId: "u-kt", problem: "Biên tập tiếng Anh bản sửa vòng 1", supportType: "ngon_ngu", expectedOutput: "Bản thảo đã biên tập", blocking: "trung_binh", priority: "trung_binh", coordinatorId: "p10", providerId: "pv3", status: "hoan_thanh", submittedAt: "2026-08-04", triagedAt: "2026-08-06", firstResponseAt: "2026-08-06", assignedAt: "2026-08-06", startedAt: "2026-08-07", dueOriginal: "2026-08-25", deliveredAt: "2026-08-20", confirmedAt: "2026-08-22", deliverable: "Bản thảo track changes", feedback: "Đạt yêu cầu" }),
  S({ id: "YC-006", parentType: "manuscripts", parentId: "MS-009", requesterId: "p01", unitId: "u-yd", problem: "Biên tập tiếng Anh bản sửa R1", supportType: "ngon_ngu", expectedOutput: "Bản thảo đã biên tập", blocking: "cao", priority: "cao", coordinatorId: "p11", providerId: "pv3", status: "hoan_thanh", submittedAt: "2026-06-10", triagedAt: "2026-06-11", firstResponseAt: "2026-06-11", assignedAt: "2026-06-11", startedAt: "2026-06-12", dueOriginal: "2026-06-22", deliveredAt: "2026-06-20", confirmedAt: "2026-06-21", deliverable: "Bản biên tập", feedback: "Đạt" }),
  S({ id: "YC-007", parentType: "manuscripts", parentId: "MS-003", requesterId: "p05", unitId: "u-kt", problem: "Lập phương án tạp chí cho bài ví điện tử", supportType: "chon_tap_chi", expectedOutput: "3–5 phương án kèm nguồn xác minh", blocking: "trung_binh", priority: "trung_binh", coordinatorId: "p10", providerId: "pv5", status: "hoan_thanh", submittedAt: "2026-08-18", triagedAt: "2026-08-21", firstResponseAt: "2026-08-21", assignedAt: "2026-08-21", startedAt: "2026-08-24", dueOriginal: "2026-09-04", deliveredAt: "2026-09-08", confirmedAt: "2026-09-10", deliverable: "Bảng 4 phương án tạp chí", feedback: "Đạt, trễ 4 ngày" }),
  S({ id: "YC-008", parentType: "projects", parentId: "NC-07", requesterId: "p02", unitId: "u-yd", problem: "Hướng dẫn hoàn thiện hồ sơ xét duyệt đạo đức", supportType: "dao_duc", expectedOutput: "Hồ sơ đạo đức đủ điều kiện nộp", blocking: "cao", priority: "cao", coordinatorId: "p11", providerId: "pv6", status: "dang_xu_ly", submittedAt: "2026-08-22", triagedAt: "2026-08-25", firstResponseAt: "2026-08-25", assignedAt: "2026-08-26", startedAt: "2026-08-26", dueOriginal: "2026-11-20", acceptance: "Hội đồng nhận hồ sơ" }),
  S({ id: "YC-009", parentType: "manuscripts", parentId: "MS-010", requesterId: "p04", unitId: "u-kt", problem: "Tư vấn phương án tạp chí sau khi bị từ chối", supportType: "chon_tap_chi", expectedOutput: "Phương án tạp chí mới", status: "moi_gui", submittedAt: "2026-10-21", coordinatorId: "p10" }),
  S({ id: "YC-010", parentType: "manuscripts", parentId: "MS-001", requesterId: "p01", unitId: "u-yd", problem: "Biên tập tiếng Anh phần giới thiệu", supportType: "ngon_ngu", expectedOutput: "Phần giới thiệu đã biên tập", blocking: "thap", priority: "thap", coordinatorId: "p11", providerId: "pv3", status: "cho_xac_nhan", submittedAt: "2026-10-01", triagedAt: "2026-10-02", firstResponseAt: "2026-10-02", assignedAt: "2026-10-02", startedAt: "2026-10-05", dueOriginal: "2026-10-23", deliveredAt: "2026-10-22", deliverable: "Bản biên tập phần giới thiệu" }),
  S({ id: "YC-011", parentType: "projects", parentId: "NC-01", requesterId: "p02", unitId: "u-yd", problem: "Xin tư vấn thống kê (gửi trùng)", supportType: "thong_ke", status: "dong", submittedAt: "2026-10-17", triagedAt: "2026-10-19", firstResponseAt: "2026-10-19", closedAt: "2026-10-19", closeReason: "trung", linkedSupportId: "YC-001", coordinatorId: "p10" }),
  S({ id: "YC-012", parentType: "projects", parentId: "NC-05", requesterId: "p14", unitId: "u-yd", problem: "Hỗ trợ thủ tục gia hạn kinh phí do tạm dừng thu thập dữ liệu", supportType: "kinh_phi", expectedOutput: "Văn bản gia hạn", status: "can_bo_sung", submittedAt: "2026-10-06", triagedAt: "", firstResponseAt: "2026-10-08", coordinatorId: "p11", feedback: "Đã đề nghị bổ sung văn bản của bệnh viện đối tác" }),
  S({ id: "YC-013", parentType: "manuscripts", parentId: "MS-004", requesterId: "p03", unitId: "u-yd", problem: "Góp ý thiết kế bài ngắn", supportType: "phuong_phap", expectedOutput: "Nhận xét đề cương bài", blocking: "thap", priority: "thap", coordinatorId: "p11", providerId: "pv4", status: "da_phan_cong", submittedAt: "2026-10-09", triagedAt: "2026-10-12", firstResponseAt: "2026-10-12", assignedAt: "2026-10-14", dueOriginal: "2026-11-10" }),
  S({ id: "YC-014", parentType: "manuscripts", parentId: "MS-010", requesterId: "p04", unitId: "u-kt", problem: "Phản biện nội bộ trước khi nộp lại", supportType: "phan_bien", expectedOutput: "Phiếu phản biện", blocking: "trung_binh", priority: "trung_binh", coordinatorId: "p10", providerId: "pv4", status: "da_phan_cong", submittedAt: "2026-10-19", triagedAt: "2026-10-21", firstResponseAt: "2026-10-21", assignedAt: "2026-10-22", dueOriginal: "2026-11-12" }),
  S({ id: "YC-015", parentType: "projects", parentId: "NC-03", requesterId: "p05", unitId: "u-kt", problem: "Kiểm tra mô hình PLS-SEM", supportType: "thong_ke", expectedOutput: "Báo cáo kiểm tra mô hình", blocking: "cao", priority: "cao", coordinatorId: "p10", providerId: "pv1", status: "hoan_thanh", submittedAt: "2026-06-15", triagedAt: "2026-06-17", firstResponseAt: "2026-06-17", assignedAt: "2026-06-17", startedAt: "2026-06-18", dueOriginal: "2026-07-03", deliveredAt: "2026-07-01", confirmedAt: "2026-07-02", deliverable: "Báo cáo kiểm tra", feedback: "Đạt" }),
  S({ id: "YC-016", parentType: "projects", parentId: "NC-02", requesterId: "p03", unitId: "u-yd", problem: "Tư vấn thống kê cho bài thứ hai", supportType: "thong_ke", expectedOutput: "Kết quả phân tích bổ sung", blocking: "trung_binh", priority: "trung_binh", coordinatorId: "p11", providerId: "pv1", status: "hoan_thanh", submittedAt: "2026-09-01", triagedAt: "2026-09-10", firstResponseAt: "2026-09-10", assignedAt: "2026-09-10", startedAt: "2026-09-11", dueOriginal: "2026-09-30", deliveredAt: "2026-09-28", confirmedAt: "2026-10-01", deliverable: "Bảng kết quả", feedback: "Đạt" })
];

const W = (o) => Object.assign({ id: "", parentType: "", parentId: "", title: "", output: "", ownerId: "", dueOriginal: "", dueAdjusted: "", extensionReason: "", status: "dang_thuc_hien", statusLog: [], evidenceUrl: "", createdAt: "", kind: "" }, o);
const workItems = [
  W({ id: "W-001", parentType: "projects", parentId: "NC-01", title: "Phân tích dữ liệu khảo sát", output: "Bảng kết quả phân tích", ownerId: "p01", dueOriginal: "2026-10-30", dueAdjusted: "2026-11-15", extensionReason: "Chờ tư vấn thống kê", status: "cho_noi_bo", createdAt: "2026-09-23",
    statusLog: [{ status: "dang_thuc_hien", at: "2026-09-23" }, { status: "tam_dung", at: "2026-10-09", reason: "Chủ nhiệm đi công tác" }, { status: "cho_noi_bo", at: "2026-10-16", reason: "Gửi YC-001 tư vấn thống kê" }] }),
  W({ id: "W-002", parentType: "projects", parentId: "NC-01", title: "Viết bản thảo MS-001", output: "Bản thảo v1.0", ownerId: "p01", dueOriginal: "2026-11-20", status: "dang_thuc_hien", createdAt: "2026-09-01", statusLog: [{ status: "dang_thuc_hien", at: "2026-09-01" }] }),
  W({ id: "W-003", parentType: "manuscripts", parentId: "MS-002", title: "Hoàn thiện bảng trả lời phản biện", output: "Bảng trả lời + bản sửa R1", ownerId: "p03", dueOriginal: "2026-11-03", status: "dang_thuc_hien", createdAt: "2026-09-04", statusLog: [{ status: "dang_thuc_hien", at: "2026-09-04" }] }),
  W({ id: "W-004", parentType: "projects", parentId: "NC-02", title: "Viết bản thảo thứ hai (MS-004)", output: "Bản thảo v1.0", ownerId: "p03", dueOriginal: "2026-11-30", status: "dang_thuc_hien", createdAt: "2026-08-10", statusLog: [{ status: "dang_thuc_hien", at: "2026-08-10" }] }),
  W({ id: "W-005", parentType: "projects", parentId: "NC-04", title: "Xác nhận cố vấn và lịch trao đổi", output: "Cố vấn được phân công", ownerId: "p10", dueOriginal: "2026-10-31", status: "cho_noi_bo", createdAt: "2026-10-13", statusLog: [{ status: "cho_noi_bo", at: "2026-10-13" }] }),
  W({ id: "W-006", parentType: "projects", parentId: "NC-05", title: "Thu thập hồ sơ bệnh án", output: "400 hồ sơ đã mã hóa", ownerId: "p14", dueOriginal: "2026-10-15", dueAdjusted: "", status: "tam_dung", createdAt: "2026-07-01",
    statusLog: [{ status: "dang_thuc_hien", at: "2026-07-01" }, { status: "cho_ben_ngoai", at: "2026-09-10", reason: "Chờ bệnh viện cấp quyền đợt 2" }, { status: "tam_dung", at: "2026-10-02", reason: "Bệnh viện tạm dừng cấp quyền truy cập" }] }),
  W({ id: "W-007", parentType: "manuscripts", parentId: "MS-006", title: "Phản biện nội bộ bản v1.1", output: "Phiếu phản biện", ownerId: "p13", dueOriginal: "2026-10-15", dueAdjusted: "2026-10-30", extensionReason: "Người phản biện quá tải", status: "cho_noi_bo", createdAt: "2026-09-22",
    statusLog: [{ status: "cho_noi_bo", at: "2026-09-22" }] }),
  W({ id: "W-008", parentType: "projects", parentId: "NC-07", title: "Hồ sơ xét duyệt đạo đức", output: "Quyết định của Hội đồng đạo đức", ownerId: "p02", dueOriginal: "2026-11-20", status: "cho_ben_ngoai", createdAt: "2026-08-20",
    statusLog: [{ status: "dang_thuc_hien", at: "2026-08-20" }, { status: "cho_ben_ngoai", at: "2026-09-25", reason: "Đã nộp hồ sơ cho Hội đồng" }] }),
  W({ id: "W-009", parentType: "projects", parentId: "NC-08", title: "Hoàn thiện câu hỏi nghiên cứu", output: "Đề cương sơ bộ", ownerId: "p05", dueOriginal: "2026-09-15", status: "dang_thuc_hien", createdAt: "2026-07-15", statusLog: [{ status: "dang_thuc_hien", at: "2026-07-15" }] }),
  W({ id: "W-010", parentType: "manuscripts", parentId: "MS-012", title: "Kiểm tra bản in thử", output: "Bản in thử đã duyệt", ownerId: "p05", dueOriginal: "2026-11-15", status: "dang_thuc_hien", createdAt: "2026-10-10", statusLog: [{ status: "dang_thuc_hien", at: "2026-10-10" }] })
];

// Nhật ký sự kiện: tạo hồ sơ + một số chuyển giai đoạn + một đính chính (NT18)
let ev = 0;
const E = (entityType, entityId, type, field, before, after, occurredAt, by, reason = "", evidenceUrl = "", extra = {}) =>
  Object.assign({ id: "E-" + String(++ev).padStart(4, "0"), entityType, entityId, type, field, before, after, occurredAt, recordedAt: occurredAt + "T09:00:00+07:00", by, reason, evidenceUrl, correctsEventId: "" }, extra);
const events = [];
projects.forEach(p => events.push(E("projects", p.id, "tiep_nhan", "stage", "", p.intakeStage, p.intakeDate, "p10", p.route === "hoi_cuu" ? "Tiếp nhận hồi cứu — ngày lịch sử nhập lại" : "Tiếp nhận hồ sơ")));
manuscripts.forEach(m => events.push(E("manuscripts", m.id, "tiep_nhan", "stage", "", m.stage === "viet_bai" ? "viet_bai" : m.stage, m.intakeDate, "p10", "Tiếp nhận bản thảo")));
events.push(E("projects", "NC-01", "chuyen_giai_doan", "stage", "de_cuong", "du_lieu", "2026-07-06", "p01", "Đề cương được duyệt; không cần thẩm định đạo đức (khảo sát ẩn danh)", "https://example.org/minh-chung/nc01-de-cuong"));
events.push(E("projects", "NC-01", "chuyen_giai_doan", "stage", "du_lieu", "phan_tich", "2026-09-23", "p01", "Đủ 312 phiếu; có mô tả biến", "https://example.org/minh-chung/nc01-du-lieu"));
events.push(E("projects", "NC-01", "doi_tinh_trang", "status", "dang_thuc_hien", "cho_noi_bo", "2026-10-16", "p01", "Gửi YC-001 tư vấn thống kê"));
events.push(E("manuscripts", "MS-002", "chuyen_giai_doan", "stage", "san_sang", "da_nop", "2026-06-20", "p03", "Biên nhận nộp bài", "https://example.org/minh-chung/ms002-bien-nhan"));
events.push(E("manuscripts", "MS-002", "chuyen_giai_doan", "stage", "da_nop", "sua_bai", "2026-09-03", "p03", "Quyết định: cần sửa (major revision)", "https://example.org/minh-chung/ms002-quyet-dinh"));
events.push(E("manuscripts", "MS-006", "chuyen_giai_doan", "stage", "viet_bai", "phan_bien_nb", "2026-09-22", "p06", "Bản v1.1; người góp ý: TS. Cao Ngọc Bích; mốc phản hồi 15/10"));
events.push(E("supports", "YC-004", "gia_han", "dueAdjusted", "", "2026-10-30", "2026-10-14", "p10", "Người phản biện quá tải"));
events.push(E("manuscripts", "MS-010", "quyet_dinh_tap_chi", "decision", "dang_xu_ly", "tu_choi", "2026-10-16", "p04", "Thư từ chối của tạp chí", "https://example.org/minh-chung/ms010-tu-choi"));
events.push(E("manuscripts", "MS-012", "chuyen_giai_doan", "stage", "sua_bai", "chap_nhan", "2026-10-10", "p05", "Thư chấp nhận", "https://example.org/minh-chung/ms012-chap-nhan"));
events.push(E("manuscripts", "MS-009", "chuyen_giai_doan", "stage", "chap_nhan", "xuat_ban", "2026-09-15", "p01", "Trang xuất bản chính thức + DOI", "https://example.org/minh-chung/ms009-xuat-ban"));
const wrong = E("manuscripts", "MS-003", "chuyen_giai_doan", "stage", "san_sang", "da_nop", "2026-09-05", "p05", "Biên nhận nộp bài");
events.push(wrong);
events.push(E("manuscripts", "MS-003", "dinh_chinh", "stageEnteredAt", "2026-09-05", "2026-09-15", "2026-09-15", "p10", "Đính chính: ngày nộp thực tế theo biên nhận là 15/09", "https://example.org/minh-chung/ms003-bien-nhan", { correctsEventId: wrong.id }));
events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

const settings = {
  cb01Days: 30, cb02Days: 7, triageWorkdays: 5, cb05Workdays: 5, cb06Days: 180, journalReviewDays: 92, rulesVersion: "1.0 (đề xuất, cần chốt)",
  holidays: ["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-04-27", "2026-04-30", "2026-05-01", "2026-08-31", "2026-09-01", "2026-09-02"],
  closedAlerts: []
};

console.log(JSON.stringify({
  meta: { version: 1, sample: true, updatedAt: "2026-10-27T00:00:00.000Z", note: "Toàn bộ dữ liệu là GIẢ ĐỊNH để thiết kế và kiểm tra logic (đặc tả mục 12). Xóa tại Cấu hình › Dữ liệu trước khi nhập dữ liệu thật." },
  settings, units, people, providers, projects, manuscripts, workItems, supports, submissions, journals, publications, events
}, null, 1));
