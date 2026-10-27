/* M05 Tổng quan điều hành và M01 Công việc nghiên cứu của tôi. */
(function () {
  const App = window.App;
  const { T, D, label, metrics, alerts, median, supportFacts, SUPPORT_OPEN } = window.Domain;
  const { esc, NA, workBadge, supportBadge, stageBadge, dueBadge, defBox, STATUS_SLOT } = window.UI;

  const KDEF = {
    K01: "Số mã nghiên cứu hoặc bản thảo thuộc phạm vi thí điểm tại ngày chốt (không tính nghiên cứu đã kết thúc và bản thảo đã xuất bản).",
    K02: "Số hồ sơ duy nhất có ít nhất một vấn đề đang mở đã được xác nhận nguyên nhân; số vấn đề báo cáo riêng.",
    K03: "Yêu cầu được tiếp nhận/phân loại đúng hạn ÷ tất cả yêu cầu có hạn tiếp nhận rơi trong kỳ (yêu cầu quá hạn còn mở vẫn ở mẫu số; yêu cầu đóng do rút/trùng tách riêng).",
    K04: "Yêu cầu hoàn thành đạt đầu ra đúng hạn ÷ tất cả yêu cầu có hạn hoàn thành rơi trong kỳ. Tính theo cả hạn ban đầu và hạn điều chỉnh.",
    K05: "Trung vị số ngày lịch từ gửi yêu cầu đến xác nhận hoàn thành, của yêu cầu hoàn thành trong kỳ; kèm tuổi của yêu cầu còn mở.",
    K07: "Số manuscript_id khác nhau có sự kiện nộp hợp lệ trong kỳ; số lần nộp là chỉ số riêng.",
    K08: "Số manuscript_id có quyết định chấp nhận trong kỳ.",
    K09: "Số sản phẩm đã đối soát (phiên bản chính thức, đã xác minh, không trùng DOI) có ngày xuất bản chính thức trong kỳ.",
    K10: "Tạm tính: giảng viên phụ trách công việc có cập nhật trạng thái trong kỳ. Định nghĩa đóng góp do đơn vị thống nhất.",
    K11: "Số yêu cầu đang nhận (đã phân công → chờ xác nhận) so với khả năng nhận việc đã khai báo của từng đầu mối."
  };
  App.KDEF = KDEF;

  const pct = ({ num, den }) => den ? Math.round(num / den * 100) + "%" : "—";
  const n = v => v == null ? "—" : (Math.round(v * 10) / 10).toLocaleString("vi-VN");

  function tile(code, lab, value, sub, href) {
    return `<div class="tile"><div class="t-label">${esc(lab)} ${code ? defBox(code, KDEF[code] || "") : ""}</div>
      <div class="t-value">${value}</div>${sub ? `<div class="t-sub">${sub}</div>` : ""}${href ? `<a class="t-link" href="${href}" aria-label="Xem chi tiết: ${esc(lab)}"></a>` : ""}</div>`;
  }

  /* Thanh xếp chồng theo tình trạng, cho mỗi giai đoạn */
  function stageStatusChart(records, kind, max) {
    const stages = kind === "projects" ? D.projectStages : D.manuscriptStages;
    return stages.map(([sk, sl]) => {
      const rows = records.filter(r => r.stage === sk);
      const segs = D.workStatus.map(([wk, wl]) => {
        const c = rows.filter(r => r.status === wk).length;
        if (!c) return "";
        return `<span class="bar-seg" tabindex="0" style="width:${c / max * 100}%;background:var(--s${STATUS_SLOT[wk]})"
          data-tip="<b>${esc(sl)}</b><br>${esc(wl)}: ${c} hồ sơ" aria-label="${esc(sl)}, ${esc(wl)}: ${c}"></span>`;
      }).join("");
      return `<div class="hbar"><span class="lab" title="${esc(sl)}">${esc(sl)}</span><div class="bar-track">${segs}</div><span class="val">${rows.length}</span></div>`;
    }).join("");
  }
  const statusLegend = () => `<div class="legend">${D.workStatus.map(([k, l]) => `<span><i style="background:var(--s${STATUS_SLOT[k]})"></i>${esc(l)}</span>`).join("")}</div>`;

  function stageStatusTable(records, kind) {
    const stages = kind === "projects" ? D.projectStages : D.manuscriptStages;
    return `<table><thead><tr><th>Giai đoạn</th>${D.workStatus.map(([, l]) => `<th class="num">${esc(l)}</th>`).join("")}<th class="num">Tổng</th></tr></thead><tbody>
      ${stages.map(([sk, sl]) => { const rows = records.filter(r => r.stage === sk);
        return `<tr><td>${esc(sl)}</td>${D.workStatus.map(([wk]) => `<td class="num">${rows.filter(r => r.status === wk).length}</td>`).join("")}<td class="num">${rows.length}</td></tr>`; }).join("")}
      </tbody></table>`;
  }

  function filtersBar(withPeriod = true) {
    const s = App.state;
    return `<form class="filters" id="flt" aria-label="Bộ lọc">
      <label>Đơn vị<select name="unitId"><option value="">Toàn trường (phạm vi thí điểm)</option>${App.options.units().map(([v, l]) => `<option value="${esc(v)}"${v === s.unitId ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      ${withPeriod ? `<label>Kỳ theo dõi từ<input type="date" name="from" value="${s.from}"></label><label>đến<input type="date" name="to" value="${s.to}"></label>` : ""}
      <label>Ngày chốt dữ liệu<input type="date" name="cutoff" value="${s.cutoff}"></label>
    </form>`;
  }
  function bindFilters(el) {
    const f = el.querySelector("#flt");
    if (!f) return;
    f.addEventListener("change", () => {
      ["unitId", "from", "to", "cutoff"].forEach(k => { if (f.elements[k] && (f.elements[k].value || k === "unitId")) App.state[k] = f.elements[k].value; });
      if (App.state.from > App.state.to) [App.state.from, App.state.to] = [App.state.to, App.state.from];
      App.rerender();
    });
  }
  App.filtersBar = filtersBar; App.bindFilters = bindFilters;

  function toggleTables(el) {
    el.querySelectorAll("[data-toggle-table]").forEach(btn => btn.addEventListener("click", () => {
      const card = btn.closest(".card");
      const showTable = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", showTable);
      btn.textContent = showTable ? "Xem biểu đồ" : "Xem bảng số liệu";
      card.querySelector(".viz").hidden = showTable;
      card.querySelector(".tbl").hidden = !showTable;
    }));
  }
  App.toggleTables = toggleTables;

  /* ================= M05 ================= */
  App.views.overview = function (el) {
    const s = App.state, data = App.data();
    const m = metrics(data, s);
    const al = alerts(data, s.cutoff).filter(a => !s.unitId || !a.ref || ["projects", "manuscripts", "supports"].indexOf(a.ref.col) < 0 || (App.find(a.ref.col, a.ref.id) || {}).unitId === s.unitId);
    const projects = m.projects, manuscripts = m.manuscripts;
    const max = Math.max(1, ...D.projectStages.map(([k]) => projects.filter(p => p.stage === k).length), ...D.manuscriptStages.map(([k]) => manuscripts.filter(x => x.stage === k).length));

    // Điểm nghẽn phổ biến: yêu cầu mở theo loại
    const open = m.supports.filter(x => m.facts.get(x.id).open);
    const byType = D.supportTypes.map(([k, l]) => {
      const list = open.filter(x => (x.supportType || "khac") === k);
      return { k, l, count: list.length, medAge: median(list.map(x => m.facts.get(x.id).ageDays)), blocking: list.filter(x => x.blocking === "cao").length,
               records: new Set(list.map(x => x.parentId)).size };
    }).filter(r => r.count).sort((a, b) => b.count - a.count);
    const maxType = Math.max(1, ...byType.map(r => r.count));

    // Nguồn lực cần quyết định
    const decisions = [];
    m.k11.filter(r => r.capacity && r.load > r.capacity).forEach(r => decisions.push(`Phân tải hoặc bổ sung người cho <b>${esc(r.provider.name)}</b>: đang nhận ${r.load}/${r.capacity} yêu cầu.`));
    Object.entries(m.unassignedByType).forEach(([k, c]) => {
      const has = data.providers.some(p => p.active !== false && (p.supportTypes || []).includes(k));
      if (!has) decisions.push(`Chưa có đầu mối cho loại hỗ trợ <b>${esc(label("supportTypes", k))}</b> (${c} yêu cầu chưa phân công).`);
    });
    const waitingInternal = [...projects, ...manuscripts].filter(r => r.status === "cho_noi_bo");
    if (waitingInternal.length) decisions.push(`${waitingInternal.length} hồ sơ đang <b>chờ hỗ trợ nội bộ</b>: ${waitingInternal.map(r => esc(r.id)).join(", ")}.`);
    const paused = [...projects, ...manuscripts].filter(r => r.status === "tam_dung");
    if (paused.length) decisions.push(`${paused.length} hồ sơ <b>tạm dừng có lý do</b> cần rà soát điều kiện tiếp tục: ${paused.map(r => esc(r.id)).join(", ")}.`);

    const periodText = `Kỳ ${T.fmt(s.from)} – ${T.fmt(s.to)}`;
    el.innerHTML = `
      <div class="page-head"><div><h1>Tổng quan điều hành <span class="muted">· M05</span></h1>
        <p>Ảnh chụp trạng thái tại ngày chốt <b>${T.fmt(s.cutoff)}</b> và các sự kiện trong ${periodText.toLowerCase()}. Phạm vi: ${esc(s.unitId ? App.unitName(s.unitId) : "toàn bộ đơn vị thí điểm")}. Quy tắc phiên bản ${esc(m.settings.rulesVersion)}.</p></div>
        <div class="actions"><a class="btn" href="#/bao-cao">Báo cáo chỉ số</a><button class="btn" onclick="window.print()">In</button></div></div>
      ${filtersBar()}

      <h2 class="section-title">Ảnh chụp trạng thái <span>tại ${T.fmt(s.cutoff)}</span></h2>
      <div class="grid g4">
        ${tile("K01", "Nghiên cứu đang theo dõi", m.k01.projects, `${projects.length} mã trong phạm vi`, "#/ho-so?tab=projects")}
        ${tile("K01", "Bản thảo đang theo dõi", m.k01.manuscripts, `${manuscripts.filter(x => x.stage === "xuat_ban").length} đã xuất bản (không tính)`, "#/ho-so?tab=manuscripts")}
        ${tile("K02", "Hồ sơ có điểm nghẽn đã xác nhận", m.k02.records, `${m.k02.issues} vấn đề đang mở`, "#/hang-doi")}
        ${tile("", "Cảnh báo cần xử lý", al.length, `${[...new Set(al.map(a => a.code))].length} loại cảnh báo`, "#/canh-bao")}
      </div>

      <div class="grid g2" style="margin-top:16px">
        <section class="card"><div class="card-head"><h2>Hồ sơ theo giai đoạn và tình trạng</h2><button class="btn sm" data-toggle-table aria-pressed="false">Xem bảng số liệu</button></div>
          <p class="card-sub">Chờ bên ngoài (tạp chí, đối tác) được tách khỏi chờ hỗ trợ nội bộ.</p>
          <div class="viz">${statusLegend()}<div class="block-label">Nghiên cứu</div><div class="hbars">${stageStatusChart(projects, "projects", max)}</div>
            <div class="block-label" style="margin-top:14px">Bản thảo</div><div class="hbars">${stageStatusChart(manuscripts, "manuscripts", max)}</div></div>
          <div class="tbl" hidden><div class="block-label">Nghiên cứu</div><div class="table-wrap">${stageStatusTable(projects, "projects")}</div>
            <div class="block-label" style="margin-top:14px">Bản thảo</div><div class="table-wrap">${stageStatusTable(manuscripts, "manuscripts")}</div></div>
        </section>
        <section class="card"><div class="card-head"><h2>Điểm nghẽn phổ biến</h2><button class="btn sm" data-toggle-table aria-pressed="false">Xem bảng số liệu</button></div>
          <p class="card-sub">Yêu cầu hỗ trợ còn mở theo loại, tại ngày chốt. Tuổi = số ngày lịch từ khi gửi.</p>
          <div class="viz">${byType.length ? `<div class="hbars">${byType.map(r => `<div class="hbar"><span class="lab" title="${esc(r.l)}">${esc(r.l)}</span>
              <div class="bar-track"><span class="bar-seg" tabindex="0" style="width:${r.count / maxType * 100}%;background:var(--s1)" data-tip="<b>${esc(r.l)}</b><br>${r.count} yêu cầu mở · ${r.records} hồ sơ<br>Tuổi trung vị ${n(r.medAge)} ngày · ${r.blocking} chặn mốc"></span></div>
              <span class="val">${r.count}</span></div>`).join("")}</div>` : `<p class="empty">Không có yêu cầu mở.</p>`}</div>
          <div class="tbl" hidden><div class="table-wrap"><table><thead><tr><th>Loại hỗ trợ</th><th class="num">Yêu cầu mở</th><th class="num">Hồ sơ liên quan</th><th class="num">Tuổi trung vị (ngày)</th><th class="num">Chặn mốc</th></tr></thead>
            <tbody>${byType.map(r => `<tr><td>${esc(r.l)}</td><td class="num">${r.count}</td><td class="num">${r.records}</td><td class="num">${n(r.medAge)}</td><td class="num">${r.blocking}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Chưa có dữ liệu</td></tr>`}</tbody></table></div></div>
        </section>
      </div>

      <h2 class="section-title">Hỗ trợ trong kỳ <span>${periodText}</span></h2>
      <div class="grid g4">
        ${tile("K03", "Tiếp nhận/phân loại đúng hạn", pct(m.k03), `${m.k03.num}/${m.k03.den} yêu cầu có hạn trong kỳ`)}
        ${tile("K04", "Hoàn thành đúng hạn (hạn ban đầu)", pct(m.k04.orig), `${m.k04.orig.num}/${m.k04.orig.den} · theo hạn điều chỉnh: ${pct(m.k04.adj)} (${m.k04.adj.num}/${m.k04.adj.den})`)}
        ${tile("K05", "Thời gian giải quyết (trung vị)", m.k05.median == null ? "—" : `${n(m.k05.median)} <small>ngày</small>`, `${m.k05.count} yêu cầu hoàn thành trong kỳ`)}
        ${tile("", "Yêu cầu còn mở", m.k05.openCount, `Tuổi trung vị ${n(m.k05.openMedianAge)} ngày · lâu nhất ${n(m.k05.openMaxAge)} ngày`, "#/hang-doi")}
      </div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">${m.k04.closed} yêu cầu đóng có lý do (rút/trùng/không tiếp tục) trong kỳ được báo cáo riêng, không tính là hoàn thành.</p>

      <div class="grid g2" style="margin-top:16px">
        <section class="card"><div class="card-head"><h2>Nhu cầu so với khả năng hỗ trợ</h2>${defBox("K11", KDEF.K11)}</div>
          ${m.k11.map(r => { const over = r.capacity && r.load > r.capacity; const w = r.capacity ? Math.min(100, r.load / r.capacity * 100) : 0;
            return `<div class="load-row"><span><a href="#/chuyen-gia">${esc(r.provider.name)}</a></span>
              <div class="meter${over ? " over" : ""}" role="img" aria-label="${r.load} trên ${r.capacity}"><span style="width:${w}%"></span></div>
              <span class="num">${r.load}/${r.capacity || "?"} ${over ? '<span class="tag tag-crit">! Vượt khả năng</span>' : ""}</span></div>`; }).join("") || `<p class="empty">Chưa khai báo chuyên gia.</p>`}
          ${Object.keys(m.unassignedByType).length ? `<p class="muted" style="font-size:12px;margin:10px 0 0">Chưa phân công: ${Object.entries(m.unassignedByType).map(([k, c]) => `${esc(label("supportTypes", k))} (${c})`).join(", ")}.</p>` : ""}
        </section>
        <section class="card"><h2>Nguồn lực cần quyết định</h2>
          ${decisions.length ? `<ul style="margin:0;padding-left:18px;display:grid;gap:6px">${decisions.map(d => `<li>${d}</li>`).join("")}</ul>` : `<p class="empty">Chưa có đề xuất.</p>`}
          <p class="muted" style="font-size:12px;margin:12px 0 0">Gợi ý tự động từ dữ liệu; quyết định về thời gian nghiên cứu, chuyên gia, kinh phí do lãnh đạo xác nhận.</p>
        </section>
      </div>

      <h2 class="section-title">Sự kiện công bố trong kỳ <span>${periodText} — các sự kiện không cộng thành tổng sản phẩm</span></h2>
      <div class="grid g4">
        ${tile("K07", "Bản thảo có lần nộp", m.k07.manuscripts, `${m.k07.submissions} lần nộp`, "#/cong-bo")}
        ${tile("K08", "Bản thảo được chấp nhận", m.k08, "", "#/cong-bo")}
        ${tile("K09", "Công bố chính thức đã đối soát", m.k09.count, `${m.k09.pendingReconcile} bản ghi chờ đối soát`, "#/cong-bo")}
        ${tile("K10", "Giảng viên tham gia (tạm tính)", m.k10, "Định nghĩa cần đơn vị chốt")}
      </div>
      <p class="muted" style="font-size:12px;margin-top:16px">Chỉ số tạp chí luôn đi kèm nguồn và năm; không dùng số bài, số ngày hay phân hạng đơn lẻ để đánh giá năng lực giảng viên (DORA, CoARA).</p>`;
    bindFilters(el);
    toggleTables(el);
  };

  /* ================= M01 ================= */
  App.views.myWork = function (el) {
    const data = App.data(), s = App.state;
    const people = data.people.filter(p => p.active !== false);
    if (!s.actAs || !App.find("people", s.actAs)) s.actAs = (people.find(p => (p.roles || []).includes("chu_nhiem")) || people[0] || {}).id || "";
    const me = s.actAs, cutoff = s.cutoff;

    const myProjects = data.projects.filter(p => p.leadId === me || (p.memberIds || []).includes(me) || p.ownerId === me);
    const myMs = data.manuscripts.filter(m => m.correspondingId === me || (m.authorIds || []).includes(me) || m.ownerId === me);
    const myRecordIds = new Set([...myProjects, ...myMs].map(r => r.id));
    const myProviders = data.providers.filter(p => p.personId === me).map(p => p.id);

    // 1. Việc cần xử lý: công việc tôi phụ trách, hồ sơ có việc tiếp theo giao cho tôi, yêu cầu cần tôi phản hồi/xác nhận
    const todo = [];
    data.workItems.filter(w => w.ownerId === me && w.status !== "hoan_thanh").forEach(w =>
      todo.push({ due: w.dueAdjusted || w.dueOriginal, what: `<b>${esc(w.title)}</b> ${workBadge(w.status)}`, ref: App.recordLink(w.parentType, w.parentId), kind: "Mốc công việc" }));
    [...data.projects.map(r => ["projects", r]), ...data.manuscripts.map(r => ["manuscripts", r])].filter(([, r]) => r.ownerId === me && r.nextAction).forEach(([col, r]) =>
      todo.push({ due: r.nextDue, what: esc(r.nextAction), ref: App.recordLink(col, r.id), kind: "Việc tiếp theo" }));
    data.supports.filter(x => x.requesterId === me && ["cho_xac_nhan", "can_bo_sung"].includes(x.status)).forEach(x =>
      todo.push({ due: x.status === "cho_xac_nhan" ? x.deliveredAt : "", what: x.status === "cho_xac_nhan" ? `Xác nhận sản phẩm hỗ trợ: ${esc(x.deliverable || x.problem)}` : `Bổ sung thông tin cho yêu cầu: ${esc(x.problem)}`, ref: `<a href="#/ho-tro/${esc(x.id)}">${esc(x.id)}</a>`, kind: "Yêu cầu chờ tôi" }));
    data.supports.filter(x => myProviders.includes(x.providerId) && ["da_phan_cong", "dang_xu_ly", "mo_lai"].includes(x.status)).forEach(x =>
      todo.push({ due: x.dueAdjusted || x.dueOriginal, what: `Xử lý yêu cầu: ${esc(x.problem)}`, ref: `<a href="#/ho-tro/${esc(x.id)}">${esc(x.id)}</a>`, kind: "Được giao hỗ trợ" }));
    todo.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));

    const mySupports = data.supports.filter(x => x.requesterId === me || myRecordIds.has(x.parentId)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    const recent = data.events.filter(e => myRecordIds.has(e.entityId)).sort((a, b) => (b.recordedAt || "").localeCompare(a.recordedAt || "")).slice(0, 10);

    const recRow = (col, r) => `<tr><td><a class="row-link" href="${App.recordHref(col, r.id)}">${esc(r.id)}</a><span class="sub">${esc(r.shortTitle || r.title)}</span></td>
      <td>${stageBadge(col, r.stage)}</td><td>${workBadge(r.status)}${r.statusReason ? `<span class="sub">${esc(r.statusReason)}</span>` : ""}</td>
      <td>${r.nextAction ? esc(r.nextAction) : NA}<span class="sub">${esc(App.personName(r.ownerId))}</span></td><td>${dueBadge(r.nextDue, cutoff)}</td>
      <td><button class="btn sm" data-quick="${col}:${esc(r.id)}">Cập nhật nhanh</button></td></tr>`;

    el.innerHTML = `
      <div class="page-head"><div><h1>Công việc nghiên cứu của tôi <span class="muted">· M01</span></h1>
        <p>Việc cần làm tiếp theo, hạn gần nhất và hỗ trợ đang chờ. Ở bản MVP, quản trị viên chọn “xem như” một người để kiểm tra góc nhìn giảng viên.</p></div>
        <div class="actions"><button class="btn primary" id="newReq">+ Gửi yêu cầu hỗ trợ</button></div></div>
      <form class="filters"><label class="grow">Xem như<select id="actAs">${people.map(p => `<option value="${esc(p.id)}"${p.id === me ? " selected" : ""}>${esc(p.name)} — ${esc((p.roles || []).map(r => label("roles", r)).join(", "))}</option>`).join("")}</select></label>
        <label>Ngày chốt<input type="date" id="cut" value="${cutoff}"></label></form>

      <section class="card"><h2>1. Việc cần xử lý <span class="muted">(${todo.length})</span></h2>
        ${todo.length ? `<div class="table-wrap"><table><thead><tr><th>Hạn</th><th>Việc</th><th>Loại</th><th>Hồ sơ</th></tr></thead><tbody>
          ${todo.map(t => `<tr><td>${dueBadge(t.due, cutoff)}</td><td>${t.what}</td><td><small>${esc(t.kind)}</small></td><td>${t.ref}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty">Không có việc đang chờ.</p>`}
      </section>

      <section class="card" style="margin-top:16px"><h2>2. Nghiên cứu và bản thảo đang tham gia</h2>
        ${myProjects.length + myMs.length ? `<div class="table-wrap"><table><thead><tr><th>Hồ sơ</th><th>Giai đoạn</th><th>Tình trạng</th><th>Việc tiếp theo · người phụ trách</th><th>Hạn</th><th></th></tr></thead><tbody>
          ${myProjects.map(r => recRow("projects", r)).join("")}${myMs.map(r => recRow("manuscripts", r)).join("")}</tbody></table></div>` : `<p class="empty">Chưa tham gia hồ sơ nào.</p>`}
      </section>

      <div class="grid g2" style="margin-top:16px">
        <section class="card"><h2>3. Yêu cầu hỗ trợ</h2>
          ${mySupports.length ? `<div class="table-wrap"><table><thead><tr><th>Yêu cầu</th><th>Người nhận</th><th>Trạng thái</th><th>Mốc phản hồi</th></tr></thead><tbody>
            ${mySupports.map(x => { const f = supportFacts(x, data, cutoff); return `<tr><td><a class="row-link" href="#/ho-tro/${esc(x.id)}">${esc(x.id)}</a><span class="sub">${esc(x.problem)}</span></td>
              <td>${x.providerId ? esc(App.providerName(x.providerId)) : NA}</td><td>${supportBadge(x.status)}${x.deliverable ? `<span class="sub">Bàn giao: ${esc(x.deliverable)}</span>` : ""}</td>
              <td>${x.firstResponseAt ? `<small>Phản hồi ${T.fmt(x.firstResponseAt)}</small>` : `<small class="na">Chưa phản hồi có nội dung</small>`}${f.open && f.due ? `<br>${dueBadge(f.due, cutoff)}` : ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="empty">Chưa có yêu cầu.</p>`}
        </section>
        <section class="card"><h2>4. Cập nhật gần nhất</h2>
          ${recent.length ? `<ul class="timeline">${recent.map(e => App.eventItem(e)).join("")}</ul>` : `<p class="empty">Chưa có dữ liệu</p>`}
        </section>
      </div>`;

    el.querySelector("#actAs").onchange = e => { App.state.actAs = e.target.value; App.pref.set("actAs", e.target.value); App.rerender(); };
    el.querySelector("#cut").onchange = e => { if (e.target.value) { App.state.cutoff = e.target.value; App.rerender(); } };
    el.querySelector("#newReq").onclick = () => App.forms.newSupport({ requesterId: me });
    el.querySelectorAll("[data-quick]").forEach(b => b.onclick = () => { const [col, id] = b.dataset.quick.split(":"); App.forms.quickUpdate(col, id); });
  };
})();
