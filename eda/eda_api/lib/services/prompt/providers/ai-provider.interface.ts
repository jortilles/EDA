
// Contrato común

export interface NormalizedMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface NormalizedTool {
    name: string;
    description: string;
    parameters: object;   // JSON Schema estándar — todos lo entienden
    strict?: boolean;
}

export interface NormalizedToolCall {
    name: string;
    arguments: Record<string, any>;  // ya parseado a objeto, no string
}

export interface NormalizedResponse {
    toolCalls: NormalizedToolCall[];
    text?: string;
}

export interface IAIProvider {
    complete(
        messages: NormalizedMessage[],
        tools: NormalizedTool[]
    ): Promise<NormalizedResponse>;
}
