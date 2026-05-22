import OpenAI from 'openai';
import { NormalizedTool } from '../ai-provider.interface';
import { IMCPAIProvider, MCPHistoryMessage, MCPToolCallInfo, MCPTurnResult } from './mcp-ai-provider.interface';
import { QWEN_FORMAT_INSTRUCTION, extractJsonObjects, parseNamedToolCalls } from '../../utils/qwen.utils';

export class QwenMCPProvider implements IMCPAIProvider {

    private client: OpenAI;
    private model: string;

    constructor(config: Record<string, any>) {
        this.client = new OpenAI({ apiKey: config.API_KEY, baseURL: config.BASE_URL });
        this.model = config.MODEL;
    }

    async turn(
        systemPrompts: string[],
        history: MCPHistoryMessage[],
        tools: NormalizedTool[],
        maxTokens: number
    ): Promise<MCPTurnResult> {
        const systemContent = systemPrompts.join('\n\n') + QWEN_FORMAT_INSTRUCTION;

        const openAITools: OpenAI.Chat.ChatCompletionTool[] = tools.map(t => ({
            type: 'function' as const,
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters as Record<string, unknown>,
            },
        }));

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemContent },
            ...this.toQwenHistory(history),
        ];

        const response = await this.client.chat.completions.create({
            model: this.model,
            max_tokens: maxTokens,
            messages,
            tools: openAITools,
            tool_choice: 'auto',
        });

        const message = response.choices[0]?.message;

        // Protocol tool_calls (standard OpenAI format)
        if (message?.tool_calls?.length) {
            const toolCalls: MCPToolCallInfo[] = message.tool_calls.map(tc => ({
                id: tc.id,
                name: tc.function.name,
                arguments: (() => {
                    try { return JSON.parse(tc.function.arguments ?? '{}'); } catch { return {}; }
                })(),
            }));
            return { done: false, toolCalls };
        }

        const rawContent = message?.content ?? '';

        // Fallback: {"name": ..., "arguments": ...} objects in content
        const extracted = extractJsonObjects(rawContent);
        const jsonCalls = extracted.filter((c: any) => typeof c.name === 'string' && c.arguments !== undefined);
        if (jsonCalls.length > 0) {
            const toolCalls: MCPToolCallInfo[] = jsonCalls.map((c: any, i: number) => ({
                id: `qwen-${Date.now()}-${i}`,
                name: c.name as string,
                arguments: typeof c.arguments === 'string' ? JSON.parse(c.arguments) : c.arguments ?? {},
            }));
            return { done: false, toolCalls };
        }

        // Fallback: "toolName [...]" format
        const namedCalls = parseNamedToolCalls(rawContent);
        if (namedCalls.length > 0) {
            const toolCalls: MCPToolCallInfo[] = namedCalls.map((c, i) => ({
                id: `qwen-${Date.now()}-${i}`,
                name: c.name,
                arguments: c.arguments,
            }));
            return { done: false, toolCalls };
        }

        return { done: true, text: rawContent };
    }

    // Qwen doesn't use the tool_calls protocol, so assistant_tool_calls are rendered
    // as JSON content and tool_results are injected as user messages.
    private toQwenHistory(history: MCPHistoryMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
        for (const msg of history) {
            if (msg.type === 'user') {
                messages.push({ role: 'user', content: msg.content });
            } else if (msg.type === 'assistant') {
                messages.push({ role: 'assistant', content: msg.content });
            } else if (msg.type === 'assistant_tool_calls') {
                const content = msg.toolCalls
                    .map(tc => JSON.stringify({ name: tc.name, arguments: tc.arguments }))
                    .join('\n');
                messages.push({ role: 'assistant', content });
            } else if (msg.type === 'tool_result') {
                messages.push({ role: 'user', content: `Tool result:\n${msg.content}` });
            }
        }
        return messages;
    }

}
