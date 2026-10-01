import type { WpCategory, WpAuthor, WpPostSummary } from '@/types/database';

function getAuthHeader(username: string, password: string): Record<string, string> {
  // Application Passwords do WP têm espaços — remover antes de codificar
  const clean = password.replace(/\s+/g, '');
  const encoded = Buffer.from(`${username}:${clean}`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export interface WpConnectionTestResult {
  success: boolean;
  error?: string;
  errorCode?: 'URL_INVALID' | 'AUTH_FAILED' | 'REST_UNAVAILABLE' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN';
  user?: { id: number; name: string; roles: string[] };
}

export async function testWpConnection(
  siteUrl: string,
  username: string,
  password: string
): Promise<WpConnectionTestResult> {
  const base = normalizeUrl(siteUrl);
  const authHeader = getAuthHeader(username, password);

  try {
    const res = await fetch(`${base}/wp-json/wp/v2/users/me`, {
      headers: authHeader,
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: 'Credencial recusada. Verifique usuário e Application Password.', errorCode: 'AUTH_FAILED' };
    }
    if (res.status === 404) {
      return { success: false, error: 'REST API do WordPress não encontrada. Verifique se a URL está correta e se o REST API está habilitado.', errorCode: 'REST_UNAVAILABLE' };
    }
    if (!res.ok) {
      return { success: false, error: `Erro HTTP ${res.status}: ${res.statusText}`, errorCode: 'UNKNOWN' };
    }

    const user = await res.json();
    const roles: string[] = Object.keys(user.roles || {});
    const hasPermission = roles.some(r => ['administrator', 'editor', 'author'].includes(r));

    if (!hasPermission) {
      return {
        success: false,
        error: `Usuário não tem permissão suficiente. Roles: ${roles.join(', ')}. Necessário: administrator, editor ou author.`,
        errorCode: 'PERMISSION_DENIED',
      };
    }

    return { success: true, user: { id: user.id, name: user.name, roles } };
  } catch (err: unknown) {
    if (err instanceof TypeError && String(err).includes('fetch')) {
      return { success: false, error: 'Não foi possível conectar ao site. Verifique a URL e se o site está online.', errorCode: 'NETWORK_ERROR' };
    }
    if (err instanceof Error && err.name === 'TimeoutError') {
      return { success: false, error: 'Timeout ao conectar ao WordPress (15s). O site pode estar lento ou inacessível.', errorCode: 'NETWORK_ERROR' };
    }
    return { success: false, error: String(err), errorCode: 'UNKNOWN' };
  }
}

export async function fetchWpCategories(siteUrl: string, username: string, password: string): Promise<WpCategory[]> {
  const base = normalizeUrl(siteUrl);
  const authHeader = getAuthHeader(username, password);
  const categories: WpCategory[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(`${base}/wp-json/wp/v2/categories?per_page=100&page=${page}`, {
      headers: authHeader,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    categories.push(...data.map((c: { id: number; name: string; slug: string; count: number }) => ({ id: c.id, name: c.name, slug: c.slug, count: c.count })));
    const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1');
    if (page >= totalPages) break;
    page++;
  }

  return categories;
}

export async function fetchWpAuthors(siteUrl: string, username: string, password: string): Promise<WpAuthor[]> {
  const base = normalizeUrl(siteUrl);
  const authHeader = getAuthHeader(username, password);
  const res = await fetch(`${base}/wp-json/wp/v2/users?per_page=100&who=authors`, {
    headers: authHeader,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((u: { id: number; name: string; slug: string }) => ({ id: u.id, name: u.name, slug: u.slug }));
}

export async function fetchWpPosts(siteUrl: string, username: string, password: string): Promise<WpPostSummary[]> {
  const base = normalizeUrl(siteUrl);
  const authHeader = getAuthHeader(username, password);
  const res = await fetch(`${base}/wp-json/wp/v2/posts?per_page=100&status=publish&_fields=id,title,slug,link,status`, {
    headers: authHeader,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((p: { id: number; title: { rendered: string }; slug: string; link: string; status: string }) => ({
    id: p.id,
    title: p.title.rendered,
    slug: p.slug,
    link: p.link,
    status: p.status,
  }));
}

export interface WpPublishOptions {
  title: string;
  contentHtml: string;
  slug: string;
  excerpt?: string;
  metaDescription?: string;
  status: 'publish' | 'draft' | 'future';
  date?: string; // ISO 8601 para agendamento
  categoryIds?: number[];
  authorId?: number;
  featuredMediaId?: number;
}

export interface WpPublishResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
}

export async function publishToWordPress(
  siteUrl: string,
  username: string,
  password: string,
  options: WpPublishOptions
): Promise<WpPublishResult> {
  const base = normalizeUrl(siteUrl);
  const authHeader = getAuthHeader(username, password);

  const body: Record<string, unknown> = {
    title: options.title,
    content: options.contentHtml,
    slug: options.slug,
    excerpt: options.excerpt || '',
    status: options.status,
  };

  if (options.date) body.date = options.date;
  if (options.categoryIds?.length) body.categories = options.categoryIds;
  if (options.authorId) body.author = options.authorId;
  if (options.featuredMediaId) body.featured_media = options.featuredMediaId;

  try {
    const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (errData as { message?: string }).message || `HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return { success: true, postId: data.id, postUrl: data.link };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function uploadMediaToWordPress(
  siteUrl: string,
  username: string,
  password: string,
  imageBuffer: Buffer,
  filename: string,
  altText: string
): Promise<{ mediaId: number; mediaUrl: string } | null> {
  const base = normalizeUrl(siteUrl);
  const authHeader = getAuthHeader(username, password);

  try {
    const res = await fetch(`${base}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Alt-Text': altText,
      },
      body: imageBuffer,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    // Atualizar alt text via PATCH
    await fetch(`${base}/wp-json/wp/v2/media/${data.id}`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ alt_text: altText }),
    });

    return { mediaId: data.id, mediaUrl: data.source_url };
  } catch {
    return null;
  }
}
