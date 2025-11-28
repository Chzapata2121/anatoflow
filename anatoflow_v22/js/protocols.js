/* AnatoFlow v22 PRO - Protocolos + Versiones
   - Oficiales (predefinidos)
   - Personalizados (duplicar/editar)
   - Persistencia localStorage
   - Emite: anatoflow:protocolSelected (detail: { protocol })
*/

(function () {
  "use strict";

  const KEY_CUSTOM = "anatoflow_protocols_custom_v22";
  const KEY_SELECTED = "anatoflow_protocol_selected_v22";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // --- Plantillas oficiales (puedes ampliar luego) ---
  const OFFICIAL = [
    {
      id: "he_v1",
      origin: "official",
      name: "H&E (Hematoxilina-Eosina) — v1",
      notes: "Protocolo base estándar.",
      createdAt: "2025-01-01",
      steps: [
        { label: "Xilol I", value: 4, unit: "min", type: "solvente" },
        { label: "Xilol II", value: 4, unit: "min", type: "solvente" },
        { label: "Alcohol 100% I", value: 3, unit: "min", type: "alcohol" },
        { label: "Alcohol 100% II", value: 3, unit: "min", type: "alcohol" },
        { label: "Alcohol 96%", value: 2, unit: "min", type: "alcohol" },
        { label: "Alcohol 80%", value: 2, unit: "min", type: "alcohol" },
        { label: "Agua destilada", value: 1, unit: "min", type: "agua" },
        { label: "Hematoxilina Harris", value: 8, unit: "min", type: "tincion" },
        { label: "Agua corriente", value: 5, unit: "min", type: "agua" },
        { label: "Eosina 1%", value: 2, unit: "min", type: "tincion" },
        { label: "Alcohol 80%", value: 10, unit: "seg", type: "alcohol" },
        { label: "Alcohol 96%", value: 10, unit: "seg", type: "alcohol" },
        { label: "Alcohol 100% I", value: 2, unit: "min", type: "alcohol" },
        { label: "Alcohol 100% II", value: 3, unit: "min", type: "alcohol" },
        { label: "Xilol I", value: 3, unit: "min", type: "solvente" },
        { label: "Xilol II", value: 3, unit: "min", type: "solvente" }
      ]
    },
    {
      id: "pap_v1",
      origin: "official",
      name: "Papanicolaou — v1",
      notes: "Protocolo base (simplificado).",
      createdAt: "2025-01-01",
      steps: [
        { label: "Fijación alcohol 95%", value: 15, unit: "min", type: "alcohol" },
        { label: "Hematoxilina Harris", value: 4, unit: "min", type: "tincion" },
        { label: "OG-6", value: 90, unit: "seg", type: "tincion" },
        { label: "EA-50", value: 3, unit: "min", type: "tincion" }
      ]
    }
  ];

  // --- Utilidades ---
  function uid(prefix = "p") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function loadCustom() {
    try {
      return JSON.parse(localStorage.getItem(KEY_CUSTOM) || "[]");
    } catch {
      return [];
    }
  }

  function saveCustom(custom) {
    localStorage.setItem(KEY_CUSTOM, JSON.stringify(custom));
  }

  function getAllProtocols() {
    return [...OFFICIAL, ...loadCustom()];
  }

  function setSelectedProtocolId(id) {
    localStorage.setItem(KEY_SELECTED, id);
  }

  function getSelectedProtocolId() {
    return localStorage.getItem(KEY_SELECTED) || OFFICIAL[0]?.id || "";
  }

  function findProtocolById(id) {
    return getAllProtocols().find(p => p.id === id) || null;
  }

  // --- Render UI ---
  function ensureProtocolsUI() {
    const root = document.getElementById("protocolos");
    if (!root) return;

    // Evitar duplicar
    if (root.querySelector("[data-protocols-ui='1']")) return;

    const wrap = document.createElement("div");
    wrap.setAttribute("data-protocols-ui", "1");

    wrap.innerHTML = `
      <div class="card" style="margin-bottom:1rem;">
        <div style="display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-weight:800; font-size:1.05rem;">Gestor de Protocolos</div>
            <div style="opacity:0.8; font-size:0.9rem;">Oficiales / Personalizados / Versiones</div>
          </div>
          <div style="display:flex; gap:0.6rem;">
            <button id="btnProtoNew" style="padding:0.7rem 0.9rem; border-radius:12px; border:none; background:var(--primary); color:white; font-weight:700;">
              + Nuevo
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <label style="display:block; font-weight:700; margin-bottom:0.4rem;">Seleccionar protocolo</label>
        <select id="protoSelect" style="width:100%; padding:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit;"></select>

        <div id="protoMeta" style="margin-top:0.9rem; line-height:1.35;"></div>

        <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-top:1rem;">
          <button id="btnProtoDuplicate" style="padding:0.7rem 0.9rem; border-radius:12px; border:none; background:#10b981; color:white; font-weight:800;">
            Duplicar (crear versión)
          </button>
          <button id="btnProtoEdit" style="padding:0.7rem 0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.6); background:transparent; color:inherit; font-weight:800;">
            Editar pasos
          </button>
          <button id="btnProtoUse" style="padding:0.7rem 0.9rem; border-radius:12px; border:none; background:var(--primary); color:white; font-weight:800;">
            Usar en Timer →
          </button>
        </div>

        <div id="protoStepsPreview" style="margin-top:1rem;"></div>
      </div>

      <div class="card" id="protoEditorCard" style="display:none;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.6rem;">
          <div>
            <div style="font-weight:900;">Editor de Pasos</div>
            <div style="opacity:0.8; font-size:0.9rem;">Edita, añade o elimina pasos</div>
          </div>
          <button id="btnEditorClose" style="border:none; background:transparent; color:inherit; font-size:1.2rem;">✕</button>
        </div>

        <div style="margin-top:0.8rem;">
          <label style="font-weight:700;">Nombre</label>
          <input id="editName" type="text" style="width:100%; padding:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;">
        </div>

        <div style="margin-top:0.8rem;">
          <label style="font-weight:700;">Notas</label>
          <textarea id="editNotes" rows="2" style="width:100%; padding:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit; box-sizing:border-box;"></textarea>
        </div>

        <div id="stepsEditor" style="margin-top:0.9rem;"></div>

        <button id="btnAddStep" style="margin-top:0.8rem; width:100%; padding:0.9rem; border-radius:12px; border:1px dashed rgba(59,130,246,0.8); background:rgba(59,130,246,0.10); color:inherit; font-weight:900;">
          + Añadir paso
        </button>

        <div style="display:flex; gap:0.6rem; margin-top:0.9rem;">
          <button id="btnSaveProto" style="flex:1; padding:0.9rem; border-radius:12px; border:none; background:#10b981; color:white; font-weight:900;">
            Guardar
          </button>
          <button id="btnDeleteProto" style="flex:1; padding:0.9rem; border-radius:12px; border:none; background:#ef4444; color:white; font-weight:900;">
            Eliminar
          </button>
        </div>
      </div>
    `;

    root.appendChild(wrap);
  }

  function renderProtocolSelect() {
    const sel = document.getElementById("protoSelect");
    if (!sel) return;

    const all = getAllProtocols();
    sel.innerHTML = "";

    // Grupos
    const groupOfficial = document.createElement("optgroup");
    groupOfficial.label = "Oficiales";
    OFFICIAL.forEach(p => {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.name;
      groupOfficial.appendChild(o);
    });

    const groupCustom = document.createElement("optgroup");
    groupCustom.label = "Personalizados";
    loadCustom().forEach(p => {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.name;
      groupCustom.appendChild(o);
    });

    sel.appendChild(groupOfficial);
    sel.appendChild(groupCustom);

    // Selección persistida
    const current = getSelectedProtocolId();
    if (all.some(p => p.id === current)) sel.value = current;
    else sel.value = OFFICIAL[0]?.id || "";

    renderProtocolInfo(sel.value);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
    }[c]));
  }

  function stepBadge(type) {
    const map = {
      solvente: { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.35)", t: "Solvente" },
      alcohol: { bg: "rgba(59,130,246,0.10)", bd: "rgba(59,130,246,0.35)", t: "Alcohol" },
      agua: { bg: "rgba(14,165,233,0.10)", bd: "rgba(14,165,233,0.35)", t: "Agua" },
      tincion: { bg: "rgba(16,185,129,0.10)", bd: "rgba(16,185,129,0.35)", t: "Tinción" },
      otro: { bg: "rgba(148,163,184,0.12)", bd: "rgba(148,163,184,0.35)", t: "Otro" }
    };
    return map[type] || map.otro;
  }

  function renderProtocolInfo(id) {
    const meta = document.getElementById("protoMeta");
    const prev = document.getElementById("protoStepsPreview");
    if (!meta || !prev) return;

    const p = findProtocolById(id);
    if (!p) {
      meta.innerHTML = "<div style='opacity:0.8;'>No se encontró el protocolo.</div>";
      prev.innerHTML = "";
      return;
    }

    meta.innerHTML = `
      <div><strong>Tipo:</strong> ${p.origin === "official" ? "Oficial" : "Personalizado"}</div>
      <div><strong>Creado:</strong> ${escapeHtml(p.createdAt || "-")}</div>
      <div><strong>Notas:</strong> ${escapeHtml(p.notes || "-")}</div>
      <div style="margin-top:0.6rem; opacity:0.85; font-size:0.9rem;">
        Pasos: <strong>${p.steps?.length || 0}</strong>
      </div>
    `;

    const items = (p.steps || []).map((s, idx) => {
      const b = stepBadge(s.type || "otro");
      return `
        <div style="display:flex; gap:0.6rem; align-items:center; justify-content:space-between; padding:0.75rem; border-radius:12px; margin-top:0.5rem; background:${b.bg}; border:1px solid ${b.bd};">
          <div style="font-weight:800;">${idx + 1}. ${escapeHtml(s.label)}</div>
          <div style="font-weight:900;">${Number(s.value)} ${escapeHtml(s.unit)}</div>
        </div>
      `;
    }).join("");

    prev.innerHTML = `
      <div style="margin-top:0.8rem; font-weight:900;">Vista previa</div>
      ${items || "<div style='opacity:0.75; margin-top:0.6rem;'>Sin pasos.</div>"}
    `;

    setSelectedProtocolId(id);
  }

  // --- Editor ---
  function openEditor(protocol, mode) {
    // mode: "edit" | "new" | "duplicate"
    const card = document.getElementById("protoEditorCard");
    if (!card) return;

    card.style.display = "block";
    card.scrollIntoView({ behavior: "smooth", block: "start" });

    card.dataset.editorMode = mode || "edit";
    card.dataset.editingId = protocol?.id || "";

    $("#editName").value = protocol?.name || "";
    $("#editNotes").value = protocol?.notes || "";

    renderEditorSteps(protocol?.steps || []);
  }

  function closeEditor() {
    const card = document.getElementById("protoEditorCard");
    if (!card) return;
    card.style.display = "none";
    card.dataset.editorMode = "";
    card.dataset.editingId = "";
  }

  function renderEditorSteps(steps) {
    const wrap = document.getElementById("stepsEditor");
    if (!wrap) return;

    const safe = Array.isArray(steps) ? steps : [];
    wrap.innerHTML = safe.map((s, i) => {
      const t = s.type || "otro";
      return `
        <div data-step-row="${i}" style="margin-top:0.6rem; padding:0.8rem; border-radius:14px; border:1px solid rgba(148,163,184,0.35); background:rgba(148,163,184,0.08);">
          <div style="display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center;">
            <input data-k="label" type="text" value="${escapeHtml(s.label || "")}"
              style="flex:1; min-width:180px; padding:0.8rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit;">
            <input data-k="value" type="number" step="0.1" min="0" value="${Number(s.value || 0)}"
              style="width:92px; padding:0.8rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit;">
            <select data-k="unit" style="width:92px; padding:0.8rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit;">
              <option value="min" ${s.unit === "min" ? "selected" : ""}>min</option>
              <option value="seg" ${s.unit === "seg" ? "selected" : ""}>seg</option>
            </select>

            <select data-k="type" style="width:140px; padding:0.8rem; border-radius:12px; border:1px solid rgba(148,163,184,0.45); background:transparent; color:inherit;">
              <option value="solvente" ${t === "solvente" ? "selected" : ""}>Solvente</option>
              <option value="alcohol" ${t === "alcohol" ? "selected" : ""}>Alcohol</option>
              <option value="agua" ${t === "agua" ? "selected" : ""}>Agua</option>
              <option value="tincion" ${t === "tincion" ? "selected" : ""}>Tinción</option>
              <option value="otro" ${t === "otro" ? "selected" : ""}>Otro</option>
            </select>

            <button data-act="del" style="border:none; background:#ef4444; color:white; font-weight:900; padding:0.8rem 0.9rem; border-radius:12px;">✕</button>
          </div>
        </div>
      `;
    }).join("");

    // Guardar al vuelo en memoria temporal del editor
    wrap.dataset.steps = JSON.stringify(safe);
  }

  function getEditorSteps() {
    const wrap = document.getElementById("stepsEditor");
    if (!wrap) return [];
    const rows = $$("[data-step-row]", wrap);
    const steps = rows.map((row) => {
      const inputs = $$("input, select", row);
      const data = {};
      inputs.forEach((el) => {
        const k = el.getAttribute("data-k");
        if (!k) return;
        if (k === "value") data[k] = Number(el.value || 0);
        else data[k] = el.value;
      });
      return {
        label: (data.label || "").trim(),
        value: Number.isFinite(data.value) ? data.value : 0,
        unit: data.unit === "seg" ? "seg" : "min",
        type: data.type || "otro"
      };
    });

    // Limpieza mínima
    return steps.filter(s => s.label.length > 0);
  }

  function upsertCustom(protocol) {
    const custom = loadCustom();
    const idx = custom.findIndex(p => p.id === protocol.id);
    if (idx >= 0) custom[idx] = protocol;
    else custom.push(protocol);
    saveCustom(custom);
  }

  function deleteCustom(id) {
    const custom = loadCustom().filter(p => p.id !== id);
    saveCustom(custom);
  }

  function currentProtocol() {
    const id = $("#protoSelect")?.value || getSelectedProtocolId();
    return findProtocolById(id);
  }

  // --- Events / bind ---
  function bindProtocols() {
    const root = document.getElementById("protocolos");
    if (!root) return;

    const sel = $("#protoSelect");
    const btnNew = $("#btnProtoNew");
    const btnDup = $("#btnProtoDuplicate");
    const btnEdit = $("#btnProtoEdit");
    const btnUse = $("#btnProtoUse");
    const btnClose = $("#btnEditorClose");
    const btnAddStep = $("#btnAddStep");
    const btnSave = $("#btnSaveProto");
    const btnDel = $("#btnDeleteProto");

    if (sel) {
      sel.addEventListener("change", () => renderProtocolInfo(sel.value));
    }

    if (btnNew) {
      btnNew.addEventListener("click", () => {
        openEditor({
          id: uid("custom"),
          origin: "custom",
          name: "Nuevo protocolo",
          notes: "",
          createdAt: new Date().toISOString().slice(0, 10),
          steps: [{ label: "Nuevo paso", value: 1, unit: "min", type: "otro" }]
        }, "new");
      });
    }

    if (btnDup) {
      btnDup.addEventListener("click", () => {
        const p = currentProtocol();
        if (!p) return alert("No hay protocolo seleccionado.");
        const copy = JSON.parse(JSON.stringify(p));
        copy.id = uid("custom");
        copy.origin = "custom";
        copy.name = `${p.name} — copia`;
        copy.createdAt = new Date().toISOString().slice(0, 10);
        openEditor(copy, "duplicate");
      });
    }

    if (btnEdit) {
      btnEdit.addEventListener("click", () => {
        const p = currentProtocol();
        if (!p) return alert("No hay protocolo seleccionado.");
        // Solo permitir editar si es custom
        if (p.origin !== "custom") {
          alert("Los protocolos oficiales no se editan directamente. Usa ‘Duplicar’ para crear una versión.");
          return;
        }
        openEditor(JSON.parse(JSON.stringify(p)), "edit");
      });
    }

    if (btnUse) {
      btnUse.addEventListener("click", () => {
        const p = currentProtocol();
        if (!p) return alert("No hay protocolo seleccionado.");
        setSelectedProtocolId(p.id);
        window.dispatchEvent(new CustomEvent("anatoflow:protocolSelected", { detail: { protocol: p } }));
        if (window.AnatoFlowUI?.setActiveTab) window.AnatoFlowUI.setActiveTab("timer");
      });
    }

    if (btnClose) btnClose.addEventListener("click", closeEditor);

    // Delegación para eliminar pasos
    const stepsWrap = $("#stepsEditor");
    if (stepsWrap) {
      stepsWrap.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-act='del']");
        if (!btn) return;
        const row = btn.closest("[data-step-row]");
        if (!row) return;

        row.remove();
        // Renumerar
        const rows = $$("[data-step-row]", stepsWrap);
        rows.forEach((r, i) => r.setAttribute("data-step-row", String(i)));
      });
    }

    if (btnAddStep) {
      btnAddStep.addEventListener("click", () => {
        const steps = getEditorSteps();
        steps.push({ label: "Nuevo paso", value: 1, unit: "min", type: "otro" });
        renderEditorSteps(steps);
      });
    }

    if (btnSave) {
      btnSave.addEventListener("click", () => {
        const card = $("#protoEditorCard");
        const mode = card?.dataset?.editorMode || "edit";
        const editingId = card?.dataset?.editingId || "";

        const name = ($("#editName")?.value || "").trim();
        const notes = ($("#editNotes")?.value || "").trim();
        const steps = getEditorSteps();

        if (!name) return alert("Nombre obligatorio.");
        if (steps.length === 0) return alert("Añade al menos un paso.");

        const protocol = {
          id: editingId || uid("custom"),
          origin: "custom",
          name,
          notes,
          createdAt: new Date().toISOString().slice(0, 10),
          steps
        };

        upsertCustom(protocol);
        renderProtocolSelect();
        $("#protoSelect").value = protocol.id;
        renderProtocolInfo(protocol.id);
        closeEditor();

        alert(mode === "edit" ? "Protocolo actualizado." : "Protocolo guardado.");
      });
    }

    if (btnDel) {
      btnDel.addEventListener("click", () => {
        const p = currentProtocol();
        if (!p) return;
        if (p.origin !== "custom") return alert("No puedes eliminar un protocolo oficial.");

        if (!confirm(`¿Eliminar "${p.name}"?`)) return;
        deleteCustom(p.id);

        // Volver a uno oficial
        setSelectedProtocolId(OFFICIAL[0]?.id || "");
        renderProtocolSelect();
        closeEditor();
      });
    }
  }

  function init() {
    // Solo construir si existe la pestaña
    ensureProtocolsUI();
    renderProtocolSelect();
    bindProtocols();

    // Re-render si el usuario vuelve a la pestaña
    window.addEventListener("anatoflow:tabchange", (e) => {
      if (e?.detail?.tabId === "protocolos") {
        ensureProtocolsUI();
        renderProtocolSelect();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else init();

  // Exponer APIs mínimas
  window.AnatoFlowProtocols = {
    getAllProtocols,
    getSelectedProtocolId,
    findProtocolById
  };
})();
