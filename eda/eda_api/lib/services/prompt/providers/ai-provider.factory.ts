import { IAIProvider } from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { BedrockProvider } from './bedrock.provider';
import { QwenProvider } from './qwen.provider';

export class AIProviderFactory {

    static create(config: Record<string, any>): IAIProvider {
        const { PROVIDER } = config;

        if (PROVIDER === 'openai') return new OpenAIProvider(config);
        if (PROVIDER === 'anthropic') return new AnthropicProvider(config);
        if (PROVIDER === 'bedrock') return new BedrockProvider(config);
        if (PROVIDER === 'qwen') return new QwenProvider(config);

        throw new Error(`Proveedor IA "${PROVIDER}" no esta soportado. Opciones validas: openai, anthropic, bedrock, qwen`);
    }

}
