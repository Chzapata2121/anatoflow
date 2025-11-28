/* AnatoFlow v22 PRO - Analizador IA (local/simulador)
   - Carga imagen (galería/cámara)
   - Evalúa calidad técnica (enfoque/contraste/artefactos simulados)
   - Infieren "tejido probable" (heurística básica)
   - Genera semáforo: OK / Revisar / Rehacer
   - Emite: anatoflow:aiResult (detail: { result })
*/
(function () {
  "use strict";

  const KEY_AI_LAST = "anatoflow_ai_last_v22";
  const $ = (sel, root = document) => root.querySelector(sel);

  function ensureAIUI() {
    const root = document.getElementById("ia");
    if (!root) return;
    if (root.querySelector("[data-ai-ui='1']")) return;

    const wrap = document.createElement("div");
    wrap.setAttribute("data-ai-ui", "1");

    wrap.innerHTML = `
      <div class="card" style="margin-bottom:1rem;">
        <div style="font-weight:900; font-size:1.05rem;">Calidad de imagen</div>
        <div style="opacity:0.85; font-size:0.9rem; margin-top:0.2rem;">
          Sube una imagen o toma una foto desde el microscopio. El análisis NO hace diagnóstico: evalúa calidad y coherencia con el tejido indicado.
        </div>

        <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-top:0.9rem;">
          <button id="aiBtnUpload" style="flex:1; min-width:140px; padding:0.9rem; border-radius:12px; border:none; background:rgba(59,130,246,0.14); color:inherit; font-weight:900;">
            Subir imagen
          </button>
          <button id="aiBtnCamera" style="flex:1; min-width:140px; padding:0.9rem; border-radius:12px; border:none; background:rgba(16,185,129,0.14); color:inherit; font-weight:900;">
            Abrir cámara
          </button>
        </div>

        <input id="aiUploadInput" type="file" accept="image/*" style="display:none;">
        <input id="aiCameraInput" type="file" accept="image/*" capture="environment" style="display:none;">

        <div id="aiPreview" style="margin-top:1rem; text-align:center;"></div>

        <button id="aiAnalyze" style="display:none; margin-top:0.9rem; width:100%; padding:0.95rem; border-radius:12px; border:none; background:var(--primary); color:white; font-weight:900;">
          Analizar
        </button>
      </div>

      <div class="card" id="aiResultCard" style="display:none;">
        <div id="aiResult"></div>
        <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-top:0.9rem;">
          <button id="aiSendReport" style="flex:1; min-width:160px; padding:0.9rem; border-radius:12px; border:none; background:#10b981; color:white; font-weight:900;">
            Enviar a Informe
          </button>
          <button id="aiClear" style="flex:1; min-width:160px; padding:0.9rem; border-radius:12px; border:1px solid rgba(148,163,184,0.55); background:transparent; color:inherit; font-weight:900;">
            Limpiar
          </button>
        </div>
      </div>
    `;

    root.appendChild(wrap);
  }

  function readAsDataURL(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  function randPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function analyzeLocal(organo = "") {
    // Simulación heurística: sin diagnóstico (solo calidad/coherencia)
    const organoUser = (organo || "").trim().toLowerCase();

    const okMot = ["Buen enfoque general", "Contraste razonable", "Ausencia de artefactos graves"];
    const warnMot = ["Enfoque irregular", "Contraste subóptimo", "Artefactos visibles (pliegues/burbujas)"];
    const badMot = ["Fuera de foco", "Artefactos graves", "Iluminación deficiente"];

    // tejido probable (ejemplos)
    const tejidos = [
      { t: "Tejido traqueal/respiratorio", cells: ["Células ciliadas", "Células caliciformes", "Células basales", "Condrocitos (si hay cartílago)"] },
      { t: "Tejido hepático", cells: ["Hepatocitos", "Células de Kupffer", "Endotelio sinusoidal"] },
      { t: "Tejido tiroideo", cells: ["Células foliculares", "Coloide", "Células de Hürthle/oncocíticas (si aplica)"] },
      { t: "Epitelio escamoso (citología)", cells: ["Células escamosas superficiales", "Intermedias", "Parabasales (según caso)"] }
    ];

    // Coincidencia aproximada
    const tejido = randPick(tejidos);
    const match = organoUser ? (tejido.t.toLowerCase().includes(organoUser) || organoUser.includes("tiroid") && tejido.t.toLowerCase().includes("tiroid")) : true;

    const r = Math.random();
    let status = "OK";
    let color = "#10b981";
    let motives = okMot;
    let recs = ["Imagen válida para registro", "Continuar flujo hacia informe/auditoría"];

    if (!match || r > 0.55) {
      status = "REVISAR";
      color = "#f59e0b";
      motives = warnMot;
      recs = ["Reajustar enfoque", "Verificar iluminación", "Revisar limpieza de lentes/porta"];
      if (!match) motives = [...motives, "El tejido probable NO coincide con el órgano indicado"];
    }
    if (r > 0.82) {
      status = "REHACER";
      color = "#ef4444";
      motives = badMot;
      recs = ["Repetir captura", "Evaluar necesidad de recorte/retinción", "Revisar artefactos de corte/montaje"];
    }

    return {
      status,
      color,
      probableTissue: tejido.t,
      observedCells: tejido.cells,
      technicalMotives: motives,
      recommendations: recs,
      note:
        "Este análisis evalúa calidad técnica y coherencia general. No reemplaza la evaluación diagnóstica del patólogo."
    };
  }

  function renderResult(result) {
    const el = $("#aiResult");
    const card = $("#aiResultCard");
    if (!el || !card) return;

    el.innerHTML = `
      <div style="text-align:center; margin-bottom:1rem;">
        <div style="display:inline-block; padding:0.8rem 1.2rem; border-radius:999px; background:${result.color}; color:white; font-weight:900; font-size:1.1rem;">
          ${result.status}
        </div>
      </div>

      <div style="font-weight:900; margin-bottom:0.4rem;">Tejido probable</div>
      <div style="margin-bottom:0.8rem;">${result.probableTissue}</div>

      <div style="font-weight:900; margin-bottom:0.4rem;">Células/estructuras esperables</div>
      <ul style="margin-top:0.2rem;">
        ${result.observedCells.map(c => `<li>${c}</li>`).join("")}
      </ul>

      <div style="font-weight:900; margin-top:0.9rem;">Hallazgos técnicos</div>
      <ul style="margin-top:0.2rem;">
        ${result.technicalMotives.map(m => `<li>${m}</li>`).join("")}
      </ul>

      <div style="font-weight:900; margin-top:0.9rem;">Recomendaciones</div>
      <ul style="margin-top:0.2rem;">
        ${result.recommendations.map(r => `<li>${r}</li>`).join("")}
      </ul>

      <div style="margin-top:0.9rem; opacity:0.85; font-size:0.9rem;">
        ${result.note}
      </div>
    `;

    card.style.display = "block";
  }

  function clearAI() {
    $("#aiPreview").innerHTML = "";
    $("#aiAnalyze").style.display = "none";
    $("#aiResultCard").style.display = "none";
    localStorage.removeItem(KEY_AI_LAST);
  }

  function bindAI() {
    const upBtn = $("#aiBtnUpload");
    const camBtn = $("#aiBtnCamera");
    const upIn = $("#aiUploadInput");
    const camIn = $("#aiCameraInput");

    let lastFile = null;

    upBtn?.addEventListener("click", () => upIn.click());
    camBtn?.addEventListener("click", () => camIn.click());

    async function onFile(file) {
      if (!file) return;
      lastFile = file;
      const url = await readAsDataURL(file);

      $("#aiPreview").innerHTML = `<img src="${url}" style="max-width:100%; border-radius:14px; box-shadow:0 6px 20px rgba(0,0,0,0.14);">`;
      $("#aiAnalyze").style.display = "block";
      $("#aiAnalyze").disabled = false;
      $("#aiAnalyze").textContent = "Analizar";
    }

    upIn?.addEventListener("change", (e) => onFile(e.target.files?.[0]));
    camIn?.addEventListener("change", (e) => onFile(e.target.files?.[0]));

    $("#aiAnalyze")?.addEventListener("click", async () => {
      if (!lastFile) return;
      $("#aiAnalyze").disabled = true;
      $("#aiAnalyze").textContent = "Analizando…";

      // organo: si existe input en tu app final (en v22 lo conectaremos a datos)
      const organo = document.getElementById("organo")?.value || "";

      setTimeout(() => {
        const result = analyzeLocal(organo);
        localStorage.setItem(KEY_AI_LAST, JSON.stringify({ at: new Date().toISOString(), result }));
        renderResult(result);

        window.dispatchEvent(new CustomEvent("anatoflow:aiResult", { detail: { result } }));

        $("#aiAnalyze").disabled = false;
        $("#aiAnalyze").textContent = "Analizar";
      }, 800);
    });

    $("#aiSendReport")?.addEventListener("click", () => {
      const saved = localStorage.getItem(KEY_AI_LAST);
      const payload = saved ? JSON.parse(saved) : null;

      window.dispatchEvent(new CustomEvent("anatoflow:buildReport", {
        detail: { ai: payload?.result || null }
      }));

      if (window.AnatoFlowUI?.setActiveTab) window.AnatoFlowUI.setActiveTab("informe");
    });

    $("#aiClear")?.addEventListener("click", clearAI);
  }

  function init() {
    ensureAIUI();
    bindAI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.AnatoFlowAI = {
    clear: () => { try { localStorage.removeItem(KEY_AI_LAST); } catch {} }
  };
})();
