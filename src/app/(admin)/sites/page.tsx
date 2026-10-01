import { createAdminClient } from '@/lib/supabase/server';
import SitesClient from '@/components/sites/SitesClient';
import type { Site } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function SitesPage() {
  const supabase = createAdminClient();
  const { data: sites } = await supabase
    .from('sites')
    .select('id, client_name, internal_name, site_url, timezone, wp_username, connection_status, connection_error, last_connected_at, wp_categories, wp_authors, wp_cache_synced_at, is_active, created_at, updated_at')
    .order('created_at', { ascending: false });

  return <SitesClient sites={(sites as Site[]) || []} />;
}
