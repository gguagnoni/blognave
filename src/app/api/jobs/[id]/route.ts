import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('content_jobs')
      .select(`
        *,
        sites!inner(id, internal_name, site_url, wp_categories, wp_authors),
        article_assets(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });

    // Buscar eventos recentes
    const { data: events } = await supabase
      .from('job_events')
      .select('id, from_status, to_status, message, attempt_number, created_at')
      .eq('job_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ job: data, events: events || [] });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar artigo' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // Verificar que o job está em estado editável
    const { data: current } = await supabase
      .from('content_jobs')
      .select('status')
      .eq('id', id)
      .single();

    if (!current) return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });
    if (!['needs_review', 'failed', 'queued'].includes(current.status)) {
      return NextResponse.json({ error: `Artigo em status ${current.status} não pode ser editado` }, { status: 400 });
    }

    const allowed = ['title', 'content_html', 'slug', 'meta_description', 'excerpt',
      'wp_category_id', 'wp_category_name', 'wp_author_id', 'wp_author_name',
      'scheduled_at', 'auto_publish', 'internal_links_config', 'external_links_config'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from('content_jobs')
      .update(updates)
      .eq('id', id)
      .select('id, status, title, slug, updated_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ job: data });
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar artigo' }, { status: 500 });
  }
}
