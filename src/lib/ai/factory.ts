import { decrypt } from '@/lib/crypto';
import type { ProviderConnection } from '@/types/database';
import type { TextProvider, ImageProvider } from './types';
import { OpenAITextProvider, OpenAIImageProvider } from './openai';
import { AnthropicTextProvider } from './anthropic';
import { GeminiTextProvider } from './gemini';
import { DeepSeekTextProvider } from './deepseek';

export function createTextProvider(connection: ProviderConnection): TextProvider {
  const apiKey = decrypt(connection.api_key_encrypted);
  const model = connection.model || undefined;
  const endpointUrl = connection.endpoint_url || undefined;

  switch (connection.provider) {
    case 'openai':
      return new OpenAITextProvider(apiKey, model, endpointUrl);
    case 'anthropic':
      return new AnthropicTextProvider(apiKey, model);
    case 'gemini':
      return new GeminiTextProvider(apiKey, model);
    case 'deepseek':
      return new DeepSeekTextProvider(apiKey, model);
    case 'custom':
      // Provedores custom via endpoint OpenAI-compatible
      if (!endpointUrl) throw new Error('Endpoint URL obrigatório para provedor custom');
      return new OpenAITextProvider(apiKey, model || 'default', endpointUrl);
    default:
      throw new Error(`Provedor de texto não suportado: ${connection.provider}`);
  }
}

export function createImageProvider(connection: ProviderConnection): ImageProvider {
  const apiKey = decrypt(connection.api_key_encrypted);
  const model = connection.model || undefined;

  switch (connection.provider) {
    case 'openai':
      return new OpenAIImageProvider(apiKey, model || 'dall-e-3');
    default:
      throw new Error(`Provedor de imagem não suportado: ${connection.provider}`);
  }
}

export const PROVIDER_OPTIONS = {
  text: [
    { value: 'openai', label: 'OpenAI / ChatGPT', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { value: 'anthropic', label: 'Anthropic / Claude', models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-sonnet-latest', 'claude-haiku-3-5', 'claude-3-5-haiku-latest'] },
    { value: 'gemini', label: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
    { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
    { value: 'custom', label: 'Personalizado (OpenAI-compatible)', models: [] },
  ],
  image: [
    { value: 'openai', label: 'OpenAI DALL-E', models: ['dall-e-3', 'dall-e-2'] },
  ],
};
