'use client';
import { useState } from 'react';
import Link from 'next/link';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    queued: { label: 'Na fila', cls: 'badge-queued' },
    generating_text: { label: 'Gerando texto', cls: 'badge-generating' },
    generating_images: { label: 'Gerando imagem', cls: 'badge-generating' },
    needs_review: { label: 'Revisão', cls: 'badge-review' },
    scheduled: { label: 'Agendado', cls: 'badge-scheduled' },
    publishing: { label: 'Publicando', cls: 'badge-publishing' },
    published: { label: 'Publicado', cls: 'badge-published' },
    failed: { label: 'Falhou', cls: 'badge-failed' },
    canceled: { label: 'Cancelado', cls: 'badge-canceled' },
  };
  const info = map[status] || { label: status, cls: 'badge-queued' };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

export default function ArticlesClient({
  jobs: initialJobs,
  sites,
}: {
  jobs: any[];
  sites: Array<{ id: string; internal_name: string }>;
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filtered = jobs.filter(j => {
    if (filterStatus && j.status !== filterStatus) return false;
    if (filterSite && j.site_id !== filterSite) return false;
    if (search && !j.topic?.toLowerCase().includes(search.toLowerCase()) && !j.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function reload() {
    const res = await fetch('/api/jobs?per_page=100');
    const data = await res.json();
    setJobs(data.jobs || []);
  }

  async function doAction(id: string, action: string) {
    setActionLoading(`${id}-${action}`);
    try {
      await fetch(`/api/jobs/${id}/${action}`, { method: 'POST' });
      await reload();
    } finally {
      setActionLoading(null);
    }
  }

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'queued', label: 'Na fila' },
    { value: 'generating_text', label: 'Gerando texto' },
    { value: 'needs_review', label: 'Aguardando revisão' },
    { value: 'scheduled', label: 'Agendados' },
    { value: 'publishing', label: 'Publicando' },
    { value: 'published', label: 'Publicados' },
    { value: 'failed', label: 'Com falha' },
    { value: 'canceled', label: 'Cancelados' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Esteira de Artigos</h1>
          <p className="page-subtitle">{filtered.length} artigo(s) exibido(s)</p>
        </div>
        <Link href="/articles/new" className="btn btn-primary">+ Novo Artigo</Link>
      </div>

      <div className="page-body">
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ maxWidth: 260, flex: 1 }}
            placeholder="Buscar por tema ou título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="form-input form-select"
            style={{ maxWidth: 200 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="form-input form-select"
            style={{ maxWidth: 200 }}
            value={filterSite}
            onChange={e => setFilterSite(e.target.value)}
          >
            <option value="">Todos os sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.internal_name}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={reload}>🔄 Atualizar</button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📝</span>
            <h3>Nenhum artigo encontrado</h3>
            <p>Crie o primeiro artigo ou ajuste os filtros.</p>
            <Link href="/articles/new" className="btn btn-primary">+ Criar artigo</Link>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Artigo</th>
                  <th>Site</th>
                  <th>Status</th>
                  <th>Palavras</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job: any) => (
                  <tr key={job.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14, maxWidth: 300 }}>
                        <Link href={`/articles/${job.id}`} style={{ color: 'var(--text-primary)' }}>
                          {job.title || job.topic}
                        </Link>
                      </div>
                      {job.last_error && (
                        <div style={{ fontSize: 11, color: 'var(--accent-danger)', marginTop: 2 }}>
                          {job.last_error.substring(0, 80)}{job.last_error.length > 80 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{job.sites?.internal_name}</td>
                    <td><StatusBadge status={job.status} /></td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {job.actual_word_count
                        ? `${job.actual_word_count}/${job.target_word_count}`
                        : job.target_word_count ? `— /${job.target_word_count}` : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {job.published_at
                        ? new Date(job.published_at).toLocaleDateString('pt-BR')
                        : job.scheduled_at
                        ? `📅 ${new Date(job.scheduled_at).toLocaleDateString('pt-BR')}`
                        : new Date(job.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Link href={`/articles/${job.id}`} className="btn btn-secondary btn-sm" title="Ver detalhes">👁️</Link>
                        {job.status === 'needs_review' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => doAction(job.id, 'approve')}
                            disabled={actionLoading === `${job.id}-approve`}
                            title="Aprovar para publicar"
                          >✓</button>
                        )}
                        {job.status === 'failed' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => doAction(job.id, 'retry')}
                            disabled={actionLoading === `${job.id}-retry`}
                            title="Tentar novamente"
                          >🔄</button>
                        )}
                        {!['published', 'canceled', 'publishing'].includes(job.status) && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => doAction(job.id, 'cancel')}
                            disabled={actionLoading === `${job.id}-cancel`}
                            title="Cancelar"
                          >✕</button>
                        )}
                        {job.wp_post_url && (
                          <a href={job.wp_post_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Ver no WordPress">↗</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
