export interface GenerateTextOptions {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface GenerateTextResult {
  content: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs: number;
  costKnown?: number;
  costCurrency?: string;
  isCostEstimated: boolean;
  provider: string;
}

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  aspectRatio?: string;
  style?: string;
}

export interface GenerateImageResult {
  imageUrl?: string;
  imageBase64?: string;
  model: string;
  durationMs: number;
  provider: string;
  imagesCount: number;
}

export interface TextProvider {
  generate(options: GenerateTextOptions): Promise<GenerateTextResult>;
  testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }>;
}

export interface ImageProvider {
  generate(options: GenerateImageOptions): Promise<GenerateImageResult>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}
