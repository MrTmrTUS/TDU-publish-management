/* Lớp lưu trữ, một giao diện chung cho hai chế độ:
   "demo"     — chạy thử: dữ liệu và tài khoản mẫu lưu trên trình duyệt của người xem (khởi tạo từ data/demo.json).
   "supabase" — dùng thật: tài khoản qua Supabase Auth, dữ liệu trong bảng app_data, phân quyền bằng RLS (supabase/schema.sql). */
(function () {
  const CFG = window.APP_CONFIG;
  const COLLECTIONS = ["supporters", "records", "supports", "cards", "ratings", "notices", "notifications", "log"];
  const APPEND_ONLY = ["notifications", "log", "ratings"];
  const DEMO_VERSION = 3;
  const K_DB = "tdu-cong:db", K_SESSION = "tdu-cong:session";

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } }
  };
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* bỏ qua */ } }
  };
  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  const upsert = (list, item) => { const i = list.findIndex(x => x.id === item.id); if (i >= 0) list[i] = item; else list.push(item); };
  const emptyDb = () => { const d = { meta: { version: DEMO_VERSION }, settings: {}, users: [], passwords: {} }; COLLECTIONS.forEach(c => { d[c] = []; }); return d; };
  const emailOk = email => {
    const doms = CFG.ALLOWED_EMAIL_DOMAINS || [];
    return !doms.length || doms.some(d => email.toLowerCase().endsWith("@" + d.toLowerCase()));
  };

  /* ================= Chế độ demo ================= */
  function DemoAdapter() {
    let db = emptyDb();
    const persist = () => { if (!ls.set(K_DB, JSON.stringify(db))) throw new Error("Trình duyệt không cho lưu dữ liệu (bộ nhớ đầy hoặc chế độ riêng tư)."); };
    async function seed() {
      const res = await fetch(CFG.DEMO_DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("Không tải được " + CFG.DEMO_DATA_URL + " (mã " + res.status + ").");
      db = Object.assign(emptyDb(), await res.json());
      persist();
    }
    return {
      mode: "demo",
      async init() {
        const raw = ls.get(K_DB);
        let parsed = null;
        try { parsed = raw && JSON.parse(raw); } catch (e) { parsed = null; }
        if (parsed && parsed.meta && parsed.meta.version === DEMO_VERSION) db = Object.assign(emptyDb(), parsed);
        else await seed();
      },
      me() { const id = ss.get(K_SESSION); return id ? db.users.find(u => u.id === id) || null : null; },
      async signIn(email, password) {
        const e = email.trim().toLowerCase();
        const u = db.users.find(x => x.email.toLowerCase() === e);
        if (!u || db.passwords[e] !== await sha256(password)) throw new Error("Email hoặc mật khẩu không đúng.");
        if (u.status === "locked") throw new Error("Tài khoản đã bị khóa. Liên hệ quản trị viên.");
        ss.set(K_SESSION, u.id);
      },
      async signUp(p) {
        const e = p.email.trim().toLowerCase();
        if (!emailOk(e)) throw new Error("Chỉ nhận email của trường (" + CFG.ALLOWED_EMAIL_DOMAINS.join(", ") + ").");
        if (db.users.some(u => u.email.toLowerCase() === e)) throw new Error("Email này đã được đăng ký.");
        const u = { id: "u-" + Date.now().toString(36), email: e, name: p.name, unit: p.unit, degree: p.degree || "", phone: p.phone || "",
          roles: ["giang_vien"], status: "pending", createdAt: new Date().toISOString() };
        db.users.push(u);
        db.passwords[e] = await sha256(p.password);
        persist();
        return { needsEmailConfirm: false };
      },
      async signOut() { ss.del(K_SESSION); },
      async changePassword(oldPw, newPw) {
        const u = this.me();
        if (db.passwords[u.email] !== await sha256(oldPw)) throw new Error("Mật khẩu hiện tại không đúng.");
        db.passwords[u.email] = await sha256(newPw); persist();
      },
      users() { return db.users; },
      all(col) { return db[col]; },
      settings() { return db.settings; },
      async save(col, obj) { upsert(db[col], obj); persist(); return obj; },
      async saveMany(col, arr) { arr.forEach(o => upsert(db[col], o)); persist(); },
      async remove(col, id) { db[col] = db[col].filter(x => x.id !== id); persist(); },
      async saveUser(u) { upsert(db.users, u); persist(); },
      async saveSettings(s) { db.settings = s; persist(); },
      async reload() { },
      exportAll() { const out = JSON.parse(JSON.stringify(db)); delete out.passwords; return out; },
      async replaceAll(obj) { const pw = db.passwords; db = Object.assign(emptyDb(), obj); db.passwords = obj.passwords || pw; persist(); },
      async resetDemo() { ls.del(K_DB); ss.del(K_SESSION); await seed(); }
    };
  }

  /* ================= Chế độ Supabase ================= */
  function SupabaseAdapter() {
    let client = null, meRow = null, users = [], data = {}, settings = {};
    const check = ({ data: d, error }) => { if (error) throw new Error(error.message); return d; };
    const loadScript = src => new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => fail(new Error("Không tải được thư viện Supabase."));
      document.head.appendChild(s);
    });
    const toUser = r => Object.assign({}, r.profile || {}, { id: r.id, email: r.email, status: r.status, roles: r.roles || [], createdAt: r.created_at });
    async function loadAll() {
      COLLECTIONS.forEach(c => { data[c] = []; });
      settings = {}; users = [];
      const { data: s } = await client.auth.getSession();
      if (!s.session) { // chưa đăng nhập: chỉ đọc được cấu hình (danh sách khoa cho màn hình đăng ký)
        meRow = null;
        const cfg = check(await client.from("app_data").select("data").eq("collection", "settings").maybeSingle());
        if (cfg) settings = cfg.data;
        return;
      }
      const mine = check(await client.from("app_users").select("*").eq("id", s.session.user.id).maybeSingle());
      meRow = mine ? toUser(mine) : { id: s.session.user.id, email: s.session.user.email, status: "pending", roles: [] };
      if (meRow.status !== "active") return;
      users = check(await client.from("app_users").select("*")).map(toUser);
      for (let from = 0; ; from += 1000) {
        const page = check(await client.from("app_data").select("collection, id, data").range(from, from + 999));
        page.forEach(r => {
          if (r.collection === "settings") settings = r.data;
          else if (data[r.collection]) data[r.collection].push(Object.assign({}, r.data, { id: r.id }));
        });
        if (page.length < 1000) break;
      }
    }
    const row = (col, obj) => ({ collection: col, id: obj.id, data: obj, readers: obj.readers || [] });
    return {
      mode: "supabase",
      async init() {
        if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) throw new Error("Chưa khai báo SUPABASE_URL / SUPABASE_ANON_KEY trong assets/js/config.js.");
        await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js");
        client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
        await loadAll();
      },
      me() { return meRow; },
      async signIn(email, password) { check(await client.auth.signInWithPassword({ email: email.trim(), password })); await loadAll(); },
      async signUp(p) {
        if (!emailOk(p.email)) throw new Error("Chỉ nhận email của trường (" + CFG.ALLOWED_EMAIL_DOMAINS.join(", ") + ").");
        const d = check(await client.auth.signUp({ email: p.email.trim(), password: p.password,
          options: { data: { name: p.name, unit: p.unit, degree: p.degree || "", phone: p.phone || "" } } }));
        return { needsEmailConfirm: !d.session };
      },
      async signOut() { await client.auth.signOut(); await loadAll(); },
      async changePassword(_old, newPw) { check(await client.auth.updateUser({ password: newPw })); },
      users() { return users; },
      all(col) { return data[col] || []; },
      settings() { return settings; },
      // "upsert" bị RLS chặn với dòng người ghi không được đọc (thông báo gửi người khác, nhật ký, đánh giá) → dòng mới của
      // các loại này dùng insert thường (đã kiểm thử trên PostgreSQL, xem README › Kiểm thử).
      async save(col, obj) { await this.saveMany(col, [obj]); return obj; },
      async saveMany(col, arr) {
        const known = new Set((data[col] || []).map(x => x.id));
        const fresh = APPEND_ONLY.includes(col) ? arr.filter(o => !known.has(o.id)) : [];
        const rest = arr.filter(o => !fresh.includes(o));
        for (let i = 0; i < fresh.length; i += 500) check(await client.from("app_data").insert(fresh.slice(i, i + 500).map(o => row(col, o))));
        for (let i = 0; i < rest.length; i += 500) check(await client.from("app_data").upsert(rest.slice(i, i + 500).map(o => row(col, o))));
        arr.forEach(o => upsert(data[col], o));
      },
      async remove(col, id) { check(await client.from("app_data").delete().eq("collection", col).eq("id", id)); data[col] = data[col].filter(x => x.id !== id); },
      async saveUser(u) {
        const { id, email, status, roles, createdAt, ...profile } = u;
        check(await client.from("app_users").update({ profile, status, roles }).eq("id", id));
        upsert(users, u);
        if (meRow && meRow.id === id) meRow = u;
      },
      async saveSettings(s) { check(await client.from("app_data").upsert({ collection: "settings", id: "settings", data: s, readers: [] })); settings = s; },
      async reload() { await loadAll(); },
      exportAll() { const out = { meta: { version: DEMO_VERSION }, settings, users }; COLLECTIONS.forEach(c => { out[c] = data[c]; }); return JSON.parse(JSON.stringify(out)); },
      async replaceAll(obj) {
        for (const c of COLLECTIONS) if (Array.isArray(obj[c]) && obj[c].length) await this.saveMany(c, obj[c]);
        if (obj.settings) await this.saveSettings(obj.settings);
        await loadAll();
      }
    };
  }

  window.Store = CFG.BACKEND === "supabase" ? SupabaseAdapter() : DemoAdapter();
  window.Store.sha256 = sha256;
})();
