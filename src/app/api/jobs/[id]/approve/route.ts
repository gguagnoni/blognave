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
      .select('status, scheduled_at, auto_publish')
      .eq('id', id)
      .single();

    if (!job) return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });
    if (job.status !== 'needs_review') {
      return NextResponse.json({ error: `Artigo deve estar em needs_review para aprovar (atual: ${job.status})` }, { status: 400 });
    }

    const hasSchedule = job.scheduled_at && new Date(job.scheduled_at) > new Date();
    const newStatus = hasSchedule ? 'scheduled' : 'queued';

    await supabase.from('content_jobs').update({
      status: newStatus,
      auto_publish: true,
    }).eq('id', id);

    await supabase.from('job_events').insert({
      job_id: id,
      from_status: 'needs_review',
      to_status: newStatus,
      message: hasSchedule ? `Aprovado para publicar em ${job.scheduled_at}` : 'Aprovado para publicar imediatamente',
    });

    return NextResponse.json({ ok: true, newStatus });
  } catch {
    return NextResponse.json({ error: 'Erro ao aprovar artigo' }, { status: 500 });
  }
}
