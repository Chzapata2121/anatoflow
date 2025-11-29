/* AnatoFlow v22 PRO – IA (Worker + Local) */
(() => {
  "use strict";

  const KEY_MUESTRA = "anatoflow_muestra_v22";
  const KEY_IA_MODE = "anatoflow_ia_mode_v22";

  // TU URL REAL DEL WORKER (sin slash final)
  const WORKER_URL = "https://little-limit-7cbb.cchhee-18.workers.dev";

  let lastFile = null;
  let modoIA = localStorage.getItem(KEY_IA_MODE) || "local";

  const $ = s => document.querySelector(s);

  function analizarLocal(organo) {
    const o = (organo || "No indicado").toLowerCase();
    const niveles = ["Normal", "Reactivo / Inflamatorio", "Atipia / Lesión bajo grado", "Sospecha de malignidad"];
    const nivel = niveles[Math.floor(Math.random() * niveles.length)];

    let detalle = "";
    if (o.includes("tráquea") || o.includes("traquea") || o.includes("bronquio")) {
      detalle =
        nivel === "Normal" ? "Epitelio ciliado conservado. Células caliciformes presentes."
        : nivel.includes("Reactivo") ? "Cambios reactivos / inflamatorios compatibles con irritación."
        : nivel.includes("Atipia") ? "Cambios displásicos leves: correlacionar con clínica y técnica."
        : "Hallazgos sugestivos: requiere confirmación por patología.";
    } else if (o.includes("tiroides")) {
      detalle =
        nivel === "Normal" ? "Folículos tiroideos con coloide relativamente homogéneo."
        : nivel.includes("Reactivo") ? "Patrón compatible con tiroiditis / reacción inflamatoria."
        : nivel.includes("Atipia") ? "Atipias nucleares inespecíficas: revisar fijación/tinción."
        : "Hallazgos sugestivos: requiere confirmación por patología.";
    } else {
      detalle = "Evaluación educativa: revisar técnica, enfoque y artefactos.";
    }

    return {
      status: nivel.includes("Normal") ? "OK" : nivel.includes("Reactivo") ? "Revisar" : "Rehacer",
      hallazgos: `MODO LOCAL (educativo)\nÓRGANO: ${organo || "No indicado"}\nNIVEL: ${nivel}\n\n${detalle}`,
      educativo: detalle,
      disclaimer: "Salida educativa preliminar. No sustituye diagnóstico anatomopatológico."
    };
  }

  async function analizarWorker(file) {
    const body = await file.arrayBuffer();
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body
    });

    const rawText = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`Worker/HF HTTP ${res.status}: ${rawText}`.slice(0, 350));
    }

    // HF suele devolver array[{label,score},...]
    let data;
    try { data = JSON.parse(rawText); } catch { data = rawText; }

    const top = Array.isArray(data) ? (data[0] || {}) : (data?.[0] || data || {});
    const score = typeof top?.score === "number" ? top.score : 0;

    return {
      status: score >= 0.85 ? "OK" : score >= 0.60 ? "Revisar" : "Rehacer",
      hallazgos: `IA REAL (Worker)\nConfianza: ${Math.round(score * 100)}%\nEtiqueta: ${top.label || "desconocida"}`,
      educativo: "Resultado generado por un modelo remoto. Interpretación educativa.",
      disclaimer: "No sustituye diagnóstico. Confirmar con patólogo y correlación clínica/técnica."
    };
  }

  function setModo(nuevo) {
    modoIA = nuevo;
    localStorage.setItem(KEY_IA_MODE, modoIA);
    renderModo();
  }

  function renderModo() {
    const badge = $("#modeBadge");
    const bLocal = $("#localBtn");
    const bReal = $("#iaRealBtn");
    if (!badge || !bLocal || !bReal) return;

    bLocal.classList.toggle("active", modoIA === "local");
    bReal.classList.toggle("active", modoIA === "worker");

    badge.textContent = (modoIA === "worker") ? "Modo actual: IA real (Worker)" : "Modo actual: Local (offline)";
  }

  function initUI() {
    const c = document.getElementById("ia");
    if (!c || c.querySelector("#aiOK")) return;

    c.innerHTML = `
      <div class="card" id="aiOK">
        <h2>Analizador IA</h2>
        <p>Sube una imagen o toma una foto desde el microscopio. El modo IA real usa un proxy (Worker) para evitar CORS.</p>

        <div style="text-align:center;margin:1rem 0">
          <div id="modeBadge" style="font-weight:700;margin-bottom:.75rem"></div>
          <button id="localBtn" class="modoBtn">Local (offline)</button>
          <button id="iaRealBtn" class="modoBtn">IA real (Worker)</button>
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

    $("#localBtn").onclick = () => setModo("local");
    $("#iaRealBtn").onclick = () => setModo("worker");

    $("#uploadBtn").onclick = () => $("#fileInput").click();
    $("#camBtn").onclick = () => $("#camInput").click();

    const handleFile = e => {
      if (e.target.files?.[0]) {
        lastFile = e.target.files[0];
        $("#analyzeBtn").disabled = false;
        const url = URL.createObjectURL(lastFile);
        $("#preview").innerHTML = `<img src="${url}" style="max-width:100%;max-height:500px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.2)">`;
      }
    };
    $("#fileInput").onchange = handleFile;
    $("#camInput").onchange = handleFile;

    $("#analyzeBtn").onclick = async () => {
      if (!lastFile) return;

      $("#analyzeBtn").disabled = true;
      $("#analyzeBtn").textContent = "Analizando...";

      const muestra = JSON.parse(localStorage.getItem(KEY_MUESTRA) || "{}");

      let result;
      let extraAviso = "";

      if (modoIA === "worker") {
        try {
          result = await analizarWorker(lastFile);
        } catch (e) {
          extraAviso = String(e?.message || e);
          // fallback local, pero avisando el error real
          result = analizarLocal(muestra.organo);
          result.status = "Error";
          result.hallazgos = `Error IA real – modo local activo.\n${extraAviso}\n\n---\n${result.hallazgos}`;
        }
      } else {
        result = analizarLocal(muestra.organo);
      }

      $("#result").innerHTML = `
        <div style="padding:1.25rem;border-radius:12px;background:#f0fdf4;border:2px solid #10b981">
          <h3 style="color:#10b981;margin-top:0">${result.status}</h3>
          <p style="white-space:pre-line;font-weight:600;margin-bottom:.75rem">${result.hallazgos}</p>
          <p style="margin:.75rem 0 0;color:#059669"><strong>Educativo:</strong> ${result.educativo || "-"}</p>
          <p style="font-size:.9rem;color:#dc2626;margin-top:.75rem"><em>${result.disclaimer || ""}</em></p>
        </div>
      `;

      $("#analyzeBtn").textContent = "Analizar";
      $("#analyzeBtn").disabled = false;
    };

    renderModo();
  }

  initUI();
})();
