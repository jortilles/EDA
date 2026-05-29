// Shared parsing utilities for Qwen providers.
// Qwen (via Ollama) emits tool calls as text in message.content instead of
// using the standard tool_calls protocol field.

export const QWEN_FORMAT_INSTRUCTION = `
════════════════════════════════════════
OUTPUT FORMAT — READ THIS FIRST
════════════════════════════════════════
You are a function-calling engine. You MUST ONLY output raw JSON tool calls. NEVER write summaries, explanations, or natural language descriptions.

CORRECT output for a data query:
{"name": "getFields", "arguments": {"limit": 5000, "tables": [{"table": "customers", "columns": [{"column": "city", "column_type": "text", "ordenation_type": "No", "ia_visibility": "FULL"}]}]}}
{"name": "getFilters", "arguments": {"filters": [{"table": "customers", "column": "country", "column_type": "text", "values": ["Spain"], "filter_type": "="}]}}

WRONG — never do this:
"Se ha configurado la consulta para obtener... Tabla: customers Campos seleccionados: • city Filtros: • country = Spain"

One JSON object per tool call. Nothing else.
════════════════════════════════════════
`;

// Repairs malformed JSON: drops mismatched braces/brackets and closes unclosed ones.
export function repairJson(text: string): string {
    const stack: string[] = [];
    let result = '';
    let inString = false;
    let escape = false;
    for (const ch of text) {
        if (escape) { result += ch; escape = false; continue; }
        if (ch === '\\' && inString) { result += ch; escape = true; continue; }
        if (ch === '"') { inString = !inString; result += ch; continue; }
        if (inString) { result += ch; continue; }
        if (ch === '{' || ch === '[') { stack.push(ch); result += ch; }
        else if (ch === '}') { if (stack[stack.length - 1] === '{') { stack.pop(); result += ch; } }
        else if (ch === ']') { if (stack[stack.length - 1] === '[') { stack.pop(); result += ch; } }
        else { result += ch; }
    }
    while (stack.length > 0) result += stack.pop() === '{' ? '}' : ']';
    return result;
}

// Extracts top-level JSON objects from text, repairing malformed ones.
export function extractJsonObjects(text: string): any[] {
    const results: any[] = [];
    let depth = 0;
    let start = -1;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (text[i] === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
                const slice = text.slice(start, i + 1);
                try {
                    results.push(JSON.parse(slice));
                } catch {
                    try { results.push(JSON.parse(repairJson(slice))); } catch { }
                }
                start = -1;
            }
        }
    }
    return results;
}

// Handles the "toolName [...]" or "toolName {...}" format that Qwen sometimes emits.
export function parseNamedToolCalls(text: string): { name: string; arguments: Record<string, any> }[] {
    const TOOL_NAMES = ['getFields', 'getFilters', 'getAssistantResponse'];
    const results: { name: string; arguments: Record<string, any> }[] = [];

    for (const name of TOOL_NAMES) {
        const idx = text.indexOf(name);
        if (idx === -1) continue;

        let argStart = -1;
        let openChar = '';
        for (let i = idx + name.length; i < text.length; i++) {
            const ch = text[i];
            if (ch === '[' || ch === '{') { argStart = i; openChar = ch; break; }
            if (ch !== ' ' && ch !== '\n' && ch !== '\r' && ch !== '\t') break;
        }
        if (argStart === -1) continue;

        const closeChar = openChar === '[' ? ']' : '}';
        let depth = 0;
        let argEnd = -1;
        let inStr = false;
        let esc = false;
        for (let i = argStart; i < text.length; i++) {
            const ch = text[i];
            if (esc) { esc = false; continue; }
            if (ch === '\\' && inStr) { esc = true; continue; }
            if (ch === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (ch === openChar) depth++;
            else if (ch === closeChar) { depth--; if (depth === 0) { argEnd = i; break; } }
        }
        if (argEnd === -1) continue;

        const slice = text.slice(argStart, argEnd + 1);
        let parsed: any;
        try { parsed = JSON.parse(slice); } catch {
            try { parsed = JSON.parse(repairJson(slice)); } catch { continue; }
        }

        let args: Record<string, any>;
        if (name === 'getFields') {
            const tables = Array.isArray(parsed) ? parsed : (parsed.tables ?? [parsed]);
            args = { limit: parsed.limit ?? 5000, tables };
        } else if (name === 'getFilters') {
            args = { filters: Array.isArray(parsed) ? parsed : (parsed.filters ?? [parsed]) };
        } else {
            args = typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { message: String(parsed) };
        }
        results.push({ name, arguments: args });
    }
    return results;
}
