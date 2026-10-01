import { createAdminClient } from '@/lib/supabase/server';
import DashboardClient from '@/components/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Buscar stats diretamente no server component
  const [jobsResult, sitesResult, usageResult, upcomingResult, recentResult] = await Promise.all([
    supabase.from('content_jobs').select('status').gte('created_at', thirtyDaysAgo),
    supabase.from('sites').select('id, connection_status, is_active'),
    supabase.from('api_usage_events')
      .select('provider_name, call_type, status, total_tokens, images_count, cost_known, is_cost_estimated')
      .gte('created_at', thirtyDaysAgo)
      .limit(500),
    supabase.from('content_jobs')
      .select('id, topic, title, scheduled_at, status, sites!inner(internal_name)')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(5),
    supabase.from('content_jobs')
      .select('id, topic, title, published_at, wp_post_url, sites!inner(internal_name)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(5),
  ]);

  const jobs = jobsResult.data || [];
  const sites = sitesResult.data || [];
  const usage = usageResult.data || [];

  const statusCounts = {
    queued: 0, generating_text: 0, generating_images: 0,
    needs_review: 0, scheduled: 0, publishing: 0,
    published: 0, failed: 0, canceled: 0,
  };
  jobs.forEach(j => {
    const s = j.status as keyof typeof statusCounts;
    if (s in statusCounts) statusCounts[s]++;
  });

  const providerUsage: Record<string, { provider: string; totalCalls: number; successCalls: number; errorCalls: number; totalTokens: number; totalImages: number; totalCostKnown: number; hasCostEstimate: boolean }> = {};
  usage.forEach(u => {
    if (!providerUsage[u.provider_name]) {
      providerUsage[u.provider_name] = { provider: u.provider_name, totalCalls: 0, successCalls: 0, errorCalls: 0, totalTokens: 0, totalImages: 0, totalCostKnown: 0, hasCostEstimate: false };
    }
    const p = providerUsage[u.provider_name];
    p.totalCalls++;
    if (u.status === 'success') p.successCalls++; else p.errorCalls++;
    p.totalTokens += u.total_tokens || 0;
    p.totalImages += u.images_count || 0;
    if (u.cost_known) p.totalCostKnown += Number(u.cost_known);
    if (u.is_cost_estimated) p.hasCostEstimate = true;
  });

  const statsData = {
    jobs: statusCounts,
    upcoming: (upcomingResult.data || []) as Array<{ id: string; topic: string; title: string | null; scheduled_at: string; status: string; sites: { internal_name: string } }>,
    recentPublished: (recentResult.data || []) as Array<{ id: string; topic: string; title: string | null; published_at: string | null; wp_post_url: string | null; sites: { internal_name: string } }>,
    providerUsage: Object.values(providerUsage),
    sites: {
      total: sites.filter(s => s.is_active).length,
      connected: sites.filter(s => s.connection_status === 'connected').length,
    },
    period: '30d',
  };

  return <DashboardClient stats={statsData} />;
}
