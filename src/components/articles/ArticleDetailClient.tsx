'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    queued: { label: 'Na fila', cls: 'badge-queued' },
    generating_text: { label: 'Gerando texto', cls: 'badge-generating' },
    generating_images: { label: 'Gerando imagem', cls: 'badge-generating' },
    needs_review: { label: 'Aguardando Revisão', cls: 'badge-review' },
    scheduled: { label: 'Agendado', cls: 'badge-scheduled' },
    publishing: { label: 'Publicando', cls: 'badge-publishing' },
    published: { label: 'Publicado', cls: 'badge-published' },
    failed: { label: 'Falhou', cls: 'badge-failed' },
    canceled: { label: 'Cancelado', cls: 'badge-canceled' },
  };
  const info = map[status] || { label: status, cls: 'badge-queued' };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

function PipelineStep({ label, icon, done, active, error }: { label: string; icon: string; done: boolean; active: boolean; error: boolean }) {
  return (
    <div className="pipeline-step">
      <div className={`step-dot ${done ? 'done' : active ? 'active' : error ? 'error' : ''}`}>
        {done ? '✓' : error ? '✕' : icon}
      </div>
      <div className={`step-label ${active ? 'active' : ''}`}>{label}</div>
    </div>
  );
}

export default function ArticleDetailClient({ job: initialJob, events }: { job: any; events: any[] }) {
  const [job, setJob] = useState(initialJob);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(job.title || '');
  const [editContent, setEditContent] = useState(job.content_html || '');
  const [editSlug, setEditSlug] = useState(job.slug || '');
  const [editMeta, setEditMeta] = useState(job.meta_description || '');
  const [editExcerpt, setEditExcerpt] = useState(job.excerpt || '');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const isEditable = ['needs_review', 'failed', 'queued'].includes(job.status);

  async function doAction(action: string) {
    setActionLoading(action);
    setMessage('');
    try {
      const res = await fetch(`/api/jobs/${job.id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(action === 'approve' ? 'Artigo aprovado!' : action === 'cancel' ? 'Artigo cancelado.' : 'Ação realizada.');
        // Recarregar
        const jobRes = await fetch(`/api/jobs/${job.id}`);
        const jobData = await jobRes.json();
        setJob(jobData.job);
      } else {
        setMessage(data.error || 'Erro');
      }
    } finally {
      setActionLoading('');
    }
  }

  async function saveEdits() {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content_html: editContent,
          slug: editSlug,
          meta_description: editMeta,
          excerpt: editExcerpt,
        }),
      });
      if (res.ok) {
        setJob((j: any) => ({ ...j, title: editTitle, content_html: editContent, slug: editSlug, meta_description: editMeta, excerpt: editExcerpt }));
        setEditing(false);
        setMessage('Alterações salvas.');
      }
    } finally {
      setSaving(false);
    }
  }

  const pipelineSteps = [
    { label: 'Na fila', icon: '📋', statuses: ['queued'] },
    { label: 'Gerando texto', icon: '✍️', statuses: ['generating_text'] },
    { label: 'Gerando imagens', icon: '🖼️', statuses: ['generating_images'] },
    { label: 'Revisão', icon: '🔍', statuses: ['needs_review'] },
    { label: 'Agendado', icon: '📅', statuses: ['scheduled'] },
    { label: 'Publicando', icon: '🚀', statuses: ['publishing'] },
    { label: 'Publicado', icon: '✅', statuses: ['published'] },
  ];

  const statusOrder = ['queued', 'generating_text', 'generating_images', 'needs_review', 'scheduled', 'publishing', 'published'];
  const currentIdx = statusOrder.indexOf(job.status);

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1 className="page-title" style={{ fontSize: 18 }}>{job.title || job.topic}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="page-subtitle">{(job.sites as any)?.internal_name} · {job.language} · Meta: {job.target_word_count} palavras{job.actual_word_count ? ` · Real: ${job.actual_word_count}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/articles" className="btn btn-ghost btn-sm">← Voltar</a>
          {job.wp_post_url && (
            <a href={job.wp_post_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Ver no WP ↗</a>
          )}
          {job.status === 'needs_review' && (
            <button
              className="btn btn-primary"
              onClick={() => doAction('approve')}
              disabled={!!actionLoading}
            >
              {actionLoading === 'approve' ? 'Aprovando...' : '✓ Aprovar e Publicar'}
            </button>
          )}
          {job.status === 'failed' && (
            <button className="btn btn-secondary" onClick={() => doAction('retry')} disabled={!!actionLoading}>
              {actionLoading === 'retry' ? '...' : '🔄 Tentar Novamente'}
            </button>
          )}
          {!['published', 'canceled', 'publishing'].includes(job.status) && (
            <button className="btn btn-danger btn-sm" onClick={() => doAction('cancel')} disabled={!!actionLoading}>
              {actionLoading === 'cancel' ? '...' : 'Cancelar'}
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {message && (
          <div className={`alert ${message.includes('Erro') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
            {message}
          </div>
        )}

        {/* Pipeline visual */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="pipeline-steps">
            {pipelineSteps.map((step, i) => (
              <PipelineStep
                key={step.label}
                label={step.label}
                icon={step.icon}
                done={currentIdx > i && !['failed', 'canceled'].includes(job.status)}
                active={step.statuses.includes(job.status)}
                error={['failed', 'canceled'].includes(job.status) && currentIdx <= i}
              />
            ))}
          </div>
        </div>

        {/* Erro */}
        {job.last_error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <span className="alert-icon">❌</span>
            <div>
              <strong>Erro (tentativa {job.attempt_count}):</strong><br />
              {job.last_error}
            </div>
          </div>
        )}

        <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
          {/* Conteúdo gerado */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>📄 Conteúdo Gerado</h2>
              {isEditable && !editing && (
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Editar</button>
              )}
              {editing && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" onClick={saveEdits} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                </div>
              )}
            </div>

            {job.content_html ? (
              editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Título</label>
                    <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Slug</label>
                    <input className="form-input" value={editSlug} onChange={e => setEditSlug(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Meta Descrição</label>
                    <input className="form-input" value={editMeta} onChange={e => setEditMeta(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Excerpt</label>
                    <textarea className="form-input" value={editExcerpt} onChange={e => setEditExcerpt(e.target.value)} style={{ minHeight: 60 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Conteúdo HTML</label>
                    <textarea
                      className="form-input"
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      style={{ minHeight: 400, fontFamily: 'monospace', fontSize: 12 }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 12, padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Slug</div>
                    <div style={{ fontSize: 13, fontFamily: 'monospace' }}>{job.slug || '—'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, marginTop: 8 }}>Meta Descrição</div>
                    <div style={{ fontSize: 13 }}>{job.meta_description || '—'}</div>
                  </div>
                  <div
                    className="article-preview"
                    dangerouslySetInnerHTML={{ __html: job.content_html }}
                  />
                </div>
              )
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <span className="empty-state-icon">⏳</span>
                <p>Conteúdo ainda não gerado. O cron processará em breve.</p>
              </div>
            )}
          </div>

          {/* Info e eventos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📊 Informações</h2>
              <table style={{ width: '100%' }}>
                <tbody>
                  {[
                    ['Tema', job.topic],
                    ['Idioma', job.language],
                    ['Tom', job.tone],
                    ['Categoria', job.wp_category_name || '—'],
                    ['Autor', job.wp_author_name || '—'],
                    ['Imagem Dest.', job.featured_image_enabled ? 'Sim' : 'Não'],
                    ['Post WP ID', job.wp_post_id || '—'],
                    ['Tentativas', job.attempt_count],
                    ['Criado em', new Date(job.created_at).toLocaleString('pt-BR')],
                    ['Atualizado', new Date(job.updated_at).toLocaleString('pt-BR')],
                    ['Publicado', job.published_at ? new Date(job.published_at).toLocaleString('pt-BR') : '—'],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', paddingBottom: 6, paddingRight: 12, whiteSpace: 'nowrap' }}>{k}</td>
                      <td style={{ fontSize: 13, paddingBottom: 6 }}>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📋 Histórico</h2>
              {events.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sem eventos registrados.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {events.map((ev: any) => (
                    <div key={ev.id} style={{ fontSize: 12, borderLeft: '2px solid var(--border-default)', paddingLeft: 10 }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
                        {new Date(ev.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{ev.from_status || 'início'}</span>
                        {' → '}
                        <strong>{ev.to_status}</strong>
                      </div>
                      {ev.message && <div style={{ marginTop: 2 }}>{ev.message}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
