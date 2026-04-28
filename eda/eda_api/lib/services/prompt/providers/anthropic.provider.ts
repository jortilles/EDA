import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider, NormalizedMessage, NormalizedTool, NormalizedResponse } from './ai-provider.interface';

export class AnthropicProvider implements IAIProvider {

    private client: Anthropic;
    private model: string;

    constructor(config: Record<string, any>) {
        this.client = new Anthropic({ apiKey: config.API_KEY });
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
                .filter(block => block.type === 'text')
                .map(block => (block as Anthropic.TextBlock).text)
                .join('');
            return { toolCalls: [], text };
        }

        const anthropicTools: Anthropic.Tool[] = tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters as Anthropic.Tool['input_schema'],
        }));

        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 4096,
            system: systemMessage,
            messages: userMessages,
            tools: anthropicTools,
            tool_choice: { type: 'any' },
        });

        const toolCalls = response.content
            .filter(block => block.type === 'tool_use')
            .map(block => {
                const toolBlock = block as Anthropic.ToolUseBlock;
                return {
                    name: toolBlock.name,
                    arguments: toolBlock.input as Record<string, any>,
                };
            });

        return { toolCalls };
    }

}
