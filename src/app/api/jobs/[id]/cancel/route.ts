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
      .select('status')
      .eq('id', id)
      .single();

    if (!job) return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });
    if (['published', 'canceled', 'publishing'].includes(job.status)) {
      return NextResponse.json({ error: `Não é possível cancelar artigo com status ${job.status}` }, { status: 400 });
    }

    await supabase.from('content_jobs').update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    }).eq('id', id);

    await supabase.from('job_events').insert({
      job_id: id,
      from_status: job.status,
      to_status: 'canceled',
      message: 'Cancelado pelo operador',
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao cancelar artigo' }, { status: 500 });
  }
}
