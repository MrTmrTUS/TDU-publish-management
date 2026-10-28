/* Khung ứng dụng: phân quyền, ghi lịch sử & thông báo, bố cục, điều hướng, đăng nhập / đăng ký. */
(function () {
  const CFG = window.APP_CONFIG;
  const { T, DEFAULT_SETTINGS, statusLabel, recordFlags, supportFacts, supporterLoad, cardUsage, R } = window.Domain;
  const { esc, avatar, toast } = window.UI;

  const pref = {
    get(k, d) { try { const v = localStorage.getItem("tdu-cong:pref:" + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("tdu-cong:pref:" + k, v); } catch (e) { /* bỏ qua */ } }
  };
  const S = () => window.Store;
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  const RECORD_FIELDS = { title: "Tên", shortTitle: "Tên rút gọn", unit: "Khoa", group: "Nhóm", ownerId: "Chủ nhiệm", memberIds: "Thành viên",
    status: "Trạng thái", journal: "Tạp chí", quartile: "Phân hạng", nextAction: "Việc tiếp theo", due: "Hạn", risk: "Rủi ro", doi: "DOI", docsUrl: "Thư mục tài liệu", note: "Ghi chú" };

  const App = {
    views: {}, forms: {}, pref, uid,
    state: { today: T.today() },

    /* ---------- dữ liệu ---------- */
    me() { return S().me(); },
    users() { return S().users(); },
    user(id) { return S().users().find(u => u.id === id); },
    userName(id) { const u = App.user(id); return u ? u.name : ""; },
    all(col) { return S().all(col); },
    find(col, id) { return S().all(col).find(x => x.id === id); },
    settings() { return Object.assign({}, DEFAULT_SETTINGS, S().settings()); },
    supportTypes() { return App.settings().supportTypes; },
    typeLabel(code) { const t = App.supportTypes().find(x => x.code === code); return t ? t.label : code; },
    activeUsers() { return App.users().filter(u => u.status === "active"); },
    roleUsers(role) { return App.activeUsers().filter(u => (u.roles || []).includes(role)); },
    supporter(userId) { return App.all("supporters").find(s => s.userId === userId); },
    supporterLoad(sp) { return supporterLoad(sp, App.all("supports")); },
    cardUsage(c) { return cardUsage(c, App.all("supports")); },
    flags(r) { return recordFlags(r, App.all("supports"), App.settings(), App.state.today); },
    supportFacts(s) { return supportFacts(s, App.settings(), App.state.today); },

    /* ---------- quyền (khớp với RLS trong supabase/schema.sql) ---------- */
    has(role) { const m = App.me(); return !!m && (m.roles || []).includes(role); },
    isAdmin() { return App.has("quan_tri"); },
    isCoord() { return App.has("dieu_phoi") || App.isAdmin(); },
    isLeader() { return App.has("lanh_dao"); },
    seesAll() { return App.isCoord() || App.isLeader(); },
    isSupporter() { const sp = App.supporter(App.me().id); return !!sp && ["da_duyet", "tam_ngung"].includes(sp.status); },
    canSee(obj) { return App.seesAll() || (obj.readers || []).includes(App.me().id); },
    isTeam(r) { const me = App.me().id; return r.ownerId === me || (r.memberIds || []).includes(me); },
    canEditRecord(r) { return App.isTeam(r) || App.isCoord(); },
    canSeeFiles(r) { return App.isTeam(r) || App.isCoord() || App.all("supports").some(s => s.recordId === r.id && s.supporterId === App.me().id); },
    visibleRecords() { return App.all("records").filter(App.canSee); },
    visibleSupports() { return App.all("supports").filter(App.canSee); },

    /* ---------- ghi dữ liệu ---------- */
    recordReaders(r) {
      const sup = App.all("supports").filter(s => s.recordId === r.id && s.supporterId).map(s => s.supporterId);
      return [...new Set([r.ownerId, ...(r.memberIds || []), ...sup].filter(Boolean))];
    },
    supportReaders(s) {
      const r = App.find("records", s.recordId) || {};
      return [...new Set([s.requesterId, r.ownerId, ...(r.memberIds || []), s.supporterId].filter(Boolean))];
    },
    /* Người đang thao tác vẫn giữ quyền xem dòng mình vừa sửa (vd. người hỗ trợ từ chối việc) — RLS yêu cầu điều này */
    keepMe(readers, prev) { const me = App.me().id; return prev && (prev.readers || []).includes(me) && !readers.includes(me) ? [...readers, me] : readers; },
    /* Lưu hồ sơ: mọi thay đổi được ghi vào lịch sử; "cập nhật gần nhất" chỉ đổi khi nội dung đổi */
    async saveRecord(next, note = "") {
      const prev = App.find("records", next.id);
      const today = App.state.today;
      const show = (k, v) => k === "status" ? statusLabel(v) : k === "due" ? T.fmt(v) : k === "ownerId" ? App.userName(v)
        : k === "memberIds" ? (v || []).map(App.userName).join(", ") : (v || "∅");
      const changes = [];
      if (!prev) changes.push(`Tạo hồ sơ — ${statusLabel(next.status)}`);
      else Object.keys(RECORD_FIELDS).forEach(k => {
        if (JSON.stringify(prev[k] || "") !== JSON.stringify(next[k] || "")) changes.push(`${RECORD_FIELDS[k]}: ${show(k, prev[k])} → ${show(k, next[k])}`);
      });
      if (prev && !changes.length && !note) return prev;
      if (!prev || prev.status !== next.status) next.statusSince = today;
      next.updatedAt = today;
      next.history = [...(prev ? prev.history || [] : []), { at: new Date().toISOString(), by: App.me().id, text: changes.join("; "), note }];
      next.readers = App.keepMe(App.recordReaders(next), prev);
      await S().save("records", next);
      return next;
    },
    async saveSupport(next, text) {
      next.history = [...(next.history || []), { at: new Date().toISOString(), by: App.me().id, text }];
      next.readers = App.keepMe(App.supportReaders(next), App.find("supports", next.id));
      await S().save("supports", next);
      const r = App.find("records", next.recordId);
      if (r) await App.saveRecord(Object.assign({}, r), `${next.id}: ${text}`); // cập nhật quyền xem + lịch sử hồ sơ
      return next;
    },
    async notify(userIds, text, href) {
      const me = App.me().id;
      const list = [...new Set(userIds.filter(id => id && id !== me))].map(id => ({ id: uid("n-"), userId: id, readers: [id], text, href: href || "#/", at: new Date().toISOString(), read: false }));
      if (list.length) await S().saveMany("notifications", list);
    },
    async log(text, href) {
      await S().save("log", { id: uid("l-"), at: new Date().toISOString(), by: App.me().id, text, href: href || "", readers: [] });
    },
    myNotifications() { const me = App.me().id; return App.all("notifications").filter(n => n.userId === me).sort((a, b) => b.at.localeCompare(a.at)); },

    go(hash) { if (location.hash === hash) render(); else location.hash = hash; },
    rerender() { render(); }
  };
  window.App = App;

  /* ---------- Chủ đề sáng / tối ---------- */
  const applyTheme = t => { if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); };
  applyTheme(pref.get("theme", ""));

  /* ---------- Biểu tượng (nét mảnh, 24×24) ---------- */
  const ICON = {
    home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
    folder: "M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
    help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5.6 5.6l4.3 4.3M14.1 14.1l4.3 4.3M18.4 5.6l-4.3 4.3M9.9 14.1l-4.3 4.3",
    people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6.5 6.5 0 0 1 3.5 6",
    card: "M3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 10h18M7 15h4",
    bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
    chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.4-2.4.9a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1l-2.4-.9-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.4-.9a7.5 7.5 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 1.7-1l2.4.9 2-3.4z",
    file: "M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M8 13h8M8 17h6",
    menu: "M3 6h18M3 12h18M3 18h18"
  };
  const icon = (k, size = 18) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;
  App.icon = icon;

  /* ---------- Điều hướng ---------- */
  const ROUTES = [
    [/^\/$/, "home"], [/^\/ly-lich$/, "profile"], [/^\/ly-lich\/([^/]+)$/, "profile"], [/^\/nha-khoa-hoc$/, "directory"],
    [/^\/ho-so$/, "records"], [/^\/ho-so\/([^/]+)$/, "record"], [/^\/ho-tro$/, "supports"], [/^\/ho-tro\/([^/]+)$/, "support"],
    [/^\/nguoi-ho-tro$/, "supporters"], [/^\/the-ho-tro$/, "cards"], [/^\/thong-bao$/, "notices"], [/^\/bao-cao$/, "reports"], [/^\/quan-tri$/, "admin"]
  ];
  const parseHash = () => {
    const [path, qs] = (location.hash.replace(/^#/, "") || "/").split("?");
    return { path, query: Object.fromEntries(new URLSearchParams(qs || "")) };
  };
  const root = document.getElementById("app");

  function navItems() {
    const me = App.me().id;
    const sups = App.visibleSupports();
    const todoSup = sups.filter(s => (App.isCoord() && s.status === "cho_duyet") || (s.supporterId === me && ["cho_nhan", "dang_xu_ly"].includes(s.status))
      || (s.requesterId === me && s.status === "cho_xac_nhan")).length;
    const pendingUsers = App.isAdmin() ? App.users().filter(u => u.status === "pending").length + App.all("supporters").filter(s => s.status === "cho_duyet").length : 0;
    const items = [
      ["#/", "home", "Trang của tôi"], ["#/ly-lich", "user", "Lý lịch khoa học"], ["#/ho-so", "folder", "Hồ sơ nghiên cứu"],
      ["#/ho-tro", "help", "Yêu cầu hỗ trợ", todoSup], ["#/nguoi-ho-tro", "people", "Người hỗ trợ"], ["#/the-ho-tro", "card", "Thẻ hỗ trợ"],
      ["#/thong-bao", "file", "Thông báo & văn bản"]
    ];
    if (App.seesAll() || App.isAdmin()) items.push(["#/bao-cao", "chart", "Báo cáo"]);
    if (App.isAdmin()) items.push(["#/quan-tri", "gear", "Quản trị", pendingUsers]);
    return items;
  }

  function shell(path) {
    const me = App.me();
    const unread = App.myNotifications().filter(n => !n.read).length;
    const nav = navItems().map(([href, ic, text, count]) => {
      const on = href === "#" + path || (href !== "#/" && ("#" + path).startsWith(href)) || (href === "#/ly-lich" && path === "/nha-khoa-hoc");
      return `<a href="${href}"${on ? ' class="on" aria-current="page"' : ""}>${icon(ic)}<span>${esc(text)}</span>${count ? `<span class="count">${count}</span>` : ""}</a>`;
    }).join("");
    const roleText = (me.roles || []).map(r => (R[r] || [r, r])[1]).join(", ") + (App.isSupporter() ? ", Người hỗ trợ" : "");
    return `<div class="app" id="shell">
      <header class="topbar">
        <button class="icon-btn menu-btn" id="menuBtn" aria-label="Mở menu">${icon("menu", 22)}</button>
        <a class="brand" href="#/"><img src="assets/img/logo.png" alt=""><span><b>${esc(CFG.ORG_NAME.toUpperCase())}</b><small>${esc(CFG.APP_NAME)}</small></span></a>
        <span class="spacer"></span>
        ${S().mode === "demo" ? `<span class="demo-pill" title="Dữ liệu chỉ lưu trên trình duyệt này">Bản demo</span>` : ""}
        <button class="icon-btn bell" id="bellBtn" aria-label="Thông báo, ${unread} chưa đọc" aria-expanded="false">${icon("bell", 22)}${unread ? `<span class="badge">${unread}</span>` : ""}</button>
        <button class="me-btn" id="meBtn" aria-expanded="false">${avatar(me.name, 36)}<span class="me-text"><b>${esc(me.name)}</b><small>${esc(roleText)}</small></span></button>
        <div class="dropdown" id="bellPanel" hidden></div>
        <div class="dropdown me-menu" id="mePanel" hidden>
          <a href="#/ly-lich">Lý lịch khoa học của tôi</a>
          <button type="button" id="themeBtn">Đổi giao diện sáng / tối</button>
          <button type="button" id="logoutBtn">Đăng xuất</button>
        </div>
      </header>
      <aside class="side" aria-label="Điều hướng chính"><nav class="nav">${nav}</nav>
        <div class="side-foot">${esc(CFG.ORG_NAME)}</div></aside>
      <main class="content" id="view" tabindex="-1">
        ${S().mode === "demo" ? `<div class="banner"><b>Bản demo.</b> Tài khoản và dữ liệu là giả định, lưu trên trình duyệt của bạn; người khác không thấy thay đổi của bạn. Không nhập dữ liệu thật.</div>` : ""}
        <div id="viewBody"></div>
      </main>
    </div>`;
  }

  function bindShell() {
    const shellEl = document.getElementById("shell");
    document.getElementById("menuBtn").onclick = () => shellEl.classList.toggle("nav-open");
    document.querySelector(".side").addEventListener("click", e => { if (e.target.closest("a")) shellEl.classList.remove("nav-open"); });
    const bell = document.getElementById("bellBtn"), bp = document.getElementById("bellPanel");
    const meB = document.getElementById("meBtn"), mp = document.getElementById("mePanel");
    const close = () => { bp.hidden = true; mp.hidden = true; bell.setAttribute("aria-expanded", "false"); meB.setAttribute("aria-expanded", "false"); };
    bell.onclick = e => {
      e.stopPropagation();
      const open = bp.hidden; close();
      if (!open) return;
      const list = App.myNotifications().slice(0, 15);
      bp.innerHTML = `<div class="dd-head"><b>Thông báo</b>${list.some(n => !n.read) ? `<button type="button" class="btn sm ghost" id="readAll">Đánh dấu đã đọc</button>` : ""}</div>` +
        (list.length ? list.map(n => `<a class="dd-item${n.read ? "" : " unread"}" href="${esc(n.href)}" data-n="${esc(n.id)}"><span>${esc(n.text)}</span><small>${esc(T.fmtTime(n.at))}</small></a>`).join("") : `<p class="empty">Chưa có thông báo.</p>`);
      bp.hidden = false; bell.setAttribute("aria-expanded", "true");
      bp.querySelectorAll("[data-n]").forEach(a => a.addEventListener("click", async () => { const n = App.find("notifications", a.dataset.n); if (n && !n.read) await S().save("notifications", Object.assign({}, n, { read: true })); }));
      const ra = bp.querySelector("#readAll");
      if (ra) ra.onclick = async ev => { ev.stopPropagation(); await S().saveMany("notifications", App.myNotifications().filter(n => !n.read).map(n => Object.assign({}, n, { read: true }))); render(); };
    };
    meB.onclick = e => { e.stopPropagation(); const open = mp.hidden; close(); if (open) { mp.hidden = false; meB.setAttribute("aria-expanded", "true"); } };
    document.getElementById("themeBtn").onclick = () => {
      const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = cur === "dark" ? "light" : "dark"; pref.set("theme", next); applyTheme(next); close();
    };
    document.getElementById("logoutBtn").onclick = async () => { await S().signOut(); location.hash = "#/"; render(); };
  }

  function render() {
    App.state.today = T.today();
    const me = S().me();
    if (!me) return renderAuth();
    if (me.status !== "active") return renderPending(me);
    const { path, query } = parseHash();
    let match = null, name = null;
    for (const [re, n] of ROUTES) { const m = path.match(re); if (m) { match = m; name = n; break; } }
    root.innerHTML = shell(path);
    bindShell();
    const body = document.getElementById("viewBody");
    if (!name) { body.innerHTML = `<div class="card empty">Không tìm thấy trang. <a href="#/">Về trang của tôi</a></div>`; return; }
    try { App.views[name](body, match, query); }
    catch (e) { console.error(e); body.innerHTML = `<div class="card"><h2>Lỗi hiển thị</h2><p>${esc(e.message)}</p></div>`; }
    if (render.focusNext) { document.getElementById("view").focus({ preventScroll: true }); render.focusNext = false; }
  }
  App.render = render;

  /* ---------- Đăng nhập / đăng ký ---------- */
  function renderAuth() {
    const tab = parseHash().query.dk ? "dk" : "dn";
    const demo = S().mode === "demo";
    const units = App.settings().units;
    const demoAcc = demo ? App.users().filter(u => u.demo).map(u => `<button type="button" class="demo-acc" data-email="${esc(u.email)}">${avatar(u.name, 30)}<span><b>${esc(u.demoLabel || u.name)}</b><small>${esc(u.email)}</small></span></button>`).join("") : "";
    root.innerHTML = `<div class="auth"><div class="auth-card card">
      <div class="auth-brand"><img src="assets/img/logo.png" alt=""><div><b>${esc(CFG.APP_NAME)}</b><small>${esc(CFG.ORG_NAME)}</small></div></div>
      <div class="seg" role="tablist" style="margin-bottom:16px"><button role="tab" data-tab="dn" aria-selected="${tab === "dn"}" aria-pressed="${tab === "dn"}">Đăng nhập</button><button role="tab" data-tab="dk" aria-selected="${tab === "dk"}" aria-pressed="${tab === "dk"}">Đăng ký tài khoản</button></div>
      ${tab === "dn" ? `<form id="authForm" novalidate class="auth-form">
          <div class="field"><label for="ae">Email</label><input id="ae" name="email" type="email" autocomplete="username" required></div>
          <div class="field"><label for="ap">Mật khẩu</label><input id="ap" name="password" type="password" autocomplete="current-password" required></div>
          <p class="form-error" role="alert" hidden></p>
          <button class="btn primary" type="submit">Đăng nhập</button></form>
          ${demo ? `<div class="demo-box"><p><b>Bản demo:</b> bấm một tài khoản để đăng nhập (mật khẩu chung <code>Tdu@2026</code>).</p><div class="demo-accs">${demoAcc}</div></div>` : ""}`
        : `<form id="authForm" novalidate class="auth-form">
          <p class="muted" style="margin:0">Đăng ký bằng email của trường. Tài khoản dùng được sau khi quản trị viên duyệt.</p>
          <div class="field"><label for="rn">Họ và tên <span class="req">*</span></label><input id="rn" name="name" required autocomplete="name"></div>
          <div class="field"><label for="rd">Học hàm, học vị</label><input id="rd" name="degree" placeholder="VD: ThS., TS., PGS.TS."></div>
          <div class="field"><label for="ru">Khoa / đơn vị <span class="req">*</span></label><select id="ru" name="unit" required><option value="">— Chọn —</option>${units.map(u => `<option>${esc(u)}</option>`).join("")}</select></div>
          <div class="field"><label for="re">Email <span class="req">*</span></label><input id="re" name="email" type="email" required autocomplete="email"${(CFG.ALLOWED_EMAIL_DOMAINS || []).length ? ` placeholder="ten@${esc(CFG.ALLOWED_EMAIL_DOMAINS[0])}"` : ""}></div>
          <div class="field"><label for="rp">Mật khẩu (ít nhất 8 ký tự) <span class="req">*</span></label><input id="rp" name="password" type="password" required autocomplete="new-password"></div>
          <p class="form-error" role="alert" hidden></p>
          <button class="btn primary" type="submit">Gửi đăng ký</button></form>`}
    </div></div>`;
    root.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { location.hash = b.dataset.tab === "dk" ? "#/?dk=1" : "#/"; renderAuth(); });
    const f = document.getElementById("authForm"), err = f.querySelector(".form-error");
    const fail = m => { err.textContent = m; err.hidden = false; };
    f.addEventListener("submit", async e => {
      e.preventDefault(); err.hidden = true;
      const v = Object.fromEntries(new FormData(f).entries());
      try {
        if (tab === "dn") { await S().signIn(v.email, v.password); location.hash = "#/"; render(); return; }
        if (!v.name || !v.unit || !v.email) return fail("Vui lòng điền đủ các ô bắt buộc.");
        if ((v.password || "").length < 8) return fail("Mật khẩu cần ít nhất 8 ký tự.");
        const res = await S().signUp(v);
        root.querySelector(".auth-card").innerHTML = `<h1>Đã gửi đăng ký</h1><p>Tài khoản <b>${esc(v.email)}</b> đang chờ quản trị viên duyệt.${res.needsEmailConfirm ? " Hãy mở email và bấm liên kết xác nhận trước." : ""}</p>
          <p><a class="btn" href="#/" id="backLogin">Về trang đăng nhập</a></p>`;
        document.getElementById("backLogin").onclick = () => setTimeout(renderAuth);
      } catch (ex) { fail(ex.message); }
    });
    root.querySelectorAll(".demo-acc").forEach(b => b.onclick = async () => {
      try { await S().signIn(b.dataset.email, "Tdu@2026"); location.hash = "#/"; render(); } catch (ex) { fail(ex.message); }
    });
  }

  function renderPending(me) {
    root.innerHTML = `<div class="auth"><div class="auth-card card">
      <div class="auth-brand"><img src="assets/img/logo.png" alt=""><div><b>${esc(CFG.APP_NAME)}</b><small>${esc(CFG.ORG_NAME)}</small></div></div>
      <h1>${me.status === "locked" ? "Tài khoản đã bị khóa" : "Tài khoản đang chờ duyệt"}</h1>
      <p>${me.status === "locked" ? "Liên hệ quản trị viên để được mở lại." : `Xin chào <b>${esc(me.name || me.email)}</b>. Quản trị viên sẽ duyệt tài khoản của bạn; sau đó bạn đăng nhập lại để dùng hệ thống.`}</p>
      <button class="btn" id="out">Đăng xuất</button></div></div>`;
    document.getElementById("out").onclick = async () => { await S().signOut(); render(); };
  }

  /* Đóng menu thả xuống khi bấm ra ngoài hoặc nhấn Esc */
  const closeDropdowns = () => document.querySelectorAll(".dropdown").forEach(d => { d.hidden = true; });
  document.addEventListener("click", e => { if (!e.target.closest(".dropdown, #bellBtn, #meBtn")) closeDropdowns(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDropdowns(); });

  /* ---------- Chú giải khi rê chuột / tab tới phần tử có data-tip ---------- */
  let tip;
  const showTip = (el, x, y) => {
    if (!tip) { tip = document.createElement("div"); tip.className = "viz-tip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
    tip.innerHTML = el.getAttribute("data-tip"); tip.hidden = false;
    tip.style.left = Math.min(x + 12, innerWidth - tip.offsetWidth - 8) + "px";
    tip.style.top = Math.max(8, y - tip.offsetHeight - 10) + "px";
  };
  document.addEventListener("pointermove", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) showTip(el, e.clientX, e.clientY); else if (tip) tip.hidden = true; });
  document.addEventListener("focusin", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left, r.top); } else if (tip) tip.hidden = true; });

  window.addEventListener("hashchange", () => { render.focusNext = true; render(); scrollTo(0, 0); });

  App.start = async function () {
    root.innerHTML = `<div class="loading">Đang tải…</div>`;
    try { await S().init(); render(); }
    catch (e) {
      console.error(e);
      root.innerHTML = `<div class="loading"><h1>Không khởi động được</h1><p>${esc(e.message)}</p>
        <p class="muted">Nếu mở trực tiếp tệp index.html trên máy, hãy chạy <code>python3 -m http.server</code> rồi mở http://localhost:8000.</p></div>`;
    }
  };
  App.toastErr = e => toast(e.message || String(e), "crit");
})();
