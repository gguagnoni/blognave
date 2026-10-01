import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/crypto';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sites')
      .select('id, client_name, internal_name, site_url, timezone, wp_username, connection_status, connection_error, last_connected_at, wp_categories, wp_authors, wp_posts_cache, wp_cache_synced_at, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
    return NextResponse.json({ site: data });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar site' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.client_name) updates.client_name = body.client_name;
    if (body.internal_name) updates.internal_name = body.internal_name;
    if (body.site_url) updates.site_url = body.site_url.replace(/\/+$/, '');
    if (body.timezone) updates.timezone = body.timezone;
    if (body.wp_username) updates.wp_username = body.wp_username;
    if (body.wp_credential) updates.wp_credential_encrypted = encrypt(body.wp_credential);
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', id)
      .select('id, client_name, internal_name, site_url, timezone, wp_username, connection_status, is_active, updated_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ site: data });
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar site' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('sites').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao remover site' }, { status: 500 });
  }
}
