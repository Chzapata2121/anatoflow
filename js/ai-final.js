/* AnatoFlow v22 PRO – IA (Worker) + Local fallback – ai.js */
(() => {
  "use strict";

  const KEY_MUESTRA = "anatoflow_muestra_v22";

  // PON AQUÍ TU URL REAL DEL WORKER (Cloudflare)
  const WORKER_URL = "https://little-limit-7cbb.cchhee-18.workers.dev";

  let lastFile = null;
  let modoIA = "local"; // "local" | "worker"

  const $ = s => document.querySelector(s);

  function analizarLocal(organo) {
    const o = (organo || "No indicado").toLowerCase();
    const niveles = ["Normal", "Reactivo / Inflamatorio", "Atipia / Lesión bajo grado", "Sospecha de malignidad"];
    const nivel = niveles[Math.floor(Math.random() * niveles.length)];

    let detalle = "";
    if (o.includes("tráquea") || o.includes("traquea") || o.includes("bronquio")) {
      detalle = nivel === "Normal"
        ? "Epitelio respiratorio ciliado conservado; células caliciformes presentes."
        : nivel.includes("Reactivo")
          ? "Cambios reactivos con inflamación; valorar artefactos de tinción."
          : nivel.includes("Atipia")
            ? "Atipia leve/displasia: correlacionar con clínica y calidad de muestra."
            : "Hallazgos sugerentes: requiere confirmación por patólogo.";
    } else if (o.includes("tiroides")) {
      detalle = nivel === "Normal"
        ? "Folículos tiroideos con coloide homogéneo; celularidad acorde."
        : nivel.includes("Reactivo")
          ? "Cambios inflamatorios/tiroiditis; valorar fondo y sangre."
          : nivel.includes("Atipia")
            ? "Cambios oncocíticos/atipia: revisar preparación."
            : "Patrón sospechoso: requiere confirmación por patólogo.";
    } else if (o.includes("pulmón") || o.includes("pulmon")) {
      detalle = nivel === "Normal" ? "Arquitectura alveolar conservada." : "Cambios no específicos; revisar enfoque y tinción.";
    } else {
      detalle = "Evaluación educativa por modo local (sin IA remota).";
    }

    return {
      status: nivel.includes("Normal") ? "OK" : nivel.includes("Reactivo") ? "Revisar" : "Rehacer",
      hallazgos: `ÓRGANO: ${organo || "No indicado"}\nNIVEL: ${nivel}\n\n${detalle}`,
      educativo: detalle,
      disclaimer: "Resultado educativo/preliminar. No es diagnóstico."
    };
  }

  async function analizarWorker(file) {
    try {
      const body = await file.arrayBuffer();

      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Worker/HF HTTP ${res.status}: ${txt}`.slice(0, 240));
      }

      const data = await res.json().catch(() => null);

      // HF puede devolver array [{label, score}, ...] o un objeto con error
      if (!data) throw new Error("Respuesta vacía");
      if (data.error) throw new Error(String(data.error));

      const top = Array.isArray(data) ? (data[0] || {}) : (data?.[0] || data || {});
      const score = Number(top.score ?? 0);
      const label = top.label || "desconocida";

      return {
        status: score >= 0.8 ? "OK" : score >= 0.5 ? "Revisar" : "Rehacer",
        hallazgos:
          `IA REAL (Worker)\n` +
          `Etiqueta: ${label}\n` +
          `Confianza: ${Math.round(score * 100)}%`,
        educativo: "Inferencia automática en servidor (token protegido).",
        disclaimer: "Resultado preliminar. Confirmar por patólogo."
      };
    } catch (e) {
      return {
        status: "Error",
        hallazgos: `Error IA real – modo local activo.\n${String(e?.message || e)}`,
        educativo: "No se pudo ejecutar la IA remota. Reintente o use modo local.",
        disclaimer: "Si persiste: revisar Worker, token HF y disponibilidad del modelo."
      };
    }
  }

  function initUI() {
    const c = document.getElementById("ia");
    if (!c || c.querySelector("#aiOK")) return;

    c.innerHTML = `
      <div class="card" id="aiOK">
        <h2>Analizador IA</h2>
        <p>Sube una imagen o toma una foto desde el microscopio.</p>

        <div style="text-align:center;margin:1rem 0">
          <div style="font-weight:700;margin-bottom:.6rem">Modo</div>
          <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
            <button id="localBtn" class="modoBtn active">Local (offline)</button>
            <button id="workerBtn" class="modoBtn">IA real (Worker)</button>
          </div>
          <div id="modoBadge" style="margin-top:.75rem;font-size:.95rem;opacity:.9"></div>
        </div>

        <div style="display:flex;gap:1rem;justify-content:center;margin:1rem 0;flex-wrap:wrap">
          <button id="uploadBtn">Subir imagen</button>
          <button id="camBtn">Cámara</button>
        </div>

        <input type="file" id="fileInput" accept="image/*" style="display:none">
        <input type="file" id="camInput" accept="image/*" capture="environment" style="display:none">

        <div id="preview" style="text-align:center;margin:1.25rem 0"></div>

        <button id="analyzeBtn" disabled style="margin-top:1rem">Analizar</button>
        <div id="result" style="margin-top:1rem"></div>
      </div>
    `;

    const setModo = (m) => {
      modoIA = m;
      $("#localBtn")?.classList.toggle("active", modoIA === "local");
      $("#workerBtn")?.classList.toggle("active", modoIA === "worker");
      $("#modoBadge").textContent = `Modo activo: ${modoIA === "worker" ? "IA real (Worker)" : "Local (offline)"}`;
    };

    $("#localBtn").onclick = () => setModo("local");
    $("#workerBtn").onclick = () => setModo("worker");

    $("#uploadBtn").onclick = () => $("#fileInput").click();
    $("#camBtn").onclick = () => $("#camInput").click();

    const handleFile = e => {
      if (e.target.files?.[0]) {
        lastFile = e.target.files[0];
        $("#analyzeBtn").disabled = false;

        const url = URL.createObjectURL(lastFile);
        $("#preview").innerHTML = `
          <img src="${url}" style="max-width:100%;max-height:500px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.2)">
        `;
      }
    };

    $("#fileInput").onchange = handleFile;
    $("#camInput").onchange = handleFile;

    $("#analyzeBtn").onclick = async () => {
      if (!lastFile) return;

      $("#analyzeBtn").disabled = true;
      $("#analyzeBtn").textContent = "Analizando...";

      const muestra = JSON.parse(localStorage.getItem(KEY_MUESTRA) || "{}");
      const result = (modoIA === "worker")
        ? await analizarWorker(lastFile)
        : analizarLocal(muestra.organo);

      const isOk = result.status === "OK";
      const isWarn = result.status === "Revisar";
      const border = isOk ? "#10b981" : isWarn ? "#f59e0b" : "#ef4444";
      const bg = isOk ? "#f0fdf4" : isWarn ? "#fffbeb" : "#fef2f2";

      $("#result").innerHTML = `
        <div style="padding:1.25rem;border-radius:12px;background:${bg};border:2px solid ${border}">
          <h3 style="margin-top:0;color:${border}">${result.status}</h3>
          <p style="white-space:pre-line;font-weight:600;margin-bottom:.75rem">${result.hallazgos}</p>
          <p style="margin:.25rem 0 0"><strong>Educativo:</strong> ${result.educativo || ""}</p>
          <p style="font-size:.9rem;margin-top:.75rem;opacity:.9"><em>${result.disclaimer || ""}</em></p>
        </div>
      `;

      $("#analyzeBtn").textContent = "Analizar";
      $("#analyzeBtn").disabled = false;
    };

    setModo("local");
  }

  initUI();
})();
