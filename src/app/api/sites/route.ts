import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sites')
      .select('id, client_name, internal_name, site_url, timezone, wp_username, connection_status, connection_error, last_connected_at, wp_categories, wp_authors, wp_cache_synced_at, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ sites: data });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao listar sites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_name, internal_name, site_url, timezone, wp_username, wp_credential } = body;

    if (!client_name || !internal_name || !site_url || !wp_username || !wp_credential) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Validar URL
    if (!/^https?:\/\//i.test(site_url)) {
      return NextResponse.json({ error: 'URL do site deve começar com http:// ou https://' }, { status: 400 });
    }

    const encryptedCredential = encrypt(wp_credential);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('sites')
      .insert({
        client_name,
        internal_name,
        site_url: site_url.replace(/\/+$/, ''),
        timezone: timezone || 'America/Sao_Paulo',
        wp_username,
        wp_credential_encrypted: encryptedCredential,
        connection_status: 'pending',
      })
      .select('id, client_name, internal_name, site_url, timezone, wp_username, connection_status, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ site: data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/sites error:', err);
    return NextResponse.json({ error: 'Erro ao criar site' }, { status: 500 });
  }
}
