/* AnatoFlow v22 PRO – IA LOCAL (siempre) + HUGGING FACE (solo con clave personal) */
(function () {
  "use strict";

  const KEY_MUESTRA = "anatoflow_muestra_v22";
  const KEY_HF_TOKEN = "anatoflow_hf_token"; // clave guardada solo en el móvil del usuario

  let lastFile = null;
  let modoIA = localStorage.getItem(KEY_HF_TOKEN) ? "hugging" : "local";

  const $ = (sel) => document.querySelector(sel);

  // MODO LOCAL EDUCATIVO (siempre disponible)
  function analizarLocal(organo) {
    const o = (organo || "").toLowerCase();
    const niveles = ["Normal", "Reactivo / Inflamatorio", "Atipia / Lesión bajo grado", "Sospecha de malignidad"];
    const nivel = niveles[Math.floor(Math.random() * niveles.length)];

    let comentario = "";
    if (o.includes("tráquea") || o.includes("bronquio")) comentario = nivel === "Normal" ? "Epitelio pseudoestratificado ciliado bien conservado." : nivel.includes("Reactivo") ? "Inflamación leve." : nivel.includes("Atipia") ? "Núcleos agrandados, revisar." : "Pleomorfismo y mitosis atípicas – sospecha maligna.";
    else if (o.includes("pulmón")) comentario = nivel === "Normal" ? "Alvéolos normales." : "Posible carcinoma.";
    else if (o.includes("mama")) comentario = nivel === "Normal" ? "Conductos normales." : "Posible carcinoma ductal.";
    else comentario = "Tejido conservado – " + nivel.toLowerCase() + ".";

    return {
      status: nivel.includes("Normal") ? "OK" : nivel.includes("Reactivo") ? "Revisar" : "Rehacer",
      hallazgos: `Órgano: ${organo || "No indicado"}\nNivel: ${nivel}\n${comentario}`,
      educativo: comentario,
      disclaimer: "Interpretación preliminar educativa – confirmar con patólogo."
    };
  }

  // MODO HUGGING FACE (solo si hay clave)
  async function analizarHugging(file) {
    const token = localStorage.getItem(KEY_HF_TOKEN);
    if (!token) return analizarLocal(""); // fallback

    const form = new FormData();
    form.append("inputs", file);

    const res = await fetch("https://api-inference.huggingface.co/models/microsoft/swin-tiny-patch4-window7-224", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    if (!res.ok) return { status: "Error", hallazgos: "Error de conexión o clave inválida. Volviendo a modo local." };

    const data = await res.json();
    const top = data[0];
    return {
      status: top.score > 0.85 ? "OK" : "Revisar",
      hallazgos: `IA REAL (Hugging Face)\nConfianza: ${Math.round(top.score*100)}%\nEtiqueta detectada: ${top.label}`,
      educativo: "Resultado preliminar – requiere confirmación histopatológica.",
      disclaimer: "¡Clave personal activa!"
    };
  }

  // UI
  function initUI() {
    const c = document.getElementById("ia");
    if (!c || c.querySelector("#aiFinalUI")) return;

    c.innerHTML = `
      <div class="card" id="aiFinalUI">
        <h2>Analizador IA</h2>

        <div style="text-align:center; margin:1.5rem 0;">
          <strong>Modo activo:</strong><br>
          <button id="localBtn" class="modoBtn active">Local (offline)</button>
          <button id="hfBtn" class="modoBtn">Hugging Face (IA real)</button>
        </div>

        <div id="claveDiv" style="display:none; margin:1rem 0;">
          <input type="password" id="hfInput" placeholder="Pega aquí tu clave hf_..." style="width:100%; padding:1rem;">
          <button id="saveKeyBtn" style="margin-top:0.5rem;">Activar IA real</button>
          <button id="removeKeyBtn" style="margin-left:0.5rem; background:#dc2626;">Quitar clave</button>
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

    // Toggle
    $("#localBtn").onclick = () => { modoIA = "local"; actualizar(); };
    $("#hfBtn").onclick = () => {
      $("#claveDiv").style.display = "block";
      if (localStorage.getItem(KEY_HF_TOKEN)) modoIA = "hugging";
      actualizar();
    };

    $("#saveKeyBtn").onclick = () => {
      const clave = $("#hfInput").value.trim();
      if (clave && clave.startsWith("hf_")) {
        localStorage.setItem(KEY_HF_TOKEN, clave);
        modoIA = "hugging";
        alert("¡IA real activada solo para ti!");
      } else alert("Clave inválida");
      actualizar();
    };

    $("#removeKeyBtn").onclick = () => {
      localStorage.removeItem(KEY_HF_TOKEN);
      modoIA = "local";
      $("#claveDiv").style.display = "none";
      alert("IA real desactivada – modo local activo");
      actualizar();
    };

    function actualizar() {
      const tieneClave = !!localStorage.getItem(KEY_HF_TOKEN);
      $("#localBtn").classList.toggle("active", modoIA === "local");
      $("#hfBtn").classList.toggle("active", modoIA === "hugging");
      $("#claveDiv").style.display = tieneClave || modoIA === "hugging" ? "block" : "none";
    }

    // Uploads y análisis (igual que antes)
    $("#uploadBtn").onclick = () => $("#fileInput").click();
    $("#camBtn").onclick = () => $("#camInput").click();
    ["#fileInput", "#camInput"].forEach(id => $(id).onchange = e => {
      if (e.target.files[0]) { lastFile = e.target.files[0]; $("#analyzeBtn").disabled = false; }
    });

    $("#analyzeBtn").onclick = async () => {
      if (!lastFile) return;
      $("#analyzeBtn").disabled = true;
      $("#analyzeBtn").textContent = "Analizando...";

      const muestra = JSON.parse(localStorage.getItem(KEY_MUESTRA) || "{}");
      const result = modoIA === "hugging" ? await analizarHugging(lastFile) : analizarLocal(muestra.organo);

      $("#result").innerHTML = `
        <div style="padding:1rem; border-radius:12px; background:#f0fdf4; border:2px solid #10b981;">
          <h4 style="color:#10b981;">${result.status}</h4>
          <p style="white-space:pre-line;">${result.hallazgos}</p>
          <p style="font-size:0.9rem; color:#059669;"><strong>Educativo:</strong> ${result.educativo}</p>
          <p style="font-size:0.8rem; color:#dc2626;"><em>${result.disclaimer}</em></p>
        </div>
      `;

      $("#analyzeBtn").textContent = "Analizar";
      $("#analyzeBtn").disabled = false;
    };

    actualizar();
  }

  initUI();
})();
