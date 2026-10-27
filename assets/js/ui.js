/* Thành phần giao diện dùng chung: thoát HTML, nhãn trạng thái, biểu mẫu, hộp thoại, thông báo, CSV. */
(function () {
  const { T, S, PH, statusLabel } = window.Domain;

  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NA = '<span class="na">Chưa có</span>';
  const orNA = v => (v === "" || v == null ? NA : esc(v));

  // Màu theo chặng (luôn đi kèm chữ). Tạm dừng dùng màu xám trung tính.
  const phaseColor = ph => (PH[ph] && PH[ph][2] ? `var(--s${PH[ph][2]})` : "var(--line-2)");
  const statusChip = k => k ? `<span class="chip"><i class="dot" style="background:${phaseColor((S[k] || [])[2])}"></i>${esc(statusLabel(k))}</span>` : NA;

  function dueBadge(due, today, soon = 7) {
    if (!due) return NA;
    const left = T.days(today, due);
    if (left < 0) return `<span class="tag tag-crit">! Quá hạn ${-left} ngày</span> <small class="muted">${T.fmt(due)}</small>`;
    if (left <= soon) return `<span class="tag tag-warn">Còn ${left} ngày</span> <small class="muted">${T.fmt(due)}</small>`;
    return `<span>${T.fmt(due)}</span>`;
  }
  const flagTags = flags => flags.map(f => `<span class="tag tag-${f.tone}">${f.tone === "crit" ? "! " : ""}${esc(f.text)}</span>`).join(" ");

  /* ---------- Biểu mẫu khai báo: {name, label, type, options:[[v,l]], required, help, full, list} ---------- */
  function field(f, value) {
    const id = "f-" + f.name, v = value == null ? "" : value;
    const req = f.required ? " required" : "";
    const lab = `<label for="${id}">${esc(f.label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</label>`;
    const help = f.help ? `<small class="help">${esc(f.help)}</small>` : "";
    let input;
    if (f.type === "textarea") input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}"${req}>${esc(v)}</textarea>`;
    else if (f.type === "select") input = `<select id="${id}" name="${f.name}"${req}>${f.required ? "" : '<option value="">— Chưa chọn —</option>'}${(f.options || []).map(([ov, ol]) =>
      `<option value="${esc(ov)}"${String(ov) === String(v) ? " selected" : ""}>${esc(ol)}</option>`).join("")}</select>`;
    else input = `<input id="${id}" name="${f.name}" type="${f.type || "text"}" value="${esc(v)}"${req}${f.list ? ` list="dl-${f.name}"` : ""}${f.min != null ? ` min="${f.min}"` : ""}${f.readonly ? " readonly" : ""} placeholder="${esc(f.placeholder || "")}">`
      + (f.list ? `<datalist id="dl-${f.name}">${f.list.map(o => `<option value="${esc(o)}">`).join("")}</datalist>` : "");
    return `<div class="field${f.full || f.type === "textarea" ? " full" : ""}">${lab}${input}${help}</div>`;
  }
  const formHtml = (fields, values = {}) => `<div class="form-grid">${fields.map(f => f.html ? `<div class="field full">${f.html}</div>` : field(f, values[f.name])).join("")}</div>`;
  function readForm(form, fields) {
    const out = {};
    fields.filter(f => f.name).forEach(f => {
      const raw = (form.elements[f.name].value || "").trim();
      out[f.name] = f.type === "number" ? (raw === "" ? "" : Number(raw)) : raw;
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
      <footer class="modal-foot">${extra}<span class="spacer"></span><button type="button" class="btn ghost" data-close>Hủy</button>
      ${onSubmit ? `<button type="submit" class="btn ${danger ? "danger" : "primary"}">${esc(submitLabel)}</button>` : ""}</footer></form>`;
    const form = dlg.querySelector("form");
    dlg.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => dlg.close()));
    form.addEventListener("submit", async e => {
      e.preventDefault();
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
    const first = form.querySelector(".modal-body input:not([readonly]), .modal-body select, .modal-body textarea");
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
    setTimeout(() => t.remove(), 4200);
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

  window.UI = { esc, NA, orNA, phaseColor, statusChip, dueBadge, flagTags, formHtml, readForm, modal, confirmBox, toast, parseCsv, toCsv, download };
})();
