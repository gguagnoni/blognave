import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { encrypt, maskSecret } from '@/lib/crypto';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('provider_connections')
      .select('id, name, provider_type, provider, model, endpoint_url, parameters, capabilities, validation_status, validation_error, last_validated_at, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Nunca retornar chave decifrada
    return NextResponse.json({ providers: data });
  } catch {
    return NextResponse.json({ error: 'Erro ao listar provedores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, provider_type, provider, model, endpoint_url, api_key, parameters } = body;

    if (!name || !provider_type || !provider || !api_key) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    if (!['text', 'image'].includes(provider_type)) {
      return NextResponse.json({ error: 'Tipo de provedor inválido' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('provider_connections')
      .insert({
        name,
        provider_type,
        provider,
        model: model || null,
        endpoint_url: endpoint_url || null,
        api_key_encrypted: encrypt(api_key),
        parameters: parameters || {},
        validation_status: 'pending',
      })
      .select('id, name, provider_type, provider, model, endpoint_url, parameters, validation_status, is_active, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ provider: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar provedor' }, { status: 500 });
  }
}
