/* Hồ sơ nghiên cứu: danh sách / theo chặng, chi tiết, cập nhật tiến độ, thành viên, minh chứng. */
(function () {
  const App = window.App;
  const { T, PHASES, STATUSES, QUARTILES, S, Q, statusLabel, phaseOf, dueState } = window.Domain;
  const { esc, NA, orNA, link, safeUrl, phaseColor, statusChip, tag, supportTag, dueBadge, flagTags, formHtml, readForm, modal, toast } = window.UI;
  const forms = App.forms;
  const done = msg => { toast(msg); App.rerender(); };
  const sel = (name, opts, v, all = "Tất cả") => `<select name="${name}"><option value="">${all}</option>${opts.map(([k, l]) => `<option value="${esc(k)}"${String(k) === String(v) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const journalText = r => r.journal ? esc(r.journal) + (r.quartile ? ` <span class="muted">· ${esc((Q[r.quartile] || ["", r.quartile])[1])}</span>` : "") : NA;
  const userLink = id => id ? `<a href="#/ly-lich/${esc(id)}">${esc(App.userName(id) || id)}</a>` : NA;

  /* ================= Danh sách ================= */
  App.views.records = function (el, _m, q) {
    const today = App.state.today, st = App.settings();
    const scope = App.seesAll() ? (q.pham_vi || "tat_ca") : "cua_toi";
    const f = { q: q.q || "", khoa: q.khoa || "", chang: q.chang || "", trang_thai: q.trang_thai || "", han: q.han || "", chu_y: q.chu_y || "" };
    const mode = App.pref.get("recordsMode", "list");
    const base = scope === "cua_toi" ? App.all("records").filter(App.isTeam) : App.visibleRecords();
    const rows = base.filter(r => {
      if (f.khoa && r.unit !== f.khoa) return false;
      if (f.chang && phaseOf(r.status) !== f.chang) return false;
      if (f.trang_thai && r.status !== f.trang_thai) return false;
      if (f.han) { const d = dueState(r, st, today); if (f.han === "dung_han" ? !["dung_han", "chua_dat"].includes(d) : d !== f.han) return false; }
      if (f.chu_y && !App.flags(r).length) return false;
      if (f.q && ![r.id, r.title, r.shortTitle, r.group, r.journal, r.nextAction, App.userName(r.ownerId)].join(" ").toLowerCase().includes(f.q.toLowerCase())) return false;
      return true;
    }).sort((a, b) => a.id.localeCompare(b.id, "vi", { numeric: true }));
    const openSup = id => App.all("supports").filter(s => s.recordId === id && ["cho_duyet", "cho_nhan", "dang_xu_ly", "cho_xac_nhan"].includes(s.status)).length;

    const list = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Mã · hồ sơ</th><th>Khoa / nhóm</th><th>Chủ nhiệm</th><th>Trạng thái</th><th>Tạp chí / Q</th><th>Việc tiếp theo</th><th>Hạn</th><th>Cập nhật</th><th>Cảnh báo</th></tr></thead><tbody>
      ${rows.map(r => { const fl = App.flags(r), ns = openSup(r.id); return `<tr><td><a class="row-link" href="#/ho-so/${encodeURIComponent(r.id)}">${esc(r.id)}</a><span class="sub">${esc(r.shortTitle || r.title)}</span></td>
        <td>${orNA(r.unit)}${r.group ? `<span class="sub">${esc(r.group)}</span>` : ""}</td><td>${esc(App.userName(r.ownerId))}</td>
        <td>${statusChip(r.status)}<span class="sub">${r.statusSince ? T.days(r.statusSince, today) + " ngày" : ""}</span></td><td>${journalText(r)}</td>
        <td>${orNA(r.nextAction)}</td><td>${r.status === "xuat_ban" ? "" : dueBadge(r.due, today, st.soonDays)}</td><td><small>${T.fmt(r.updatedAt)}</small></td>
        <td>${flagTags(fl)}${ns ? ` ${tag("info", ns + " YC hỗ trợ")}` : ""}</td></tr>`; }).join("")}</tbody></table></div>`
      : `<div class="card empty">${scope === "cua_toi" && !base.length ? `Bạn chưa có hồ sơ nào. <button class="btn primary sm" id="add2">+ Tạo hồ sơ đầu tiên</button>` : "Không có hồ sơ phù hợp."}</div>`;
    const board = `<div class="board">${PHASES.map(([pk, pl]) => { const items = rows.filter(r => phaseOf(r.status) === pk);
      return `<div class="col"><h3><span><i class="dot" style="background:${phaseColor(pk)}"></i> ${esc(pl)}</span><span class="muted">${items.length}</span></h3>${items.map(r => { const fl = App.flags(r);
        return `<a class="kcard${fl.some(x => x.tone === "crit") ? " alert" : ""}" href="#/ho-so/${encodeURIComponent(r.id)}"><div class="k-top"><span class="code">${esc(r.id)}</span><small>${esc(statusLabel(r.status))}</small></div>
          <div class="k-title">${esc(r.shortTitle || r.title)}</div><div>${r.nextAction ? "→ " + esc(r.nextAction) : '<span class="na">Chưa có việc tiếp theo</span>'}</div>
          <div class="k-meta"><span>${esc(App.userName(r.ownerId))}</span>${r.due && r.status !== "xuat_ban" ? `<span>Hạn ${T.fmt(r.due)}</span>` : ""}</div>${fl.length ? `<div style="margin-top:6px">${flagTags(fl)}</div>` : ""}</a>`; }).join("") || '<p class="muted" style="font-size:12px">Trống</p>'}</div>`; }).join("")}</div>`;

    el.innerHTML = `
      <div class="page-head"><div><h1>Hồ sơ nghiên cứu</h1><p>Mỗi nghiên cứu / bản thảo một mã, theo dõi từ ý tưởng đến xuất bản. Thành viên nhóm cập nhật trực tiếp.</p></div>
        <div class="actions"><button class="btn primary" id="add">+ Hồ sơ mới</button></div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        ${App.seesAll() ? `<div class="seg" role="group" aria-label="Phạm vi"><button data-scope="cua_toi" aria-pressed="${scope === "cua_toi"}">Hồ sơ của tôi</button><button data-scope="tat_ca" aria-pressed="${scope === "tat_ca"}">Tất cả hồ sơ</button></div>` : ""}
        <div class="seg" role="group" aria-label="Kiểu xem"><button data-mode="list" aria-pressed="${mode === "list"}">Danh sách</button><button data-mode="board" aria-pressed="${mode === "board"}">Theo chặng</button></div></div>
      <form class="filters" id="rf">
        <label class="grow">Tìm<input name="q" value="${esc(f.q)}" placeholder="Mã, tên, chủ nhiệm, tạp chí…"></label>
        <label>Khoa${sel("khoa", st.units.map(u => [u, u]), f.khoa)}</label>
        <label>Chặng${sel("chang", PHASES.map(p => [p[0], p[1]]), f.chang)}</label>
        <label>Trạng thái${sel("trang_thai", STATUSES.map(s => [s[0], s[1]]), f.trang_thai)}</label>
        <label>Hạn${sel("han", [["dung_han", "Đúng hạn"], ["sap_den", "Sắp đến hạn"], ["qua_han", "Quá hạn"]], f.han)}</label>
        <label class="check inline"><input type="checkbox" name="chu_y"${f.chu_y ? " checked" : ""}> Chỉ hồ sơ cần chú ý</label>
      </form>
      <p class="muted" style="margin:-6px 0 10px">${rows.length} hồ sơ</p>
      ${mode === "board" ? board : list}`;
    const rf = el.querySelector("#rf");
    const apply = (extra = {}) => {
      const p = new URLSearchParams();
      if (App.seesAll()) p.set("pham_vi", extra.scope || scope);
      ["q", "khoa", "chang", "trang_thai", "han"].forEach(k => { if (rf.elements[k].value) p.set(k, rf.elements[k].value); });
      if (rf.elements.chu_y.checked) p.set("chu_y", "1");
      App.go("#/ho-so?" + p);
    };
    rf.addEventListener("change", () => apply());
    rf.elements.q.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); apply(); } });
    el.querySelectorAll("[data-scope]").forEach(b => b.onclick = () => apply({ scope: b.dataset.scope }));
    el.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { App.pref.set("recordsMode", b.dataset.mode); App.rerender(); });
    el.querySelector("#add").onclick = () => forms.record();
    const a2 = el.querySelector("#add2"); if (a2) a2.onclick = () => forms.record();
    if (q.moi) { history.replaceState(null, "", "#/ho-so"); forms.record(); }
  };

  /* ================= Chi tiết ================= */
  App.views.record = function (el, m) {
    const r = App.find("records", decodeURIComponent(m[1])), today = App.state.today;
    if (!r || !App.canSee(r)) { el.innerHTML = `<div class="card empty">Không tìm thấy hồ sơ hoặc bạn không có quyền xem. <a href="#/ho-so">Về danh sách</a></div>`; return; }
    const fl = App.flags(r), edit = App.canEditRecord(r), team = App.isTeam(r), files = App.canSeeFiles(r);
    const sups = App.all("supports").filter(s => s.recordId === r.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const curPhase = phaseOf(r.status), mainPhases = PHASES.filter(p => p[0] !== "tam_dung");
    const curIdx = mainPhases.findIndex(p => p[0] === curPhase);
    const d = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`;
    el.innerHTML = `
      <div class="detail-head"><div><div class="muted"><a href="#/ho-so">← Hồ sơ nghiên cứu</a></div>
        <h1><span class="code" style="font-size:16px">${esc(r.id)}</span> ${esc(r.title)}</h1>
        <div class="meta">${statusChip(r.status)} <span>${r.statusSince ? `từ ${T.fmt(r.statusSince)} (${T.days(r.statusSince, today)} ngày)` : ""}</span><span>${esc(r.unit || "")}${r.group ? " · " + esc(r.group) : ""}</span></div>
        ${fl.length ? `<div style="margin-top:8px">${flagTags(fl)}</div>` : ""}</div>
        <div class="actions">${edit ? `<button class="btn primary" id="upd">Cập nhật tiến độ</button>` : ""}${team ? `<button class="btn" id="req">+ Yêu cầu hỗ trợ</button><button class="btn" id="ev">+ Minh chứng</button>` : ""}
          ${(r.ownerId === App.me().id || App.isCoord()) ? `<button class="btn" id="edit">Sửa thông tin</button>` : ""}</div></div>
      <ol class="stepper">${mainPhases.map(([pk, pl], i) => `<li class="${curPhase === "tam_dung" ? "" : i < curIdx ? "done" : i === curIdx ? "cur" : ""}"${i === curIdx ? ' aria-current="step"' : ""}>${esc(pl)}${i === curIdx ? `<br><b>${esc(statusLabel(r.status))}</b>` : ""}</li>`).join("")}
        ${curPhase === "tam_dung" ? `<li class="cur" aria-current="step">Tạm dừng</li>` : ""}</ol>
      <div class="next-box"><div><div class="k">Việc tiếp theo</div><div class="v">${orNA(r.nextAction)}</div></div>
        <div><div class="k">Chủ nhiệm</div><div class="v">${userLink(r.ownerId)}</div></div>
        <div><div class="k">${r.status === "tam_dung" ? "Mốc xem xét lại" : "Hạn"}</div><div class="v">${r.status === "xuat_ban" ? "—" : dueBadge(r.due, today, App.settings().soonDays)}</div></div></div>
      <div class="grid g2">
        <section class="card"><h2>Thông tin hồ sơ</h2><dl class="dl">
          ${d("Tên rút gọn", orNA(r.shortTitle))}${d("Thành viên", (r.memberIds || []).map(userLink).join(", ") || NA)}
          ${d("Tạp chí mục tiêu / Q", journalText(r))}${d("DOI / link xuất bản", r.doi ? (safeUrl(r.doi) ? link(r.doi) : esc(r.doi)) : NA)}
          ${d("Rủi ro", r.risk ? tag("crit", r.risk, "!") : NA)}${d("Thư mục tài liệu", files ? link(r.docsUrl, "Mở thư mục") : '<span class="na">Chỉ nhóm tác giả và người hỗ trợ được giao</span>')}
          ${d("Ghi chú", orNA(r.note))}${d("Tạo / cập nhật", `${T.fmt(r.createdAt)} / ${T.fmt(r.updatedAt)}`)}</dl></section>
        <section class="card"><h2>Minh chứng <span class="muted">(${(r.evidence || []).length})</span></h2>
          ${!files ? `<p class="na">Chỉ nhóm tác giả và người hỗ trợ được giao xem được minh chứng.</p>` : (r.evidence || []).length ? `<ul class="plain">${[...r.evidence].reverse().map(e => `<li><div>${link(e.url, e.label)}</div><small class="muted">${T.fmt(e.date)} · ${esc(App.userName(e.by))}</small></li>`).join("")}</ul>`
            : `<p class="empty">Chưa có minh chứng. Lưu tệp ở Drive/OneDrive của trường rồi dán đường dẫn.</p>`}</section>
      </div>
      <section class="card" style="margin-top:16px"><div class="card-head"><h2>Yêu cầu hỗ trợ <span class="muted">(${sups.length})</span></h2></div>
        ${sups.length ? `<div class="table-wrap"><table><thead><tr><th>Yêu cầu</th><th>Người hỗ trợ</th><th>Trạng thái</th><th>Ngày gửi</th></tr></thead><tbody>${sups.map(s => `<tr><td><a href="#/ho-tro/${esc(s.id)}">${esc(s.id)}</a> ${esc(App.typeLabel(s.type))}<span class="sub">${esc(s.detail)}</span></td>
          <td>${s.supporterId ? esc(App.userName(s.supporterId)) : (s.proposedSupporterId ? `<span class="muted">Đề xuất: ${esc(App.userName(s.proposedSupporterId))}</span>` : NA)}</td><td>${supportTag(s.status)}</td><td>${T.fmt(s.createdAt)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty">Chưa có yêu cầu.</p>`}
      </section>
      <section class="card" style="margin-top:16px"><h2>Lịch sử cập nhật</h2>
        ${(r.history || []).length ? `<ul class="timeline">${[...r.history].reverse().map(h => `<li><div class="when">${esc(T.fmtTime(h.at))}${h.by ? " · " + esc(App.userName(h.by)) : ""}</div>${h.text ? `<div>${esc(h.text)}</div>` : ""}${h.note ? `<div class="muted">${esc(h.note)}</div>` : ""}</li>`).join("")}</ul>` : `<p class="empty">Chưa có.</p>`}
      </section>`;
    const on = (id, fn) => { const b = el.querySelector(id); if (b) b.onclick = fn; };
    on("#upd", () => forms.progress(r.id));
    on("#edit", () => forms.record(r.id));
    on("#req", () => forms.support(null, r.id));
    on("#ev", () => forms.evidence(r.id));
  };

  /* ================= Biểu mẫu ================= */
  const people = () => App.activeUsers().map(u => [u.id, `${u.name}${u.unit ? " — " + u.unit : ""}`]);

  forms.record = function (id) {
    const r = id ? App.find("records", id) : null, me = App.me();
    const fields = [
      { name: "id", label: "Mã hồ sơ", required: true, readonly: !!r, help: r ? "" : "Mã tự sinh; có thể đổi theo mã đề tài" },
      { name: "unit", label: "Khoa", type: "select", options: App.settings().units.map(u => [u, u]), required: true },
      { name: "title", label: "Tên nghiên cứu / bản thảo", required: true, full: true },
      { name: "shortTitle", label: "Tên rút gọn" }, { name: "group", label: "Nhóm nghiên cứu" },
      { name: "ownerId", label: "Chủ nhiệm / tác giả liên hệ", type: "select", options: people(), required: true },
      ...(r ? [] : [{ name: "status", label: "Trạng thái hiện tại", type: "select", options: STATUSES.map(s => [s[0], s[1]]), required: true, help: "Bản thảo có sẵn được nhận ở đúng trạng thái thực tế" }]),
      { name: "memberIds", label: "Thành viên nhóm (có tài khoản trên hệ thống)", type: "multi", options: people().filter(([uid]) => uid !== (r ? r.ownerId : me.id)) },
      { name: "journal", label: "Tạp chí mục tiêu" }, { name: "quartile", label: "Phân hạng", type: "select", options: QUARTILES },
      { name: "nextAction", label: "Việc tiếp theo", full: true }, { name: "due", label: "Hạn", type: "date" },
      { name: "docsUrl", label: "Thư mục tài liệu (link Drive / OneDrive của trường)", type: "url" },
      { name: "note", label: "Ghi chú", type: "textarea", rows: 2 }
    ];
    const nextId = () => { const nums = App.all("records").map(x => parseInt(String(x.id).replace(/^HS-/, ""), 10)).filter(n => !isNaN(n)); return "HS-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0"); };
    modal({ title: r ? "Sửa hồ sơ " + r.id : "Hồ sơ mới", wide: true, body: formHtml(fields, r || { id: nextId(), status: "y_tuong", unit: me.unit, ownerId: me.id }), onSubmit: async f => {
      const v = readForm(f, fields);
      if (!r && App.find("records", v.id)) throw new Error(`Mã ${v.id} đã tồn tại.`);
      v.memberIds = (v.memberIds || []).filter(x => x !== v.ownerId);
      const next = await App.saveRecord(Object.assign({ createdAt: App.state.today, createdBy: me.id, evidence: [], risk: "", doi: "" }, r || {}, v), r ? "Sửa thông tin hồ sơ" : "");
      const added = [v.ownerId, ...v.memberIds].filter(x => !r || ![r.ownerId, ...(r.memberIds || [])].includes(x));
      await App.notify(added, `Bạn được thêm vào hồ sơ ${next.id}: ${next.shortTitle || next.title}`, "#/ho-so/" + next.id);
      if (!r) await App.log(`Tạo hồ sơ ${next.id}`, "#/ho-so/" + next.id);
      toast(r ? "Đã lưu." : "Đã tạo hồ sơ " + next.id);
      App.go("#/ho-so/" + encodeURIComponent(next.id));
    } });
  };

  forms.progress = function (id) {
    const r = App.find("records", id);
    const fields = [
      { name: "status", label: "Trạng thái", type: "select", options: STATUSES.map(s => [s[0], s[1]]), required: true },
      { type: "html", html: '<div class="rule-box" id="cond"></div>' },
      { name: "nextAction", label: "Việc tiếp theo", full: true }, { name: "due", label: "Hạn / mốc xem xét lại", type: "date" },
      { name: "journal", label: "Tạp chí" }, { name: "quartile", label: "Phân hạng", type: "select", options: QUARTILES },
      { name: "doi", label: "DOI / link xuất bản", help: "Bắt buộc khi chuyển sang Xuất bản" },
      { name: "risk", label: "Rủi ro (để trống nếu không có)", placeholder: "VD: đạo đức, dữ liệu, tranh chấp tác giả, tạp chí nghi săn mồi" },
      { name: "note", label: "Ghi chú cập nhật / lý do", type: "textarea", rows: 2 }
    ];
    const form = modal({ title: `Cập nhật tiến độ — ${r.id}`, wide: true, body: formHtml(fields, Object.assign({}, r, { note: "" })), submitLabel: "Lưu cập nhật", onSubmit: async f => {
      const v = readForm(f, fields);
      if (v.status === "tam_dung" && (!v.note || !v.due)) throw new Error("Tạm dừng cần ghi lý do và mốc xem xét lại.");
      if (v.status === "xuat_ban" && !v.doi) throw new Error("Xuất bản cần DOI hoặc link xuất bản chính thức.");
      if (v.status === "bi_tu_choi" && !v.nextAction) throw new Error("Bị từ chối: ghi kế hoạch nộp lại vào “Việc tiếp theo”.");
      const note = v.note; delete v.note;
      const next = await App.saveRecord(Object.assign({}, r, v), note);
      if (next.status !== r.status) await App.notify([next.ownerId, ...(next.memberIds || [])], `${r.id} chuyển sang “${statusLabel(next.status)}”`, "#/ho-so/" + r.id);
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

  forms.evidence = function (id) {
    const r = App.find("records", id);
    const fields = [{ name: "label", label: "Tên minh chứng", required: true, full: true, placeholder: "VD: Biên nhận nộp bài, Quyết định chấp nhận, Phiếu phản biện nội bộ" },
      { name: "url", label: "Đường dẫn (Drive / OneDrive / trang tạp chí)", type: "url", required: true, full: true }, { name: "date", label: "Ngày", type: "date", required: true }];
    modal({ title: "Thêm minh chứng — " + r.id, body: formHtml(fields, { date: App.state.today }), onSubmit: async f => {
      const v = readForm(f, fields);
      if (!safeUrl(v.url)) throw new Error("Đường dẫn phải bắt đầu bằng http:// hoặc https://");
      await App.saveRecord(Object.assign({}, r, { evidence: [...(r.evidence || []), Object.assign(v, { by: App.me().id })] }), "Thêm minh chứng: " + v.label);
      done("Đã thêm minh chứng.");
    } });
  };
})();
