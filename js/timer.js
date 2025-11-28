/* AnatoFlow v22 PRO - Timer
   - consume protocolo seleccionado (anatoflow:protocolSelected o localStorage)
   - controla pasos + progreso + play/pause
   - registra log del proceso para el informe
*/
(function () {
  "use strict";

  const KEY_SELECTED = "anatoflow_protocol_selected_v22";
  const KEY_TIMER_LOG = "anatoflow_timer_log_v22";
  const KEY_TIMER_STATE = "anatoflow_timer_state_v22"; // para reanudar

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let protocol = null;
  let steps = [];
  let idx = 0;

  let interval = null;
  let running = false;
  let remainingSec = 0;
  let totalSec = 0;

  // ------ Utilidades de tiempo ------
  function toSec(value, unit) {
    const v = Number(value || 0);
    if (!Number.isFinite(v)) return 0;
    return unit === "min" ? Math.round(v * 60) : Math.round(v);
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  // ------ Log para informe ------
  function loadLog() {
    try { return JSON.parse(localStorage.getItem(KEY_TIMER_LOG) || "[]"); } catch { return []; }
  }
  function pushLog(entry) {
    const log = loadLog();
    log.push(entry);
    localStorage.setItem(KEY_TIMER_LOG, JSON.stringify(log));
    window.dispatchEvent(new CustomEvent("anatoflow:timerlog", { detail: { entry, log } }));
  }
  function clearLog() {
    localStorage.setItem(KEY_TIMER_LOG, JSON.stringify([]));
  }

  // ------ Persistencia del timer (reanudar) ------
  function saveTimerState() {
    const state = {
      protocolId: protocol?.id || null,
      idx,
      running,
      remainingSec,
      totalSec,
      ts: Date.now()
    };
    localStorage.setItem(KEY_TIMER_STATE, JSON.stringify(state));
  }

  function loadTimerState() {
    try { return JSON.parse(localStorage.getItem(KEY_TIMER_STATE) || "null"); } catch { return null; }
  }

  function clearTimerState() {
    localStorage.removeItem(KEY_TIMER_STATE);
  }

  // ------ UI ------
  function ensureTimerUI() {
    const root = document.getElementById("timer");
    if (!root) return;
    if (root.querySelector("[data-timer-ui='1']")) return;

    const wrap = document.createElement("div");
    wrap.setAttribute("data-timer-ui", "1");

    wrap.innerHTML = `
      <div class="card" style="display:flex; flex-direction:column; gap:0.7rem;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.8rem; flex-wrap:wrap;">
          <div>
            <div id="timerTitle" style="font-weight:900; font-size:1.05rem;">Timer</div>
            <div id="timerSub" style="opacity:0.8; font-size:0.9rem;">Selecciona un protocolo en Protocolos.</div>
          </div>

          <button id="btnLabMode" style="padding:0.65rem 0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.55); background:transparent; color:inherit; font-weight:900;">
            Modo Lab
          </button>
        </div>

        <div id="timerClock" style="text-align:center; font-size:4.2rem; font-weight:900; letter-spacing:2px; color:var(--primary);">00:00</div>
        <div id="timerStep" style="text-align:center; font-weight:800; font-size:1.05rem;">Presiona ▶ para comenzar</div>

        <progress id="timerProg" value="0" max="100" style="width:100%; height:16px; border-radius:14px;"></progress>

        <div id="timerBtns" style="display:flex; justify-content:center; gap:1.1rem; margin-top:0.6rem; flex-wrap:wrap;">
          <button id="btnPrev" style="width:84px; height:84px; border-radius:999px; border:none; background:var(--primary); color:white; font-size:2rem; font-weight:900;">◄</button>
          <button id="btnPlay" style="width:84px; height:84px; border-radius:999px; border:none; background:#f59e0b; color:white; font-size:2rem; font-weight:900;">▶</button>
          <button id="btnNext" style="width:84px; height:84px; border-radius:999px; border:none; background:var(--primary); color:white; font-size:2rem; font-weight:900;">►</button>
        </div>

        <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-top:0.8rem;">
          <button id="btnResetTimer" style="flex:1; min-width:160px; padding:0.9rem; border-radius:12px; border:none; background:#ef4444; color:white; font-weight:900;">
            Reset
          </button>
          <button id="btnSendReport" style="flex:1; min-width:160px; padding:0.9rem; border-radius:12px; border:none; background:#10b981; color:white; font-weight:900;">
            Enviar a Informe
          </button>
        </div>

        <div id="timerMini" style="margin-top:0.8rem; opacity:0.85; font-size:0.9rem;"></div>
      </div>
    `;

    root.appendChild(wrap);
  }

  function setTitle() {
    $("#timerTitle").textContent = protocol ? protocol.name : "Timer";
    $("#timerSub").textContent = protocol ? (protocol.notes || "Protocolo cargado.") : "Selecciona un protocolo en Protocolos.";
  }

  function setStepText() {
    if (!protocol || steps.length === 0) {
      $("#timerStep").textContent = "Selecciona un protocolo en Protocolos.";
      return;
    }
    const step = steps[idx];
    $("#timerStep").textContent = `${idx + 1}/${steps.length} — ${step.label}`;
  }

  function updateClock() {
    $("#timerClock").textContent = fmt(remainingSec);
  }

  function updateProgress() {
    const prog = $("#timerProg");
    if (!prog) return;
    const pct = totalSec > 0 ? ((totalSec - remainingSec) / totalSec) * 100 : 0;
    prog.value = Math.max(0, Math.min(100, pct));
  }

  function setMiniStatus() {
    const el = $("#timerMini");
    if (!el) return;

    if (!protocol) {
      el.innerHTML = "";
      return;
    }

    el.innerHTML = `
      <div><strong>Paso actual:</strong> ${idx + 1} / ${steps.length}</div>
      <div><strong>Estado:</strong> ${running ? "Corriendo" : "Pausado"}</div>
      <div><strong>Tiempo paso:</strong> ${fmt(totalSec)} | <strong>Restante:</strong> ${fmt(remainingSec)}</div>
    `;
  }

  function renderAll() {
    setTitle();
    setStepText();
    updateClock();
    updateProgress();
    setMiniStatus();
  }

  // ------ Control de Timer ------
  function loadProtocol(p) {
    protocol = p;
    steps = (p?.steps || []).map(s => ({
      label: String(s.label || "").trim() || "Paso",
      value: Number(s.value || 0),
      unit: s.unit === "seg" ? "seg" : "min",
      type: s.type || "otro"
    }));
    idx = 0;
    running = false;
    stopInterval();

    if (steps.length > 0) {
      const first = steps[0];
      totalSec = toSec(first.value, first.unit);
      remainingSec = totalSec;
    } else {
      totalSec = 0;
      remainingSec = 0;
    }

    // Nuevo protocolo: reiniciar estado + log (opcional)
    clearTimerState();
    renderAll();
  }

  function stopInterval() {
    if (interval) clearInterval(interval);
    interval = null;
  }

  function playPause() {
    if (!protocol || steps.length === 0) return alert("No hay protocolo cargado.");

    if (running) {
      running = false;
      stopInterval();
      $("#btnPlay").textContent = "▶";
      pushLog({ type: "pause", at: new Date().toISOString(), idx, label: steps[idx]?.label });
      saveTimerState();
      renderAll();
      return;
    }

    running = true;
    $("#btnPlay").textContent = "❚❚";
    pushLog({ type: "start", at: new Date().toISOString(), idx, label: steps[idx]?.label });

    stopInterval();
    interval = setInterval(() => {
      remainingSec -= 1;
      if (remainingSec <= 0) {
        remainingSec = 0;
        tickRender();
        nextStep(true);
        return;
      }
      tickRender();
    }, 1000);

    saveTimerState();
    renderAll();
  }

  function tickRender() {
    updateClock();
    updateProgress();
    setMiniStatus();
  }

  function setStep(i) {
    if (!protocol || steps.length === 0) return;
    idx = Math.max(0, Math.min(steps.length - 1, i));

    const step = steps[idx];
    totalSec = toSec(step.value, step.unit);
    remainingSec = totalSec;

    $("#btnPlay").textContent = "▶";
    running = false;
    stopInterval();

    pushLog({ type: "step", at: new Date().toISOString(), idx, label: step.label, durationSec: totalSec });
    saveTimerState();
    renderAll();
  }

  function prevStep() {
    if (!protocol || steps.length === 0) return;
    if (idx === 0) return;
    setStep(idx - 1);
  }

  function nextStep(auto = false) {
    if (!protocol || steps.length === 0) return;

    // detener siempre
    $("#btnPlay").textContent = "▶";
    running = false;
    stopInterval();

    const step = steps[idx];
    pushLog({ type: auto ? "auto-finish" : "manual-finish", at: new Date().toISOString(), idx, label: step.label });

    if (idx < steps.length - 1) {
      setStep(idx + 1);
    } else {
      // terminado
      pushLog({ type: "protocol-finished", at: new Date().toISOString(), protocolId: protocol.id, name: protocol.name });
      clearTimerState();
      alert("Protocolo terminado.");
      renderAll();
      window.dispatchEvent(new CustomEvent("anatoflow:protocolFinished", { detail: { protocol } }));
    }
  }

  function resetTimer() {
    if (!protocol) return;
    if (!confirm("¿Resetear el timer? (no borra inventario ni protocolos)")) return;

    stopInterval();
    running = false;
    idx = 0;

    const step = steps[0];
    totalSec = toSec(step.value, step.unit);
    remainingSec = totalSec;

    clearLog();
    clearTimerState();

    $("#btnPlay").textContent = "▶";
    pushLog({ type: "reset", at: new Date().toISOString(), protocolId: protocol.id });
    renderAll();
  }

  function sendToReport() {
    // Dispara evento para que el módulo de informe lo genere con el log actual
    const log = loadLog();
    window.dispatchEvent(new CustomEvent("anatoflow:buildReport", {
      detail: {
        protocol: protocol ? { id: protocol.id, name: protocol.name, notes: protocol.notes } : null,
        steps,
        timerLog: log
      }
    }));
    if (window.AnatoFlowUI?.setActiveTab) window.AnatoFlowUI.setActiveTab("informe");
  }

  // ------ Modo Lab (pantalla) ------
  let labMode = false;
  function toggleLabMode() {
    labMode = !labMode;
    const card = $("#timer [data-timer-ui='1'] .card");
    if (!card) return;

    if (labMode) {
      card.style.position = "relative";
      card.style.padding = "1.4rem";
      $("#timerClock").style.fontSize = "5.5rem";
      $("#timerBtns").querySelectorAll("button").forEach(b => {
        b.style.width = "96px";
        b.style.height = "96px";
        b.style.fontSize = "2.3rem";
      });
      $("#btnLabMode").textContent = "Modo Normal";
    } else {
      // recargar estilos base por simpleza
      $("#btnLabMode").textContent = "Modo Lab";
      document.location.hash = "timer"; // no recarga la página, solo ayuda si el navegador recalcula
      $("#timerClock").style.fontSize = "4.2rem";
      $("#timerBtns").querySelectorAll("button").forEach(b => {
        b.style.width = "84px";
        b.style.height = "84px";
        b.style.fontSize = "2rem";
      });
    }
  }

  // ------ Integración con Protocolos ------
  function tryLoadSelectedProtocol() {
    const id = localStorage.getItem(KEY_SELECTED);
    const p = window.AnatoFlowProtocols?.findProtocolById?.(id);
    if (p) loadProtocol(p);
  }

  function restoreTimerIfPossible() {
    const st = loadTimerState();
    if (!st || !st.protocolId) return;

    const p = window.AnatoFlowProtocols?.findProtocolById?.(st.protocolId);
    if (!p) return;

    loadProtocol(p);
    idx = Math.max(0, Math.min((p.steps?.length || 1) - 1, st.idx || 0));

    const step = steps[idx];
    totalSec = toSec(step.value, step.unit);
    remainingSec = Math.max(0, Math.min(totalSec, st.remainingSec ?? totalSec));

    running = false;
    $("#btnPlay").textContent = "▶";
    stopInterval();

    renderAll();
  }

  function bindTimer() {
    $("#btnPlay")?.addEventListener("click", playPause);
    $("#btnPrev")?.addEventListener("click", prevStep);
    $("#btnNext")?.addEventListener("click", () => nextStep(false));
    $("#btnResetTimer")?.addEventListener("click", resetTimer);
    $("#btnSendReport")?.addEventListener("click", sendToReport);
    $("#btnLabMode")?.addEventListener("click", toggleLabMode);
  }

  function init() {
    ensureTimerUI();
    bindTimer();

    // Escuchar selección de protocolo
    window.addEventListener("anatoflow:protocolSelected", (e) => {
      const p = e?.detail?.protocol;
      if (p) loadProtocol(p);
    });

    // Resumen si el usuario vuelve al tab
    window.addEventListener("anatoflow:tabchange", (e) => {
      if (e?.detail?.tabId === "timer") {
        ensureTimerUI();
        renderAll();
      }
    });

    // Primero intentar reanudar, si no cargar seleccionado
    restoreTimerIfPossible();
    if (!protocol) tryLoadSelectedProtocol();

    renderAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // API mínima pública
  window.AnatoFlowTimer = {
    getProtocol: () => protocol,
    getSteps: () => steps,
    getIndex: () => idx,
    getLog: () => {
      try { return JSON.parse(localStorage.getItem(KEY_TIMER_LOG) || "[]"); } catch { return []; }
    }
  };
})();
