import { createAdminClient } from '@/lib/supabase/server';
import ProvidersClient from '@/components/providers/ProvidersClient';
import type { ProviderConnection } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const supabase = createAdminClient();
  const { data: providers } = await supabase
    .from('provider_connections')
    .select('id, name, provider_type, provider, model, endpoint_url, parameters, validation_status, validation_error, last_validated_at, is_active, created_at, updated_at')
    .order('created_at', { ascending: false });

  return <ProvidersClient providers={(providers as ProviderConnection[]) || []} />;
}
