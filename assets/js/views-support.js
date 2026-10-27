/* M04 Hàng đợi hỗ trợ, chi tiết yêu cầu, luồng xử lý (đặc tả mục 8) và M06 Chuyên gia & gói hỗ trợ. */
(function () {
  const App = window.App;
  const { T, D, label, supportFacts, SUPPORT_OPEN, SUPPORT_ASSIGNED } = window.Domain;
  const { esc, NA, orNA, supportBadge, dueBadge, formHtml, readForm, modal, toast, confirmBox, toCsv, download } = window.UI;
  const forms = App.forms = App.forms || {};
  const done = msg => { toast(msg); App.rerender(); };

  const QUEUE_COLS = [
    ["moi", "Mới nhận", ["moi_gui", "mo_lai"]], ["can_bo_sung", "Cần bổ sung", ["can_bo_sung"]], ["da_phan_loai", "Đã phân loại", ["da_phan_loai"]],
    ["da_phan_cong", "Đã phân công", ["da_phan_cong"]], ["dang_xu_ly", "Đang xử lý", ["dang_xu_ly"]], ["cho_xac_nhan", "Chờ xác nhận", ["cho_xac_nhan"]],
    ["hoan_thanh", "Đã hoàn thành (30 ngày)", ["hoan_thanh"]]
  ];

  /* ================= M04 ================= */
  App.views.queue = function (el) {
    const data = App.data(), cutoff = App.state.cutoff;
    const f = Object.assign({ provider: "", type: "", unit: "", focus: "", view: "status" }, App.queueFilter || {});
    App.queueFilter = f;
    let list = data.supports.filter(s => s.submittedAt && s.submittedAt <= cutoff);
    list = list.filter(s => (!f.provider || s.providerId === f.provider) && (!f.type || s.supportType === f.type) && (!f.unit || s.unitId === f.unit));
    const facts = new Map(list.map(s => [s.id, supportFacts(s, data, cutoff)]));
    if (f.focus === "overdue") list = list.filter(s => facts.get(s.id).overdue || (facts.get(s.id).open && !s.triagedAt && s.status !== "can_bo_sung" && cutoff > facts.get(s.id).triageDue));
    if (f.focus === "soon") list = list.filter(s => { const fx = facts.get(s.id); return fx.open && fx.due && T.days(cutoff, fx.due) >= 0 && T.days(cutoff, fx.due) <= 7; });
    if (f.focus === "blocking") list = list.filter(s => facts.get(s.id).open && s.blocking === "cao");
    const prio = s => { const fx = facts.get(s.id); return (fx.overdue ? 0 : 1) + (s.blocking === "cao" ? 0 : 0.5) + (fx.due ? T.days(cutoff, fx.due) / 1000 : 0.9); };

    const card = s => { const fx = facts.get(s.id); const triageLate = fx.open && !s.triagedAt && s.status !== "can_bo_sung" && cutoff > fx.triageDue;
      return `<a class="kcard${fx.overdue || triageLate ? " alert" : ""}" href="#/ho-tro/${esc(s.id)}"><div class="k-top"><span class="code">${esc(s.id)}</span>${s.blocking === "cao" ? '<span class="tag tag-crit">■ Chặn mốc</span>' : ""}</div>
        <div class="k-title">${esc(label("supportTypes", s.supportType) || "Chưa phân loại")}</div><div>${esc(s.problem)}</div>
        <div class="k-meta"><span>${esc(s.parentId)}</span>${s.providerId ? `<span>→ ${esc((App.find("providers", s.providerId) || {}).name || "")}</span>` : ""}
          ${fx.open ? `<span>${fx.ageDays} ngày tuổi</span>` : ""}${triageLate ? `<span class="tag tag-crit">! Quá hạn phân loại</span>` : ""}
          ${fx.open && fx.due ? `<span>${fx.overdue ? "! Quá hạn " : "Hạn "}${T.fmt(fx.due)}</span>` : ""}${s.status === "hoan_thanh" ? `<span>Xác nhận ${T.fmt(s.confirmedAt)}</span>` : ""}</div></a>`; };

    const byStatus = `<div class="board">${QUEUE_COLS.map(([k, l, sts]) => {
      let items = list.filter(s => sts.includes(s.status));
      if (k === "hoan_thanh") items = items.filter(s => s.confirmedAt && T.days(s.confirmedAt, cutoff) <= 30);
      items.sort((a, b) => prio(a) - prio(b));
      return `<div class="col"><h3><span>${esc(l)}</span><span class="muted">${items.length}</span></h3>${items.map(card).join("") || '<p class="muted" style="font-size:12px">Trống</p>'}</div>`; }).join("")}</div>`;

    const byProvider = `<div class="table-wrap"><table><thead><tr><th>Chuyên gia / đầu mối</th><th class="num">Đang nhận</th><th class="num">Khả năng</th><th class="num">Quá hạn</th><th>Yêu cầu đang nhận</th></tr></thead><tbody>
      ${data.providers.map(p => { const mine = data.supports.filter(s => s.providerId === p.id && SUPPORT_ASSIGNED.includes(s.status)); const over = p.capacity && mine.length > p.capacity;
        return `<tr><td><b>${esc(p.name)}</b><span class="sub">${esc(App.personName(p.personId) || p.unitName)}</span></td><td class="num">${mine.length}</td><td class="num">${p.capacity || "?"}</td>
          <td class="num">${mine.filter(s => supportFacts(s, data, cutoff).overdue).length}</td>
          <td>${mine.map(s => `<a href="#/ho-tro/${esc(s.id)}">${esc(s.id)}</a>`).join(", ") || "—"} ${over ? '<span class="tag tag-crit">! Quá tải</span>' : ""}</td></tr>`; }).join("")}</tbody></table></div>`;

    const sel = (name, opts, v, all = "Tất cả") => `<select name="${name}"><option value="">${all}</option>${opts.map(([k, l]) => `<option value="${esc(k)}"${k === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    el.innerHTML = `
      <div class="page-head"><div><h1>Hàng đợi hỗ trợ <span class="muted">· M04</span></h1>
        <p>Ưu tiên yêu cầu quá hạn, sắp đến hạn hoặc đang chặn mốc nghiên cứu. Thông báo nhận tự động không được tính là phản hồi có nội dung.</p></div>
        <div class="actions"><button class="btn" id="exp">Xuất CSV</button><button class="btn primary" id="add">+ Yêu cầu hỗ trợ</button></div></div>
      <div style="margin-bottom:12px" class="seg" role="group" aria-label="Kiểu xem"><button data-view="status" aria-pressed="${f.view === "status"}">Theo tình trạng</button><button data-view="provider" aria-pressed="${f.view === "provider"}">Theo chuyên gia</button></div>
      <form class="filters" id="qf">
        <label>Ưu tiên xem${sel("focus", [["overdue", "Quá hạn"], ["soon", "Đến hạn trong 7 ngày"], ["blocking", "Đang chặn mốc"]], f.focus)}</label>
        <label>Loại hỗ trợ${sel("type", D.supportTypes, f.type)}</label>
        <label>Người xử lý${sel("provider", App.options.providers(), f.provider)}</label>
        <label>Đơn vị${sel("unit", App.options.units(), f.unit)}</label>
        <label>Ngày chốt<input type="date" name="cutoff" value="${cutoff}"></label>
      </form>
      ${f.view === "provider" ? byProvider : byStatus}`;
    el.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { f.view = b.dataset.view; App.rerender(); });
    const qf = el.querySelector("#qf");
    qf.addEventListener("change", () => { ["focus", "type", "provider", "unit"].forEach(k => f[k] = qf.elements[k].value); if (qf.elements.cutoff.value) App.state.cutoff = qf.elements.cutoff.value; App.rerender(); });
    el.querySelector("#add").onclick = () => forms.newSupport({});
    el.querySelector("#exp").onclick = () => {
      const head = ["Mã", "Hồ sơ", "Người đề nghị", "Đơn vị", "Loại", "Vấn đề", "Mức chặn", "Ưu tiên", "Điều phối", "Người xử lý", "Trạng thái", "Ngày gửi", "Hạn phân loại", "Ngày phân loại", "Phản hồi có nội dung",
        "Hạn ban đầu", "Hạn điều chỉnh", "Lý do gia hạn", "Bàn giao", "Xác nhận", "Tuổi (ngày)", "Thời gian giải quyết (ngày)", "Lý do đóng"];
      download(`yeu-cau-ho-tro_${cutoff}.csv`, toCsv([head, ...list.map(s => { const fx = facts.get(s.id); return [s.id, s.parentId, App.personName(s.requesterId), App.unitName(s.unitId), label("supportTypes", s.supportType), s.problem,
        label("blocking", s.blocking), label("priority", s.priority), App.personName(s.coordinatorId), App.providerName(s.providerId), label("supportStatus", s.status), s.submittedAt, fx.triageDue, s.triagedAt, s.firstResponseAt,
        s.dueOriginal, s.dueAdjusted, s.extensionReason, s.deliveredAt, s.confirmedAt, fx.ageDays == null ? "" : fx.ageDays, fx.resolutionDays == null ? "" : fx.resolutionDays, label("closeReasons", s.closeReason)]; })]));
    };
  };

  /* ================= Chi tiết yêu cầu ================= */
  // Hành động theo trạng thái (mục 7.3 và 8)
  const ACTIONS = {
    phan_loai: { label: "Phân loại & phản hồi", from: ["moi_gui", "mo_lai"], primary: true },
    bo_sung: { label: "Yêu cầu bổ sung", from: ["moi_gui", "da_phan_loai"] },
    da_bo_sung: { label: "Đã nhận bổ sung", from: ["can_bo_sung"], primary: true },
    phan_cong: { label: "Phân công", from: ["da_phan_loai"], primary: true },
    bat_dau: { label: "Bắt đầu xử lý", from: ["da_phan_cong", "mo_lai"], primary: true },
    ban_giao: { label: "Bàn giao sản phẩm", from: ["dang_xu_ly"], primary: true },
    xac_nhan: { label: "Xác nhận đạt", from: ["cho_xac_nhan"], primary: true },
    chua_dat: { label: "Chưa đạt — làm tiếp", from: ["cho_xac_nhan"] },
    gia_han: { label: "Gia hạn", from: ["da_phan_cong", "dang_xu_ly", "mo_lai"] },
    chuyen: { label: "Chuyển người xử lý", from: ["da_phan_cong", "dang_xu_ly", "mo_lai"] },
    dong: { label: "Đóng có lý do", from: ["moi_gui", "can_bo_sung", "da_phan_loai", "da_phan_cong", "dang_xu_ly", "mo_lai"] },
    mo_lai: { label: "Mở lại", from: ["hoan_thanh", "dong"] }
  };

  App.views.support = function (el, m) {
    const s = App.find("supports", decodeURIComponent(m[1])), data = App.data(), cutoff = App.state.cutoff;
    if (!s) { el.innerHTML = `<div class="card empty">Không tìm thấy yêu cầu. <a href="#/hang-doi">Về hàng đợi</a></div>`; return; }
    const fx = supportFacts(s, data, cutoff);
    const evs = data.events.filter(e => e.entityId === s.id).sort((a, b) => (b.recordedAt || "").localeCompare(a.recordedAt || ""));
    const acts = Object.entries(ACTIONS).filter(([, a]) => a.from.includes(s.status));
    const d = (lab, v) => `<dt>${esc(lab)}</dt><dd>${v}</dd>`;
    const dt = v => v ? T.fmt(v) : NA;
    el.innerHTML = `
      <div class="detail-head"><div><div class="muted"><a href="#/hang-doi">← Hàng đợi hỗ trợ</a></div>
        <h1><span class="code" style="font-size:16px">${esc(s.id)}</span> ${esc(s.problem)}</h1>
        <div class="meta">${supportBadge(s.status)} <span>${esc(label("supportTypes", s.supportType) || "Chưa phân loại")}</span> <span>Hồ sơ: ${App.recordLink(s.parentType, s.parentId)}</span>
          ${s.blocking ? `<span class="tag ${s.blocking === "cao" ? "tag-crit" : "tag-muted"}">${esc(label("blocking", s.blocking))}</span>` : ""}</div></div>
        <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start">${acts.map(([k, a]) => `<button class="btn${a.primary ? " primary" : ""}" data-act="${k}">${esc(a.label)}</button>`).join("")}
          <button class="btn ghost" id="edit">Sửa</button></div></div>
      ${fx.open ? `<div class="next-box"><div><div class="k">Tuổi yêu cầu</div><div class="v">${fx.ageDays} ngày lịch</div></div>
        <div><div class="k">Hạn tiếp nhận/phân loại (${App.settings().triageWorkdays} ngày LV)</div><div class="v">${s.triagedAt ? `Đã phân loại ${T.fmt(s.triagedAt)} ${s.triagedAt > fx.triageDue ? '<span class="tag tag-crit">trễ</span>' : '<span class="tag tag-good">✓ đúng hạn</span>'}` : dueBadge(fx.triageDue, cutoff, 2)}</div></div>
        <div><div class="k">Hạn hoàn thành</div><div class="v">${fx.due ? dueBadge(fx.due, cutoff) : NA}</div></div></div>` : ""}
      <div class="grid g2">
        <section class="card"><h2>Nhận diện & nội dung</h2><dl class="dl">
          ${d("Người đề nghị", orNA(App.personName(s.requesterId)))}${d("Đơn vị", orNA(App.unitName(s.unitId)))}${d("Công việc liên quan", s.workItemId ? esc((App.find("workItems", s.workItemId) || {}).title || s.workItemId) : NA)}
          ${d("Sản phẩm mong đợi", orNA(s.expectedOutput))}${d("Tài liệu liên quan", s.docsUrl ? `<a href="${esc(s.docsUrl)}" target="_blank" rel="noopener">Mở ↗</a>` : NA)}
          ${d("Điều kiện xác nhận kết quả", orNA(s.acceptance))}${s.linkedSupportId ? d("Liên kết", `<a href="#/ho-tro/${esc(s.linkedSupportId)}">${esc(s.linkedSupportId)}</a>`) : ""}</dl></section>
        <section class="card"><h2>Chẩn đoán & phân công</h2><dl class="dl">
          ${d("Nguyên nhân đã xác nhận", s.confirmedCause ? esc(s.confirmedCause) + (s.confirmedBy ? ` <small>(${esc(App.personName(s.confirmedBy))})</small>` : "") : '<span class="na">Chưa xác minh</span>')}
          ${d("Mức độ chặn tiến độ", orNA(label("blocking", s.blocking)))}${d("Ưu tiên", s.priority ? esc(label("priority", s.priority)) + (s.priorityReason ? ` — ${esc(s.priorityReason)}` : "") : NA)}
          ${d("Điều phối viên", orNA(App.personName(s.coordinatorId)))}${d("Người xử lý", orNA(App.providerName(s.providerId)))}${d("Ngày nhận nhiệm vụ", dt(s.assignedAt))}</dl></section>
        <section class="card"><h2>Thời gian</h2><dl class="dl">
          ${d("Ngày gửi", dt(s.submittedAt))}${d("Ngày phân loại", dt(s.triagedAt))}
          ${d("Phản hồi có nội dung đầu tiên", s.firstResponseAt ? `${T.fmt(s.firstResponseAt)} <small>(sau ${fx.responseDays} ngày)</small>` : '<span class="na">Chưa có (thông báo nhận tự động không tính)</span>')}
          ${d("Bắt đầu xử lý", dt(s.startedAt))}${d("Hạn ban đầu", dt(s.dueOriginal))}${d("Hạn điều chỉnh", s.dueAdjusted ? `${T.fmt(s.dueAdjusted)} <small>— ${esc(s.extensionReason)}</small>` : NA)}
          ${d("Ngày bàn giao", dt(s.deliveredAt))}${d("Ngày xác nhận", s.confirmedAt ? `${T.fmt(s.confirmedAt)} <small>(giải quyết ${fx.resolutionDays != null ? fx.resolutionDays : T.days(s.submittedAt, s.confirmedAt)} ngày)</small>` : NA)}
          ${s.closedAt ? d("Đóng", `${T.fmt(s.closedAt)} — ${esc(label("closeReasons", s.closeReason))}`) : ""}</dl></section>
        <section class="card"><h2>Kết quả</h2><dl class="dl">
          ${d("Sản phẩm bàn giao", orNA(s.deliverable))}${d("Minh chứng", s.evidenceUrl ? `<a href="${esc(s.evidenceUrl)}" target="_blank" rel="noopener">Mở ↗</a>` : NA)}
          ${d("Trạng thái xác nhận", s.status === "hoan_thanh" ? '<span class="tag tag-good">✓ Đạt đầu ra</span>' : s.status === "cho_xac_nhan" ? '<span class="tag tag-warn">⌛ Chờ người nhận xác nhận — chưa tính hoàn thành</span>' : NA)}
          ${d("Phản hồi của người nhận", orNA(s.feedback))}</dl></section>
      </div>
      <section class="card" style="margin-top:16px"><h2>Lịch sử</h2>${evs.length ? `<ul class="timeline">${evs.map(e => App.eventItem(e, true)).join("")}</ul>` : `<p class="empty">Chưa có dữ liệu</p>`}</section>`;
    el.querySelectorAll("[data-act]").forEach(b => b.onclick = () => forms.supportAction(s.id, b.dataset.act));
    el.querySelector("#edit").onclick = () => forms.newSupport({}, s.id);
    App.bindCorrect(el);
  };

  forms.newSupport = function (preset = {}, sid) {
    const s = sid ? App.find("supports", sid) : null;
    const parentOpts = App.options.records();
    const fields = [
      { name: "parent", label: "Hồ sơ liên quan", type: "select", options: parentOpts, required: true, full: true },
      { name: "requesterId", label: "Người đề nghị", type: "select", options: App.options.people(), required: true },
      { name: "submittedAt", label: "Ngày gửi", type: "date", required: true },
      { name: "problem", label: "Mô tả vấn đề", type: "textarea", required: true, rows: 3 },
      { name: "supportType", label: "Loại hỗ trợ đề xuất", type: "select", options: D.supportTypes },
      { name: "expectedOutput", label: "Sản phẩm mong đợi" },
      { name: "docsUrl", label: "Tài liệu liên quan (đường dẫn được cấp quyền)", type: "url", full: true },
      { name: "workItemId", label: "Công việc / mốc bị ảnh hưởng", type: "select", options: App.data().workItems.map(w => [w.id, `${w.parentId} · ${w.title}`]), full: true }
    ];
    const init = s ? Object.assign({ parent: s.parentType + ":" + s.parentId }, s) : Object.assign({ submittedAt: App.state.cutoff }, preset);
    modal({ title: s ? "Sửa yêu cầu " + s.id : "Gửi yêu cầu hỗ trợ", wide: true, body: formHtml(fields, init), onSubmit: async form => {
      const v = readForm(form, fields);
      const [parentType, parentId] = v.parent.split(":");
      const parent = App.find(parentType, parentId);
      delete v.parent;
      if (s) { await App.saveRecord("supports", Object.assign({}, s, v, { parentType, parentId }), { reason: "Sửa thông tin yêu cầu" }); return done("Đã lưu."); }
      const rec = Object.assign({ id: App.nextId("supports", "YC-"), parentType, parentId, unitId: parent ? parent.unitId : "", status: "moi_gui", confirmedCause: "", blocking: "", priority: "", coordinatorId: "", providerId: "",
        triagedAt: "", firstResponseAt: "", assignedAt: "", startedAt: "", dueOriginal: "", dueAdjusted: "", deliveredAt: "", confirmedAt: "", deliverable: "", feedback: "" }, v);
      await App.saveRecord("supports", rec, { type: "tao_moi", occurredAt: v.submittedAt, reason: "Gửi yêu cầu hỗ trợ (hệ thống tự xác nhận đã nhận — chưa phải phản hồi có nội dung)" });
      await App.touchParent(parentType, parentId, v.submittedAt);
      toast(`Đã gửi ${rec.id}. Hạn phân loại: ${T.fmt(T.addWorkdays(v.submittedAt, App.settings().triageWorkdays, App.settings().holidays))}.`);
      App.go("#/ho-tro/" + rec.id);
    } });
  };

  forms.supportAction = function (sid, act) {
    const s = App.find("supports", sid), today = App.state.cutoff;
    const F = {
      phan_loai: [{ name: "supportType", label: "Loại hỗ trợ", type: "select", options: D.supportTypes, required: true },
        { name: "confirmedCause", label: "Nguyên nhân đã xác nhận", full: true }, { name: "confirmedBy", label: "Người xác nhận", type: "select", options: App.options.people() },
        { name: "blocking", label: "Mức độ chặn tiến độ", type: "select", options: D.blocking, required: true }, { name: "priority", label: "Ưu tiên", type: "select", options: D.priority, required: true },
        { name: "priorityReason", label: "Lý do ưu tiên" }, { name: "coordinatorId", label: "Điều phối viên", type: "select", options: App.options.people("dieu_phoi"), required: true },
        { name: "triagedAt", label: "Ngày phân loại", type: "date", required: true }, { name: "firstResponseAt", label: "Ngày phản hồi có nội dung", type: "date", required: true, help: "Phản hồi xác định bước xử lý, yêu cầu bổ sung hoặc phương án phân công" }],
      bo_sung: [{ name: "feedback", label: "Nội dung cần bổ sung", type: "textarea", required: true }, { name: "firstResponseAt", label: "Ngày phản hồi", type: "date", required: true }],
      da_bo_sung: [{ name: "at", label: "Ngày nhận bổ sung", type: "date", required: true }, { name: "note", label: "Ghi chú", full: true }],
      phan_cong: [{ name: "providerId", label: "Người xử lý", type: "select", options: App.options.providers(), required: true },
        { name: "assignedAt", label: "Ngày nhận nhiệm vụ", type: "date", required: true }, { name: "dueOriginal", label: "Hạn hoàn thành", type: "date", required: true },
        { name: "expectedOutput", label: "Đầu ra mong đợi", full: true, required: true }, { name: "acceptance", label: "Điều kiện xác nhận kết quả", full: true, required: true },
        { name: "docsUrl", label: "Tài liệu được chia sẻ", type: "url", full: true }],
      bat_dau: [{ name: "startedAt", label: "Ngày bắt đầu", type: "date", required: true }],
      ban_giao: [{ name: "deliverable", label: "Sản phẩm bàn giao", required: true, full: true }, { name: "deliveredAt", label: "Ngày bàn giao", type: "date", required: true },
        { name: "evidenceUrl", label: "Minh chứng", type: "url", full: true }],
      xac_nhan: [{ name: "confirmedAt", label: "Ngày xác nhận", type: "date", required: true }, { name: "feedback", label: "Phản hồi của người nhận", full: true }],
      chua_dat: [{ name: "feedback", label: "Lý do chưa đạt", type: "textarea", required: true }, { name: "at", label: "Ngày", type: "date", required: true }],
      gia_han: [{ name: "dueAdjusted", label: "Hạn mới", type: "date", required: true }, { name: "extensionReason", label: "Lý do và người xác nhận gia hạn", required: true, full: true }],
      chuyen: [{ name: "providerId", label: "Người xử lý mới", type: "select", options: App.options.providers(), required: true }, { name: "reason", label: "Lý do chuyển", required: true, full: true },
        { name: "at", label: "Ngày chuyển", type: "date", required: true }],
      dong: [{ name: "closeReason", label: "Lý do đóng", type: "select", options: D.closeReasons, required: true }, { name: "linkedSupportId", label: "Yêu cầu trùng / liên kết (nếu có)" },
        { name: "closedAt", label: "Ngày đóng", type: "date", required: true }, { name: "note", label: "Ghi chú", full: true }],
      mo_lai: [{ name: "reason", label: "Lý do mở lại", required: true, full: true, help: "Nếu là nhu cầu mới, hãy tạo yêu cầu mới có liên kết" }, { name: "at", label: "Ngày mở lại", type: "date", required: true }]
    }[act];
    const init = Object.assign({}, s, { triagedAt: s.triagedAt || today, firstResponseAt: s.firstResponseAt || today, assignedAt: today, startedAt: today, deliveredAt: today, confirmedAt: today, at: today, closedAt: today,
      coordinatorId: s.coordinatorId || "", providerId: act === "chuyen" ? "" : s.providerId });
    if (act === "phan_cong" && !s.providerId && s.supportType) {
      const cand = App.data().providers.find(p => p.active !== false && (p.supportTypes || []).includes(s.supportType));
      if (cand) init.providerId = cand.id;
    }
    modal({ title: `${ACTIONS[act].label} — ${s.id}`, wide: act === "phan_loai" || act === "phan_cong", body: formHtml(F, init), onSubmit: async form => {
      const v = readForm(form, F);
      const next = Object.assign({}, s);
      let occurredAt = today, reason = "", evidenceUrl = "";
      const check = (a, b, msg) => { if (a && b && a < b) throw new Error(msg); };
      switch (act) {
        case "phan_loai":
          check(v.triagedAt, s.submittedAt, "Ngày phân loại không được trước ngày gửi.");
          Object.assign(next, v, { status: "da_phan_loai" }); occurredAt = v.triagedAt; break;
        case "bo_sung": Object.assign(next, v, { status: "can_bo_sung" }); occurredAt = v.firstResponseAt; reason = v.feedback; break;
        case "da_bo_sung": next.status = s.triagedAt ? "da_phan_loai" : "moi_gui"; occurredAt = v.at; reason = v.note || "Đã nhận thông tin bổ sung"; break;
        case "phan_cong":
          check(v.dueOriginal, v.assignedAt, "Hạn hoàn thành không được trước ngày nhận nhiệm vụ.");
          Object.assign(next, v, { status: "da_phan_cong" }); occurredAt = v.assignedAt; break;
        case "bat_dau": next.startedAt = v.startedAt; next.status = "dang_xu_ly"; occurredAt = v.startedAt; break;
        case "ban_giao": Object.assign(next, v, { status: "cho_xac_nhan" }); occurredAt = v.deliveredAt; evidenceUrl = v.evidenceUrl; break;
        case "xac_nhan":
          check(v.confirmedAt, s.deliveredAt, "Ngày xác nhận không được trước ngày bàn giao.");
          Object.assign(next, v, { status: "hoan_thanh" }); occurredAt = v.confirmedAt; break;
        case "chua_dat": next.feedback = v.feedback; next.status = "dang_xu_ly"; next.deliveredAt = ""; occurredAt = v.at; reason = v.feedback; break;
        case "gia_han":
          if (!s.dueOriginal) throw new Error("Yêu cầu chưa có hạn ban đầu.");
          Object.assign(next, v); reason = v.extensionReason; break;
        case "chuyen": next.providerId = v.providerId; occurredAt = v.at; reason = v.reason + " (thời gian đã chờ được giữ nguyên)"; break;
        case "dong": Object.assign(next, { closeReason: v.closeReason, linkedSupportId: v.linkedSupportId, closedAt: v.closedAt, status: "dong" }); occurredAt = v.closedAt; reason = v.note; break;
        case "mo_lai": Object.assign(next, { status: "mo_lai", confirmedAt: "", closedAt: "", closeReason: "" }); occurredAt = v.at; reason = v.reason; break;
      }
      await App.saveRecord("supports", next, { type: act === "gia_han" ? "gia_han" : "ho_tro", occurredAt, reason: reason || ACTIONS[act].label, evidenceUrl });
      await App.touchParent(s.parentType, s.parentId, occurredAt);
      if (act === "xac_nhan") toast("Đã xác nhận. Hãy cập nhật mốc nghiên cứu liên quan.");
      done(`${ACTIONS[act].label}: ${s.id}`);
    } });
  };

  /* ================= M06 ================= */
  App.views.providers = function (el) {
    const data = App.data(), cutoff = App.state.cutoff;
    el.innerHTML = `
      <div class="page-head"><div><h1>Chuyên gia và gói hỗ trợ <span class="muted">· M06</span></h1>
        <p>Lĩnh vực, gói hỗ trợ, khả năng nhận việc và lịch sử phân công. Khả năng nhận việc là số yêu cầu đồng thời đã thống nhất — không quy mọi loại việc về cùng độ phức tạp.</p></div>
        <div class="actions"><button class="btn primary" id="add">+ Chuyên gia / đầu mối</button></div></div>
      <div class="table-wrap"><table><thead><tr><th>Đầu mối</th><th>Loại hỗ trợ</th><th>Gói hỗ trợ · điều kiện</th><th class="num">Đang nhận / khả năng</th><th class="num">Đã hoàn thành</th><th class="num">Trung vị giải quyết</th><th></th></tr></thead><tbody>
      ${data.providers.map(p => { const all = data.supports.filter(s => s.providerId === p.id); const cur = all.filter(s => SUPPORT_ASSIGNED.includes(s.status));
        const doneL = all.filter(s => s.status === "hoan_thanh"); const med = window.Domain.median(doneL.map(s => T.days(s.submittedAt, s.confirmedAt)));
        const over = p.capacity && cur.length > p.capacity;
        return `<tr><td><b>${esc(p.name)}</b>${p.active === false ? ' <span class="tag tag-muted">Ngừng</span>' : ""}<span class="sub">${esc(App.personName(p.personId) || "")}${p.personId ? " · " : ""}${esc(p.unitName)}</span></td>
          <td>${(p.supportTypes || []).map(t => esc(label("supportTypes", t))).join("<br>") || NA}</td><td>${orNA(p.packages)}${p.conditions ? `<span class="sub">Điều kiện: ${esc(p.conditions)}</span>` : ""}</td>
          <td class="num">${cur.length}/${p.capacity || "?"} ${over ? '<br><span class="tag tag-crit">! Vượt khả năng</span>' : ""}</td><td class="num">${doneL.length}</td><td class="num">${med == null ? "—" : med + " ngày"}</td>
          <td><button class="btn sm" data-ed="${esc(p.id)}">Sửa</button></td></tr>`; }).join("") || `<tr><td colspan="7" class="empty">Chưa có dữ liệu</td></tr>`}</tbody></table></div>
      <h2 class="section-title">Lịch sử phân công</h2>
      <div class="table-wrap"><table><thead><tr><th>Yêu cầu</th><th>Đầu mối</th><th>Nhận nhiệm vụ</th><th>Trạng thái</th><th>Hạn</th></tr></thead><tbody>
        ${data.supports.filter(s => s.providerId).sort((a, b) => (b.assignedAt || "").localeCompare(a.assignedAt || "")).map(s => `<tr><td><a href="#/ho-tro/${esc(s.id)}">${esc(s.id)}</a><span class="sub">${esc(s.problem)}</span></td>
          <td>${esc((App.find("providers", s.providerId) || {}).name || "")}</td><td>${s.assignedAt ? T.fmt(s.assignedAt) : NA}</td><td>${supportBadge(s.status)}</td><td>${SUPPORT_OPEN.includes(s.status) ? dueBadge(s.dueAdjusted || s.dueOriginal, cutoff) : ""}</td></tr>`).join("")}</tbody></table></div>`;
    el.querySelector("#add").onclick = () => forms.provider();
    el.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => forms.provider(b.dataset.ed));
  };

  forms.provider = function (pid) {
    const p = pid ? App.find("providers", pid) : null;
    const fields = [
      { name: "name", label: "Tên đầu mối / gói", required: true }, { name: "personId", label: "Người (nếu là cá nhân)", type: "select", options: App.options.people() },
      { name: "unitName", label: "Đơn vị" }, { name: "capacity", label: "Khả năng nhận việc (số yêu cầu đồng thời)", type: "number", min: 0, required: true },
      { name: "supportTypes", label: "Loại hỗ trợ", type: "multi", options: D.supportTypes },
      { name: "packages", label: "Gói hỗ trợ & thời hạn chuẩn", type: "textarea", rows: 2 }, { name: "conditions", label: "Điều kiện sử dụng", type: "textarea", rows: 2 },
      { name: "active", label: "Đang hoạt động", type: "checkbox" }
    ];
    modal({ title: p ? "Sửa đầu mối" : "Thêm chuyên gia / đầu mối", wide: true, body: formHtml(fields, p || { active: true, capacity: 3 }),
      extra: p ? `<button type="button" class="btn ghost" id="delP">Xóa</button>` : "", onSubmit: async form => {
        const v = readForm(form, fields);
        await App.saveRecord("providers", Object.assign({ id: p ? p.id : App.nextId("providers", "pv", 1) }, p || {}, v));
        done("Đã lưu đầu mối.");
      } });
    const del = document.getElementById("delP");
    if (del) del.onclick = () => {
      if (App.data().supports.some(s => s.providerId === p.id)) { toast("Đầu mối đã có lịch sử phân công — hãy bỏ chọn “Đang hoạt động” thay vì xóa.", "crit"); return; }
      confirmBox("Xóa đầu mối", `Xóa ${p.name}?`, async () => { await window.Store.remove("providers", p.id); done("Đã xóa."); }, "Xóa");
    };
  };
})();
