import Anthropic from '@anthropic-ai/sdk';
import { NormalizedTool } from '../ai-provider.interface';
import { IMCPAIProvider, MCPHistoryMessage, MCPToolCallInfo, MCPTurnResult } from './mcp-ai-provider.interface';

export class AnthropicMCPProvider implements IMCPAIProvider {

    private client: Anthropic;
    private model: string;

    constructor(config: Record<string, any>) {
        this.client = new Anthropic({ apiKey: config.API_KEY });
        this.model = config.MODEL || 'claude-haiku-4-5';
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

        const anthropicTools: Anthropic.Tool[] = tools.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters as Anthropic.Tool['input_schema'],
        }));

        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: maxTokens,
            system,
            messages: this.toAnthropicHistory(history),
            tools: anthropicTools,
        });

        if (response.stop_reason === 'tool_use') {
            const toolCalls: MCPToolCallInfo[] = response.content
                .filter(b => b.type === 'tool_use')
                .map(b => {
                    const block = b as Anthropic.ToolUseBlock;
                    return { id: block.id, name: block.name, arguments: block.input as Record<string, any> };
                });
            return { done: false, toolCalls };
        }

        const text = response.content
            .filter(b => b.type === 'text')
            .map(b => (b as Anthropic.TextBlock).text)
            .join('');
        return { done: true, text };
    }

    private toAnthropicHistory(history: MCPHistoryMessage[]): Anthropic.MessageParam[] {
        const messages: Anthropic.MessageParam[] = [];
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
                const toolUseBlocks = msg.toolCalls.map(tc => ({
                    type: 'tool_use' as const,
                    id: tc.id,
                    name: tc.name,
                    input: tc.arguments,
                }));
                messages.push({ role: 'assistant', content: toolUseBlocks as any });
                i++;
            } else if (msg.type === 'tool_result') {
                // Group consecutive tool_result messages into one user message (Anthropic requirement)
                const toolResults: Anthropic.ToolResultBlockParam[] = [];
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
