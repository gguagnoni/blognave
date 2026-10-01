import { createTextProvider } from '@/lib/ai/factory';
import type { ProviderConnection, ContentJob } from '@/types/database';
import type { GenerateTextResult } from '@/lib/ai/types';

export interface GeneratedArticle {
  title: string;
  slug: string;
  contentHtml: string;
  metaDescription: string;
  excerpt: string;
  wordCount: number;
  rawResult: GenerateTextResult;
}

function buildArticlePrompt(job: ContentJob): { prompt: string; systemPrompt: string } {
  const toneMap: Record<string, string> = {
    conversacional: 'conversacional e amigável',
    tecnico: 'técnico e preciso',
    direto: 'direto e objetivo',
    informativo: 'informativo e educacional',
  };
  const toneLabel = toneMap[job.tone] || job.tone;

  const systemPrompt = `Você é um redator especialista em conteúdo web. Sempre retorne APENAS JSON válido, sem markdown externo.
Escreva conteúdo original, verificável e útil. Não invente URLs, estatísticas sem fonte ou fatos não confirmados.
Não prometa resultados financeiros, de tráfego ou aprovação em programas específicos.`;

  const internalLinksInstructions = job.internal_links_enabled && job.internal_links_config.length > 0
    ? `\nLinks internos obrigatórios (inclua no corpo com <a href>):\n${job.internal_links_config.map(l => `- ${l.title}: ${l.url}`).join('\n')}`
    : '';

  const externalLinksInstructions = job.external_links_enabled && job.external_links_config.length > 0
    ? `\nLinks externos permitidos (use quando relevante):\n${job.external_links_config.map(l => l.url).join('\n')}`
    : '';

  const imageInstructions = job.body_images_enabled && job.body_images_count > 0
    ? `\nInsira ${job.body_images_count} placeholder(s) de imagem no HTML usando: <figure class="wp-block-image"><img src="PLACEHOLDER_IMAGE_${'{n}'}" alt="[descrição]"></figure>`
    : '';

  const prompt = `Escreva um artigo completo sobre o tema: "${job.topic}"\n
Idioma: ${job.language}\nPalavra-chave principal: ${job.main_keyword || job.topic}\nTom: ${toneLabel}\nMeta de palavras: ${job.target_word_count} palavras (aproximado)${job.additional_instructions ? `\nInstruções adicionais: ${job.additional_instructions}` : ''}${internalLinksInstructions}${externalLinksInstructions}${imageInstructions}\n
Retorne APENAS o seguinte JSON:\n{
  "title": "Título SEO otimizado",
  "slug": "slug-sem-acentos-com-hifens",
  "meta_description": "Meta descrição com 120-160 caracteres",
  "excerpt": "Resumo curto do artigo com 1-2 frases",
  "content_html": "<article>...HTML completo com h2, h3, p, ul, ol, blockquote...incluindo os links solicitados...</article>"
}`;

  return { prompt, systemPrompt };
}

export async function generateArticleContent(
  job: ContentJob,
  provider: ProviderConnection
): Promise<GeneratedArticle> {
  const textProvider = createTextProvider(provider);
  const { prompt, systemPrompt } = buildArticlePrompt(job);

  const result = await textProvider.generate({
    prompt,
    systemPrompt,
    maxTokens: Math.max(4096, job.target_word_count * 2),
    temperature: 0.7,
  });

  let parsed: {
    title?: string;
    slug?: string;
    meta_description?: string;
    excerpt?: string;
    content_html?: string;
  };

  try {
    // Tentar extrair JSON mesmo se houver wrapper
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
  } catch {
    throw new Error('Resposta da IA não é JSON válido. Tente novamente.');
  }

  if (!parsed.title || !parsed.content_html) {
    throw new Error('Artigo gerado incompleto. Campos obrigatórios ausentes.');
  }

  // Contar palavras no HTML (remover tags)
  const textContent = parsed.content_html.replace(/<[^>]+>/g, ' ');
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

  // Gerar slug se não veio
  const slug = parsed.slug || parsed.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  return {
    title: parsed.title,
    slug,
    contentHtml: parsed.content_html,
    metaDescription: parsed.meta_description || '',
    excerpt: parsed.excerpt || '',
    wordCount,
    rawResult: result,
  };
}

export function buildImagePrompt(job: ContentJob, context: string): string {
  const base = job.image_instructions
    ? `${job.image_instructions}. Contexto: ${context}`
    : `Imagem para artigo: ${context}. Tema: ${job.topic}`;
  const style = job.image_style ? `, estilo: ${job.image_style}` : '';
  return `${base}${style}. Alta qualidade, sem texto ou letras na imagem.`;
}
