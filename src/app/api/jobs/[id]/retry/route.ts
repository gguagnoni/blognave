import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  try {
    const { data: job } = await supabase
      .from('content_jobs')
      .select('status, attempt_count')
      .eq('id', id)
      .single();

    if (!job) return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });
    if (job.status !== 'failed') {
      return NextResponse.json({ error: 'Somente artigos com falha podem ser tentados novamente' }, { status: 400 });
    }

    await supabase.from('content_jobs').update({
      status: 'queued',
      last_error: null,
      last_error_code: null,
      failed_at: null,
    }).eq('id', id);

    await supabase.from('job_events').insert({
      job_id: id,
      from_status: 'failed',
      to_status: 'queued',
      message: 'Tentativa reiniciada pelo operador',
      attempt_number: job.attempt_count,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao reiniciar artigo' }, { status: 500 });
  }
}
