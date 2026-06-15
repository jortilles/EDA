import OpenAI from 'openai';
import { IAIProvider, NormalizedMessage, NormalizedTool, NormalizedResponse } from './ai-provider.interface';

export class CopilotProvider implements IAIProvider {

    private client: OpenAI;
    private model: string;

    constructor(config: Record<string, any>) {
        // Azure OpenAI endpoint: https://<resource>.openai.azure.com/openai/deployments/<deployment>
        const baseURL = config.BASE_URL
            ?? `https://${config.RESOURCE_NAME}.openai.azure.com/openai/deployments/${config.DEPLOYMENT_NAME}`;

        this.client = new OpenAI({
            apiKey: config.API_KEY,
            baseURL,
            defaultQuery: { 'api-version': config.API_VERSION ?? '2024-02-15-preview' },
            defaultHeaders: { 'api-key': config.API_KEY },
        });

        // In Azure the model is the deployment name, not a model string
        this.model = config.DEPLOYMENT_NAME ?? config.MODEL ?? 'gpt-4o';
    }

    async complete(messages: NormalizedMessage[], tools: NormalizedTool[]): Promise<NormalizedResponse> {
        const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map(m => ({
            role: m.role,
            content: m.content,
        }));

        if (tools.length === 0) {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: chatMessages,
            });
            return { toolCalls: [], text: response.choices[0]?.message?.content ?? '' };
        }

        const openAITools: OpenAI.Chat.ChatCompletionTool[] = tools.map(t => ({
            type: 'function' as const,
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters as any,
            },
        }));

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: chatMessages,
            tools: openAITools,
            tool_choice: 'required',
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
