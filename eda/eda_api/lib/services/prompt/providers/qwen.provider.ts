import OpenAI from "openai";
import { IAIProvider, NormalizedMessage, NormalizedTool, NormalizedResponse } from './ai-provider.interface';

export class QwenProvider implements IAIProvider {

    private client: OpenAI;
    private model: string;

    constructor(config: Record<string, any>) {
        this.client = new OpenAI({
            apiKey: config.API_KEY || 'ollama',
            baseURL: config.BASE_URL,
        });
        this.model = config.MODEL;
    }

    async complete(messages: NormalizedMessage[], tools: NormalizedTool[]): Promise<NormalizedResponse> {
        if (tools.length === 0) {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: messages as any,
            });
            const text = response.choices[0]?.message?.content ?? '';
            return { toolCalls: [], text };
        }

        const openAITools: OpenAI.Chat.ChatCompletionTool[] = tools.map(tool => ({
            type: "function" as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters as any,
            },
        }));

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: messages as any,
            tools: openAITools,
            tool_choice: "required",
        });

        const choice = response.choices[0];
        if (choice.finish_reason === 'tool_calls') {
            const toolCalls = (choice.message.tool_calls ?? []).map(tc => ({
                name: tc.function.name,
                arguments: (() => {
                    try { return JSON.parse(tc.function.arguments ?? '{}'); } catch { return {}; }
                })(),
            }));
            return { toolCalls };
        }

        return { toolCalls: [], text: choice.message.content ?? '' };
    }

}