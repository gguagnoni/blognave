import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Admin client com service role — SOMENTE no servidor
// Nunca expor SUPABASE_SERVICE_ROLE_KEY ao browser
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
