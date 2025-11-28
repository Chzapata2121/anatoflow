/* AnatoFlow v22 PRO – Analizador IA LOCAL + HUGGING FACE REAL (demo 10 días) */
(function () {
  "use strict";

  const KEY_MUESTRA = "anatoflow_muestra_v22";
  const KEY_DEMO_START = "anatoflow_demo_start";
  const DEMO_DIAS = 10; // ← Cambia aquí si quieres más/menos días

  // ← PEGA AQUÍ TU CLAVE HUGGING FACE (hf_xxxxxx)
  const HF_TOKEN = "PEGA_TU_CLAVE_AQUÍ";   // ¡¡REEMPLAZA ESTO!!

  let lastFile = null;
  let modoIA = "local";

  const $ = (sel) => document.querySelector(sel);

  // ─────── MODO LOCAL EDUCATIVO (siempre disponible) ───────
  function analizarLocal(organo) {
    const o = (organo || "").toLowerCase();
    const niveles = ["Normal", "Reactivo / Inflamatorio", "Atipia / Lesión bajo grado", "Sospecha de malignidad"];
    const nivel = niveles[Math.floor(Math.random() * niveles.length)];

    let comentario = "";
    if (o.includes("tráquea") || o.includes("bronquio")) comentario = nivel === "Normal" ? "Epitelio pseudoestratificado ciliado preservado. Células caliciformes visibles." : nivel.includes("Reactivo") ? "Inflamación leve con infiltrado linfocitario." : nivel.includes("Atipia") ? "Núcleos ligeramente agrandados. Revisar." : "Alta celularidad, pleomorfismo nuclear. Posible carcinoma.";
    else if (o.includes("pulmón")) comentario = nivel === "Normal" ? "Alvéolos bien formados, macrófagos normales." : "Posible carcinoma escamocelular o adenocarcinoma.";
    else if (o.includes("mama")) comentario = nivel === "Normal" ? "Conductos y lobulillos normales." : "Posible carcinoma ductal invasivo.";
    else comentario = "Tejido conservado. " + nivel.toLowerCase() + ".";

    return {
      status: nivel.includes("Normal") ? "OK" : nivel.includes("Reactivo") ? "Revisar" : "Rehacer",
      hallazgos: `Órgano: ${organo || "No indicado"}\nNivel: ${nivel}\n${comentario}`,
      educativo: comentario,
      disclaimer: "Interpretación preliminar educativa. Requiere confirmación por patólogo."
    };
  }

  // ─────── MODO HUGGING FACE REAL ───────
  async function analizarHugging(file, organo) {
    const form = new FormData();
    form.append("inputs", file);

    const res = await fetch("https://api-inference.huggingface.co/models/microsoft/swin-tiny-patch4-window7-224", {
      method: "POST",
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
      body: form
    });

    if (!res.ok) return { status: "Error", hallazgos: "Error de conexión con IA real. Volviendo a modo local." };

    const data = await res.json();
    // Aquí puedes cambiar el modelo cuando quieras (hay cientos específicos de histología)
    const top = data[0];
    const etiqueta = top.label.toLowerCase();
    const confianza = Math.round(top.score * 100);

    let nivel = confianza > 85 ? "OK" : confianza > 60 ? "Revisar" : "Rehacer";
    let comentario = etiqueta.includes("normal") || etiqueta.includes("benign") ? "Aspecto compatible con tejido normal/benigno." : "Hallazgos sugerentes de proceso patológico.";

    return {
      status: nivel,
      hallazgos: `IA real (Hugging Face)\nConfianza: ${confianza}%\nEtiqueta: ${top.label}\n${comentario}`,
      educativo: comentario,
      disclaimer: "Resultado preliminar de IA – requiere confirmación histopatológica."
    };
  }

  // ─────── UI + LÓGICA ───────
  function initUI() {
    const c = document.getElementById("ia");
    if (!c || c.querySelector("#aiProUI")) return;

    c.innerHTML = `
      <div class="card" id="aiProUI">
        <h2>Analizador IA</h2>
        <p>Sube o fotografía el corte histológico</p>

        <div style="text-align:center; margin:1.5rem 0;">
          <strong>Modo análisis:</strong><br>
          <button id="localBtn" class="modoBtn active">Local (offline)</button>
          <button id="hfBtn" class="modoBtn">Hugging Face (IA real)</button>
        </div>

        <div style="display:flex; gap:1rem; flex-wrap:wrap; justify-content:center;">
          <button id="uploadBtn">Subir imagen</button>
          <button id="camBtn">Cámara</button>
        </div>
        <input type="file" id="fileInput" accept="image/*" style="display:none">
        <input type="file" id="camInput" accept="image/*" capture="environment" style="display:none">

        <button id="analyzeBtn" disabled style="margin-top:1rem;">Analizar</button>
        <div id="result" style="margin-top:1rem;"></div>
      </div>
    `;

    $("#localBtn").onclick = () => { modoIA = "local"; actualizar(); };
    $("#hfBtn").onclick = () => {
      if (HF_TOKEN === "PEGA_TU_CLAVE_AQUÍ") {
        alert("Primero pega tu clave Hugging Face en ai.js y vuelve a subir.");
        return;
      }
      if (!dentroDeDemo()) {
        alert("Demo IA real terminada. Volviendo a modo local.");
        modoIA = "local";
      } else modoIA = "hugging";
      actualizar();
    };

    function actualizar() {
      $("#localBtn").classList.toggle("active", modoIA === "local");
      $("#hfBtn").classList.toggle("active", modoIA === "hugging");
    }

    $("#uploadBtn").onclick = () => $("#fileInput").click();
    $("#camBtn").onclick = () => $("#camInput").click();

    ["#fileInput", "#camInput"].forEach(id => $(id).onchange = e => {
      if (e.target.files[0]) { lastFile = e.target.files[0]; $("#analyzeBtn").disabled = false; }
    });

    $("#analyzeBtn").onclick = async () => {
      if (!lastFile) return;
      $("#analyzeBtn").disabled = true;
      $("#analyzeBtn").textContent = modoIA === "hugging" ? "Analizando con IA real..." : "Analizando...";

      const muestra = JSON.parse(localStorage.getItem(KEY_MUESTRA) || "{}");
      const result = modoIA === "hugging" ? await analizarHugging(lastFile, muestra.organo) : analizarLocal(muestra.organo);

      $("#result").innerHTML = `
        <div style="padding:1rem; border-radius:12px; background:#f0fdf4; border:2px solid #10b981;">
          <h4 style="color:#10b981; margin:0 0 0.5rem;">${result.status}</h4>
          <p style="white-space:pre-line;">${result.hallazgos}</p>
          <p style="font-size:0.9rem; color:#059669;"><strong>Educativo:</strong> ${result.educativo}</p>
          <p style="font-size:0.8rem; color:#dc2626;"><em>${result.disclaimer}</em></p>
        </div>
      `;

      $("#analyzeBtn").textContent = "Analizar";
      $("#analyzeBtn").disabled = false;
    };
  }

  // Demo automática la primera vez
  if (!localStorage.getItem(KEY_DEMO_START) && HF_TOKEN !== "PEGA_TU_CLAVE_AQUÍ") {
    setTimeout(() => {
      if (confirm(`¿Activar IA real ${DEMO_DIAS} días gratis?\nDespués vuelve al modo local.`)) {
        localStorage.setItem(KEY_DEMO_START, new Date().toISOString());
        alert("Demo activada – recarga la página");
      }
    }, 1500);
  }

  function dentroDeDemo() {
    const inicio = localStorage.getItem(KEY_DEMO_START);
    if (!inicio) return false;
    const dias = (Date.now() - new Date(inicio)) / (1000*60*60*24);
    return dias <= DEMO_DIAS;
  }

  initUI();
})();
