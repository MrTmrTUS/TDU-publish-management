/* Khung ứng dụng: trạng thái chung, lưu hồ sơ kèm lịch sử, bố cục, điều hướng, đăng nhập. */
(function () {
  const CFG = window.APP_CONFIG;
  const { T, DEFAULT_SETTINGS, statusLabel, recordFlags, supportFacts } = window.Domain;
  const { esc } = window.UI;

  const pref = {
    get(k, d) { try { const v = localStorage.getItem("tdu-nckh:pref:" + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("tdu-nckh:pref:" + k, v); } catch (e) { /* bỏ qua */ } }
  };

  const FIELD_LABELS = { title: "Tên", shortTitle: "Tên rút gọn", unit: "Khoa", group: "Nhóm", authors: "Tác giả", contact: "Tác giả liên hệ",
    owner: "Người phụ trách", status: "Trạng thái", journal: "Tạp chí", quartile: "Phân hạng", nextAction: "Việc tiếp theo", due: "Hạn",
    risk: "Rủi ro", note: "Ghi chú", docsUrl: "Thư mục tài liệu", doi: "DOI" };

  const App = {
    views: {},
    forms: {},
    state: { today: T.today() },
    pref, FIELD_LABELS,
    data() { return window.Store.all(); },
    settings() { return Object.assign({}, DEFAULT_SETTINGS, App.data().settings); },
    find(col, id) { return (App.data()[col] || []).find(x => x.id === id); },
    who() { const u = window.Store.user(); return u ? u.name : ""; },
    nextId(col, prefix) {
      const nums = App.data()[col].map(x => parseInt(String(x.id).slice(prefix.length), 10)).filter(n => !isNaN(n));
      return prefix + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
    },
    flags(r) { return recordFlags(r, App.data(), App.state.today); },
    supportFacts(s) { return supportFacts(s, App.settings(), App.state.today); },
    distinct(field) { return [...new Set(App.data().records.map(r => r[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")); },

    /* Lưu hồ sơ; mọi thay đổi được ghi vào lịch sử của hồ sơ. "Cập nhật gần nhất" chỉ đổi khi nội dung đổi. */
    async saveRecord(next, note = "") {
      const prev = App.find("records", next.id);
      const today = App.state.today;
      const changes = [];
      if (!prev) changes.push(`Tạo hồ sơ — ${statusLabel(next.status)}`);
      else Object.keys(FIELD_LABELS).forEach(k => {
        const a = prev[k] || "", b = next[k] || "";
        if (a === b) return;
        const show = v => k === "status" ? statusLabel(v) : (k === "due" ? T.fmt(v) : v) || "∅";
        changes.push(`${FIELD_LABELS[k]}: ${show(a)} → ${show(b)}`);
      });
      if (prev && !changes.length && !note) return prev;
      if (!prev || prev.status !== next.status) next.statusSince = today;
      next.updatedAt = today;
      next.history = [...(prev ? prev.history || [] : []), { at: new Date().toISOString(), by: App.who(), text: changes.join("; "), note }];
      await window.Store.save("records", next);
      return next;
    },
    async saveSupport(next, text) {
      const prev = App.find("supports", next.id);
      await window.Store.save("supports", next);
      const r = App.find("records", next.recordId);
      if (r) await App.saveRecord(Object.assign({}, r), `${next.id}: ${text || (prev ? "cập nhật yêu cầu hỗ trợ" : "gửi yêu cầu hỗ trợ")}`);
    },
    go(hash) { if (location.hash === hash) render(); else location.hash = hash; },
    rerender() { render(); }
  };
  window.App = App;

  /* ---------- Chủ đề sáng/tối ---------- */
  const applyTheme = t => { if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); };
  applyTheme(pref.get("theme", ""));

  /* ---------- Điều hướng ---------- */
  const ROUTES = [
    [/^\/$/, "overview"], [/^\/ho-so$/, "records"], [/^\/ho-so\/([^/]+)$/, "record"], [/^\/ho-tro$/, "supports"], [/^\/cai-dat$/, "settings"]
  ];
  const parseHash = () => {
    const [path, qs] = (location.hash.replace(/^#/, "") || "/").split("?");
    return { path, query: Object.fromEntries(new URLSearchParams(qs || "")) };
  };
  const root = document.getElementById("app");

  function shell(path) {
    const data = App.data();
    const attention = data.records.filter(r => App.flags(r).length).length;
    const openSup = data.supports.filter(s => App.supportFacts(s).open).length;
    const nav = [["#/", "Tổng quan", attention ? `<span class="count" title="Hồ sơ cần chú ý">${attention}</span>` : ""],
      ["#/ho-so", "Hồ sơ nghiên cứu", `<span class="code">${data.records.length}</span>`],
      ["#/ho-tro", "Yêu cầu hỗ trợ", openSup ? `<span class="count" title="Yêu cầu đang mở">${openSup}</span>` : ""],
      ["#/cai-dat", "Cài đặt & dữ liệu", ""]].map(([href, text, extra]) => {
      const on = href === "#" + path || (href !== "#/" && ("#" + path).startsWith(href));
      return `<a href="${href}"${on ? ' class="on" aria-current="page"' : ""}>${esc(text)}${extra}</a>`;
    }).join("");
    const dirty = window.Store.isDirty && window.Store.isDirty();
    const sample = data.meta && data.meta.sample;
    return `<div class="app" id="shell">
      <aside class="side" aria-label="Điều hướng chính">
        <div class="brand"><img src="assets/img/logo.png" alt=""><div><b>${esc(CFG.APP_SHORT)}</b><small>${esc(CFG.ORG_NAME)}</small></div></div>
        <nav class="nav">${nav}</nav>
        <div class="side-foot">Đăng nhập: <b>${esc(App.who())}</b></div>
      </aside>
      <div class="main">
        <header class="top">
          <button class="icon-btn menu-btn" id="menuBtn" aria-label="Mở menu">☰</button>
          <div class="crumbs">${esc(CFG.APP_NAME)}</div>
          <span class="spacer"></span>
          ${dirty ? `<a class="tag tag-warn" href="#/cai-dat">● Có thay đổi chưa xuất bản</a>` : ""}
          <button class="icon-btn" id="themeBtn" aria-label="Đổi giao diện sáng/tối" title="Sáng/tối">☾</button>
          <button class="btn sm" id="logoutBtn">Đăng xuất</button>
        </header>
        <main class="content" id="view" tabindex="-1">
          ${sample ? `<div class="banner"><b>Dữ liệu minh họa.</b> Các hồ sơ đang hiển thị là giả định để chạy thử. Xóa tại Cài đặt khi bắt đầu nhập dữ liệu thật.</div>` : ""}
          <div id="viewBody"></div>
        </main>
      </div>
    </div>`;
  }

  function render() {
    App.state.today = T.today();
    if (!window.Store.user()) return renderLogin();
    const { path, query } = parseHash();
    let match = null, name = null;
    for (const [re, n] of ROUTES) { const m = path.match(re); if (m) { match = m; name = n; break; } }
    root.innerHTML = shell(path);
    document.getElementById("menuBtn").onclick = () => document.getElementById("shell").classList.toggle("nav-open");
    document.querySelector(".side").addEventListener("click", e => { if (e.target.closest("a")) document.getElementById("shell").classList.remove("nav-open"); });
    document.getElementById("themeBtn").onclick = () => {
      const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = cur === "dark" ? "light" : "dark";
      pref.set("theme", next); applyTheme(next);
    };
    document.getElementById("logoutBtn").onclick = async () => { await window.Store.signOut(); location.hash = "#/"; render(); };
    const body = document.getElementById("viewBody");
    if (!name) { body.innerHTML = `<div class="card empty">Không tìm thấy trang. <a href="#/">Về tổng quan</a></div>`; return; }
    try { App.views[name](body, match, query); }
    catch (e) { console.error(e); body.innerHTML = `<div class="card"><h2>Lỗi hiển thị</h2><p>${esc(e.message)}</p></div>`; }
    if (render.focusNext) { document.getElementById("view").focus({ preventScroll: true }); render.focusNext = false; }
  }

  function renderLogin() {
    const sample = App.data().meta && App.data().meta.sample;
    root.innerHTML = `<div class="login"><div class="card">
      <div class="brand"><img src="assets/img/logo.png" alt=""><div><b>${esc(CFG.APP_NAME)}</b><small>${esc(CFG.ORG_NAME)}</small></div></div>
      <h1>Đăng nhập</h1>
      <form id="loginForm" novalidate>
        <div class="field"><label for="lu">${CFG.BACKEND === "supabase" ? "Email" : "Tên đăng nhập"}</label><input id="lu" name="u" autocomplete="username" required></div>
        <div class="field"><label for="lp">Mật khẩu</label><input id="lp" name="p" type="password" autocomplete="current-password" required></div>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn primary" type="submit">Đăng nhập</button>
        ${sample && CFG.BACKEND !== "supabase" ? `<div class="hint">Bản thử: <b>admin</b> / <b>Tdu@2026</b>. Đổi mật khẩu trước khi dùng thật (Cài đặt › Tài khoản).</div>` : ""}
      </form></div></div>`;
    const f = document.getElementById("loginForm");
    f.u.focus();
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const err = f.querySelector(".form-error");
      err.hidden = true;
      try { await window.Store.signIn(f.u.value, f.p.value); render(); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; }
    });
  }

  /* ---------- Chú giải khi rê chuột / tab tới thanh biểu đồ ---------- */
  let tip;
  const showTip = (el, x, y) => {
    if (!tip) { tip = document.createElement("div"); tip.className = "viz-tip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
    tip.innerHTML = el.getAttribute("data-tip");
    tip.hidden = false;
    tip.style.left = Math.min(x + 12, innerWidth - tip.offsetWidth - 8) + "px";
    tip.style.top = Math.max(8, y - tip.offsetHeight - 10) + "px";
  };
  document.addEventListener("pointermove", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) showTip(el, e.clientX, e.clientY); else if (tip) tip.hidden = true; });
  document.addEventListener("focusin", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left, r.top); } else if (tip) tip.hidden = true; });

  window.addEventListener("hashchange", () => { render.focusNext = true; render(); scrollTo(0, 0); });

  App.start = async function () {
    root.innerHTML = `<div class="loading">Đang tải dữ liệu…</div>`;
    try { await window.Store.init(); render(); }
    catch (e) {
      console.error(e);
      root.innerHTML = `<div class="loading"><h1>Không khởi động được</h1><p>${esc(e.message)}</p>
        <p class="muted">Nếu mở trực tiếp tệp index.html trên máy, hãy chạy <code>python3 -m http.server</code> rồi mở http://localhost:8000.</p></div>`;
    }
  };
})();
