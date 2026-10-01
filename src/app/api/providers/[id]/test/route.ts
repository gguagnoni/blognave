import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { createTextProvider, createImageProvider } from '@/lib/ai/factory';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const start = Date.now();

  try {
    const { data: provider, error } = await supabase
      .from('provider_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !provider) {
      return NextResponse.json({ error: 'Provedor não encontrado' }, { status: 404 });
    }

    let result: { success: boolean; error?: string; models?: string[] };

    if (provider.provider_type === 'text') {
      const textProv = createTextProvider(provider);
      result = await textProv.testConnection();
    } else {
      const imgProv = createImageProvider(provider);
      result = await imgProv.testConnection();
    }

    const durationMs = Date.now() - start;

    // Atualizar status de validação
    await supabase.from('provider_connections').update({
      validation_status: result.success ? 'valid' : 'invalid',
      validation_error: result.success ? null : result.error,
      last_validated_at: new Date().toISOString(),
    }).eq('id', id);

    // Registrar uso
    await supabase.from('api_usage_events').insert({
      provider_id: id,
      call_type: 'connection_test',
      provider_name: provider.provider,
      model: provider.model,
      duration_ms: durationMs,
      status: result.success ? 'success' : 'error',
      error_message: result.error,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
