import { IMCPAIProvider } from './mcp-ai-provider.interface';
import { AnthropicMCPProvider } from './anthropic.mcp-provider';
import { OpenAIMCPProvider } from './openai.mcp-provider';
import { BedrockMCPProvider } from './bedrock.mcp-provider';
import { QwenMCPProvider } from './qwen.mcp-provider';

export class MCPAIProviderFactory {

    static create(config: Record<string, any>): IMCPAIProvider {
        const { PROVIDER } = config;

        if (PROVIDER === 'openai') return new OpenAIMCPProvider(config);
        if (PROVIDER === 'anthropic') return new AnthropicMCPProvider(config);
        if (PROVIDER === 'bedrock') return new BedrockMCPProvider(config);
        if (PROVIDER === 'qwen') return new QwenMCPProvider(config);

        throw new Error(`Proveedor IA "${PROVIDER}" no soportado para MCP. Opciones válidas: openai, anthropic, bedrock, qwen`);
    }

}
