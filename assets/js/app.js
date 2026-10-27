/* Khung ứng dụng: trạng thái chung, tra cứu, ghi nhật ký sự kiện, bố cục, điều hướng, đăng nhập. */
(function () {
  const CFG = window.APP_CONFIG;
  const { T, label, DEFAULT_SETTINGS } = window.Domain;
  const { esc } = window.UI;

  const pref = {
    get(k, d) { try { const v = localStorage.getItem("tdu-nckh:pref:" + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("tdu-nckh:pref:" + k, v); } catch (e) { /* bỏ qua */ } }
  };

  const today = T.today();
  const App = {
    views: {},
    state: {
      cutoff: today,
      from: T.add(today, -119).slice(0, 8) + "01",
      to: today,
      unitId: "",
      actAs: pref.get("actAs", "")
    },
    pref,
    data() { return window.Store.all(); },
    settings() { return Object.assign({}, DEFAULT_SETTINGS, App.data().settings); },
    find(col, id) { return (App.data()[col] || []).find(x => x.id === id); },
    personName(id) { const p = App.find("people", id); return p ? p.name : ""; },
    unitName(id) { const u = App.find("units", id); return u ? u.name : ""; },
    journalName(id) { const j = App.find("journals", id); return j ? j.name : ""; },
    providerName(id) { const p = App.find("providers", id); return p ? p.name + (p.personId ? " — " + App.personName(p.personId) : "") : ""; },
    slug: { projects: "nghien-cuu", manuscripts: "ban-thao" },
    recordHref(col, id) {
      if (col === "projects" || col === "manuscripts") return `#/ho-so/${App.slug[col]}/${encodeURIComponent(id)}`;
      if (col === "supports") return `#/ho-tro/${encodeURIComponent(id)}`;
      if (col === "journals") return `#/tap-chi?id=${encodeURIComponent(id)}`;
      if (col === "providers") return `#/chuyen-gia`;
      if (col === "publications") return `#/cong-bo`;
      return "#/";
    },
    recordLabel(col, id) {
      const r = App.find(col, id);
      if (!r) return id || "";
      if (col === "projects") return `${r.id} · ${r.shortTitle || r.title}`;
      if (col === "manuscripts") return `${r.id} · ${r.title}`;
      if (col === "supports") return `${r.id} · ${label("supportTypes", r.supportType) || r.problem}`;
      return r.name || r.title || r.id;
    },
    recordLink(col, id) { return id ? `<a href="${App.recordHref(col, id)}">${esc(App.recordLabel(col, id))}</a>` : window.UI.NA; },
    options: {
      people: (role) => App.data().people.filter(p => p.active !== false && (!role || (p.roles || []).includes(role))).map(p => [p.id, p.name]),
      units: () => App.data().units.map(u => [u.id, u.name]),
      journals: () => App.data().journals.map(j => [j.id, j.name + (j.issn ? ` (${j.issn})` : "")]),
      providers: () => App.data().providers.filter(p => p.active !== false).map(p => [p.id, App.providerName(p.id)]),
      records: () => [...App.data().projects.map(p => ["projects:" + p.id, App.recordLabel("projects", p.id)]),
                      ...App.data().manuscripts.map(m => ["manuscripts:" + m.id, App.recordLabel("manuscripts", m.id)])]
    },
    nextId(col, prefix, width = 3) {
      const nums = App.data()[col].map(x => String(x.id)).filter(id => id.startsWith(prefix)).map(id => parseInt(id.slice(prefix.length), 10)).filter(n => !isNaN(n));
      return prefix + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(width, "0");
    },
    who() { const u = window.Store.user(); return u ? u.name : ""; },

    /* Lưu bản ghi và tự sinh sự kiện cho mọi trường thay đổi (đặc tả mục 6.2).
       opts: {reason, occurredAt, evidenceUrl, type, business:boolean} */
    async saveRecord(col, next, opts = {}) {
      const prev = App.find(col, next.id);
      const occurredAt = opts.occurredAt || App.state.cutoff;
      const evs = [];
      const mk = (field, before, after) => ({
        id: "E-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        entityType: col, entityId: next.id, type: opts.type || (prev ? "cap_nhat" : "tao_moi"), field,
        before: before == null ? "" : (typeof before === "object" ? JSON.stringify(before) : String(before)),
        after: after == null ? "" : (typeof after === "object" ? JSON.stringify(after) : String(after)),
        occurredAt, recordedAt: new Date().toISOString(), by: App.who(), reason: opts.reason || "", evidenceUrl: opts.evidenceUrl || "",
        correctsEventId: opts.correctsEventId || ""
      });
      if (!prev) evs.push(mk("", "", next.id));
      else {
        Object.keys(Object.assign({}, prev, next)).forEach(k => {
          if (k === "lastUpdate") return;
          if (JSON.stringify(prev[k] ?? "") !== JSON.stringify(next[k] ?? "")) evs.push(mk(k, prev[k], next[k]));
        });
      }
      if (prev && !evs.length) return next;
      // "Ngày cập nhật gần nhất" = thay đổi nghiệp vụ có ý nghĩa (mục 9.2)
      if ((col === "projects" || col === "manuscripts") && opts.business !== false) {
        if (!next.lastUpdate || occurredAt > next.lastUpdate) next.lastUpdate = occurredAt;
      }
      await window.Store.save(col, next);
      if (evs.length) await window.Store.saveMany("events", evs);
      return next;
    },
    async touchParent(parentType, parentId, occurredAt) {
      const p = App.find(parentType, parentId);
      if (p && (!p.lastUpdate || occurredAt > p.lastUpdate)) {
        await window.Store.save(parentType, Object.assign({}, p, { lastUpdate: occurredAt }));
      }
    },
    go(hash) { if (location.hash === hash) render(); else location.hash = hash; },
    rerender() { render(); }
  };
  window.App = App;

  /* ---------- Chủ đề sáng/tối ---------- */
  const applyTheme = t => { if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); };
  applyTheme(pref.get("theme", ""));

  /* ---------- Điều hướng ---------- */
  const NAV = [
    ["Góc nhìn", [
      ["#/", "Tổng quan điều hành", "M05"],
      ["#/viec-cua-toi", "Công việc của tôi", "M01"],
      ["#/hang-doi", "Hàng đợi hỗ trợ", "M04"]
    ]],
    ["Hồ sơ", [
      ["#/ho-so", "Nghiên cứu & bản thảo", "M02"],
      ["#/cong-bo", "Lần nộp & công bố", ""]
    ]],
    ["Danh mục", [
      ["#/chuyen-gia", "Chuyên gia & gói hỗ trợ", "M06"],
      ["#/tap-chi", "Tạp chí & xác minh", "M07"]
    ]],
    ["Báo cáo & cấu hình", [
      ["#/canh-bao", "Cảnh báo", "alerts"],
      ["#/bao-cao", "Báo cáo chỉ số", "M08"],
      ["#/nhat-ky", "Lịch sử thay đổi", ""],
      ["#/cau-hinh", "Cấu hình & dữ liệu", ""]
    ]]
  ];

  const ROUTES = [
    [/^\/$/, "overview"], [/^\/viec-cua-toi$/, "myWork"], [/^\/hang-doi$/, "queue"],
    [/^\/ho-so$/, "records"], [/^\/ho-so\/(nghien-cuu|ban-thao)\/([^/]+)$/, "record"],
    [/^\/ho-tro\/([^/]+)$/, "support"], [/^\/cong-bo$/, "publications"],
    [/^\/chuyen-gia$/, "providers"], [/^\/tap-chi$/, "journals"],
    [/^\/canh-bao$/, "alerts"], [/^\/bao-cao$/, "reports"], [/^\/nhat-ky$/, "history"], [/^\/cau-hinh$/, "config"]
  ];

  function parseHash() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = raw.split("?");
    return { path, query: Object.fromEntries(new URLSearchParams(qs || "")) };
  }

  const root = document.getElementById("app");

  function shell() {
    const path = parseHash().path;
    const alertCount = window.Domain.alerts(App.data(), App.state.cutoff).length;
    const nav = NAV.map(([grp, items]) => `<h3>${esc(grp)}</h3>` + items.map(([href, text, code]) => {
      const on = href === "#" + path || (href !== "#/" && ("#" + path).startsWith(href + "/"));
      const extra = code === "alerts" ? (alertCount ? `<span class="count" aria-label="${alertCount} cảnh báo">${alertCount}</span>` : "") : (code ? `<span class="code">${code}</span>` : "");
      return `<a href="${href}"${on ? ' class="on" aria-current="page"' : ""}>${esc(text)}${extra}</a>`;
    }).join("")).join("");
    const dirty = window.Store.isDirty && window.Store.isDirty();
    const sample = App.data().meta && App.data().meta.sample;
    return `<div class="app" id="shell">
      <aside class="side" aria-label="Điều hướng chính">
        <div class="brand"><img src="assets/img/logo.png" alt=""><div><b>${esc(CFG.APP_SHORT)}</b><small>${esc(CFG.ORG_NAME)}</small></div></div>
        <nav class="nav">${nav}</nav>
        <div class="side-foot">Đăng nhập: <b>${esc(App.who())}</b><br>Chế độ dữ liệu: ${CFG.BACKEND === "supabase" ? "Supabase" : "tệp tĩnh (thử nghiệm)"}</div>
      </aside>
      <div class="main">
        <header class="top">
          <button class="icon-btn menu-btn" id="menuBtn" aria-label="Mở menu">☰</button>
          <div class="crumbs">${esc(CFG.APP_NAME)}</div>
          <span class="spacer"></span>
          ${dirty ? `<a class="tag tag-warn" href="#/cau-hinh?tab=du-lieu" title="Bản nháp trên trình duyệt khác bản đã xuất bản">● Có thay đổi chưa xuất bản</a>` : ""}
          <button class="icon-btn" id="themeBtn" aria-label="Đổi giao diện sáng/tối" title="Sáng/tối">☾</button>
          <button class="btn sm" id="logoutBtn">Đăng xuất</button>
        </header>
        <main class="content" id="view" tabindex="-1">
          ${sample ? `<div class="banner"><b>Dữ liệu minh họa.</b> Toàn bộ hồ sơ, người và tạp chí đang hiển thị là giả định để thiết kế và kiểm tra logic (đặc tả mục 12), không phải dữ liệu vận hành.</div>` : ""}
          <div id="viewBody"></div>
        </main>
      </div>
    </div>`;
  }

  function bindShell() {
    document.getElementById("menuBtn").onclick = () => document.getElementById("shell").classList.toggle("nav-open");
    document.querySelector(".side").addEventListener("click", e => { if (e.target.closest("a")) document.getElementById("shell").classList.remove("nav-open"); });
    document.getElementById("themeBtn").onclick = () => {
      const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = cur === "dark" ? "light" : "dark";
      pref.set("theme", next); applyTheme(next);
    };
    document.getElementById("logoutBtn").onclick = async () => { await window.Store.signOut(); location.hash = "#/"; render(); };
  }


  function render() {
    if (!window.Store.user()) return renderLogin();
    const { path, query } = parseHash();
    let match = null, name = null;
    for (const [re, n] of ROUTES) { const m = path.match(re); if (m) { match = m; name = n; break; } }
    root.innerHTML = shell();
    bindShell();
    const body = document.getElementById("viewBody");
    if (!name || !App.views[name]) { body.innerHTML = `<div class="card empty">Không tìm thấy trang. <a href="#/">Về tổng quan</a></div>`; return; }
    try {
      App.views[name](body, match, query);
    } catch (e) {
      console.error(e);
      body.innerHTML = `<div class="card"><h2>Lỗi hiển thị</h2><p>${esc(e.message)}</p></div>`;
    }
    const view = document.getElementById("view");
    if (render.focusNext) { view.focus({ preventScroll: true }); render.focusNext = false; }
  }
  App.render = render;

  function renderLogin() {
    const sample = App.data().meta && App.data().meta.sample;
    root.innerHTML = `<div class="login"><div class="card">
      <div class="brand"><img src="assets/img/logo.png" alt=""><div><b>${esc(CFG.APP_NAME)}</b><small>${esc(CFG.ORG_NAME)}</small></div></div>
      <h1>Đăng nhập quản trị</h1>
      <p class="muted">Dữ liệu hồ sơ không công khai; chỉ người được cấp tài khoản mới xem và nhập liệu.</p>
      <form id="loginForm" novalidate>
        <div class="field"><label for="lu">${CFG.BACKEND === "supabase" ? "Email" : "Tên đăng nhập"}</label><input id="lu" name="u" autocomplete="username" required></div>
        <div class="field"><label for="lp">Mật khẩu</label><input id="lp" name="p" type="password" autocomplete="current-password" required></div>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn primary" type="submit">Đăng nhập</button>
        ${sample && CFG.BACKEND !== "supabase" ? `<div class="hint">Bản thử nghiệm: tài khoản <b>admin</b> / mật khẩu <b>Tdu@2026</b>. Đổi mật khẩu trước khi dùng thật (Cấu hình › Tài khoản).</div>` : ""}
      </form></div></div>`;
    const f = document.getElementById("loginForm");
    f.u.focus();
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const err = f.querySelector(".form-error");
      err.hidden = true;
      try {
        await window.Store.signIn(f.u.value, f.p.value);
        render();
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    });
  }

  /* ---------- Chú giải khi rê chuột lên biểu đồ ---------- */
  let tip;
  document.addEventListener("pointerover", e => {
    const el = e.target.closest("[data-tip]");
    if (!el) { if (tip) tip.hidden = true; return; }
    if (!tip) { tip = document.createElement("div"); tip.className = "viz-tip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
    tip.innerHTML = el.getAttribute("data-tip");
    tip.hidden = false;
  });
  document.addEventListener("pointermove", e => {
    if (!tip || tip.hidden) return;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(e.clientX + 12, innerWidth - w - 8) + "px";
    tip.style.top = (e.clientY - h - 10 < 0 ? e.clientY + 16 : e.clientY - h - 10) + "px";
  });
  document.addEventListener("focusin", e => {
    const el = e.target.closest && e.target.closest("[data-tip]");
    if (!el) { if (tip) tip.hidden = true; return; }
    if (!tip) { tip = document.createElement("div"); tip.className = "viz-tip"; document.body.appendChild(tip); }
    tip.innerHTML = el.getAttribute("data-tip"); tip.hidden = false;
    const r = el.getBoundingClientRect();
    tip.style.left = Math.min(r.left, innerWidth - tip.offsetWidth - 8) + "px";
    tip.style.top = Math.max(8, r.top - tip.offsetHeight - 8) + "px";
  });

  window.addEventListener("hashchange", () => { render.focusNext = true; render(); scrollTo(0, 0); });

  /* ---------- Khởi động ---------- */
  App.start = async function () {
    root.innerHTML = `<div class="loading">Đang tải dữ liệu…</div>`;
    try {
      await window.Store.init();
      render();
    } catch (e) {
      console.error(e);
      root.innerHTML = `<div class="loading"><h1>Không khởi động được</h1><p>${esc(e.message)}</p>
        <p class="muted">Nếu mở trực tiếp tệp index.html trên máy, hãy chạy máy chủ tĩnh: <code>python3 -m http.server</code> rồi mở http://localhost:8000.</p></div>`;
    }
  };
})();
