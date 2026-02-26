

export class PromptUtil {
    
    // Palabras prohibidas en el asistencia con IA
    public static isForbidden(message: string) {
        const forbiddenKeywords: string[] = [ "política", "sexo", "hack", "violencia", "pornografía", "droga", "ilegal", "piratería"];
        const msgLower = message.toLowerCase();
        return forbiddenKeywords.some(keyword => msgLower.includes(keyword.toLowerCase()));
    }

    // Initial system message for the AI assistant (contains rules and EDA schema).
    public static buildSystemMessage(schema: any) {
        return `
    You are a QUERY INTERPRETER, not a chatbot.
    Your only job is to transform natural language questions into structured function calls.

    ══ FUNCTION USAGE ══

    getFields — REQUIRED whenever the message describes what data the user wants to see.

    getFilters — REQUIRED whenever the message includes ANY condition, restriction, or selection criteria.
      Words and patterns that ALWAYS trigger getFilters:
      · partial text      → "that contain", "that start with", "that include", "whose name is", "that end with"
      · comparison        → "greater than", "less than", "equal to", "not equal to", "between X and Y"
      · list of values    → "that are X or Y", "only X", "except X", "that are not"
      · nullability       → "that have a value", "that are not empty", "with no data"
      · date              → "from the year", "in January", "from", "until", "in the month of"

    If ALL functions apply, you MUST call them in the SAME response.

    ══ RESTRICTIONS ══
    - NEVER return SQL
    - NEVER respond with descriptive text or explain results
    - NEVER make up tables or columns that are not in the schema
    - ONLY respond with text if you cannot map ANY field from the schema

    ══ INFERENCE ══
    - Use synonyms, context, and possible typos to map user terms to real schema names
    - Filter values must match exactly what the user wrote

    ══ DATABASE ══
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