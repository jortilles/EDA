

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
        en una estructura usando funciones.

        REGLAS OBLIGATORIAS:
        - NUNCA devuelvas SQL
        - NUNCA expliques resultados
        - NUNCA respondas con texto descriptivo
        - Llama a "getFields" SOLO si el mensaje describe una consulta de datos
        - Si NO describe una consulta, responde con texto corto pidiendo más información
        - SOLO puedes responder con texto SI no puedes mapear NINGÚN campo
        - JAMÁS inventes tablas o columnas
        - Usa sinónimos y contexto para inferir nombres reales

        Base de datos:
        ${JSON.stringify(schema, null, 2)}
        `;
    }

}