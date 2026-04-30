import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { NormalizedTool } from './ai-provider.interface';
import { IMCPAIProvider, MCPHistoryMessage, MCPToolCallInfo, MCPTurnResult } from './mcp-ai-provider.interface';

export class BedrockMCPProvider implements IMCPAIProvider {

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

    async turn(
        systemPrompts: string[],
        history: MCPHistoryMessage[],
        tools: NormalizedTool[],
        maxTokens: number
    ): Promise<MCPTurnResult> {
        const system = systemPrompts.map((text, i) => ({
            type: 'text' as const,
            text,
            ...(i === systemPrompts.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
        }));

        const bedrockTools = tools.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters as any,
        }));

        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: maxTokens,
            system,
            messages: this.toAnthropicHistory(history),
            tools: bedrockTools,
        } as any);

        if (response.stop_reason === 'tool_use') {
            const toolCalls: MCPToolCallInfo[] = (response.content as any[])
                .filter((b: any) => b.type === 'tool_use')
                .map((b: any) => ({ id: b.id, name: b.name, arguments: b.input as Record<string, any> }));
            return { done: false, toolCalls };
        }

        const text = (response.content as any[])
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text)
            .join('');
        return { done: true, text };
    }

    private toAnthropicHistory(history: MCPHistoryMessage[]): any[] {
        const messages: any[] = [];
        let i = 0;
        while (i < history.length) {
            const msg = history[i];
            if (msg.type === 'user') {
                messages.push({ role: 'user', content: msg.content });
                i++;
            } else if (msg.type === 'assistant') {
                messages.push({ role: 'assistant', content: msg.content });
                i++;
            } else if (msg.type === 'assistant_tool_calls') {
                messages.push({
                    role: 'assistant',
                    content: msg.toolCalls.map(tc => ({
                        type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments,
                    })),
                });
                i++;
            } else if (msg.type === 'tool_result') {
                const toolResults: any[] = [];
                while (i < history.length && history[i].type === 'tool_result') {
                    const r = history[i] as { type: 'tool_result'; toolCallId: string; content: string };
                    toolResults.push({ type: 'tool_result', tool_use_id: r.toolCallId, content: r.content });
                    i++;
                }
                messages.push({ role: 'user', content: toolResults });
            } else {
                i++;
            }
        }
        return messages;
    }

}
