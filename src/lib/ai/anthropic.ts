import type { TextProvider, GenerateTextOptions, GenerateTextResult } from './types';

const ANTHROPIC_MODELS = [
  'claude-opus-4-5',
  'claude-sonnet-4-5',
  'claude-haiku-3-5',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
];

export class AnthropicTextProvider implements TextProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'claude-3-5-sonnet-latest') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(options: GenerateTextOptions): Promise<GenerateTextResult> {
    const start = Date.now();

    const body: Record<string, unknown> = {
      model: options.model || this.model,
      max_tokens: options.maxTokens || 4096,
      messages: [{ role: 'user', content: options.prompt }],
    };
    if (options.systemPrompt) body.system = options.systemPrompt;
    if (options.temperature !== undefined) body.temperature = options.temperature;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message || `Anthropic error: HTTP ${res.status}`);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      model: string;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const content = data.content.find(c => c.type === 'text')?.text || '';

    return {
      content,
      model: data.model,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      totalTokens: data.usage ? data.usage.input_tokens + data.usage.output_tokens : undefined,
      durationMs: Date.now() - start,
      isCostEstimated: false,
      provider: 'anthropic',
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      // Anthropic não tem endpoint de listagem pública; fazer chamada mínima
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'olá' }],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.status === 401) return { success: false, error: 'Chave de API inválida' };
      if (res.status === 400 || res.ok) return { success: true, models: ANTHROPIC_MODELS };
      return { success: false, error: `HTTP ${res.status}` };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}

export { ANTHROPIC_MODELS };
