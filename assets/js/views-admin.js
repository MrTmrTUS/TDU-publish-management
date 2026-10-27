/* M07 Tạp chí, lần nộp & công bố, cảnh báo, M08 báo cáo chỉ số, lịch sử thay đổi, cấu hình và dữ liệu. */
(function () {
  const App = window.App;
  const CFG = window.APP_CONFIG;
  const { T, D, dict, label, metrics, alerts, journalVerification, duplicateDois, DEFAULT_SETTINGS, ALERT_DEFS, alertTitle } = window.Domain;
  const { esc, NA, orNA, decisionBadge, formHtml, readForm, modal, toast, confirmBox, parseCsv, toCsv, download } = window.UI;
  const forms = App.forms;
  const done = msg => { toast(msg); App.rerender(); };

  /* ================= M07 Tạp chí ================= */
  App.views.journals = function (el, _m, q) {
    const data = App.data(), cutoff = App.state.cutoff, st = App.settings();
    const usage = id => ({ options: data.manuscripts.filter(m => (m.journalOptions || []).some(o => o.journalId === id)).map(m => m.id),
                           subs: data.submissions.filter(s => s.journalId === id) });
    el.innerHTML = `
      <div class="page-head"><div><h1>Tạp chí và phương án nộp bài <span class="muted">· M07</span></h1>
        <p>Phân hạng lưu theo hệ thống, nhóm ngành và năm kèm nguồn và ngày kiểm tra — không gộp thành một giá trị Q thiếu ngữ cảnh. Tạp chí thiếu thông tin được đánh dấu cần xác minh. Rà soát định kỳ ${st.journalReviewDays} ngày.</p></div>
        <div class="actions"><a class="btn" href="https://thinkchecksubmit.org/journals/" target="_blank" rel="noopener">Think. Check. Submit. ↗</a><button class="btn primary" id="add">+ Tạp chí</button></div></div>
      <div class="table-wrap"><table><thead><tr><th>Tạp chí</th><th>Phân hạng theo nguồn</th><th>Tình trạng xác minh</th><th>Phí</th><th>Đang dùng</th><th></th></tr></thead><tbody>
      ${data.journals.map(j => { const v = journalVerification(j, cutoff, st); const u = usage(j.id);
        return `<tr id="j-${esc(j.id)}"${q.id === j.id ? ' style="outline:2px solid var(--accent)"' : ""}><td><b>${esc(j.name)}</b><span class="sub">ISSN ${orNA(j.issn)} · ${esc(j.publisher || "")}</span><span class="sub">${esc(j.scope || "")}</span></td>
          <td>${(j.verifications || []).map(x => `<div>${esc(x.system || "?")} · ${x.category ? esc(x.category) : '<span class="na">thiếu nhóm ngành</span>'} · ${x.year ? esc(x.year) : '<span class="na">thiếu năm</span>'}: <b>${esc(x.value || "?")}</b>
            <span class="sub">Nguồn: ${x.source ? esc(x.source) : '<span class="na">Chưa xác minh</span>'}${x.checkedAt ? ` · kiểm tra ${T.fmt(x.checkedAt)}${x.checkedBy ? " bởi " + esc(App.personName(x.checkedBy)) : ""}` : ""}</span></div>`).join("") || '<span class="na">Chưa xác minh</span>'}</td>
          <td>${v.state === "ok" ? `<span class="tag tag-good">✓ Đã xác minh</span><span class="sub">${esc(v.text)}</span>` : `<span class="tag tag-warn">? Cần xác minh</span><span class="sub">${esc(v.text)}</span>`}</td>
          <td>${orNA(j.apc)}</td><td>${u.options.length ? `<small>Phương án: ${u.options.map(id => `<a href="${App.recordHref("manuscripts", id)}">${esc(id)}</a>`).join(", ")}</small><br>` : ""}${u.subs.length ? `<small>${u.subs.length} lần nộp</small>` : ""}${!u.options.length && !u.subs.length ? "—" : ""}</td>
          <td><button class="btn sm" data-ed="${esc(j.id)}">Sửa / xác minh</button></td></tr>`; }).join("") || `<tr><td colspan="6" class="empty">Chưa có dữ liệu</td></tr>`}</tbody></table></div>`;
    el.querySelector("#add").onclick = () => forms.journal();
    el.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => forms.journal(b.dataset.ed));
    if (q.id) { const row = document.getElementById("j-" + q.id); if (row) row.scrollIntoView({ block: "center" }); }
  };

  forms.journal = function (jid) {
    const j = jid ? App.find("journals", jid) : null;
    const fields = [
      { name: "name", label: "Tên tạp chí", required: true, full: true }, { name: "issn", label: "ISSN / eISSN" }, { name: "publisher", label: "Nhà xuất bản" },
      { name: "scope", label: "Phạm vi" }, { name: "apc", label: "Phí" }, { name: "url", label: "Trang tạp chí", type: "url", full: true }, { name: "notes", label: "Ghi chú", full: true }
    ];
    const people = App.options.people();
    const vrow = (x = {}) => `<tr><td><select name="v_system">${D.rankingSystems.map(([k, l]) => `<option value="${esc(k)}"${k === x.system ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></td>
      <td><input name="v_category" value="${esc(x.category || "")}" placeholder="Nhóm ngành"></td><td><input name="v_year" value="${esc(x.year || "")}" placeholder="Năm" inputmode="numeric" style="width:70px"></td>
      <td><input name="v_value" value="${esc(x.value || "")}" placeholder="Q1 / điểm" style="width:90px"></td><td><input name="v_source" value="${esc(x.source || "")}" placeholder="Nguồn"></td>
      <td><input type="date" name="v_checkedAt" value="${esc(x.checkedAt || "")}"></td>
      <td><select name="v_checkedBy"><option value="">—</option>${people.map(([k, l]) => `<option value="${esc(k)}"${k === x.checkedBy ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></td>
      <td><button type="button" class="icon-btn" data-delrow aria-label="Xóa dòng">✕</button></td></tr>`;
    const body = formHtml(fields, j || {}) + `<h4 class="form-section" style="margin-top:16px">Bản ghi xác minh phân hạng</h4>
      <p class="muted" style="font-size:12px">Mỗi dòng là một nguồn phân hạng: hệ thống, nhóm ngành, năm, giá trị, nguồn và ngày kiểm tra. Thiếu bất kỳ thông tin nào → hiển thị “Cần xác minh”.</p>
      <div class="table-wrap"><table><thead><tr><th>Hệ thống</th><th>Nhóm ngành</th><th>Năm</th><th>Giá trị</th><th>Nguồn</th><th>Ngày kiểm tra</th><th>Người kiểm tra</th><th></th></tr></thead>
      <tbody id="vrows">${(j && j.verifications || []).map(vrow).join("")}</tbody></table></div><button type="button" class="btn sm" id="addV" style="margin-top:8px">+ Thêm nguồn phân hạng</button>`;
    const form = modal({ title: j ? "Tạp chí: " + j.name : "Thêm tạp chí", wide: true, body, onSubmit: async f => {
      const v = readForm(f, fields);
      const rows = [...f.querySelectorAll("#vrows tr")].map(tr => ({ system: tr.querySelector('[name="v_system"]').value, category: tr.querySelector('[name="v_category"]').value.trim(),
        year: tr.querySelector('[name="v_year"]').value.trim(), value: tr.querySelector('[name="v_value"]').value.trim(), source: tr.querySelector('[name="v_source"]').value.trim(),
        checkedAt: tr.querySelector('[name="v_checkedAt"]').value, checkedBy: tr.querySelector('[name="v_checkedBy"]').value })).filter(r => r.value || r.source || r.category);
      await App.saveRecord("journals", Object.assign({ id: j ? j.id : App.nextId("journals", "j", 2) }, j || {}, v, { verifications: rows }), { reason: "Cập nhật hồ sơ xác minh tạp chí" });
      done("Đã lưu tạp chí.");
    } });
    const tb = form.querySelector("#vrows");
    form.querySelector("#addV").onclick = () => tb.insertAdjacentHTML("beforeend", vrow({ checkedAt: App.state.cutoff }));
    tb.addEventListener("click", e => { if (e.target.closest("[data-delrow]")) e.target.closest("tr").remove(); });
  };

  /* ================= Lần nộp & công bố ================= */
  App.views.publications = function (el) {
    const data = App.data(), s = App.state;
    const m = metrics(data, s);
    const dup = duplicateDois(data.publications);
    el.innerHTML = `
      <div class="page-head"><div><h1>Lần nộp và kết quả xuất bản</h1>
        <p>Một bản thảo có thể có nhiều lần nộp nối tiếp; nộp lại tạp chí khác tạo mã lần nộp mới, giữ nguyên mã bản thảo. Kết quả xuất bản chỉ được tính sau đối soát.</p></div>
        <div class="actions"><button class="btn primary" id="addPub">+ Kết quả xuất bản</button></div></div>
      ${App.filtersBar()}
      <div class="grid g4">
        <div class="tile"><div class="t-label">Bản thảo có lần nộp (K07)</div><div class="t-value">${m.k07.manuscripts}</div><div class="t-sub">${m.k07.submissions} lần nộp trong kỳ</div></div>
        <div class="tile"><div class="t-label">Bản thảo được chấp nhận (K08)</div><div class="t-value">${m.k08}</div></div>
        <div class="tile"><div class="t-label">Công bố chính thức (K09)</div><div class="t-value">${m.k09.count}</div></div>
        <div class="tile"><div class="t-label">Chờ đối soát</div><div class="t-value">${m.k09.pendingReconcile}</div><div class="t-sub">Preprint, chưa xác minh hoặc trùng DOI</div></div>
      </div>
      <h2 class="section-title">Các lần nộp</h2>
      <div class="table-wrap"><table><thead><tr><th>Mã</th><th>Bản thảo</th><th>Tạp chí</th><th>Ngày nộp</th><th>Quyết định</th><th>Kết thúc</th></tr></thead><tbody>
        ${[...data.submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map(x => `<tr><td class="code">${esc(x.id)}</td><td>${App.recordLink("manuscripts", x.manuscriptId)}</td>
          <td>${esc(App.journalName(x.journalId))}<span class="sub">${esc(x.journalRef)}</span></td><td>${T.fmt(x.submittedAt)}</td><td>${decisionBadge(x.decision)}${x.decisionAt ? `<span class="sub">${T.fmt(x.decisionAt)}</span>` : ""}</td>
          <td>${x.endedAt ? T.fmt(x.endedAt) : `<span class="tag tag-info">Đang mở · ${T.days(x.submittedAt, s.cutoff)} ngày</span>`}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">Chưa có dữ liệu</td></tr>`}</tbody></table></div>
      <h2 class="section-title">Kết quả xuất bản & đối soát</h2>
      <div class="table-wrap"><table><thead><tr><th>Mã</th><th>Sản phẩm</th><th>DOI</th><th>Ngày xuất bản</th><th>Phiên bản</th><th>Đối soát</th><th></th></tr></thead><tbody>
        ${data.publications.map(p => { const isDup = dup.has((p.doi || "").toLowerCase());
          return `<tr><td class="code">${esc(p.id)}</td><td>${esc(p.title)}<span class="sub">${p.manuscriptId ? App.recordLink("manuscripts", p.manuscriptId) : ""} ${esc(App.journalName(p.journalId))}</span></td>
          <td>${orNA(p.doi)}${isDup ? '<br><span class="tag tag-crit">! DOI trùng</span>' : ""}</td><td>${p.publishedAt ? T.fmt(p.publishedAt) : NA}</td><td>${esc(label("versionTypes", p.versionType))}</td>
          <td>${p.verified && p.versionType === "chinh_thuc" && !isDup ? '<span class="tag tag-good">✓ Tính vào K09</span>' : '<span class="tag tag-warn">? Cần đối soát</span>'}${p.notes ? `<span class="sub">${esc(p.notes)}</span>` : ""}</td>
          <td><button class="btn sm" data-ed="${esc(p.id)}">Sửa</button></td></tr>`; }).join("") || `<tr><td colspan="7" class="empty">Chưa có dữ liệu</td></tr>`}</tbody></table></div>`;
    App.bindFilters(el);
    el.querySelector("#addPub").onclick = () => forms.publication(null, null);
    el.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => forms.publication(b.dataset.ed));
  };

  /* ================= Cảnh báo ================= */
  App.views.alerts = function (el) {
    const data = App.data(), cutoff = App.state.cutoff, st = App.settings();
    const list = alerts(data, cutoff);
    const closed = (data.settings.closedAlerts || []).slice().reverse();
    const codes = Object.keys(ALERT_DEFS);
    el.innerHTML = `
      <div class="page-head"><div><h1>Cảnh báo</h1>
        <p>Mỗi cảnh báo có mã, hồ sơ liên quan, điều kiện, người nhận, hành động dự kiến và điều kiện đóng. Cảnh báo không tự kết luận về năng lực hay mức độ làm việc của giảng viên. Ngày chốt ${T.fmt(cutoff)}.</p></div>
        <div class="actions"><a class="btn" href="#/cau-hinh">Ngưỡng cảnh báo</a></div></div>
      ${codes.map(code => { const items = list.filter(a => a.code === code);
        return `<section class="card" style="margin-bottom:12px"><div class="card-head"><h2><span class="alert-code" style="display:inline-block;margin-right:8px">${code}</span>${esc(alertTitle(code, st))}</h2><span class="muted">${items.length}</span></div>
          <p class="card-sub">Hành động dự kiến: ${esc(window.Domain.ALERT_ACTIONS[code])}${code === "CB09" ? " CB09 được kiểm tra trực tiếp khi chuyển giai đoạn." : ""}</p>
          ${items.map(a => `<div class="alert-item"><span class="alert-code">${code}</span><div>${App.recordLink(a.ref.col, a.ref.id)}<div class="muted">${esc(a.detail)}</div>
            ${a.ownerId ? `<small>Người nhận: ${esc(App.personName(a.ownerId))}</small>` : ""}</div><button class="btn sm" data-close="${esc(a.key)}">Đóng cảnh báo</button></div>`).join("") || '<p class="muted" style="margin:0">Không có.</p>'}</section>`; }).join("")}
      ${closed.length ? `<h2 class="section-title">Đã đóng (${closed.length})</h2><div class="table-wrap"><table><thead><tr><th>Cảnh báo</th><th>Lý do đóng</th><th>Ngày</th><th>Người đóng</th><th></th></tr></thead><tbody>
        ${closed.map(c => `<tr><td class="code">${esc(c.key)}</td><td>${esc(c.reason)}</td><td>${T.fmt(c.at)}</td><td>${esc(c.by)}</td><td><button class="btn sm ghost" data-reopen="${esc(c.key)}">Mở lại</button></td></tr>`).join("")}</tbody></table></div>` : ""}`;
    el.querySelectorAll("[data-close]").forEach(b => b.onclick = () => {
      const fields = [{ name: "basis", label: "Căn cứ đóng", type: "select", required: true, options: [["da_xu_ly", "Vấn đề đã được xử lý"], ["het_dieu_kien", "Điều kiện không còn"], ["khong_can", "Đã xác minh, không cần can thiệp"]] },
        { name: "reason", label: "Ghi chú xác minh", type: "textarea", required: true, rows: 2 }];
      modal({ title: "Đóng cảnh báo", body: formHtml(fields, {}), onSubmit: async f => {
        const v = readForm(f, fields);
        const s = Object.assign({}, data.settings);
        s.closedAlerts = [...(s.closedAlerts || []), { key: b.dataset.close, reason: `${fields[0].options.find(o => o[0] === v.basis)[1]} — ${v.reason}`, at: cutoff, by: App.who() }];
        await window.Store.saveSettings(s);
        done("Đã đóng cảnh báo.");
      } });
    });
    el.querySelectorAll("[data-reopen]").forEach(b => b.onclick = async () => {
      const s = Object.assign({}, data.settings);
      s.closedAlerts = (s.closedAlerts || []).filter(c => c.key !== b.dataset.reopen);
      await window.Store.saveSettings(s);
      done("Đã mở lại cảnh báo.");
    });
  };

  /* ================= M08 Báo cáo chỉ số ================= */
  App.views.reports = function (el) {
    const data = App.data(), s = App.state;
    const m = metrics(data, s), KDEF = App.KDEF, st = App.settings();
    const pct = ({ num, den }) => den ? `${Math.round(num / den * 100)}%` : "—";
    const missing = {
      noNext: [...m.projects, ...m.manuscripts].filter(r => r.status !== "hoan_thanh" && !r.nextAction).length,
      noOwner: [...m.projects, ...m.manuscripts].filter(r => !r.ownerId).length,
      noDue: m.supports.filter(x => ["da_phan_cong", "dang_xu_ly"].includes(x.status) && !x.dueOriginal).length,
      noCause: m.supports.filter(x => m.facts.get(x.id).open && !x.confirmedCause).length,
      unverifiedJournals: data.journals.filter(j => journalVerification(j, s.cutoff, st).state !== "ok").length
    };
    const rows = [
      ["K01", "Hồ sơ đang được theo dõi", `${m.k01.projects} nghiên cứu · ${m.k01.manuscripts} bản thảo`, "Ảnh chụp tại ngày chốt", KDEF.K01],
      ["K02", "Hồ sơ có điểm nghẽn đã xác nhận", `${m.k02.records} hồ sơ · ${m.k02.issues} vấn đề`, `${missing.noCause} yêu cầu mở chưa xác nhận nguyên nhân`, KDEF.K02],
      ["K03", "Tỷ lệ tiếp nhận/phân loại đúng hạn", `${pct(m.k03)} (${m.k03.num}/${m.k03.den})`, `Hạn ${st.triageWorkdays} ngày làm việc; ${m.k04.closed} yêu cầu đóng có lý do tách riêng`, KDEF.K03],
      ["K04", "Tỷ lệ hoàn thành hỗ trợ đúng hạn", `Hạn ban đầu ${pct(m.k04.orig)} (${m.k04.orig.num}/${m.k04.orig.den}) · hạn điều chỉnh ${pct(m.k04.adj)} (${m.k04.adj.num}/${m.k04.adj.den})`, `${missing.noDue} yêu cầu đang xử lý chưa có hạn`, KDEF.K04],
      ["K05", "Thời gian giải quyết", m.k05.median == null ? "—" : `Trung vị ${m.k05.median} ngày (${m.k05.count} yêu cầu)`, `${m.k05.openCount} yêu cầu còn mở, tuổi trung vị ${m.k05.openMedianAge == null ? "—" : m.k05.openMedianAge} ngày`, KDEF.K05],
      ["K06", "Hồ sơ đạt mốc mục tiêu", "Chưa tính", "Cần đơn vị định nghĩa mốc mục tiêu đo được khi bắt đầu", "Hồ sơ đạt mốc đã xác định khi bắt đầu ÷ toàn bộ hồ sơ đủ điều kiện; trình bày số rút/dừng."],
      ["K07", "Bản thảo duy nhất có lần nộp trong kỳ", `${m.k07.manuscripts} bản thảo`, `${m.k07.submissions} lần nộp (chỉ số riêng)`, KDEF.K07],
      ["K08", "Bản thảo được chấp nhận trong kỳ", `${m.k08}`, "Không cộng với K09", KDEF.K08],
      ["K09", "Công bố chính thức trong kỳ", `${m.k09.count}`, `${m.k09.pendingReconcile} bản ghi chờ đối soát`, KDEF.K09],
      ["K10", "Giảng viên tham gia thực chất", `${m.k10} (tạm tính)`, "Định nghĩa đóng góp do đơn vị thống nhất", KDEF.K10],
      ["K11", "Nhu cầu so với khả năng hỗ trợ", m.k11.map(r => `${r.provider.name}: ${r.load}/${r.capacity}`).join("; "), Object.keys(m.unassignedByType).length ? "Có nhu cầu chưa phân công" : "", KDEF.K11],
      ["K12", "Công sức vận hành", "Chưa tính", "Thu thập qua khảo sát người dùng sau thí điểm", "Thời gian dành cho cập nhật và điều phối; kèm phản hồi người dùng."]
    ];
    el.innerHTML = `
      <div class="page-head"><div><h1>Báo cáo chỉ số <span class="muted">· M08</span></h1>
        <p>Phạm vi: <b>${esc(s.unitId ? App.unitName(s.unitId) : "toàn bộ đơn vị thí điểm")}</b> · Kỳ <b>${T.fmt(s.from)} – ${T.fmt(s.to)}</b> · Ngày chốt <b>${T.fmt(s.cutoff)}</b> · Quy tắc v${esc(st.rulesVersion)}.
        Sự kiện trong kỳ (nộp, chấp nhận, xuất bản) không cộng thành tổng sản phẩm duy nhất. So với mức nền bằng 0, báo cáo chênh lệch tuyệt đối.</p></div>
        <div class="actions"><button class="btn" id="exp">Xuất CSV</button><button class="btn" onclick="window.print()">In</button></div></div>
      ${App.filtersBar()}
      <div class="table-wrap"><table><thead><tr><th>Mã</th><th>Chỉ số</th><th>Giá trị</th><th>Ghi chú / dữ liệu thiếu</th><th>Định nghĩa</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td class="code">${r[0]}</td><td><b>${esc(r[1])}</b></td><td>${esc(r[2])}</td><td><small>${esc(r[3])}</small></td><td><small>${esc(r[4])}</small></td></tr>`).join("")}</tbody></table></div>
      <h2 class="section-title">Chất lượng dữ liệu tại ngày chốt</h2>
      <div class="grid g4">
        <div class="tile"><div class="t-label">Hồ sơ chưa có việc tiếp theo</div><div class="t-value">${missing.noNext}</div></div>
        <div class="tile"><div class="t-label">Hồ sơ chưa có người phụ trách</div><div class="t-value">${missing.noOwner}</div></div>
        <div class="tile"><div class="t-label">Yêu cầu mở chưa xác nhận nguyên nhân</div><div class="t-value">${missing.noCause}</div></div>
        <div class="tile"><div class="t-label">Tạp chí cần xác minh</div><div class="t-value">${missing.unverifiedJournals}</div></div>
      </div>`;
    App.bindFilters(el);
    el.querySelector("#exp").onclick = () => download(`bao-cao-chi-so_${s.cutoff}.csv`, toCsv([
      ["Phạm vi", s.unitId ? App.unitName(s.unitId) : "Toàn bộ"], ["Kỳ", `${s.from} – ${s.to}`], ["Ngày chốt", s.cutoff], ["Phiên bản quy tắc", st.rulesVersion], [],
      ["Mã", "Chỉ số", "Giá trị", "Ghi chú", "Định nghĩa"], ...rows]));
  };

  /* ================= Lịch sử thay đổi ================= */
  App.views.history = function (el) {
    const data = App.data();
    const f = Object.assign({ type: "", entity: "", q: "" }, App.histFilter || {});
    App.histFilter = f;
    const list = data.events.filter(e => (!f.type || e.type === f.type) && (!f.entity || e.entityType === f.entity) && (!f.q || [e.entityId, e.reason, e.after, e.before].join(" ").toLowerCase().includes(f.q.toLowerCase())))
      .sort((a, b) => (b.recordedAt || "").localeCompare(a.recordedAt || ""));
    const ENT = [["projects", "Nghiên cứu"], ["manuscripts", "Bản thảo"], ["workItems", "Mốc công việc"], ["supports", "Yêu cầu hỗ trợ"], ["submissions", "Lần nộp"], ["journals", "Tạp chí"], ["publications", "Kết quả xuất bản"], ["providers", "Chuyên gia"], ["people", "Người dùng"], ["settings", "Cấu hình"]];
    el.innerHTML = `
      <div class="page-head"><div><h1>Lịch sử thay đổi</h1><p>Nhật ký sự kiện: hồ sơ bị tác động, giá trị trước/sau, ngày xảy ra thực tế và ngày nhập, người thực hiện, lý do, minh chứng và quan hệ đính chính.</p></div>
        <div class="actions"><button class="btn" id="exp">Xuất CSV</button></div></div>
      <form class="filters" id="hf"><label class="grow">Tìm<input name="q" value="${esc(f.q)}" placeholder="Mã hồ sơ, lý do, giá trị…"></label>
        <label>Đối tượng<select name="entity"><option value="">Tất cả</option>${ENT.map(([k, l]) => `<option value="${k}"${k === f.entity ? " selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Loại sự kiện<select name="type"><option value="">Tất cả</option>${Object.entries(App.EVENT_TYPES).map(([k, l]) => `<option value="${k}"${k === f.type ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label></form>
      <section class="card"><p class="muted" style="margin-top:0">${list.length} sự kiện${list.length > 300 ? " (hiển thị 300 gần nhất — xuất CSV để xem đủ)" : ""}</p>
        ${list.length ? `<ul class="timeline">${list.slice(0, 300).map(e => App.eventItem(e, true)).join("")}</ul>` : `<p class="empty">Chưa có dữ liệu</p>`}</section>`;
    const hf = el.querySelector("#hf");
    hf.addEventListener("change", () => { f.type = hf.elements.type.value; f.entity = hf.elements.entity.value; f.q = hf.elements.q.value; App.rerender(); });
    hf.elements.q.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); f.q = e.target.value; App.rerender(); } });
    App.bindCorrect(el);
    el.querySelector("#exp").onclick = () => download("nhat-ky-su-kien.csv", toCsv([["Mã sự kiện", "Đối tượng", "Mã hồ sơ", "Loại", "Trường", "Trước", "Sau", "Ngày xảy ra", "Thời điểm ghi", "Người ghi", "Lý do", "Minh chứng", "Đính chính sự kiện"],
      ...list.map(e => [e.id, e.entityType, e.entityId, App.EVENT_TYPES[e.type] || e.type, e.field, e.before, e.after, e.occurredAt, e.recordedAt, e.by, e.reason, e.evidenceUrl, e.correctsEventId])]));
  };

  /* ================= Cấu hình & dữ liệu ================= */
  const IMPORT = {
    projects: { label: "Nghiên cứu", cols: [
      ["id", "req"], ["title", "req"], ["shortTitle"], ["type", "enum:projectTypes"], ["unitId", "req ref:units"], ["leadId", "req ref:people"], ["memberIds", "list ref:people"], ["field"],
      ["route", "enum:routes"], ["intakeDate", "req date"], ["intakeStage", "req enum:projectStages"], ["stage", "enum:projectStages"], ["stageEnteredAt", "date"], ["status", "enum:workStatus"],
      ["statusReason"], ["nextAction"], ["nextDue", "date"], ["ownerId", "ref:people"], ["targetMilestone"], ["dateSource"], ["verifyLevel", "enum:verifyLevel"]],
      order: [["intakeDate", "stageEnteredAt", "Ngày vào giai đoạn trước ngày tiếp nhận"]],
      defaults: r => ({ stage: r.stage || r.intakeStage, stageEnteredAt: r.stageEnteredAt || r.intakeDate, status: r.status || "dang_thuc_hien", lastUpdate: r.stageEnteredAt || r.intakeDate, verifyLevel: r.verifyLevel || "nhap_lai", memberIds: r.memberIds || [] }) },
    manuscripts: { label: "Bản thảo", cols: [
      ["id", "req"], ["title", "req"], ["articleType", "enum:articleTypes"], ["projectIds", "list ref:projects"], ["unitId", "req ref:units"], ["correspondingId", "req ref:people"], ["authorIds", "list ref:people"],
      ["route", "enum:routes"], ["intakeDate", "req date"], ["stage", "req enum:manuscriptStages"], ["stageEnteredAt", "date"], ["status", "enum:workStatus"], ["version"], ["nextAction"], ["nextDue", "date"],
      ["ownerId", "ref:people"], ["dateSource"], ["verifyLevel", "enum:verifyLevel"]],
      order: [["intakeDate", "stageEnteredAt", "Ngày vào giai đoạn trước ngày tiếp nhận"]],
      defaults: r => ({ stageEnteredAt: r.stageEnteredAt || r.intakeDate, intakeStage: r.stage, status: r.status || "dang_thuc_hien", lastUpdate: r.stageEnteredAt || r.intakeDate, verifyLevel: r.verifyLevel || "nhap_lai", journalOptions: [], projectIds: r.projectIds || [], authorIds: r.authorIds || [] }) },
    supports: { label: "Yêu cầu hỗ trợ", cols: [
      ["id", "req"], ["parentId", "req ref:records"], ["requesterId", "req ref:people"], ["problem", "req"], ["supportType", "enum:supportTypes"], ["submittedAt", "req date"], ["status", "enum:supportStatus"],
      ["providerId", "ref:providers"], ["coordinatorId", "ref:people"], ["triagedAt", "date"], ["firstResponseAt", "date"], ["dueOriginal", "date"], ["deliveredAt", "date"], ["confirmedAt", "date"]],
      order: [["submittedAt", "triagedAt", "Ngày phân loại trước ngày gửi"], ["submittedAt", "dueOriginal", "Hạn hoàn thành trước ngày gửi"], ["submittedAt", "confirmedAt", "Ngày xác nhận trước ngày gửi"], ["deliveredAt", "confirmedAt", "Ngày xác nhận trước ngày bàn giao"]],
      defaults: r => { const p = App.find("projects", r.parentId) || App.find("manuscripts", r.parentId);
        return { status: r.status || "moi_gui", parentType: App.find("projects", r.parentId) ? "projects" : "manuscripts", unitId: p ? p.unitId : "" }; } },
    people: { label: "Người dùng", cols: [["id", "req"], ["name", "req"], ["unitId", "req ref:units"], ["roles", "list enum:roles"], ["expertise"], ["email"]],
      order: [], defaults: r => ({ active: true, roles: r.roles || [] }) }
  };

  function normDate(v) {
    if (!v) return "";
    let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return null;
  }
  function validateImport(kind, rows, mode) {
    const spec = IMPORT[kind], data = App.data();
    const header = rows[0].map(h => h.trim());
    const missingCols = spec.cols.filter(([c, r]) => (r || "").includes("req") && !header.includes(c)).map(([c]) => c);
    if (missingCols.length) return { fatal: `Thiếu cột bắt buộc: ${missingCols.join(", ")}. Hãy dùng tệp mẫu.` };
    const seen = new Set(), results = [];
    rows.slice(1).forEach((cells, i) => {
      const raw = {}; header.forEach((h, k) => { raw[h] = (cells[k] || "").trim(); });
      const rec = {}, errs = [];
      spec.cols.forEach(([c, rule = ""]) => {
        let v = raw[c] == null ? "" : raw[c];
        const isList = rule.includes("list");
        let vals = isList ? v.split(/[;|]/).map(x => x.trim()).filter(Boolean) : [v];
        if (rule.includes("req") && !v) errs.push(`thiếu ${c}`);
        if (v && rule.includes("date")) { const d = normDate(v); if (d === null) errs.push(`${c} không đúng định dạng ngày (YYYY-MM-DD hoặc DD/MM/YYYY)`); else v = d; vals = [v]; }
        const en = rule.match(/enum:(\w+)/);
        if (v && en) vals = vals.map(x => { if (dict[en[1]][x]) return x; const hit = D[en[1]].find(([, l]) => l.toLowerCase() === x.toLowerCase()); if (hit) return hit[0]; errs.push(`${c} “${x}” không thuộc danh mục`); return x; });
        const rf = rule.match(/ref:(\w+)/);
        if (v && rf) vals.forEach(x => { const ok = rf[1] === "records" ? (App.find("projects", x) || App.find("manuscripts", x)) : App.find(rf[1], x); if (!ok) errs.push(`${c} “${x}” không tồn tại`); });
        rec[c] = isList ? vals : (en ? vals[0] : v);
      });
      if (rec.id) {
        if (seen.has(rec.id)) errs.push(`mã ${rec.id} trùng trong tệp`);
        seen.add(rec.id);
        if (App.find(kind, rec.id) && mode !== "update") errs.push(`mã ${rec.id} đã có trong hệ thống`);
      }
      spec.order.forEach(([a, b, msg]) => { if (rec[a] && rec[b] && rec[b] < rec[a]) errs.push(msg); });
      results.push({ line: i + 2, rec, errs, exists: !!(rec.id && App.find(kind, rec.id)) });
    });
    return { results };
  }

  App.views.config = function (el, _m, q) {
    const tab = q.tab || "nguong";
    const data = App.data(), st = App.settings();
    const TABS = [["nguong", "Ngưỡng & lịch làm việc"], ["nguoi-dung", "Người dùng & vai trò"], ["don-vi", "Đơn vị"], ["du-lieu", "Nhập / xuất dữ liệu"], ["tai-khoan", "Tài khoản"]];
    let body = "";
    if (tab === "nguong") {
      body = `<section class="card"><h2>Ngưỡng cảnh báo và lịch ngày làm việc</h2><p class="card-sub">Các ngưỡng là đề xuất trong đặc tả, cần đơn vị chốt. Mọi thay đổi được ghi vào lịch sử. Múi giờ: Asia/Ho_Chi_Minh.</p>
        <form id="sf">${formHtml(App.SETTINGS_FIELDS, Object.assign({}, st, { holidays: (st.holidays || []).join("\n") }))}<div style="margin-top:12px"><button class="btn primary">Lưu cấu hình</button></div></form></section>`;
    } else if (tab === "nguoi-dung") {
      body = `<section class="card"><div class="card-head"><h2>Người dùng và vai trò</h2><button class="btn primary sm" id="addPerson">+ Người dùng</button></div>
        <p class="card-sub">Một người có thể mang nhiều vai trò. Bản MVP dùng một tài khoản quản trị; phân quyền theo vai trò và phạm vi khoa/hồ sơ thực hiện ở giai đoạn tiếp theo cùng Supabase.</p>
        <div class="table-wrap"><table><thead><tr><th>Mã</th><th>Họ tên</th><th>Đơn vị</th><th>Vai trò</th><th>Chuyên môn</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        ${data.people.map(p => `<tr><td class="code">${esc(p.id)}</td><td>${esc(p.name)}</td><td>${esc(App.unitName(p.unitId))}</td><td>${(p.roles || []).map(r => esc(label("roles", r))).join(", ")}</td><td>${esc(p.expertise || "")}</td>
          <td>${p.active === false ? '<span class="tag tag-muted">Ngừng</span>' : '<span class="tag tag-good">Hoạt động</span>'}</td><td><button class="btn sm" data-person="${esc(p.id)}">Sửa</button></td></tr>`).join("")}</tbody></table></div></section>`;
    } else if (tab === "don-vi") {
      body = `<section class="card"><div class="card-head"><h2>Khoa / đơn vị</h2><button class="btn primary sm" id="addUnit">+ Đơn vị</button></div>
        <div class="table-wrap"><table><thead><tr><th>Mã</th><th>Ký hiệu</th><th>Tên</th><th class="num">Người</th><th class="num">Hồ sơ</th><th></th></tr></thead><tbody>
        ${data.units.map(u => `<tr><td class="code">${esc(u.id)}</td><td>${esc(u.code)}</td><td>${esc(u.name)}</td><td class="num">${data.people.filter(p => p.unitId === u.id).length}</td>
          <td class="num">${data.projects.filter(p => p.unitId === u.id).length + data.manuscripts.filter(p => p.unitId === u.id).length}</td><td><button class="btn sm" data-unit="${esc(u.id)}">Sửa</button></td></tr>`).join("")}</tbody></table></div></section>`;
    } else if (tab === "du-lieu") {
      const isStatic = window.Store.mode === "static";
      const dirty = window.Store.isDirty();
      body = `${isStatic ? `<section class="card" style="margin-bottom:16px"><h2>Xuất bản dữ liệu (chế độ tệp tĩnh)</h2>
          <p>${dirty ? '<span class="tag tag-warn">● Có thay đổi chưa xuất bản</span> Các thay đổi đang nằm trong bản nháp của trình duyệt này.' : '<span class="tag tag-good">✓ Bản nháp trùng với bản đã xuất bản</span>'}</p>
          <ol style="padding-left:18px"><li>Bấm <b>Tải data.json</b>.</li><li>Mở trang tải lên GitHub, kéo tệp vào thư mục <code>data/</code> (ghi đè tệp cũ) và bấm <i>Commit changes</i>.</li><li>Sau 1–2 phút, GitHub Pages cập nhật; mọi máy sẽ thấy dữ liệu mới.</li></ol>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="pub">Tải data.json</button>
          <a class="btn" href="${esc(CFG.REPO_URL)}/upload/${esc(CFG.REPO_BRANCH)}/data" target="_blank" rel="noopener">Mở trang tải lên GitHub ↗</a>
          <button class="btn ghost" id="discard"${dirty ? "" : " disabled"}>Hủy bản nháp, tải lại bản đã xuất bản</button></div>
          <p class="muted" style="font-size:12px">Chế độ tệp tĩnh chỉ phù hợp cho thử nghiệm với dữ liệu giả định: ai có đường dẫn đều tải được data.json. Dữ liệu thật cần chế độ Supabase (xem README).</p></section>` : ""}
        <section class="card" style="margin-bottom:16px"><h2>Nhập từ tệp CSV (có kiểm tra từng dòng)</h2>
          <p class="card-sub">Tệp CSV UTF-8 (Excel: Lưu thành › CSV UTF-8). Dòng đầu là tên cột như tệp mẫu. Danh mục nhận mã hoặc nhãn tiếng Việt; danh sách phân tách bằng dấu “;”. Có lỗi thì không ghi dòng nào — sửa tệp rồi kiểm tra lại.</p>
          <form class="filters" id="imf" style="margin-bottom:0"><label>Loại dữ liệu<select name="kind">${Object.entries(IMPORT).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select></label>
            <label>Khi trùng mã<select name="mode"><option value="new">Báo lỗi (chỉ thêm mới)</option><option value="update">Cập nhật bản ghi cũ</option></select></label>
            <label class="grow">Tệp CSV<input type="file" name="file" accept=".csv,text/csv"></label>
            <button type="button" class="btn" id="tpl">Tải tệp mẫu</button><button type="button" class="btn primary" id="chk">Kiểm tra</button></form>
          <div id="imres"></div></section>
        <section class="card"><h2>Sao lưu và khôi phục</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="bk">Tải bản sao lưu (JSON)</button><label class="btn">Khôi phục từ JSON<input type="file" id="restore" accept=".json,application/json" hidden></label>
          ${data.meta && data.meta.sample ? `<button class="btn danger" id="clearSample">Xóa toàn bộ dữ liệu minh họa</button>` : ""}</div>
          <p class="muted" style="font-size:12px">Khôi phục sẽ thay thế toàn bộ dữ liệu hiện tại. Xóa dữ liệu minh họa giữ lại cấu hình ngưỡng và lịch ngày nghỉ.</p></section>`;
    } else if (tab === "tai-khoan") {
      body = `<section class="card"><h2>Đổi mật khẩu</h2>
        <form id="pwf" style="max-width:420px;display:grid;gap:10px">${window.Store.mode === "static" ? `<div class="field"><label for="op">Mật khẩu hiện tại</label><input id="op" type="password" autocomplete="current-password" required></div>` : ""}
          <div class="field"><label for="np">Mật khẩu mới (ít nhất 8 ký tự)</label><input id="np" type="password" autocomplete="new-password" minlength="8" required></div>
          <div class="field"><label for="np2">Nhập lại</label><input id="np2" type="password" autocomplete="new-password" required></div>
          <button class="btn primary">Đổi mật khẩu</button></form><div id="pwres"></div></section>`;
    }
    el.innerHTML = `<div class="page-head"><div><h1>Cấu hình và dữ liệu</h1><p>Danh mục, ngưỡng cảnh báo, lịch ngày làm việc, tài khoản và nhập/xuất dữ liệu.</p></div></div>
      <div class="seg" role="tablist" style="margin-bottom:16px;flex-wrap:wrap">${TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-pressed="${k === tab}" aria-selected="${k === tab}">${esc(l)}</button>`).join("")}</div>${body}`;
    el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => App.go("#/cau-hinh?tab=" + b.dataset.tab));

    if (tab === "nguong") el.querySelector("#sf").addEventListener("submit", async e => {
      e.preventDefault();
      const v = readForm(e.target, App.SETTINGS_FIELDS);
      const hol = v.holidays.split(/[\s,;]+/).map(normDate).filter(Boolean).sort();
      const next = Object.assign({}, data.settings, v, { holidays: hol });
      ["cb01Days", "cb02Days", "triageWorkdays", "cb05Workdays", "cb06Days", "journalReviewDays"].forEach(k => { if (!(next[k] >= 0)) next[k] = DEFAULT_SETTINGS[k]; });
      const evs = Object.keys(next).filter(k => k !== "closedAlerts" && JSON.stringify(next[k]) !== JSON.stringify(data.settings[k])).map(k => ({
        id: "E-" + Date.now().toString(36) + k, entityType: "settings", entityId: "settings", type: "cau_hinh", field: k, before: JSON.stringify(data.settings[k] ?? ""), after: JSON.stringify(next[k]),
        occurredAt: App.state.cutoff, recordedAt: new Date().toISOString(), by: App.who(), reason: "Đổi cấu hình ngưỡng / lịch", evidenceUrl: "", correctsEventId: "" }));
      await window.Store.saveSettings(next);
      if (evs.length) await window.Store.saveMany("events", evs);
      done(evs.length ? "Đã lưu cấu hình." : "Không có thay đổi.");
    });
    if (tab === "nguoi-dung") {
      el.querySelector("#addPerson").onclick = () => forms.person();
      el.querySelectorAll("[data-person]").forEach(b => b.onclick = () => forms.person(b.dataset.person));
    }
    if (tab === "don-vi") {
      el.querySelector("#addUnit").onclick = () => forms.unit();
      el.querySelectorAll("[data-unit]").forEach(b => b.onclick = () => forms.unit(b.dataset.unit));
    }
    if (tab === "du-lieu") bindData(el);
    if (tab === "tai-khoan") el.querySelector("#pwf").addEventListener("submit", async e => {
      e.preventDefault();
      const res = el.querySelector("#pwres");
      const np = el.querySelector("#np").value, np2 = el.querySelector("#np2").value;
      try {
        if (np.length < 8) throw new Error("Mật khẩu mới cần ít nhất 8 ký tự.");
        if (np !== np2) throw new Error("Hai lần nhập không khớp.");
        const h = await window.Store.changePassword(el.querySelector("#op") ? el.querySelector("#op").value : "", np);
        res.innerHTML = h ? `<div class="banner" style="margin-top:12px"><b>Đã đổi trên trình duyệt này.</b> Để áp dụng cho mọi máy, thay <code>passwordSha256</code> trong <code>assets/js/config.js</code> bằng:<br><code style="word-break:break-all">${esc(h)}</code></div>`
          : `<p class="tag tag-good" style="margin-top:12px">✓ Đã đổi mật khẩu.</p>`;
        e.target.reset();
      } catch (ex) { res.innerHTML = `<p class="form-error" style="margin:12px 0 0">${esc(ex.message)}</p>`; }
    });
  };

  App.SETTINGS_FIELDS = [
    { name: "cb01Days", label: "CB01 — số ngày không cập nhật nghiệp vụ", type: "number", min: 1, required: true },
    { name: "cb02Days", label: "CB02 — số ngày lịch trước hạn sửa bài", type: "number", min: 0, required: true },
    { name: "triageWorkdays", label: "CB03/K03 — hạn tiếp nhận, phân loại (ngày làm việc)", type: "number", min: 1, required: true },
    { name: "cb05Workdays", label: "CB05 — rà soát phương án sau từ chối (ngày làm việc)", type: "number", min: 1, required: true },
    { name: "cb06Days", label: "CB06 — số ngày ở một giai đoạn coi là đình trệ", type: "number", min: 1, required: true },
    { name: "journalReviewDays", label: "CB08 — chu kỳ rà soát tạp chí (ngày)", type: "number", min: 1, required: true },
    { name: "rulesVersion", label: "Phiên bản bộ quy tắc", required: true },
    { name: "holidays", label: "Ngày nghỉ (mỗi dòng một ngày, YYYY-MM-DD hoặc DD/MM/YYYY); thứ Bảy, Chủ nhật luôn là ngày nghỉ", type: "textarea", rows: 6 }
  ];

  function bindData(el) {
    const data = App.data();
    const pub = el.querySelector("#pub");
    if (pub) pub.onclick = () => { download("data.json", JSON.stringify(window.Store.exportForPublish(), null, 1), "application/json"); toast("Đã tải data.json — hãy đưa lên GitHub để xuất bản."); };
    const disc = el.querySelector("#discard");
    if (disc) disc.onclick = () => confirmBox("Hủy bản nháp", "Mọi thay đổi chưa xuất bản trên trình duyệt này sẽ mất. Tiếp tục?", async () => { window.Store.discardDraft(); done("Đã tải lại bản đã xuất bản."); }, "Hủy bản nháp");
    el.querySelector("#bk").onclick = () => download(`sao-luu_${App.state.cutoff}.json`, JSON.stringify(data, null, 1), "application/json");
    el.querySelector("#restore").onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      file.text().then(txt => {
        let obj; try { obj = JSON.parse(txt); } catch (ex) { toast("Tệp JSON không hợp lệ.", "crit"); return; }
        if (!obj || !Array.isArray(obj.projects)) { toast("Tệp không đúng cấu trúc sao lưu.", "crit"); return; }
        confirmBox("Khôi phục dữ liệu", `Thay toàn bộ dữ liệu hiện tại bằng “${file.name}”?`, async () => { await window.Store.replaceAll(obj); done("Đã khôi phục."); }, "Khôi phục");
      });
    };
    const cs = el.querySelector("#clearSample");
    if (cs) cs.onclick = () => confirmBox("Xóa dữ liệu minh họa", "Xóa toàn bộ hồ sơ, người, chuyên gia, tạp chí, yêu cầu và nhật ký minh họa? Cấu hình ngưỡng được giữ lại.", async () => {
      const keep = Object.assign({}, data.settings, { closedAlerts: [] });
      await window.Store.replaceAll({ meta: { version: 1, sample: false }, settings: keep });
      done("Đã xóa dữ liệu minh họa. Bắt đầu bằng Đơn vị và Người dùng.");
    }, "Xóa");

    const f = el.querySelector("#imf"), out = el.querySelector("#imres");
    f.querySelector("#tpl").onclick = () => {
      const kind = f.elements.kind.value, spec = IMPORT[kind];
      const ex = { projects: ["NC-99", "Tên nghiên cứu", "Tên rút gọn", "noi_bo", (data.units[0] || {}).id || "u-...", (data.people[0] || {}).id || "p..", "", "Lĩnh vực", "moi", "2026-10-01", "de_cuong", "", "", "dang_thuc_hien", "", "Việc tiếp theo", "2026-11-15", "", "", "", "tu_khai"],
        manuscripts: ["MS-999", "Tên bản thảo", "nghien_cuu_goc", "", (data.units[0] || {}).id || "u-...", (data.people[0] || {}).id || "p..", "", "co_san", "2026-10-01", "viet_bai", "", "dang_thuc_hien", "v0.1", "", "", "", "", "tu_khai"],
        supports: ["YC-999", (data.projects[0] || {}).id || "NC-..", (data.people[0] || {}).id || "p..", "Mô tả vấn đề", "thong_ke", "2026-10-20", "moi_gui", "", "", "", "", "", "", ""],
        people: ["p99", "TS. Họ Tên", (data.units[0] || {}).id || "u-...", "giang_vien; chu_nhiem", "Chuyên môn", "email@truong.edu.vn"] }[kind];
      download(`mau_${kind}.csv`, toCsv([spec.cols.map(([c]) => c), ex]));
    };
    f.querySelector("#chk").onclick = async () => {
      const file = f.elements.file.files[0];
      if (!file) { toast("Chọn tệp CSV trước.", "crit"); return; }
      const kind = f.elements.kind.value, mode = f.elements.mode.value;
      const rows = parseCsv(await file.text());
      if (rows.length < 2) { out.innerHTML = `<p class="form-error" style="margin:12px 0 0">Tệp không có dòng dữ liệu.</p>`; return; }
      const res = validateImport(kind, rows, mode);
      if (res.fatal) { out.innerHTML = `<p class="form-error" style="margin:12px 0 0">${esc(res.fatal)}</p>`; return; }
      const bad = res.results.filter(r => r.errs.length);
      out.innerHTML = `<div style="margin-top:12px"><p><b>${res.results.length}</b> dòng · <span class="tag tag-good">✓ ${res.results.length - bad.length} hợp lệ</span> ${bad.length ? `<span class="tag tag-crit">! ${bad.length} lỗi</span>` : ""}</p>
        <div class="table-wrap"><table><thead><tr><th class="num">Dòng</th><th>Mã</th><th>Kết quả</th></tr></thead><tbody>${res.results.map(r => `<tr><td class="num">${r.line}</td><td class="code">${esc(r.rec.id)}</td>
          <td>${r.errs.length ? `<span class="tag tag-crit">Lỗi</span> ${esc(r.errs.join("; "))}` : `<span class="tag tag-good">✓ ${r.exists ? "Cập nhật" : "Thêm mới"}</span>`}</td></tr>`).join("")}</tbody></table></div>
        <div style="margin-top:10px"><button class="btn primary" id="commit"${bad.length ? " disabled" : ""}>Ghi ${res.results.length} dòng vào hệ thống</button> ${bad.length ? '<small class="muted">Sửa các dòng lỗi rồi kiểm tra lại.</small>' : ""}</div></div>`;
      const cm = out.querySelector("#commit");
      if (cm && !bad.length) cm.onclick = async () => {
        const spec = IMPORT[kind];
        const recs = res.results.map(r => Object.assign({}, r.exists ? App.find(kind, r.rec.id) : {}, r.rec, spec.defaults(r.rec)));
        await window.Store.saveMany(kind, recs);
        await window.Store.saveMany("events", recs.map((r, i) => ({ id: "E-" + Date.now().toString(36) + i, entityType: kind, entityId: r.id, type: "nhap_tep", field: "", before: "", after: file.name,
          occurredAt: App.state.cutoff, recordedAt: new Date().toISOString(), by: App.who(), reason: `Nhập từ tệp ${file.name}, dòng ${res.results[i].line}`, evidenceUrl: "", correctsEventId: "" })));
        done(`Đã nhập ${recs.length} dòng.`);
      };
    };
  }

  forms.person = function (pid) {
    const p = pid ? App.find("people", pid) : null;
    const fields = [{ name: "id", label: "Mã", readonly: !!p, required: true }, { name: "name", label: "Họ tên (kèm học hàm, học vị)", required: true },
      { name: "unitId", label: "Đơn vị", type: "select", options: App.options.units(), required: true }, { name: "expertise", label: "Chuyên môn" }, { name: "email", label: "Email", type: "email" },
      { name: "roles", label: "Vai trò", type: "multi", options: D.roles }, { name: "active", label: "Tài khoản đang hoạt động", type: "checkbox", help: "Bỏ chọn khi người dùng thay đổi nhiệm vụ (thu hồi quyền); lịch sử được giữ" }];
    modal({ title: p ? "Sửa người dùng" : "Thêm người dùng", wide: true, body: formHtml(fields, p || { id: App.nextId("people", "p", 2), active: true, roles: ["giang_vien"] }), onSubmit: async f => {
      const v = readForm(f, fields);
      if (!p && App.find("people", v.id)) throw new Error("Mã đã tồn tại.");
      await App.saveRecord("people", Object.assign({}, p || {}, v));
      done("Đã lưu người dùng.");
    } });
  };
  forms.unit = function (uid) {
    const u = uid ? App.find("units", uid) : null;
    const fields = [{ name: "id", label: "Mã", readonly: !!u, required: true }, { name: "code", label: "Ký hiệu", required: true }, { name: "name", label: "Tên đơn vị", required: true, full: true }];
    modal({ title: u ? "Sửa đơn vị" : "Thêm đơn vị", body: formHtml(fields, u || { id: "u-" }), onSubmit: async f => {
      const v = readForm(f, fields);
      if (!u && App.find("units", v.id)) throw new Error("Mã đã tồn tại.");
      await App.saveRecord("units", Object.assign({}, u || {}, v));
      done("Đã lưu đơn vị.");
    } });
  };
})();
