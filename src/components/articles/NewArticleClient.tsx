'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TONES = [
  { value: 'informativo', label: 'Informativo' },
  { value: 'conversacional', label: 'Conversacional' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'direto', label: 'Direto' },
];

const LANGUAGES = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es', label: 'Español' },
];

const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '1:1', label: '1:1 (Quadrado)' },
  { value: '4:3', label: '4:3' },
  { value: '9:16', label: '9:16 (Vertical)' },
];

interface SiteData {
  id: string;
  internal_name: string;
  timezone: string;
  wp_categories: Array<{ id: number; name: string; slug: string; count: number }>;
  wp_authors: Array<{ id: number; name: string; slug: string }>;
  wp_posts_cache: Array<{ id: number; title: string; slug: string; link: string; status: string }>;
}

interface Provider {
  id: string;
  name: string;
  provider_type: 'text' | 'image';
  provider: string;
  model: string | null;
}

export default function NewArticleClient({
  sites,
  providers,
}: {
  sites: SiteData[];
  providers: Provider[];
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const textProviders = providers.filter(p => p.provider_type === 'text');
  const imageProviders = providers.filter(p => p.provider_type === 'image');

  const [form, setForm] = useState({
    site_id: sites[0]?.id || '',
    provider_text_id: textProviders[0]?.id || '',
    provider_image_id: imageProviders[0]?.id || '',
    topic: '',
    language: 'pt-BR',
    main_keyword: '',
    additional_instructions: '',
    target_word_count: 1000,
    tone: 'informativo',
    wp_category_id: '',
    wp_category_name: '',
    wp_author_id: '',
    wp_author_name: '',
    internal_links_enabled: false,
    internal_links: [] as Array<{ title: string; url: string }>,
    external_links_enabled: false,
    external_links: [] as Array<{ url: string }>,
    featured_image_enabled: false,
    body_images_enabled: false,
    body_images_count: 1,
    image_instructions: '',
    image_style: '',
    image_aspect_ratio: '16:9',
    scheduled_at: '',
    publish_timezone: 'America/Sao_Paulo',
    auto_publish: false,
  });

  const selectedSite = sites.find(s => s.id === form.site_id);
  const categories = selectedSite?.wp_categories || [];
  const authors = selectedSite?.wp_authors || [];
  const existingPosts = selectedSite?.wp_posts_cache || [];

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function addInternalLink() {
    setForm(f => ({ ...f, internal_links: [...f.internal_links, { title: '', url: '' }] }));
  }

  function addExternalLink() {
    setForm(f => ({ ...f, external_links: [...f.external_links, { url: '' }] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.site_id || !form.provider_text_id || !form.topic) {
      setError('Site, provedor de texto e tema são obrigatórios');
      return;
    }
    if (!sites.length) {
      setError('Nenhum site conectado disponível. Conecte um site WordPress primeiro.');
      return;
    }
    if (!textProviders.length) {
      setError('Nenhum provedor de texto válido. Configure e valide um provedor primeiro.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      site_id: form.site_id,
      provider_text_id: form.provider_text_id,
      provider_image_id: (form.featured_image_enabled || form.body_images_enabled) ? form.provider_image_id : null,
      topic: form.topic,
      language: form.language,
      main_keyword: form.main_keyword || null,
      additional_instructions: form.additional_instructions || null,
      target_word_count: form.target_word_count,
      tone: form.tone,
      wp_category_id: form.wp_category_id ? parseInt(form.wp_category_id) : null,
      wp_category_name: form.wp_category_name || null,
      wp_author_id: form.wp_author_id ? parseInt(form.wp_author_id) : null,
      wp_author_name: form.wp_author_name || null,
      internal_links_enabled: form.internal_links_enabled,
      internal_links_config: form.internal_links,
      external_links_enabled: form.external_links_enabled,
      external_links_config: form.external_links,
      featured_image_enabled: form.featured_image_enabled,
      body_images_enabled: form.body_images_enabled,
      body_images_count: form.body_images_count,
      image_instructions: form.image_instructions || null,
      image_style: form.image_style || null,
      image_aspect_ratio: form.image_aspect_ratio,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      publish_timezone: form.publish_timezone,
      auto_publish: false, // operador deve aprovar manualmente
    };

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar artigo');
        return;
      }
      router.push(`/articles/${data.job.id}`);
    } catch {
      setError('Erro de rede');
    } finally {
      setLoading(false);
    }
  }

  if (sites.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Novo Artigo</h1>
        </div>
        <div className="page-body">
          <div className="alert alert-warning">
            <span className="alert-icon">⚠️</span>
            <div>
              Nenhum site WordPress conectado. <a href="/sites">Conecte um site</a> antes de criar artigos.
            </div>
          </div>
        </div>
      </>
    );
  }

  if (textProviders.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Novo Artigo</h1>
        </div>
        <div className="page-body">
          <div className="alert alert-warning">
            <span className="alert-icon">⚠️</span>
            <div>
              Nenhum provedor de texto válido. <a href="/providers">Configure e valide um provedor</a> primeiro.
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Novo Artigo</h1>
        <p className="page-subtitle" style={{ display: 'none' }}>Configure e gere um novo artigo com IA</p>
      </div>

      <div className="page-body">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><span className="alert-icon">⚠️</span>{error}</div>}

          <div style={{ display: 'grid', gap: 24 }}>
            {/* Seção: Site e Provedores */}
            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🌐 Site e Provedores</h2>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Site WordPress <span className="required">*</span></label>
                  <select
                    className="form-input form-select"
                    value={form.site_id}
                    onChange={e => setField('site_id', e.target.value)}
                  >
                    {sites.map(s => <option key={s.id} value={s.id}>{s.internal_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Provedor de Texto <span className="required">*</span></label>
                  <select
                    className="form-input form-select"
                    value={form.provider_text_id}
                    onChange={e => setField('provider_text_id', e.target.value)}
                  >
                    {textProviders.map(p => <option key={p.id} value={p.id}>{p.name} ({p.provider}/{p.model || 'padrão'})</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Seção: Tema e Configuração */}
            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>✍️ Tema e Configuração</h2>

              <div className="form-group">
                <label className="form-label">Tema / Briefing <span className="required">*</span></label>
                <textarea
                  className="form-input form-textarea"
                  value={form.topic}
                  onChange={e => setField('topic', e.target.value)}
                  placeholder="Descreva o tema do artigo. Pode ser um título, uma pergunta ou um briefing completo."
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Idioma</label>
                  <select className="form-input form-select" value={form.language} onChange={e => setField('language', e.target.value)}>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Palavra-chave Principal</label>
                  <input className="form-input" value={form.main_keyword} onChange={e => setField('main_keyword', e.target.value)} placeholder="Ex: receitas fitness" />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tom</label>
                  <select className="form-input form-select" value={form.tone} onChange={e => setField('tone', e.target.value)}>
                    {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Meta de Palavras</label>
                  <input type="number" className="form-input" min={200} max={10000} step={100} value={form.target_word_count} onChange={e => setField('target_word_count', parseInt(e.target.value))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Instruções Adicionais</label>
                <textarea
                  className="form-input form-textarea"
                  style={{ minHeight: 80 }}
                  value={form.additional_instructions}
                  onChange={e => setField('additional_instructions', e.target.value)}
                  placeholder="Outras orientações para o modelo de IA (opcional)"
                />
              </div>
            </div>

            {/* Seção: WordPress */}
            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📂 Configuração WordPress</h2>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select
                    className="form-input form-select"
                    value={form.wp_category_id}
                    onChange={e => {
                      const cat = categories.find(c => String(c.id) === e.target.value);
                      setForm(f => ({ ...f, wp_category_id: e.target.value, wp_category_name: cat?.name || '' }));
                    }}
                  >
                    <option value="">Sem categoria específica</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {categories.length === 0 && <p className="form-hint">Sincronize o site para carregar categorias</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Autor</label>
                  <select
                    className="form-input form-select"
                    value={form.wp_author_id}
                    onChange={e => {
                      const author = authors.find(a => String(a.id) === e.target.value);
                      setForm(f => ({ ...f, wp_author_id: e.target.value, wp_author_name: author?.name || '' }));
                    }}
                  >
                    <option value="">Autor padrão</option>
                    {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Seção: Links */}
            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔗 Links</h2>

              <div
                className="toggle-group"
                style={{ marginBottom: form.internal_links_enabled ? 12 : 0 }}
                onClick={() => setField('internal_links_enabled', !form.internal_links_enabled)}
              >
                <span style={{ fontSize: 14 }}>Links internos (para artigos do próprio site)</span>
                <div className={`toggle-switch ${form.internal_links_enabled ? 'active' : ''}`} />
              </div>

              {form.internal_links_enabled && (
                <div style={{ marginBottom: 16 }}>
                  {form.internal_links.map((link, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <select
                        className="form-input form-select"
                        style={{ flex: 1 }}
                        value={link.url}
                        onChange={e => {
                          const post = existingPosts.find(p => p.link === e.target.value);
                          const newLinks = [...form.internal_links];
                          newLinks[i] = { url: e.target.value, title: post?.title || '' };
                          setField('internal_links', newLinks);
                        }}
                      >
                        <option value="">Selecione um artigo...</option>
                        {existingPosts.map(p => <option key={p.id} value={p.link}>{p.title}</option>)}
                      </select>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setField('internal_links', form.internal_links.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={addInternalLink}>+ Adicionar link interno</button>
                  {existingPosts.length === 0 && <p className="form-hint">Sincronize o site para carregar artigos existentes.</p>}
                </div>
              )}

              <div
                className="toggle-group"
                style={{ marginTop: 12, marginBottom: form.external_links_enabled ? 12 : 0 }}
                onClick={() => setField('external_links_enabled', !form.external_links_enabled)}
              >
                <span style={{ fontSize: 14 }}>Links externos (URLs permitidas como fontes)</span>
                <div className={`toggle-switch ${form.external_links_enabled ? 'active' : ''}`} />
              </div>

              {form.external_links_enabled && (
                <div>
                  {form.external_links.map((link, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <input
                        className="form-input"
                        style={{ flex: 1 }}
                        type="url"
                        placeholder="https://fonte-autoridade.com/artigo"
                        value={link.url}
                        onChange={e => {
                          const newLinks = [...form.external_links];
                          newLinks[i] = { url: e.target.value };
                          setField('external_links', newLinks);
                        }}
                      />
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setField('external_links', form.external_links.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={addExternalLink}>+ Adicionar fonte externa</button>
                  <p className="form-hint">Apenas URLs fornecidas aqui serão usadas. A IA não inventará fontes.</p>
                </div>
              )}
            </div>

            {/* Seção: Imagens */}
            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🖼️ Imagens</h2>

              {imageProviders.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Provedor de Imagem</label>
                  <select
                    className="form-input form-select"
                    value={form.provider_image_id}
                    onChange={e => setField('provider_image_id', e.target.value)}
                  >
                    {imageProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <div
                className="toggle-group"
                style={{ marginBottom: 12 }}
                onClick={() => setField('featured_image_enabled', !form.featured_image_enabled)}
              >
                <span style={{ fontSize: 14 }}>Gerar imagem destacada</span>
                <div className={`toggle-switch ${form.featured_image_enabled ? 'active' : ''}`} />
              </div>

              <div
                className="toggle-group"
                style={{ marginBottom: form.body_images_enabled ? 12 : 0 }}
                onClick={() => setField('body_images_enabled', !form.body_images_enabled)}
              >
                <span style={{ fontSize: 14 }}>Gerar imagens no corpo do artigo</span>
                <div className={`toggle-switch ${form.body_images_enabled ? 'active' : ''}`} />
              </div>

              {form.body_images_enabled && (
                <div className="form-group">
                  <label className="form-label">Quantidade de imagens no corpo</label>
                  <input type="number" className="form-input" min={1} max={5} value={form.body_images_count} onChange={e => setField('body_images_count', parseInt(e.target.value))} style={{ maxWidth: 100 }} />
                </div>
              )}

              {(form.featured_image_enabled || form.body_images_enabled) && (
                <>
                  <div className="grid-2" style={{ marginTop: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Proporção da imagem</label>
                      <select className="form-input form-select" value={form.image_aspect_ratio} onChange={e => setField('image_aspect_ratio', e.target.value)}>
                        {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estilo visual</label>
                      <input className="form-input" value={form.image_style} onChange={e => setField('image_style', e.target.value)} placeholder="Ex: fotorrealismo, minimalista, flat" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Instruções para a imagem</label>
                    <textarea className="form-input" style={{ minHeight: 70 }} value={form.image_instructions} onChange={e => setField('image_instructions', e.target.value)} placeholder="Descreva o que as imagens devem mostrar (opcional)" />
                  </div>
                  {imageProviders.length === 0 && (
                    <div className="alert alert-warning">
                      <span className="alert-icon">⚠️</span>
                      Nenhum provedor de imagem válido. <a href="/providers">Configure um provedor de imagem</a>.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Seção: Agendamento */}
            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📅 Agendamento</h2>
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <span className="alert-icon">ℹ️</span>
                <div>
                  O artigo sempre aguardará revisão antes de ser publicado (modo automático desativado por padrão).
                  Após revisar, você aprova a publicação na esteira.
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Data e hora de publicação</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={form.scheduled_at}
                    onChange={e => setField('scheduled_at', e.target.value)}
                  />
                  <p className="form-hint">Deixe em branco para publicar imediatamente após revisão</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Fuso horário</label>
                  <select className="form-input form-select" value={form.publish_timezone} onChange={e => setField('publish_timezone', e.target.value)}>
                    <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <a href="/articles" className="btn btn-secondary">Cancelar</a>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? '⏳ Enviando para fila...' : '🚀 Criar e Enfileirar Artigo'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
