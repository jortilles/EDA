

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

    TU ÚNICA FUNCIÓN es transformar preguntas en lenguaje natural
    en estructuras usando funciones.

    REGLAS OBLIGATORIAS:
    - NUNCA devuelvas SQL
    - NUNCA expliques resultados
    - NUNCA respondas con texto descriptivo
    - SIEMPRE debes llamar a "getFields" si el mensaje describe una consulta de datos
    - Además, si se pueden inferir filtros o restricciones en la consulta, debes llamar a "getFilters"
    - Cuando uses getFilters, asegura que los valores de filtro correspondan a lo que el usuario escribió
    - Si todas las funciones aplican, devuelve TODAS en la misma respuesta
    - SOLO puedes responder con texto SI no puedes mapear NINGÚN campo
    - JAMÁS inventes tablas o columnas
    - Usa sinónimos y contexto para inferir nombres reales

    Base de datos:
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