import { createAdminClient } from '@/lib/supabase/server';
import ArticleDetailClient from '@/components/articles/ArticleDetailClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [jobResult, eventsResult] = await Promise.all([
    supabase
      .from('content_jobs')
      .select(`
        *,
        sites!inner(id, internal_name, site_url, wp_categories, wp_authors),
        article_assets(*)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('job_events')
      .select('id, from_status, to_status, message, attempt_number, created_at')
      .eq('job_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (!jobResult.data) notFound();

  return (
    <ArticleDetailClient
      job={jobResult.data as any}
      events={(eventsResult.data || []) as any[]}
    />
  );
}
