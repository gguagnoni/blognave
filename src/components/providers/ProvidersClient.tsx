'use client';
import { useState } from 'react';
import type { ProviderConnection } from '@/types/database';
import { PROVIDER_OPTIONS } from '@/lib/ai/factory';

function ValidationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    valid: { label: 'Válido', cls: 'badge-valid' },
    invalid: { label: 'Inválido', cls: 'badge-invalid' },
    pending: { label: 'Pendente', cls: 'badge-pending' },
  };
  const info = map[status] || { label: status, cls: 'badge-pending' };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

function ProviderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    provider_type: 'text',
    provider: 'openai',
    model: '',
    endpoint_url: '',
    api_key: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedProviderOpts = PROVIDER_OPTIONS[form.provider_type as 'text' | 'image'];
  const selectedProvider = selectedProviderOpts.find(p => p.value === form.provider);
  const availableModels = selectedProvider?.models || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Novo Provedor de IA</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <span className="alert-icon">🔒</span>
            A chave de API é criptografada antes de ser armazenada. Nunca é enviada ao navegador.
          </div>

          <form id="provider-form" onSubmit={handleSubmit}>
            {error && <div className="alert alert-error"><span className="alert-icon">⚠️</span>{error}</div>}

            <div className="form-group">
              <label className="form-label">Nome <span className="required">*</span></label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: OpenAI GPT-4o" required />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tipo <span className="required">*</span></label>
                <select className="form-input form-select" value={form.provider_type} onChange={e => { setForm(f => ({ ...f, provider_type: e.target.value, provider: PROVIDER_OPTIONS[e.target.value as 'text' | 'image'][0].value, model: '' })); }}>
                  <option value="text">Texto</option>
                  <option value="image">Imagem</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Provedor <span className="required">*</span></label>
                <select className="form-input form-select" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value, model: '' }))}>
                  {PROVIDER_OPTIONS[form.provider_type as 'text' | 'image'].map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {availableModels.length > 0 ? (
              <div className="form-group">
                <label className="form-label">Modelo</label>
                <select className="form-input form-select" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}>
                  <option value="">Padrão do provedor</option>
                  {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Modelo</label>
                <input className="form-input" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Ex: gpt-4o-mini" />
              </div>
            )}

            {form.provider === 'custom' && (
              <div className="form-group">
                <label className="form-label">Endpoint URL <span className="required">*</span></label>
                <input className="form-input" value={form.endpoint_url} onChange={e => setForm(f => ({ ...f, endpoint_url: e.target.value }))} placeholder="https://api.meuservidor.com/v1" />
                <p className="form-hint">Para APIs compatíveis com o formato OpenAI (chat/completions)</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Chave de API <span className="required">*</span></label>
              <input
                className="form-input"
                type="password"
                value={form.api_key}
                onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                placeholder="sk-..."
                autoComplete="off"
                required
              />
              <p className="form-hint">Criptografada com AES-256-GCM. Nunca exibida novamente.</p>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" form="provider-form" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Criar provedor'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProvidersClient({ providers: initialProviders }: { providers: ProviderConnection[] }) {
  const [providers, setProviders] = useState(initialProviders);
  const [showModal, setShowModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string; models?: string[] }>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function reload() {
    const res = await fetch('/api/providers');
    const data = await res.json();
    setProviders(data.providers || []);
  }

  async function testProvider(id: string) {
    setTestingId(id);
    try {
      const res = await fetch(`/api/providers/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [id]: data }));
      await reload();
    } finally {
      setTestingId(null);
    }
  }

  async function deleteProvider(id: string) {
    if (!confirm('Remover este provedor? Artigos em andamento podem ser afetados.')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/providers/${id}`, { method: 'DELETE' });
      await reload();
    } finally {
      setDeletingId(null);
    }
  }

  const textProviders = providers.filter(p => p.provider_type === 'text');
  const imageProviders = providers.filter(p => p.provider_type === 'image');

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Provedores de IA</h1>
          <p className="page-subtitle">{providers.length} provedor(es) configurado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Provedor</button>
      </div>

      <div className="page-body">
        {providers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🤖</span>
            <h3>Nenhum provedor configurado</h3>
            <p>Configure um provedor de IA para começar a gerar artigos e imagens.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Adicionar provedor</button>
          </div>
        ) : (
          <>
            {textProviders.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>✍️ Provedores de Texto</h2>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Nome</th><th>Provedor</th><th>Modelo</th><th>Status</th><th>Ações</th></tr></thead>
                    <tbody>
                      {textProviders.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.provider}</td>
                          <td style={{ fontSize: 13 }}>{p.model || <span style={{ color: 'var(--text-muted)' }}>Padrão</span>}</td>
                          <td>
                            <ValidationBadge status={p.validation_status} />
                            {testResults[p.id] && (
                              <div style={{ fontSize: 11, marginTop: 4 }}>
                                {testResults[p.id].success
                                  ? <span style={{ color: 'var(--accent-success)' }}>✓ Conexão bem-sucedida</span>
                                  : <span style={{ color: 'var(--accent-danger)' }}>{testResults[p.id].error}</span>}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => testProvider(p.id)} disabled={testingId === p.id}>{testingId === p.id ? '...' : '🔗 Testar'}</button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteProvider(p.id)} disabled={deletingId === p.id}>{deletingId === p.id ? '...' : '🗑️'}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {imageProviders.length > 0 && (
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>🖼️ Provedores de Imagem</h2>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Nome</th><th>Provedor</th><th>Modelo</th><th>Status</th><th>Ações</th></tr></thead>
                    <tbody>
                      {imageProviders.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.provider}</td>
                          <td style={{ fontSize: 13 }}>{p.model || <span style={{ color: 'var(--text-muted)' }}>Padrão</span>}</td>
                          <td><ValidationBadge status={p.validation_status} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => testProvider(p.id)} disabled={testingId === p.id}>{testingId === p.id ? '...' : '🔗 Testar'}</button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteProvider(p.id)} disabled={deletingId === p.id}>{deletingId === p.id ? '...' : '🗑️'}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <ProviderModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); reload(); }} />
      )}
    </>
  );
}
