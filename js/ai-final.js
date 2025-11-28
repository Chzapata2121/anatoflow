/* AnatoFlow v22 PRO – IA (Local + Real vía Worker) – GitHub Pages OK */
(() => {
  "use strict";

  const KEY_MUESTRA = "anatoflow_muestra_v22";
  const KEY_AI_RESULT = "anatoflow_ai_result_v22";

  // Pega aquí tu URL real del Worker:
  const WORKER_URL = "https://little-limit-7cbb.cchhee-18.workers.dev";

  let lastFile = null;
  let modoIA = "local"; // "local" | "real"

  const $ = (s) => document.querySelector(s);

  function getMuestra() {
    try {
      return JSON.parse(localStorage.getItem(KEY_MUESTRA) || "{}") || {};
    } catch {
      return {};
    }
  }

  function colorPorStatus(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("ok")) return { bg: "#f0fdf4", border: "#10b981", text: "#065f46" };     // verde
    if (s.includes("revis")) return { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" };  // ámbar
    if (s.includes("rehac")) return { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" };  // rojo
    if (s.includes("error")) return { bg: "#f1f5f9", border: "#64748b", text: "#0f172a" };  // gris
    return { bg: "#f8fafc", border: "#94a3b8", text: "#0f172a" };
  }

  function analizarLocal(organo) {
    const o = (organo || "No indicado").toLowerCase();

    const niveles = [
      "Normal",
      "Reactivo / Inflamatorio",
      "Atipia / Lesión bajo grado",
      "Sospecha de malignidad",
    ];
    const nivel = niveles[Math.floor(Math.random() * niveles.length)];

    let detalle = "";
    if (o.includes("traquea") || o.includes("tráquea") || o.includes("bronquio")) {
      detalle =
        nivel === "Normal"
          ? "Epitelio cilíndrico pseudoestratificado ciliado conservado. Células caliciformes presentes."
          : nivel.includes("Reactivo")
            ? "Cambios inflamatorios/reactivos compatibles con irritación o infección."
            : nivel.includes("Atipia")
              ? "Cambios displásicos leves: revisar correlación clínica y repetir si procede."
              : "Hallazgos sospechosos: considerar revisión por patólogo y repetir técnica si la calidad es pobre.";
    } else if (o.includes("tiroides")) {
      detalle =
        nivel === "Normal"
          ? "Folículos bien delimitados con coloide homogéneo. Celularidad folicular dentro de lo esperado."
          : nivel.includes("Reactivo")
            ? "Patrón compatible con tiroiditis/hiperplasia: correlacionar con clínica."
            : nivel.includes("Atipia")
              ? "Atipia leve / células oncocíticas (Hürthle) posibles: revisar extendido y repetir si hay dudas."
              : "Hallazgos sospechosos: reconsiderar técnica y solicitar segunda lectura.";
    } else if (o.includes("pulmon") || o.includes("pulmón")) {
      detalle =
        nivel === "Normal"
          ? "Arquitectura alveolar conservada sin artefactos mayores."
          : "Alteraciones inespecíficas: revisar calidad técnica y correlacionar con la muestra.";
    } else {
      detalle = "Tejido conservado – " + nivel.toLowerCase() + ".";
    }

    return {
      status: nivel.includes("Normal") ? "OK" : nivel.includes("Reactivo") ? "Revisar" : "Rehacer",
      hallazgos: `MODO LOCAL (simulado)\nÓrgano: ${organo || "-"}\nNivel: ${nivel}\n\n${detalle}`,
      educativo: detalle,
      disclaimer: "Educativo. No constituye diagnóstico. Confirmar con patólogo y correlación clínica.",
      meta: { mode: "local" },
    };
  }

  async function analizarIAReal(file) {
    try {
      const body = await file.arrayBuffer();

      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Worker/HF HTTP ${res.status}: ${txt}`.slice(0, 350));
      }

      const data = await res.json();

      // HF típicamente devuelve: [{label, score}, ...]
      // También puede devolver: { error: "..."} o similares.
      if (data && typeof data === "object" && !Array.isArray(data) && data.error) {
        throw new Error(String(data.error));
      }

      const top = Array.isArray(data) ? (data[0] || {}) : (data?.[0] || data || {});
      const label = top.label || "desconocida";
      const score = Number(top.score ?? 0);

      // Semáforo simple por confianza del modelo (ajustable)
      const status = score >= 0.85 ? "OK" : score >= 0.60 ? "Revisar" : "Rehacer";

      return {
        status,
        hallazgos: `IA REAL (Hugging Face vía Worker)\nConfianza: ${Math.round(score * 100)}%\nEtiqueta: ${label}`,
        educativo:
          "Salida automatizada del modelo (clasificación/score). Úsese como apoyo a control de calidad, no como diagnóstico.",
        disclaimer:
          "La IA puede fallar por calidad de imagen, tinción, enfoque o variabilidad tisular. Verificar siempre por criterios morfológicos.",
        meta: { mode: "real", label, score },
      };
    } catch (e) {
      return {
        status: "Error",
        hallazgos: `Error IA real – modo local activo.\n${String(e?.message || e)}`,
        educativo: "No se pudo ejecutar la IA remota. Reintente o use modo local.",
        disclaimer: "Si persiste: revisar Worker, token HF, estado del modelo y conexión.",
        meta: { mode: "real_error" },
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
          <div style="display:flex;gap:.75rem;justify-content:center;margin-top:.75rem;flex-wrap:wrap">
            <button id="localBtn" class="modoBtn active">Local (offline)</button>
            <button id="realBtn" class="modoBtn">IA real (Worker)</button>
          </div>
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

    function actualizar() {
      $("#localBtn").classList.toggle("active", modoIA === "local");
      $("#realBtn").classList.toggle("active", modoIA === "real");
    }

    $("#localBtn").onclick = () => {
      modoIA = "local";
      actualizar();
    };

    $("#realBtn").onclick = () => {
      modoIA = "real";
      actualizar();
    };

    $("#uploadBtn").onclick = () => $("#fileInput").click();
    $("#camBtn").onclick = () => $("#camInput").click();

    const handleFile = (e) => {
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
      const prevText = $("#analyzeBtn").textContent;
      $("#analyzeBtn").textContent = "Analizando...";

      const muestra = getMuestra();
      const result =
        modoIA === "real" ? await analizarIAReal(lastFile) : analizarLocal(muestra.organo);

      // Guardar para auditoría/informe
      try {
        localStorage.setItem(
          KEY_AI_RESULT,
          JSON.stringify({
            ts: new Date().toISOString(),
            mode: modoIA,
            organo: muestra.organo || "",
            status: result.status,
            hallazgos: result.hallazgos,
            educativo: result.educativo,
            meta: result.meta || {},
          })
        );
      } catch {}

      const theme = colorPorStatus(result.status);

      $("#result").innerHTML = `
        <div style="padding:1.25rem;border-radius:12px;background:${theme.bg};border:2px solid ${theme.border}">
          <h3 style="margin:.25rem 0;color:${theme.text}">${result.status}</h3>
          <p style="white-space:pre-line;font-weight:600;margin:.75rem 0;color:${theme.text}">${result.hallazgos}</p>
          <p style="margin:0;color:${theme.text}"><strong>Educativo:</strong> ${result.educativo || "—"}</p>
          <p style="font-size:0.9rem;color:#6b7280;margin-top:1rem"><em>${result.disclaimer || ""}</em></p>
        </div>
      `;

      $("#analyzeBtn").textContent = prevText;
      $("#analyzeBtn").disabled = false;
    };

    actualizar();
  }

  initUI();
  console.log("AI v22 OK – " + new Date().toISOString());
})();
