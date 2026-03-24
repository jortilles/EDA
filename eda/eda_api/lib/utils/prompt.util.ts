

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
      Words and patterns that ALWAYS trigger getFilters (English / Spanish):
      · partial text      → "that contain" / "que contiene", "that start with" / "que empieza por", "whose name is" / "cuyo nombre es"
      · comparison        → "greater than" / "mayor que", "less than" / "menor que", "equal to" / "igual a", "not equal to" / "distinto de", "between X and Y" / "entre X e Y"
      · list of values    → "that are X or Y" / "que sean X o Y", "only X" / "solo X", "except X" / "excepto X", "that are not" / "que no sean"
      · nullability       → "that have a value" / "que tienen valor", "that are not empty" / "que no están vacíos", "with no data" / "sin datos"
      · date              → "from the year" / "del año", "in January" / "en enero", "from" / "desde", "until" / "hasta", "in the month of" / "en el mes de"

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