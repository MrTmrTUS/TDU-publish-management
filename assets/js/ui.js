/* Thành phần giao diện dùng chung: thoát HTML, nhãn, biểu mẫu khai báo, hộp thoại, thông báo, CSV. */
(function () {
  const { T, S, PH, SS, statusLabel } = window.Domain;

  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NA = '<span class="na">Chưa có</span>';
  const orNA = v => (v === "" || v == null ? NA : esc(v));
  const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";
  const link = (url, text) => safeUrl(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text || url)} ↗</a>` : orNA(url);

  // Màu theo chặng (luôn kèm chữ)
  const phaseColor = ph => (PH[ph] && PH[ph][2] ? `var(--s${PH[ph][2]})` : "var(--line-2)");
  const statusChip = k => k ? `<span class="chip"><i class="dot" style="background:${phaseColor((S[k] || [])[2])}"></i>${esc(statusLabel(k))}</span>` : NA;
  const tag = (tone, text, icon = "") => `<span class="tag tag-${tone}">${icon ? `<span aria-hidden="true">${icon}</span> ` : ""}${esc(text)}</span>`;
  const supportTag = s => { const d = SS[s] || [s, s, "muted"]; return tag(d[2], d[1]); };

  function dueBadge(due, today, soon = 7) {
    if (!due) return NA;
    const left = T.days(today, due);
    if (left < 0) return `${tag("crit", `Quá hạn ${-left} ngày`, "!")} <small class="muted">${T.fmt(due)}</small>`;
    if (left <= soon) return `${tag("warn", `Còn ${left} ngày`)} <small class="muted">${T.fmt(due)}</small>`;
    return `<span>${T.fmt(due)}</span>`;
  }
  const flagTags = flags => flags.map(f => tag(f.tone, f.text, f.tone === "crit" ? "!" : "")).join(" ");
  const initials = name => { const p = String(name || "?").replace(/^(GS|PGS|TS|ThS|CN|BS|DS)\.?(TS\.?)?\s*/i, "").trim().split(/\s+/); return esc(((p[p.length - 2] || "")[0] || "") + ((p[p.length - 1] || "?")[0] || "")).toUpperCase(); };
  const avatar = (name, size = 40) => `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px" aria-hidden="true">${initials(name)}</span>`;
  const stars = n => n ? `<span class="stars" aria-label="${n} trên 5 sao">${"★".repeat(n)}${"☆".repeat(5 - n)}</span>` : NA;

  /* ---------- Biểu mẫu khai báo ----------
     {name, label, type: text|email|url|date|number|password|textarea|select|multi|checkbox|stars|html, options:[[v,l]], required, help, full, list, readonly} */
  function field(f, value) {
    const id = "f-" + f.name, v = value == null ? "" : value;
    const req = f.required ? " required" : "";
    const lab = `<label for="${id}">${esc(f.label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</label>`;
    const help = f.help ? `<small class="help">${esc(f.help)}</small>` : "";
    const wide = f.full || f.type === "textarea" || f.type === "multi" ? " full" : "";
    let input;
    switch (f.type) {
      case "html": return `<div class="field full">${f.html}</div>`;
      case "textarea": input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}"${req} placeholder="${esc(f.placeholder || "")}">${esc(v)}</textarea>`; break;
      case "select":
        input = `<select id="${id}" name="${f.name}"${req}>${f.required ? "" : `<option value="">${esc(f.empty || "— Chưa chọn —")}</option>`}${(f.options || []).map(([ov, ol, dis]) =>
          `<option value="${esc(ov)}"${String(ov) === String(v) ? " selected" : ""}${dis ? " disabled" : ""}>${esc(ol)}</option>`).join("")}</select>`; break;
      case "multi": {
        const set = new Set(Array.isArray(v) ? v : []);
        input = `<div class="multi" role="group" aria-label="${esc(f.label)}">${(f.options || []).map(([ov, ol]) =>
          `<label class="check"><input type="checkbox" name="${f.name}" value="${esc(ov)}"${set.has(ov) ? " checked" : ""}> ${esc(ol)}</label>`).join("") || NA}</div>`;
        return `<div class="field full"><span class="flabel">${esc(f.label)}</span>${input}${help}</div>`;
      }
      case "checkbox": return `<div class="field${wide}"><label class="check"><input type="checkbox" id="${id}" name="${f.name}"${v ? " checked" : ""}> ${esc(f.label)}</label>${help}</div>`;
      case "stars":
        input = `<div class="star-input" role="radiogroup" aria-label="${esc(f.label)}">${[1, 2, 3, 4, 5].map(n =>
          `<label><input type="radio" name="${f.name}" value="${n}"${Number(v) === n ? " checked" : ""}><span aria-hidden="true">★</span><span class="sr-only">${n} sao</span></label>`).join("")}</div>`; break;
      default:
        input = `<input id="${id}" name="${f.name}" type="${f.type || "text"}" value="${esc(v)}"${req}${f.list ? ` list="dl-${f.name}"` : ""}${f.min != null ? ` min="${f.min}"` : ""}${f.readonly ? " readonly" : ""}${f.autocomplete ? ` autocomplete="${f.autocomplete}"` : ""} placeholder="${esc(f.placeholder || "")}">`
          + (f.list ? `<datalist id="dl-${f.name}">${f.list.map(o => `<option value="${esc(o)}">`).join("")}</datalist>` : "");
    }
    return `<div class="field${wide}">${lab}${input}${help}</div>`;
  }
  const formHtml = (fields, values = {}) => `<div class="form-grid">${fields.map(f => field(f, values[f.name])).join("")}</div>`;
  function readForm(form, fields) {
    const out = {};
    fields.filter(f => f.name && f.type !== "html").forEach(f => {
      if (f.type === "multi") out[f.name] = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map(i => i.value);
      else if (f.type === "checkbox") out[f.name] = form.elements[f.name].checked;
      else if (f.type === "stars") { const c = form.querySelector(`input[name="${f.name}"]:checked`); out[f.name] = c ? Number(c.value) : 0; }
      else { const raw = (form.elements[f.name].value || "").trim(); out[f.name] = f.type === "number" ? (raw === "" ? "" : Number(raw)) : raw; }
    });
    return out;
  }

  /* ---------- Hộp thoại ---------- */
  let dlg;
  function modal({ title, body, submitLabel = "Lưu", onSubmit, wide, danger, extra = "" }) {
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.className = "modal";
      document.body.appendChild(dlg);
      dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    }
    dlg.classList.toggle("wide", !!wide);
    dlg.innerHTML = `<form method="dialog" class="modal-form" novalidate>
      <header class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Đóng">✕</button></header>
      <div class="modal-body">${body}</div>
      <p class="form-error" role="alert" hidden></p>
      <footer class="modal-foot">${extra}<span class="spacer"></span><button type="button" class="btn ghost" data-close>${onSubmit ? "Hủy" : "Đóng"}</button>
      ${onSubmit ? `<button type="submit" class="btn ${danger ? "danger" : "primary"}">${esc(submitLabel)}</button>` : ""}</footer></form>`;
    const form = dlg.querySelector("form");
    dlg.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => dlg.close()));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (!onSubmit) return;
      const err = form.querySelector(".form-error");
      err.hidden = true;
      const missing = [...form.querySelectorAll("[required]")].filter(i => !String(i.value).trim());
      if (missing.length) { missing[0].focus(); err.textContent = "Vui lòng điền các ô bắt buộc (*)."; err.hidden = false; return; }
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try { if ((await onSubmit(form)) !== true) dlg.close(); }
      catch (ex) { err.textContent = ex.message || String(ex); err.hidden = false; }
      finally { btn.disabled = false; }
    });
    dlg.showModal();
    const first = form.querySelector(".modal-body input:not([readonly]):not([type=radio]):not([type=checkbox]), .modal-body select, .modal-body textarea");
    if (first) first.focus();
    return form;
  }
  const confirmBox = (title, text, onYes, yesLabel = "Xác nhận") => modal({ title, body: `<p>${esc(text)}</p>`, submitLabel: yesLabel, danger: true, onSubmit: onYes });

  function toast(msg, tone = "good") {
    let box = document.querySelector(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast toast-" + tone;
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  /* ---------- CSV ---------- */
  function parseCsv(text) {
    text = text.replace(/^﻿/, "");
    const first = text.split("\n")[0];
    const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : ",";
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = "";
        if (row.some(x => x.trim() !== "")) rows.push(row);
        row = [];
      } else cur += c;
    }
    row.push(cur);
    if (row.some(x => x.trim() !== "")) rows.push(row);
    return rows;
  }
  const csvCell = v => { const s = String(v == null ? "" : v); return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const toCsv = rows => "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");
  function download(name, content, type = "text/csv;charset=utf-8") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  window.UI = { esc, NA, orNA, safeUrl, link, phaseColor, statusChip, tag, supportTag, dueBadge, flagTags, avatar, stars,
    field, formHtml, readForm, modal, confirmBox, toast, parseCsv, toCsv, download };
})();
