import { createAdminClient } from '@/lib/supabase/server';
import NewArticleClient from '@/components/articles/NewArticleClient';

export const dynamic = 'force-dynamic';

export default async function NewArticlePage() {
  const supabase = createAdminClient();

  const [sitesResult, providersResult] = await Promise.all([
    supabase
      .from('sites')
      .select('id, internal_name, site_url, timezone, wp_categories, wp_authors, wp_posts_cache')
      .eq('is_active', true)
      .eq('connection_status', 'connected')
      .order('internal_name'),
    supabase
      .from('provider_connections')
      .select('id, name, provider_type, provider, model')
      .eq('is_active', true)
      .eq('validation_status', 'valid')
      .order('name'),
  ]);

  return (
    <NewArticleClient
      sites={(sitesResult.data || []) as any[]}
      providers={(providersResult.data || []) as any[]}
    />
  );
}
