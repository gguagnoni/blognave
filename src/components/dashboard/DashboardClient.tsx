'use client';

interface ProviderUsage {
  provider: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  totalTokens: number;
  totalImages: number;
  totalCostKnown: number;
  hasCostEstimate: boolean;
}

interface StatsData {
  jobs: Record<string, number>;
  upcoming: Array<{ id: string; topic: string; title: string | null; scheduled_at: string; status: string; sites: { internal_name: string } }>;
  recentPublished: Array<{ id: string; topic: string; title: string | null; published_at: string | null; wp_post_url: string | null; sites: { internal_name: string } }>;
  providerUsage: ProviderUsage[];
  sites: { total: number; connected: number };
  period: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

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

export default function DashboardClient({ stats }: { stats: StatsData }) {
  const totalArticles = Object.values(stats.jobs).reduce((a, b) => a + b, 0);
  const activeJobs = (stats.jobs.queued || 0) + (stats.jobs.generating_text || 0) + (stats.jobs.generating_images || 0) + (stats.jobs.publishing || 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Visão Geral</h1>
          <p className="page-subtitle">Métricas dos últimos 30 dias</p>
        </div>
        <a href="/articles/new" className="btn btn-primary">+ Novo Artigo</a>
      </div>

      <div className="page-body">
        {/* Stats principais */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <div className="stat-value">{totalArticles}</div>
            <div className="stat-label">Total de Artigos</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-value" style={{ color: 'var(--accent-success)' }}>{stats.jobs.published || 0}</div>
            <div className="stat-label">Publicados</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔍</span>
            <div className="stat-value" style={{ color: 'var(--accent-info)' }}>{stats.jobs.needs_review || 0}</div>
            <div className="stat-label">Aguardando Revisão</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <div className="stat-value" style={{ color: '#a78bfa' }}>{stats.jobs.scheduled || 0}</div>
            <div className="stat-label">Agendados</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⚙️</span>
            <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>{activeJobs}</div>
            <div className="stat-label">Em Processamento</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">❌</span>
            <div className="stat-value" style={{ color: 'var(--accent-danger)' }}>{stats.jobs.failed || 0}</div>
            <div className="stat-label">Com Falha</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🌐</span>
            <div className="stat-value">{stats.sites.connected}<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/{stats.sites.total}</span></div>
            <div className="stat-label">Sites Conectados</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⏳</span>
            <div className="stat-value">{stats.jobs.queued || 0}</div>
            <div className="stat-label">Na Fila</div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 24 }}>
          {/* Próximas publicações */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📅 Próximas Publicações</h2>
            <div className="table-container">
              {stats.upcoming.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 20px' }}>
                  <span className="empty-state-icon" style={{ fontSize: 32 }}>📅</span>
                  <p style={{ margin: 0, fontSize: 13 }}>Nenhuma publicação agendada</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Artigo</th>
                      <th>Site</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.upcoming.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <a href={`/articles/${job.id}`} style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                            {job.title || job.topic}
                          </a>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{job.sites.internal_name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(job.scheduled_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Publicados recentemente */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>✅ Publicados Recentemente</h2>
            <div className="table-container">
              {stats.recentPublished.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 20px' }}>
                  <span className="empty-state-icon" style={{ fontSize: 32 }}>✅</span>
                  <p style={{ margin: 0, fontSize: 13 }}>Nenhum artigo publicado ainda</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Artigo</th>
                      <th>Site</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentPublished.map((job) => (
                      <tr key={job.id}>
                        <td>
                          {job.wp_post_url ? (
                            <a href={job.wp_post_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent-success)' }}>
                              {job.title || job.topic} ↗
                            </a>
                          ) : (
                            <span style={{ fontSize: 13 }}>{job.title || job.topic}</span>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{job.sites.internal_name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(job.published_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Uso de APIs por provedor */}
        {stats.providerUsage.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🤖 Uso de APIs por Provedor</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Provedor</th>
                    <th>Total de Chamadas</th>
                    <th>Sucessos</th>
                    <th>Erros</th>
                    <th>Tokens</th>
                    <th>Imagens</th>
                    <th>Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.providerUsage.map((p) => (
                    <tr key={p.provider}>
                      <td style={{ fontWeight: 600 }}>{p.provider}</td>
                      <td>{p.totalCalls}</td>
                      <td style={{ color: 'var(--accent-success)' }}>{p.successCalls}</td>
                      <td style={{ color: p.errorCalls > 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>{p.errorCalls}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {p.totalTokens > 0 ? p.totalTokens.toLocaleString('pt-BR') : '—'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {p.totalImages > 0 ? p.totalImages : '—'}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {p.totalCostKnown > 0 ? (
                          <span>
                            ${p.totalCostKnown.toFixed(4)}
                            {p.hasCostEstimate && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> (est.)</span>}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>N/D</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
