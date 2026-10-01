import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Totais por status de jobs
    const { data: jobStats } = await supabase
      .from('content_jobs')
      .select('status')
      .gte('created_at', thirtyDaysAgo);

    const statusCounts = {
      queued: 0,
      generating_text: 0,
      generating_images: 0,
      needs_review: 0,
      scheduled: 0,
      publishing: 0,
      published: 0,
      failed: 0,
      canceled: 0,
    };

    jobStats?.forEach((j) => {
      const s = j.status as keyof typeof statusCounts;
      if (s in statusCounts) statusCounts[s]++;
    });

    // Próximas publicações agendadas
    const { data: upcoming } = await supabase
      .from('content_jobs')
      .select(`
        id, topic, title, scheduled_at, status,
        sites!inner(internal_name)
      `)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(5);

    // Artigos recentes publicados
    const { data: recentPublished } = await supabase
      .from('content_jobs')
      .select(`
        id, topic, title, published_at, wp_post_url,
        sites!inner(internal_name)
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(5);

    // Uso de APIs por provedor (últimos 30 dias)
    const { data: usageByProvider } = await supabase
      .from('api_usage_events')
      .select('provider_name, call_type, status, total_tokens, images_count, duration_ms, cost_known, is_cost_estimated, created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false });

    // Agregar uso por provedor
    const providerUsage: Record<string, {
      provider: string;
      totalCalls: number;
      successCalls: number;
      errorCalls: number;
      totalTokens: number;
      totalImages: number;
      totalCostKnown: number;
      hasCostEstimate: boolean;
    }> = {};

    usageByProvider?.forEach((u) => {
      if (!providerUsage[u.provider_name]) {
        providerUsage[u.provider_name] = {
          provider: u.provider_name,
          totalCalls: 0,
          successCalls: 0,
          errorCalls: 0,
          totalTokens: 0,
          totalImages: 0,
          totalCostKnown: 0,
          hasCostEstimate: false,
        };
      }
      const p = providerUsage[u.provider_name];
      p.totalCalls++;
      if (u.status === 'success') p.successCalls++;
      else p.errorCalls++;
      p.totalTokens += u.total_tokens || 0;
      p.totalImages += u.images_count || 0;
      if (u.cost_known) p.totalCostKnown += Number(u.cost_known);
      if (u.is_cost_estimated) p.hasCostEstimate = true;
    });

    // Assets (imagens)
    const { count: totalImages } = await supabase
      .from('article_assets')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo);

    const { count: uploadedImages } = await supabase
      .from('article_assets')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo)
      .not('wp_media_id', 'is', null);

    // Total de sites ativos
    const { count: totalSites } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: connectedSites } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('connection_status', 'connected');

    return NextResponse.json({
      jobs: statusCounts,
      upcoming: upcoming || [],
      recentPublished: recentPublished || [],
      providerUsage: Object.values(providerUsage),
      images: { total: totalImages || 0, uploaded: uploadedImages || 0 },
      sites: { total: totalSites || 0, connected: connectedSites || 0 },
      period: '30d',
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return NextResponse.json({ error: 'Erro ao buscar métricas' }, { status: 500 });
  }
}
