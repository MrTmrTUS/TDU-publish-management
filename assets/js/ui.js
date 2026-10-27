/* Thành phần giao diện dùng chung: thoát HTML, nhãn trạng thái, biểu mẫu theo khai báo, hộp thoại, thông báo, CSV. */
(function () {
  const { label, T } = window.Domain;

  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NA = '<span class="na">Chưa có dữ liệu</span>';
  const orNA = v => (v === "" || v == null ? NA : esc(v));

  // Màu đi kèm ký hiệu + chữ (không dùng màu đơn lẻ). Thứ tự slot cố định theo từ điển trạng thái.
  const STATUS_SLOT = { dang_thuc_hien: 1, cho_noi_bo: 2, cho_ben_ngoai: 3, tam_dung: 4, hoan_thanh: 5 };
  const STATUS_ICON = { dang_thuc_hien: "▶", cho_noi_bo: "⏳", cho_ben_ngoai: "↗", tam_dung: "⏸", hoan_thanh: "✓" };
  const workBadge = s => s ? `<span class="chip"><i class="dot" style="background:var(--s${STATUS_SLOT[s]})"></i><span aria-hidden="true" class="chip-ico">${STATUS_ICON[s]}</span>${esc(label("workStatus", s))}</span>` : NA;

  const SUPPORT_TONE = { moi_gui: "info", can_bo_sung: "warn", da_phan_loai: "info", da_phan_cong: "info", dang_xu_ly: "info", cho_xac_nhan: "warn", hoan_thanh: "good", dong: "muted", mo_lai: "warn" };
  const SUPPORT_ICON = { moi_gui: "✉", can_bo_sung: "?", da_phan_loai: "≡", da_phan_cong: "→", dang_xu_ly: "▶", cho_xac_nhan: "⌛", hoan_thanh: "✓", dong: "✕", mo_lai: "↺" };
  const supportBadge = s => `<span class="tag tag-${SUPPORT_TONE[s] || "muted"}"><span aria-hidden="true">${SUPPORT_ICON[s] || ""}</span> ${esc(label("supportStatus", s))}</span>`;
  const stageBadge = (kind, s) => s ? `<span class="tag tag-stage">${esc(label(kind === "projects" ? "projectStages" : "manuscriptStages", s))}</span>` : NA;
  const DECISION_TONE = { dang_xu_ly: "info", can_sua: "warn", tu_choi: "crit", rut_bai: "muted", chap_nhan: "good" };
  const decisionBadge = d => d ? `<span class="tag tag-${DECISION_TONE[d]}">${esc(label("decisions", d))}</span>` : NA;

  // Hạn: quá hạn / sắp đến hạn / còn n ngày — luôn kèm chữ
  function dueBadge(due, cutoff, soon = 7) {
    if (!due) return NA;
    const left = T.days(cutoff, due);
    if (left < 0) return `<span class="tag tag-crit"><span aria-hidden="true">!</span> Quá hạn ${-left} ngày</span> <small class="muted">${T.fmt(due)}</small>`;
    if (left <= soon) return `<span class="tag tag-warn"><span aria-hidden="true">◷</span> Còn ${left} ngày</span> <small class="muted">${T.fmt(due)}</small>`;
    return `<span class="muted">${T.fmt(due)}</span>`;
  }

  /* ---------- Biểu mẫu khai báo ----------
     field: {name, label, type, options:[[v,l]], required, help, full, min, rows, placeholder} */
  function field(f, value) {
    const id = "f-" + f.name;
    const req = f.required ? " required" : "";
    const lab = `<label for="${id}">${esc(f.label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</label>`;
    const help = f.help ? `<small class="help">${esc(f.help)}</small>` : "";
    let input;
    const v = value == null ? "" : value;
    switch (f.type) {
      case "textarea":
        input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}"${req} placeholder="${esc(f.placeholder || "")}">${esc(v)}</textarea>`; break;
      case "select":
        input = `<select id="${id}" name="${f.name}"${req}>${f.required ? "" : '<option value="">— Chưa chọn —</option>'}${(f.options || []).map(([ov, ol]) =>
          `<option value="${esc(ov)}"${String(ov) === String(v) ? " selected" : ""}>${esc(ol)}</option>`).join("")}</select>`; break;
      case "multi": {
        const set = new Set(Array.isArray(v) ? v : []);
        input = `<div class="multi" id="${id}" role="group" aria-label="${esc(f.label)}">${(f.options || []).map(([ov, ol]) =>
          `<label class="check"><input type="checkbox" name="${f.name}" value="${esc(ov)}"${set.has(ov) ? " checked" : ""}> ${esc(ol)}</label>`).join("") || NA}</div>`;
        return `<div class="field full">${`<span class="flabel">${esc(f.label)}</span>`}${input}${help}</div>`;
      }
      case "checkbox":
        return `<div class="field${f.full ? " full" : ""}"><label class="check"><input type="checkbox" id="${id}" name="${f.name}"${v ? " checked" : ""}> ${esc(f.label)}</label>${help}</div>`;
      case "static":
        return `<div class="field${f.full ? " full" : ""}"><span class="flabel">${esc(f.label)}</span><div class="static">${f.html != null ? f.html : orNA(v)}</div>${help}</div>`;
      default:
        input = `<input id="${id}" name="${f.name}" type="${f.type || "text"}" value="${esc(v)}"${req}${f.min != null ? ` min="${esc(f.min)}"` : ""}${f.step ? ` step="${f.step}"` : ""}${f.pattern ? ` pattern="${esc(f.pattern)}"` : ""} placeholder="${esc(f.placeholder || "")}"${f.readonly ? " readonly" : ""}>`;
    }
    return `<div class="field${f.full || f.type === "textarea" ? " full" : ""}">${lab}${input}${help}</div>`;
  }
  const formHtml = (fields, values = {}) => `<div class="form-grid">${fields.map(f => f.section ? `<h4 class="form-section">${esc(f.section)}</h4>` : field(f, values[f.name])).join("")}</div>`;

  function readForm(form, fields) {
    const out = {};
    fields.filter(f => f.name && f.type !== "static").forEach(f => {
      if (f.type === "multi") out[f.name] = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map(i => i.value);
      else if (f.type === "checkbox") out[f.name] = form.elements[f.name].checked;
      else if (f.type === "number") { const raw = form.elements[f.name].value; out[f.name] = raw === "" ? "" : Number(raw); }
      else out[f.name] = (form.elements[f.name].value || "").trim();
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
      if (missing.length) {
        missing[0].focus();
        err.textContent = "Vui lòng điền các trường bắt buộc (*).";
        err.hidden = false;
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const keepOpen = await onSubmit(form);
        if (keepOpen !== true) dlg.close();
      } catch (ex) {
        err.textContent = ex.message || String(ex);
        err.hidden = false;
      } finally { btn.disabled = false; }
    });
    dlg.showModal();
    const first = form.querySelector(".modal-body input:not([type=hidden]):not([readonly]), .modal-body select, .modal-body textarea");
    if (first) first.focus();
    return form;
  }
  const confirmBox = (title, text, onYes, yesLabel = "Xác nhận") =>
    modal({ title, body: `<p>${esc(text)}</p>`, submitLabel: yesLabel, danger: true, onSubmit: onYes });

  /* ---------- Thông báo ---------- */
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
    const delim = (text.split("\n")[0].match(/;/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
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
  const csvCell = v => { const s = Array.isArray(v) ? v.join("; ") : String(v == null ? "" : v); return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const toCsv = rows => "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");
  function download(name, content, type = "text/csv;charset=utf-8") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  const defBox = (code, text) => `<details class="def"><summary aria-label="Định nghĩa ${esc(code)}"><span aria-hidden="true">ⓘ</span></summary><div class="def-pop"><b>${esc(code)}</b> ${esc(text)}</div></details>`;

  window.UI = { esc, NA, orNA, workBadge, supportBadge, stageBadge, decisionBadge, dueBadge, STATUS_SLOT, STATUS_ICON,
    field, formHtml, readForm, modal, confirmBox, toast, parseCsv, toCsv, download, defBox };
})();
