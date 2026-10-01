import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { testWpConnection, fetchWpCategories, fetchWpAuthors } from '@/lib/wordpress';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  try {
    const { data: site, error } = await supabase
      .from('sites')
      .select('id, site_url, wp_username, wp_credential_encrypted')
      .eq('id', id)
      .single();

    if (error || !site) {
      return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
    }

    const password = decrypt(site.wp_credential_encrypted);
    const result = await testWpConnection(site.site_url, site.wp_username, password);

    if (!result.success) {
      await supabase.from('sites').update({
        connection_status: 'error',
        connection_error: result.error,
      }).eq('id', id);

      // Registrar uso
      await supabase.from('api_usage_events').insert({
        site_id: id,
        call_type: 'connection_test',
        provider_name: 'wordpress',
        status: 'error',
        error_message: result.error,
        error_code: result.errorCode,
      });

      return NextResponse.json({ success: false, error: result.error, errorCode: result.errorCode });
    }

    // Buscar categorias e autores
    const [categories, authors] = await Promise.all([
      fetchWpCategories(site.site_url, site.wp_username, password),
      fetchWpAuthors(site.site_url, site.wp_username, password),
    ]);

    await supabase.from('sites').update({
      connection_status: 'connected',
      connection_error: null,
      last_connected_at: new Date().toISOString(),
      wp_categories: categories,
      wp_authors: authors,
      wp_cache_synced_at: new Date().toISOString(),
    }).eq('id', id);

    await supabase.from('api_usage_events').insert({
      site_id: id,
      call_type: 'connection_test',
      provider_name: 'wordpress',
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      user: result.user,
      categories,
      authors,
    });
  } catch (err) {
    await supabase.from('sites').update({
      connection_status: 'error',
      connection_error: String(err),
    }).eq('id', id);
    return NextResponse.json({ error: 'Erro interno ao testar conexão' }, { status: 500 });
  }
}
