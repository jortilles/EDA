

export class PromptUtil {
    
    public static isForbidden(message: string) {
        const forbiddenKeywords: string[] = [ "política", "sexo", "hack", "violencia", "pornografía", "droga", "ilegal", "piratería"];
        const msgLower = message.toLowerCase();
        return forbiddenKeywords.some(keyword => msgLower.includes(keyword.toLowerCase()));
    }

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

}