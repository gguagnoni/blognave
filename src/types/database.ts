export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sites: {
        Row: Site;
        Insert: Omit<Site, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Site, 'id' | 'created_at'>>;
      };
      provider_connections: {
        Row: ProviderConnection;
        Insert: Omit<ProviderConnection, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProviderConnection, 'id' | 'created_at'>>;
      };
      content_jobs: {
        Row: ContentJob;
        Insert: Omit<ContentJob, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ContentJob, 'id' | 'created_at'>>;
      };
      article_assets: {
        Row: ArticleAsset;
        Insert: Omit<ArticleAsset, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ArticleAsset, 'id' | 'created_at'>>;
      };
      api_usage_events: {
        Row: ApiUsageEvent;
        Insert: Omit<ApiUsageEvent, 'id' | 'created_at'>;
        Update: never;
      };
      job_events: {
        Row: JobEvent;
        Insert: Omit<JobEvent, 'id' | 'created_at'>;
        Update: never;
      };
      wp_cache: {
        Row: WpCache;
        Insert: Omit<WpCache, 'id'>;
        Update: Partial<Omit<WpCache, 'id' | 'site_id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export interface Site {
  id: string;
  client_name: string;
  internal_name: string;
  site_url: string;
  timezone: string;
  wp_username: string;
  wp_credential_encrypted: string;
  connection_status: 'pending' | 'connected' | 'error' | 'disconnected';
  connection_error: string | null;
  last_connected_at: string | null;
  wp_categories: WpCategory[];
  wp_authors: WpAuthor[];
  wp_posts_cache: WpPostSummary[];
  wp_cache_synced_at: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WpCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WpAuthor {
  id: number;
  name: string;
  slug: string;
}

export interface WpPostSummary {
  id: number;
  title: string;
  slug: string;
  link: string;
  status: string;
}

export interface ProviderConnection {
  id: string;
  name: string;
  provider_type: 'text' | 'image';
  provider: string;
  model: string | null;
  endpoint_url: string | null;
  api_key_encrypted: string;
  parameters: Record<string, unknown>;
  capabilities: Record<string, unknown>;
  validation_status: 'pending' | 'valid' | 'invalid';
  validation_error: string | null;
  last_validated_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type JobStatus =
  | 'queued'
  | 'generating_text'
  | 'generating_images'
  | 'needs_review'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'canceled';

export interface ContentJob {
  id: string;
  site_id: string;
  provider_text_id: string | null;
  provider_image_id: string | null;
  topic: string;
  language: string;
  main_keyword: string | null;
  additional_instructions: string | null;
  target_word_count: number;
  tone: string;
  wp_category_id: number | null;
  wp_category_name: string | null;
  wp_author_id: number | null;
  wp_author_name: string | null;
  internal_links_enabled: boolean;
  internal_links_config: Array<{ title: string; url: string }>;
  external_links_enabled: boolean;
  external_links_config: Array<{ url: string; label?: string }>;
  featured_image_enabled: boolean;
  body_images_enabled: boolean;
  body_images_count: number;
  image_instructions: string | null;
  image_style: string | null;
  image_aspect_ratio: string;
  scheduled_at: string | null;
  publish_timezone: string;
  auto_publish: boolean;
  title: string | null;
  content_html: string | null;
  slug: string | null;
  meta_description: string | null;
  excerpt: string | null;
  actual_word_count: number | null;
  wp_post_id: number | null;
  wp_post_url: string | null;
  wp_featured_media_id: number | null;
  status: JobStatus;
  attempt_count: number;
  last_error: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
  generating_text_at: string | null;
  generating_images_at: string | null;
  needs_review_at: string | null;
  publishing_at: string | null;
  published_at: string | null;
  failed_at: string | null;
  canceled_at: string | null;
}

export interface ArticleAsset {
  id: string;
  job_id: string;
  asset_type: 'featured' | 'body';
  provider_id: string | null;
  prompt_used: string | null;
  storage_path: string | null;
  storage_url: string | null;
  wp_media_id: number | null;
  wp_media_url: string | null;
  alt_text: string | null;
  position: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApiUsageEvent {
  id: string;
  provider_id: string | null;
  site_id: string | null;
  job_id: string | null;
  call_type: 'text_generation' | 'image_generation' | 'connection_test' | 'sync';
  model: string | null;
  provider_name: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  images_count: number | null;
  duration_ms: number | null;
  cost_known: number | null;
  cost_currency: string;
  is_cost_estimated: boolean;
  status: 'success' | 'error';
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}

export interface JobEvent {
  id: string;
  job_id: string;
  from_status: string | null;
  to_status: string;
  message: string | null;
  technical_detail: string | null;
  error_code: string | null;
  attempt_number: number | null;
  created_at: string;
}

export interface WpCache {
  id: string;
  site_id: string;
  cache_type: 'categories' | 'authors' | 'posts';
  data: Json[];
  synced_at: string;
}
