/* Nghiệp vụ: từ điển trạng thái (đặc tả mục 7), quy tắc thời gian (mục 9), cảnh báo (mục 10) và chỉ số (mục 11). */
(function () {
  const TZ = "Asia/Ho_Chi_Minh";

  /* ---------- Từ điển ---------- */
  const D = {
    projectStages: [
      ["y_tuong", "Ý tưởng"], ["de_cuong", "Đề cương"], ["dao_duc", "Đạo đức / quyền dữ liệu"],
      ["du_lieu", "Thu thập dữ liệu"], ["phan_tich", "Phân tích"], ["hoan_thanh", "Hoàn thành sản phẩm"]
    ],
    manuscriptStages: [
      ["viet_bai", "Viết bài"], ["phan_bien_nb", "Phản biện nội bộ"], ["san_sang", "Sẵn sàng nộp"],
      ["da_nop", "Tạp chí xử lý"], ["sua_bai", "Sửa bài"], ["chap_nhan", "Chấp nhận"], ["xuat_ban", "Xuất bản"]
    ],
    workStatus: [
      ["dang_thuc_hien", "Đang thực hiện"], ["cho_noi_bo", "Chờ hỗ trợ nội bộ"], ["cho_ben_ngoai", "Chờ bên ngoài"],
      ["tam_dung", "Tạm dừng có lý do"], ["hoan_thanh", "Hoàn thành / kết thúc"]
    ],
    supportStatus: [
      ["moi_gui", "Mới gửi"], ["can_bo_sung", "Cần bổ sung"], ["da_phan_loai", "Đã phân loại"],
      ["da_phan_cong", "Đã phân công"], ["dang_xu_ly", "Đang xử lý"], ["cho_xac_nhan", "Chờ người nhận xác nhận"],
      ["hoan_thanh", "Hoàn thành"], ["dong", "Đóng có lý do"], ["mo_lai", "Mở lại"]
    ],
    supportTypes: [
      ["thong_ke", "Tư vấn thống kê / phân tích"], ["phuong_phap", "Góp ý phương pháp"], ["phan_bien", "Phản biện nội bộ"],
      ["ngon_ngu", "Biên tập ngôn ngữ"], ["chon_tap_chi", "Chọn tạp chí"], ["dao_duc", "Thủ tục đạo đức / dữ liệu"],
      ["co_van", "Ghép cố vấn"], ["kinh_phi", "Kinh phí / thủ tục"], ["khac", "Khác"]
    ],
    blocking: [["cao", "Chặn mốc nghiên cứu"], ["trung_binh", "Làm chậm tiến độ"], ["thap", "Không chặn"]],
    priority: [["cao", "Cao"], ["trung_binh", "Trung bình"], ["thap", "Thấp"]],
    decisions: [["dang_xu_ly", "Đang xử lý"], ["can_sua", "Cần sửa"], ["tu_choi", "Từ chối"], ["rut_bai", "Rút bài"], ["chap_nhan", "Chấp nhận"]],
    routes: [["moi", "Nghiên cứu mới"], ["co_san", "Bản thảo có sẵn"], ["cuu_ban_thao", "Chương trình cứu bản thảo"], ["hoi_cuu", "Hồi cứu"]],
    projectTypes: [["de_tai_truong", "Đề tài cấp trường"], ["de_tai_cap_tren", "Đề tài cấp trên"], ["noi_bo", "Nghiên cứu nội bộ (mã nội bộ)"], ["hop_tac", "Nghiên cứu hợp tác"]],
    articleTypes: [["nghien_cuu_goc", "Nghiên cứu gốc"], ["tong_quan", "Tổng quan"], ["ca_benh", "Báo cáo ca / tình huống"], ["ngan", "Bài ngắn / thư"]],
    roles: [["giang_vien", "Giảng viên / thành viên"], ["chu_nhiem", "Chủ nhiệm / tác giả phụ trách"], ["chuyen_gia", "Cố vấn / chuyên gia"],
            ["dieu_phoi", "Điều phối viên"], ["lanh_dao", "Lãnh đạo"], ["quan_tri", "Quản trị cấu hình"]],
    versionTypes: [["chinh_thuc", "Phiên bản chính thức"], ["preprint", "Bản thảo sơ bộ (preprint)"], ["luu_tru", "Bản lưu trữ"]],
    rankingSystems: [["WoS JCR", "WoS JCR"], ["Scopus/SJR", "Scopus / SJR"], ["Scopus CiteScore", "Scopus CiteScore"], ["HĐGSNN", "HĐGSNN (điểm)"], ["Khác", "Khác"]],
    optionRoles: [["muc_tieu", "Mục tiêu"], ["du_phong", "Dự phòng"]],
    closeReasons: [["rut", "Người gửi rút yêu cầu"], ["trung", "Trùng yêu cầu"], ["khong_tiep_tuc", "Quyết định không tiếp tục"]],
    verifyLevel: [["da_xac_minh", "Đã xác minh"], ["tu_khai", "Tự khai, chưa xác minh"], ["nhap_lai", "Nhập lại từ hồ sơ cũ"]]
  };
  const dict = {};
  Object.keys(D).forEach(k => { dict[k] = Object.fromEntries(D[k]); });
  const label = (k, v) => (v && dict[k][v]) || "";

  // Trạng thái nào chưa kết thúc
  const SUPPORT_OPEN = ["moi_gui", "can_bo_sung", "da_phan_loai", "da_phan_cong", "dang_xu_ly", "cho_xac_nhan", "mo_lai"];
  const SUPPORT_ASSIGNED = ["da_phan_cong", "dang_xu_ly", "cho_xac_nhan", "mo_lai"];

  // Điều kiện chuyển giai đoạn (mục 7.5) — CB09
  const STAGE_RULES = {
    project: {
      du_lieu: "Đề cương và điều kiện đạo đức / quyền sử dụng dữ liệu (hoặc lý do không áp dụng)",
      phan_tich: "Dữ liệu, mô tả biến và kế hoạch phân tích phù hợp"
    },
    manuscript: {
      phan_bien_nb: "Phiên bản bản thảo, người góp ý và mốc phản hồi",
      san_sang: "Góp ý cần thiết đã xử lý; hồ sơ tác giả, dữ liệu, tạp chí và tài liệu nộp đã kiểm tra",
      da_nop: "Biên nhận hoặc xác nhận nộp bài",
      chap_nhan: "Quyết định chấp nhận có thể kiểm tra",
      xuat_ban: "Trang xuất bản chính thức và ngày xuất bản (DOI nếu có) — DOI riêng lẻ không đủ"
    }
  };

  const DEFAULT_SETTINGS = {
    cb01Days: 30, cb02Days: 7, triageWorkdays: 5, cb05Workdays: 5, cb06Days: 180, journalReviewDays: 92,
    holidays: [], rulesVersion: "1.0"
  };

  /* ---------- Thời gian: ngày lưu dạng "YYYY-MM-DD" theo múi giờ đơn vị ---------- */
  const T = {
    today() { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); },
    ms(s) { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); },
    iso(ms) { return new Date(ms).toISOString().slice(0, 10); },
    days(a, b) { return a && b ? Math.round((T.ms(b) - T.ms(a)) / 864e5) : null; },
    add(s, n) { return T.iso(T.ms(s) + n * 864e5); },
    isWorkday(s, holidays) { const w = new Date(T.ms(s)).getUTCDay(); return w !== 0 && w !== 6 && !(holidays || []).includes(s); },
    addWorkdays(s, n, holidays) {
      let d = s, k = 0;
      while (k < n) { d = T.add(d, 1); if (T.isWorkday(d, holidays)) k++; }
      return d;
    },
    workdays(a, b, holidays) { // số ngày làm việc trong (a, b]
      if (!a || !b || b <= a) return 0;
      let n = 0;
      for (let d = T.add(a, 1); d <= b; d = T.add(d, 1)) if (T.isWorkday(d, holidays)) n++;
      return n;
    },
    fmt(s) { if (!s) return ""; const [y, m, d] = s.slice(0, 10).split("-"); return `${d}/${m}/${y}`; },
    fmtDateTime(iso) {
      if (!iso) return "";
      return new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
    },
    inRange(s, from, to) { return !!s && s >= from && s <= to; }
  };

  const median = arr => {
    if (!arr.length) return null;
    const a = [...arr].sort((x, y) => x - y), m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };

  /* ---------- Khoảng trạng thái của một công việc (mục 9.2, NT08) ---------- */
  function statusIntervals(work, cutoff) {
    const log = [...(work.statusLog || [])].filter(e => e.at <= cutoff).sort((a, b) => a.at.localeCompare(b.at));
    const out = [];
    log.forEach((e, i) => {
      const end = i + 1 < log.length ? log[i + 1].at : (e.status === "hoan_thanh" ? e.at : cutoff);
      out.push({ status: e.status, from: e.at, to: end, days: T.days(e.at, end), reason: e.reason || "" });
    });
    return out;
  }
  function statusTotals(work, cutoff) {
    const t = {};
    statusIntervals(work, cutoff).forEach(iv => { t[iv.status] = (t[iv.status] || 0) + iv.days; });
    return t;
  }

  /* ---------- Yêu cầu hỗ trợ ---------- */
  function supportFacts(s, data, cutoff) {
    const st = Object.assign({}, DEFAULT_SETTINGS, data.settings);
    const triageDue = s.submittedAt ? T.addWorkdays(s.submittedAt, st.triageWorkdays, st.holidays) : null;
    const due = s.dueAdjusted || s.dueOriginal || null;
    const open = SUPPORT_OPEN.includes(s.status);
    return {
      open,
      triageDue,
      triagedLate: triageDue ? (s.triagedAt ? s.triagedAt > triageDue : cutoff > triageDue) : false,
      due,
      overdue: open && !!due && cutoff > due,
      ageDays: open ? T.days(s.submittedAt, cutoff) : null,
      responseDays: s.firstResponseAt ? T.days(s.submittedAt, s.firstResponseAt) : null,
      resolutionDays: s.status === "hoan_thanh" && s.confirmedAt ? T.days(s.submittedAt, s.confirmedAt) : null
    };
  }

  /* ---------- Chỉ số (mục 11.1). opts: {from, to, cutoff, unitId} ---------- */
  function inUnit(rec, unitId) { return !unitId || rec.unitId === unitId; }

  function metrics(data, opts) {
    const { from, to, cutoff, unitId } = opts;
    const st = Object.assign({}, DEFAULT_SETTINGS, data.settings);
    const projects = data.projects.filter(p => inUnit(p, unitId) && (!p.intakeDate || p.intakeDate <= cutoff));
    const manuscripts = data.manuscripts.filter(m => inUnit(m, unitId) && (!m.intakeDate || m.intakeDate <= cutoff));
    const msIds = new Set(manuscripts.map(m => m.id));
    const supports = data.supports.filter(s => inUnit(s, unitId) && s.submittedAt && s.submittedAt <= cutoff);
    const facts = new Map(supports.map(s => [s.id, supportFacts(s, data, cutoff)]));

    // K01
    const k01 = { projects: projects.filter(p => p.status !== "hoan_thanh" || p.stage !== "hoan_thanh").length,
                  manuscripts: manuscripts.filter(m => m.stage !== "xuat_ban").length };
    // K02 — hồ sơ duy nhất có ít nhất một vấn đề mở đã xác nhận nguyên nhân
    const blocked = supports.filter(s => facts.get(s.id).open && s.confirmedCause);
    const k02 = { records: new Set(blocked.map(s => s.parentId)).size, issues: blocked.length };
    // K03 — tiếp nhận/phân loại đúng hạn: hạn tiếp nhận rơi trong kỳ (yêu cầu đã đến hạn còn mở vẫn ở mẫu số)
    const k03Pool = supports.filter(s => s.status !== "dong" && T.inRange(facts.get(s.id).triageDue, from, to) && facts.get(s.id).triageDue <= cutoff);
    const k03 = { num: k03Pool.filter(s => s.triagedAt && s.triagedAt <= facts.get(s.id).triageDue).length, den: k03Pool.length };
    // K04 — hoàn thành đạt đầu ra đúng hạn, tính theo hạn ban đầu và hạn điều chỉnh (NT06)
    const k04For = key => {
      const pool = supports.filter(s => s.status !== "dong" && T.inRange(key === "orig" ? s.dueOriginal : (s.dueAdjusted || s.dueOriginal), from, to)
        && (key === "orig" ? s.dueOriginal : (s.dueAdjusted || s.dueOriginal)) <= cutoff);
      const num = pool.filter(s => s.status === "hoan_thanh" && s.confirmedAt && s.confirmedAt <= (key === "orig" ? s.dueOriginal : (s.dueAdjusted || s.dueOriginal))).length;
      return { num, den: pool.length };
    };
    const k04 = { orig: k04For("orig"), adj: k04For("adj"), closed: supports.filter(s => s.status === "dong" && T.inRange(s.closedAt, from, to)).length };
    // K05 — trung vị thời gian giải quyết
    const resolved = supports.filter(s => s.status === "hoan_thanh" && T.inRange(s.confirmedAt, from, to));
    const openAges = supports.filter(s => facts.get(s.id).open).map(s => facts.get(s.id).ageDays);
    const k05 = { median: median(resolved.map(s => facts.get(s.id).resolutionDays)), count: resolved.length,
                  openCount: openAges.length, openMedianAge: median(openAges), openMaxAge: openAges.length ? Math.max(...openAges) : null };
    // K07, K08 — bản thảo duy nhất có sự kiện trong kỳ
    const subs = data.submissions.filter(s => msIds.has(s.manuscriptId));
    const k07 = { manuscripts: new Set(subs.filter(s => T.inRange(s.submittedAt, from, to)).map(s => s.manuscriptId)).size,
                  submissions: subs.filter(s => T.inRange(s.submittedAt, from, to)).length };
    const k08 = new Set(subs.filter(s => s.decision === "chap_nhan" && T.inRange(s.decisionAt, from, to)).map(s => s.manuscriptId)).size;
    // K09 — công bố chính thức đã đối soát (không tính preprint/bản lưu trữ, không tính bản ghi trùng DOI)
    const pubs = data.publications.filter(p => !p.manuscriptId || msIds.has(p.manuscriptId) || !unitId);
    const dup = duplicateDois(data.publications);
    const k09List = pubs.filter(p => p.versionType === "chinh_thuc" && p.verified && T.inRange(p.publishedAt, from, to));
    const k09 = { count: new Set(k09List.map(p => (p.doi || p.id).toLowerCase())).size, pendingReconcile: pubs.filter(p => p.versionType !== "chinh_thuc" || !p.verified || dup.has((p.doi || "").toLowerCase())).length };
    // K10 — giảng viên có nhiệm vụ/đóng góp được xác nhận trong kỳ (định nghĩa tạm: là người phụ trách công việc có cập nhật trong kỳ)
    const active = new Set();
    data.workItems.forEach(w => { if ((w.statusLog || []).some(e => T.inRange(e.at, from, to))) active.add(w.ownerId); });
    const k10 = [...active].filter(id => { const p = data.people.find(x => x.id === id); return p && inUnit(p, unitId) && (p.roles || []).some(r => r === "giang_vien" || r === "chu_nhiem"); }).length;
    // K11 — nhu cầu so với khả năng theo đầu mối
    const k11 = data.providers.filter(p => p.active !== false).map(p => {
      const load = data.supports.filter(s => s.providerId === p.id && SUPPORT_ASSIGNED.includes(s.status)).length;
      return { provider: p, load, capacity: Number(p.capacity) || 0 };
    });
    // Nhu cầu chưa phân công theo loại
    const unassignedByType = {};
    supports.filter(s => ["moi_gui", "can_bo_sung", "da_phan_loai"].includes(s.status)).forEach(s => { unassignedByType[s.supportType || "khac"] = (unassignedByType[s.supportType || "khac"] || 0) + 1; });

    return { k01, k02, k03, k04, k05, k07, k08, k09, k10, k11, unassignedByType, projects, manuscripts, supports, facts, settings: st };
  }

  function duplicateDois(pubs) {
    const seen = {}, dup = new Set();
    pubs.forEach(p => { const d = (p.doi || "").trim().toLowerCase(); if (!d) return; if (seen[d]) dup.add(d); seen[d] = true; });
    return dup;
  }

  /* ---------- Cảnh báo (mục 10) ---------- */
  const ALERT_DEFS = {
    CB01: "Hồ sơ chưa có cập nhật nghiệp vụ quá {cb01Days} ngày",
    CB02: "Mốc sửa bài còn không quá {cb02Days} ngày lịch",
    CB03: "Yêu cầu chưa được tiếp nhận/phân loại khi hết hạn cam kết ({triageWorkdays} ngày làm việc)",
    CB04: "Công việc hỗ trợ chưa hoàn thành khi đến hạn",
    CB05: "Bài bị từ chối nhưng chưa có ghi nhận rà soát phương án ({cb05Workdays} ngày làm việc)",
    CB06: "Bản thảo có dấu hiệu đình trệ kéo dài (trên {cb06Days} ngày ở một giai đoạn)",
    CB07: "Số yêu cầu đang nhận vượt khả năng chuyên gia đã khai báo",
    CB08: "Tạp chí đang dùng chưa được xác minh phù hợp hoặc đến kỳ rà soát",
    CB09: "Thiếu minh chứng khi chuyển bước",
    CB10: "Định danh công bố trùng hoặc không phải phiên bản chính thức — cần đối soát"
  };
  const ALERT_ACTIONS = {
    CB01: "Yêu cầu xác minh tình trạng; nếu có vấn đề thì mở hỗ trợ. Thiếu cập nhật chưa đủ kết luận đình trệ.",
    CB02: "Nhắc tác giả, rà soát nhu cầu góp ý và nguồn lực.",
    CB03: "Báo điều phối và đầu mối dự phòng.",
    CB04: "Xác minh nguyên nhân, phân tải hoặc điều chỉnh có lý do.",
    CB05: "Tổ chức trao đổi và lập việc tiếp theo.",
    CB06: "Xác minh mức độ tiến triển, lý do và khả năng tham gia chương trình cứu bản thảo.",
    CB07: "Đề xuất phân tải hoặc bổ sung nguồn lực.",
    CB08: "Giao đầu mối kiểm tra bản ghi tạp chí.",
    CB09: "Bổ sung nội dung cần thiết trước khi chuyển bước.",
    CB10: "Đưa vào danh sách đối soát; không tự ghi nhận công bố mới."
  };
  const alertTitle = (code, st) => ALERT_DEFS[code].replace(/\{(\w+)\}/g, (_, k) => st[k]);

  function alerts(data, cutoff) {
    const st = Object.assign({}, DEFAULT_SETTINGS, data.settings);
    const out = [];
    const push = (code, ref, detail, ownerId, stable) => out.push({ code, title: alertTitle(code, st), action: ALERT_ACTIONS[code], ref, detail, ownerId: ownerId || "", stable: stable || "" });
    const ack = new Set(((data.settings || {}).closedAlerts || []).map(a => a.key));

    // CB01
    [["projects", data.projects], ["manuscripts", data.manuscripts]].forEach(([col, list]) => list.forEach(r => {
      if (r.stage === "xuat_ban" || (col === "projects" && r.stage === "hoan_thanh" && r.status === "hoan_thanh")) return;
      const d = T.days(r.lastUpdate || r.intakeDate, cutoff);
      if (d != null && d > st.cb01Days) push("CB01", { col, id: r.id }, `Cập nhật gần nhất ${T.fmt(r.lastUpdate)} (${d} ngày)`, r.ownerId || r.leadId || r.correspondingId, r.lastUpdate);
    }));
    // CB02
    data.submissions.forEach(s => {
      if (s.decision !== "can_sua" || s.endedAt) return;
      const round = (s.revisionRounds || []).filter(r => !r.submittedAt).slice(-1)[0];
      if (!round || !round.dueAt) return;
      const left = T.days(cutoff, round.dueAt);
      if (left <= st.cb02Days) {
        const ms = data.manuscripts.find(m => m.id === s.manuscriptId);
        push("CB02", { col: "manuscripts", id: s.manuscriptId }, left < 0 ? `Đã quá hạn sửa ${-left} ngày (${T.fmt(round.dueAt)})` : `Còn ${left} ngày đến hạn sửa vòng ${round.round} (${T.fmt(round.dueAt)})`, ms && ms.correspondingId, s.id + round.round + round.dueAt);
      }
    });
    // CB03, CB04
    data.supports.forEach(s => {
      if (!s.submittedAt || s.submittedAt > cutoff) return;
      const f = supportFacts(s, data, cutoff);
      if (!f.open) return;
      // "Cần bổ sung" tạm dừng đồng hồ cam kết tiếp nhận (mục 9.2)
      if (!s.triagedAt && s.status !== "can_bo_sung" && cutoff > f.triageDue) push("CB03", { col: "supports", id: s.id }, `Gửi ${T.fmt(s.submittedAt)}, hạn phân loại ${T.fmt(f.triageDue)}`, s.coordinatorId, f.triageDue);
      if (f.overdue) push("CB04", { col: "supports", id: s.id }, `Hạn ${T.fmt(f.due)}${s.dueAdjusted ? ` (ban đầu ${T.fmt(s.dueOriginal)})` : ""}, quá ${T.days(f.due, cutoff)} ngày`
        + (s.status === "cho_xac_nhan" ? " — đã bàn giao, người nhận chưa xác nhận" : ""), s.coordinatorId, f.due);
    });
    // CB05
    data.submissions.filter(s => s.decision === "tu_choi").forEach(s => {
      const hasNext = data.submissions.some(x => x.manuscriptId === s.manuscriptId && x.submittedAt > s.decisionAt)
        || data.workItems.some(w => w.parentId === s.manuscriptId && w.createdAt && w.createdAt >= s.decisionAt && w.kind === "ra_soat_phuong_an");
      if (!hasNext && T.workdays(s.decisionAt, cutoff, st.holidays) > st.cb05Workdays) {
        const ms = data.manuscripts.find(m => m.id === s.manuscriptId);
        push("CB05", { col: "manuscripts", id: s.manuscriptId }, `Từ chối ngày ${T.fmt(s.decisionAt)} (lần nộp ${s.id})`, ms && ms.correspondingId, s.id);
      }
    });
    // CB06
    data.manuscripts.forEach(m => {
      if (["xuat_ban", "da_nop", "chap_nhan"].includes(m.stage)) return;
      const d = T.days(m.stageEnteredAt, cutoff);
      if (d != null && d > st.cb06Days) push("CB06", { col: "manuscripts", id: m.id }, `${d} ngày ở giai đoạn “${label("manuscriptStages", m.stage)}”`, m.correspondingId, m.stage + m.stageEnteredAt);
    });
    // CB07
    data.providers.forEach(p => {
      const load = data.supports.filter(s => s.providerId === p.id && SUPPORT_ASSIGNED.includes(s.status)).length;
      if (p.capacity && load > Number(p.capacity)) push("CB07", { col: "providers", id: p.id }, `Đang nhận ${load} yêu cầu / khả năng ${p.capacity}`, "", load + "/" + p.capacity);
    });
    // CB08
    const inUse = new Set();
    data.manuscripts.forEach(m => (m.journalOptions || []).forEach(o => inUse.add(o.journalId)));
    data.submissions.filter(s => !s.endedAt).forEach(s => inUse.add(s.journalId));
    data.journals.filter(j => inUse.has(j.id)).forEach(j => {
      const v = journalVerification(j, cutoff, st);
      if (v.state !== "ok") push("CB08", { col: "journals", id: j.id }, v.text, "", v.state + (j.verifications || []).map(x => x.checkedAt).join());
    });
    // CB10
    const dup = duplicateDois(data.publications);
    data.publications.forEach(p => {
      if (dup.has((p.doi || "").toLowerCase())) push("CB10", { col: "publications", id: p.id }, `DOI ${p.doi} xuất hiện ở nhiều bản ghi`, "", "dup" + p.doi);
      else if (p.versionType !== "chinh_thuc") push("CB10", { col: "publications", id: p.id }, `Bản ghi là ${label("versionTypes", p.versionType).toLowerCase()}`, "", p.versionType);
    });

    return out.map(a => Object.assign(a, { key: a.code + ":" + a.ref.id + ":" + a.stable })).filter(a => !ack.has(a.key));
  }

  /* Xác minh tạp chí: phân hạng phải có hệ thống, nhóm ngành, năm, nguồn, ngày kiểm tra (mục 5.6, NT13) */
  function journalVerification(j, cutoff, st) {
    st = st || DEFAULT_SETTINGS;
    const vs = j.verifications || [];
    if (!vs.length) return { state: "missing", text: "Chưa có bản ghi xác minh" };
    const incomplete = vs.filter(v => !v.system || !v.year || !v.source || !v.checkedAt);
    if (incomplete.length) return { state: "incomplete", text: "Thiếu nguồn / năm / ngày kiểm tra phân hạng" };
    const last = vs.map(v => v.checkedAt).sort().slice(-1)[0];
    const age = T.days(last, cutoff);
    if (age > st.journalReviewDays) return { state: "stale", text: `Lần kiểm tra gần nhất ${T.fmt(last)} (${age} ngày) — đến kỳ rà soát` };
    return { state: "ok", text: `Đã kiểm tra ${T.fmt(last)}` };
  }

  window.Domain = { D, dict, label, T, TZ, median, SUPPORT_OPEN, SUPPORT_ASSIGNED, STAGE_RULES, DEFAULT_SETTINGS,
    statusIntervals, statusTotals, supportFacts, metrics, alerts, ALERT_DEFS, ALERT_ACTIONS, alertTitle, journalVerification, duplicateDois };
})();
