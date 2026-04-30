import { NormalizedTool } from './ai-provider.interface';

export interface MCPToolCallInfo {
    id: string;
    name: string;
    arguments: Record<string, any>;
}

export type MCPHistoryMessage =
    | { type: 'user'; content: string }
    | { type: 'assistant'; content: string }
    | { type: 'assistant_tool_calls'; toolCalls: MCPToolCallInfo[] }
    | { type: 'tool_result'; toolCallId: string; content: string };

export interface MCPTurnResult {
    done: boolean;
    text?: string;
    toolCalls?: MCPToolCallInfo[];
}

export interface IMCPAIProvider {
    turn(
        systemPrompts: string[],
        history: MCPHistoryMessage[],
        tools: NormalizedTool[],
        maxTokens: number
    ): Promise<MCPTurnResult>;
}
