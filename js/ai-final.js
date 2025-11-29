/* AnatoFlow – IA (Local vs Worker) */
(() => {
  "use strict";

  const KEY_MUESTRA = "anatoflow_muestra_v22";
  const KEY_AI_MODE = "anatoflow_ai_mode"; // "local" | "worker"

  // TU URL REAL del worker:
  const WORKER_URL = "https://little-limit-7cbb.cchhee-18.workers.dev";

  let lastFile = null;
  let modoIA = localStorage.getItem(KEY_AI_MODE) || "local";

  const $ = (s) => document.querySelector(s);

  function analizarLocal(organo) {
    const o = (organo || "No indicado").toLowerCase();
    const niveles = ["Normal", "Reactivo / Inflamatorio", "Atipia / Lesión bajo grado", "Sospecha de malignidad"];
    const nivel = niveles[Math.floor(Math.random() * niveles.length)];

    let detalle = "";
    if (o.includes("tráquea") || o.includes("bronquio")) detalle = "Evaluación educativa en vía aérea (simulada).";
    else if (o.includes("tiroides")) detalle = "Evaluación educativa en tiroides (simulada).";
    else detalle = "Evaluación educativa (simulada).";

    return {
      status: nivel.includes("Normal") ? "OK" : nivel.includes("Reactivo") ? "Revisar" : "Rehacer",
      hallazgos: `ÓRGANO: ${organo || "No indicado"}\nNIVEL: ${nivel}\n\n${detalle}`,
      educativo: detalle,
      disclaimer: "Interpretación preliminar educativa – confirmar con patólogo."
    };
  }

  async function analizarWorker(file) {
    try {
      const body = await file.arrayBuffer();

      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream", "Accept": "application/json" },
        body
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Worker/HF HTTP ${res.status}: ${txt}`.slice(0, 300));
      }

      const data = await res.json();

      // HF suele devolver array [{label, score}, ...] o {error: "..."}
      if (data && data.error) throw new Error(String(data.error));

      const top = Array.isArray(data) ? (data[0] || {}) : (data?.[0] || data || {});
      const score = Number(top.score ?? 0);

      return {
        status: score > 0.8 ? "OK" : "Revisar",
        hallazgos: `IA REAL activada (Worker)\nConfianza: ${Math.round(score * 100)}%\nEtiqueta: ${top.label || "desconocida"}`,
        educativo: "Resultado educativo basado en modelo remoto (no diagnóstico).",
        disclaimer: "IA remota vía Cloudflare Worker (token protegido)."
      };
    } catch (e) {
      return {
        status: "Error",
        hallazgos: `Error IA real – modo local activo.\n${String(e?.message || e)}`,
        educativo: "No se pudo ejecutar la IA remota. Reintente o use modo local.",
        disclaimer: "Si persiste: revisar Worker, HF token, estado del modelo y conexión."
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

        <div style="text-align:center;margin:1.2rem 0">
          <strong>Modo</strong><br>
          <button id="localBtn" class="modoBtn">Local (offline)</button>
          <button id="wkBtn" class="modoBtn">IA real (Worker)</button>
        </div>

        <div style="display:flex;gap:1rem;justify-content:center;margin:1rem 0">
          <button id="uploadBtn">Subir imagen</button>
          <button id="camBtn">Cámara</button>
        </div>

        <input type="file" id="fileInput" accept="image/*" style="display:none">
        <input type="file" id="camInput" accept="image/*" capture="environment" style="display:none">

        <div id="preview" style="text-align:center;margin:1.2rem 0"></div>

        <button id="analyzeBtn" disabled style="margin-top:0.5rem">Analizar</button>
        <div id="result" style="margin-top:1rem"></div>
      </div>
    `;

    function setMode(m) {
      modoIA = m;
      localStorage.setItem(KEY_AI_MODE, m);
      $("#localBtn").classList.toggle("active", m === "local");
      $("#wkBtn").classList.toggle("active", m === "worker");
    }

    $("#localBtn").onclick = () => setMode("local");
    $("#wkBtn").onclick = () => setMode("worker");

    $("#uploadBtn").onclick = () => $("#fileInput").click();
    $("#camBtn").onclick = () => $("#camInput").click();

    const handleFile = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      lastFile = f;
      $("#analyzeBtn").disabled = false;
      const url = URL.createObjectURL(f);
      $("#preview").innerHTML = `<img src="${url}" style="max-width:100%;max-height:500px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.2)">`;
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

      const ok = result.status === "OK";
      const warn = result.status === "Revisar";
      const border = ok ? "#10b981" : warn ? "#f59e0b" : "#ef4444";
      const bg = ok ? "#f0fdf4" : warn ? "#fffbeb" : "#fef2f2";

      $("#result").innerHTML = `
        <div style="padding:1.2rem;border-radius:12px;background:${bg};border:2px solid ${border}">
          <h3 style="margin:0 0 0.5rem 0;color:${border}">${result.status}</h3>
          <p style="white-space:pre-line;font-weight:600;margin:0">${result.hallazgos}</p>
          <p style="margin:0.8rem 0 0;color:#111827"><strong>Educativo:</strong> ${result.educativo || ""}</p>
          <p style="font-size:0.9rem;color:#6b7280;margin-top:0.6rem"><em>${result.disclaimer || ""}</em></p>
        </div>
      `;

      $("#analyzeBtn").textContent = "Analizar";
      $("#analyzeBtn").disabled = false;
    };

    setMode(modoIA);
  }

  initUI();
})();
