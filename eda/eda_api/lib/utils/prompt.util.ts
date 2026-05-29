

export class PromptUtil {
    
    // Palabras prohibidas en el asistencia con IA
    public static isForbidden(message: string) {
        const forbiddenKeywords: string[] = [ "política", "sexo", "hack", "violencia", "pornografía", "droga", "ilegal", "piratería"];
        const msgLower = message.toLowerCase();
        return forbiddenKeywords.some(keyword => msgLower.includes(keyword.toLowerCase()));
    }

    // Initial system message for the AI assistant (contains rules and EDA schema).
    public static buildSystemMessage(schema: any) {
        const tableList = schema.map((t: any) => `"${t.table}"`).join(', ');
        const schemaLines = schema.map((t: any) => {
            const cols = t.columns.map((c: any) =>
                `    - ${c.column} (${c.column_type})${c.description ? `: ${c.description}` : ''}`
            ).join('\n');
            return `  TABLE "${t.table}"${t.description ? ` — ${t.description}` : ''}:\n${cols}`;
        }).join('\n\n');

        return `
You are a QUERY INTERPRETER, not a chatbot.
Your only job is to transform natural language questions into structured function calls.

════════════════════════════════════════
DATABASE SCHEMA — THE ONLY VALID SOURCE
════════════════════════════════════════
VALID TABLES: ${tableList}
ANY table name not in this list DOES NOT EXIST. Do NOT invent or guess table names.
ANY column name not listed under its table DOES NOT EXIST. Do NOT invent or guess column names.

${schemaLines}

════════════════════════════════════════
FUNCTION USAGE
════════════════════════════════════════
getFields — REQUIRED whenever the message describes what data the user wants to see.

getFilters — REQUIRED whenever the message includes ANY condition, restriction, or selection criteria.
  Words and patterns that ALWAYS trigger getFilters (English / Spanish):
  · partial text   → "that contain" / "que contiene", "that start with" / "que empieza por", "whose name is" / "cuyo nombre es"
  · comparison     → "greater than" / "mayor que", "less than" / "menor que", "equal to" / "igual a", "not equal to" / "distinto de", "between X and Y" / "entre X e Y"
  · list of values → "that are X or Y" / "que sean X o Y", "only X" / "solo X", "except X" / "excepto X", "that are not" / "que no sean"
  · nullability    → "that have a value" / "que tienen valor", "that are not empty" / "que no están vacíos", "with no data" / "sin datos"
  · date           → "from the year" / "del año", "in January" / "en enero", "from" / "desde", "until" / "hasta", "in the month of" / "en el mes de"

If ALL functions apply, call them in the SAME response.

════════════════════════════════════════
RULES
════════════════════════════════════════
- NEVER use a table or column that is not listed in the schema above
- NEVER return SQL
- NEVER respond with descriptive text or explain results
- ONLY respond with text if you cannot map ANY field from the schema
- Use synonyms, context, and possible typos to map user terms to real schema names
- Filter values must match exactly what the user wrote
- PREFER text/name columns over numeric ID columns when the user refers to an entity by name
- If the name column is in a different table than the metric, include that table so the join can be resolved
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