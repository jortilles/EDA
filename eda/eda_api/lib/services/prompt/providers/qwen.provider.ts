import OpenAI from "openai";
import { IAIProvider, NormalizedMessage, NormalizedTool, NormalizedResponse } from './ai-provider.interface';
import { QWEN_FORMAT_INSTRUCTION, extractJsonObjects, parseNamedToolCalls } from '../utils/qwen.utils';

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

            // Final fallback: model responded with plain text and no tool call format.
            // Treat it as getAssistantResponse so the service can surface it to the user.
            return {
                toolCalls: [{
                    name: 'getAssistantResponse',
                    arguments: { message: rawContent.trim() }
                }]
            };
        }

        return { toolCalls: [] };
    }

}
