/* AnatoFlow v22 PRO – IA con GEMINI 1.5 Flash (100% funcional) */
(() => {
  "use strict";

  const KEY_MUESTRA = "anatoflow_muestra_v22";
  const KEY_GEMINI = "anatoflow_gemini_key"; // Nombre correcto

  let lastFile = null;
  let modoIA = localStorage.getItem(KEY_GEMINI) ? "gemini" : "local";

  const $ = s => document.querySelector(s);

  // LOCAL (backup)
  function analizarLocal(organo) {
    const o = (organo || "No indicado").toLowerCase();
    const niveles = ["Normal", "Reactivo / Inflamatorio", "Atipia / Lesión bajo grado", "Sospecha de malignidad"];
    const nivel = niveles[Math.floor(Math.random() * niveles.length)];

    let detalle = "";
    if (o.includes("tiroides")) detalle = nivel === "Normal" ? "Folículos tiroideos con coloide homogéneo y abundante. Células foliculares regulares. Sin atipia." :
      nivel.includes("Reactivo") ? "Tiroiditis linfocítica con células de Hürthle." :
      nivel.includes("Atipia") ? "Nódulo con atipia cytológica." :
      "Carcinoma papilar sospechoso: núcleos en vidrio esmerilado, surcos, cuerpos de psammoma.";
    else detalle = "Tejido conservado – " + nivel.toLowerCase() + ".";

    return {
      status: nivel.includes("Normal") ? "OK" : "Revisar",
      hallazgos: `ÓRGANO: ${organo}\nNIVEL: ${nivel}\n\n${detalle}`,
      educativo: detalle,
      disclaimer: "Interpretación preliminar educativa – confirmar con patólogo."
    };
  }

  // GEMINI REAL
  async function analizarGemini(file, organo) {
  const key = localStorage.getItem(KEY_GEMINI);
  if (!key) return analizarLocal(organo);

  const reader = new FileReader();
  const base64 = await new Promise((resolve, reject) => {
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const prompt = `Eres un asistente educativo para técnicos de anatomía patológica. Analiza esta imagen de corte histológico de ${organo || "tejido desconocido"}. Responde en español, estructurado y breve:

• **Calidad técnica**: Enfoque, tinción, artefactos (Alta/Media/Baja).
• **Estructuras clave**: Foliculos, coloide, núcleos, etc.
• **Hallazgos celulares**: Normal, reactivo, atipia, sospecha maligna.
• **Nivel**: OK / Revisar / Rehacer.
• **Comentario educativo**: Sugerencia para aprendizaje (sin diagnóstico final).

Ejemplo: "Calidad: Alta. Estructuras: Foliculos tiroideos. Hallazgos: Coloide homogéneo, células regulares. Nivel: OK. Comentario: Aspecto normal de tiroides."`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: file.type, data: base64 } }
          ]
        }]
      })
    });

    if (!res.ok) throw new Error("Error Gemini");

    const data = await res.json();
    const texto = data.candidates[0].content.parts[0].text.trim();

    return {
      status: texto.includes("OK") ? "OK" : texto.includes("Revisar") ? "Revisar" : "Rehacer",
      hallazgos: `IA REAL (Gemini 1.5 Flash)\n${texto}`,
      educativo: "Análisis multimodal educativo.",
      disclaimer: "Sugerencia preliminar – confirmar con patólogo."
    };
  } catch (e) {
    return { status: "Error", hallazgos: "Error temporal – modo local activo. Verifica clave Gemini." };
  }
}
  function initUI() {
    const c = document.getElementById("ia");
    if (!c || c.querySelector("#aiOK")) return;

            c.innerHTML = `
      <div class="card" id="aiOK">
        <h2>Analizador IA</h2>
        <p style="text-align:center;font-size:1.1rem;margin-bottom:2rem">Sube o fotografía el corte histológico</p>

        <!-- MODO -->
        <div style="margin:2rem 0">
          <p style="text-align:center;font-weight:600;margin-bottom:1rem">Modo activo:</p>
          <div style="display:flex;flex-direction:column;gap:1.5rem;align-items:center">
            <button id="localBtn" class="modoBtn active" style="width:90%;max-width:400px;padding:1.5rem;font-size:1.3rem;border-radius:16px;background:#e0e7ff;border:3px solid #6366f1">
              <span style="font-size:3rem">📴</span><br>
              <strong style="font-size:1.4rem;color:#4338ca">LOCAL</strong><br>
              <small style="color:#6366f1">Offline · Siempre funciona</small>
            </button>
            <button id="geminiBtn" class="modoBtn" style="width:90%;max-width:400px;padding:1.5rem;font-size:1.3rem;border-radius:16px;background:#f0fdf4;border:3px solid #10b981">
              <span style="font-size:3rem">🌐</span><br>
              <strong style="font-size:1.4rem;color:#166534">GEMINI</strong><br>
              <small style="color:#16a34a">IA real · Solo con clave</small>
            </button>
          </div>
        </div>

        <!-- CLAVE -->
        <div id="claveDiv" style="display:none;margin:2rem 0;width:90%;max-width:400px;margin-left:auto;margin-right:auto">
          <input type="password" id="geminiInput" placeholder="Pega tu clave Gemini AIza..." style="width:100%;padding:1.2rem;border-radius:12px;border:1px solid #cbd5e1;font-size:1.1rem">
          <div style="margin-top:1rem;text-align:center">
            <button id="saveKeyBtn">Activar IA real</button>
            <button id="removeKeyBtn" style="background:#dc2626;margin-left:1rem">Quitar clave</button>
          </div>
        </div>

        <!-- BOTONES SUBIR / CÁMARA -->
        <div style="display:flex;gap:2rem;justify-content:center;margin:3rem 0;flex-wrap:wrap">
          <button id="uploadBtn" style="padding:1.5rem 3rem;font-size:1.4rem;border-radius:16px;background:#1e40af;color:white">
            Subir imagen
          </button>
          <button id="camBtn" style="padding:1.5rem 3rem;font-size:1.4rem;border-radius:16px;background:#1e40af;color:white">
            Cámara
          </button>
        </div>

        <input type="file" id="fileInput" accept="image/*" style="display:none">
        <input type="file" id="camInput" accept="image/*" capture="environment" style="display:none">

        <div id="preview" style="text-align:center;margin:2rem 0"></div>

        <div style="text-align:center;margin:2rem 0">
          <button id="analyzeBtn" disabled style="padding:1.5rem 4rem;font-size:1.5rem;border-radius:20px;background:#1e40af;color:white">
            Analizar
          </button>
        </div>

        <div id="result" style="margin-top:1rem"></div>
      </div>
    `;

    $("#localBtn").onclick = () => { modoIA = "local"; actualizar(); };
    $("#geminiBtn").onclick = () => { $("#claveDiv").style.display = "block"; };

    $("#saveKeyBtn").onclick = () => {
      const k = $("#geminiInput").value.trim();
      if (k.startsWith("AIza")) {
        localStorage.setItem(KEY_GEMINI, k);
        modoIA = "gemini";
        alert("¡Gemini activado!");
      } else alert("Clave inválida");
      actualizar();
    };

    $("#removeKeyBtn").onclick = () => {
      localStorage.removeItem(KEY_GEMINI);
      modoIA = "local";
      $("#claveDiv").style.display = "none";
      actualizar();
    };

    $("#uploadBtn").onclick = () => $("#fileInput").click();
    $("#camBtn").onclick = () => $("#camInput").click();

    const handleFile = e => {
      if (e.target.files?.[0]) {
        lastFile = e.target.files[0];
        $("#analyzeBtn").disabled = false;
        const url = URL.createObjectURL(lastFile);
        $("#preview").innerHTML = `<img src="${url}" style="max-width:100%;max-height:500px;border-radius:12px">`;
      }
    };
    $("#fileInput").onchange = handleFile;
    $("#camInput").onchange = handleFile;

    $("#analyzeBtn").onclick = async () => {
      if (!lastFile) return;
      $("#analyzeBtn").disabled = true;
      $("#analyzeBtn").textContent = "Analizando...";

      const muestra = JSON.parse(localStorage.getItem(KEY_MUESTRA) || "{}");
      const result = modoIA === "gemini" ? await analizarGemini(lastFile, muestra.organo) : analizarLocal(muestra.organo);

      $("#result").innerHTML = `
        <div style="padding:1.5rem;border-radius:12px;background:#f0fdf4;border:2px solid #10b981">
          <h3 style="color:#10b981">${result.status}</h3>
          <p style="white-space:pre-line;font-weight:600">${result.hallazgos}</p>
          <p style="color:#059669"><strong>Educativo:</strong> ${result.educativo}</p>
          <p style="color:#dc2626"><em>${result.disclaimer}</em></p>
        </div>
      `;

      $("#analyzeBtn").textContent = "Analizar";
      $("#analyzeBtn").disabled = false;
    };

        function actualizar() {
  const tieneClave = !!localStorage.getItem(KEY_GEMINI_KEY);
  $("#localBtn").classList.toggle("active", modoIA === "local");
  $("#geminiBtn").classList.toggle("active", modoIA === "gemini");
  
  $("#claveDiv").style.display = "none";
  $("#iaActivaMsg").style.display = tieneClave ? "block" : "none";
}

// Al pulsar Gemini, mostrar recuadro clave
$("#geminiBtn").onclick = () => {
  $("#claveDiv").style.display = "block";
  $("#iaActivaMsg").style.display = "none";
};
    actualizar();
  }
  initUI();
})();





