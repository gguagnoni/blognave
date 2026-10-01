import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';

export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name) updates.name = body.name;
    if (body.model !== undefined) updates.model = body.model;
    if (body.endpoint_url !== undefined) updates.endpoint_url = body.endpoint_url;
    if (body.api_key) updates.api_key_encrypted = encrypt(body.api_key);
    if (body.parameters) updates.parameters = body.parameters;
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('provider_connections')
      .update(updates)
      .eq('id', id)
      .select('id, name, provider_type, provider, model, endpoint_url, parameters, validation_status, is_active, updated_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ provider: data });
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar provedor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('provider_connections').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao remover provedor' }, { status: 500 });
  }
}
