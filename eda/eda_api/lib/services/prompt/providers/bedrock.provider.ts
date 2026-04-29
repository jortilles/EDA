import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { IAIProvider, NormalizedMessage, NormalizedTool, NormalizedResponse } from './ai-provider.interface';

export class BedrockProvider implements IAIProvider {

    private client: AnthropicBedrock;
    private model: string;

    constructor(config: Record<string, any>) {
        this.client = new AnthropicBedrock({
            awsAccessKey: config.AWS_ACCESS_KEY,
            awsSecretKey: config.AWS_SECRET_KEY,
            awsRegion: config.AWS_REGION,
        });
        this.model = config.MODEL;
    }

    async complete(messages: NormalizedMessage[], tools: NormalizedTool[]): Promise<NormalizedResponse> {
        const systemMessage = messages.find(m => m.role === 'system')?.content ?? '';
        const userMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        if (tools.length === 0) {
            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: 1024,
                system: systemMessage,
                messages: userMessages,
            });
            const text = response.content
                .filter((block: any) => block.type === 'text')
                .map((block: any) => block.text)
                .join('');
            return { toolCalls: [], text };
        }

        const bedrockTools = tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters as any,
        }));

        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 4096,
            system: systemMessage,
            messages: userMessages,
            tools: bedrockTools,
            tool_choice: { type: 'any' },
        });

        const toolCalls = response.content
            .filter((block: any) => block.type === 'tool_use')
            .map((block: any) => ({
                name: block.name,
                arguments: block.input as Record<string, any>,
            }));

        return { toolCalls };
    }

}
