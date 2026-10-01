-- =============================================
-- Migration 001: Enable extensions and create base tables
-- BlogNave SaaS - WordPress Content Management
-- =============================================

-- Extensions (já instaladas no Supabase, garantir ativação)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- =============================================
-- ENUM-like check constraints via domain
-- =============================================

-- =============================================
-- TABLE: sites
-- =============================================
CREATE TABLE IF NOT EXISTS public.sites (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name             text NOT NULL,
  internal_name           text NOT NULL,
  site_url                text NOT NULL,
  timezone                text NOT NULL DEFAULT 'America/Sao_Paulo',
  wp_username             text NOT NULL,
  wp_credential_encrypted text NOT NULL,
  connection_status       text NOT NULL DEFAULT 'pending'
                          CHECK (connection_status IN ('pending','connected','error','disconnected')),
  connection_error        text,
  last_connected_at       timestamptz,
  wp_categories           jsonb NOT NULL DEFAULT '[]',
  wp_authors              jsonb NOT NULL DEFAULT '[]',
  wp_posts_cache          jsonb NOT NULL DEFAULT '[]',
  wp_cache_synced_at      timestamptz,
  metadata                jsonb NOT NULL DEFAULT '{}',
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sites_url_check CHECK (site_url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS idx_sites_status ON public.sites(connection_status);
CREATE INDEX IF NOT EXISTS idx_sites_active ON public.sites(is_active);

-- =============================================
-- TABLE: provider_connections
-- =============================================
CREATE TABLE IF NOT EXISTS public.provider_connections (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                text NOT NULL,
  provider_type       text NOT NULL CHECK (provider_type IN ('text', 'image')),
  provider            text NOT NULL,
  model               text,
  endpoint_url        text,
  api_key_encrypted   text NOT NULL,
  parameters          jsonb NOT NULL DEFAULT '{}',
  capabilities        jsonb NOT NULL DEFAULT '{}',
  validation_status   text NOT NULL DEFAULT 'pending'
                      CHECK (validation_status IN ('pending','valid','invalid')),
  validation_error    text,
  last_validated_at   timestamptz,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_providers_type ON public.provider_connections(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_active ON public.provider_connections(is_active);

-- =============================================
-- TABLE: content_jobs
-- =============================================
CREATE TABLE IF NOT EXISTS public.content_jobs (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id                 uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  provider_text_id        uuid REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  provider_image_id       uuid REFERENCES public.provider_connections(id) ON DELETE SET NULL,

  -- Briefing
  topic                   text NOT NULL,
  language                text NOT NULL DEFAULT 'pt-BR',
  main_keyword            text,
  additional_instructions text,
  target_word_count       integer NOT NULL DEFAULT 1000,
  tone                    text NOT NULL DEFAULT 'informativo',

  -- WordPress config
  wp_category_id          integer,
  wp_category_name        text,
  wp_author_id            integer,
  wp_author_name          text,

  -- Links
  internal_links_enabled  boolean NOT NULL DEFAULT false,
  internal_links_config   jsonb NOT NULL DEFAULT '[]',
  external_links_enabled  boolean NOT NULL DEFAULT false,
  external_links_config   jsonb NOT NULL DEFAULT '[]',

  -- Images
  featured_image_enabled  boolean NOT NULL DEFAULT false,
  body_images_enabled     boolean NOT NULL DEFAULT false,
  body_images_count       integer NOT NULL DEFAULT 0,
  image_instructions      text,
  image_style             text,
  image_aspect_ratio      text NOT NULL DEFAULT '16:9',

  -- Schedule
  scheduled_at            timestamptz,
  publish_timezone        text NOT NULL DEFAULT 'America/Sao_Paulo',
  auto_publish            boolean NOT NULL DEFAULT false,

  -- Generated content (editable by operator)
  title                   text,
  content_html            text,
  slug                    text,
  meta_description        text,
  excerpt                 text,
  actual_word_count       integer,

  -- WordPress publish result
  wp_post_id              integer,
  wp_post_url             text,
  wp_featured_media_id    integer,

  -- Status
  status                  text NOT NULL DEFAULT 'queued'
                          CHECK (status IN (
                            'queued','generating_text','generating_images',
                            'needs_review','scheduled','publishing',
                            'published','failed','canceled'
                          )),
  attempt_count           integer NOT NULL DEFAULT 0,
  last_error              text,
  last_error_code         text,

  -- Timestamps
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  generating_text_at      timestamptz,
  generating_images_at    timestamptz,
  needs_review_at         timestamptz,
  publishing_at           timestamptz,
  published_at            timestamptz,
  failed_at               timestamptz,
  canceled_at             timestamptz
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled
  ON public.content_jobs(status, scheduled_at)
  WHERE status IN ('queued','scheduled');

CREATE INDEX IF NOT EXISTS idx_jobs_site_status
  ON public.content_jobs(site_id, status);

CREATE INDEX IF NOT EXISTS idx_jobs_status_updated
  ON public.content_jobs(status, updated_at);

-- =============================================
-- TABLE: article_assets
-- =============================================
CREATE TABLE IF NOT EXISTS public.article_assets (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        uuid NOT NULL REFERENCES public.content_jobs(id) ON DELETE CASCADE,
  asset_type    text NOT NULL CHECK (asset_type IN ('featured', 'body')),
  provider_id   uuid REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  prompt_used   text,
  storage_path  text,
  storage_url   text,
  wp_media_id   integer,
  wp_media_url  text,
  alt_text      text,
  position      integer NOT NULL DEFAULT 0,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_job ON public.article_assets(job_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.article_assets(job_id, asset_type);

-- =============================================
-- TABLE: api_usage_events
-- =============================================
CREATE TABLE IF NOT EXISTS public.api_usage_events (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id       uuid REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  site_id           uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  job_id            uuid REFERENCES public.content_jobs(id) ON DELETE SET NULL,
  call_type         text NOT NULL CHECK (call_type IN (
                      'text_generation','image_generation','connection_test','sync'
                    )),
  model             text,
  provider_name     text NOT NULL,
  input_tokens      integer,
  output_tokens     integer,
  total_tokens      integer,
  images_count      integer,
  duration_ms       integer,
  cost_known        numeric(12,6),
  cost_currency     text NOT NULL DEFAULT 'USD',
  is_cost_estimated boolean NOT NULL DEFAULT false,
  status            text NOT NULL CHECK (status IN ('success','error')),
  error_code        text,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_provider_date
  ON public.api_usage_events(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_site_date
  ON public.api_usage_events(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_job
  ON public.api_usage_events(job_id);
CREATE INDEX IF NOT EXISTS idx_usage_date
  ON public.api_usage_events(created_at DESC);

-- =============================================
-- TABLE: job_events (audit trail)
-- =============================================
CREATE TABLE IF NOT EXISTS public.job_events (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id           uuid NOT NULL REFERENCES public.content_jobs(id) ON DELETE CASCADE,
  from_status      text,
  to_status        text NOT NULL,
  message          text,
  technical_detail text,
  error_code       text,
  attempt_number   integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_events_job
  ON public.job_events(job_id, created_at DESC);

-- =============================================
-- TABLE: wp_cache (categorias, autores, posts)
-- =============================================
CREATE TABLE IF NOT EXISTS public.wp_cache (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id     uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  cache_type  text NOT NULL CHECK (cache_type IN ('categories','authors','posts')),
  data        jsonb NOT NULL DEFAULT '[]',
  synced_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, cache_type)
);

CREATE INDEX IF NOT EXISTS idx_wp_cache_site
  ON public.wp_cache(site_id, cache_type);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_sites
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_providers
  BEFORE UPDATE ON public.provider_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_jobs
  BEFORE UPDATE ON public.content_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_assets
  BEFORE UPDATE ON public.article_assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.sites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_jobs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_assets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wp_cache            ENABLE ROW LEVEL SECURITY;

-- Deny ALL for anon role (acesso apenas via service_role no servidor)
CREATE POLICY "deny_anon_sites"
  ON public.sites FOR ALL TO anon USING (false);

CREATE POLICY "deny_anon_providers"
  ON public.provider_connections FOR ALL TO anon USING (false);

CREATE POLICY "deny_anon_jobs"
  ON public.content_jobs FOR ALL TO anon USING (false);

CREATE POLICY "deny_anon_assets"
  ON public.article_assets FOR ALL TO anon USING (false);

CREATE POLICY "deny_anon_usage"
  ON public.api_usage_events FOR ALL TO anon USING (false);

CREATE POLICY "deny_anon_job_events"
  ON public.job_events FOR ALL TO anon USING (false);

CREATE POLICY "deny_anon_wp_cache"
  ON public.wp_cache FOR ALL TO anon USING (false);
