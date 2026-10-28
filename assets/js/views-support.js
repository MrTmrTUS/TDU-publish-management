/* Yêu cầu hỗ trợ (giảng viên đề xuất → điều phối chốt → người hỗ trợ nhận → bàn giao → xác nhận + đánh giá),
   danh bạ & đăng ký người hỗ trợ (suất nhận việc), thẻ hỗ trợ (hạn mức theo năm). */
(function () {
  const App = window.App;
  const { T, SS, SPS, SUPPORT_OPEN, statusLabel } = window.Domain;
  const { esc, NA, orNA, link, safeUrl, tag, supportTag, dueBadge, avatar, stars, formHtml, readForm, modal, confirmBox, toast } = window.UI;
  const forms = App.forms;
  const S = () => window.Store;
  const done = msg => { toast(msg); App.rerender(); };
  const now = () => new Date().toISOString();
  const coordIds = () => App.roleUsers("dieu_phoi").map(u => u.id);
  const adminIds = () => App.roleUsers("quan_tri").map(u => u.id);

  function lateTag(s) {
    const f = App.supportFacts(s);
    if (f.triageLate) return tag("crit", `Quá ${App.settings().triageWorkdays} ngày làm việc chưa phân công`, "!");
    if (f.overdue) return tag("crit", `Quá hạn ${T.days(s.due, App.state.today)} ngày`, "!");
    return "";
  }

  /* ================= Danh sách ================= */
  App.views.supports = function (el, _m, q) {
    const me = App.me().id, today = App.state.today;
    const vis = App.visibleSupports();
    const tabs = [["cua_toi", "Yêu cầu của tôi"]];
    if (App.isSupporter() || vis.some(s => s.supporterId === me)) tabs.push(["duoc_giao", "Việc được giao cho tôi"]);
    if (App.isCoord() || App.isLeader()) tabs.push(["hang_doi", "Hàng đợi điều phối"]);
    const tab = tabs.some(t => t[0] === q.tab) ? q.tab : (App.isCoord() ? "hang_doi" : tabs[tabs.length > 1 && vis.some(s => s.supporterId === me && SUPPORT_OPEN.includes(s.status)) ? 1 : 0][0]);
    const list = tab === "cua_toi" ? vis.filter(s => s.requesterId === me || App.isTeam(App.find("records", s.recordId) || {}))
      : tab === "duoc_giao" ? vis.filter(s => s.supporterId === me) : vis;
    const cols = [["cho_duyet", "Chờ điều phối duyệt"], ["cho_nhan", "Chờ người hỗ trợ nhận"], ["dang_xu_ly", "Đang xử lý"], ["cho_xac_nhan", "Chờ xác nhận"], ["hoan_thanh", "Hoàn thành (30 ngày)"]];
    const card = s => { const r = App.find("records", s.recordId) || {}; const lt = lateTag(s);
      return `<a class="kcard${lt ? " alert" : ""}" href="#/ho-tro/${esc(s.id)}"><div class="k-top"><span class="code">${esc(s.id)}</span><small>${esc(App.typeLabel(s.type))}</small></div>
        <div class="k-title">${esc(s.detail)}</div><div style="font-size:12px">${esc(r.id || "")} ${esc(r.shortTitle || r.title || "")}</div>
        <div class="k-meta"><span>Gửi: ${esc(App.userName(s.requesterId))}</span>${s.supporterId ? `<span>Hỗ trợ: ${esc(App.userName(s.supporterId))}</span>` : (s.proposedSupporterId ? `<span>Đề xuất: ${esc(App.userName(s.proposedSupporterId))}</span>` : "")}
        ${s.due && ["cho_nhan", "dang_xu_ly"].includes(s.status) ? `<span>Hạn ${T.fmt(s.due)}</span>` : ""}</div>${lt ? `<div style="margin-top:6px">${lt}</div>` : ""}</a>`; };
    el.innerHTML = `
      <div class="page-head"><div><h1>Yêu cầu hỗ trợ</h1><p>Giảng viên gửi yêu cầu và đề xuất người hỗ trợ; điều phối viên chốt trong ${App.settings().triageWorkdays} ngày làm việc; người hỗ trợ nhận việc, bàn giao; người gửi xác nhận kết quả.</p></div>
        <div class="actions"><a class="btn" href="#/nguoi-ho-tro">Danh bạ người hỗ trợ</a><button class="btn primary" id="add">+ Gửi yêu cầu</button></div></div>
      ${tabs.length > 1 ? `<div class="seg" role="group" style="margin-bottom:16px">${tabs.map(([k, l]) => `<button data-tab="${k}" aria-pressed="${tab === k}">${esc(l)}</button>`).join("")}</div>` : ""}
      <div class="board">${cols.map(([k, l]) => { let items = list.filter(s => s.status === k);
        if (k === "hoan_thanh") items = items.filter(s => s.confirmedAt && T.days(s.confirmedAt, today) <= 30);
        items.sort((a, b) => Number(!!lateTag(b)) - Number(!!lateTag(a)) || a.createdAt.localeCompare(b.createdAt));
        return `<div class="col"><h3><span>${esc(l)}</span><span class="muted">${items.length}</span></h3>${items.map(card).join("") || '<p class="muted" style="font-size:12px">Trống</p>'}</div>`; }).join("")}</div>`;
    el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => App.go("#/ho-tro?tab=" + b.dataset.tab));
    el.querySelector("#add").onclick = () => forms.support();
  };

  /* ================= Chi tiết + hành động ================= */
  App.views.support = function (el, m) {
    const s = App.find("supports", decodeURIComponent(m[1]));
    if (!s || !App.canSee(s)) { el.innerHTML = `<div class="card empty">Không tìm thấy yêu cầu hoặc bạn không có quyền xem. <a href="#/ho-tro">Về danh sách</a></div>`; return; }
    const me = App.me().id, r = App.find("records", s.recordId) || {}, f = App.supportFacts(s);
    const card = s.cardId ? App.find("cards", s.cardId) : null;
    const isReq = s.requesterId === me, isSup = s.supporterId === me, coord = App.isCoord();
    const acts = [];
    if (coord && s.status === "cho_duyet") acts.push(["assign", "Phân công", true]);
    if (coord && ["cho_nhan", "dang_xu_ly"].includes(s.status)) acts.push(["assign", "Đổi người hỗ trợ", false]);
    if (isSup && s.status === "cho_nhan") acts.push(["accept", "Nhận việc", true], ["decline", "Từ chối", false]);
    if (isSup && s.status === "dang_xu_ly") acts.push(["deliver", "Bàn giao kết quả", true]);
    if (isReq && s.status === "cho_xac_nhan") acts.push(["confirm", "Xác nhận đạt", true], ["reject", "Chưa đạt", false]);
    if ((isReq || coord) && ["cho_duyet", "cho_nhan"].includes(s.status)) acts.push(["cancel", "Hủy yêu cầu", false]);
    const d = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`;
    const dt = v => v ? T.fmt(v) : NA;
    el.innerHTML = `
      <div class="detail-head"><div><div class="muted"><a href="#/ho-tro">← Yêu cầu hỗ trợ</a></div>
        <h1><span class="code" style="font-size:16px">${esc(s.id)}</span> ${esc(App.typeLabel(s.type))}</h1>
        <div class="meta">${supportTag(s.status)} <span>Hồ sơ: <a href="#/ho-so/${esc(r.id)}">${esc(r.id || s.recordId)}</a> ${esc(r.shortTitle || r.title || "")}</span> ${lateTag(s)}</div></div>
        <div class="actions">${acts.map(([k, l, p]) => `<button class="btn${p ? " primary" : ""}" data-act="${k}">${esc(l)}</button>`).join("")}</div></div>
      <div class="grid g2">
        <section class="card"><h2>Nội dung</h2><dl class="dl">
          ${d("Mô tả", esc(s.detail).replace(/\n/g, "<br>"))}${d("Người gửi", `<a href="#/ly-lich/${esc(s.requesterId)}">${esc(App.userName(s.requesterId))}</a>`)}
          ${d("Người hỗ trợ đề xuất", s.proposedSupporterId ? esc(App.userName(s.proposedSupporterId)) : NA)}
          ${d("Người hỗ trợ được phân công", s.supporterId ? `<a href="#/ly-lich/${esc(s.supporterId)}">${esc(App.userName(s.supporterId))}</a>` : NA)}
          ${d("Điều phối viên", s.coordinatorId ? esc(App.userName(s.coordinatorId)) : NA)}
          ${d("Thẻ hỗ trợ", card ? `${esc(App.typeLabel(card.type))} ${card.year} — còn ${App.cardUsage(card).left}/${card.quota} lượt` : '<span class="muted">Không dùng thẻ</span>')}
          ${s.result ? d("Kết quả bàn giao", esc(s.result) + (s.resultUrl ? "<br>" + link(s.resultUrl, "Mở sản phẩm") : "")) : ""}
          ${s.declineReason ? d("Lý do từ chối gần nhất", esc(s.declineReason)) : ""}${s.cancelReason ? d("Lý do hủy", esc(s.cancelReason)) : ""}</dl></section>
        <section class="card"><h2>Mốc thời gian</h2><dl class="dl">
          ${d("Ngày gửi", dt(s.createdAt))}${d(`Hạn phân công (${App.settings().triageWorkdays} ngày LV)`, s.assignedAt ? `${dt(s.assignedAt)} ${s.assignedAt.slice(0, 10) <= f.triageDue ? tag("good", "đúng hạn", "✓") : tag("warn", "trễ")}` : dueBadge(f.triageDue, App.state.today, 2))}
          ${d("Ngày nhận việc", dt(s.acceptedAt))}${d("Hạn hoàn thành", s.due ? (["cho_nhan", "dang_xu_ly"].includes(s.status) ? dueBadge(s.due, App.state.today) : dt(s.due)) : NA)}
          ${d("Ngày bàn giao", dt(s.deliveredAt))}${d("Ngày xác nhận", dt(s.confirmedAt))}</dl></section>
      </div>
      <section class="card" style="margin-top:16px"><h2>Lịch sử</h2>
        <ul class="timeline">${[...(s.history || [])].reverse().map(h => `<li><div class="when">${esc(T.fmtTime(h.at))} · ${esc(App.userName(h.by))}</div><div>${esc(h.text)}</div></li>`).join("")}</ul></section>`;
    el.querySelectorAll("[data-act]").forEach(b => b.onclick = () => forms.supportAction(s.id, b.dataset.act));
  };

  /* Người hỗ trợ phù hợp với một loại hỗ trợ, kèm suất còn lại */
  /* Người hỗ trợ cho một loại: người đã đăng ký loại đó trước; điều phối viên (includeOthers) xem thêm những người còn lại */
  function supporterOptions(type, current, includeOthers) {
    const fits = sp => !type || (sp.types || []).includes(type);
    return App.all("supporters").filter(sp => sp.status === "da_duyet" && (includeOthers || fits(sp)))
      .sort((a, b) => Number(fits(b)) - Number(fits(a))).map(sp => {
        const l = App.supporterLoad(sp);
        const full = l.free <= 0 && sp.userId !== current;
        return [sp.userId, `${App.userName(sp.userId)} — còn ${l.free}/${l.capacity} suất${full ? " (hết suất)" : ""}${fits(sp) ? "" : " · chưa đăng ký loại này"}`, full];
      });
  }
  function availableCard(type, holderId) {
    const year = App.state.today.slice(0, 4);
    return App.all("cards").filter(c => c.holderId === holderId && c.type === type && String(c.year) === year).find(c => App.cardUsage(c).left > 0) || null;
  }

  forms.support = function (sid, recordId, proposed) {
    const me = App.me();
    const myRecs = App.all("records").filter(App.isTeam).filter(r => r.status !== "xuat_ban");
    if (!myRecs.length) { toast("Bạn cần có hồ sơ nghiên cứu trước khi gửi yêu cầu hỗ trợ.", "crit"); return; }
    let types = App.supportTypes();
    if (proposed) { const sp = App.supporter(proposed); if (sp) types = types.filter(t => (sp.types || []).includes(t.code)); }
    const fields = [
      { name: "recordId", label: "Hồ sơ cần hỗ trợ", type: "select", required: true, full: true, options: myRecs.map(r => [r.id, `${r.id} · ${r.shortTitle || r.title}`]) },
      { name: "type", label: "Cần hỗ trợ gì", type: "select", required: true, options: types.map(t => [t.code, t.label + (t.needsCard ? " (dùng thẻ)" : "")]) },
      { name: "proposedSupporterId", label: "Đề xuất người hỗ trợ (điều phối viên sẽ chốt)", type: "select", empty: "— Để điều phối viên chọn —", options: [] },
      { type: "html", html: '<div class="rule-box" id="cardInfo"></div>' },
      { name: "detail", label: "Mô tả cụ thể: đang vướng gì, cần sản phẩm gì, khi nào cần", type: "textarea", required: true, rows: 4 }
    ];
    const form = modal({ title: "Gửi yêu cầu hỗ trợ", wide: true, body: formHtml(fields, { recordId: recordId || myRecs[0].id, type: types[0] && types[0].code }), submitLabel: "Gửi yêu cầu", onSubmit: async f => {
      const v = readForm(f, fields);
      const t = App.supportTypes().find(x => x.code === v.type);
      let cardId = "";
      if (t && t.needsCard) {
        const c = availableCard(v.type, me.id);
        if (!c) throw new Error(`Bạn đã hết lượt thẻ “${t.label}” năm nay hoặc chưa được cấp thẻ. Liên hệ quản trị viên.`);
        cardId = c.id;
      }
      if (v.proposedSupporterId) { const sp = App.supporter(v.proposedSupporterId); if (!sp || App.supporterLoad(sp).free <= 0) throw new Error("Người hỗ trợ này đã hết suất, không đặt được. Hãy chọn người khác hoặc để điều phối viên chọn."); }
      const nums = App.all("supports").map(x => parseInt(String(x.id).replace(/^YC-/, ""), 10)).filter(n => !isNaN(n));
      const rec = { id: "YC-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0"), recordId: v.recordId, type: v.type, detail: v.detail, requesterId: me.id,
        proposedSupporterId: v.proposedSupporterId, supporterId: "", coordinatorId: "", cardId, status: "cho_duyet", createdAt: now(), due: "", history: [] };
      await App.saveSupport(rec, `Gửi yêu cầu “${App.typeLabel(v.type)}”${v.proposedSupporterId ? `, đề xuất ${App.userName(v.proposedSupporterId)}` : ""}${cardId ? ", dùng 1 lượt thẻ" : ""}`);
      await App.notify(coordIds(), `Yêu cầu mới ${rec.id}: ${App.typeLabel(v.type)} — cần phân công`, "#/ho-tro/" + rec.id);
      await App.log(`Gửi yêu cầu ${rec.id}`, "#/ho-tro/" + rec.id);
      toast(`Đã gửi ${rec.id}. Điều phối viên phân công trước ${T.fmt(App.supportFacts(rec).triageDue)}.`);
      App.go("#/ho-tro/" + rec.id);
    } });
    const typeEl = form.elements.type, propEl = form.elements.proposedSupporterId, info = form.querySelector("#cardInfo");
    const upd = () => {
      const opts = supporterOptions(typeEl.value);
      propEl.innerHTML = `<option value="">— Để điều phối viên chọn —</option>` + opts.map(([v, l, dis]) => `<option value="${esc(v)}"${dis ? " disabled" : ""}${v === proposed ? " selected" : ""}>${esc(l)}</option>`).join("");
      const t = App.supportTypes().find(x => x.code === typeEl.value);
      if (t && t.needsCard) { const c = availableCard(t.code, me.id); info.innerHTML = c ? `<b>Dùng thẻ hỗ trợ:</b> còn ${App.cardUsage(c).left}/${c.quota} lượt “${esc(t.label)}” năm ${c.year}; gửi yêu cầu sẽ trừ 1 lượt (hoàn lại nếu hủy).` : `<b>Hết lượt thẻ:</b> bạn chưa có hoặc đã dùng hết thẻ “${esc(t.label)}” năm nay — không gửi được loại này.`; }
      else info.innerHTML = "Loại hỗ trợ này không cần thẻ.";
      if (!opts.length) info.innerHTML += "<br>Chưa có người hỗ trợ cho loại này; điều phối viên sẽ tìm người.";
    };
    typeEl.addEventListener("change", upd); upd();
  };

  forms.supportAction = function (sid, act) {
    const s = App.find("supports", sid), me = App.me().id, today = App.state.today;
    const r = App.find("records", s.recordId) || {};
    const team = [r.ownerId, ...(r.memberIds || []), s.requesterId];
    const F = {
      assign: [{ name: "supporterId", label: "Người hỗ trợ", type: "select", required: true, options: supporterOptions(s.type, s.supporterId, true), help: s.proposedSupporterId ? `Giảng viên đề xuất: ${App.userName(s.proposedSupporterId)}` : "" },
        { name: "due", label: "Hạn hoàn thành gợi ý (người hỗ trợ có thể điều chỉnh khi nhận)", type: "date" }, { name: "note", label: "Ghi chú cho người hỗ trợ", full: true }],
      accept: [{ name: "due", label: "Hạn hoàn thành", type: "date", required: true }],
      decline: [{ name: "reason", label: "Lý do từ chối", required: true, full: true }],
      deliver: [{ name: "result", label: "Kết quả / sản phẩm bàn giao", type: "textarea", required: true, rows: 3 }, { name: "resultUrl", label: "Đường dẫn sản phẩm (nếu có)", type: "url", full: true }],
      confirm: [{ name: "stars", label: "Đánh giá người hỗ trợ (chỉ quản trị viên xem)", type: "stars", required: true }, { name: "comment", label: "Nhận xét", type: "textarea", rows: 2 }],
      reject: [{ name: "reason", label: "Chưa đạt ở điểm nào", type: "textarea", required: true, rows: 2 }],
      cancel: [{ name: "reason", label: "Lý do hủy (trùng, không cần nữa…)", required: true, full: true }]
    }[act];
    const titles = { assign: "Phân công người hỗ trợ", accept: "Nhận việc", decline: "Từ chối việc", deliver: "Bàn giao kết quả", confirm: "Xác nhận đạt", reject: "Chưa đạt", cancel: "Hủy yêu cầu" };
    modal({ title: `${titles[act]} — ${s.id}`, body: formHtml(F, { supporterId: s.supporterId || s.proposedSupporterId, due: s.due || "" }), danger: act === "cancel", submitLabel: titles[act], onSubmit: async f => {
      const vals = readForm(f, F);
      const next = Object.assign({}, s);
      let text = "", to = [], msg = "";
      switch (act) {
        case "assign": {
          const sp = App.supporter(vals.supporterId);
          if (!sp || (App.supporterLoad(sp).free <= 0 && vals.supporterId !== s.supporterId)) throw new Error("Người này đã hết suất. Chọn người khác.");
          if (vals.due && vals.due < today) throw new Error("Hạn không được ở quá khứ.");
          const prevSup = s.supporterId;
          Object.assign(next, { supporterId: vals.supporterId, coordinatorId: me, status: "cho_nhan", assignedAt: s.assignedAt || now(), due: vals.due || s.due || "", acceptedAt: "" });
          text = `${prevSup ? "Đổi" : "Phân công"} người hỗ trợ: ${App.userName(vals.supporterId)}${vals.note ? " — " + vals.note : ""}`;
          to = [vals.supporterId, ...team, prevSup]; msg = `${s.id}: ${App.userName(vals.supporterId)} được phân công hỗ trợ “${App.typeLabel(s.type)}”`; break;
        }
        case "accept":
          if (vals.due < today) throw new Error("Hạn không được ở quá khứ.");
          Object.assign(next, { status: "dang_xu_ly", acceptedAt: now(), due: vals.due }); text = `Nhận việc, hạn ${T.fmt(vals.due)}`; to = team; msg = `${s.id}: ${App.userName(me)} đã nhận việc, hạn ${T.fmt(vals.due)}`; break;
        case "decline":
          Object.assign(next, { status: "cho_duyet", supporterId: "", declineReason: vals.reason }); text = "Từ chối: " + vals.reason; to = [...coordIds(), ...team]; msg = `${s.id}: người hỗ trợ từ chối — cần phân công lại`; break;
        case "deliver":
          if (vals.resultUrl && !safeUrl(vals.resultUrl)) throw new Error("Đường dẫn phải bắt đầu bằng http:// hoặc https://");
          Object.assign(next, { status: "cho_xac_nhan", deliveredAt: now(), result: vals.result, resultUrl: vals.resultUrl }); text = "Bàn giao: " + vals.result; to = team; msg = `${s.id}: đã bàn giao kết quả — mời xác nhận`; break;
        case "confirm":
          if (!vals.stars) throw new Error("Chọn số sao đánh giá.");
          Object.assign(next, { status: "hoan_thanh", confirmedAt: now() }); text = "Xác nhận đạt"; to = [s.supporterId, s.coordinatorId]; msg = `${s.id}: người gửi đã xác nhận đạt. Cảm ơn bạn!`;
          await S().save("ratings", { id: App.uid("dg-" + s.id + "-"), supportId: s.id, supporterId: s.supporterId, stars: vals.stars, comment: vals.comment, by: me, at: now(), readers: [] }); break;
        case "reject":
          Object.assign(next, { status: "dang_xu_ly", deliveredAt: "" }); text = "Chưa đạt: " + vals.reason; to = [s.supporterId]; msg = `${s.id}: người gửi chưa xác nhận đạt — ${vals.reason}`; break;
        case "cancel":
          Object.assign(next, { status: "huy", cancelReason: vals.reason }); text = "Hủy: " + vals.reason + (s.cardId ? " (hoàn lại lượt thẻ)" : ""); to = [...team, s.supporterId, ...(s.status === "cho_duyet" ? coordIds() : [])]; msg = `${s.id} đã bị hủy: ${vals.reason}`; break;
      }
      await App.saveSupport(next, text);
      await App.notify(to, msg, "#/ho-tro/" + s.id);
      done(`${titles[act]}: xong.`);
    } });
  };

  /* ================= Người hỗ trợ ================= */
  App.views.supporters = function (el, _m, q) {
    const me = App.me().id, type = q.loai || "";
    const mine = App.supporter(me);
    const list = App.all("supporters").filter(sp => ["da_duyet", "tam_ngung"].includes(sp.status) && (!type || (sp.types || []).includes(type)));
    el.innerHTML = `
      <div class="page-head"><div><h1>Người hỗ trợ</h1><p>Chuyên gia, mentor, người phản biện nội bộ, biên tập viên đã đăng ký và được duyệt. Mỗi người nhận số việc tối đa theo suất đã khai; hết suất thì tạm không nhận đặt.</p></div>
        <div class="actions"><button class="btn primary" id="reg">${mine ? "Cập nhật đăng ký của tôi" : "Đăng ký làm người hỗ trợ"}</button></div></div>
      ${mine ? `<div class="banner neutral">Đăng ký của bạn: ${tag((SPS[mine.status] || ["", "", "muted"])[2], (SPS[mine.status] || ["", mine.status])[1])}
        ${mine.status === "da_duyet" ? ` — đang nhận ${App.supporterLoad(mine).load}/${mine.capacity} suất. <button class="btn sm" id="pause">Tạm ngừng nhận việc</button>` : ""}
        ${mine.status === "tam_ngung" ? ` <button class="btn sm" id="resume">Nhận việc trở lại</button>` : ""}${mine.status === "cho_duyet" ? " — quản trị viên sẽ duyệt." : ""}${mine.status === "tu_choi" && mine.reviewNote ? ` — ${esc(mine.reviewNote)}` : ""}</div>` : ""}
      <form class="filters" id="sf"><label>Loại hỗ trợ<select name="loai"><option value="">Tất cả</option>${App.supportTypes().map(t => `<option value="${t.code}"${t.code === type ? " selected" : ""}>${esc(t.label)}</option>`).join("")}</select></label></form>
      <div class="people-grid">${list.map(sp => { const u = App.user(sp.userId) || {}; const l = App.supporterLoad(sp);
        return `<article class="card person"><div class="person-head">${avatar(u.name, 48)}<div><a href="#/ly-lich/${esc(sp.userId)}"><b>${esc(u.name)}</b></a><small>${esc(u.degree || "")} · ${esc(u.unit || "")}</small></div></div>
          <div class="person-tags">${(sp.types || []).map(t => tag("info", App.typeLabel(t))).join(" ")}</div>
          <p>${esc(sp.expertise || "")}</p>${sp.conditions ? `<p class="muted" style="font-size:12px">Điều kiện: ${esc(sp.conditions)}</p>` : ""}
          <div class="person-foot">${sp.status === "tam_ngung" ? tag("muted", "Tạm ngừng nhận việc") : l.free > 0 ? tag("good", `Còn ${l.free}/${l.capacity} suất`) : tag("crit", "Hết suất — tạm không nhận đặt")}
            ${sp.status === "da_duyet" && l.free > 0 && sp.userId !== me ? `<button class="btn sm primary" data-book="${esc(sp.userId)}">Gửi yêu cầu cho người này</button>` : ""}</div></article>`; }).join("") || `<div class="card empty">Chưa có người hỗ trợ phù hợp.</div>`}</div>`;
    el.querySelector("#sf").addEventListener("change", e => App.go("#/nguoi-ho-tro" + (e.target.value ? "?loai=" + e.target.value : "")));
    el.querySelector("#reg").onclick = () => forms.supporterReg();
    el.querySelectorAll("[data-book]").forEach(b => b.onclick = () => forms.support(null, null, b.dataset.book));
    const setStatus = async st => { await S().save("supporters", Object.assign({}, mine, { status: st })); done(st === "tam_ngung" ? "Đã tạm ngừng nhận việc." : "Đã mở nhận việc trở lại."); };
    const p = el.querySelector("#pause"); if (p) p.onclick = () => setStatus("tam_ngung");
    const rs = el.querySelector("#resume"); if (rs) rs.onclick = () => setStatus("da_duyet");
  };

  forms.supporterReg = function () {
    const me = App.me(), sp = App.supporter(me.id);
    const fields = [
      { name: "types", label: "Loại hỗ trợ có thể nhận", type: "multi", options: App.supportTypes().map(t => [t.code, t.label]) },
      { name: "expertise", label: "Chuyên môn, kinh nghiệm (lĩnh vực, công bố, phương pháp thành thạo)", type: "textarea", required: true, rows: 3 },
      { name: "capacity", label: "Số việc nhận cùng lúc tối đa (suất)", type: "number", min: 1, required: true },
      { name: "conditions", label: "Điều kiện nhận việc", full: true, placeholder: "VD: cần có đề cương; báo trước 3 ngày" }
    ];
    modal({ title: sp ? "Cập nhật đăng ký người hỗ trợ" : "Đăng ký làm người hỗ trợ", wide: true, body: formHtml(fields, sp || { capacity: 2, types: [] }), submitLabel: sp ? "Lưu" : "Gửi đăng ký", onSubmit: async f => {
      const v = readForm(f, fields);
      if (!v.types.length) throw new Error("Chọn ít nhất một loại hỗ trợ.");
      if (!(v.capacity >= 1 && v.capacity <= 20)) throw new Error("Số suất từ 1 đến 20.");
      const status = sp && ["da_duyet", "tam_ngung"].includes(sp.status) ? sp.status : "cho_duyet";
      await S().save("supporters", Object.assign({ id: "sp-" + me.id, userId: me.id, registeredAt: App.state.today, readers: [] }, sp || {}, v, { status }));
      if (status === "cho_duyet") await App.notify(adminIds(), `${me.name} đăng ký làm người hỗ trợ — cần duyệt`, "#/quan-tri?tab=nguoi-ho-tro");
      done(status === "cho_duyet" ? "Đã gửi đăng ký, chờ quản trị viên duyệt." : "Đã cập nhật.");
    } });
  };

  /* ================= Thẻ hỗ trợ ================= */
  App.views.cards = function (el, _m, q) {
    const me = App.me().id, year = q.nam || App.state.today.slice(0, 4);
    const manage = App.isAdmin();
    const years = [...new Set([App.state.today.slice(0, 4), ...App.all("cards").map(c => String(c.year))])].sort().reverse();
    const mine = App.all("cards").filter(c => c.holderId === me && String(c.year) === year);
    const usage = c => App.all("supports").filter(s => s.cardId === c.id && s.status !== "huy");
    const all = manage || App.isCoord() ? App.all("cards").filter(c => String(c.year) === year && (!q.loai || c.type === q.loai)) : [];
    el.innerHTML = `
      <div class="page-head"><div><h1>Thẻ hỗ trợ</h1><p>Mỗi năm, quản trị viên cấp cho giảng viên một số lượt hỗ trợ cho các loại cần thẻ (${esc(App.supportTypes().filter(t => t.needsCard).map(t => t.label).join(", ") || "chưa có")}). Mỗi yêu cầu trừ 1 lượt; yêu cầu bị hủy được hoàn lại.</p></div>
        <div class="actions">${manage ? `<button class="btn primary" id="issue">+ Cấp thẻ</button>` : ""}</div></div>
      <form class="filters" id="cf"><label>Năm<select name="nam">${years.map(y => `<option${y === year ? " selected" : ""}>${y}</option>`).join("")}</select></label></form>
      <h2 class="section-title">Thẻ của tôi</h2>
      ${mine.length ? `<div class="people-grid">${mine.map(c => { const u = App.cardUsage(c); return `<article class="card hcard"><div class="hcard-top"><span>${esc(App.typeLabel(c.type))}</span><small>Năm ${esc(c.year)}</small></div>
          <div class="hcard-num"><b>${u.left}</b><span>/${u.quota} lượt còn lại</span></div><div class="meter"><span style="width:${u.quota ? u.used / u.quota * 100 : 0}%"></span></div>
          <ul class="plain small">${usage(c).map(s => `<li><a href="#/ho-tro/${esc(s.id)}">${esc(s.id)}</a> ${supportTag(s.status)} <small class="muted">${T.fmt(s.createdAt)}</small></li>`).join("") || '<li class="muted">Chưa dùng</li>'}</ul></article>`; }).join("")}</div>`
        : `<div class="card empty">Bạn chưa được cấp thẻ hỗ trợ năm ${esc(year)}.</div>`}
      ${all.length || manage ? `<h2 class="section-title">Tất cả thẻ năm ${esc(year)}</h2>
        <div class="table-wrap"><table><thead><tr><th>Người giữ</th><th>Khoa</th><th>Loại</th><th class="num">Đã dùng / cấp</th>${manage ? "<th></th>" : ""}</tr></thead><tbody>
        ${all.sort((a, b) => App.userName(a.holderId).localeCompare(App.userName(b.holderId), "vi")).map(c => { const u = App.cardUsage(c); const h = App.user(c.holderId) || {};
          return `<tr><td>${esc(h.name || c.holderId)}</td><td>${esc(h.unit || "")}</td><td>${esc(App.typeLabel(c.type))}</td><td class="num">${u.used}/${u.quota} ${u.left ? "" : tag("muted", "hết lượt")}</td>
          ${manage ? `<td><button class="btn sm" data-ed="${esc(c.id)}">Sửa hạn mức</button></td>` : ""}</tr>`; }).join("") || `<tr><td colspan="5" class="empty">Chưa cấp thẻ nào.</td></tr>`}</tbody></table></div>` : ""}`;
    el.querySelector("#cf").addEventListener("change", e => App.go("#/the-ho-tro?nam=" + e.target.value));
    if (manage) {
      el.querySelector("#issue").onclick = () => forms.issueCards(year);
      el.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => {
        const c = App.find("cards", b.dataset.ed);
        const F = [{ name: "quota", label: "Số lượt", type: "number", min: 0, required: true }, { name: "note", label: "Ghi chú", full: true }];
        modal({ title: `Hạn mức — ${App.userName(c.holderId)} · ${App.typeLabel(c.type)}`, body: formHtml(F, c), onSubmit: async f => {
          const v = readForm(f, F);
          if (v.quota < App.cardUsage(c).used) throw new Error(`Đã dùng ${App.cardUsage(c).used} lượt; hạn mức không được thấp hơn.`);
          await S().save("cards", Object.assign({}, c, v)); await App.log(`Sửa hạn mức thẻ ${c.id}: ${v.quota} lượt`); done("Đã lưu.");
        } });
      });
    }
  };

  forms.issueCards = function (year) {
    const st = App.settings();
    const types = App.supportTypes().filter(t => t.needsCard);
    if (!types.length) { toast("Chưa có loại hỗ trợ nào cần thẻ. Đặt ở Quản trị › Danh mục.", "crit"); return; }
    const lecturers = App.roleUsers("giang_vien");
    const fields = [
      { name: "year", label: "Năm", type: "number", required: true }, { name: "type", label: "Loại hỗ trợ", type: "select", required: true, options: types.map(t => [t.code, t.label]) },
      { name: "quota", label: "Số lượt mỗi người", type: "number", min: 1, required: true },
      { name: "scope", label: "Cấp cho", type: "select", required: true, options: [["all", `Mọi giảng viên đang hoạt động (${lecturers.length})`], ...st.units.map(u => ["unit:" + u, `Giảng viên ${u} (${lecturers.filter(x => x.unit === u).length})`]), ...lecturers.map(u => ["user:" + u.id, `Một người: ${u.name}`])] }
    ];
    modal({ title: "Cấp thẻ hỗ trợ", wide: true, body: formHtml(fields, { year, quota: 2, scope: "all" }), submitLabel: "Cấp thẻ", onSubmit: async f => {
      const v = readForm(f, fields);
      const holders = v.scope === "all" ? lecturers : v.scope.startsWith("unit:") ? lecturers.filter(x => x.unit === v.scope.slice(5)) : lecturers.filter(x => x.id === v.scope.slice(5));
      const existing = App.all("cards");
      const list = holders.map(h => {
        const c = existing.find(x => x.holderId === h.id && x.type === v.type && String(x.year) === String(v.year));
        return Object.assign(c ? { ...c } : { id: `th-${v.year}-${v.type}-${h.id}`, holderId: h.id, type: v.type, year: String(v.year), issuedAt: App.state.today, issuedBy: App.me().id },
          { quota: c ? Math.max(Number(v.quota), App.cardUsage(c).used) : Number(v.quota), readers: [h.id] });
      });
      if (!list.length) throw new Error("Không có giảng viên nào trong phạm vi đã chọn.");
      await S().saveMany("cards", list);
      await App.notify(list.map(c => c.holderId), `Bạn được cấp ${v.quota} lượt thẻ “${App.typeLabel(v.type)}” năm ${v.year}`, "#/the-ho-tro");
      await App.log(`Cấp ${list.length} thẻ “${App.typeLabel(v.type)}” năm ${v.year}, ${v.quota} lượt/người`);
      done(`Đã cấp thẻ cho ${list.length} người.`);
    } });
  };
})();
