import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const supabase = createAdminClient();
    let query = supabase
      .from('content_jobs')
      .select(`
        id, site_id, topic, language, main_keyword, status, title, slug,
        actual_word_count, target_word_count, scheduled_at, auto_publish,
        wp_post_id, wp_post_url, attempt_count, last_error, last_error_code,
        created_at, updated_at, published_at, failed_at,
        sites!inner(id, internal_name, site_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (siteId) query = query.eq('site_id', siteId);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ jobs: data, total: count, page, perPage });
  } catch {
    return NextResponse.json({ error: 'Erro ao listar artigos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      site_id, provider_text_id, provider_image_id,
      topic, language, main_keyword, additional_instructions,
      target_word_count, tone,
      wp_category_id, wp_category_name, wp_author_id, wp_author_name,
      internal_links_enabled, internal_links_config,
      external_links_enabled, external_links_config,
      featured_image_enabled, body_images_enabled, body_images_count,
      image_instructions, image_style, image_aspect_ratio,
      scheduled_at, publish_timezone, auto_publish,
    } = body;

    if (!site_id || !provider_text_id || !topic) {
      return NextResponse.json({ error: 'site_id, provider_text_id e topic são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('content_jobs')
      .insert({
        site_id,
        provider_text_id,
        provider_image_id: provider_image_id || null,
        topic,
        language: language || 'pt-BR',
        main_keyword: main_keyword || null,
        additional_instructions: additional_instructions || null,
        target_word_count: target_word_count || 1000,
        tone: tone || 'informativo',
        wp_category_id: wp_category_id || null,
        wp_category_name: wp_category_name || null,
        wp_author_id: wp_author_id || null,
        wp_author_name: wp_author_name || null,
        internal_links_enabled: internal_links_enabled || false,
        internal_links_config: internal_links_config || [],
        external_links_enabled: external_links_enabled || false,
        external_links_config: external_links_config || [],
        featured_image_enabled: featured_image_enabled || false,
        body_images_enabled: body_images_enabled || false,
        body_images_count: body_images_count || 0,
        image_instructions: image_instructions || null,
        image_style: image_style || null,
        image_aspect_ratio: image_aspect_ratio || '16:9',
        scheduled_at: scheduled_at || null,
        publish_timezone: publish_timezone || 'America/Sao_Paulo',
        auto_publish: auto_publish || false,
        status: 'queued',
      })
      .select('id, site_id, topic, status, created_at')
      .single();

    if (error) throw error;

    // Registrar evento
    await supabase.from('job_events').insert({
      job_id: data.id,
      from_status: null,
      to_status: 'queued',
      message: 'Artigo criado e adicionado à fila',
    });

    return NextResponse.json({ job: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar artigo' }, { status: 500 });
  }
}
