/* Trang của tôi, Báo cáo (lãnh đạo / điều phối) và Thông báo & văn bản. */
(function () {
  const App = window.App;
  const { T, PHASES, STATUSES, QUARTILES, NOTICE_KINDS, NK, Q, statusLabel, phaseOf, dueState, profileCompleteness, SUPPORT_OPEN } = window.Domain;
  const { esc, NA, orNA, link, phaseColor, statusChip, tag, supportTag, dueBadge, flagTags, avatar, formHtml, readForm, modal, confirmBox, toast, toCsv, download } = window.UI;
  const forms = App.forms;
  const done = msg => { toast(msg); App.rerender(); };
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  /* Thống kê đúng hạn / sắp đến hạn / quá hạn của một tập hồ sơ */
  function dueStats(records) {
    const st = App.settings(), today = App.state.today;
    const active = records.filter(r => !["xuat_ban", "tam_dung"].includes(r.status));
    const c = { dung_han: 0, sap_den: 0, qua_han: 0, chua_dat: 0 };
    active.forEach(r => { c[dueState(r, st, today)]++; });
    return { total: active.length, ...c };
  }
  function dueCards(s, href) {
    const box = (cls, title, n, desc, q) => `<a class="due-card ${cls}" href="${href}${q}"><div class="due-top"><span>${title}</span><i aria-hidden="true"></i></div>
      <div class="due-num"><b>${n}</b><span>${pct(n, s.total)}%</span></div><div class="due-desc">${desc}</div></a>`;
    return `<div class="due-grid">${box("ok", "Đúng hạn", s.dung_han + s.chua_dat, `Hồ sơ còn hạn${s.chua_dat ? ` (${s.chua_dat} chưa đặt hạn)` : ""}`, "?han=dung_han")}
      ${box("soon", "Sắp đến hạn", s.sap_den, `Hạn trong ${App.settings().soonDays} ngày tới`, "?han=sap_den")}
      ${box("late", "Quá hạn", s.qua_han, "Việc tiếp theo đã quá hạn", "?han=qua_han")}</div>`;
  }
  App.dueStats = dueStats; App.dueCards = dueCards;

  function profileCard(u) {
    const done = profileCompleteness(u);
    const row = (k, v) => `<div class="pc-row"><b>${esc(k)}:</b> <span>${v}</span></div>`;
    return `<section class="profile-card card"><h2 class="pc-head">Lý lịch khoa học</h2>
      <div class="pc-body"><div class="pc-avatar">${avatar(u.name, 64)}</div>
      <div class="pc-state">${tag("good", "Tài khoản đã duyệt", "✓")}</div>
      ${row("Tên", esc(u.name))}${row("Học hàm, học vị", orNA(u.degree))}${row("Chức vụ", orNA(u.title))}${row("Đơn vị", orNA(u.unit))}
      ${row("Điện thoại", orNA(u.phone))}${row("Email", esc(u.email))}${row("ORCID", u.orcid ? link("https://orcid.org/" + u.orcid, u.orcid) : NA)}
      <div class="pc-progress"><span>Hoàn thiện lý lịch: <b>${done}%</b></span><div class="meter"><span style="width:${done}%"></span></div></div>
      <a class="btn sm" href="#/ly-lich">Cập nhật lý lịch</a></div></section>`;
  }

  /* ================= Trang của tôi ================= */
  App.views.home = function (el) {
    const me = App.me(), today = App.state.today;
    const mine = App.all("records").filter(App.isTeam);
    const s = dueStats(mine);
    const sups = App.visibleSupports();
    const todo = [];
    mine.filter(r => r.nextAction && !["xuat_ban"].includes(r.status)).forEach(r => todo.push({ due: r.due, text: esc(r.nextAction), ref: `<a href="#/ho-so/${esc(r.id)}">${esc(r.id)}</a> ${esc(r.shortTitle || r.title)}`, kind: "Hồ sơ" }));
    sups.filter(x => x.requesterId === me.id && x.status === "cho_xac_nhan").forEach(x => todo.push({ first: true, note: "Bàn giao " + T.fmt(x.deliveredAt), text: "Xác nhận kết quả hỗ trợ và đánh giá", ref: `<a href="#/ho-tro/${esc(x.id)}">${esc(x.id)}</a> ${esc(App.typeLabel(x.type))}`, kind: "Chờ bạn xác nhận" }));
    sups.filter(x => x.supporterId === me.id && x.status === "cho_nhan").forEach(x => todo.push({ first: true, note: "Được giao " + T.fmt(x.assignedAt), text: "Nhận hoặc từ chối việc được giao", ref: `<a href="#/ho-tro/${esc(x.id)}">${esc(x.id)}</a> ${esc(App.typeLabel(x.type))}`, kind: "Người hỗ trợ" }));
    sups.filter(x => x.supporterId === me.id && x.status === "dang_xu_ly").forEach(x => todo.push({ due: x.due, text: "Hoàn thành và bàn giao", ref: `<a href="#/ho-tro/${esc(x.id)}">${esc(x.id)}</a> ${esc(App.typeLabel(x.type))}`, kind: "Người hỗ trợ" }));
    if (App.isCoord()) sups.filter(x => x.status === "cho_duyet").forEach(x => { const f = App.supportFacts(x);
      todo.push({ due: f.triageDue, text: "Duyệt và phân công người hỗ trợ", ref: `<a href="#/ho-tro/${esc(x.id)}">${esc(x.id)}</a> ${esc(App.typeLabel(x.type))}`, kind: "Điều phối" }); });
    if (App.isAdmin()) {
      const pu = App.users().filter(u => u.status === "pending").length, ps = App.all("supporters").filter(x => x.status === "cho_duyet").length;
      if (pu) todo.push({ due: "", text: `Duyệt ${pu} tài khoản mới`, ref: `<a href="#/quan-tri?tab=tai-khoan">Quản trị › Tài khoản</a>`, kind: "Quản trị" });
      if (ps) todo.push({ due: "", text: `Duyệt ${ps} đăng ký người hỗ trợ`, ref: `<a href="#/quan-tri?tab=nguoi-ho-tro">Quản trị › Người hỗ trợ</a>`, kind: "Quản trị" });
    }
    todo.sort((a, b) => Number(!!b.first) - Number(!!a.first) || (a.due || "9999").localeCompare(b.due || "9999"));
    const year = today.slice(0, 4);
    const cards = App.all("cards").filter(c => c.holderId === me.id && String(c.year) === year);
    const notices = [...App.all("notices")].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.publishedAt.localeCompare(a.publishedAt)).slice(0, 5);

    el.innerHTML = `
      <section class="card section"><div class="section-head"><h1>${App.icon("folder", 22)} Thống kê hồ sơ nghiên cứu của tôi</h1><a class="btn primary" href="#/ho-so?moi=1">+ Hồ sơ mới</a></div>
        <div class="home-grid">
          <div class="card inner"><div class="total"><span>Hồ sơ đang thực hiện</span><b>${s.total}</b><small>${mine.length - s.total} hồ sơ đã xuất bản hoặc tạm dừng</small></div>${dueCards(s, "#/ho-so")}</div>
          ${profileCard(me)}
        </div></section>
      <section class="card section"><div class="section-head"><h2>${App.icon("help", 20)} Việc cần làm <span class="muted">(${todo.length})</span></h2></div>
        ${todo.length ? `<div class="table-wrap"><table><thead><tr><th>Hạn / mốc</th><th>Việc</th><th>Liên quan</th><th>Loại</th></tr></thead><tbody>
          ${todo.map(t => `<tr><td>${t.due ? dueBadge(t.due, today) : t.note ? `<small>${esc(t.note)}</small>` : NA}</td><td>${t.text}</td><td>${t.ref}</td><td><small>${esc(t.kind)}</small></td></tr>`).join("")}</tbody></table></div>` : `<p class="empty">Không có việc đang chờ.</p>`}
      </section>
      <div class="grid g2">
        <section class="card section"><div class="section-head"><h2>${App.icon("card", 20)} Thẻ hỗ trợ năm ${year}</h2><a class="btn sm" href="#/the-ho-tro">Chi tiết</a></div>
          ${cards.length ? `<ul class="plain">${cards.map(c => { const u = App.cardUsage(c); return `<li><div><b>${esc(App.typeLabel(c.type))}</b> — còn <b>${u.left}</b>/${u.quota} lượt</div><div class="meter"><span style="width:${pct(u.used, u.quota)}%"></span></div></li>`; }).join("")}</ul>`
            : `<p class="empty">Chưa được cấp thẻ hỗ trợ năm ${year}.</p>`}
        </section>
        <section class="card section"><div class="section-head"><h2>${App.icon("file", 20)} Thông báo mới</h2><a class="btn sm" href="#/thong-bao">Tất cả</a></div>
          ${notices.length ? `<ul class="plain">${notices.map(n => `<li><div>${n.pinned ? tag("warn", "Ghim") + " " : ""}<a href="#/thong-bao">${esc(n.title)}</a></div><small class="muted">${esc((NK[n.kind] || ["", ""])[1])} · ${T.fmt(n.publishedAt)}</small></li>`).join("")}</ul>` : `<p class="empty">Chưa có thông báo.</p>`}
        </section>
      </div>`;
  };

  /* ================= Báo cáo ================= */
  App.views.reports = function (el, _m, q) {
    if (!App.seesAll() && !App.isAdmin()) { el.innerHTML = `<div class="card empty">Trang này dành cho lãnh đạo, điều phối viên và quản trị viên.</div>`; return; }
    const st = App.settings(), today = App.state.today, unit = q.khoa || "";
    const recs = App.all("records").filter(r => !unit || r.unit === unit);
    const sups = App.all("supports").filter(s => { const r = App.find("records", s.recordId); return !unit || (r && r.unit === unit); });
    const lecturers = App.activeUsers().filter(u => (u.roles || []).includes("giang_vien") && (!unit || u.unit === unit));
    const activeRecs = recs.filter(r => !["xuat_ban", "tam_dung"].includes(r.status));
    const involved = lecturers.filter(u => activeRecs.some(r => r.ownerId === u.id || (r.memberIds || []).includes(u.id))).length;
    // Chỉ tiêu 12: yêu cầu được điều phối phân công trong N ngày làm việc (mẫu số: các yêu cầu đã đến hạn phân công)
    const eligible = sups.map(s => [s, App.supportFacts(s)]).filter(([s, f]) => f.triageDue && f.triageDue <= today && !(s.status === "huy" && !s.assignedAt));
    const onTime = eligible.filter(([s, f]) => s.assignedAt && s.assignedAt.slice(0, 10) <= f.triageDue).length;
    const open = sups.filter(s => SUPPORT_OPEN.includes(s.status)), late = open.filter(s => { const f = App.supportFacts(s); return f.overdue || f.triageLate; });
    const ds = dueStats(recs);
    const max = Math.max(1, ...STATUSES.map(([k]) => recs.filter(r => r.status === k).length));
    const attention = recs.map(r => [r, App.flags(r)]).filter(([, f]) => f.length);
    const units = [...new Set([...st.units, ...recs.map(r => r.unit).filter(Boolean)])];
    const types = App.supportTypes();
    const cards = App.all("cards").filter(c => String(c.year) === today.slice(0, 4));
    const tile = (lab, val, sub, href) => `<div class="tile"><div class="t-label">${esc(lab)}</div><div class="t-value">${val}</div>${sub ? `<div class="t-sub">${sub}</div>` : ""}${href ? `<a class="t-link" href="${href}" aria-label="${esc(lab)}"></a>` : ""}</div>`;
    const target = (v, t) => v >= t ? tag("good", `đạt mục tiêu ≥ ${t}%`, "✓") : tag("warn", `mục tiêu ≥ ${t}%`);

    el.innerHTML = `
      <div class="page-head"><div><h1>Báo cáo</h1><p>Số liệu tự tổng hợp từ hồ sơ và yêu cầu hỗ trợ, cập nhật đến ${T.fmt(today)} — dùng cho giao ban tháng và báo cáo quý.</p></div>
        <div class="actions"><button class="btn" id="expR">Xuất hồ sơ (CSV)</button><button class="btn" id="expS">Xuất yêu cầu (CSV)</button><button class="btn" onclick="window.print()">In</button></div></div>
      <form class="filters" id="rf"><label>Khoa / đơn vị<select name="khoa"><option value="">Toàn trường</option>${units.map(u => `<option${u === unit ? " selected" : ""}>${esc(u)}</option>`).join("")}</select></label></form>
      <div class="grid g4">
        ${tile("Hồ sơ đang thực hiện", activeRecs.length, `${recs.filter(r => r.status === "xuat_ban").length} đã xuất bản · ${recs.filter(r => r.status === "tam_dung").length} tạm dừng`, "#/ho-so")}
        ${tile("Giảng viên có hồ sơ đang hoạt động", `${pct(involved, lecturers.length)}%`, `${involved}/${lecturers.length} giảng viên · ${target(pct(involved, lecturers.length), 50)} (chỉ tiêu 3)`)}
        ${tile(`Yêu cầu được phân công trong ${st.triageWorkdays} ngày làm việc`, eligible.length ? `${pct(onTime, eligible.length)}%` : "—", `${onTime}/${eligible.length} yêu cầu · ${eligible.length ? target(pct(onTime, eligible.length), 80) : ""} (chỉ tiêu 12)`)}
        ${tile("Yêu cầu hỗ trợ đang mở", open.length, late.length ? tag("crit", `${late.length} trễ`, "!") : "Không có yêu cầu trễ", "#/ho-tro")}
      </div>
      <div class="grid g2" style="margin-top:16px">
        <section class="card"><h2>Hồ sơ đang ở đâu</h2><p class="card-sub">Theo trạng thái (Kế hoạch, Phụ lục 3). Bấm một dòng để xem danh sách.</p>
          ${PHASES.map(([pk, pl]) => `<div class="block-label">${esc(pl)}</div><div class="hbars">${STATUSES.filter(s => s[2] === pk).map(([sk, sl, , cond]) => { const n = recs.filter(r => r.status === sk).length;
            return `<a class="hbar" href="#/ho-so?trang_thai=${sk}"><span class="lab">${esc(sl)}</span><div class="bar-track">${n ? `<span class="bar-seg" style="width:${n / max * 100}%;background:${phaseColor(pk)}" data-tip="<b>${esc(sl)}</b>: ${n} hồ sơ<br>${esc(cond)}"></span>` : ""}</div><span class="val">${n}</span></a>`; }).join("")}</div>`).join("")}
        </section>
        <div class="stack">
          <section class="card"><h2>Tình hình hạn</h2>${dueCards(ds, "#/ho-so")}</section>
          <section class="card"><h2>Cần chú ý <span class="muted">(${attention.length})</span></h2>
            ${attention.length ? `<ul class="plain">${attention.slice(0, 10).map(([r, f]) => `<li><div><a href="#/ho-so/${esc(r.id)}">${esc(r.id)}</a> ${esc(r.shortTitle || r.title)}</div><small class="muted">${esc(statusLabel(r.status))} · ${esc(App.userName(r.ownerId))}</small><div>${flagTags(f)}</div></li>`).join("")}</ul>` : `<p class="empty">Không có.</p>`}
          </section>
        </div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <section class="card"><h2>Nhu cầu hỗ trợ theo loại</h2>
          <div class="table-wrap"><table><thead><tr><th>Loại</th><th class="num">Đang mở</th><th class="num">Hoàn thành</th><th class="num">Thẻ đã dùng / cấp năm nay</th></tr></thead><tbody>
          ${types.map(t => { const tc = cards.filter(c => c.type === t.code); const quota = tc.reduce((a, c) => a + Number(c.quota || 0), 0), used = tc.reduce((a, c) => a + App.cardUsage(c).used, 0);
            return `<tr><td>${esc(t.label)}</td><td class="num">${open.filter(s => s.type === t.code).length || ""}</td><td class="num">${sups.filter(s => s.type === t.code && s.status === "hoan_thanh").length || ""}</td><td class="num">${t.needsCard ? `${used}/${quota}` : "—"}</td></tr>`; }).join("")}</tbody></table></div></section>
        <section class="card"><h2>Suất của người hỗ trợ</h2>
          <div class="table-wrap"><table><thead><tr><th>Người hỗ trợ</th><th class="num">Đang nhận / suất</th><th class="num">Hoàn thành</th></tr></thead><tbody>
          ${App.all("supporters").filter(x => x.status === "da_duyet" || x.status === "tam_ngung").map(x => { const l = App.supporterLoad(x);
            return `<tr><td>${esc(App.userName(x.userId))}<span class="sub">${esc((x.types || []).map(App.typeLabel).join(", "))}</span></td><td class="num">${l.load}/${l.capacity} ${l.free ? "" : tag("crit", "Hết suất")}</td><td class="num">${App.all("supports").filter(s => s.supporterId === x.userId && s.status === "hoan_thanh").length}</td></tr>`; }).join("")}</tbody></table></div></section>
      </div>
      <section class="card" style="margin-top:16px"><h2>Theo khoa</h2>
        <div class="table-wrap"><table><thead><tr><th>Khoa</th>${PHASES.map(([, l]) => `<th class="num">${esc(l)}</th>`).join("")}<th class="num">Quá hạn</th><th class="num">Hỗ trợ đang mở</th></tr></thead><tbody>
        ${units.map(u => { const rs = App.all("records").filter(r => r.unit === u); return `<tr><td>${esc(u)}</td>${PHASES.map(([pk]) => `<td class="num">${rs.filter(r => phaseOf(r.status) === pk).length || ""}</td>`).join("")}
          <td class="num">${dueStats(rs).qua_han || ""}</td><td class="num">${App.all("supports").filter(s => SUPPORT_OPEN.includes(s.status) && rs.some(r => r.id === s.recordId)).length || ""}</td></tr>`; }).join("")}</tbody></table></div>
      </section>`;
    el.querySelector("#rf").addEventListener("change", e => App.go("#/bao-cao" + (e.target.value ? "?khoa=" + encodeURIComponent(e.target.value) : "")));
    el.querySelector("#expR").onclick = () => download(`ho-so_${today}.csv`, toCsv([["Mã", "Tên", "Khoa", "Nhóm", "Chủ nhiệm", "Thành viên", "Trạng thái", "Từ ngày", "Tạp chí", "Q", "Việc tiếp theo", "Hạn", "Rủi ro", "DOI", "Cập nhật"],
      ...recs.map(r => [r.id, r.title, r.unit, r.group || "", App.userName(r.ownerId), (r.memberIds || []).map(App.userName).join("; "), statusLabel(r.status), r.statusSince || "", r.journal || "", (Q[r.quartile] || ["", ""])[1], r.nextAction || "", r.due || "", r.risk || "", r.doi || "", r.updatedAt || ""])]));
    el.querySelector("#expS").onclick = () => download(`yeu-cau-ho-tro_${today}.csv`, toCsv([["Mã", "Hồ sơ", "Loại", "Nội dung", "Người gửi", "Người hỗ trợ", "Trạng thái", "Ngày gửi", "Hạn phân công", "Ngày phân công", "Hạn hoàn thành", "Ngày bàn giao", "Ngày xác nhận"],
      ...sups.map(s => { const f = App.supportFacts(s); return [s.id, s.recordId, App.typeLabel(s.type), s.detail, App.userName(s.requesterId), App.userName(s.supporterId), (window.Domain.SS[s.status] || ["", ""])[1], s.createdAt, f.triageDue, (s.assignedAt || "").slice(0, 10), s.due || "", (s.deliveredAt || "").slice(0, 10), (s.confirmedAt || "").slice(0, 10)]; })]));
  };

  /* ================= Thông báo & văn bản ================= */
  App.views.notices = function (el, _m, q) {
    const kind = q.loai || "";
    const canPost = App.isCoord();
    const list = App.all("notices").filter(n => !kind || n.kind === kind).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.publishedAt.localeCompare(a.publishedAt));
    el.innerHTML = `
      <div class="page-head"><div><h1>Thông báo & văn bản</h1><p>Thông báo, văn bản, biểu mẫu và hướng dẫn sử dụng hệ thống.</p></div>
        ${canPost ? `<div class="actions"><button class="btn primary" id="add">+ Đăng mới</button></div>` : ""}</div>
      <div class="seg" role="group" aria-label="Loại" style="margin-bottom:16px"><button data-k="" aria-pressed="${!kind}">Tất cả</button>${NOTICE_KINDS.map(([k, l]) => `<button data-k="${k}" aria-pressed="${kind === k}">${esc(l)}</button>`).join("")}</div>
      ${list.length ? list.map(n => `<article class="card notice"><div class="notice-head"><div>${n.pinned ? tag("warn", "Ghim") + " " : ""}${tag("info", (NK[n.kind] || ["", "Thông báo"])[1])}
          <h2>${esc(n.title)}</h2><small class="muted">${T.fmt(n.publishedAt)} · ${esc(App.userName(n.by))}</small></div>
          ${canPost ? `<div><button class="btn sm" data-ed="${esc(n.id)}">Sửa</button> <button class="btn sm ghost" data-del="${esc(n.id)}">Xóa</button></div>` : ""}</div>
        <div class="notice-body">${esc(n.body).replace(/\n/g, "<br>")}</div>${n.url ? `<p>${link(n.url, "Mở tài liệu")}</p>` : ""}</article>`).join("") : `<div class="card empty">Chưa có.</div>`}`;
    el.querySelectorAll("[data-k]").forEach(b => b.onclick = () => App.go("#/thong-bao" + (b.dataset.k ? "?loai=" + b.dataset.k : "")));
    if (canPost) {
      el.querySelector("#add").onclick = () => forms.notice();
      el.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => forms.notice(b.dataset.ed));
      el.querySelectorAll("[data-del]").forEach(b => b.onclick = () => confirmBox("Xóa", "Xóa mục này?", async () => { await window.Store.remove("notices", b.dataset.del); done("Đã xóa."); }, "Xóa"));
    }
  };
  forms.notice = function (id) {
    const n = id ? App.find("notices", id) : null;
    const fields = [{ name: "title", label: "Tiêu đề", required: true, full: true }, { name: "kind", label: "Loại", type: "select", options: NOTICE_KINDS, required: true },
      { name: "pinned", label: "Ghim lên đầu", type: "checkbox" }, { name: "body", label: "Nội dung", type: "textarea", rows: 6, required: true },
      { name: "url", label: "Đường dẫn tài liệu (Drive, OneDrive, trang web)", type: "url", full: true }];
    modal({ title: n ? "Sửa thông báo" : "Đăng thông báo", wide: true, body: formHtml(fields, n || { kind: "thong_bao" }), onSubmit: async f => {
      const v = readForm(f, fields);
      const rec = Object.assign({ id: App.uid("tb-"), publishedAt: App.state.today, by: App.me().id, readers: [] }, n || {}, v);
      await window.Store.save("notices", rec);
      if (!n) await App.notify(App.activeUsers().map(u => u.id), "Thông báo mới: " + v.title, "#/thong-bao");
      done(n ? "Đã lưu." : "Đã đăng và gửi thông báo tới mọi người.");
    } });
  };
})();
