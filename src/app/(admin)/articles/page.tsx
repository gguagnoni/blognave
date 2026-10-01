import { createAdminClient } from '@/lib/supabase/server';
import ArticlesClient from '@/components/articles/ArticlesClient';

export const dynamic = 'force-dynamic';

export default async function ArticlesPage() {
  const supabase = createAdminClient();

  const [jobsResult, sitesResult] = await Promise.all([
    supabase
      .from('content_jobs')
      .select(`
        id, site_id, topic, title, status, language, scheduled_at, auto_publish,
        wp_post_id, wp_post_url, attempt_count, last_error,
        created_at, updated_at, published_at, failed_at,
        actual_word_count, target_word_count,
        sites!inner(id, internal_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('sites').select('id, internal_name').eq('is_active', true).order('internal_name'),
  ]);

  return (
    <ArticlesClient
      jobs={(jobsResult.data || []) as any[]}
      sites={(sitesResult.data || []) as Array<{ id: string; internal_name: string }>}
    />
  );
}
