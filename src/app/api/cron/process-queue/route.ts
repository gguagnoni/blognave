import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { generateArticleContent, buildImagePrompt } from '@/lib/content-generator';
import { createTextProvider, createImageProvider } from '@/lib/ai/factory';
import { uploadMediaToWordPress, publishToWordPress } from '@/lib/wordpress';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  // Verificar segredo do cron (middleware já verifica, mas dupla verificação)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  try {
    // Buscar jobs prontos para processar (queued sem data futura, ou scheduled vencidos)
    // Usar FOR UPDATE SKIP LOCKED via RPC não é suportado no Supabase diretamente
    // Alternativa: buscar 1 job por vez e fazer UPDATE atômico
    const { data: jobs } = await supabase
      .from('content_jobs')
      .select('id, status, scheduled_at, attempt_count')
      .or(`and(status.eq.queued,auto_publish.eq.true),and(status.eq.scheduled,scheduled_at.lte.${now})`)
      .lt('attempt_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(3);

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ processed: 0, message: 'Nenhum job na fila' });
    }

    let processed = 0;

    for (const job of jobs) {
      // Tentar adquirir o job atomicamente (mudando status para publishing)
      const { data: acquired } = await supabase
        .from('content_jobs')
        .update({ status: 'publishing', publishing_at: now })
        .eq('id', job.id)
        .in('status', ['queued', 'scheduled'])
        .select('id')
        .single();

      if (!acquired) continue; // Outro worker pegou este job

      try {
        await processJob(job.id, supabase);
        processed++;
      } catch (err) {
        console.error(`Erro ao processar job ${job.id}:`, err);
        // O erro já foi tratado dentro de processJob
      }
    }

    return NextResponse.json({ processed, message: `${processed} job(s) processado(s)` });
  } catch (err) {
    console.error('Cron process-queue error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function processJob(jobId: string, supabase: ReturnType<typeof createAdminClient>) {
  const now = new Date().toISOString();

  // Buscar job completo
  const { data: job } = await supabase
    .from('content_jobs')
    .select(`
      *,
      sites!inner(id, site_url, wp_username, wp_credential_encrypted, timezone),
      provider_connections:provider_text_id(*),
      image_provider:provider_image_id(*)
    `)
    .eq('id', jobId)
    .single();

  if (!job) return;

  const site = job.sites as { id: string; site_url: string; wp_username: string; wp_credential_encrypted: string; timezone: string };
  const textProvider = job.provider_connections as { id: string; api_key_encrypted: string; provider: string; model: string | null; endpoint_url: string | null; provider_type: string; name: string; parameters: Record<string, unknown>; capabilities: Record<string, unknown>; validation_status: string; validation_error: string | null; last_validated_at: string | null; is_active: boolean; created_at: string; updated_at: string } | null;

  try {
    // PASSO 1: Gerar texto (se ainda não gerado)
    if (!job.content_html || !job.title) {
      await supabase.from('content_jobs').update({ status: 'generating_text', generating_text_at: now }).eq('id', jobId);
      await logJobEvent(supabase, jobId, job.status, 'generating_text', 'Gerando texto com IA...');

      if (!textProvider) throw new Error('Provedor de texto não configurado');

      const start = Date.now();
      const article = await generateArticleContent(job, textProvider);

      // Salvar conteúdo gerado
      await supabase.from('content_jobs').update({
        title: article.title,
        content_html: article.contentHtml,
        slug: article.slug,
        meta_description: article.metaDescription,
        excerpt: article.excerpt,
        actual_word_count: article.wordCount,
      }).eq('id', jobId);

      // Registrar uso
      await supabase.from('api_usage_events').insert({
        provider_id: job.provider_text_id,
        site_id: job.site_id,
        job_id: jobId,
        call_type: 'text_generation',
        provider_name: textProvider.provider,
        model: article.rawResult.model,
        input_tokens: article.rawResult.inputTokens,
        output_tokens: article.rawResult.outputTokens,
        total_tokens: article.rawResult.totalTokens,
        duration_ms: article.rawResult.durationMs,
        status: 'success',
      });

      await logJobEvent(supabase, jobId, 'generating_text', 'generating_text',
        `Texto gerado: ${article.wordCount} palavras, meta: ${job.target_word_count}`);
    }

    // Recarregar job atualizado
    const { data: updatedJob } = await supabase
      .from('content_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (!updatedJob) throw new Error('Job não encontrado após geração de texto');

    // PASSO 2: Gerar imagens (se habilitado)
    let featuredMediaId: number | undefined;

    if (updatedJob.featured_image_enabled && !updatedJob.wp_featured_media_id) {
      const imageProvider = job.image_provider as { id: string; api_key_encrypted: string; provider: string; model: string | null; endpoint_url: string | null; provider_type: string; name: string; parameters: Record<string, unknown>; capabilities: Record<string, unknown>; validation_status: string; validation_error: string | null; last_validated_at: string | null; is_active: boolean; created_at: string; updated_at: string } | null;
      
      if (imageProvider) {
        await supabase.from('content_jobs').update({ status: 'generating_images', generating_images_at: now }).eq('id', jobId);
        await logJobEvent(supabase, jobId, 'generating_text', 'generating_images', 'Gerando imagem destacada...');

        const imgProvider = createImageProvider(imageProvider);
        const imgPrompt = buildImagePrompt(updatedJob, updatedJob.title || updatedJob.topic);

        const imgStart = Date.now();
        const imgResult = await imgProvider.generate({
          prompt: imgPrompt,
          model: imageProvider.model || undefined,
          size: '1024x1024',
        });

        if (imgResult.imageUrl) {
          // Baixar imagem
          const imgRes = await fetch(imgResult.imageUrl, { signal: AbortSignal.timeout(30000) });
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

          // Upload para WordPress
          const wpPassword = decrypt(site.wp_credential_encrypted);
          const filename = `${updatedJob.slug || 'imagem'}-featured.jpg`;
          const altText = updatedJob.title || updatedJob.topic;

          const mediaResult = await uploadMediaToWordPress(
            site.site_url, site.wp_username, wpPassword, imgBuffer, filename, altText
          );

          if (mediaResult) {
            featuredMediaId = mediaResult.mediaId;

            // Salvar asset
            await supabase.from('article_assets').insert({
              job_id: jobId,
              asset_type: 'featured',
              provider_id: imageProvider.id,
              prompt_used: imgPrompt,
              wp_media_id: mediaResult.mediaId,
              wp_media_url: mediaResult.mediaUrl,
              alt_text: altText,
            });

            await supabase.from('content_jobs').update({ wp_featured_media_id: mediaResult.mediaId }).eq('id', jobId);
          }

          // Registrar uso
          await supabase.from('api_usage_events').insert({
            provider_id: imageProvider.id,
            site_id: job.site_id,
            job_id: jobId,
            call_type: 'image_generation',
            provider_name: imageProvider.provider,
            model: imgResult.model,
            images_count: 1,
            duration_ms: Date.now() - imgStart,
            status: 'success',
          });
        }
      }
    }

    // Se não auto_publish, colocar em needs_review
    if (!updatedJob.auto_publish) {
      await supabase.from('content_jobs').update({ status: 'needs_review', needs_review_at: now }).eq('id', jobId);
      await logJobEvent(supabase, jobId, 'generating_images', 'needs_review', 'Aguardando revisão do operador');
      return;
    }

    // PASSO 3: Publicar no WordPress
    const wpPassword = decrypt(site.wp_credential_encrypted);

    const publishResult = await publishToWordPress(
      site.site_url, site.wp_username, wpPassword,
      {
        title: updatedJob.title!,
        contentHtml: updatedJob.content_html!,
        slug: updatedJob.slug!,
        excerpt: updatedJob.excerpt || undefined,
        metaDescription: updatedJob.meta_description || undefined,
        status: 'publish',
        categoryIds: updatedJob.wp_category_id ? [updatedJob.wp_category_id] : undefined,
        authorId: updatedJob.wp_author_id || undefined,
        featuredMediaId: featuredMediaId || updatedJob.wp_featured_media_id || undefined,
      }
    );

    if (!publishResult.success) {
      throw new Error(`Falha ao publicar no WordPress: ${publishResult.error}`);
    }

    const publishedNow = new Date().toISOString();
    await supabase.from('content_jobs').update({
      status: 'published',
      wp_post_id: publishResult.postId,
      wp_post_url: publishResult.postUrl,
      published_at: publishedNow,
      attempt_count: updatedJob.attempt_count + 1,
    }).eq('id', jobId);

    await logJobEvent(supabase, jobId, 'publishing', 'published',
      `Publicado com sucesso: ${publishResult.postUrl}`);

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const newAttempt = (job.attempt_count || 0) + 1;
    const isFinal = newAttempt >= MAX_RETRIES;

    await supabase.from('content_jobs').update({
      status: isFinal ? 'failed' : 'queued',
      last_error: errorMsg,
      attempt_count: newAttempt,
      failed_at: isFinal ? new Date().toISOString() : undefined,
    }).eq('id', jobId);

    await logJobEvent(supabase, jobId, 'publishing', isFinal ? 'failed' : 'queued',
      isFinal ? `Falha definitiva após ${MAX_RETRIES} tentativas` : `Falha (tentativa ${newAttempt}/${MAX_RETRIES}) — será tentado novamente`,
      errorMsg);
  }
}

async function logJobEvent(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  fromStatus: string | null,
  toStatus: string,
  message: string,
  technicalDetail?: string
) {
  await supabase.from('job_events').insert({
    job_id: jobId,
    from_status: fromStatus,
    to_status: toStatus,
    message,
    technical_detail: technicalDetail,
  });
}
