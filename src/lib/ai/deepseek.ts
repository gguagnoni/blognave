import type { TextProvider, GenerateTextOptions, GenerateTextResult } from './types';

const DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-reasoner'];

export class DeepSeekTextProvider implements TextProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'deepseek-chat') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(options: GenerateTextOptions): Promise<GenerateTextResult> {
    const start = Date.now();
    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: options.prompt });

    const res = await fetch('https://api.deepseek.com/chat/completions', {
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
      throw new Error(err.error?.message || `DeepSeek error: HTTP ${res.status}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      durationMs: Date.now() - start,
      isCostEstimated: false,
      provider: 'deepseek',
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      const res = await fetch('https://api.deepseek.com/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      return { success: true, models: DEEPSEEK_MODELS };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}

export { DEEPSEEK_MODELS };
