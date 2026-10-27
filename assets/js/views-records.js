/* M02 Danh mục nghiên cứu & bản thảo, M03 Chi tiết hồ sơ, nhật ký sự kiện và các biểu mẫu hồ sơ. */
(function () {
  const App = window.App;
  const { T, D, label, dict, STAGE_RULES, statusIntervals, statusTotals, supportFacts, SUPPORT_OPEN, journalVerification } = window.Domain;
  const { esc, NA, orNA, workBadge, supportBadge, stageBadge, decisionBadge, dueBadge, formHtml, readForm, modal, toast, STATUS_SLOT, toCsv, download } = window.UI;
  const forms = App.forms = App.forms || {};

  const stagesOf = col => col === "projects" ? D.projectStages : D.manuscriptStages;
  const stageKey = col => col === "projects" ? "projectStages" : "manuscriptStages";

  /* ---------- Nhật ký sự kiện ---------- */
  const EVENT_TYPES = { tao_moi: "Tạo mới", tiep_nhan: "Tiếp nhận", cap_nhat: "Cập nhật", chuyen_giai_doan: "Chuyển giai đoạn", doi_tinh_trang: "Đổi tình trạng",
    gia_han: "Gia hạn", quyet_dinh_tap_chi: "Quyết định của tạp chí", nop_bai: "Nộp bài", dinh_chinh: "Đính chính", ho_tro: "Xử lý hỗ trợ", nhap_tep: "Nhập từ tệp", cau_hinh: "Đổi cấu hình" };
  const FIELD_LABELS = { stage: "Giai đoạn", status: "Tình trạng", statusReason: "Lý do tình trạng", nextAction: "Việc tiếp theo", nextDue: "Hạn việc tiếp theo", ownerId: "Người phụ trách",
    title: "Tiêu đề", shortTitle: "Tên rút gọn", stageEnteredAt: "Ngày vào giai đoạn", dueOriginal: "Hạn ban đầu", dueAdjusted: "Hạn điều chỉnh", providerId: "Người xử lý",
    coordinatorId: "Điều phối viên", decision: "Quyết định", decisionAt: "Ngày quyết định", submittedAt: "Ngày gửi/nộp", statusLog: "Lịch sử tình trạng", journalOptions: "Phương án tạp chí",
    revisionRounds: "Vòng sửa", endedAt: "Ngày kết thúc", leadId: "Chủ nhiệm", correspondingId: "Tác giả phụ trách", memberIds: "Thành viên", authorIds: "Tác giả", version: "Phiên bản",
    triagedAt: "Ngày phân loại", firstResponseAt: "Ngày phản hồi có nội dung", deliveredAt: "Ngày bàn giao", confirmedAt: "Ngày xác nhận", verifications: "Bản ghi xác minh",
    capacity: "Khả năng nhận việc", verified: "Đã đối soát", versionType: "Loại phiên bản", doi: "DOI", publishedAt: "Ngày xuất bản" };
  App.FIELD_LABELS = FIELD_LABELS; App.EVENT_TYPES = EVENT_TYPES;

  function fmtValue(e, field, v) {
    if (v === "" || v == null) return "∅";
    if (v.startsWith && (v.startsWith("[") || v.startsWith("{"))) return "(dữ liệu chi tiết)";
    if (field === "stage") return label(e.entityType === "projects" ? "projectStages" : "manuscriptStages", v) || v;
    if (field === "status") return label(e.entityType === "supports" ? "supportStatus" : "workStatus", v) || v;
    if (field === "decision") return label("decisions", v) || v;
    if (field === "supportType") return label("supportTypes", v) || v;
    if (/(ownerId|leadId|correspondingId|requesterId|coordinatorId|confirmedBy)$/.test(field)) return App.personName(v) || v;
    if (field === "providerId") return App.providerName(v) || v;
    if (field === "journalId") return App.journalName(v) || v;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return T.fmt(v);
    return v.length > 80 ? v.slice(0, 80) + "…" : v;
  }
  App.eventItem = function (e, withCorrect) {
    const by = App.personName(e.by) || e.by || "";
    const change = e.field ? `<b>${esc(FIELD_LABELS[e.field] || e.field)}</b>: ${esc(fmtValue(e, e.field, e.before))} → ${esc(fmtValue(e, e.field, e.after))}` : "";
    const corr = e.correctsEventId ? ` <span class="tag tag-warn">đính chính ${esc(e.correctsEventId)}</span>` : "";
    return `<li class="${e.type === "dinh_chinh" ? "corr" : ""}"><div class="when">Xảy ra ${T.fmt(e.occurredAt)} · ghi ${esc(T.fmtDateTime(e.recordedAt))}${by ? " · " + esc(by) : ""} · <span class="code">${esc(e.id)}</span></div>
      <div>${esc(EVENT_TYPES[e.type] || e.type)} · ${App.recordLink(e.entityType, e.entityId)}${corr}</div>
      ${change ? `<div>${change}</div>` : ""}${e.reason ? `<div class="muted">Lý do: ${esc(e.reason)}</div>` : ""}
      ${e.evidenceUrl ? `<div><a href="${esc(e.evidenceUrl)}" target="_blank" rel="noopener">Minh chứng ↗</a></div>` : ""}
      ${withCorrect && e.type !== "dinh_chinh" ? `<button class="btn sm ghost" data-correct="${esc(e.id)}">Đính chính</button>` : ""}</li>`;
  };
  App.bindCorrect = el => el.querySelectorAll("[data-correct]").forEach(b => b.onclick = () => forms.correctEvent(b.dataset.correct));

  /* ---------- Thông tin tổng hợp của hồ sơ ---------- */
  function openSupports(id) { return App.data().supports.filter(s => s.parentId === id && SUPPORT_OPEN.includes(s.status)); }
  function leadOf(col, r) { return col === "projects" ? r.leadId : r.correspondingId; }

  /* ================= M02 ================= */
  App.views.records = function (el, _m, q) {
    const data = App.data(), cutoff = App.state.cutoff;
    const col = q.tab === "manuscripts" ? "manuscripts" : "projects";
    const mode = App.pref.get("recordsMode", "list");
    const f = Object.assign({ unit: "", person: "", route: "", stage: "", status: "", blocker: "", provider: "", due: "", q: "" }, App.recordsFilter || {});
    App.recordsFilter = f;

    let rows = data[col].filter(r => {
      if (f.unit && r.unitId !== f.unit) return false;
      if (f.person && ![r.leadId, r.correspondingId, r.ownerId, ...(r.memberIds || []), ...(r.authorIds || [])].includes(f.person)) return false;
      if (f.route && r.route !== f.route) return false;
      if (f.stage && r.stage !== f.stage) return false;
      if (f.status && r.status !== f.status) return false;
      const os = openSupports(r.id);
      if (f.blocker && !os.some(s => s.supportType === f.blocker)) return false;
      if (f.provider && !os.some(s => s.providerId === f.provider)) return false;
      if (f.due) {
        if (!r.nextDue) return false;
        const left = T.days(cutoff, r.nextDue);
        if (f.due === "qua_han" && left >= 0) return false;
        if (f.due === "7" && (left < 0 || left > 7)) return false;
        if (f.due === "30" && (left < 0 || left > 30)) return false;
      }
      if (f.q) { const hay = [r.id, r.title, r.shortTitle, r.nextAction].join(" ").toLowerCase(); if (!hay.includes(f.q.toLowerCase())) return false; }
      return true;
    });
    rows.sort((a, b) => a.id.localeCompare(b.id, "vi", { numeric: true }));

    const sel = (name, opts, v, all = "Tất cả") => `<select name="${name}"><option value="">${all}</option>${opts.map(([k, l]) => `<option value="${esc(k)}"${k === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    const listHtml = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Mã · tên rút gọn</th><th>${col === "projects" ? "Chủ nhiệm" : "Tác giả phụ trách"}</th><th>Giai đoạn</th><th>Tình trạng</th><th class="num">Ngày ở giai đoạn</th><th>Việc tiếp theo</th><th>Hạn</th><th class="num">YC mở</th></tr></thead><tbody>
      ${rows.map(r => { const os = openSupports(r.id); return `<tr><td><a class="row-link" href="${App.recordHref(col, r.id)}">${esc(r.id)}</a><span class="sub">${esc(r.shortTitle || r.title)}</span></td>
        <td>${orNA(App.personName(leadOf(col, r)))}</td><td>${stageBadge(col, r.stage)}</td><td>${workBadge(r.status)}</td>
        <td class="num">${r.stageEnteredAt ? T.days(r.stageEnteredAt, cutoff) : "—"}</td><td>${orNA(r.nextAction)}<span class="sub">${esc(App.personName(r.ownerId))}</span></td>
        <td>${dueBadge(r.nextDue, cutoff)}</td><td class="num">${os.length || ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="card empty">Không có hồ sơ phù hợp bộ lọc.</div>`;

    const boardHtml = `<div class="board">${stagesOf(col).map(([sk, sl]) => { const list = rows.filter(r => r.stage === sk);
      return `<div class="col"><h3><span>${esc(sl)}</span><span class="muted">${list.length}</span></h3>${list.map(r => { const os = openSupports(r.id);
        const late = r.nextDue && r.nextDue < cutoff;
        return `<a class="kcard${late ? " alert" : ""}" href="${App.recordHref(col, r.id)}"><div class="k-top"><span class="code">${esc(r.id)}</span>${workBadge(r.status)}</div>
          <div class="k-title">${esc(r.shortTitle || r.title)}</div><div>${r.nextAction ? "→ " + esc(r.nextAction) : '<span class="na">Chưa có việc tiếp theo</span>'}</div>
          <div class="k-meta"><span>${esc(App.personName(r.ownerId || leadOf(col, r)))}</span>${r.nextDue ? `<span>${late ? "! Quá hạn " : "Hạn "}${T.fmt(r.nextDue)}</span>` : ""}
          <span>${r.stageEnteredAt ? T.days(r.stageEnteredAt, cutoff) + " ngày ở giai đoạn" : ""}</span>${os.length ? `<span>${os.length} YC mở</span>` : ""}</div></a>`; }).join("") || '<p class="muted" style="font-size:12px">Trống</p>'}</div>`; }).join("")}</div>`;

    el.innerHTML = `
      <div class="page-head"><div><h1>Danh mục nghiên cứu và bản thảo <span class="muted">· M02</span></h1>
        <p>Danh sách và bảng theo giai đoạn dùng cùng dữ liệu. Chuyển giai đoạn thực hiện trong chi tiết hồ sơ để kiểm tra điều kiện và ghi sự kiện.</p></div>
        <div class="actions"><button class="btn" id="exp">Xuất CSV</button><button class="btn primary" id="add">+ ${col === "projects" ? "Nghiên cứu" : "Bản thảo"} mới</button></div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <div class="seg" role="group" aria-label="Loại hồ sơ"><button data-tab="projects" aria-pressed="${col === "projects"}">Nghiên cứu (${data.projects.length})</button><button data-tab="manuscripts" aria-pressed="${col === "manuscripts"}">Bản thảo (${data.manuscripts.length})</button></div>
        <div class="seg" role="group" aria-label="Kiểu xem"><button data-mode="list" aria-pressed="${mode === "list"}">Danh sách</button><button data-mode="board" aria-pressed="${mode === "board"}">Theo giai đoạn</button></div>
      </div>
      <form class="filters" id="rf">
        <label class="grow">Tìm<input name="q" value="${esc(f.q)}" placeholder="Mã, tên, việc tiếp theo…"></label>
        <label>Khoa / đơn vị${sel("unit", App.options.units(), f.unit)}</label>
        <label>Người phụ trách / tham gia${sel("person", App.options.people(), f.person)}</label>
        <label>Lộ trình${sel("route", D.routes, f.route)}</label>
        <label>Giai đoạn${sel("stage", stagesOf(col), f.stage)}</label>
        <label>Tình trạng${sel("status", D.workStatus, f.status)}</label>
        <label>Loại điểm nghẽn${sel("blocker", D.supportTypes, f.blocker)}</label>
        <label>Người hỗ trợ${sel("provider", App.options.providers(), f.provider)}</label>
        <label>Mốc đến hạn${sel("due", [["qua_han", "Đã quá hạn"], ["7", "Trong 7 ngày"], ["30", "Trong 30 ngày"]], f.due)}</label>
        <button type="button" class="btn sm ghost" id="clr">Xóa lọc</button>
      </form>
      <p class="muted" style="margin:-6px 0 10px">${rows.length} hồ sơ</p>
      ${mode === "board" ? boardHtml : listHtml}`;

    el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => App.go("#/ho-so?tab=" + b.dataset.tab));
    el.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { App.pref.set("recordsMode", b.dataset.mode); App.rerender(); });
    const rf = el.querySelector("#rf");
    rf.addEventListener("change", () => { Object.keys(f).forEach(k => { if (rf.elements[k]) f[k] = rf.elements[k].value; }); App.rerender(); });
    rf.elements.q.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); f.q = e.target.value; App.rerender(); } });
    el.querySelector("#clr").onclick = () => { App.recordsFilter = null; App.rerender(); };
    el.querySelector("#add").onclick = () => forms.record(col);
    el.querySelector("#exp").onclick = () => {
      const head = ["Mã", "Tiêu đề", "Tên rút gọn", "Đơn vị", col === "projects" ? "Chủ nhiệm" : "Tác giả phụ trách", "Lộ trình", "Giai đoạn", "Tình trạng", "Lý do", "Ngày vào giai đoạn", "Ngày ở giai đoạn", "Việc tiếp theo", "Người phụ trách", "Hạn", "YC mở", "Cập nhật gần nhất"];
      download(`${col === "projects" ? "nghien-cuu" : "ban-thao"}_${cutoff}.csv`, toCsv([head, ...rows.map(r => [r.id, r.title, r.shortTitle || "", App.unitName(r.unitId), App.personName(leadOf(col, r)), label("routes", r.route),
        label(stageKey(col), r.stage), label("workStatus", r.status), r.statusReason || "", r.stageEnteredAt || "", r.stageEnteredAt ? T.days(r.stageEnteredAt, cutoff) : "", r.nextAction || "", App.personName(r.ownerId), r.nextDue || "", openSupports(r.id).length, r.lastUpdate || ""])]));
    };
  };

  /* ================= M03 ================= */
  App.views.record = function (el, m) {
    const col = m[1] === "nghien-cuu" ? "projects" : "manuscripts";
    const id = decodeURIComponent(m[2]);
    const r = App.find(col, id), data = App.data(), cutoff = App.state.cutoff;
    if (!r) { el.innerHTML = `<div class="card empty">Không tìm thấy hồ sơ ${esc(id)}. <a href="#/ho-so">Về danh mục</a></div>`; return; }

    const stages = stagesOf(col);
    const curIdx = stages.findIndex(([k]) => k === r.stage);
    const works = data.workItems.filter(w => w.parentId === r.id);
    const sups = data.supports.filter(s => s.parentId === r.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    const evs = data.events.filter(e => e.entityId === r.id || works.some(w => w.id === e.entityId) || sups.some(s => s.id === e.entityId)
      || data.submissions.some(s => s.manuscriptId === r.id && s.id === e.entityId)).sort((a, b) => (b.recordedAt || "").localeCompare(a.recordedAt || ""));
    const linked = col === "projects" ? data.manuscripts.filter(x => (x.projectIds || []).includes(r.id)) : (r.projectIds || []).map(pid => App.find("projects", pid)).filter(Boolean);
    const subs = col === "manuscripts" ? data.submissions.filter(s => s.manuscriptId === r.id).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)) : [];
    const pubs = col === "manuscripts" ? data.publications.filter(p => p.manuscriptId === r.id) : [];
    const stageEvents = data.events.filter(e => e.entityId === r.id && e.field === "stage").sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    const timeBar = w => {
      const ivs = statusIntervals(w, cutoff), tot = statusTotals(w, cutoff), sum = Object.values(tot).reduce((a, b) => a + b, 0);
      if (!sum) return `<small class="muted">Chưa có khoảng trạng thái</small>`;
      return `<div class="timebar" role="img" aria-label="Phân bổ thời gian">${ivs.filter(iv => iv.days > 0).map(iv => `<span tabindex="0" style="flex:${iv.days};background:var(--s${STATUS_SLOT[iv.status]})"
        data-tip="<b>${esc(label("workStatus", iv.status))}</b><br>${T.fmt(iv.from)} → ${T.fmt(iv.to)}: ${iv.days} ngày${iv.reason ? "<br>" + esc(iv.reason) : ""}"></span>`).join("")}</div>
        <small>${Object.entries(tot).map(([k, d]) => `${d} ngày ${esc(label("workStatus", k).toLowerCase())}`).join(" · ")} · <b>tổng ${sum} ngày lịch</b></small>`;
    };

    el.innerHTML = `
      <div class="detail-head"><div>
        <div class="muted"><a href="#/ho-so?tab=${col}">← ${col === "projects" ? "Nghiên cứu" : "Bản thảo"}</a> · M03</div>
        <h1><span class="code" style="font-size:16px">${esc(r.id)}</span> ${esc(r.title)}</h1>
        <div class="meta">${stageBadge(col, r.stage)} ${workBadge(r.status)} <span>${esc(App.unitName(r.unitId))}</span>
          <span>${col === "projects" ? "Chủ nhiệm" : "Tác giả phụ trách"}: <b>${orNA(App.personName(leadOf(col, r)))}</b></span>
          <span>Lộ trình: ${orNA(label("routes", r.route))}</span>${r.verifyLevel && r.verifyLevel !== "da_xac_minh" ? `<span class="tag tag-warn">${esc(label("verifyLevel", r.verifyLevel))}</span>` : ""}</div></div>
        <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start">
          <button class="btn primary" id="qu">Cập nhật nhanh</button><button class="btn" id="st">Chuyển giai đoạn</button>
          <button class="btn" id="rq">Gửi yêu cầu hỗ trợ</button><button class="btn" id="ed">Sửa thông tin</button></div></div>

      <div class="next-box"><div><div class="k">Việc tiếp theo</div><div class="v">${orNA(r.nextAction)}</div></div>
        <div><div class="k">Người phụ trách</div><div class="v">${orNA(App.personName(r.ownerId))}</div></div>
        <div><div class="k">Hạn</div><div class="v">${dueBadge(r.nextDue, cutoff)}</div></div></div>
      ${r.statusReason ? `<p style="margin-top:-6px">Lý do tình trạng: <b>${esc(r.statusReason)}</b></p>` : ""}

      <nav class="local-nav" aria-label="Các phần của hồ sơ"><a href="#" data-jump="s-progress">Tiến độ</a><a href="#" data-jump="s-plan">Kế hoạch & thời gian</a><a href="#" data-jump="s-support">Hỗ trợ</a>
        ${col === "manuscripts" ? '<a href="#" data-jump="s-pub">Công bố</a>' : ""}<a href="#" data-jump="s-info">Nhận diện & tài liệu</a><a href="#" data-jump="s-hist">Lịch sử</a></nav>

      <div class="stack">
      <section class="card" id="s-progress"><h2>Tiến độ</h2>
        <ol class="stepper">${stages.map(([k, l], i) => `<li class="${i < curIdx ? "done" : i === curIdx ? "cur" : ""}"${i === curIdx ? ' aria-current="step"' : ""}>${i + 1}. ${esc(l)}</li>`).join("")}</ol>
        <dl class="dl"><dt>Thời gian từ khi tiếp nhận</dt><dd>${r.intakeDate ? `${T.days(r.intakeDate, cutoff)} ngày lịch (tiếp nhận ${T.fmt(r.intakeDate)}, giai đoạn lúc tiếp nhận: ${esc(label(stageKey(col), r.intakeStage || r.stage))})` : NA}</dd>
          <dt>Thời gian ở giai đoạn hiện tại</dt><dd>${r.stageEnteredAt ? `${T.days(r.stageEnteredAt, cutoff)} ngày (từ ${T.fmt(r.stageEnteredAt)})` : NA}</dd>
          <dt>Cập nhật nghiệp vụ gần nhất</dt><dd>${r.lastUpdate ? `${T.fmt(r.lastUpdate)} (${T.days(r.lastUpdate, cutoff)} ngày trước)` : NA}</dd>
          <dt>Mốc mục tiêu</dt><dd>${orNA(r.targetMilestone)}</dd></dl>
        ${stageEvents.length ? `<h3 style="margin-top:12px">Lịch sử chuyển giai đoạn</h3><ul class="timeline">${stageEvents.map(e => App.eventItem(e)).join("")}</ul>` : ""}
      </section>

      <section class="card" id="s-plan"><div class="card-head"><h2>Kế hoạch, mốc công việc và thời gian</h2><button class="btn sm" id="addW">+ Mốc công việc</button></div>
        <p class="card-sub">Mỗi công việc có các khoảng trạng thái không chồng lấn. Công việc song song không cộng dồn thành thời gian toàn hồ sơ.</p>
        ${works.length ? `<div class="table-wrap"><table><thead><tr><th>Công việc · đầu ra</th><th>Người thực hiện</th><th>Hạn ban đầu / điều chỉnh</th><th>Tình trạng</th><th style="min-width:220px">Phân bổ thời gian</th><th></th></tr></thead><tbody>
          ${works.map(w => `<tr><td><b>${esc(w.title)}</b><span class="sub">${esc(w.output)}</span>${w.evidenceUrl ? `<a href="${esc(w.evidenceUrl)}" target="_blank" rel="noopener">Minh chứng ↗</a>` : ""}</td>
            <td>${orNA(App.personName(w.ownerId))}</td><td>${w.status !== "hoan_thanh" ? dueBadge(w.dueAdjusted || w.dueOriginal, cutoff) : (w.dueAdjusted || w.dueOriginal ? T.fmt(w.dueAdjusted || w.dueOriginal) : NA)}
            ${w.dueAdjusted ? `<span class="sub">Hạn ban đầu ${T.fmt(w.dueOriginal)} — ${esc(w.extensionReason)}</span>` : ""}</td><td>${workBadge(w.status)}</td><td>${timeBar(w)}</td>
            <td><button class="btn sm" data-wst="${esc(w.id)}">Đổi tình trạng</button> <button class="btn sm ghost" data-wed="${esc(w.id)}">Sửa</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="empty">Chưa có mốc công việc.</p>`}
      </section>

      <section class="card" id="s-support"><div class="card-head"><h2>Điểm nghẽn và hỗ trợ</h2></div>
        ${sups.length ? `<div class="table-wrap"><table><thead><tr><th>Yêu cầu</th><th>Nguyên nhân xác nhận</th><th>Người xử lý</th><th>Trạng thái</th><th>Hạn</th><th class="num">Tuổi (ngày)</th></tr></thead><tbody>
          ${sups.map(s => { const f = supportFacts(s, data, cutoff); return `<tr><td><a class="row-link" href="#/ho-tro/${esc(s.id)}">${esc(s.id)}</a><span class="sub">${esc(label("supportTypes", s.supportType))} — ${esc(s.problem)}</span></td>
            <td>${s.confirmedCause ? esc(s.confirmedCause) : '<span class="na">Chưa xác minh</span>'}</td><td>${orNA(App.providerName(s.providerId))}</td><td>${supportBadge(s.status)}</td>
            <td>${f.open ? dueBadge(f.due, cutoff) : (s.confirmedAt ? `<small>Xác nhận ${T.fmt(s.confirmedAt)}</small>` : "")}</td><td class="num">${f.open ? f.ageDays : ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="empty">Chưa có yêu cầu hỗ trợ.</p>`}
      </section>

      ${col === "manuscripts" ? `<section class="card" id="s-pub"><div class="card-head"><h2>Công bố</h2><button class="btn sm" id="addOpt">+ Phương án tạp chí</button><button class="btn sm" id="addSub">+ Lần nộp</button><button class="btn sm" id="addPub">+ Kết quả xuất bản</button></div>
        <h3>Phương án tạp chí <small class="muted">(3–5 phương án tham khảo; lựa chọn do người có trách nhiệm chuyên môn xác nhận)</small></h3>
        ${(r.journalOptions || []).length ? `<div class="table-wrap" style="margin:8px 0 16px"><table><thead><tr><th>Tạp chí</th><th>Vai trò</th><th>Xác minh</th><th>Mức phù hợp · yêu cầu · chi phí</th><th></th></tr></thead><tbody>
          ${r.journalOptions.map((o, i) => { const j = App.find("journals", o.journalId); const v = j ? journalVerification(j, cutoff, App.settings()) : { state: "missing", text: "Không tìm thấy" };
            return `<tr><td><a href="#/tap-chi?id=${esc(o.journalId)}">${esc(App.journalName(o.journalId) || o.journalId)}</a></td><td>${esc(label("optionRoles", o.role))}</td>
              <td>${v.state === "ok" ? `<span class="tag tag-good">✓ ${esc(v.text)}</span>` : `<span class="tag tag-warn">? Cần xác minh</span><span class="sub">${esc(v.text)}</span>`}</td>
              <td>${orNA(o.fit)}${o.requirements ? `<span class="sub">Yêu cầu: ${esc(o.requirements)}</span>` : ""}${o.cost ? `<span class="sub">Chi phí: ${esc(o.cost)}</span>` : ""}${o.note ? `<span class="sub">${esc(o.note)}</span>` : ""}</td>
              <td><button class="btn sm ghost" data-opt="${i}">Sửa</button></td></tr>`; }).join("")}</tbody></table></div>` : `<p class="empty">Chưa lập phương án.</p>`}
        <h3>Các lần nộp</h3>
        ${subs.length ? `<div class="table-wrap" style="margin:8px 0 16px"><table><thead><tr><th>Mã lần nộp</th><th>Tạp chí · mã tại tạp chí</th><th>Ngày nộp</th><th>Quyết định</th><th>Vòng sửa</th><th>Kết thúc</th><th></th></tr></thead><tbody>
          ${subs.map(s => `<tr><td class="code">${esc(s.id)}</td><td>${esc(App.journalName(s.journalId))}<span class="sub">${esc(s.journalRef)}</span></td><td>${T.fmt(s.submittedAt)}<span class="sub">${T.days(s.submittedAt, s.endedAt || cutoff)} ngày ${s.endedAt ? "xử lý" : "đã chờ"}</span></td>
            <td>${decisionBadge(s.decision)}${s.decisionAt ? `<span class="sub">${T.fmt(s.decisionAt)}</span>` : ""}</td>
            <td>${(s.revisionRounds || []).map(rr => `Vòng ${rr.round}: hạn ${T.fmt(rr.dueAt)}${rr.submittedAt ? `, gửi ${T.fmt(rr.submittedAt)}` : (s.endedAt ? "" : " " + dueBadge(rr.dueAt, cutoff))}`).join("<br>") || "—"}</td>
            <td>${s.endedAt ? T.fmt(s.endedAt) : '<span class="tag tag-info">Đang mở</span>'}</td>
            <td>${s.endedAt ? "" : `<button class="btn sm" data-dec="${esc(s.id)}">Ghi quyết định</button>${s.decision === "can_sua" && (s.revisionRounds || []).some(x => !x.submittedAt) ? ` <button class="btn sm" data-rev="${esc(s.id)}">Gửi bản sửa</button>` : ""}`}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty">Chưa có lần nộp.</p>`}
        <h3>Kết quả xuất bản</h3>
        ${pubs.length ? `<ul>${pubs.map(p => `<li>${esc(p.title)} — ${esc(label("versionTypes", p.versionType))}, ${p.publishedAt ? T.fmt(p.publishedAt) : NA}, DOI ${orNA(p.doi)} ${p.verified ? '<span class="tag tag-good">✓ Đã đối soát</span>' : '<span class="tag tag-warn">? Chưa đối soát</span>'}</li>`).join("")}</ul>` : `<p class="empty">Chưa có.</p>`}
      </section>` : ""}

      <section class="card" id="s-info"><h2>Nhận diện, chuyên môn và tài liệu</h2>
        <dl class="dl">
          <dt>Mã</dt><dd class="code">${esc(r.id)}</dd>
          ${col === "projects" ? `<dt>Tên rút gọn</dt><dd>${orNA(r.shortTitle)}</dd><dt>Loại nghiên cứu</dt><dd>${orNA(label("projectTypes", r.type))}</dd><dt>Lĩnh vực</dt><dd>${orNA(r.field)}</dd>
            <dt>Thành viên</dt><dd>${(r.memberIds || []).map(App.personName).map(esc).join(", ") || NA}</dd>` :
            `<dt>Loại bài</dt><dd>${orNA(label("articleTypes", r.articleType))}</dd><dt>Tác giả</dt><dd>${(r.authorIds || []).map(App.personName).map(esc).join(", ") || NA}</dd><dt>Phiên bản</dt><dd>${orNA(r.version)}</dd>`}
          <dt>${col === "projects" ? "Bản thảo liên quan" : "Nghiên cứu liên quan"}</dt><dd>${linked.length ? linked.map(x => App.recordLink(col === "projects" ? "manuscripts" : "projects", x.id)).join("<br>") : NA}</dd>
          <dt>Nguồn ngày lịch sử</dt><dd>${orNA(r.dateSource)}</dd><dt>Mức xác minh</dt><dd>${orNA(label("verifyLevel", r.verifyLevel))}</dd>
          <dt>Tài liệu</dt><dd>${r.docsUrl ? `<a href="${esc(r.docsUrl)}" target="_blank" rel="noopener">Thư mục tài liệu được cấp quyền ↗</a>` : NA}</dd>
        </dl></section>

      <section class="card" id="s-hist"><h2>Lịch sử thay đổi <span class="muted">(${evs.length})</span></h2>
        <p class="card-sub">Ai thay đổi, nội dung, thời điểm xảy ra, thời điểm ghi và lý do. Sửa sai dùng “Đính chính” để giữ vết.</p>
        ${evs.length ? `<ul class="timeline">${evs.map(e => App.eventItem(e, true)).join("")}</ul>` : `<p class="empty">Chưa có dữ liệu</p>`}</section>
      </div>`;

    el.querySelectorAll("[data-jump]").forEach(a => a.onclick = e => { e.preventDefault(); document.getElementById(a.dataset.jump).scrollIntoView({ behavior: "smooth" }); });
    el.querySelector("#qu").onclick = () => forms.quickUpdate(col, r.id);
    el.querySelector("#st").onclick = () => forms.stageChange(col, r.id);
    el.querySelector("#rq").onclick = () => forms.newSupport({ parent: col + ":" + r.id });
    el.querySelector("#ed").onclick = () => forms.record(col, r.id);
    el.querySelector("#addW").onclick = () => forms.workItem(col, r.id);
    el.querySelectorAll("[data-wst]").forEach(b => b.onclick = () => forms.workStatus(b.dataset.wst));
    el.querySelectorAll("[data-wed]").forEach(b => b.onclick = () => forms.workItem(col, r.id, b.dataset.wed));
    if (col === "manuscripts") {
      el.querySelector("#addOpt").onclick = () => forms.journalOption(r.id);
      el.querySelectorAll("[data-opt]").forEach(b => b.onclick = () => forms.journalOption(r.id, Number(b.dataset.opt)));
      el.querySelector("#addSub").onclick = () => forms.submission(r.id);
      el.querySelector("#addPub").onclick = () => forms.publication(null, r.id);
      el.querySelectorAll("[data-dec]").forEach(b => b.onclick = () => forms.decision(b.dataset.dec));
      el.querySelectorAll("[data-rev]").forEach(b => b.onclick = () => forms.revisionSubmit(b.dataset.rev));
    }
    App.bindCorrect(el);
  };

  /* ================= Biểu mẫu ================= */
  const done = (msg) => { toast(msg); App.rerender(); };
  const dateOk = (a, b) => !a || !b || a <= b;

  forms.record = function (col, id) {
    const r = id ? App.find(col, id) : null;
    const isP = col === "projects";
    const fields = [
      { section: "Nhận diện" },
      { name: "id", label: "Mã hồ sơ", required: true, readonly: !!r, help: r ? "" : "Mã nội bộ được chấp nhận khi chưa có mã đề tài" },
      { name: "unitId", label: "Khoa / đơn vị", type: "select", options: App.options.units(), required: true },
      { name: "title", label: "Tiêu đề", required: true, full: true },
      ...(isP ? [{ name: "shortTitle", label: "Tên rút gọn" }, { name: "type", label: "Loại nghiên cứu", type: "select", options: D.projectTypes },
        { name: "leadId", label: "Chủ nhiệm", type: "select", options: App.options.people(), required: true }, { name: "field", label: "Lĩnh vực" },
        { name: "memberIds", label: "Thành viên", type: "multi", options: App.options.people() }]
        : [{ name: "articleType", label: "Loại bài", type: "select", options: D.articleTypes }, { name: "version", label: "Phiên bản" },
          { name: "correspondingId", label: "Tác giả phụ trách", type: "select", options: App.options.people(), required: true },
          { name: "projectIds", label: "Nghiên cứu liên quan", type: "multi", options: App.data().projects.map(p => [p.id, App.recordLabel("projects", p.id)]), help: "Một nghiên cứu có thể có nhiều bản thảo và ngược lại" },
          { name: "authorIds", label: "Tác giả (nội bộ)", type: "multi", options: App.options.people() }]),
      { name: "route", label: "Lộ trình", type: "select", options: D.routes },
      { name: "targetMilestone", label: "Mốc mục tiêu", help: "Xác định khi bắt đầu, dùng cho K06" },
      { section: "Tiếp nhận" },
      { name: "intakeDate", label: "Ngày tiếp nhận vào hệ thống", type: "date", required: true },
      ...(r ? [] : [{ name: "intakeStage", label: "Giai đoạn lúc tiếp nhận", type: "select", options: stagesOf(col), required: true, help: "Bản thảo có sẵn tiếp nhận tại giai đoạn thực tế" }]),
      { name: "dateSource", label: "Nguồn ngày lịch sử (nếu nhập lại)", help: "Không thay ngày chưa biết bằng ngày tạo hồ sơ" },
      { name: "verifyLevel", label: "Mức xác minh", type: "select", options: D.verifyLevel },
      { name: "docsUrl", label: "Đường dẫn tài liệu được cấp quyền", type: "url", full: true },
      { section: "Việc tiếp theo" },
      { name: "nextAction", label: "Việc tiếp theo" }, { name: "ownerId", label: "Người phụ trách", type: "select", options: App.options.people() },
      { name: "nextDue", label: "Hạn", type: "date" }
    ];
    const init = r || { id: App.nextId(col, isP ? "NC-" : "MS-", isP ? 2 : 3), intakeDate: App.state.cutoff, verifyLevel: "da_xac_minh", route: "moi", intakeStage: stagesOf(col)[0][0] };
    modal({ title: r ? `Sửa ${r.id}` : (isP ? "Thêm nghiên cứu" : "Thêm bản thảo"), wide: true, body: formHtml(fields, init), onSubmit: async form => {
      const v = readForm(form, fields);
      if (!r && App.find(col, v.id)) throw new Error(`Mã ${v.id} đã tồn tại.`);
      if (r) {
        await App.saveRecord(col, Object.assign({}, r, v), { reason: "Sửa thông tin hồ sơ" });
        return done("Đã lưu thay đổi.");
      }
      const rec = Object.assign({ stage: v.intakeStage, stageEnteredAt: v.intakeDate, status: "dang_thuc_hien", statusReason: "", lastUpdate: v.intakeDate }, v, isP ? {} : { journalOptions: [] });
      await App.saveRecord(col, rec, { type: "tiep_nhan", occurredAt: v.intakeDate, reason: "Tiếp nhận hồ sơ tại giai đoạn " + label(stageKey(col), v.intakeStage) });
      toast("Đã tạo " + rec.id);
      App.go(App.recordHref(col, rec.id));
    } });
  };

  forms.quickUpdate = function (col, id) {
    const r = App.find(col, id);
    const fields = [
      { name: "status", label: "Tình trạng thực hiện", type: "select", options: D.workStatus, required: true },
      { name: "statusReason", label: "Lý do / nội dung chờ", help: "Bắt buộc khi tạm dừng hoặc chờ" },
      { name: "nextAction", label: "Việc tiếp theo", full: true }, { name: "ownerId", label: "Người phụ trách", type: "select", options: App.options.people() },
      { name: "nextDue", label: "Hạn", type: "date" },
      { name: "occurredAt", label: "Ngày xảy ra", type: "date", required: true, help: "Ngày sự kiện thực tế; ngày nhập được ghi tự động" },
      { name: "evidenceUrl", label: "Minh chứng (đường dẫn)", type: "url" },
      { name: "reason", label: "Ghi chú", type: "textarea", rows: 2 }
    ];
    modal({ title: `Cập nhật nhanh ${r.id}`, body: formHtml(fields, Object.assign({}, r, { occurredAt: App.state.cutoff })), onSubmit: async form => {
      const v = readForm(form, fields);
      if (["tam_dung", "cho_noi_bo", "cho_ben_ngoai"].includes(v.status) && !v.statusReason) throw new Error("Cần ghi lý do khi tạm dừng hoặc chờ.");
      const next = Object.assign({}, r, { status: v.status, statusReason: v.statusReason, nextAction: v.nextAction, ownerId: v.ownerId, nextDue: v.nextDue });
      await App.saveRecord(col, next, { type: v.status !== r.status ? "doi_tinh_trang" : "cap_nhat", occurredAt: v.occurredAt, evidenceUrl: v.evidenceUrl, reason: v.reason || v.statusReason });
      done("Đã cập nhật " + r.id);
    } });
  };

  forms.stageChange = function (col, id) {
    const r = App.find(col, id), stages = stagesOf(col);
    const curIdx = stages.findIndex(([k]) => k === r.stage);
    const fields = [
      { name: "stage", label: "Chuyển sang giai đoạn", type: "select", options: stages.filter(([k]) => k !== r.stage), required: true },
      { name: "occurredAt", label: "Ngày chuyển (thực tế)", type: "date", required: true },
      { name: "rule", label: "Điều kiện cần kiểm tra", type: "static", html: '<div class="rule-box" id="ruleBox">Chọn giai đoạn để xem điều kiện.</div>', full: true },
      { name: "evidenceUrl", label: "Minh chứng (đường dẫn)", type: "url", full: true },
      { name: "checked", label: "Tôi đã kiểm tra điều kiện trên", type: "checkbox" },
      { name: "notApplicable", label: "Điều kiện không áp dụng (ghi lý do)", type: "checkbox" },
      { name: "reason", label: "Lý do / ghi chú", type: "textarea", rows: 2, help: "Bắt buộc khi quay lại, bỏ qua giai đoạn hoặc không áp dụng điều kiện" }
    ];
    const form = modal({ title: `Chuyển giai đoạn ${r.id}`, body: `<p>Giai đoạn hiện tại: ${stageBadge(col, r.stage)}</p>` + formHtml(fields, { occurredAt: App.state.cutoff }), submitLabel: "Chuyển giai đoạn", onSubmit: async f => {
      const v = readForm(f, fields);
      const toIdx = stages.findIndex(([k]) => k === v.stage);
      const rule = (STAGE_RULES[col === "projects" ? "project" : "manuscript"] || {})[v.stage];
      if (rule && !((v.checked && v.evidenceUrl) || (v.notApplicable && v.reason))) throw new Error("CB09 — Thiếu minh chứng: cần đường dẫn minh chứng và xác nhận đã kiểm tra, hoặc đánh dấu không áp dụng kèm lý do.");
      if (toIdx < curIdx && !v.reason) throw new Error("Quay lại giai đoạn trước cần ghi lý do.");
      if (toIdx > curIdx + 1 && !v.reason) throw new Error("Bỏ qua giai đoạn cần ghi lý do và xác nhận phù hợp.");
      if (r.stageEnteredAt && v.occurredAt < r.stageEnteredAt) throw new Error(`Ngày chuyển không được trước ngày vào giai đoạn hiện tại (${T.fmt(r.stageEnteredAt)}).`);
      if (col === "manuscripts" && v.stage === "da_nop" && !App.data().submissions.some(s => s.manuscriptId === r.id && !s.endedAt)) {
        throw new Error("Để chuyển sang “Tạp chí xử lý”, hãy ghi nhận một lần nộp (mục Công bố › + Lần nộp) — hệ thống sẽ tự chuyển giai đoạn.");
      }
      const next = Object.assign({}, r, { stage: v.stage, stageEnteredAt: v.occurredAt });
      if (v.stage === "xuat_ban") next.status = "hoan_thanh";
      await App.saveRecord(col, next, { type: "chuyen_giai_doan", occurredAt: v.occurredAt, evidenceUrl: v.evidenceUrl, reason: [v.notApplicable ? "Điều kiện không áp dụng" : "", v.reason].filter(Boolean).join(" — ") });
      done(`Đã chuyển ${r.id} sang ${label(stageKey(col), v.stage)}.`);
    } });
    const box = form.querySelector("#ruleBox");
    const upd = () => {
      const k = form.elements.stage.value;
      const rule = (STAGE_RULES[col === "projects" ? "project" : "manuscript"] || {})[k];
      box.innerHTML = rule ? `<b>Cần minh chứng:</b> ${esc(rule)}` : "Không có điều kiện bắt buộc cho bước này (vẫn nên ghi minh chứng nếu có).";
    };
    form.elements.stage.addEventListener("change", upd); upd();
  };

  forms.workItem = function (parentType, parentId, wid) {
    const w = wid ? App.find("workItems", wid) : null;
    const fields = [
      { name: "title", label: "Công việc / mốc", required: true, full: true }, { name: "output", label: "Đầu ra", full: true },
      { name: "ownerId", label: "Người thực hiện", type: "select", options: App.options.people(), required: true },
      { name: "kind", label: "Loại công việc", type: "select", options: [["ra_soat_phuong_an", "Rà soát phương án sau từ chối (đóng CB05)"]] },
      { name: "dueOriginal", label: "Hạn ban đầu", type: "date", required: true, readonly: !!(w && w.dueOriginal), help: w ? "Giữ nguyên hạn ban đầu; dùng hạn điều chỉnh khi gia hạn" : "" },
      { name: "dueAdjusted", label: "Hạn điều chỉnh", type: "date" }, { name: "extensionReason", label: "Lý do điều chỉnh hạn", full: true },
      ...(w ? [] : [{ name: "status", label: "Tình trạng ban đầu", type: "select", options: D.workStatus, required: true }, { name: "createdAt", label: "Ngày bắt đầu", type: "date", required: true }]),
      { name: "evidenceUrl", label: "Minh chứng", type: "url", full: true }
    ];
    modal({ title: w ? "Sửa mốc công việc" : "Thêm mốc công việc", body: formHtml(fields, w || { status: "dang_thuc_hien", createdAt: App.state.cutoff }), onSubmit: async form => {
      const v = readForm(form, fields);
      if (v.dueAdjusted && v.dueAdjusted !== (w && w.dueAdjusted) && !v.extensionReason) throw new Error("Cần ghi lý do điều chỉnh hạn.");
      if (!w && v.dueOriginal < v.createdAt) throw new Error("Hạn không được trước ngày bắt đầu.");
      const rec = w ? Object.assign({}, w, v) : Object.assign({ id: App.nextId("workItems", "W-"), parentType, parentId, statusLog: [{ status: v.status, at: v.createdAt }] }, v);
      await App.saveRecord("workItems", rec, { type: w && v.dueAdjusted !== w.dueAdjusted ? "gia_han" : undefined, reason: v.extensionReason, occurredAt: w ? App.state.cutoff : v.createdAt });
      await App.touchParent(parentType, parentId, w ? App.state.cutoff : v.createdAt);
      done("Đã lưu mốc công việc.");
    } });
  };

  forms.workStatus = function (wid) {
    const w = App.find("workItems", wid);
    const last = (w.statusLog || []).slice(-1)[0];
    const fields = [
      { name: "status", label: "Tình trạng mới", type: "select", options: D.workStatus.filter(([k]) => k !== w.status), required: true },
      { name: "at", label: "Từ ngày", type: "date", required: true, min: last ? last.at : "" },
      { name: "reason", label: "Lý do", help: "Bắt buộc khi chờ hoặc tạm dừng", full: true },
      { name: "evidenceUrl", label: "Minh chứng", type: "url", full: true }
    ];
    modal({ title: "Đổi tình trạng: " + w.title, body: `<p>Hiện tại: ${workBadge(w.status)} từ ${last ? T.fmt(last.at) : "?"}</p>` + formHtml(fields, { at: App.state.cutoff }), onSubmit: async form => {
      const v = readForm(form, fields);
      if (last && v.at < last.at) throw new Error(`Ngày phải từ ${T.fmt(last.at)} trở đi để các khoảng không chồng lấn.`);
      if (["tam_dung", "cho_noi_bo", "cho_ben_ngoai"].includes(v.status) && !v.reason) throw new Error("Cần ghi lý do khi chờ hoặc tạm dừng.");
      const rec = Object.assign({}, w, { status: v.status, statusLog: [...(w.statusLog || []), { status: v.status, at: v.at, reason: v.reason }] }, v.evidenceUrl ? { evidenceUrl: v.evidenceUrl } : {});
      await App.saveRecord("workItems", rec, { type: "doi_tinh_trang", occurredAt: v.at, reason: v.reason, evidenceUrl: v.evidenceUrl });
      await App.touchParent(w.parentType, w.parentId, v.at);
      done("Đã đổi tình trạng.");
    } });
  };

  forms.journalOption = function (msId, idx) {
    const ms = App.find("manuscripts", msId), opts = [...(ms.journalOptions || [])];
    const o = idx != null ? opts[idx] : null;
    if (!o && opts.length >= 5) { toast("Mỗi bản thảo lập tối đa 5 phương án.", "crit"); return; }
    const fields = [
      { name: "journalId", label: "Tạp chí", type: "select", options: App.options.journals(), required: true, help: "Thêm tạp chí mới ở mục Tạp chí & xác minh" },
      { name: "role", label: "Vai trò", type: "select", options: D.optionRoles, required: true },
      { name: "fit", label: "Mức độ phù hợp (đánh giá sau khi kiểm tra điều kiện)", full: true }, { name: "requirements", label: "Yêu cầu bài", full: true },
      { name: "cost", label: "Chi phí" }, { name: "note", label: "Ghi chú" }
    ];
    modal({ title: o ? "Sửa phương án tạp chí" : "Thêm phương án tạp chí", body: formHtml(fields, o || { role: opts.length ? "du_phong" : "muc_tieu" }),
      extra: o ? `<button type="button" class="btn ghost" id="delOpt">Xóa phương án</button>` : "", onSubmit: async form => {
        const v = readForm(form, fields);
        if (o) opts[idx] = v; else opts.push(v);
        await App.saveRecord("manuscripts", Object.assign({}, ms, { journalOptions: opts }), { reason: "Cập nhật phương án tạp chí" });
        done("Đã lưu phương án.");
      } });
    const del = document.getElementById("delOpt");
    if (del) del.onclick = async () => { opts.splice(idx, 1); await App.saveRecord("manuscripts", Object.assign({}, ms, { journalOptions: opts }), { reason: "Xóa phương án tạp chí" }); document.querySelector("dialog.modal").close(); done("Đã xóa phương án."); };
  };

  forms.submission = function (msId) {
    const ms = App.find("manuscripts", msId), data = App.data();
    const openSub = data.submissions.find(s => s.manuscriptId === msId && !s.endedAt);
    if (openSub) { toast(`Lần nộp ${openSub.id} chưa kết thúc. Chỉ mở lần nộp mới sau khi lần hiện tại kết thúc hoặc rút hợp lệ.`, "crit"); return; }
    const n = data.submissions.filter(s => s.manuscriptId === msId).length + 1;
    const fields = [
      { name: "id", label: "Mã lần nộp", readonly: true }, { name: "journalId", label: "Tạp chí", type: "select", options: App.options.journals(), required: true },
      { name: "journalRef", label: "Mã bài tại tạp chí" }, { name: "submittedAt", label: "Ngày nộp", type: "date", required: true },
      { name: "evidenceUrl", label: "Biên nhận / xác nhận nộp bài (đường dẫn)", type: "url", required: true, full: true },
      { name: "verifyNote", label: "Xác minh tạp chí", type: "static", html: '<span id="jv" class="muted">Chọn tạp chí</span>', full: true }
    ];
    const form = modal({ title: `Ghi nhận lần nộp — ${ms.id}`, body: formHtml(fields, { id: `SUB-${ms.id.replace(/^MS-/, "")}-${n}`, submittedAt: App.state.cutoff, journalId: ((ms.journalOptions || []).find(o => o.role === "muc_tieu") || {}).journalId }), onSubmit: async f => {
      const v = readForm(f, fields);
      if (App.find("submissions", v.id)) throw new Error("Mã lần nộp đã tồn tại.");
      const sub = { id: v.id, manuscriptId: msId, journalId: v.journalId, journalRef: v.journalRef, submittedAt: v.submittedAt, decision: "dang_xu_ly", decisionAt: "", endedAt: "", evidenceUrl: v.evidenceUrl, revisionRounds: [] };
      await App.saveRecord("submissions", sub, { type: "nop_bai", occurredAt: v.submittedAt, evidenceUrl: v.evidenceUrl, reason: "Nộp bài tới " + App.journalName(v.journalId) });
      await App.saveRecord("manuscripts", Object.assign({}, ms, { stage: "da_nop", stageEnteredAt: v.submittedAt, status: "cho_ben_ngoai", statusReason: "Tạp chí đang xử lý" }),
        { type: "chuyen_giai_doan", occurredAt: v.submittedAt, evidenceUrl: v.evidenceUrl, reason: `Lần nộp ${v.id}` });
      done("Đã ghi nhận lần nộp.");
    } });
    const jv = form.querySelector("#jv");
    const upd = () => { const j = App.find("journals", form.elements.journalId.value); if (!j) { jv.textContent = "Chọn tạp chí"; return; }
      const r = journalVerification(j, App.state.cutoff, App.settings()); jv.innerHTML = r.state === "ok" ? `<span class="tag tag-good">✓ ${esc(r.text)}</span>` : `<span class="tag tag-warn">? Cần xác minh — ${esc(r.text)}</span>`; };
    form.elements.journalId.addEventListener("change", upd); upd();
  };

  forms.decision = function (subId) {
    const s = App.find("submissions", subId), ms = App.find("manuscripts", s.manuscriptId);
    const fields = [
      { name: "decision", label: "Quyết định của tạp chí", type: "select", options: D.decisions.filter(([k]) => k !== "dang_xu_ly"), required: true },
      { name: "decisionAt", label: "Ngày quyết định", type: "date", required: true },
      { name: "revisionDue", label: "Hạn nộp bản sửa (khi cần sửa)", type: "date" },
      { name: "evidenceUrl", label: "Thư quyết định (đường dẫn)", type: "url", full: true },
      { name: "reason", label: "Ghi chú", type: "textarea", rows: 2 }
    ];
    modal({ title: `Quyết định cho ${s.id}`, body: formHtml(fields, { decisionAt: App.state.cutoff }), onSubmit: async f => {
      const v = readForm(f, fields);
      if (v.decisionAt < s.submittedAt) throw new Error("Ngày quyết định không được trước ngày nộp.");
      if (v.decision === "can_sua" && !v.revisionDue) throw new Error("Cần nhập hạn nộp bản sửa.");
      if (v.decision === "chap_nhan" && !v.evidenceUrl) throw new Error("Chuyển sang Chấp nhận cần quyết định chấp nhận có thể kiểm tra (đường dẫn).");
      const next = Object.assign({}, s, { decision: v.decision, decisionAt: v.decisionAt });
      let msNext = Object.assign({}, ms);
      if (v.decision === "can_sua") {
        const rounds = [...(s.revisionRounds || [])];
        rounds.push({ round: rounds.length + 1, dueAt: v.revisionDue, submittedAt: "" });
        next.revisionRounds = rounds;
        Object.assign(msNext, { stage: "sua_bai", stageEnteredAt: v.decisionAt, status: "dang_thuc_hien", statusReason: "", nextAction: "Sửa bài theo phản biện", nextDue: v.revisionDue, ownerId: ms.correspondingId });
      } else {
        next.endedAt = v.decisionAt;
        if (v.decision === "chap_nhan") Object.assign(msNext, { stage: "chap_nhan", stageEnteredAt: v.decisionAt, status: "dang_thuc_hien", statusReason: "" });
        else Object.assign(msNext, { stage: "sua_bai", stageEnteredAt: v.decisionAt, status: "dang_thuc_hien", statusReason: v.decision === "tu_choi" ? "Bị từ chối, cần chọn phương án tiếp theo" : "Đã rút bài",
          nextAction: "Rà soát phương án tạp chí tiếp theo", ownerId: ms.correspondingId });
      }
      await App.saveRecord("submissions", next, { type: "quyet_dinh_tap_chi", occurredAt: v.decisionAt, evidenceUrl: v.evidenceUrl, reason: v.reason });
      await App.saveRecord("manuscripts", msNext, { type: "chuyen_giai_doan", occurredAt: v.decisionAt, evidenceUrl: v.evidenceUrl, reason: `Quyết định ${label("decisions", v.decision)} (${s.id})` });
      done("Đã ghi quyết định.");
    } });
  };

  forms.revisionSubmit = function (subId) {
    const s = App.find("submissions", subId), ms = App.find("manuscripts", s.manuscriptId);
    const rounds = [...(s.revisionRounds || [])], cur = rounds.find(x => !x.submittedAt);
    const fields = [{ name: "submittedAt", label: `Ngày gửi bản sửa vòng ${cur.round}`, type: "date", required: true }, { name: "evidenceUrl", label: "Xác nhận gửi bản sửa", type: "url", full: true }];
    modal({ title: `Gửi bản sửa — ${s.id}`, body: formHtml(fields, { submittedAt: App.state.cutoff }), onSubmit: async f => {
      const v = readForm(f, fields);
      cur.submittedAt = v.submittedAt;
      await App.saveRecord("submissions", Object.assign({}, s, { revisionRounds: rounds, decision: "dang_xu_ly" }), { type: "nop_bai", occurredAt: v.submittedAt, evidenceUrl: v.evidenceUrl, reason: `Gửi bản sửa vòng ${cur.round}` });
      await App.saveRecord("manuscripts", Object.assign({}, ms, { stage: "da_nop", stageEnteredAt: v.submittedAt, status: "cho_ben_ngoai", statusReason: "Tạp chí xử lý bản sửa", nextAction: "Theo dõi quyết định của tạp chí", nextDue: "" }),
        { type: "chuyen_giai_doan", occurredAt: v.submittedAt, evidenceUrl: v.evidenceUrl, reason: `Bản sửa vòng ${cur.round} (${s.id})` });
      done("Đã ghi nhận bản sửa.");
    } });
  };

  forms.publication = function (pid, msId) {
    const p = pid ? App.find("publications", pid) : null;
    const fields = [
      { name: "id", label: "Mã sản phẩm", readonly: true }, { name: "manuscriptId", label: "Bản thảo", type: "select", options: App.data().manuscripts.map(m => [m.id, App.recordLabel("manuscripts", m.id)]) },
      { name: "title", label: "Tiêu đề", required: true, full: true }, { name: "journalId", label: "Tạp chí / nguồn", type: "select", options: App.options.journals() },
      { name: "doi", label: "DOI hoặc định danh khác" }, { name: "publishedAt", label: "Ngày xuất bản chính thức", type: "date" },
      { name: "versionType", label: "Loại phiên bản", type: "select", options: D.versionTypes, required: true },
      { name: "sourceUrl", label: "Trang xuất bản chính thức", type: "url" },
      { name: "unitIds", label: "Đơn vị tác giả", type: "multi", options: App.options.units() },
      { name: "verified", label: "Đã đối soát (trang chính thức + ngày xuất bản)", type: "checkbox" }, { name: "notes", label: "Ghi chú", full: true }
    ];
    const ms = msId ? App.find("manuscripts", msId) : null;
    modal({ title: p ? "Sửa kết quả xuất bản" : "Thêm kết quả xuất bản", wide: true, body: formHtml(fields, p || { id: App.nextId("publications", "PUB-"), manuscriptId: msId || "", title: ms ? ms.title : "", versionType: "chinh_thuc",
      journalId: ms ? (App.data().submissions.filter(s => s.manuscriptId === ms.id && s.decision === "chap_nhan")[0] || {}).journalId || "" : "", unitIds: ms ? [ms.unitId] : [] }), onSubmit: async f => {
      const v = readForm(f, fields);
      if (v.verified && v.versionType === "chinh_thuc" && (!v.sourceUrl || !v.publishedAt)) throw new Error("Đối soát công bố chính thức cần trang xuất bản chính thức và ngày xuất bản — DOI riêng lẻ không đủ.");
      const dup = v.doi && App.data().publications.find(x => x.id !== v.id && (x.doi || "").toLowerCase() === v.doi.toLowerCase());
      await App.saveRecord("publications", Object.assign({}, p || {}, v), { occurredAt: v.publishedAt || App.state.cutoff });
      if (dup) toast(`DOI trùng với ${dup.id} — đã đưa vào danh sách đối soát (CB10).`, "crit");
      done("Đã lưu kết quả xuất bản.");
    } });
  };

  forms.correctEvent = function (eid) {
    const e = App.find("events", eid);
    const rec = App.find(e.entityType, e.entityId);
    const canApply = rec && e.field && !String(e.after).startsWith("[") && !String(e.after).startsWith("{");
    const fields = [
      { name: "orig", label: "Sự kiện gốc", type: "static", html: `<ul class="timeline">${App.eventItem(e)}</ul>`, full: true },
      ...(canApply ? [{ name: "value", label: `Giá trị đúng của “${FIELD_LABELS[e.field] || e.field}”`, help: "Để trống nếu chỉ ghi chú đính chính" },
        { name: "apply", label: "Áp dụng giá trị đúng vào hồ sơ", type: "checkbox" }] : []),
      { name: "occurredAt", label: "Ngày đính chính", type: "date", required: true },
      { name: "reason", label: "Lý do đính chính", type: "textarea", required: true, rows: 2 },
      { name: "evidenceUrl", label: "Minh chứng", type: "url", full: true }
    ];
    modal({ title: "Đính chính sự kiện " + e.id, wide: true, body: formHtml(fields, { occurredAt: App.state.cutoff, value: e.after, apply: true }), onSubmit: async f => {
      const v = readForm(f, fields);
      const ev = { id: "E-" + Date.now().toString(36), entityType: e.entityType, entityId: e.entityId, type: "dinh_chinh", field: e.field, before: e.after, after: v.value != null ? v.value : "",
        occurredAt: v.occurredAt, recordedAt: new Date().toISOString(), by: App.who(), reason: v.reason, evidenceUrl: v.evidenceUrl, correctsEventId: e.id };
      if (canApply && v.apply && v.value !== undefined) await window.Store.save(e.entityType, Object.assign({}, rec, { [e.field]: v.value }));
      await window.Store.save("events", ev);
      done("Đã ghi đính chính.");
    } });
  };
})();
