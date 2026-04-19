import OpenAI from "openai";
import { IAIProvider, NormalizedMessage, NormalizedTool, NormalizedResponse } from './ai-provider.interface';

export class OpenAIProvider implements IAIProvider {

    private client: OpenAI;
    private model: string;

    constructor(config: Record<string, any>) {
        this.client = new OpenAI({ apiKey: config.API_KEY });
        this.model = config.MODEL;
    }

    async complete(messages: NormalizedMessage[], tools: NormalizedTool[]): Promise<NormalizedResponse> {
        const openAITools = tools.map(tool => ({
            type: "function" as const,
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters as any,
            strict: tool.strict ?? false,
        }));

        const response: any = await this.client.responses.create({
            model: this.model,
            input: messages,
            tools: openAITools,
            tool_choice: "required",
        });

        const toolCalls = (response.output ?? [])
            .filter((item: any) => item.type === "function_call")
            .map((item: any) => ({
                name: item.name,
                arguments: typeof item.arguments === 'string'
                    ? JSON.parse(item.arguments)
                    : item.arguments ?? {},
            }));

        return { toolCalls };
    }

}