import OpenAI from 'openai';
import { NormalizedTool } from '../ai-provider.interface';
import { IMCPAIProvider, MCPHistoryMessage, MCPToolCallInfo, MCPTurnResult } from './mcp-ai-provider.interface';

export class OpenAIMCPProvider implements IMCPAIProvider {

    private client: OpenAI;
    private model: string;

    constructor(config: Record<string, any>) {
        this.client = new OpenAI({ apiKey: config.API_KEY });
        this.model = config.MODEL || 'gpt-4o-mini';
    }

    async turn(
        systemPrompts: string[],
        history: MCPHistoryMessage[],
        tools: NormalizedTool[],
        maxTokens: number
    ): Promise<MCPTurnResult> {
        const systemMessage: OpenAI.Chat.ChatCompletionSystemMessageParam = {
            role: 'system',
            content: systemPrompts.join('\n\n'),
        };

        const openAITools: OpenAI.Chat.ChatCompletionTool[] = tools.map(t => ({
            type: 'function' as const,
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters as any,
            },
        }));

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            systemMessage,
            ...this.toOpenAIHistory(history),
        ];

        // Force tool use on the first iteration (before any tool_result exists in history).
        // GPT models otherwise answer from training knowledge instead of calling tools.
        const hasToolResults = history.some(m => m.type === 'tool_result');
        const toolChoice = hasToolResults ? 'auto' as const : 'required' as const;

        const response = await this.client.chat.completions.create({
            model: this.model,
            max_tokens: maxTokens,
            messages,
            tools: openAITools,
            tool_choice: toolChoice,
        });

        const choice = response.choices[0];

        if (choice.finish_reason === 'tool_calls') {
            const toolCalls: MCPToolCallInfo[] = (choice.message.tool_calls ?? []).map(tc => ({
                id: tc.id,
                name: tc.function.name,
                arguments: (() => {
                    try { return JSON.parse(tc.function.arguments ?? '{}'); } catch { return {}; }
                })(),
            }));
            return { done: false, toolCalls };
        }

        return { done: true, text: choice.message.content ?? '' };
    }

    private toOpenAIHistory(history: MCPHistoryMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
        for (const msg of history) {
            if (msg.type === 'user') {
                messages.push({ role: 'user', content: msg.content });
            } else if (msg.type === 'assistant') {
                messages.push({ role: 'assistant', content: msg.content });
            } else if (msg.type === 'assistant_tool_calls') {
                messages.push({
                    role: 'assistant',
                    content: null,
                    tool_calls: msg.toolCalls.map(tc => ({
                        id: tc.id,
                        type: 'function' as const,
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.arguments),
                        },
                    })),
                });
            } else if (msg.type === 'tool_result') {
                messages.push({
                    role: 'tool',
                    tool_call_id: msg.toolCallId,
                    content: msg.content,
                });
            }
        }
        return messages;
    }

}
