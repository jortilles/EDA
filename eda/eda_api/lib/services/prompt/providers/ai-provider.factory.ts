import { IAIProvider } from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
// import { AnthropicProvider } from './anthropic.provider';

export class AIProviderFactory {

    static create(config: Record<string, any>): IAIProvider {
        const { PROVIDER } = config;

        if (PROVIDER === 'openai') return new OpenAIProvider(config);
        // if (PROVIDER === 'anthropic') return new AnthropicProvider(config);

        throw new Error(`Proveedor IA "${PROVIDER}" no esta soportado. Opciones validas: openai, anthropic`);
    }

}
