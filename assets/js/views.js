/* Bốn màn hình: Tổng quan, Hồ sơ (danh sách + chi tiết), Yêu cầu hỗ trợ, Cài đặt & dữ liệu. */
(function () {
  const App = window.App, CFG = window.APP_CONFIG;
  const { T, PHASES, STATUSES, SUPPORT_TYPES, SUPPORT_STATUS, QUARTILES, S, ST, SS, Q, statusLabel, phaseOf, DEFAULT_SETTINGS } = window.Domain;
  const { esc, NA, orNA, phaseColor, statusChip, dueBadge, flagTags, formHtml, readForm, modal, confirmBox, toast, parseCsv, toCsv, download } = window.UI;
  const forms = App.forms;
  const done = msg => { toast(msg); App.rerender(); };
  const sel = (name, opts, v, all = "Tất cả") => `<select name="${name}"><option value="">${all}</option>${opts.map(([k, l]) => `<option value="${esc(k)}"${String(k) === String(v) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const recLink = id => { const r = App.find("records", id); return r ? `<a href="#/ho-so/${encodeURIComponent(id)}">${esc(id)}</a> <span class="muted">${esc(r.shortTitle || r.title)}</span>` : esc(id); };
  const journalText = r => r.journal ? esc(r.journal) + (r.quartile ? ` <span class="muted">· ${esc(Q[r.quartile] ? Q[r.quartile][1] : r.quartile)}</span>` : "") : NA;

  /* ================= Tổng quan ================= */
  App.views.overview = function (el) {
    const data = App.data(), today = App.state.today, year = today.slice(0, 4);
    const recs = data.records;
    const active = recs.filter(r => r.status !== "xuat_ban");
    const atJournal = recs.filter(r => ["dang_phan_bien", "sua_bai", "bi_tu_choi"].includes(r.status));
    const results = recs.filter(r => ["chap_nhan", "xuat_ban"].includes(r.status) && (r.statusSince || "").startsWith(year));
    const sups = data.supports.map(s => [s, App.supportFacts(s)]);
    const openSup = sups.filter(([, f]) => f.open), lateSup = openSup.filter(([, f]) => f.overdue || f.triageLate);
    const attention = recs.map(r => [r, App.flags(r)]).filter(([, f]) => f.length)
      .sort((a, b) => b[1].filter(f => f.tone === "crit").length - a[1].filter(f => f.tone === "crit").length);
    const max = Math.max(1, ...STATUSES.map(([k]) => recs.filter(r => r.status === k).length));
    const byType = SUPPORT_TYPES.map(([k, l]) => [k, l, openSup.filter(([s]) => s.type === k).length]).filter(x => x[2]).sort((a, b) => b[2] - a[2]);
    const maxT = Math.max(1, ...byType.map(x => x[2]));
    const units = [...new Set([...App.settings().units, ...recs.map(r => r.unit).filter(Boolean)])];

    const tile = (lab, val, sub, href) => `<div class="tile"><div class="t-label">${esc(lab)}</div><div class="t-value">${val}</div>${sub ? `<div class="t-sub">${sub}</div>` : ""}${href ? `<a class="t-link" href="${href}" aria-label="${esc(lab)}"></a>` : ""}</div>`;
    el.innerHTML = `
      <div class="page-head"><div><h1>Tổng quan</h1><p>Hồ sơ đang ở đâu, đang vướng gì, cần hỗ trợ gì — cập nhật đến ${T.fmt(today)}. Dùng cho giao ban pipeline hằng tháng.</p></div>
        <div class="actions"><a class="btn" href="#/ho-so">Xem tất cả hồ sơ</a><button class="btn primary" id="add">+ Hồ sơ mới</button></div></div>
      <div class="grid g4">
        ${tile("Hồ sơ đang theo dõi", active.length, `${recs.length - active.length} hồ sơ đã xuất bản`, "#/ho-so")}
        ${tile("Đang ở tạp chí", atJournal.length, `${recs.filter(r => r.status === "bi_tu_choi").length} bị từ chối chờ nộp lại`, "#/ho-so?chang=tap_chi")}
        ${tile(`Chấp nhận / xuất bản năm ${year}`, results.length, `${results.filter(r => r.status === "xuat_ban").length} đã xuất bản`, "#/ho-so?chang=ket_qua")}
        ${tile("Yêu cầu hỗ trợ đang mở", openSup.length, lateSup.length ? `<span class="tag tag-crit">! ${lateSup.length} trễ hạn</span>` : "Không có yêu cầu trễ", "#/ho-tro")}
      </div>
      <div class="grid g2" style="margin-top:16px">
        <section class="card"><div class="card-head"><h2>Hồ sơ đang ở đâu</h2></div>
          <p class="card-sub">Số hồ sơ theo trạng thái (Phụ lục 3). Bấm vào một dòng để xem danh sách.</p>
          ${PHASES.map(([pk, pl]) => { const sts = STATUSES.filter(s => s[2] === pk);
            return `<div class="block-label">${esc(pl)}</div><div class="hbars">${sts.map(([sk, sl, , cond]) => { const n = recs.filter(r => r.status === sk).length;
              return `<a class="hbar" href="#/ho-so?trang_thai=${sk}"><span class="lab" title="${esc(cond)}">${esc(sl)}</span>
                <div class="bar-track">${n ? `<span class="bar-seg" style="width:${n / max * 100}%;background:${phaseColor(pk)}" data-tip="<b>${esc(sl)}</b>: ${n} hồ sơ<br>${esc(cond)}"></span>` : ""}</div><span class="val">${n}</span></a>`; }).join("")}</div>`; }).join("")}
        </section>
        <div class="stack">
          <section class="card"><div class="card-head"><h2>Cần chú ý <span class="muted">(${attention.length})</span></h2><a class="btn sm" href="#/ho-so?chu_y=1">Lọc danh sách</a></div>
            <p class="card-sub">Quá 30 ngày chưa cập nhật, quá hạn việc tiếp theo, sắp hết hạn sửa bài, bị từ chối chưa nộp lại, có rủi ro, hỗ trợ trễ.</p>
            ${attention.length ? `<ul class="plain">${attention.slice(0, 12).map(([r, f]) => `<li><div>${recLink(r.id)}</div><div class="muted" style="font-size:12px">${statusLabel(r.status)} · ${esc(r.owner || r.contact || "")}</div><div>${flagTags(f)}</div></li>`).join("")}</ul>` : `<p class="empty">Không có hồ sơ cần chú ý.</p>`}
          </section>
          <section class="card"><div class="card-head"><h2>Đang cần hỗ trợ gì</h2><a class="btn sm" href="#/ho-tro">Hàng đợi hỗ trợ</a></div>
            ${byType.length ? `<div class="hbars">${byType.map(([k, l, n]) => `<a class="hbar" href="#/ho-tro?loai=${k}"><span class="lab">${esc(l)}</span><div class="bar-track"><span class="bar-seg" style="width:${n / maxT * 100}%;background:var(--s1)" data-tip="${esc(l)}: ${n} yêu cầu đang mở"></span></div><span class="val">${n}</span></a>`).join("")}</div>` : `<p class="empty">Không có yêu cầu đang mở.</p>`}
          </section>
        </div>
      </div>
      <section class="card" style="margin-top:16px"><h2>Theo khoa</h2>
        <div class="table-wrap"><table><thead><tr><th>Khoa</th>${PHASES.map(([, l]) => `<th class="num">${esc(l)}</th>`).join("")}<th class="num">Cần chú ý</th><th class="num">Hỗ trợ đang mở</th></tr></thead><tbody>
          ${units.map(u => { const rs = recs.filter(r => r.unit === u); return `<tr><td><a href="#/ho-so?khoa=${encodeURIComponent(u)}">${esc(u)}</a></td>${PHASES.map(([pk]) => `<td class="num">${rs.filter(r => phaseOf(r.status) === pk).length || ""}</td>`).join("")}
            <td class="num">${rs.filter(r => App.flags(r).length).length || ""}</td><td class="num">${openSup.filter(([s]) => rs.some(r => r.id === s.recordId)).length || ""}</td></tr>`; }).join("") || `<tr><td colspan="8" class="empty">Chưa có dữ liệu</td></tr>`}</tbody></table></div>
      </section>`;
    el.querySelector("#add").onclick = () => forms.record();
  };

  /* ================= Danh sách hồ sơ ================= */
  App.views.records = function (el, _m, q) {
    const today = App.state.today;
    const f = { q: q.q || "", khoa: q.khoa || "", chang: q.chang || "", trang_thai: q.trang_thai || "", nguoi: q.nguoi || "", chu_y: q.chu_y || "" };
    const mode = App.pref.get("recordsMode", "list");
    const rows = App.data().records.filter(r => {
      if (f.khoa && r.unit !== f.khoa) return false;
      if (f.chang && phaseOf(r.status) !== f.chang) return false;
      if (f.trang_thai && r.status !== f.trang_thai) return false;
      if (f.nguoi && ![r.owner, r.contact].includes(f.nguoi)) return false;
      if (f.chu_y && !App.flags(r).length) return false;
      if (f.q && ![r.id, r.title, r.shortTitle, r.authors, r.group, r.journal, r.nextAction].join(" ").toLowerCase().includes(f.q.toLowerCase())) return false;
      return true;
    }).sort((a, b) => a.id.localeCompare(b.id, "vi", { numeric: true }));
    const openSup = id => App.data().supports.filter(s => s.recordId === id && App.supportFacts(s).open).length;
    const people = [...new Set([...App.distinct("owner"), ...App.distinct("contact")])].sort((a, b) => a.localeCompare(b, "vi"));

    const list = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Mã · hồ sơ</th><th>Khoa / nhóm</th><th>Tác giả liên hệ</th><th>Trạng thái</th><th>Tạp chí / Q</th><th>Việc tiếp theo · phụ trách</th><th>Hạn</th><th>Cập nhật</th><th>Cảnh báo</th></tr></thead><tbody>
      ${rows.map(r => { const fl = App.flags(r), ns = openSup(r.id); return `<tr><td><a class="row-link" href="#/ho-so/${encodeURIComponent(r.id)}">${esc(r.id)}</a><span class="sub">${esc(r.shortTitle || r.title)}</span></td>
        <td>${orNA(r.unit)}${r.group ? `<span class="sub">${esc(r.group)}</span>` : ""}</td><td>${orNA(r.contact)}</td>
        <td>${statusChip(r.status)}<span class="sub">${r.statusSince ? T.days(r.statusSince, today) + " ngày" : ""}</span></td><td>${journalText(r)}</td>
        <td>${orNA(r.nextAction)}<span class="sub">${esc(r.owner || "")}</span></td><td>${r.status === "xuat_ban" ? "" : dueBadge(r.due, today)}</td>
        <td><small>${T.fmt(r.updatedAt)}</small></td><td>${flagTags(fl)}${ns ? ` <span class="tag tag-info">${ns} YC hỗ trợ</span>` : ""}</td></tr>`; }).join("")}</tbody></table></div>`
      : `<div class="card empty">Không có hồ sơ phù hợp.</div>`;
    const board = `<div class="board">${PHASES.map(([pk, pl]) => { const items = rows.filter(r => phaseOf(r.status) === pk);
      return `<div class="col"><h3><span><i class="dot" style="background:${phaseColor(pk)}"></i> ${esc(pl)}</span><span class="muted">${items.length}</span></h3>${items.map(r => { const fl = App.flags(r);
        return `<a class="kcard${fl.some(x => x.tone === "crit") ? " alert" : ""}" href="#/ho-so/${encodeURIComponent(r.id)}"><div class="k-top"><span class="code">${esc(r.id)}</span><small>${esc(statusLabel(r.status))}</small></div>
          <div class="k-title">${esc(r.shortTitle || r.title)}</div><div>${r.nextAction ? "→ " + esc(r.nextAction) : '<span class="na">Chưa có việc tiếp theo</span>'}</div>
          <div class="k-meta"><span>${esc(r.owner || r.contact || "")}</span>${r.due && r.status !== "xuat_ban" ? `<span>Hạn ${T.fmt(r.due)}</span>` : ""}</div>${fl.length ? `<div style="margin-top:6px">${flagTags(fl)}</div>` : ""}</a>`; }).join("") || '<p class="muted" style="font-size:12px">Trống</p>'}</div>`; }).join("")}</div>`;

    el.innerHTML = `
      <div class="page-head"><div><h1>Hồ sơ nghiên cứu</h1><p>Mỗi bản thảo/nghiên cứu một mã, theo dõi xuyên suốt từ ý tưởng đến xuất bản (bảng pipeline Phụ lục 3).</p></div>
        <div class="actions"><button class="btn" id="exp">Xuất CSV</button><button class="btn primary" id="add">+ Hồ sơ mới</button></div></div>
      <div class="seg" role="group" aria-label="Kiểu xem" style="margin-bottom:12px"><button data-mode="list" aria-pressed="${mode === "list"}">Danh sách</button><button data-mode="board" aria-pressed="${mode === "board"}">Theo chặng</button></div>
      <form class="filters" id="rf">
        <label class="grow">Tìm<input name="q" value="${esc(f.q)}" placeholder="Mã, tên, tác giả, tạp chí…"></label>
        <label>Khoa${sel("khoa", App.settings().units.map(u => [u, u]), f.khoa)}</label>
        <label>Chặng${sel("chang", PHASES.map(p => [p[0], p[1]]), f.chang)}</label>
        <label>Trạng thái${sel("trang_thai", STATUSES.map(s => [s[0], s[1]]), f.trang_thai)}</label>
        <label>Người phụ trách / liên hệ${sel("nguoi", people.map(p => [p, p]), f.nguoi)}</label>
        <label class="check" style="flex:0 0 auto;align-self:center;flex-direction:row"><input type="checkbox" name="chu_y"${f.chu_y ? " checked" : ""}> Chỉ hồ sơ cần chú ý</label>
      </form>
      <p class="muted" style="margin:-6px 0 10px">${rows.length} hồ sơ</p>
      ${mode === "board" ? board : list}`;
    const rf = el.querySelector("#rf");
    const apply = () => {
      const p = new URLSearchParams();
      ["q", "khoa", "chang", "trang_thai", "nguoi"].forEach(k => { if (rf.elements[k].value) p.set(k, rf.elements[k].value); });
      if (rf.elements.chu_y.checked) p.set("chu_y", "1");
      App.go("#/ho-so" + (p.toString() ? "?" + p : ""));
    };
    rf.addEventListener("change", apply);
    rf.elements.q.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); apply(); } });
    el.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { App.pref.set("recordsMode", b.dataset.mode); App.rerender(); });
    el.querySelector("#add").onclick = () => forms.record();
    el.querySelector("#exp").onclick = () => download(`ho-so_${today}.csv`, toCsv([CSV_COLS.map(c => c[1]),
      ...rows.map(r => CSV_COLS.map(([k]) => k === "status" ? statusLabel(r.status) : (k === "quartile" ? (Q[r.quartile] || ["", ""])[1] : r[k] || "")))]));
  };

  /* ================= Chi tiết hồ sơ ================= */
  App.views.record = function (el, m) {
    const r = App.find("records", decodeURIComponent(m[1])), today = App.state.today;
    if (!r) { el.innerHTML = `<div class="card empty">Không tìm thấy hồ sơ. <a href="#/ho-so">Về danh sách</a></div>`; return; }
    const fl = App.flags(r);
    const sups = App.data().supports.filter(s => s.recordId === r.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const curPhase = phaseOf(r.status), mainPhases = PHASES.filter(p => p[0] !== "tam_dung");
    const curIdx = mainPhases.findIndex(p => p[0] === curPhase);
    const d = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`;
    el.innerHTML = `
      <div class="detail-head"><div><div class="muted"><a href="#/ho-so">← Hồ sơ nghiên cứu</a></div>
        <h1><span class="code" style="font-size:16px">${esc(r.id)}</span> ${esc(r.title)}</h1>
        <div class="meta">${statusChip(r.status)} <span>${r.statusSince ? `từ ${T.fmt(r.statusSince)} (${T.days(r.statusSince, today)} ngày)` : ""}</span><span>${esc(r.unit || "")}${r.group ? " · " + esc(r.group) : ""}</span></div>
        ${fl.length ? `<div style="margin-top:8px">${flagTags(fl)}</div>` : ""}</div>
        <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start">
          <button class="btn primary" id="upd">Cập nhật tiến độ</button><button class="btn" id="req">+ Yêu cầu hỗ trợ</button><button class="btn" id="edit">Sửa thông tin</button></div></div>
      <ol class="stepper">${mainPhases.map(([pk, pl], i) => `<li class="${curPhase === "tam_dung" ? "" : i < curIdx ? "done" : i === curIdx ? "cur" : ""}"${i === curIdx ? ' aria-current="step"' : ""}>${esc(pl)}${i === curIdx ? `<br><b>${esc(statusLabel(r.status))}</b>` : ""}</li>`).join("")}
        ${curPhase === "tam_dung" ? `<li class="cur" aria-current="step">Tạm dừng</li>` : ""}</ol>
      <div class="next-box"><div><div class="k">Việc tiếp theo</div><div class="v">${orNA(r.nextAction)}</div></div>
        <div><div class="k">Người phụ trách</div><div class="v">${orNA(r.owner)}</div></div>
        <div><div class="k">${r.status === "tam_dung" ? "Mốc xem xét lại" : "Hạn"}</div><div class="v">${r.status === "xuat_ban" ? "—" : dueBadge(r.due, today)}</div></div></div>
      <div class="grid g2">
        <section class="card"><h2>Thông tin hồ sơ</h2><dl class="dl">
          ${d("Tên rút gọn", orNA(r.shortTitle))}${d("Tác giả", orNA(r.authors))}${d("Tác giả liên hệ", orNA(r.contact))}${d("Người phụ trách / điều phối", orNA(r.owner))}
          ${d("Tạp chí mục tiêu / Q", journalText(r))}${d("DOI / link xuất bản", r.doi ? (/^https?:/.test(r.doi) ? `<a href="${esc(r.doi)}" target="_blank" rel="noopener">${esc(r.doi)}</a>` : esc(r.doi)) : NA)}
          ${d("Rủi ro", r.risk ? `<span class="tag tag-crit">! ${esc(r.risk)}</span>` : NA)}${d("Thư mục tài liệu", r.docsUrl ? `<a href="${esc(r.docsUrl)}" target="_blank" rel="noopener">Mở ↗</a>` : NA)}
          ${d("Ghi chú", orNA(r.note))}${d("Tạo / cập nhật", `${T.fmt(r.createdAt)} / ${T.fmt(r.updatedAt)}`)}</dl></section>
        <section class="card"><div class="card-head"><h2>Yêu cầu hỗ trợ <span class="muted">(${sups.length})</span></h2></div>
          ${sups.length ? `<ul class="plain">${sups.map(s => { const f = App.supportFacts(s); return `<li><div><span class="code">${esc(s.id)}</span> <b>${esc((ST[s.type] || [, ""])[1])}</b> ${supTag(s, f)}</div>
            <div>${esc(s.detail)}</div><div class="muted" style="font-size:12px">Gửi ${T.fmt(s.createdAt)}${s.assignee ? " · người hỗ trợ: " + esc(s.assignee) : ""}${s.result ? " · kết quả: " + esc(s.result) : ""}</div></li>`; }).join("")}</ul>` : `<p class="empty">Chưa có yêu cầu.</p>`}
        </section>
      </div>
      <section class="card" style="margin-top:16px"><h2>Lịch sử cập nhật</h2>
        ${(r.history || []).length ? `<ul class="timeline">${[...r.history].reverse().map(h => `<li><div class="when">${esc(T.fmtTime(h.at))}${h.by ? " · " + esc(h.by) : ""}</div>${h.text ? `<div>${esc(h.text)}</div>` : ""}${h.note ? `<div class="muted">${esc(h.note)}</div>` : ""}</li>`).join("")}</ul>` : `<p class="empty">Chưa có.</p>`}
      </section>`;
    el.querySelector("#upd").onclick = () => forms.progress(r.id);
    el.querySelector("#edit").onclick = () => forms.record(r.id);
    el.querySelector("#req").onclick = () => forms.support(null, r.id);
  };

  /* ================= Yêu cầu hỗ trợ ================= */
  function supTag(s, f) {
    if (s.status === "xong") return `<span class="tag tag-good">✓ Đã xong ${T.fmt(s.doneAt)}</span>`;
    if (s.status === "huy") return `<span class="tag tag-muted">✕ Hủy</span>`;
    if (f.triageLate) return `<span class="tag tag-crit">! Quá ${App.settings().triageWorkdays} ngày làm việc chưa có người nhận</span>`;
    if (f.overdue) return `<span class="tag tag-crit">! Quá hạn ${T.days(s.due, App.state.today)} ngày</span>`;
    return `<span class="tag tag-info">${esc(SS[s.status][1])}${s.due ? " · hạn " + T.fmt(s.due) : ""}</span>`;
  }

  App.views.supports = function (el, _m, q) {
    const today = App.state.today;
    const f = { loai: q.loai || "", khoa: q.khoa || "", tre: q.tre || "" };
    const list = App.data().supports.map(s => [s, App.supportFacts(s), App.find("records", s.recordId) || {}])
      .filter(([s, fx, r]) => (!f.loai || s.type === f.loai) && (!f.khoa || r.unit === f.khoa) && (!f.tre || fx.overdue || fx.triageLate));
    const cols = [["moi", "Mới gửi — chờ người nhận"], ["dang_xu_ly", "Đang xử lý"], ["xong", "Đã xong (30 ngày gần nhất)"]];
    const card = ([s, fx, r]) => `<div class="kcard${fx.overdue || fx.triageLate ? " alert" : ""}"><div class="k-top"><span class="code">${esc(s.id)}</span><small>${esc((ST[s.type] || [, ""])[1])}</small></div>
      <div class="k-title">${esc(s.detail)}</div><div style="font-size:12px">${recLink(s.recordId)}</div>
      <div class="k-meta"><span>Người gửi: ${esc(s.requester || "—")}</span>${s.assignee ? `<span>Người hỗ trợ: ${esc(s.assignee)}</span>` : ""}${fx.open ? `<span>${fx.age} ngày</span>` : ""}</div>
      <div style="margin:6px 0">${supTag(s, fx)}</div>${s.result ? `<div class="muted" style="font-size:12px">Kết quả: ${esc(s.result)}</div>` : ""}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${s.status === "moi" ? `<button class="btn sm primary" data-act="nhan" data-id="${esc(s.id)}">Nhận xử lý</button>` : ""}
        ${s.status === "dang_xu_ly" ? `<button class="btn sm primary" data-act="xong" data-id="${esc(s.id)}">Hoàn thành</button>` : ""}
        ${fx.open ? `<button class="btn sm" data-act="sua" data-id="${esc(s.id)}">Sửa</button><button class="btn sm ghost" data-act="huy" data-id="${esc(s.id)}">Hủy</button>` : `<button class="btn sm ghost" data-act="mo" data-id="${esc(s.id)}">Mở lại</button>`}</div></div>`;
    el.innerHTML = `
      <div class="page-head"><div><h1>Yêu cầu hỗ trợ</h1><p>Đầu mối một cửa (mục 5.3): tiếp nhận và phân công trong ${App.settings().triageWorkdays} ngày làm việc; người hỗ trợ đặt hạn và báo kết quả.</p></div>
        <div class="actions"><button class="btn primary" id="add">+ Yêu cầu hỗ trợ</button></div></div>
      <form class="filters" id="sf"><label>Loại hỗ trợ${sel("loai", SUPPORT_TYPES, f.loai)}</label><label>Khoa${sel("khoa", App.settings().units.map(u => [u, u]), f.khoa)}</label>
        <label class="check" style="flex:0 0 auto;align-self:center;flex-direction:row"><input type="checkbox" name="tre"${f.tre ? " checked" : ""}> Chỉ yêu cầu trễ</label></form>
      <div class="board" style="grid-auto-columns:minmax(260px,1fr)">${cols.map(([k, l]) => {
        let items = list.filter(([s]) => s.status === k);
        if (k === "xong") items = items.filter(([s]) => s.doneAt && T.days(s.doneAt, today) <= 30);
        items.sort((a, b) => Number(b[1].overdue || b[1].triageLate) - Number(a[1].overdue || a[1].triageLate) || (a[0].due || a[1].triageDue || "").localeCompare(b[0].due || b[1].triageDue || ""));
        return `<div class="col"><h3><span>${esc(l)}</span><span class="muted">${items.length}</span></h3>${items.map(card).join("") || '<p class="muted" style="font-size:12px">Trống</p>'}</div>`; }).join("")}</div>`;
    const sf = el.querySelector("#sf");
    sf.addEventListener("change", () => { const p = new URLSearchParams(); if (sf.elements.loai.value) p.set("loai", sf.elements.loai.value); if (sf.elements.khoa.value) p.set("khoa", sf.elements.khoa.value); if (sf.elements.tre.checked) p.set("tre", "1"); App.go("#/ho-tro" + (p.toString() ? "?" + p : "")); });
    el.querySelector("#add").onclick = () => forms.support();
    el.querySelectorAll("[data-act]").forEach(b => b.onclick = () => forms.supportAction(b.dataset.id, b.dataset.act));
  };

  /* ================= Cài đặt & dữ liệu ================= */
  const CSV_COLS = [["id", "Mã"], ["title", "Tên hồ sơ"], ["shortTitle", "Tên rút gọn"], ["unit", "Khoa"], ["group", "Nhóm"], ["authors", "Tác giả"], ["contact", "Tác giả liên hệ"],
    ["owner", "Người phụ trách"], ["status", "Trạng thái"], ["journal", "Tạp chí"], ["quartile", "Q"], ["nextAction", "Việc tiếp theo"], ["due", "Hạn"], ["risk", "Rủi ro"], ["doi", "DOI"], ["note", "Ghi chú"]];
  const normDate = v => { if (!v) return ""; let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null; };

  App.views.settings = function (el) {
    const data = App.data(), st = App.settings(), isStatic = window.Store.mode === "static", dirty = window.Store.isDirty();
    el.innerHTML = `
      <div class="page-head"><div><h1>Cài đặt & dữ liệu</h1></div></div>
      <div class="grid g2">
        <section class="card"><h2>Danh sách khoa và ngưỡng nhắc việc</h2>
          <form id="cfg" class="form-grid" style="margin-top:12px">
            <div class="field full"><label for="units">Khoa / đơn vị (mỗi dòng một tên)</label><textarea id="units" name="units" rows="5">${esc(st.units.join("\n"))}</textarea></div>
            <div class="field"><label for="staleDays">Nhắc khi hồ sơ không cập nhật quá (ngày)</label><input id="staleDays" name="staleDays" type="number" min="1" value="${st.staleDays}"></div>
            <div class="field"><label for="triageWorkdays">Hạn nhận yêu cầu hỗ trợ (ngày làm việc)</label><input id="triageWorkdays" name="triageWorkdays" type="number" min="1" value="${st.triageWorkdays}"></div>
            <div class="field"><label for="resubmitDays">Hạn nộp lại sau từ chối (ngày)</label><input id="resubmitDays" name="resubmitDays" type="number" min="1" value="${st.resubmitDays}"></div>
            <div class="field"><label for="soonDays">Báo “sắp đến hạn” trước (ngày)</label><input id="soonDays" name="soonDays" type="number" min="0" value="${st.soonDays}"></div>
            <div class="field full"><label for="holidays">Ngày nghỉ lễ (mỗi dòng một ngày, DD/MM/YYYY)</label><textarea id="holidays" name="holidays" rows="3">${esc(st.holidays.map(T.fmt).join("\n"))}</textarea></div>
            <div><button class="btn primary">Lưu cài đặt</button></div></form></section>
        <div class="stack">
          ${isStatic ? `<section class="card"><h2>Xuất bản dữ liệu</h2>
            <p>${dirty ? '<span class="tag tag-warn">● Có thay đổi chưa xuất bản</span> Thay đổi đang lưu trên trình duyệt này.' : '<span class="tag tag-good">✓ Không có thay đổi chưa xuất bản</span>'}</p>
            <ol style="padding-left:18px;margin:8px 0"><li>Bấm <b>Tải data.json</b>.</li><li>Mở trang tải lên GitHub, kéo tệp vào thư mục <code>data/</code> và bấm <i>Commit changes</i>.</li><li>1–2 phút sau mọi người thấy dữ liệu mới.</li></ol>
            <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="pub">Tải data.json</button><a class="btn" href="${esc(CFG.REPO_URL)}/upload/${esc(CFG.REPO_BRANCH)}/data" target="_blank" rel="noopener">Mở trang tải lên GitHub ↗</a>
              <button class="btn ghost" id="discard"${dirty ? "" : " disabled"}>Hủy thay đổi</button></div>
            <p class="muted" style="font-size:12px">Chế độ này chỉ hợp để chạy thử: ai có đường dẫn đều tải được data.json. Dữ liệu thật nên dùng Supabase (xem README).</p></section>` : ""}
          <section class="card"><h2>Nhập hồ sơ từ Excel (CSV)</h2>
            <p class="card-sub">Tải tệp mẫu → điền bằng Excel → Lưu thành “CSV UTF-8” → Kiểm tra. Có dòng lỗi thì không ghi dòng nào.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="tpl">Tải tệp mẫu</button><input type="file" id="csv" accept=".csv,text/csv" style="max-width:260px">
              <label class="check"><input type="checkbox" id="upd"> Cho phép cập nhật hồ sơ trùng mã</label><button class="btn primary" id="chk">Kiểm tra</button></div>
            <div id="imres"></div></section>
          <section class="card"><h2>Sao lưu</h2><div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn" id="bk">Tải bản sao lưu (JSON)</button><label class="btn">Khôi phục từ JSON<input type="file" id="restore" accept=".json,application/json" hidden></label>
            ${data.meta && data.meta.sample ? `<button class="btn danger" id="clear">Xóa dữ liệu minh họa</button>` : ""}</div></section>
          <section class="card"><h2>Tài khoản</h2>
            <form id="pwf" style="display:grid;gap:10px;max-width:380px">${isStatic ? `<div class="field"><label for="op">Mật khẩu hiện tại</label><input id="op" type="password" autocomplete="current-password" required></div>` : ""}
              <div class="field"><label for="np">Mật khẩu mới (ít nhất 8 ký tự)</label><input id="np" type="password" autocomplete="new-password" required></div>
              <div class="field"><label for="np2">Nhập lại</label><input id="np2" type="password" autocomplete="new-password" required></div>
              <div><button class="btn primary">Đổi mật khẩu</button></div></form><div id="pwres"></div></section>
        </div>
      </div>`;

    el.querySelector("#cfg").addEventListener("submit", async e => {
      e.preventDefault();
      const fm = e.target, num = (k) => { const v = Number(fm.elements[k].value); return v >= 0 && fm.elements[k].value !== "" ? v : DEFAULT_SETTINGS[k]; };
      const hol = fm.elements.holidays.value.split(/[\s,;]+/).map(normDate).filter(Boolean).sort();
      await window.Store.saveSettings(Object.assign({}, data.settings, { units: fm.elements.units.value.split("\n").map(s => s.trim()).filter(Boolean),
        staleDays: num("staleDays"), triageWorkdays: num("triageWorkdays"), resubmitDays: num("resubmitDays"), soonDays: num("soonDays"), holidays: hol }));
      done("Đã lưu cài đặt.");
    });
    if (isStatic) {
      el.querySelector("#pub").onclick = () => { download("data.json", JSON.stringify(window.Store.exportForPublish(), null, 1), "application/json"); toast("Đã tải data.json — hãy đưa lên GitHub."); };
      el.querySelector("#discard").onclick = () => confirmBox("Hủy thay đổi", "Mọi thay đổi chưa xuất bản trên trình duyệt này sẽ mất.", async () => { window.Store.discardDraft(); done("Đã tải lại dữ liệu đã xuất bản."); }, "Hủy thay đổi");
    }
    el.querySelector("#bk").onclick = () => download(`sao-luu_${App.state.today}.json`, JSON.stringify(data, null, 1), "application/json");
    el.querySelector("#restore").onchange = e => { const file = e.target.files[0]; if (!file) return;
      file.text().then(txt => { let obj; try { obj = JSON.parse(txt); } catch (ex) { toast("Tệp JSON không hợp lệ.", "crit"); return; }
        if (!obj || !Array.isArray(obj.records)) { toast("Tệp không đúng cấu trúc sao lưu.", "crit"); return; }
        confirmBox("Khôi phục dữ liệu", `Thay toàn bộ dữ liệu hiện tại bằng “${file.name}”?`, async () => { await window.Store.replaceAll(obj); done("Đã khôi phục."); }, "Khôi phục"); }); };
    const clr = el.querySelector("#clear");
    if (clr) clr.onclick = () => confirmBox("Xóa dữ liệu minh họa", "Xóa toàn bộ hồ sơ và yêu cầu minh họa? Danh sách khoa và ngưỡng được giữ lại.", async () => {
      await window.Store.replaceAll({ meta: { version: 2, sample: false }, settings: data.settings }); done("Đã xóa. Bắt đầu nhập hồ sơ thật."); }, "Xóa");

    el.querySelector("#tpl").onclick = () => download("mau_ho_so.csv", toCsv([CSV_COLS.map(c => c[1]),
      ["HS-101", "Tên đầy đủ của nghiên cứu / bản thảo", "Tên ngắn", st.units[0] || "Khoa …", "Nhóm …", "Nguyễn A; Trần B", "TS. Nguyễn A", "ThS. Lê C", "Viết bài", "Tên tạp chí", "Q2", "Hoàn thiện phần kết quả", "30/11/2026", "", "", ""]]));
    el.querySelector("#chk").onclick = async () => {
      const file = el.querySelector("#csv").files[0], out = el.querySelector("#imres");
      if (!file) { toast("Chọn tệp CSV trước.", "crit"); return; }
      const rows = parseCsv(await file.text());
      const head = (rows[0] || []).map(h => h.trim());
      const idx = CSV_COLS.map(([k, l]) => head.findIndex(h => h === l || h === k));
      const need = ["id", "title", "unit", "status"].filter(k => idx[CSV_COLS.findIndex(c => c[0] === k)] < 0);
      if (rows.length < 2 || need.length) { out.innerHTML = `<p class="form-error" style="margin:12px 0 0">${rows.length < 2 ? "Tệp không có dòng dữ liệu." : "Thiếu cột: " + need.map(k => CSV_COLS.find(c => c[0] === k)[1]).join(", ") + ". Hãy dùng tệp mẫu."}</p>`; return; }
      const allowUpd = el.querySelector("#upd").checked, seen = new Set();
      const results = rows.slice(1).map((cells, i) => {
        const rec = {}, errs = [];
        CSV_COLS.forEach(([k], j) => { rec[k] = idx[j] >= 0 ? (cells[idx[j]] || "").trim() : ""; });
        if (!rec.id) errs.push("thiếu mã"); if (!rec.title) errs.push("thiếu tên");
        const stHit = STATUSES.find(s => s[0] === rec.status || s[1].toLowerCase() === rec.status.toLowerCase());
        if (!stHit) errs.push(`trạng thái “${rec.status}” không hợp lệ`); else rec.status = stHit[0];
        if (rec.unit && !st.units.includes(rec.unit)) errs.push(`khoa “${rec.unit}” chưa có trong danh sách khoa`);
        if (!rec.unit) errs.push("thiếu khoa");
        if (rec.due) { const dd = normDate(rec.due); if (dd === null) errs.push("hạn sai định dạng ngày"); else rec.due = dd; }
        if (rec.quartile) { const qh = QUARTILES.find(x => x[0] === rec.quartile || x[1].toLowerCase() === rec.quartile.toLowerCase()); if (qh) rec.quartile = qh[0]; else errs.push(`Q “${rec.quartile}” không hợp lệ`); }
        if (rec.id && seen.has(rec.id)) errs.push("mã trùng trong tệp");
        seen.add(rec.id);
        const exists = !!App.find("records", rec.id);
        if (exists && !allowUpd) errs.push("mã đã có trong hệ thống");
        return { line: i + 2, rec, errs, exists };
      });
      const bad = results.filter(x => x.errs.length);
      out.innerHTML = `<p style="margin-top:12px"><b>${results.length}</b> dòng · <span class="tag tag-good">✓ ${results.length - bad.length} hợp lệ</span> ${bad.length ? `<span class="tag tag-crit">! ${bad.length} lỗi</span>` : ""}</p>
        <div class="table-wrap"><table><thead><tr><th class="num">Dòng</th><th>Mã</th><th>Kết quả</th></tr></thead><tbody>${results.map(x => `<tr><td class="num">${x.line}</td><td class="code">${esc(x.rec.id)}</td>
          <td>${x.errs.length ? `<span class="tag tag-crit">Lỗi</span> ${esc(x.errs.join("; "))}` : `<span class="tag tag-good">✓ ${x.exists ? "Cập nhật" : "Thêm mới"}</span>`}</td></tr>`).join("")}</tbody></table></div>
        <div style="margin-top:10px"><button class="btn primary" id="commit"${bad.length ? " disabled" : ""}>Ghi ${results.length} hồ sơ</button> ${bad.length ? '<small class="muted">Sửa các dòng lỗi trong Excel rồi kiểm tra lại.</small>' : ""}</div>`;
      if (!bad.length) out.querySelector("#commit").onclick = async () => {
        for (const x of results) {
          const prev = App.find("records", x.rec.id);
          await App.saveRecord(Object.assign({ createdAt: App.state.today }, prev || {}, x.rec), `Nhập từ tệp ${file.name}, dòng ${x.line}`);
        }
        done(`Đã nhập ${results.length} hồ sơ.`);
      };
    };
    el.querySelector("#pwf").addEventListener("submit", async e => {
      e.preventDefault();
      const res = el.querySelector("#pwres"), np = el.querySelector("#np").value;
      try {
        if (np.length < 8) throw new Error("Mật khẩu mới cần ít nhất 8 ký tự.");
        if (np !== el.querySelector("#np2").value) throw new Error("Hai lần nhập không khớp.");
        const h = await window.Store.changePassword(el.querySelector("#op") ? el.querySelector("#op").value : "", np);
        res.innerHTML = h ? `<div class="banner" style="margin-top:12px"><b>Đã đổi trên trình duyệt này.</b> Để áp dụng cho mọi máy, thay <code>passwordSha256</code> trong <code>assets/js/config.js</code> bằng:<br><code style="word-break:break-all">${esc(h)}</code></div>`
          : `<p class="tag tag-good" style="margin-top:12px">✓ Đã đổi mật khẩu.</p>`;
        e.target.reset();
      } catch (ex) { res.innerHTML = `<p class="form-error" style="margin:12px 0 0">${esc(ex.message)}</p>`; }
    });
  };

  /* ================= Biểu mẫu ================= */
  const statusOpts = () => STATUSES.map(s => [s[0], `${s[1]}`]);
  const unitOpts = () => App.settings().units.map(u => [u, u]);
  const peopleList = () => [...new Set([...App.distinct("owner"), ...App.distinct("contact"), ...App.data().supports.map(s => s.assignee).filter(Boolean)])];

  forms.record = function (id) {
    const r = id ? App.find("records", id) : null;
    const fields = [
      { name: "id", label: "Mã hồ sơ", required: true, readonly: !!r },
      { name: "unit", label: "Khoa", type: "select", options: unitOpts(), required: true },
      { name: "title", label: "Tên nghiên cứu / bản thảo", required: true, full: true },
      { name: "shortTitle", label: "Tên rút gọn" }, { name: "group", label: "Nhóm nghiên cứu", list: App.distinct("group") },
      { name: "authors", label: "Tác giả", full: true, placeholder: "Phân tách bằng dấu ;" },
      { name: "contact", label: "Tác giả liên hệ", required: true, list: peopleList() }, { name: "owner", label: "Người phụ trách / điều phối", list: peopleList() },
      ...(r ? [] : [{ name: "status", label: "Trạng thái hiện tại", type: "select", options: statusOpts(), required: true, help: "Hồ sơ có sẵn được nhận ở đúng trạng thái thực tế" }]),
      { name: "journal", label: "Tạp chí mục tiêu", list: App.distinct("journal") }, { name: "quartile", label: "Phân hạng", type: "select", options: QUARTILES },
      { name: "nextAction", label: "Việc tiếp theo", full: true }, { name: "due", label: "Hạn", type: "date" },
      { name: "docsUrl", label: "Thư mục tài liệu (link Drive/OneDrive)", type: "url" },
      { name: "note", label: "Ghi chú", type: "textarea", rows: 2 }
    ];
    modal({ title: r ? "Sửa hồ sơ " + r.id : "Hồ sơ mới", wide: true, body: formHtml(fields, r || { id: App.nextId("records", "HS-"), status: "y_tuong" }), onSubmit: async f => {
      const v = readForm(f, fields);
      if (!r && App.find("records", v.id)) throw new Error(`Mã ${v.id} đã tồn tại.`);
      const next = await App.saveRecord(Object.assign({ createdAt: App.state.today, risk: "", doi: "" }, r || {}, v), r ? "Sửa thông tin hồ sơ" : "");
      toast(r ? "Đã lưu." : "Đã tạo hồ sơ " + next.id);
      App.go("#/ho-so/" + encodeURIComponent(next.id));
    } });
  };

  forms.progress = function (id) {
    const r = App.find("records", id);
    const fields = [
      { name: "status", label: "Trạng thái", type: "select", options: statusOpts(), required: true },
      { html: '<div class="rule-box" id="cond"></div>' },
      { name: "nextAction", label: "Việc tiếp theo", full: true }, { name: "owner", label: "Người phụ trách", list: peopleList() },
      { name: "due", label: "Hạn / mốc xem xét lại", type: "date" },
      { name: "journal", label: "Tạp chí", list: App.distinct("journal") }, { name: "quartile", label: "Phân hạng", type: "select", options: QUARTILES },
      { name: "doi", label: "DOI / link xuất bản", help: "Bắt buộc khi chuyển sang Xuất bản" },
      { name: "risk", label: "Rủi ro (để trống nếu không có)", placeholder: "VD: đạo đức, dữ liệu, tranh chấp tác giả, tạp chí nghi săn mồi" },
      { name: "note", label: "Ghi chú cập nhật / lý do", type: "textarea", rows: 2 }
    ];
    const form = modal({ title: `Cập nhật tiến độ — ${r.id}`, wide: true, body: formHtml(fields, Object.assign({}, r, { note: "" })), submitLabel: "Lưu cập nhật", onSubmit: async f => {
      const v = readForm(f, fields);
      if (v.status === "tam_dung" && (!v.note || !v.due)) throw new Error("Tạm dừng cần ghi lý do và mốc xem xét lại.");
      if (v.status === "xuat_ban" && !v.doi) throw new Error("Xuất bản cần DOI hoặc link xuất bản chính thức.");
      if (v.status === "bi_tu_choi" && !v.nextAction) throw new Error("Bị từ chối: ghi kế hoạch nộp lại vào “Việc tiếp theo” (họp nhóm, chọn tạp chí dự phòng).");
      const note = v.note; delete v.note;
      await App.saveRecord(Object.assign({}, r, v), note);
      done("Đã cập nhật " + r.id);
    } });
    const cond = form.querySelector("#cond"), stEl = form.elements.status;
    const upd = () => {
      const s = S[stEl.value];
      cond.innerHTML = s ? `<b>${esc(s[1])}:</b> ${esc(s[3])}` : "";
      if (stEl.value === "bi_tu_choi" && !form.elements.nextAction.value) {
        form.elements.nextAction.value = "Họp nhóm tác giả, chọn tạp chí dự phòng và nộp lại";
        form.elements.due.value = T.addWorkdays(App.state.today, App.settings().triageWorkdays, App.settings().holidays);
      }
    };
    stEl.addEventListener("change", upd); upd();
  };

  forms.support = function (sid, recordId) {
    const s = sid ? App.find("supports", sid) : null;
    const fields = [
      { name: "recordId", label: "Hồ sơ", type: "select", required: true, full: true, options: App.data().records.map(r => [r.id, `${r.id} · ${r.shortTitle || r.title}`]) },
      { name: "type", label: "Cần hỗ trợ gì", type: "select", options: SUPPORT_TYPES, required: true },
      { name: "requester", label: "Người gửi", list: peopleList() },
      { name: "detail", label: "Mô tả cụ thể", type: "textarea", required: true, rows: 3 },
      ...(s ? [{ name: "assignee", label: "Người hỗ trợ", list: peopleList() }, { name: "due", label: "Hạn hoàn thành", type: "date" }] : [])
    ];
    const rec = recordId ? App.find("records", recordId) : null;
    modal({ title: s ? "Sửa yêu cầu " + s.id : "Gửi yêu cầu hỗ trợ", wide: true, body: formHtml(fields, s || { recordId: recordId || "", requester: rec ? rec.contact : "" }), onSubmit: async f => {
      const v = readForm(f, fields);
      const next = Object.assign(s ? {} : { id: App.nextId("supports", "YC-"), status: "moi", createdAt: App.state.today, assignee: "", due: "", doneAt: "", result: "" }, s || {}, v);
      await App.saveSupport(next, s ? "sửa yêu cầu hỗ trợ" : `gửi yêu cầu “${ST[v.type][1]}”`);
      done(s ? "Đã lưu." : `Đã gửi ${next.id}. Hạn nhận xử lý: ${T.fmt(App.supportFacts(next).triageDue)}.`);
    } });
  };

  forms.supportAction = function (sid, act) {
    const s = App.find("supports", sid), today = App.state.today;
    if (act === "sua") return forms.support(sid);
    const F = {
      nhan: [{ name: "assignee", label: "Người hỗ trợ", required: true, list: peopleList() }, { name: "due", label: "Hạn hoàn thành", type: "date", required: true }],
      xong: [{ name: "result", label: "Kết quả / sản phẩm bàn giao", type: "textarea", required: true, rows: 2 }, { name: "doneAt", label: "Ngày xong", type: "date", required: true }],
      huy: [{ name: "reason", label: "Lý do hủy (trùng, rút yêu cầu…)", required: true, full: true }],
      mo: [{ name: "reason", label: "Lý do mở lại", required: true, full: true }]
    }[act];
    const title = { nhan: "Nhận xử lý", xong: "Hoàn thành", huy: "Hủy yêu cầu", mo: "Mở lại yêu cầu" }[act];
    modal({ title: `${title} — ${s.id}`, body: formHtml(F, { assignee: s.assignee, due: s.due, doneAt: today }), danger: act === "huy", submitLabel: title, onSubmit: async f => {
      const v = readForm(f, F);
      const next = Object.assign({}, s);
      let text = "";
      if (act === "nhan") { if (v.due < s.createdAt) throw new Error("Hạn không được trước ngày gửi."); Object.assign(next, v, { status: "dang_xu_ly" }); text = `${v.assignee} nhận xử lý, hạn ${T.fmt(v.due)}`; }
      if (act === "xong") { if (v.doneAt < s.createdAt) throw new Error("Ngày xong không được trước ngày gửi."); Object.assign(next, v, { status: "xong" }); text = "hoàn thành — " + v.result; }
      if (act === "huy") { next.status = "huy"; next.result = "Hủy: " + v.reason; text = "hủy — " + v.reason; }
      if (act === "mo") { next.status = next.assignee ? "dang_xu_ly" : "moi"; next.doneAt = ""; text = "mở lại — " + v.reason; }
      await App.saveSupport(next, text);
      done(`${title}: ${s.id}`);
    } });
  };
})();
