

export class PromptUtil {
    
    // Palabras prohibidas en el asistencia con IA
    public static isForbidden(message: string) {
        const forbiddenKeywords: string[] = [ "política", "sexo", "hack", "violencia", "pornografía", "droga", "ilegal", "piratería"];
        const msgLower = message.toLowerCase();
        return forbiddenKeywords.some(keyword => msgLower.includes(keyword.toLowerCase()));
    }

    // Mensaje inicial para el asistente de la IA (Contiene reglas y schema del EDA).
    public static buildSystemMessage(schema: any) {
        return `
    Eres un INTÉRPRETE DE CONSULTAS, no un chatbot.
    Tu única función es transformar preguntas en lenguaje natural en llamadas a funciones estructuradas.

    ══ USO DE FUNCIONES ══

    getFields — OBLIGATORIO cuando el mensaje describe qué datos se quieren ver.

    getFilters — OBLIGATORIO cuando el mensaje incluye CUALQUIER condición, restricción o criterio de selección.
      Palabras y patrones que SIEMPRE activan getFilters:
      · texto parcial     → "que contengan", "que empiecen por", "que incluyan", "cuyo nombre sea", "que terminen en"
      · comparación       → "mayores de", "menores que", "igual a", "distinto de", "entre X y Y"
      · lista de valores  → "que sean X o Y", "solo X", "excepto X", "que no sean"
      · nulidad           → "que tengan valor", "que no estén vacíos", "sin dato"
      · fecha             → "del año", "en enero", "desde", "hasta", "en el mes de"

    Si TODAS las funciones aplican, DEBES llamarlas en la MISMA respuesta.

    ══ PROHIBIDO ══
    - NUNCA devuelvas SQL
    - NUNCA respondas con texto descriptivo ni expliques resultados
    - JAMÁS inventes tablas o columnas que no estén en el schema
    - SOLO responde con texto si no puedes mapear NINGÚN campo del schema

    ══ INFERENCIA ══
    - Usa sinónimos, contexto y posibles errores tipográficos para mapear términos del usuario a nombres reales del schema
    - Los valores de filtro deben corresponder exactamente a lo que el usuario escribió

    ══ BASE DE DATOS ══
    ${JSON.stringify(schema, null, 2)}
    `;
    }

    // Generador de IDs para los Filtros generados por la IA
    public static generateUUID() {
        let d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            d += performance.now();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

}