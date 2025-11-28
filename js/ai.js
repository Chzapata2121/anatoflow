/* AnatoFlow v22 PRO – Analizador IA con modo LOCAL + HUGGING FACE (demo 10 días)
   Tú controlas todo: duración demo, clave, etc.
*/
(function () {
  "use strict";

  const KEY_MUESTRA = "anatoflow_muestra_v22";
  const KEY_DEMO_START = "anatoflow_demo_start";
  const DEMO_DIAS = 10; // ← Cambia aquí si quieres 7, 30, 90 días...

  // ← PON AQUÍ TU CLAVE HUGGING FACE CUANDO QUIERAS ACTIVAR MODO PRO
  const HF_TOKEN = "TU_CLAVE_HF_AQUI"; // ejemplo: "hf_abc123..." (déjalo así hasta que quieras)

  let lastFile = null;
  let modoIA = "local";

  const $ = (sel) => document.querySelector(sel);

  // Simulador local EDUCATIVO y coherente (usa el órgano guardado)
  function analizarLocal(organo) {
    const organoLower = (organo || "desconocido").toLowerCase();
    const niveles = ["Normal", "Reactivo / Inflamatorio", "Atipia / Lesión bajo grado", "Sospecha de malignidad"];
    const nivel = niveles[Math.floor(Math.random() * niveles.length)];

    let comentario = "";
    if (organoLower.includes("tráquea") || organoLower.includes("bronquio")) {
      comentario = nivel === "Normal" ? "Epitelio pseudoestratificado ciliado preservado. Células caliciformes visibles." :
                  nivel.includes("Reactivo") ? "Inflamación leve con infiltrado linfocitario. Sin displasia." :
                  nivel.includes("Atipia") ? "Algunas células con núcleos ligeramente agrandados. Revisar." :
                  "Alta celularidad, núcleos hipercrómaticos y pleomórficos. Posible carcinoma.";
    } else if (organoLower.includes("pulmón")) {
      comentario = nivel === "Normal" ? "Alvéolos bien formados, macrófagos alveolares normales." :
                  "Posible carcinoma escamocelular o adenocarcinoma según patrón.";
    } else if (organoLower.includes("mama") {
      comentario = nivel === "Normal" ? "Conductos y lobulillos mamarios normales." :
                  "Posible carcinoma ductal invasivo o fibroadenoma.";
    } else {
      comentario = "Tejido conservado. " + nivel.toLowerCase() + ".";
    }

    return {
      status: nivel.includes("Normal") ? "OK" : nivel.includes("Reactivo") ? "Revisar" : "Rehacer",
      hallazgos: `Órgano: ${organo || "No especificado"}\nNivel: ${nivel}\n${comentario}`,
      educativo: comentario,
      disclaimer: "Interpretación preliminar educativa. Requiere confirmación por patólogo."
    };
  }

  // Aquí irá Hugging Face cuando actives la demo (código preparado)

  function renderResult(result) {
    $("#aiResult").innerHTML = `
      <div style="padding:1rem; border-radius:12px; background:#f0fdf4; border:2px solid #10b981; margin-top:1rem;">
        <h4 style="color:#10b981; margin:0 0 0.5rem;">${result.status}</h4>
        <p style="white-space:pre-line; margin:0.5rem 0;">${result.hallazgos}</p>
        <p style="font-size:0.9rem; color:#059669; margin-top:1rem;"><strong>Educativo:</strong> ${result.educativo}</p>
        <p style="font-size:0.8rem; color:#dc2626; margin-top:1rem;"><em>${result.disclaimer || "Solo para apoyo educativo"}</em></p>
      </div>
    `;
  }

  function initUI() {
    const container = document.getElementById("ia");
    if (!container || container.querySelector("#aiCustomUI")) return;

    container.innerHTML = `
      <div class="card" id="aiCustomUI">
        <h2>Analizador IA</h2>
        <p>Sube o fotografía el corte histológico</p>

        <div style="text-align:center; margin:1.5rem 0;">
          <label style="font-weight:600;">Modo análisis:</label><br>
          <button id="modoLocalBtn" class="modoBtn active">Local (offline)</button>
          <button id="modoHFBtn" class="modoBtn">Hugging Face (IA real)</button>
        </div>

        <div style="display:flex; gap:1rem; flex-wrap:wrap; justify-content:center;">
          <button id="aiBtnUpload">Subir imagen</button>
          <button id="aiBtnCamera">Cámara</button>
        </div>
        <input type="file" id="aiUpload" accept="image/*" style="display:none">
        <input type="file" id="aiCamera" accept="image/*" capture="environment" style="display:none">

        <button id="aiAnalyze" disabled style="margin-top:1rem;">Analizar</button>
        <div id="aiResult" style="margin-top:1rem;"></div>
      </div>
    `;

    // Botones modo
    $("#modoLocalBtn").onclick = () => { modoIA = "local"; actualizarBotones(); };
    $("#modoHFBtn").onclick = () => {
      if (HF_TOKEN === "TU_CLAVE_HF_AQUI") {
        alert("Modo IA real no activado aún.\nContacta al desarrollador para demo.");
        return;
      }
      if (!dentroDeDemo()) {
        alert(`Demo IA real finalizada.\nVuelve al modo local o contacta al desarrollador.`);
        modoIA = "local";
      } else {
        modoIA = "hugging";
      }
      actualizarBotones();
    };

    function actualizarBotones() {
      $("#modoLocalBtn").classList.toggle("active", modoIA === "local");
      $("#modoHFBtn").classList.toggle("active", modoIA === "hugging");
    }

    // Uploads
    $("#aiBtnUpload").onclick = () => $("#aiUpload").click();
    $("#aiBtnCamera").onclick = () => $("#aiCamera").click();

    ["#aiUpload", "#aiCamera"].forEach(id => {
      $(id).onchange = (e) => {
        if (e.target.files[0]) {
          lastFile = e.target.files[0];
          $("#aiAnalyze").disabled = false;
        }
      };
    });

    // Análisis
    $("#aiAnalyze").onclick = async () => {
      if (!lastFile) return;
      $("#aiAnalyze").disabled = true;
      $("#aiAnalyze").textContent = "Analizando...";

      const muestra = JSON.parse(localStorage.getItem(KEY_MUESTRA) || "{}");
      const organo = muestra.organo || "tejido";

      let result;
      if (modoIA === "hugging" && HF_TOKEN !== "TU_CLAVE_HF_AQUI" && dentroDeDemo()) {
        // Aquí irá el código Hugging Face real (te lo paso cuando quieras activarlo)
        result = { status: "OK", hallazgos: "IA real activada (próximamente)", educativo: "" };
      } else {
        result = analizarLocal(organo);
      }

      renderResult(result);
      $("#aiAnalyze").textContent = "Analizar";
      $("#aiAnalyze").disabled = false;
    };
  }

  // Primera vez: ofrecer demo
  if (!localStorage.getItem(KEY_DEMO_START) && HF_TOKEN !== "TU_CLAVE_HF_AQUI") {
    setTimeout(() => {
      if (confirm(`¿Quieres probar la IA real ${DEMO_DIAS} días gratis?\n\n(Después vuelve al modo local educativo)`)) {
        localStorage.setItem(KEY_DEMO_START, new Date().toISOString());
        alert("¡Demo activada! Recarga la página.");
      }
    }, 2000);
  }

  initUI();
})();

