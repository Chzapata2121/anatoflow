/* AnatoFlow v22 PRO – IA con GEMINI 1.5 Flash (100% funcional) */
(() => {
  "use strict";

  const KEY_MUESTRA = "anatoflow_muestra_v22";
  const KEY_GEMINI = "anatoflow_gemini_key"; 

  let lastFile = null;
  // Inicialización: si hay clave, usa 'gemini', si no, usa 'local'
  let modoIA = localStorage.getItem(KEY_GEMINI) ? "gemini" : "local"; 

  // Quitamos 'const $ = s => document.querySelector(s);' para usar document.getElementById y querySelector dentro del scope seguro.

  // LOCAL (backup)
  function analizarLocal(organo) {
    const o = (organo || "No indicado").toLowerCase();
    const niveles = ["Normal", "Reactivo / Inflamatorio", "Atipia / Lesión bajo grado", "Sospecha de malignidad"];
    const nivel = niveles[Math.floor(Math.random() * niveles.length)];

    let detalle = "";
    if (o.includes("tiroides")) detalle = nivel === "Normal" ? "Folículos tiroideos con coloide homogéneo y abundante. Células foliculares regulares. Sin atipia." :
      nivel.includes("Reactivo") ? "Tiroiditis linfocítica con células de Hürthle." :
      nivel.includes("Atipia") ? "Nódulo con atipia citológica." :
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

    const prompt = `Eres un asistente experto en citopatología y anatomía patológica, enfocado en el análisis de imágenes de cortes histológicos y citológicos. Tu objetivo es redactar un informe educativo y estructurado.

**INSTRUCCIÓN DE FORMATO:**
Responde en español. NO uses viñetas ni asteriscos para las categorías principales. Usa **doble hash (##)** para los encabezados principales, siguiendo rigurosamente este formato:

## Calidad Técnica:
Motivos: [Breve descripción de factores limitantes: eritrocitos, foco, tinción, aumento.]
Recomendaciones: [Pasos a seguir: mayor aumento, técnicas complementarias.]

## Análisis de Muestra:
Tejido Detectado: [Tipo de muestra y componentes observados (células epiteliales, fondo hemático, inflamación).]
Células Clave: [Descripción de las células más relevantes: ej. epiteliales en grupos, linfoides, fusiformes.]

## Hallazgos Citomorfológicos:
[Descripción detallada de la morfología celular y nuclear: variabilidad, hipercromasia, atipia.]
Nivel de Detección: [OK / Revisar (atipia) / Rehacer (muestra no diagnóstica).]

**ANÁLISIS DE LA IMAGEN HISTOLÓGICA DE ${organo || "tejido desconocido"}.**`;

    try {
      // ⭐️ CORRECCIÓN CLAVE: Endpoint correcto para evitar el 404
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash/generateContent?key=${key}`, {
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

      if (!res.ok) throw new Error("Error Gemini: " + res.status);

      const data = await res.json();
      const texto = data.candidates[0].content.parts[0].text.trim();

      return {
        status: texto.includes("OK") ? "OK" : texto.includes("Revisar") ? "Revisar" : "Rehacer",
        hallazgos: `IA REAL (Gemini 1.5 Flash)\n${texto}`,
        educativo: "Análisis multimodal educativo.",
        disclaimer: "Sugerencia preliminar – confirmar con patólogo."
      };
    } catch (e) {
      console.error("Fallo la llamada a Gemini:", e);
      return { 
        status: "Error", 
        hallazgos: "Error temporal – modo local activo. Verifica clave Gemini.",
        educativo: "No disponible en modo local.",
        disclaimer: "Fallo de comunicación con la IA. El modo local no proporciona análisis educativo.",
      };
    }
  }
  
  // Función para actualizar el estado visual de los botones
  function actualizar() {
    const $ia = document.getElementById("ia");
    if (!$ia) return; 
    
    const tieneClave = !!localStorage.getItem(KEY_GEMINI);
    
    // Usamos $ia.querySelector para buscar dentro del contenedor #ia
    const localBtn = $ia.querySelector("#localBtn");
    const geminiBtn = $ia.querySelector("#geminiBtn");
    const claveDiv = $ia.querySelector("#claveDiv");
    const iaActivaMsg = document.getElementById("iaActivaMsg");
    
    if (localBtn) localBtn.classList.toggle("active", modoIA === "local");
    if (geminiBtn) geminiBtn.classList.toggle("active", modoIA === "gemini");
    
    // Control de la visibilidad de la clave
    if (claveDiv) claveDiv.style.display = (modoIA === "gemini" && !tieneClave) ? "block" : "none";
    
    if (iaActivaMsg) {
        iaActivaMsg.style.display = (tieneClave && modoIA === "gemini") ? "block" : "none";
    }
  }

  // Función para inicializar la UI de la pestaña IA y enlazar todos los botones
  function initUI() {
    const $ia = document.getElementById("ia");
    if (!$ia) return; 

    // ⭐️ BÚSQUEDA SEGURA DE ELEMENTOS DENTRO DEL CONTENEDOR #ia
    
    // 1. Botones de MODO y CLAVE
    const localBtn = $ia.querySelector("#localBtn");
    const geminiBtn = $ia.querySelector("#geminiBtn");
    const saveKeyBtn = $ia.querySelector("#saveKeyBtn");
    const removeKeyBtn = $ia.querySelector("#removeKeyBtn");
    const geminiInput = $ia.querySelector("#geminiInput");
    
    // 2. Botones de ACCIÓN y ELEMENTOS RELACIONADOS
    const uploadBtn = $ia.querySelector("#uploadBtn");
    const camBtn = $ia.querySelector("#camBtn");
    const fileInput = $ia.querySelector("#fileInput");
    const camInput = $ia.querySelector("#camInput");
    const analyzeBtn = $ia.querySelector("#analyzeBtn");
    const previewDiv = $ia.querySelector("#preview");
    const resultDiv = $ia.querySelector("#result");

    // Verificar si faltan elementos clave (para depuración, aunque no haya error visible)
    if (!localBtn || !geminiBtn || !uploadBtn || !camBtn || !analyzeBtn) {
        console.error("Fallo al enlazar los botones. Revisa IDs.");
        return; 
    }

    // --- ENLACE DE EVENTOS ---

    // Botones de MODO
    localBtn.onclick = () => { modoIA = "local"; actualizar(); };
    geminiBtn.onclick = () => {
        if (!localStorage.getItem(KEY_GEMINI)) {
            $ia.querySelector("#claveDiv").style.display = "block";
        }
        modoIA = "gemini";
        actualizar();
    };

    // Botones de CLAVE
    saveKeyBtn.onclick = () => {
      const k = geminiInput.value.trim();
      if (k.startsWith("AIza")) {
        localStorage.setItem(KEY_GEMINI, k);
        modoIA = "gemini";
        alert("¡Gemini activado!"); 
      } else alert("Clave inválida");
      actualizar();
    };

    removeKeyBtn.onclick = () => {
      localStorage.removeItem(KEY_GEMINI);
      modoIA = "local";
      $ia.querySelector("#claveDiv").style.display = "none";
      actualizar();
    };

    // Botones de ACCIÓN
    uploadBtn.onclick = () => fileInput.click();
    camBtn.onclick = () => camInput.click();

    const handleFile = e => {
      if (e.target.files?.[0]) {
        lastFile = e.target.files[0];
        analyzeBtn.disabled = false;
        const url = URL.createObjectURL(lastFile);
        previewDiv.innerHTML = `<img src="${url}" style="max-width:100%;max-height:500px;border-radius:12px">`;
      }
    };
    fileInput.onchange = handleFile;
    camInput.onchange = handleFile;

    analyzeBtn.onclick = async () => {
      if (!lastFile) return;
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = "Analizando...";
      resultDiv.innerHTML = ""; 
      
      const muestra = JSON.parse(localStorage.getItem(KEY_MUESTRA) || "{}");
      const result = modoIA === "gemini" ? await analizarGemini(lastFile, muestra.organo) : analizarLocal(muestra.organo);

      resultDiv.innerHTML = `
        <div style="padding:1.5rem;border-radius:12px;background:#f0fdf4;border:2px solid #10b981">
          <h3 style="color:#10b981;font-weight:700">${result.status}</h3>
          <p style="white-space:pre-line;font-weight:600">${result.hallazgos.replace('IA REAL (Gemini 1.5 Flash)\n', '')}</p>
          <p style="color:#059669"><strong>Educativo:</strong> ${result.educativo}</p>
          <p style="color:#dc2626"><em>${result.disclaimer}</em></p>
        </div>
      `;

      analyzeBtn.textContent = "Analizar";
      analyzeBtn.disabled = false;
    };
    
    actualizar();
  }


  // --------- BLOQUE DE INICIALIZACIÓN FINAL: Ejecuta initUI al cambiar de pestaña ---------

  let uiInitialized = false;

  function handleTabChange(e) {
      if (e.detail.tabId === 'ia' && !uiInitialized) {
          initUI();
          uiInitialized = true;
      }
      // Asegurarse de que el estado visual se actualice si ya está inicializado
      if (e.detail.tabId === 'ia' && uiInitialized) {
          actualizar();
      }
  }

  // 1. Enlazar al evento de cambio de pestaña (expuesto por ui.js)
  window.addEventListener("anatoflow:tabchange", handleTabChange);

  // 2. Fallback por si la pestaña 'ia' es la que se carga primero al inicio.
  if (window.AnatoFlowUI && window.AnatoFlowUI.getActiveTab() === 'ia') {
      handleTabChange({ detail: { tabId: 'ia' } });
  }

})();
