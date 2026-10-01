import type { TextProvider, ImageProvider, GenerateTextOptions, GenerateTextResult, GenerateImageOptions, GenerateImageResult } from './types';

const OPENAI_MODELS_TEXT = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
const OPENAI_MODELS_IMAGE = ['dall-e-3', 'dall-e-2'];

export class OpenAITextProvider implements TextProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o-mini', baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async generate(options: GenerateTextOptions): Promise<GenerateTextResult> {
    const start = Date.now();
    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: options.prompt });

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: options.model || this.model,
        messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message || `OpenAI error: HTTP ${res.status}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    const durationMs = Date.now() - start;

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      durationMs,
      isCostEstimated: false,
      provider: 'openai',
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      return { success: true, models: OPENAI_MODELS_TEXT };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}

export class OpenAIImageProvider implements ImageProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'dall-e-3') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(options: GenerateImageOptions): Promise<GenerateImageResult> {
    const start = Date.now();
    const size = options.size || '1024x1024';

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: options.model || this.model,
        prompt: options.prompt,
        n: 1,
        size,
        quality: options.quality || 'standard',
        response_format: 'url',
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message || `DALL-E error: HTTP ${res.status}`);
    }

    const data = await res.json() as { data: Array<{ url: string }> };
    return {
      imageUrl: data.data[0]?.url,
      model: options.model || this.model,
      durationMs: Date.now() - start,
      provider: 'openai',
      imagesCount: 1,
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok ? { success: true } : { success: false, error: `HTTP ${res.status}` };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}

export { OPENAI_MODELS_TEXT, OPENAI_MODELS_IMAGE };
