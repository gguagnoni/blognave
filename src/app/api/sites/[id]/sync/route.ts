import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { fetchWpCategories, fetchWpAuthors, fetchWpPosts } from '@/lib/wordpress';

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

    const [categories, authors, posts] = await Promise.all([
      fetchWpCategories(site.site_url, site.wp_username, password),
      fetchWpAuthors(site.site_url, site.wp_username, password),
      fetchWpPosts(site.site_url, site.wp_username, password),
    ]);

    await supabase.from('sites').update({
      wp_categories: categories,
      wp_authors: authors,
      wp_posts_cache: posts,
      wp_cache_synced_at: new Date().toISOString(),
    }).eq('id', id);

    await supabase.from('api_usage_events').insert({
      site_id: id,
      call_type: 'sync',
      provider_name: 'wordpress',
      status: 'success',
    });

    return NextResponse.json({ success: true, categories, authors, postsCount: posts.length });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao sincronizar' }, { status: 500 });
  }
}
