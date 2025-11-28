/* AnatoFlow v22 PRO - Inventario
   - CRUD reactivos
   - Alertas: bajo stock / caduca pronto
   - Persistencia localStorage
   - Función de descuento por consumo por paso (integración con Timer/Protocolos)
   - Emite: anatoflow:inventoryChanged
*/
(function () {
  "use strict";

  const KEY_INV = "anatoflow_inventory_v22";
  const KEY_SETTINGS = "anatoflow_settings_v22";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function loadInv() {
    try { return JSON.parse(localStorage.getItem(KEY_INV) || "[]"); } catch { return []; }
  }
  function saveInv(inv) {
    localStorage.setItem(KEY_INV, JSON.stringify(inv));
    window.dispatchEvent(new CustomEvent("anatoflow:inventoryChanged", { detail: { inventory: inv } }));
  }

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(KEY_SETTINGS) || "{}"); } catch { return {}; }
  }
  function saveSettings(s) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
  }

  const defaultSettings = {
    consumptionPerStepMl: 165,
    expiryWarnDays: 30
  };

  function settings() {
    const s = { ...defaultSettings, ...(loadSettings() || {}) };
    saveSettings(s);
    return s;
  }

  // UI
  function ensureInventoryUI() {
    const root = document.getElementById("inventario");
    if (!root) return;
    if (root.querySelector("[data-inv-ui='1']")) return;

    const wrap = document.createElement("div");
    wrap.setAttribute("data-inv-ui", "1");

    wrap.innerHTML = `
      <div class="card" style="margin-bottom:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.8rem; flex-wrap:wrap;">
          <div>
            <div style="font-weight:900; font-size:1.05rem;">Inventario de Reactivos</div>
            <div style="opacity:0.8; font-size:0.9rem;">Control de stock, caducidades y lotes</div>
          </div>
          <button id="btnInvAdd" style="padding:0.7rem 0.9rem; border-radius:12px; border:none; background:var(--primary); color:white; font-weight:900;">
            + Añadir
          </button>
        </div>
      </div>

      <div class="card" id="invSettingsCard" style="margin-bottom:1rem;">
        <div style="font-weight:900; margin-bottom:0.6rem;">Ajustes de consumo</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem;">
          <div>
            <label style="font-weight:800; font-size:0.9rem;">Consumo por paso (ml)</label>
            <input id="invConsumption" type="number" step="1" min="0" style="width:100%; padding:0.8rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;">
          </div>
          <div>
            <label style="font-weight:800; font-size:0.9rem;">Alerta caducidad (días)</label>
            <input id="invExpiryDays" type="number" step="1" min="0" style="width:100%; padding:0.8rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;">
          </div>
        </div>
        <button id="btnInvSaveSettings" style="margin-top:0.7rem; width:100%; padding:0.9rem; border-radius:12px; border:none; background:#10b981; color:white; font-weight:900;">
          Guardar ajustes
        </button>
      </div>

      <div class="card" id="invFormCard" style="display:none; margin-bottom:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-weight:900;">Reactivo</div>
          <button id="btnInvFormClose" style="border:none; background:transparent; color:inherit; font-size:1.2rem;">✕</button>
        </div>

        <input id="invName" type="text" placeholder="Nombre del reactivo"
          style="width:100%; padding:0.9rem; margin-top:0.7rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;">

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; margin-top:0.6rem;">
          <input id="invStock" type="number" step="0.01" placeholder="Stock"
            style="width:100%; padding:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;">
          <input id="invUnit" type="text" placeholder="Unidad (ml)"
            style="width:100%; padding:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;" value="ml">
          <input id="invMin" type="number" step="0.01" placeholder="Mínimo"
            style="width:100%; padding:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;">
          <input id="invExpiry" type="date"
            style="width:100%; padding:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;">
          <input id="invLot" type="text" placeholder="Lote"
            style="grid-column:1 / -1; width:100%; padding:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;">
        </div>

        <div style="display:flex; gap:0.6rem; margin-top:0.8rem;">
          <button id="btnInvSave" style="flex:1; padding:0.9rem; border-radius:12px; border:none; background:#10b981; color:white; font-weight:900;">
            Guardar
          </button>
          <button id="btnInvDelete" style="flex:1; padding:0.9rem; border-radius:12px; border:none; background:#ef4444; color:white; font-weight:900;">
            Eliminar
          </button>
        </div>
        <input id="invEditIndex" type="hidden" value="">
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.8rem; flex-wrap:wrap;">
          <div style="font-weight:900;">Listado</div>
          <input id="invSearch" type="text" placeholder="Buscar..."
            style="flex:1; min-width:160px; padding:0.8rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;">
        </div>

        <div style="overflow:auto; margin-top:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.20);">
          <table style="width:100%; border-collapse:collapse; min-width:760px;">
            <thead>
              <tr style="background:rgba(148,163,184,0.12); text-align:left;">
                <th style="padding:0.9rem;">Nombre</th>
                <th style="padding:0.9rem;">Stock</th>
                <th style="padding:0.9rem;">Mínimo</th>
                <th style="padding:0.9rem;">Caducidad</th>
                <th style="padding:0.9rem;">Lote</th>
                <th style="padding:0.9rem;">Acciones</th>
              </tr>
            </thead>
            <tbody id="invTbody"></tbody>
          </table>
        </div>

        <div id="invSummary" style="margin-top:0.8rem; opacity:0.9;"></div>
      </div>
    `;

    root.appendChild(wrap);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
    }[c]));
  }

  function daysBetween(a, b) {
    const ms = (b - a);
    return Math.ceil(ms / 86400000);
  }

  function renderTable() {
    const inv = loadInv();
    const cfg = settings();
    const q = ($("#invSearch")?.value || "").trim().toLowerCase();

    const tbody = $("#invTbody");
    const summary = $("#invSummary");
    if (!tbody || !summary) return;

    const today = new Date();
    let lowCount = 0;
    let expCount = 0;

    const filtered = inv.filter(r => {
      if (!q) return true;
      return (r.name || "").toLowerCase().includes(q) ||
             (r.lot || "").toLowerCase().includes(q);
    });

    tbody.innerHTML = "";

    filtered.forEach((r, i) => {
      const cad = r.expiry ? new Date(r.expiry) : null;
      const dias = cad ? daysBetween(today, cad) : null;
      const low = Number(r.stock || 0) <= Number(r.min || 0);
      const expSoon = dias !== null && dias <= Number(cfg.expiryWarnDays || 30);

      if (low) lowCount++;
      if (expSoon) expCount++;

      const tr = document.createElement("tr");
      tr.style.borderTop = "1px solid rgba(148,163,184,0.22)";
      if (low) tr.style.background = "rgba(239,68,68,0.08)";
      if (expSoon) tr.style.background = "rgba(245,158,11,0.09)";

      tr.innerHTML = `
        <td style="padding:0.9rem; font-weight:900;">${esc(r.name || "")}</td>
        <td style="padding:0.9rem;">${Number(r.stock || 0)} ${esc(r.unit || "")}</td>
        <td style="padding:0.9rem;">${r.min === "" || r.min == null ? "—" : Number(r.min)}</td>
        <td style="padding:0.9rem;">
          ${r.expiry ? esc(r.expiry) : "—"}
          ${expSoon ? " ⚠" : ""}
        </td>
        <td style="padding:0.9rem;">${r.lot ? esc(r.lot) : "—"}</td>
        <td style="padding:0.9rem;">
          <button data-act="edit" data-i="${i}" style="border:none; background:transparent; color:inherit; font-weight:900;">✏</button>
          <button data-act="del" data-i="${i}" style="border:none; background:transparent; color:#ef4444; font-weight:900;">🗑</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    summary.innerHTML = `
      <div><strong>Total:</strong> ${inv.length} | <strong>Mostrando:</strong> ${filtered.length}</div>
      <div><strong>Bajo stock:</strong> ${lowCount} | <strong>Caduca pronto:</strong> ${expCount}</div>
    `;
  }

  function openForm(editIndex) {
    $("#invFormCard").style.display = "block";
    $("#invFormCard").scrollIntoView({ behavior: "smooth", block: "start" });

    const inv = loadInv();
    if (editIndex != null && editIndex !== "") {
      const r = inv[Number(editIndex)];
      if (!r) return;

      $("#invEditIndex").value = String(editIndex);
      $("#invName").value = r.name || "";
      $("#invStock").value = r.stock ?? "";
      $("#invUnit").value = r.unit || "ml";
      $("#invMin").value = r.min ?? "";
      $("#invExpiry").value = r.expiry || "";
      $("#invLot").value = r.lot || "";
      $("#btnInvDelete").style.display = "block";
    } else {
      $("#invEditIndex").value = "";
      $("#invName").value = "";
      $("#invStock").value = "";
      $("#invUnit").value = "ml";
      $("#invMin").value = "";
      $("#invExpiry").value = "";
      $("#invLot").value = "";
      $("#btnInvDelete").style.display = "none";
    }
  }

  function closeForm() {
    $("#invFormCard").style.display = "none";
  }

  function saveReactivo() {
    const name = ($("#invName").value || "").trim();
    if (!name) return alert("Nombre obligatorio.");

    const r = {
      name,
      stock: Number($("#invStock").value || 0),
      unit: ($("#invUnit").value || "ml").trim() || "ml",
      min: $("#invMin").value === "" ? "" : Number($("#invMin").value),
      expiry: $("#invExpiry").value || "",
      lot: ($("#invLot").value || "").trim()
    };

    const inv = loadInv();
    const editIndex = $("#invEditIndex").value;

    if (editIndex !== "") {
      inv[Number(editIndex)] = r;
    } else {
      inv.push(r);
    }

    saveInv(inv);
    closeForm();
    renderTable();
  }

  function deleteReactivo() {
    const inv = loadInv();
    const editIndex = $("#invEditIndex").value;
    if (editIndex === "") return;

    const r = inv[Number(editIndex)];
    if (!r) return;

    if (!confirm(`¿Eliminar "${r.name}"?`)) return;
    inv.splice(Number(editIndex), 1);
    saveInv(inv);
    closeForm();
    renderTable();
  }

  // Integración: descontar consumo por pasos
  function discountBySteps(stepLabels, perStepMl) {
    const inv = loadInv();
    const per = Number(perStepMl || settings().consumptionPerStepMl || 165);

    stepLabels.forEach(lbl => {
      const label = String(lbl || "").toLowerCase();
      // match por inclusión simple
      const found = inv.find(x => (x.name || "").toLowerCase().includes(label) || label.includes((x.name || "").toLowerCase()));
      if (found) {
        found.stock = Number(found.stock || 0) - per;
        if (found.stock < 0) found.stock = 0;
      }
    });

    saveInv(inv);
    renderTable();
  }

  function bindInventory() {
    $("#btnInvAdd")?.addEventListener("click", () => openForm(""));
    $("#btnInvFormClose")?.addEventListener("click", closeForm);
    $("#btnInvSave")?.addEventListener("click", saveReactivo);
    $("#btnInvDelete")?.addEventListener("click", deleteReactivo);

    $("#invSearch")?.addEventListener("input", renderTable);

    // tabla acciones
    $("#invTbody")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const act = btn.getAttribute("data-act");
      const i = btn.getAttribute("data-i");
      if (act === "edit") openForm(i);
      if (act === "del") {
        const inv = loadInv();
        const r = inv[Number(i)];
        if (!r) return;
        if (!confirm(`¿Eliminar "${r.name}"?`)) return;
        inv.splice(Number(i), 1);
        saveInv(inv);
        renderTable();
      }
    });

    // settings
    const cfg = settings();
    $("#invConsumption").value = cfg.consumptionPerStepMl;
    $("#invExpiryDays").value = cfg.expiryWarnDays;

    $("#btnInvSaveSettings")?.addEventListener("click", () => {
      const s = settings();
      s.consumptionPerStepMl = Number($("#invConsumption").value || s.consumptionPerStepMl);
      s.expiryWarnDays = Number($("#invExpiryDays").value || s.expiryWarnDays);
      saveSettings(s);
      alert("Ajustes guardados.");
      renderTable();
    });

    // Si termina protocolo y se solicita descuento, se puede disparar este evento desde report/timer
    window.addEventListener("anatoflow:discountInventory", (e) => {
      const { stepLabels, perStepMl } = e?.detail || {};
      if (!Array.isArray(stepLabels) || stepLabels.length === 0) return;
      discountBySteps(stepLabels, perStepMl);
    });
  }

  function init() {
    ensureInventoryUI();
    bindInventory();
    renderTable();

    window.addEventListener("anatoflow:tabchange", (e) => {
      if (e?.detail?.tabId === "inventario") renderTable();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.AnatoFlowInventory = {
    load: loadInv,
    save: saveInv,
    discountBySteps,
    settings
  };
})();
