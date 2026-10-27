/* Nghiệp vụ tối giản theo Kế hoạch thúc đẩy NCKH 2026–2028: trạng thái hồ sơ (Phụ lục 3, mục 5.10),
   gói hỗ trợ (mục 5.3) và cảnh báo (mục 5.10, mục 10). */
(function () {
  const TZ = "Asia/Ho_Chi_Minh";

  // Chặng: gom 14 trạng thái thành 5 nhóm để nhìn nhanh "đang ở đâu"
  const PHASES = [
    ["chuan_bi", "Chuẩn bị nghiên cứu", 1],
    ["viet", "Viết & phản biện nội bộ", 2],
    ["tap_chi", "Đang ở tạp chí", 3],
    ["ket_qua", "Đã có kết quả", 4],
    ["tam_dung", "Tạm dừng", 0]
  ];
  // [mã, nhãn, chặng, điều kiện (Phụ lục 3)]
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
  // Gói hỗ trợ (mục 5.3)
  const SUPPORT_TYPES = [
    ["y_tuong", "Phát triển ý tưởng"], ["de_cuong", "Hoàn thiện đề cương"], ["thong_ke", "Thống kê – phân tích"],
    ["dao_duc", "Đạo đức – dữ liệu"], ["viet_bai", "Viết bản thảo"], ["phan_bien", "Phản biện nội bộ"],
    ["tieng_anh", "Hiệu đính tiếng Anh"], ["tap_chi", "Lựa chọn tạp chí"], ["tra_loi", "Trả lời phản biện"],
    ["nop_lai", "Nộp lại sau từ chối"], ["kinh_phi", "Kinh phí – thủ tục"], ["khac", "Khác"]
  ];
  const SUPPORT_STATUS = [["moi", "Mới gửi"], ["dang_xu_ly", "Đang xử lý"], ["xong", "Đã xong"], ["huy", "Hủy"]];
  const QUARTILES = [["Q1", "Q1"], ["Q2", "Q2"], ["Q3", "Q3"], ["Q4", "Q4"], ["trong_nuoc", "Trong nước"], ["chua_ro", "Chưa xác định"]];

  const map = arr => Object.fromEntries(arr.map(a => [a[0], a]));
  const S = map(STATUSES), PH = map(PHASES), ST = map(SUPPORT_TYPES), SS = map(SUPPORT_STATUS), Q = map(QUARTILES);
  const statusLabel = k => (S[k] || [])[1] || "";
  const phaseOf = k => (S[k] || [])[2] || "";
  const SUBMITTED = ["dang_phan_bien", "sua_bai", "bi_tu_choi", "chap_nhan", "xuat_ban"];

  const DEFAULT_SETTINGS = {
    units: [], staleDays: 30, soonDays: 7, triageWorkdays: 5, resubmitDays: 30, holidays: []
  };

  /* ---------- Ngày: lưu "YYYY-MM-DD" theo múi giờ đơn vị ---------- */
  const T = {
    today() { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); },
    ms(s) { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); },
    days(a, b) { return a && b ? Math.round((T.ms(b) - T.ms(a)) / 864e5) : null; },
    add(s, n) { return new Date(T.ms(s) + n * 864e5).toISOString().slice(0, 10); },
    isWorkday(s, hol) { const w = new Date(T.ms(s)).getUTCDay(); return w !== 0 && w !== 6 && !(hol || []).includes(s); },
    addWorkdays(s, n, hol) { let d = s, k = 0; while (k < n) { d = T.add(d, 1); if (T.isWorkday(d, hol)) k++; } return d; },
    fmt(s) { if (!s) return ""; const [y, m, d] = s.slice(0, 10).split("-"); return `${d}/${m}/${y}`; },
    fmtTime(iso) { return iso ? new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(iso)) : ""; }
  };

  /* ---------- Yêu cầu hỗ trợ ---------- */
  function supportFacts(s, st, today) {
    const open = s.status === "moi" || s.status === "dang_xu_ly";
    const triageDue = s.createdAt ? T.addWorkdays(s.createdAt, st.triageWorkdays, st.holidays) : "";
    return {
      open,
      triageDue,
      triageLate: s.status === "moi" && !!triageDue && today > triageDue,  // chưa ai nhận sau 5 ngày làm việc
      overdue: open && !!s.due && today > s.due,
      age: open ? T.days(s.createdAt, today) : null
    };
  }

  /* ---------- Cảnh báo cho một hồ sơ (mục 5.10, mục 10) ---------- */
  function recordFlags(r, data, today) {
    const st = Object.assign({}, DEFAULT_SETTINGS, data.settings);
    const flags = [];
    const done = r.status === "xuat_ban";
    if (done) return flags;
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
    const late = data.supports.filter(s => s.recordId === r.id).map(s => supportFacts(s, st, today)).filter(f => f.overdue || f.triageLate).length;
    if (late) flags.push({ tone: "crit", text: `${late} yêu cầu hỗ trợ trễ` });
    return flags;
  }

  window.Domain = { TZ, PHASES, STATUSES, SUPPORT_TYPES, SUPPORT_STATUS, QUARTILES, S, PH, ST, SS, Q, statusLabel, phaseOf, SUBMITTED,
    DEFAULT_SETTINGS, T, supportFacts, recordFlags };
})();
