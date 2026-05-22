import OpenAI from "openai";
import { IAIProvider, NormalizedMessage, NormalizedTool, NormalizedResponse } from './ai-provider.interface';

// Repairs malformed JSON emitted by Qwen: drops mismatched braces/brackets and
// closes any unclosed ones at the end. Handles nested strings and escape sequences.
function repairJson(text: string): string {
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

// Handles the "toolName [...]" or "toolName {...}" format that Qwen sometimes emits
// instead of {"name": ..., "arguments": ...} objects.
function parseNamedToolCalls(text: string): any[] {
    const TOOL_NAMES = ['getFields', 'getFilters', 'getAssistantResponse'];
    const results: any[] = [];

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

const QWEN_FORMAT_INSTRUCTION = `
════════════════════════════════════════
OUTPUT FORMAT (MANDATORY)
════════════════════════════════════════
You MUST respond using ONLY this JSON structure for each tool call:
{"name": "<toolName>", "arguments": {<argumentsObject>}}
For multiple tools, emit one JSON object immediately after another. No explanations, no other text.
`;

function extractJsonObjects(text: string): any[] {
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

export class QwenProvider implements IAIProvider {

    private client: OpenAI;
    private model: string;

    constructor(config: Record<string, any>) {
        this.client = new OpenAI({
            apiKey: config.API_KEY,
            baseURL: config.BASE_URL,
        });
        this.model = config.MODEL;
    }

    async complete(messages: NormalizedMessage[], tools: NormalizedTool[]): Promise<NormalizedResponse> {
        const chatMessages = messages.map(m => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.role === 'system' && tools.length > 0
                ? m.content + QWEN_FORMAT_INSTRUCTION
                : m.content,
        }));

        if (tools.length === 0) {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: chatMessages,
            });
            const text = response.choices[0]?.message?.content ?? '';
            return { toolCalls: [], text };
        }

        const openAITools: OpenAI.Chat.ChatCompletionTool[] = tools.map(tool => ({
            type: "function" as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters as Record<string, unknown>,
            },
        }));

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: chatMessages,
            tools: openAITools,
            tool_choice: "required",
        });

        const message = response.choices[0]?.message;

        console.log('Message.content:.:: ', message.content)

        // Protocol tool_calls (standard OpenAI format)
        const toolCalls = (message?.tool_calls ?? []).map(tc => ({
            name: tc.function.name,
            arguments: (() => {
                try {
                    return typeof tc.function.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments ?? {};
                } catch {
                    return {};
                }
            })(),
        }));

        if (toolCalls.length > 0) return { toolCalls };

        // Fallback: Qwen returns tool calls as JSON text in content instead of tool_calls field.
        // The model may emit multiple separate JSON objects (not wrapped in an array), so we extract
        // each one individually by tracking brace depth.
        const rawContent = message?.content ?? '';
        if (rawContent) {
            const extracted = extractJsonObjects(rawContent);
            const fallbackCalls = extracted
                .filter((c: any) => typeof c.name === 'string' && c.arguments !== undefined)
                .map((c: any) => ({
                    name: c.name as string,
                    arguments: typeof c.arguments === 'string'
                        ? JSON.parse(c.arguments)
                        : c.arguments ?? {},
                }));
            if (fallbackCalls.length > 0) return { toolCalls: fallbackCalls };

            // Second fallback: "toolName [...]" format
            const namedCalls = parseNamedToolCalls(rawContent);
            if (namedCalls.length > 0) return { toolCalls: namedCalls };
        }

        return { toolCalls: [] };
    }

}
