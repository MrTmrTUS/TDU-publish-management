/* Lớp dữ liệu: một giao diện chung cho hai chế độ "static" và "supabase".
   Bộ sưu tập theo mô hình dữ liệu khái niệm (đặc tả mục 6) + settings (cấu hình ngưỡng, lịch ngày làm việc). */
(function () {
  const CFG = window.APP_CONFIG;
  const COLLECTIONS = ["units", "people", "providers", "projects", "manuscripts", "workItems",
    "supports", "submissions", "journals", "publications", "events"];
  const K_DRAFT = "tdu-nckh:draft", K_SESSION = "tdu-nckh:session", K_PW = "tdu-nckh:pw";

  const empty = () => {
    const d = { meta: { version: 1 }, settings: {} };
    COLLECTIONS.forEach(c => { d[c] = []; });
    return d;
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const normalize = src => {
    const out = empty();
    out.meta = Object.assign({ version: 1 }, src && src.meta);
    out.settings = Object.assign({}, src && src.settings);
    COLLECTIONS.forEach(c => { out[c] = Array.isArray(src && src[c]) ? src[c] : []; });
    return out;
  };
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
  const upsertLocal = (list, item) => {
    const i = list.findIndex(x => x.id === item.id);
    if (i >= 0) list[i] = item; else list.unshift(item);
  };

  /* ---------- Chế độ static: data/data.json + bản nháp trên trình duyệt ---------- */
  function StaticAdapter() {
    let published = empty(), data = empty(), user = null;
    const contentKey = d => JSON.stringify([d.settings, COLLECTIONS.map(c => d[c])]);
    const saveDraft = () => {
      if (!ls.set(K_DRAFT, JSON.stringify(data))) throw new Error("Trình duyệt không cho lưu bản nháp (bộ nhớ đầy hoặc chế độ riêng tư).");
    };
    const pick = () => {
      const raw = user && ls.get(K_DRAFT);
      data = raw ? normalize(JSON.parse(raw)) : clone(published);
    };

    return {
      mode: "static",
      async init() {
        const res = await fetch(CFG.DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("Không tải được " + CFG.DATA_URL + " (mã " + res.status + ").");
        published = normalize(await res.json());
        user = ss.get(K_SESSION);
        pick();
      },
      user() { return user ? { name: user } : null; },
      async signIn(username, password) {
        const expected = ls.get(K_PW) || CFG.LOCAL_ADMIN.passwordSha256;
        if (username.trim() !== CFG.LOCAL_ADMIN.username || (await sha256(password)) !== expected) {
          throw new Error("Tên đăng nhập hoặc mật khẩu không đúng.");
        }
        user = CFG.LOCAL_ADMIN.username;
        ss.set(K_SESSION, user);
        pick();
      },
      async signOut() { user = null; ss.del(K_SESSION); pick(); },
      async changePassword(oldPw, newPw) {
        const expected = ls.get(K_PW) || CFG.LOCAL_ADMIN.passwordSha256;
        if ((await sha256(oldPw)) !== expected) throw new Error("Mật khẩu hiện tại không đúng.");
        const h = await sha256(newPw);
        ls.set(K_PW, h);
        return h;
      },
      all() { return data; },
      async save(col, item) { upsertLocal(data[col], item); saveDraft(); return item; },
      async saveMany(col, items) { items.forEach(it => upsertLocal(data[col], it)); saveDraft(); },
      async remove(col, id) { data[col] = data[col].filter(x => x.id !== id); saveDraft(); },
      async saveSettings(s) { data.settings = s; saveDraft(); },
      async replaceAll(next) { data = normalize(next); saveDraft(); },
      // Riêng chế độ static
      isDirty() { return !!user && contentKey(data) !== contentKey(published); },
      exportForPublish() {
        const out = clone(data);
        out.meta.updatedAt = new Date().toISOString();
        return out;
      },
      discardDraft() { ls.del(K_DRAFT); data = clone(published); }
    };
  }

  /* ---------- Chế độ Supabase: bảng records(id, collection, data jsonb) — xem supabase/schema.sql ---------- */
  function SupabaseAdapter() {
    let client = null, data = empty(), user = null;

    const loadScript = src => new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => fail(new Error("Không tải được thư viện Supabase."));
      document.head.appendChild(s);
    });
    const check = ({ data: d, error }) => { if (error) throw new Error(error.message); return d; };
    const row = (col, item) => ({ id: item.id, collection: col, data: item, updated_at: new Date().toISOString() });

    async function reload() {
      data = empty();
      if (!user) return; // dữ liệu chỉ đọc được khi đã đăng nhập (RLS)
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const page = check(await client.from("records").select("id, collection, data").range(from, from + 999));
        rows.push(...page);
        if (page.length < 1000) break;
      }
      rows.forEach(r => {
        if (r.collection === "meta") data.meta = r.data;
        else if (r.collection === "settings") data.settings = r.data;
        else if (data[r.collection]) data[r.collection].push(Object.assign({}, r.data, { id: r.id }));
      });
    }

    return {
      mode: "supabase",
      async init() {
        if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) throw new Error("Chưa khai báo SUPABASE_URL / SUPABASE_ANON_KEY trong assets/js/config.js.");
        await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js");
        client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
        const { data: s } = await client.auth.getSession();
        user = s.session ? s.session.user : null;
        await reload();
      },
      user() { return user ? { name: user.email } : null; },
      async signIn(email, password) {
        user = check(await client.auth.signInWithPassword({ email: email.trim(), password })).user;
        await reload();
      },
      async signOut() { await client.auth.signOut(); user = null; await reload(); },
      async changePassword(_oldPw, newPw) { check(await client.auth.updateUser({ password: newPw })); return null; },
      all() { return data; },
      async save(col, item) {
        check(await client.from("records").upsert(row(col, item)));
        upsertLocal(data[col], item);
        return item;
      },
      async saveMany(col, items) {
        for (let i = 0; i < items.length; i += 500) check(await client.from("records").upsert(items.slice(i, i + 500).map(it => row(col, it))));
        items.forEach(it => upsertLocal(data[col], it));
      },
      async remove(col, id) {
        check(await client.from("records").delete().eq("id", id));
        data[col] = data[col].filter(x => x.id !== id);
      },
      async saveSettings(s) {
        check(await client.from("records").upsert({ id: "settings", collection: "settings", data: s, updated_at: new Date().toISOString() }));
        data.settings = s;
      },
      async replaceAll(next) {
        next = normalize(next);
        check(await client.from("records").delete().neq("id", ""));
        const now = new Date().toISOString();
        const rows = [{ id: "meta", collection: "meta", data: next.meta, updated_at: now },
                      { id: "settings", collection: "settings", data: next.settings, updated_at: now }];
        COLLECTIONS.forEach(c => next[c].forEach(it => rows.push(row(c, it))));
        for (let i = 0; i < rows.length; i += 500) check(await client.from("records").insert(rows.slice(i, i + 500)));
        await reload();
      },
      isDirty() { return false; }
    };
  }

  window.Store = CFG.BACKEND === "supabase" ? SupabaseAdapter() : StaticAdapter();
  window.Store.sha256 = sha256;
  window.Store.normalize = normalize;
  window.Store.COLLECTIONS = COLLECTIONS;
})();
