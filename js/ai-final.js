// La función analizarGemini CORREGIDA para el error 404
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
    // ⭐️ CORRECCIÓN CLAVE: Se cambió el ":" por "/" en la URL para el endpoint generateContent
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
    // Aseguramos que los campos educativos y de descargo de responsabilidad estén presentes
    return { 
      status: "Error", 
      hallazgos: "Error temporal – modo local activo. Verifica clave Gemini.",
      educativo: "No disponible en modo local.",
      disclaimer: "Fallo de comunicación con la IA. El modo local no proporciona análisis educativo.",
    };
  }
}
