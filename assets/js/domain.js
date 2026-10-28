/* Nghiệp vụ của Cổng hỗ trợ và quản lý nghiên cứu (sáng kiến v2.0):
   trạng thái hồ sơ (Kế hoạch Phụ lục 3), luồng yêu cầu hỗ trợ, suất của người hỗ trợ, thẻ hỗ trợ (hạn mức), cảnh báo, chỉ tiêu. */
(function () {
  const TZ = "Asia/Ho_Chi_Minh";

  const ROLES = [["giang_vien", "Giảng viên / nhà nghiên cứu"], ["dieu_phoi", "Điều phối viên"], ["lanh_dao", "Lãnh đạo"], ["quan_tri", "Quản trị viên"]];

  // Chặng gom 14 trạng thái hồ sơ
  const PHASES = [["chuan_bi", "Chuẩn bị nghiên cứu", 1], ["viet", "Viết & phản biện nội bộ", 2], ["tap_chi", "Đang ở tạp chí", 3], ["ket_qua", "Đã có kết quả", 4], ["tam_dung", "Tạm dừng", 0]];
  const STATUSES = [
    ["y_tuong", "Ý tưởng", "chuan_bi", "Đã xác định vấn đề và nhóm tác giả sơ bộ"],
    ["de_cuong", "Đề cương", "chuan_bi", "Đang hoàn thiện thiết kế, đạo đức và kế hoạch dữ liệu"],
    ["dao_duc", "Đạo đức", "chuan_bi", "Đang làm hồ sơ đạo đức / quyền sử dụng dữ liệu"],
    ["du_lieu", "Thu thập dữ liệu", "chuan_bi", "Đang thu thập, làm sạch hoặc khóa dữ liệu"],
    ["phan_tich", "Phân tích", "chuan_bi", "Đang phân tích và thống nhất diễn giải"],
    ["viet_bai", "Viết bài", "viet", "Đang hoàn thiện bản thảo"],
    ["phan_bien_nb", "Phản biện nội bộ", "viet", "Đang nhận và xử lý góp ý nội bộ"],
    ["san_sang", "Sẵn sàng nộp", "viet", "Đã duyệt tạp chí, định dạng và hồ sơ"],
    ["dang_phan_bien", "Đang phản biện", "tap_chi", "Đã nộp và chờ quyết định"],
    ["sua_bai", "Sửa bài", "tap_chi", "Đang trả lời phản biện"],
    ["bi_tu_choi", "Bị từ chối – chờ nộp lại", "tap_chi", "Họp trong 5 ngày làm việc, chọn tạp chí dự phòng, nộp lại ≤ 30 ngày"],
    ["chap_nhan", "Chấp nhận", "ket_qua", "Có quyết định chấp nhận hợp lệ"],
    ["xuat_ban", "Xuất bản", "ket_qua", "Đã có DOI / thông tin xuất bản chính thức"],
    ["tam_dung", "Tạm dừng", "tam_dung", "Có quyết định, lý do và mốc xem xét lại"]
  ];
  // Luồng yêu cầu hỗ trợ: giảng viên đề xuất → điều phối chốt → người hỗ trợ nhận → bàn giao → người gửi xác nhận
  const SUPPORT_STATUS = [
    ["cho_duyet", "Chờ điều phối duyệt", "info"], ["cho_nhan", "Đã phân công, chờ nhận", "info"], ["dang_xu_ly", "Đang xử lý", "info"],
    ["cho_xac_nhan", "Đã bàn giao, chờ xác nhận", "warn"], ["hoan_thanh", "Hoàn thành", "good"], ["huy", "Đã hủy", "muted"]
  ];
  const SUPPORT_OPEN = ["cho_duyet", "cho_nhan", "dang_xu_ly", "cho_xac_nhan"];
  const SLOT_TAKING = ["cho_nhan", "dang_xu_ly"]; // các việc đang chiếm suất của người hỗ trợ
  const QUARTILES = [["Q1", "Q1"], ["Q2", "Q2"], ["Q3", "Q3"], ["Q4", "Q4"], ["trong_nuoc", "Trong nước"], ["chua_ro", "Chưa xác định"]];
  const NOTICE_KINDS = [["thong_bao", "Thông báo"], ["van_ban", "Văn bản"], ["bieu_mau", "Biểu mẫu"], ["huong_dan", "Hướng dẫn"]];
  const SUPPORTER_STATUS = [["cho_duyet", "Chờ duyệt", "warn"], ["da_duyet", "Đang nhận việc", "good"], ["tam_ngung", "Tạm ngừng nhận việc", "muted"], ["tu_choi", "Không duyệt", "crit"]];

  const DEFAULT_SETTINGS = {
    units: [], staleDays: 30, soonDays: 7, triageWorkdays: 5, resubmitDays: 30, holidays: [],
    // Gói hỗ trợ (Kế hoạch mục 5.3); needsCard = phải dùng thẻ hỗ trợ (cách B)
    supportTypes: [
      { code: "y_tuong", label: "Phát triển ý tưởng", needsCard: false }, { code: "de_cuong", label: "Hoàn thiện đề cương", needsCard: false },
      { code: "thong_ke", label: "Thống kê – phân tích", needsCard: true }, { code: "dao_duc", label: "Đạo đức – dữ liệu", needsCard: false },
      { code: "viet_bai", label: "Viết bản thảo", needsCard: false }, { code: "phan_bien", label: "Phản biện nội bộ", needsCard: false },
      { code: "tieng_anh", label: "Hiệu đính tiếng Anh", needsCard: true }, { code: "tap_chi", label: "Lựa chọn tạp chí", needsCard: false },
      { code: "tra_loi", label: "Trả lời phản biện", needsCard: false }, { code: "nop_lai", label: "Nộp lại sau từ chối", needsCard: false }
    ]
  };

  const map = arr => Object.fromEntries(arr.map(a => [a[0], a]));
  const S = map(STATUSES), PH = map(PHASES), SS = map(SUPPORT_STATUS), Q = map(QUARTILES), R = map(ROLES), NK = map(NOTICE_KINDS), SPS = map(SUPPORTER_STATUS);
  const statusLabel = k => (S[k] || [])[1] || "";
  const phaseOf = k => (S[k] || [])[2] || "";

  /* ---------- Ngày "YYYY-MM-DD" theo múi giờ đơn vị ---------- */
  const T = {
    today() { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); },
    ms(s) { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); },
    days(a, b) { return a && b ? Math.round((T.ms(b.slice(0, 10)) - T.ms(a.slice(0, 10))) / 864e5) : null; },
    add(s, n) { return new Date(T.ms(s) + n * 864e5).toISOString().slice(0, 10); },
    isWorkday(s, hol) { const w = new Date(T.ms(s)).getUTCDay(); return w !== 0 && w !== 6 && !(hol || []).includes(s); },
    addWorkdays(s, n, hol) { let d = s.slice(0, 10), k = 0; while (k < n) { d = T.add(d, 1); if (T.isWorkday(d, hol)) k++; } return d; },
    fmt(s) { if (!s) return ""; const [y, m, d] = s.slice(0, 10).split("-"); return `${d}/${m}/${y}`; },
    fmtTime(iso) { return iso ? new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(iso)) : ""; }
  };

  /* ---------- Yêu cầu hỗ trợ ---------- */
  function supportFacts(s, st, today) {
    const open = SUPPORT_OPEN.includes(s.status);
    const triageDue = s.createdAt ? T.addWorkdays(s.createdAt, st.triageWorkdays, st.holidays) : "";
    return {
      open,
      triageDue,
      // chưa được điều phối phân công sau N ngày làm việc (chỉ tiêu 12)
      triageLate: s.status === "cho_duyet" && !!triageDue && today > triageDue,
      overdue: ["cho_nhan", "dang_xu_ly"].includes(s.status) && !!s.due && today > s.due,
      age: open ? T.days(s.createdAt, today) : null
    };
  }

  /* ---------- Suất của người hỗ trợ ---------- */
  function supporterLoad(sp, supports) {
    const load = supports.filter(s => s.supporterId === sp.userId && SLOT_TAKING.includes(s.status)).length;
    const cap = Number(sp.capacity) || 0;
    return { load, capacity: cap, free: Math.max(0, cap - load), full: sp.status !== "da_duyet" || load >= cap };
  }

  /* ---------- Thẻ hỗ trợ: hạn mức theo năm, mỗi yêu cầu (trừ yêu cầu đã hủy) trừ 1 lượt ---------- */
  function cardUsage(card, supports) {
    const used = supports.filter(s => s.cardId === card.id && s.status !== "huy").length;
    return { used, quota: Number(card.quota) || 0, left: Math.max(0, (Number(card.quota) || 0) - used) };
  }

  /* ---------- Cảnh báo cho một hồ sơ (Kế hoạch mục 5.10, mục 10) ---------- */
  function recordFlags(r, supports, st, today) {
    const flags = [];
    if (r.status === "xuat_ban") return flags;
    const idle = T.days(r.updatedAt || r.createdAt, today);
    if (idle != null && idle > st.staleDays) flags.push({ tone: "warn", text: `${idle} ngày chưa cập nhật` });
    if (r.due && r.status !== "tam_dung") {
      const left = T.days(today, r.due);
      if (left < 0) flags.push({ tone: "crit", text: `Quá hạn ${-left} ngày` });
      else if (left <= st.soonDays && r.status === "sua_bai") flags.push({ tone: "warn", text: `Hạn sửa bài còn ${left} ngày` });
    }
    if (r.status === "bi_tu_choi") {
      const since = T.days(r.statusSince, today);
      if (!r.nextAction) flags.push({ tone: "crit", text: "Bị từ chối, chưa có kế hoạch nộp lại" });
      else if (since > st.resubmitDays) flags.push({ tone: "crit", text: `Bị từ chối ${since} ngày, chưa nộp lại` });
    }
    if (r.status === "tam_dung" && r.due && today > r.due) flags.push({ tone: "warn", text: "Đến mốc xem xét lại" });
    if (r.risk) flags.push({ tone: "crit", text: "Rủi ro: " + r.risk });
    const late = supports.filter(s => s.recordId === r.id).map(s => supportFacts(s, st, today)).filter(f => f.overdue || f.triageLate).length;
    if (late) flags.push({ tone: "crit", text: `${late} yêu cầu hỗ trợ trễ` });
    return flags;
  }

  /* Hạn của hồ sơ: đúng hạn / sắp đến hạn / quá hạn (như "Thống kê tình hình nhiệm vụ" của Bộ KHCN) */
  function dueState(r, st, today) {
    if (["xuat_ban", "tam_dung"].includes(r.status)) return "";
    if (!r.due) return "chua_dat";
    const left = T.days(today, r.due);
    return left < 0 ? "qua_han" : (left <= st.soonDays ? "sap_den" : "dung_han");
  }

  /* Hồ sơ lý lịch: mức hoàn thiện (chỉ tiêu 1: ORCID / Scopus / đơn vị chuẩn hóa) */
  function profileCompleteness(u) {
    const keys = ["name", "degree", "unit", "phone", "orcid", "fields"];
    const done = keys.filter(k => (u[k] || "").toString().trim()).length;
    return Math.round(done / keys.length * 100);
  }

  window.Domain = { TZ, ROLES, PHASES, STATUSES, SUPPORT_STATUS, SUPPORT_OPEN, SLOT_TAKING, QUARTILES, NOTICE_KINDS, SUPPORTER_STATUS,
    S, PH, SS, Q, R, NK, SPS, statusLabel, phaseOf, DEFAULT_SETTINGS, T,
    supportFacts, supporterLoad, cardUsage, recordFlags, dueState, profileCompleteness };
})();
