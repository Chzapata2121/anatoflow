/* AnatoFlow v22 PRO - Informe profesional (modal in-page)
   - Recibe eventos: anatoflow:buildReport (timer/protocol/ai)
   - Compone informe HTML y lo muestra EN MODAL (no abre ventanas)
   - Permite descargar como HTML (y opción imprimir a PDF)
*/
(function () {
  "use strict";

  const KEY_REPORT = "anatoflow_last_report_v22";
  const KEY_TIMER_LOG = "anatoflow_timer_log_v22";

  const $ = (sel, root = document) => root.querySelector(sel);

  function ensureReportUI() {
    const root = document.getElementById("informe");
    if (!root) return;
    if (root.querySelector("[data-report-ui='1']")) return;

    const wrap = document.createElement("div");
    wrap.setAttribute("data-report-ui", "1");

    wrap.innerHTML = `
      <div class="card" style="margin-bottom:1rem;">
        <div style="font-weight:900; font-size:1.05rem;">Informe</div>
        <div style="opacity:0.85; font-size:0.9rem; margin-top:0.2rem;">
          Consolidación para auditoría: protocolo, ejecución (timer), inventario (si aplica) y análisis IA.
        </div>
        <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-top:0.9rem;">
          <button id="repOpen" style="flex:1; min-width:160px; padding:0.9rem; border-radius:12px; border:none; background:var(--primary); color:white; font-weight:900;">
            Ver informe (modal)
          </button>
          <button id="repDownload" style="flex:1; min-width:160px; padding:0.9rem; border-radius:12px; border:none; background:#10b981; color:white; font-weight:900;">
            Descargar HTML
          </button>
          <button id="repPrint" style="flex:1; min-width:160px; padding:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.55); background:transparent; color:inherit; font-weight:900;">
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div class="card" id="repPreviewCard">
        <div style="font-weight:900;">Último informe</div>
        <div id="repPreview" style="margin-top:0.7rem; opacity:0.9;"></div>
      </div>

      <!-- Modal -->
      <div id="repModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:2000;">
        <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:min(980px, 92vw); height:min(80vh, 720px); background:var(--card); color:var(--text); border-radius:16px; box-shadow:0 16px 50px rgba(0,0,0,0.25); overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.9rem 1rem; border-bottom:1px solid rgba(148,163,184,0.25);">
            <div style="font-weight:900;">Informe AnatoFlow</div>
            <button id="repClose" style="border:none; background:transparent; color:inherit; font-size:1.3rem;">✕</button>
          </div>
          <div id="repModalBody" style="padding:1rem; overflow:auto; height:calc(100% - 58px);"></div>
        </div>
      </div>
    `;

    root.appendChild(wrap);
  }

  function loadTimerLog() {
    try { return JSON.parse(localStorage.getItem(KEY_TIMER_LOG) || "[]"); } catch { return []; }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
    }[c]));
  }

  function buildHTMLReport(data) {
    const now = new Date();
    const dateStr = now.toLocaleString();

    const protocol = data?.protocol || null;
    const steps = data?.steps || [];
    const timerLog = data?.timerLog || loadTimerLog();
    const ai = data?.ai || null;

    const stepsHtml = steps.length
      ? `<ol>${steps.map(s => `<li><strong>${esc(s.label)}</strong> — ${Number(s.value)} ${esc(s.unit)}</li>`).join("")}</ol>`
      : `<div>—</div>`;

    const logHtml = timerLog.length
      ? `<ul>${timerLog.map(e => `<li><code>${esc(e.type)}</code> — ${esc(e.at || "")} — paso: ${Number(e.idx ?? -1) + 1} ${esc(e.label || "")}</li>`).join("")}</ul>`
      : `<div>—</div>`;

    const aiHtml = ai
      ? `
        <div style="padding:0.8rem; border-radius:14px; border:1px solid rgba(148,163,184,0.25);">
          <div><strong>Semáforo:</strong> <span style="font-weight:900; color:${esc(ai.color || "#10b981")}">${esc(ai.status || "")}</span></div>
          <div><strong>Tejido probable:</strong> ${esc(ai.probableTissue || "")}</div>
          <div style="margin-top:0.6rem;"><strong>Células/estructuras:</strong>
            <ul>${(ai.observedCells || []).map(c => `<li>${esc(c)}</li>`).join("")}</ul>
          </div>
          <div style="margin-top:0.6rem;"><strong>Hallazgos técnicos:</strong>
            <ul>${(ai.technicalMotives || []).map(m => `<li>${esc(m)}</li>`).join("")}</ul>
          </div>
          <div style="margin-top:0.6rem;"><strong>Recomendaciones:</strong>
            <ul>${(ai.recommendations || []).map(r => `<li>${esc(r)}</li>`).join("")}</ul>
          </div>
          <div style="margin-top:0.6rem; opacity:0.85; font-size:0.9rem;">${esc(ai.note || "")}</div>
        </div>
      `
      : `<div>—</div>`;

    return `
      <div style="font-family:Arial, sans-serif; line-height:1.5;">
        <h1 style="margin:0 0 0.3rem 0;">AnatoFlow v22 PRO — Informe</h1>
        <div style="opacity:0.85; margin-bottom:1rem;">Generado: <strong>${esc(dateStr)}</strong></div>

        <hr>

        <h2>1) Protocolo</h2>
        <div><strong>Nombre:</strong> ${esc(protocol?.name || "—")}</div>
        <div><strong>Notas:</strong> ${esc(protocol?.notes || "—")}</div>

        <h3>1.1) Pasos</h3>
        ${stepsHtml}

        <h2>2) Ejecución (Timer)</h2>
        ${logHtml}

        <h2>3) Análisis de imagen (IA)</h2>
        ${aiHtml}

        <hr>
        <div style="opacity:0.85;">
          Nota: Este documento consolida eventos y observaciones para trazabilidad y auditoría. No sustituye el juicio diagnóstico del patólogo.
        </div>
      </div>
    `;
  }

  function saveReport(html, data) {
    const pack = { at: new Date().toISOString(), html, data };
    localStorage.setItem(KEY_REPORT, JSON.stringify(pack));
    renderPreview();
  }

  function loadReport() {
    try { return JSON.parse(localStorage.getItem(KEY_REPORT) || "null"); } catch { return null; }
  }

  function renderPreview() {
    const p = loadReport();
    const el = $("#repPreview");
    if (!el) return;

    if (!p) {
      el.innerHTML = `<div style="opacity:0.8;">Aún no se ha generado ningún informe.</div>`;
      return;
    }
    el.innerHTML = `
      <div><strong>Última generación:</strong> ${esc(p.at)}</div>
      <div style="margin-top:0.6rem;">
        <button id="repQuickOpen" style="padding:0.7rem 0.9rem; border-radius:12px; border:none; background:rgba(59,130,246,0.14); color:inherit; font-weight:900;">
          Abrir último informe
        </button>
      </div>
    `;

    $("#repQuickOpen")?.addEventListener("click", () => openModal(p.html));
  }

  function openModal(html) {
    $("#repModalBody").innerHTML = html;
    $("#repModal").style.display = "block";
  }

  function closeModal() {
    $("#repModal").style.display = "none";
  }

  function downloadHTML() {
    const p = loadReport();
    if (!p?.html) return alert("No hay informe generado aún.");

    const blob = new Blob([p.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `AnatoFlow_Informe_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function printPDF() {
    const p = loadReport();
    if (!p?.html) return alert("No hay informe generado aún.");

    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Informe AnatoFlow</title></head><body style="margin:2cm;">${p.html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  function bindReportUI() {
    $("#repOpen")?.addEventListener("click", () => {
      const p = loadReport();
      if (!p?.html) return alert("No hay informe generado aún.");
      openModal(p.html);
    });

    $("#repClose")?.addEventListener("click", closeModal);
    $("#repModal")?.addEventListener("click", (e) => {
      if (e.target.id === "repModal") closeModal();
    });

    $("#repDownload")?.addEventListener("click", downloadHTML);
    $("#repPrint")?.addEventListener("click", printPDF);
  }

  function init() {
    ensureReportUI();
    bindReportUI();
    renderPreview();

    // Receptor principal: módulos envían data parcial
    window.addEventListener("anatoflow:buildReport", (e) => {
      const current = loadReport();
      const priorData = current?.data || {};

      const nextData = { ...priorData, ...(e?.detail || {}) };

      // si no viene timerLog explícito, lo inyectamos al guardar
      if (!nextData.timerLog) nextData.timerLog = loadTimerLog();

      const html = buildHTMLReport(nextData);
      saveReport(html, nextData);
      alert("Informe actualizado.");
    });

    window.addEventListener("anatoflow:tabchange", (e) => {
      if (e?.detail?.tabId === "informe") renderPreview();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.AnatoFlowReport = {
    buildHTMLReport
  };
})();
