/* AnatoFlow v22 PRO - UI Core
   - Navegación por tabs (bottom nav)
   - FAB: menú rápido (acciones)
   - Tema claro/oscuro persistente
   - Registro del Service Worker
*/
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    activeTab: "home",
    fabOpen: false,
    theme: "light",
  };

  // ---------- Tema ----------
  function loadTheme() {
    const t = localStorage.getItem("anatoflow_theme");
    if (t === "dark" || t === "light") state.theme = t;
    applyTheme();
  }

  function applyTheme() {
    if (state.theme === "dark") document.body.classList.add("dark");
    else document.body.classList.remove("dark");
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("anatoflow_theme", state.theme);
    applyTheme();
  }

  // ---------- Tabs ----------
  function setActiveTab(tabId) {
    const tab = document.getElementById(tabId);
    if (!tab) return;

    $$(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    $$("nav button").forEach((b) => b.classList.remove("active"));
    const btn = $(`nav button[data-tab="${tabId}"]`);
    if (btn) btn.classList.add("active");

    state.activeTab = tabId;
    localStorage.setItem("anatoflow_last_tab", tabId);

    // Hook: avisar a módulos que cambió la pestaña
    window.dispatchEvent(new CustomEvent("anatoflow:tabchange", { detail: { tabId } }));
  }

  function restoreLastTab() {
    const last = localStorage.getItem("anatoflow_last_tab");
    if (last && document.getElementById(last)) setActiveTab(last);
  }

  // ---------- FAB ----------
  function ensureFabMenu() {
    // Creamos un pequeño panel de acciones rápidas que aparece al pulsar el FAB.
    let panel = document.getElementById("fab-panel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "fab-panel";
    panel.style.position = "fixed";
    panel.style.right = "1.3rem";
    panel.style.bottom = "8.2rem";
    panel.style.background = "var(--card)";
    panel.style.color = "var(--text)";
    panel.style.borderRadius = "14px";
    panel.style.boxShadow = "0 10px 30px rgba(0,0,0,0.18)";
    panel.style.padding = "0.6rem";
    panel.style.display = "none";
    panel.style.zIndex = "960";
    panel.style.minWidth = "220px";

    panel.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.4rem;">
        <button data-action="theme" style="padding:0.7rem;border-radius:12px;border:1px solid rgba(148,163,184,0.35);background:transparent;color:inherit;text-align:left;">
          Cambiar tema (claro/oscuro)
        </button>
        <button data-action="go-protocolos" style="padding:0.7rem;border-radius:12px;border:1px solid rgba(148,163,184,0.35);background:transparent;color:inherit;text-align:left;">
          Ir a Protocolos
        </button>
        <button data-action="go-timer" style="padding:0.7rem;border-radius:12px;border:1px solid rgba(148,163,184,0.35);background:transparent;color:inherit;text-align:left;">
          Ir a Timer
        </button>
        <button data-action="reset" style="padding:0.7rem;border-radius:12px;border:1px solid rgba(239,68,68,0.45);background:transparent;color:inherit;text-align:left;">
          Reset rápido (solo UI)
        </button>
      </div>
    `;

    document.body.appendChild(panel);

    panel.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.getAttribute("data-action");

      if (action === "theme") toggleTheme();
      if (action === "go-protocolos") setActiveTab("protocolos");
      if (action === "go-timer") setActiveTab("timer");
      if (action === "reset") {
        // No borra datos clínicos; solo vuelve a Inicio.
        setActiveTab("home");
      }
      toggleFab(false);
    });

    return panel;
  }

  function toggleFab(force) {
    const panel = ensureFabMenu();
    const open = typeof force === "boolean" ? force : !state.fabOpen;
    state.fabOpen = open;
    panel.style.display = open ? "block" : "none";
  }

  function bindFab() {
    // Usamos el id del botón de la flecha que tienes en tu HTML
    const fab = $(".fab"); 
    if (!fab) return;
    ensureFabMenu();

    // No hay un FAB en el HTML que se llame fab-menu, por lo que usaremos el que sube
    // Pero la lógica de tu FAB que sube es para el scroll, así que desactivamos el menú FAB
    // y solo mantenemos el scroll para evitar que falle.

    // bindFab original:
    // const fab = document.getElementById("fab-menu");
    // if (!fab) return;
    // ensureFabMenu();
    // fab.addEventListener("click", () => toggleFab());
  }

  // ---------- Service Worker ----------
  async function registerSW() {
    try {
      if (!("serviceWorker" in navigator)) return;
      await navigator.serviceWorker.register("./service-worker.js");
      // console.log("SW registrado");
    } catch (err) {
      // console.warn("SW no registrado:", err);
    }
  }

  // ---------- Bind nav ----------
  function bindNav() {
    $$("nav button[data-tab]").forEach((b) => {
      b.addEventListener("click", () => setActiveTab(b.dataset.tab));
    });
  }

  // ---------- Funciones Globales (Para llamar desde el HTML) ----------

  // 1. Asignar fecha de entrada (llamada al inicio en init)
  function setFechaEntrada() {
    const fechaInput = document.getElementById('fechaEntrada');
    if (fechaInput) {
      fechaInput.value = new Date().toLocaleString('es-ES');
    }
  }

  // 2. FUNCIÓN GUARDAR DATOS Y CONTINUAR (EXPORTADA GLOBALMENTE)
  window.guardarDatosMuestra = function() {
    const organo = document.getElementById("organo").value || "No indicado";

    const datos = {
      codigo: document.getElementById('codigoMuestra').value.trim(),
      tecnico: document.getElementById('tecnico').value.trim(),
      fecha: document.getElementById('fechaEntrada').value,
      organo: organo,
      tipo: document.getElementById('tipoMuestra').value,
      condicion: document.getElementById('condicion').value,
      notas: document.getElementById('notas').value.trim(),
      guardadoEn: new Date().toISOString()
    };

    if (!datos.codigo || !datos.tecnico || datos.organo === "No indicado" || !datos.tipo || !datos.condicion) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    // Clave de localStorage para los datos de la muestra (coincide con tu script JS)
    localStorage.setItem("anatoflow_muestra_v22", JSON.stringify(datos));
    document.getElementById("msgMuestra").textContent = "Datos guardados correctamente";
    document.getElementById("msgMuestra").style.color = "#10b981";

    // Llamar a la función de navegación expuesta
    if (window.AnatoFlowUI && typeof window.AnatoFlowUI.setActiveTab === 'function') {
        window.AnatoFlowUI.setActiveTab("protocolos");
    } else {
        // Fallback si la UI no se ha inicializado completamente
        setActiveTab("protocolos");
    }
    window.scrollTo({top:0,behavior:'smooth'}); 
  };


  // ---------- Init ----------
  function init() {
    loadTheme();
    bindNav();
    bindFab();
    restoreLastTab();
    registerSW();
    setFechaEntrada(); // <-- Llamar a la función de fecha aquí
  }

  // Exponer utilidades mínimas para otros módulos
  window.AnatoFlowUI = {
    setActiveTab,
    toggleTheme,
    getTheme: () => state.theme,
    getActiveTab: () => state.activeTab,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
