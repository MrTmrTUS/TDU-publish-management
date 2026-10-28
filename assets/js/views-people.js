/* Lý lịch khoa học, danh bạ nhà khoa học, quản trị (tài khoản, người hỗ trợ, đánh giá, danh mục, dữ liệu, nhật ký). */
(function () {
  const App = window.App, CFG = window.APP_CONFIG;
  const { T, ROLES, R, STATUSES, QUARTILES, SPS, statusLabel, profileCompleteness, DEFAULT_SETTINGS } = window.Domain;
  const { esc, NA, orNA, link, tag, statusChip, avatar, stars, formHtml, readForm, modal, confirmBox, toast, parseCsv, toCsv, download } = window.UI;
  const forms = App.forms;
  const S = () => window.Store;
  const done = msg => { toast(msg); App.rerender(); };
  const roleText = u => (u.roles || []).map(r => (R[r] || [r, r])[1]).join(", ");
  const STATUS_TAG = { active: ["good", "Đang hoạt động"], pending: ["warn", "Chờ duyệt"], locked: ["muted", "Đã khóa"] };

  /* ================= Lý lịch khoa học ================= */
  App.views.profile = function (el, m) {
    const meId = App.me().id, id = m && m[1] ? decodeURIComponent(m[1]) : meId;
    const u = App.user(id);
    if (!u || (u.status !== "active" && !App.isAdmin())) { el.innerHTML = `<div class="card empty">Không tìm thấy nhà khoa học. <a href="#/nha-khoa-hoc">Danh bạ</a></div>`; return; }
    const own = id === meId, sp = App.supporter(id), pc = profileCompleteness(u);
    const recs = App.visibleRecords().filter(r => r.ownerId === id || (r.memberIds || []).includes(id));
    const d = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`;
    el.innerHTML = `
      <div class="seg" role="group" style="margin-bottom:16px"><a class="seg-a" href="#/ly-lich" aria-current="${own ? "page" : "false"}">Lý lịch của tôi</a><a class="seg-a" href="#/nha-khoa-hoc">Danh bạ nhà khoa học</a></div>
      <section class="card profile-hero">${avatar(u.name, 72)}<div class="ph-text"><h1>${esc(u.name)}</h1><p>${esc([u.degree, u.title, u.unit].filter(Boolean).join(" · "))}</p>
        <div>${tag(...(STATUS_TAG[u.status] || ["muted", u.status]))} ${roleText(u) ? tag("info", roleText(u)) : ""} ${sp && sp.status === "da_duyet" ? tag("good", "Người hỗ trợ") : ""}</div></div>
        <div class="ph-side"><span>Hoàn thiện lý lịch: <b>${pc}%</b></span><div class="meter"><span style="width:${pc}%"></span></div>
        ${own ? `<div class="actions"><button class="btn primary" id="edit">Cập nhật lý lịch</button><button class="btn" id="pw">Đổi mật khẩu</button></div>` : ""}</div></section>
      <div class="grid g2" style="margin-top:16px">
        <section class="card"><h2>Thông tin chung</h2><dl class="dl">${d("Họ và tên", esc(u.name))}${d("Học hàm, học vị", orNA(u.degree))}${d("Chức vụ", orNA(u.title))}${d("Đơn vị", orNA(u.unit))}
          ${d("Email", esc(u.email))}${d("Điện thoại", own || App.isCoord() ? orNA(u.phone) : '<span class="na">Ẩn</span>')}</dl></section>
        <section class="card"><h2>Định danh khoa học</h2><dl class="dl">${d("ORCID", u.orcid ? link("https://orcid.org/" + u.orcid, u.orcid) : NA)}${d("Scopus Author ID", u.scopusId ? link("https://www.scopus.com/authid/detail.uri?authorId=" + u.scopusId, u.scopusId) : NA)}
          ${d("Google Scholar", link(u.scholarUrl, "Trang Google Scholar"))}${d("Lĩnh vực nghiên cứu", orNA(u.fields))}</dl>
          <p class="muted" style="font-size:12px">Kế hoạch 2026–2028 đặt chỉ tiêu ≥ 90% giảng viên có hồ sơ ORCID / Scopus và tên đơn vị chuẩn hóa ngay năm 2026.</p></section>
      </div>
      <section class="card" style="margin-top:16px"><h2>Giới thiệu</h2><p>${u.bio ? esc(u.bio).replace(/\n/g, "<br>") : NA}</p></section>
      <section class="card" style="margin-top:16px"><h2>Công bố tiêu biểu</h2>${u.publications ? `<ol>${u.publications.split("\n").filter(x => x.trim()).map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : `<p class="empty">Chưa khai báo.</p>`}</section>
      <section class="card" style="margin-top:16px"><h2>Hồ sơ nghiên cứu ${own ? "đang tham gia" : "bạn có quyền xem"} <span class="muted">(${recs.length})</span></h2>
        ${recs.length ? `<ul class="plain">${recs.map(r => `<li><div><a href="#/ho-so/${esc(r.id)}">${esc(r.id)}</a> ${esc(r.shortTitle || r.title)} ${statusChip(r.status)}</div><small class="muted">${r.ownerId === id ? "Chủ nhiệm" : "Thành viên"}</small></li>`).join("")}</ul>` : `<p class="empty">Không có.</p>`}</section>`;
    if (own) {
      el.querySelector("#edit").onclick = () => forms.profile();
      el.querySelector("#pw").onclick = () => forms.password();
    }
  };

  forms.profile = function () {
    const u = App.me();
    const fields = [
      { name: "name", label: "Họ và tên", required: true }, { name: "degree", label: "Học hàm, học vị", placeholder: "VD: TS., PGS.TS." },
      { name: "title", label: "Chức vụ" }, { name: "unit", label: "Đơn vị", type: "select", required: true, options: App.settings().units.map(x => [x, x]) },
      { name: "phone", label: "Điện thoại" }, { name: "orcid", label: "ORCID iD", placeholder: "0000-0000-0000-0000" },
      { name: "scopusId", label: "Scopus Author ID" }, { name: "scholarUrl", label: "Trang Google Scholar", type: "url" },
      { name: "fields", label: "Lĩnh vực nghiên cứu", full: true, placeholder: "VD: Y tế công cộng; Dịch tễ học" },
      { name: "bio", label: "Giới thiệu ngắn", type: "textarea", rows: 3 },
      { name: "publications", label: "Công bố tiêu biểu (mỗi dòng một công bố)", type: "textarea", rows: 4 }
    ];
    modal({ title: "Cập nhật lý lịch khoa học", wide: true, body: formHtml(fields, u), onSubmit: async f => {
      const v = readForm(f, fields);
      if (v.orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(v.orcid)) throw new Error("ORCID iD có dạng 0000-0000-0000-0000.");
      await S().saveUser(Object.assign({}, u, v));
      done("Đã cập nhật lý lịch.");
    } });
  };
  forms.password = function () {
    const demo = S().mode === "demo";
    const fields = [...(demo ? [{ name: "old", label: "Mật khẩu hiện tại", type: "password", required: true, full: true }] : []),
      { name: "pw", label: "Mật khẩu mới (ít nhất 8 ký tự)", type: "password", required: true, full: true }, { name: "pw2", label: "Nhập lại", type: "password", required: true, full: true }];
    modal({ title: "Đổi mật khẩu", body: formHtml(fields, {}), onSubmit: async f => {
      const v = readForm(f, fields);
      if (v.pw.length < 8) throw new Error("Mật khẩu mới cần ít nhất 8 ký tự.");
      if (v.pw !== v.pw2) throw new Error("Hai lần nhập không khớp.");
      await S().changePassword(v.old, v.pw); toast("Đã đổi mật khẩu.");
    } });
  };

  /* ================= Danh bạ nhà khoa học ================= */
  App.views.directory = function (el, _m, q) {
    const kw = (q.q || "").toLowerCase(), unit = q.khoa || "";
    const list = App.activeUsers().filter(u => (!unit || u.unit === unit) && (!kw || [u.name, u.fields, u.unit, u.degree].join(" ").toLowerCase().includes(kw)))
      .sort((a, b) => a.name.split(" ").pop().localeCompare(b.name.split(" ").pop(), "vi"));
    el.innerHTML = `
      <div class="seg" role="group" style="margin-bottom:16px"><a class="seg-a" href="#/ly-lich">Lý lịch của tôi</a><a class="seg-a" href="#/nha-khoa-hoc" aria-current="page">Danh bạ nhà khoa học</a></div>
      <div class="page-head"><div><h1>Danh bạ nhà khoa học</h1><p>${list.length} người. Tìm theo tên, lĩnh vực hoặc đơn vị để kết nối hợp tác.</p></div></div>
      <form class="filters" id="df"><label class="grow">Tìm<input name="q" value="${esc(q.q || "")}" placeholder="Tên, lĩnh vực…"></label>
        <label>Đơn vị<select name="khoa"><option value="">Tất cả</option>${App.settings().units.map(u => `<option${u === unit ? " selected" : ""}>${esc(u)}</option>`).join("")}</select></label></form>
      <div class="people-grid">${list.map(u => { const sp = App.supporter(u.id); return `<a class="card person link" href="#/ly-lich/${esc(u.id)}"><div class="person-head">${avatar(u.name, 44)}<div><b>${esc(u.name)}</b><small>${esc([u.degree, u.unit].filter(Boolean).join(" · "))}</small></div></div>
        <p class="muted" style="font-size:13px;margin:8px 0 0">${esc(u.fields || "Chưa khai lĩnh vực")}</p>${sp && sp.status === "da_duyet" ? `<div style="margin-top:8px">${tag("good", "Người hỗ trợ")}</div>` : ""}</a>`; }).join("")}</div>`;
    const df = el.querySelector("#df");
    const go = () => { const p = new URLSearchParams(); if (df.elements.q.value) p.set("q", df.elements.q.value); if (df.elements.khoa.value) p.set("khoa", df.elements.khoa.value); App.go("#/nha-khoa-hoc" + (p.toString() ? "?" + p : "")); };
    df.addEventListener("change", go); df.elements.q.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } });
  };

  /* ================= Quản trị ================= */
  const TABS = [["tai-khoan", "Tài khoản"], ["nguoi-ho-tro", "Người hỗ trợ"], ["danh-gia", "Đánh giá người hỗ trợ"], ["danh-muc", "Danh mục & ngưỡng"], ["du-lieu", "Dữ liệu"], ["nhat-ky", "Nhật ký"]];

  App.views.admin = function (el, _m, q) {
    if (!App.isAdmin()) { el.innerHTML = `<div class="card empty">Trang này dành cho quản trị viên.</div>`; return; }
    const tab = TABS.some(t => t[0] === q.tab) ? q.tab : "tai-khoan";
    const pendU = App.users().filter(u => u.status === "pending").length, pendS = App.all("supporters").filter(s => s.status === "cho_duyet").length;
    el.innerHTML = `<div class="page-head"><div><h1>Quản trị</h1></div></div>
      <div class="seg wrap" role="tablist" style="margin-bottom:16px">${TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${tab === k}" aria-pressed="${tab === k}">${esc(l)}${k === "tai-khoan" && pendU ? ` (${pendU})` : ""}${k === "nguoi-ho-tro" && pendS ? ` (${pendS})` : ""}</button>`).join("")}</div>
      <div id="tabBody"></div>`;
    el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => App.go("#/quan-tri?tab=" + b.dataset.tab));
    ADMIN[tab](el.querySelector("#tabBody"));
  };

  const ADMIN = {
    "tai-khoan"(el) {
      const users = [...App.users()].sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || a.name.localeCompare(b.name, "vi"));
      el.innerHTML = `<section class="card"><div class="card-head"><h2>Tài khoản <span class="muted">(${users.length})</span></h2>${S().mode === "demo" ? `<button class="btn sm primary" id="addU">+ Thêm tài khoản</button>` : ""}</div>
        <p class="card-sub">Người dùng tự đăng ký bằng email của trường; quản trị viên duyệt và gán vai trò. Khóa tài khoản khi người dùng thay đổi nhiệm vụ (lịch sử được giữ).${S().mode === "supabase" ? " Mời người ngoài trường: Supabase › Authentication › Invite user." : ""}</p>
        <div class="table-wrap"><table><thead><tr><th>Người dùng</th><th>Đơn vị</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng ký</th><th></th></tr></thead><tbody>
        ${users.map(u => `<tr><td><b>${esc(u.name)}</b><span class="sub">${esc(u.email)}</span></td><td>${esc(u.unit || "")}</td><td>${esc(roleText(u)) || NA}</td><td>${tag(...(STATUS_TAG[u.status] || ["muted", u.status]))}</td><td><small>${T.fmt(u.createdAt)}</small></td>
          <td class="nowrap">${u.status === "pending" ? `<button class="btn sm primary" data-ok="${esc(u.id)}">Duyệt</button> <button class="btn sm ghost" data-lock="${esc(u.id)}">Từ chối</button>`
            : `<button class="btn sm" data-role="${esc(u.id)}">Vai trò</button> ${u.id !== App.me().id ? (u.status === "locked" ? `<button class="btn sm ghost" data-ok="${esc(u.id)}">Mở khóa</button>` : `<button class="btn sm ghost" data-lock="${esc(u.id)}">Khóa</button>`) : ""}`}</td></tr>`).join("")}</tbody></table></div></section>`;
      el.querySelectorAll("[data-ok]").forEach(b => b.onclick = async () => {
        const u = App.user(b.dataset.ok); await S().saveUser(Object.assign({}, u, { status: "active", approvedAt: new Date().toISOString(), approvedBy: App.me().id, roles: (u.roles || []).length ? u.roles : ["giang_vien"] }));
        await App.notify([u.id], "Tài khoản của bạn đã được duyệt. Chào mừng đến với " + CFG.APP_NAME + "!", "#/ly-lich");
        await App.log(`Duyệt tài khoản ${u.email}`); done("Đã duyệt " + u.name);
      });
      el.querySelectorAll("[data-lock]").forEach(b => b.onclick = () => { const u = App.user(b.dataset.lock);
        confirmBox(u.status === "pending" ? "Từ chối đăng ký" : "Khóa tài khoản", `${u.status === "pending" ? "Từ chối" : "Khóa"} tài khoản ${u.name}? Người này sẽ không đăng nhập được.`, async () => {
          await S().saveUser(Object.assign({}, u, { status: "locked" })); await App.log(`Khóa tài khoản ${u.email}`); done("Đã khóa.");
        }, u.status === "pending" ? "Từ chối" : "Khóa"); });
      el.querySelectorAll("[data-role]").forEach(b => b.onclick = () => { const u = App.user(b.dataset.role);
        const F = [{ name: "roles", label: "Vai trò (một người có thể giữ nhiều vai trò)", type: "multi", options: ROLES }];
        modal({ title: "Vai trò — " + u.name, body: formHtml(F, u) + `<p class="muted" style="font-size:12px">“Người hỗ trợ” không gán ở đây: người dùng tự đăng ký ở mục Người hỗ trợ và được duyệt ở tab Người hỗ trợ.</p>`, onSubmit: async f => {
          const v = readForm(f, F);
          if (!v.roles.length) throw new Error("Chọn ít nhất một vai trò.");
          if (u.id === App.me().id && !v.roles.includes("quan_tri")) throw new Error("Bạn không thể tự bỏ vai trò quản trị của mình.");
          await S().saveUser(Object.assign({}, u, { roles: v.roles })); await App.log(`Đổi vai trò ${u.email}: ${v.roles.join(", ")}`); done("Đã lưu vai trò.");
        } }); });
      const add = el.querySelector("#addU");
      if (add) add.onclick = () => {
        const F = [{ name: "name", label: "Họ và tên", required: true }, { name: "email", label: "Email", type: "email", required: true }, { name: "degree", label: "Học hàm, học vị" },
          { name: "unit", label: "Đơn vị", type: "select", required: true, options: App.settings().units.map(x => [x, x]) }, { name: "roles", label: "Vai trò", type: "multi", options: ROLES }];
        modal({ title: "Thêm tài khoản (bản demo: mật khẩu Tdu@2026)", wide: true, body: formHtml(F, { roles: ["giang_vien"] }), onSubmit: async f => {
          const v = readForm(f, F);
          await S().signUp({ email: v.email, password: "Tdu@2026", name: v.name, unit: v.unit, degree: v.degree });
          const u = App.users().find(x => x.email === v.email.trim().toLowerCase());
          await S().saveUser(Object.assign({}, u, { status: "active", roles: v.roles.length ? v.roles : ["giang_vien"] }));
          await App.log(`Thêm tài khoản ${v.email}`); done("Đã thêm tài khoản.");
        } });
      };
    },
    "nguoi-ho-tro"(el) {
      const list = [...App.all("supporters")].sort((a, b) => (a.status === "cho_duyet" ? 0 : 1) - (b.status === "cho_duyet" ? 0 : 1));
      el.innerHTML = `<section class="card"><h2>Đăng ký người hỗ trợ</h2><p class="card-sub">Duyệt chuyên môn và số suất trước khi người hỗ trợ xuất hiện trong danh bạ.</p>
        <div class="table-wrap"><table><thead><tr><th>Người hỗ trợ</th><th>Loại hỗ trợ</th><th>Chuyên môn</th><th class="num">Suất</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        ${list.map(sp => { const l = App.supporterLoad(sp); return `<tr><td><b>${esc(App.userName(sp.userId))}</b><span class="sub">Đăng ký ${T.fmt(sp.registeredAt)}</span></td><td>${esc((sp.types || []).map(App.typeLabel).join(", "))}</td>
          <td><small>${esc(sp.expertise || "")}</small>${sp.conditions ? `<span class="sub">Điều kiện: ${esc(sp.conditions)}</span>` : ""}</td><td class="num">${l.load}/${sp.capacity}</td>
          <td>${tag((SPS[sp.status] || ["", "", "muted"])[2], (SPS[sp.status] || ["", sp.status])[1])}</td>
          <td class="nowrap">${sp.status === "cho_duyet" ? `<button class="btn sm primary" data-ok="${esc(sp.id)}">Duyệt</button> <button class="btn sm ghost" data-no="${esc(sp.id)}">Không duyệt</button>` : `<button class="btn sm" data-cap="${esc(sp.id)}">Sửa suất</button>`}</td></tr>`; }).join("") || `<tr><td colspan="6" class="empty">Chưa có đăng ký.</td></tr>`}</tbody></table></div></section>`;
      el.querySelectorAll("[data-ok]").forEach(b => b.onclick = async () => { const sp = App.find("supporters", b.dataset.ok);
        await S().save("supporters", Object.assign({}, sp, { status: "da_duyet", approvedAt: App.state.today, approvedBy: App.me().id }));
        await App.notify([sp.userId], "Đăng ký người hỗ trợ của bạn đã được duyệt — bạn xuất hiện trong danh bạ.", "#/nguoi-ho-tro");
        await App.log(`Duyệt người hỗ trợ ${App.userName(sp.userId)}`); done("Đã duyệt."); });
      el.querySelectorAll("[data-no]").forEach(b => b.onclick = () => { const sp = App.find("supporters", b.dataset.no);
        const F = [{ name: "reviewNote", label: "Lý do (gửi cho người đăng ký)", required: true, full: true }];
        modal({ title: "Không duyệt — " + App.userName(sp.userId), body: formHtml(F, {}), onSubmit: async f => { const v = readForm(f, F);
          await S().save("supporters", Object.assign({}, sp, { status: "tu_choi", reviewNote: v.reviewNote }));
          await App.notify([sp.userId], "Đăng ký người hỗ trợ chưa được duyệt: " + v.reviewNote, "#/nguoi-ho-tro"); done("Đã cập nhật."); } }); });
      el.querySelectorAll("[data-cap]").forEach(b => b.onclick = () => { const sp = App.find("supporters", b.dataset.cap);
        const F = [{ name: "capacity", label: "Số việc nhận cùng lúc tối đa (suất)", type: "number", min: 1, required: true }];
        modal({ title: "Suất — " + App.userName(sp.userId), body: formHtml(F, sp), onSubmit: async f => { const v = readForm(f, F);
          if (!(v.capacity >= 1)) throw new Error("Ít nhất 1 suất."); await S().save("supporters", Object.assign({}, sp, v)); done("Đã lưu."); } }); });
    },
    "danh-gia"(el) {
      const ratings = App.all("ratings");
      const by = {};
      ratings.forEach(r => { (by[r.supporterId] = by[r.supporterId] || []).push(r); });
      el.innerHTML = `<section class="card"><h2>Đánh giá người hỗ trợ</h2><p class="card-sub">Người gửi chấm 1–5 sao khi xác nhận kết quả. Chỉ quản trị viên xem được trang này; dùng để cải thiện chất lượng hỗ trợ, không công khai.</p>
        <div class="table-wrap"><table><thead><tr><th>Người hỗ trợ</th><th class="num">Số lượt</th><th>Trung bình</th><th>Nhận xét gần đây</th></tr></thead><tbody>
        ${Object.entries(by).map(([sid, rs]) => { const avg = rs.reduce((a, r) => a + r.stars, 0) / rs.length; return `<tr><td>${esc(App.userName(sid))}</td><td class="num">${rs.length}</td><td>${stars(Math.round(avg))} <small>${avg.toFixed(1)}</small></td>
          <td>${rs.slice(-3).reverse().map(r => `<div><small><a href="#/ho-tro/${esc(r.supportId)}">${esc(r.supportId)}</a> ${stars(r.stars)} ${esc(r.comment || "")}</small></div>`).join("")}</td></tr>`; }).join("") || `<tr><td colspan="4" class="empty">Chưa có đánh giá.</td></tr>`}</tbody></table></div></section>`;
    },
    "danh-muc"(el) {
      const st = App.settings();
      el.innerHTML = `<div class="grid g2">
        <section class="card"><h2>Khoa / đơn vị và ngưỡng nhắc việc</h2><form id="cfg" class="form-grid" style="margin-top:12px">
          <div class="field full"><label for="units">Khoa / đơn vị (mỗi dòng một tên)</label><textarea id="units" name="units" rows="5">${esc(st.units.join("\n"))}</textarea></div>
          <div class="field"><label for="triageWorkdays">Hạn phân công yêu cầu (ngày làm việc)</label><input id="triageWorkdays" name="triageWorkdays" type="number" min="1" value="${st.triageWorkdays}"></div>
          <div class="field"><label for="staleDays">Nhắc khi hồ sơ không cập nhật quá (ngày)</label><input id="staleDays" name="staleDays" type="number" min="1" value="${st.staleDays}"></div>
          <div class="field"><label for="soonDays">Báo “sắp đến hạn” trước (ngày)</label><input id="soonDays" name="soonDays" type="number" min="0" value="${st.soonDays}"></div>
          <div class="field"><label for="resubmitDays">Hạn nộp lại sau từ chối (ngày)</label><input id="resubmitDays" name="resubmitDays" type="number" min="1" value="${st.resubmitDays}"></div>
          <div class="field full"><label for="holidays">Ngày nghỉ lễ (mỗi dòng một ngày, DD/MM/YYYY)</label><textarea id="holidays" name="holidays" rows="3">${esc(st.holidays.map(T.fmt).join("\n"))}</textarea></div>
          <div><button class="btn primary">Lưu</button></div></form></section>
        <section class="card"><h2>Loại hỗ trợ</h2><p class="card-sub">Đánh dấu “Cần thẻ” cho các loại tốn nguồn lực (thống kê, hiệu đính…): giảng viên phải có lượt thẻ mới gửi được.</p>
          <form id="types"><div class="table-wrap"><table><thead><tr><th>Mã</th><th>Tên</th><th>Cần thẻ</th></tr></thead><tbody id="typeRows">
          ${st.supportTypes.map((t, i) => `<tr><td class="code">${esc(t.code)}</td><td><input name="label-${i}" value="${esc(t.label)}" required></td><td><input type="checkbox" name="card-${i}"${t.needsCard ? " checked" : ""}></td></tr>`).join("")}</tbody></table></div>
          <div class="form-grid" style="margin-top:10px"><div class="field"><label for="newType">Thêm loại mới</label><input id="newType" name="newType" placeholder="Tên loại hỗ trợ"></div></div>
          <div style="margin-top:10px"><button class="btn primary">Lưu loại hỗ trợ</button></div></form></section></div>`;
      const normDate = v => { let m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; m = v.match(/^\d{4}-\d{2}-\d{2}$/); return m ? v : null; };
      el.querySelector("#cfg").addEventListener("submit", async e => { e.preventDefault(); const fm = e.target;
        const num = k => { const v = Number(fm.elements[k].value); return fm.elements[k].value !== "" && v >= 0 ? v : DEFAULT_SETTINGS[k]; };
        await S().saveSettings(Object.assign({}, S().settings(), { units: fm.elements.units.value.split("\n").map(x => x.trim()).filter(Boolean), triageWorkdays: num("triageWorkdays"),
          staleDays: num("staleDays"), soonDays: num("soonDays"), resubmitDays: num("resubmitDays"), holidays: fm.elements.holidays.value.split(/[\s,;]+/).filter(Boolean).map(normDate).filter(Boolean).sort() }));
        await App.log("Sửa danh mục khoa / ngưỡng"); done("Đã lưu."); });
      el.querySelector("#types").addEventListener("submit", async e => { e.preventDefault(); const fm = e.target;
        const types = st.supportTypes.map((t, i) => ({ code: t.code, label: fm.elements["label-" + i].value.trim() || t.label, needsCard: fm.elements["card-" + i].checked }));
        const nt = fm.elements.newType.value.trim();
        if (nt) types.push({ code: "loai_" + Date.now().toString(36), label: nt, needsCard: false });
        await S().saveSettings(Object.assign({}, S().settings(), { supportTypes: types })); await App.log("Sửa danh mục loại hỗ trợ"); done("Đã lưu loại hỗ trợ."); });
    },
    "du-lieu"(el) {
      const demo = S().mode === "demo";
      el.innerHTML = `<div class="grid g2">
        <section class="card"><h2>Sao lưu và khôi phục</h2><p class="card-sub">Tải toàn bộ dữ liệu (không kèm mật khẩu) dạng JSON; dùng để lưu trữ định kỳ hoặc chuyển sang Supabase.</p>
          <div class="actions"><button class="btn" id="bk">Tải bản sao lưu (JSON)</button><label class="btn">Khôi phục từ JSON<input type="file" id="restore" accept=".json,application/json" hidden></label>
          ${demo ? `<button class="btn danger" id="reset">Đặt lại dữ liệu demo</button>` : ""}</div></section>
        <section class="card"><h2>Nhập hồ sơ từ Excel (CSV)</h2><p class="card-sub">Cột: Mã, Tên hồ sơ, Khoa, Email chủ nhiệm, Trạng thái, Hạn (DD/MM/YYYY), Việc tiếp theo, Tạp chí, Q, Nhóm. Có dòng lỗi thì không ghi dòng nào.</p>
          <div class="actions"><button class="btn" id="tpl">Tải tệp mẫu</button><input type="file" id="csv" accept=".csv,text/csv" style="max-width:240px"><button class="btn primary" id="chk">Kiểm tra</button></div><div id="imres"></div></section></div>`;
      el.querySelector("#bk").onclick = () => download(`sao-luu_${App.state.today}.json`, JSON.stringify(S().exportAll(), null, 1), "application/json");
      el.querySelector("#restore").onchange = e => { const file = e.target.files[0]; if (!file) return;
        file.text().then(txt => { let obj; try { obj = JSON.parse(txt); } catch (ex) { toast("Tệp JSON không hợp lệ.", "crit"); return; }
          if (!obj || !Array.isArray(obj.records)) { toast("Tệp không đúng cấu trúc sao lưu.", "crit"); return; }
          confirmBox("Khôi phục dữ liệu", `Ghi dữ liệu từ “${file.name}” vào hệ thống?${demo ? " Dữ liệu hiện tại sẽ bị thay thế." : " Bản ghi trùng mã sẽ bị ghi đè."}`, async () => { await S().replaceAll(obj); done("Đã khôi phục."); }, "Khôi phục"); }); };
      const rs = el.querySelector("#reset");
      if (rs) rs.onclick = () => confirmBox("Đặt lại dữ liệu demo", "Xóa mọi thay đổi bạn đã làm trên trình duyệt này và nạp lại dữ liệu mẫu?", async () => { await S().resetDemo(); location.hash = "#/"; App.rerender(); }, "Đặt lại");
      const COLS = ["Mã", "Tên hồ sơ", "Khoa", "Email chủ nhiệm", "Trạng thái", "Hạn", "Việc tiếp theo", "Tạp chí", "Q", "Nhóm"];
      el.querySelector("#tpl").onclick = () => download("mau_ho_so.csv", toCsv([COLS, ["HS-101", "Tên đầy đủ của nghiên cứu", App.settings().units[0] || "Khoa …", App.me().email, "Viết bài", "30/11/2026", "Hoàn thiện phần kết quả", "Tên tạp chí", "Q2", "Nhóm …"]]));
      el.querySelector("#chk").onclick = async () => {
        const file = el.querySelector("#csv").files[0], out = el.querySelector("#imres");
        if (!file) { toast("Chọn tệp CSV trước.", "crit"); return; }
        const rows = parseCsv(await file.text()), head = (rows[0] || []).map(h => h.trim()), idx = COLS.map(c => head.indexOf(c));
        if (rows.length < 2 || idx.slice(0, 5).some(i => i < 0)) { out.innerHTML = `<p class="form-error" style="margin:12px 0 0">Thiếu dòng dữ liệu hoặc thiếu cột bắt buộc (5 cột đầu). Hãy dùng tệp mẫu.</p>`; return; }
        const seen = new Set();
        const res = rows.slice(1).map((c, i) => {
          const g = j => idx[j] >= 0 ? (c[idx[j]] || "").trim() : "";
          const errs = [], rec = { id: g(0), title: g(1), unit: g(2), status: g(4), nextAction: g(6), journal: g(7), group: g(9) };
          if (!rec.id) errs.push("thiếu mã"); if (!rec.title) errs.push("thiếu tên");
          if (seen.has(rec.id)) errs.push("mã trùng trong tệp"); seen.add(rec.id);
          if (App.find("records", rec.id)) errs.push("mã đã có trong hệ thống");
          if (!App.settings().units.includes(rec.unit)) errs.push(`khoa “${rec.unit}” chưa có trong danh mục`);
          const owner = App.activeUsers().find(u => u.email.toLowerCase() === g(3).toLowerCase()); if (!owner) errs.push(`không có tài khoản ${g(3) || "(trống)"}`); else rec.ownerId = owner.id;
          const sh = STATUSES.find(s => s[0] === rec.status || s[1].toLowerCase() === rec.status.toLowerCase()); if (!sh) errs.push(`trạng thái “${rec.status}” không hợp lệ`); else rec.status = sh[0];
          const due = g(5); if (due) { const m = due.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!m) errs.push("hạn sai định dạng"); else rec.due = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
          const q = g(8); if (q) { const qh = QUARTILES.find(x => x[0] === q || x[1].toLowerCase() === q.toLowerCase()); if (!qh) errs.push(`Q “${q}” không hợp lệ`); else rec.quartile = qh[0]; }
          return { line: i + 2, rec, errs };
        });
        const bad = res.filter(x => x.errs.length);
        out.innerHTML = `<p style="margin-top:12px"><b>${res.length}</b> dòng · ${tag("good", `${res.length - bad.length} hợp lệ`, "✓")} ${bad.length ? tag("crit", `${bad.length} lỗi`, "!") : ""}</p>
          <div class="table-wrap"><table><thead><tr><th class="num">Dòng</th><th>Mã</th><th>Kết quả</th></tr></thead><tbody>${res.map(x => `<tr><td class="num">${x.line}</td><td class="code">${esc(x.rec.id)}</td><td>${x.errs.length ? tag("crit", "Lỗi") + " " + esc(x.errs.join("; ")) : tag("good", "Thêm mới", "✓")}</td></tr>`).join("")}</tbody></table></div>
          <div style="margin-top:10px"><button class="btn primary" id="commit"${bad.length ? " disabled" : ""}>Ghi ${res.length} hồ sơ</button></div>`;
        if (!bad.length) out.querySelector("#commit").onclick = async () => {
          for (const x of res) await App.saveRecord(Object.assign({ createdAt: App.state.today, createdBy: App.me().id, memberIds: [], evidence: [], risk: "", doi: "" }, x.rec), `Nhập từ tệp ${file.name}, dòng ${x.line}`);
          await App.log(`Nhập ${res.length} hồ sơ từ ${file.name}`); done(`Đã nhập ${res.length} hồ sơ.`);
        };
      };
    },
    "nhat-ky"(el) {
      const log = [...App.all("log")].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
      el.innerHTML = `<section class="card"><h2>Nhật ký thao tác</h2><p class="card-sub">Duyệt tài khoản, cấp thẻ, tạo hồ sơ, gửi yêu cầu… (300 mục gần nhất). Lịch sử chi tiết nằm trong từng hồ sơ và yêu cầu.</p>
        ${log.length ? `<ul class="timeline">${log.map(l => `<li><div class="when">${esc(T.fmtTime(l.at))} · ${esc(App.userName(l.by))}</div><div>${l.href ? `<a href="${esc(l.href)}">${esc(l.text)}</a>` : esc(l.text)}</div></li>`).join("")}</ul>` : `<p class="empty">Chưa có.</p>`}</section>`;
    }
  };
})();
