import type { TextProvider, GenerateTextOptions, GenerateTextResult } from './types';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

export class GeminiTextProvider implements TextProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.0-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(options: GenerateTextOptions): Promise<GenerateTextResult> {
    const start = Date.now();
    const modelId = options.model || this.model;
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (options.systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: `[Sistema]: ${options.systemPrompt}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Entendido.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: options.prompt }] });

    const res = await fetch(`${baseUrl}/models/${modelId}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 8192,
          temperature: options.temperature,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message || `Gemini error: HTTP ${res.status}`);
    }

    const data = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
    };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content,
      model: modelId,
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
      totalTokens: data.usageMetadata?.totalTokenCount,
      durationMs: Date.now() - start,
      isCostEstimated: false,
      provider: 'gemini',
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      return { success: true, models: GEMINI_MODELS };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}

export { GEMINI_MODELS };
