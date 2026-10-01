'use client';
import { useState } from 'react';
import type { Site, WpCategory, WpAuthor } from '@/types/database';

function ConnectionBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: string }> = {
    connected: { label: 'Conectado', cls: 'badge-connected', icon: '✅' },
    pending: { label: 'Pendente', cls: 'badge-pending', icon: '⏳' },
    error: { label: 'Erro', cls: 'badge-error', icon: '❌' },
    disconnected: { label: 'Desconectado', cls: 'badge-error', icon: '🔌' },
  };
  const info = map[status] || { label: status, cls: 'badge-pending', icon: '❓' };
  return <span className={`badge ${info.cls}`}>{info.icon} {info.label}</span>;
}

function SiteModal({
  onClose,
  onSaved,
  site,
}: {
  onClose: () => void;
  onSaved: () => void;
  site?: Site;
}) {
  const isEdit = !!site;
  const [form, setForm] = useState({
    client_name: site?.client_name || '',
    internal_name: site?.internal_name || '',
    site_url: site?.site_url || 'https://',
    timezone: site?.timezone || 'America/Sao_Paulo',
    wp_username: site?.wp_username || '',
    wp_credential: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const TIMEZONES = [
    'America/Sao_Paulo', 'America/Manaus', 'America/Belem',
    'America/Fortaleza', 'America/Recife', 'America/Cuiaba',
    'America/Porto_Velho', 'America/Boa_Vista', 'America/Noronha',
    'UTC',
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit && !form.wp_credential) {
      setError('Application Password é obrigatória');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const url = isEdit ? `/api/sites/${site.id}` : '/api/sites';
      const method = isEdit ? 'PUT' : 'POST';
      const body: Record<string, string> = { ...form };
      if (isEdit && !body.wp_credential) delete body.wp_credential;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao salvar');
        return;
      }
      onSaved();
    } catch {
      setError('Erro de rede');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Editar Site' : 'Novo Site WordPress'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!isEdit && (
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              <span className="alert-icon">ℹ️</span>
              <div>
                <strong>Como criar uma Application Password no WordPress:</strong><br />
                Acesse <em>Painel WP → Usuários → Seu Perfil → Application Passwords</em>.
                Dê um nome (ex: BlogNave) e clique em <em>Adicionar nova</em>.
                Copie a senha gerada (só é mostrada uma vez).
              </div>
            </div>
          )}

          <form id="site-form" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error"><span className="alert-icon">⚠️</span>{error}</div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nome do Cliente <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="Ex: Acme Corp"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nome Interno <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={form.internal_name}
                  onChange={e => setForm(f => ({ ...f, internal_name: e.target.value }))}
                  placeholder="Ex: acme-blog"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">URL do Site <span className="required">*</span></label>
              <input
                className="form-input"
                type="url"
                value={form.site_url}
                onChange={e => setForm(f => ({ ...f, site_url: e.target.value }))}
                placeholder="https://seusite.com"
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Usuário WordPress <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={form.wp_username}
                  onChange={e => setForm(f => ({ ...f, wp_username: e.target.value }))}
                  placeholder="admin"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Application Password {!isEdit && <span className="required">*</span>}
                </label>
                <input
                  className="form-input"
                  type="password"
                  value={form.wp_credential}
                  onChange={e => setForm(f => ({ ...f, wp_credential: e.target.value }))}
                  placeholder={isEdit ? 'Deixe em branco para não alterar' : 'xxxx xxxx xxxx xxxx xxxx xxxx'}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Fuso Horário</label>
              <select
                className="form-input form-select"
                value={form.timezone}
                onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            form="site-form"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar site'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SitesClient({ sites: initialSites }: { sites: Site[] }) {
  const [sites, setSites] = useState(initialSites);
  const [showModal, setShowModal] = useState(false);
  const [editSite, setEditSite] = useState<Site | undefined>();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; error?: string; categories?: number; authors?: number }>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function reloadSites() {
    const res = await fetch('/api/sites');
    const data = await res.json();
    setSites(data.sites || []);
  }

  async function testConnection(siteId: string) {
    setTestingId(siteId);
    try {
      const res = await fetch(`/api/sites/${siteId}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult(prev => ({
        ...prev,
        [siteId]: {
          success: data.success,
          error: data.error,
          categories: data.categories?.length,
          authors: data.authors?.length,
        },
      }));
      await reloadSites();
    } finally {
      setTestingId(null);
    }
  }

  async function syncSite(siteId: string) {
    setSyncingId(siteId);
    try {
      await fetch(`/api/sites/${siteId}/sync`, { method: 'POST' });
      await reloadSites();
    } finally {
      setSyncingId(null);
    }
  }

  async function deleteSite(siteId: string) {
    if (!confirm('Tem certeza que deseja remover este site? Todo o histórico de artigos será excluído.')) return;
    setDeletingId(siteId);
    try {
      await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });
      await reloadSites();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sites WordPress</h1>
          <p className="page-subtitle">{sites.length} site(s) cadastrado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditSite(undefined); setShowModal(true); }}>+ Novo Site</button>
      </div>

      <div className="page-body">
        {sites.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🌐</span>
            <h3>Nenhum site cadastrado</h3>
            <p>Adicione o primeiro site WordPress para começar a gerenciar conteúdo.</p>
            <button className="btn btn-primary" onClick={() => { setEditSite(undefined); setShowModal(true); }}>+ Adicionar site</button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Cache</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(site => (
                  <tr key={site.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{site.internal_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{site.client_name} · @{site.wp_username}</div>
                    </td>
                    <td>
                      <a href={site.site_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {site.site_url.replace(/^https?:\/\//, '')} ↗
                      </a>
                    </td>
                    <td>
                      <div style={{ marginBottom: 4 }}>
                        <ConnectionBadge status={site.connection_status} />
                      </div>
                      {testResult[site.id] && (
                        <div style={{ fontSize: 11 }}>
                          {testResult[site.id].success ? (
                            <span style={{ color: 'var(--accent-success)' }}>
                              ✓ {testResult[site.id].categories} cats, {testResult[site.id].authors} autores
                            </span>
                          ) : (
                            <span style={{ color: 'var(--accent-danger)' }}>
                              {testResult[site.id].error}
                            </span>
                          )}
                        </div>
                      )}
                      {site.connection_error && !testResult[site.id] && (
                        <div style={{ fontSize: 11, color: 'var(--accent-danger)', marginTop: 2 }}>{site.connection_error}</div>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {Array.isArray(site.wp_categories) ? `${site.wp_categories.length} cats` : '—'}
                      {' / '}
                      {Array.isArray(site.wp_authors) ? `${site.wp_authors.length} autores` : '—'}
                      {site.wp_cache_synced_at && (
                        <div style={{ fontSize: 11, marginTop: 2 }}>
                          Sync: {new Date(site.wp_cache_synced_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => testConnection(site.id)}
                          disabled={testingId === site.id}
                          title="Testar conexão"
                        >
                          {testingId === site.id ? '...' : '🔗 Testar'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => syncSite(site.id)}
                          disabled={syncingId === site.id}
                          title="Sincronizar categorias e autores"
                        >
                          {syncingId === site.id ? '...' : '🔄'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setEditSite(site); setShowModal(true); }}
                          title="Editar"
                        >✏️</button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteSite(site.id)}
                          disabled={deletingId === site.id}
                          title="Remover"
                        >{deletingId === site.id ? '...' : '🗑️'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <SiteModal
          site={editSite}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); reloadSites(); }}
        />
      )}
    </>
  );
}
