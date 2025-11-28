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
    const fab = document.getElementById("fab-menu");
    if (!fab) return;
    ensureFabMenu();

    fab.addEventListener("click", () => toggleFab());
    document.addEventListener("click", (e) => {
      // cerrar si clic fuera
      if (!state.fabOpen) return;
      const panel = document.getElementById("fab-panel");
      if (!panel) return;
      const isFab = e.target.closest("#fab-menu");
      const isPanel = e.target.closest("#fab-panel");
      if (!isFab && !isPanel) toggleFab(false);
    });
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

  // ---------- Init ----------
  function init() {
    loadTheme();
    bindNav();
    bindFab();
    restoreLastTab();
    registerSW();
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
