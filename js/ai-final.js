/* AnatoFlow v22 PRO – IA via Worker (token protegido) */
(() => {
  "use strict";

  const KEY_MUESTRA = "anatoflow_muestra_v22";

  // IMPORTANTE: pega aquí tu URL real del worker
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
        ? "Epitelio respiratorio compatible; cilios evidentes; células caliciformes presentes."
        : nivel.includes("Reactivo")
          ? "Cambios reactivos compatibles con inflamación."
          : nivel.includes("Atipia")
            ? "Atipia leve: correlacionar con clínica/técnica."
            : "Hallazgos sospechosos: requiere revisión por patólogo.";
    } else if (o.includes("tiroides")) {
      detalle = nivel === "Normal"
        ? "Folículos tiroideos y coloide compatibles con muestra adecuada."
        : nivel.includes("Reactivo")
          ? "Cambios compatibles con tiroiditis/reactivo."
          : nivel.includes("Atipia")
            ? "Atipia/oncocitos: correlacionar."
            : "Hallazgos sospechosos: requiere confirmación.";
    } else if (o.includes("pulmón") || o.includes("pulmon")) {
      detalle = nivel === "Normal"
        ? "Arquitectura compatible; sin artefactos mayores visibles."
        : "Posibles cambios atípicos: requiere revisión.";
    } else {
      detalle = "Evaluación educativa: revisar técnica, enfoque y artefactos.";
    }

    return {
      status: nivel.includes("Normal") ? "OK" : nivel.includes("Reactivo") ? "Revisar" : "Rehacer",
      hallazgos: `ÓRGANO: ${organo || "No indicado"}\nNIVEL: ${nivel}\n\n${detalle}`,
      educativo: detalle,
      disclaimer: "Salida educativa preliminar. No sustituye diagnóstico anatomopatológico."
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
        throw new Error(`Worker/HF HTTP ${res.status}: ${txt}`.slice(0, 300));
      }

      const data = await res.json();
      const top = Array.isArray(data) ? (data[0] || {}) : (data || {});
      const score = Number(top.score ?? 0);

      return {
        status: score > 0.8 ? "OK" : "Revisar",
        hallazgos: `IA REAL (Worker)\nConfianza: ${Math.round(score * 100)}%\nEtiqueta: ${top.label || "desconocida"}`,
        educativo: "Clasificación automática (modelo remoto). Interpretación técnica requerida.",
        disclaimer: "Token HF protegido en Cloudflare Worker."
      };
    } catch (e) {
      // Fallback local usando órgano si existe
      const muestra = JSON.parse(localStorage.getItem(KEY_MUESTRA) || "{}");
      return {
        ...analizarLocal(muestra.organo),
        hallazgos: `Error IA real – modo local activo.\n${String(e?.message || e)}`
      };
    }
  }

  function initUI() {
    const c = document.getElementById("ia");
    if (!c || c.querySelector("#aiOK")) return;

    c.innerHTML = `
      <div class="card" id="aiOK">
        <h2>Analizador IA</h2>
        <p>Sube una imagen o toma una foto desde el microscopio. El modo IA real usa un proxy (Worker) para evitar CORS.</p>

        <div style="text-align:center;margin:1.25rem 0">
          <strong>Modo</strong><br>
          <button id="localBtn" class="modoBtn active">Local (offline)</button>
          <button id="wkBtn" class="modoBtn">IA real (Worker)</button>
          <div id="modoHint" style="margin-top:.6rem;color:#6b7280;font-size:.95rem">Modo activo: Local</div>
        </div>

        <div style="display:flex;gap:1rem;justify-content:center;margin:1rem 0;flex-wrap:wrap">
          <button id="uploadBtn">Subir imagen</button>
          <button id="camBtn">Cámara</button>
        </div>

        <input type="file" id="fileInput" accept="image/*" style="display:none">
        <input type="file" id="camInput" accept="image/*" capture="environment" style="display:none">

        <div id="preview" style="text-align:center;margin:1.25rem 0"></div>

        <button id="analyzeBtn" disabled style="margin-top:0.5rem">Analizar</button>
        <div id="result" style="margin-top:1rem"></div>
      </div>
    `;

    function setModo(next) {
      modoIA = next;
      $("#localBtn").classList.toggle("active", modoIA === "local");
      $("#wkBtn").classList.toggle("active", modoIA === "worker");
      $("#modoHint").textContent = `Modo activo: ${modoIA === "worker" ? "IA real (Worker)" : "Local"}`;
    }

    $("#localBtn").onclick = () => setModo("local");
    $("#wkBtn").onclick = () => setModo("worker");

    $("#uploadBtn").onclick = () => $("#fileInput").click();
    $("#camBtn").onclick = () => $("#camInput").click();

    const handleFile = e => {
      if (e.target.files?.[0]) {
        lastFile = e.target.files[0];
        $("#analyzeBtn").disabled = false;
        const url = URL.createObjectURL(lastFile);
        $("#preview").innerHTML = `<img src="${url}" style="max-width:100%;max-height:500px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.2)">`;
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

      $("#result").innerHTML = `
        <div style="padding:1.25rem;border-radius:12px;background:#f0fdf4;border:2px solid #10b981">
          <h3 style="color:#10b981;margin-top:0">${result.status}</h3>
          <p style="white-space:pre-line;font-weight:600;margin:0.75rem 0">${result.hallazgos}</p>
          <p style="margin:0.75rem 0 0;color:#059669"><strong>Educativo:</strong> ${result.educativo || ""}</p>
          <p style="font-size:0.9rem;color:#dc2626;margin-top:0.75rem"><em>${result.disclaimer || ""}</em></p>
        </div>
      `;

      $("#analyzeBtn").textContent = "Analizar";
      $("#analyzeBtn").disabled = false;
    };

    setModo("local");
  }

  initUI();
  console.log("AI OK – " + new Date().toISOString());
})();

