export interface Content {
  id: number;
  channel: string;
  content_text: string;
  media_url?: string;
  external_id?: string;
  status: 'queued' | 'posted' | 'failed';
  created_at: string;
  posted_at?: string;
  strategy_version?: number;
  template_version?: string;
}

export interface Metric {
  id: number;
  content_id: number;
  channel: string;
  impressions: number;
  engagements: number;
  clicks: number;
  engagement_rate: number;
  timestamp: string;
}

export interface AnalyticsSummary {
  period: string;
  total_posts: number;
  total_impressions: number;
  total_engagements: number;
  total_clicks: number;
  avg_engagement_rate: number;
  by_channel: Record<string, {
    posts: number;
    impressions: number;
    engagements: number;
    clicks: number;
    avg_engagement_rate: number;
  }>;
}

export interface Strategy {
  version: number;
  last_updated: string;
  updated_by: string;
  content_strategy: {
    themes: string[];
    theme_weights: Record<string, number>;
    content_mix: Record<string, number>;
  };
  posting_optimization: {
    best_times: Record<string, string[]>;
    best_days: {
      high_engagement: string[];
      low_engagement: string[];
    };
  };
  engagement_tactics: {
    hashtag_strategy: string;
    max_hashtags: number;
    emoji_usage: string;
    question_posts_ratio: number;
    cta_types: string[];
  };
  performance_thresholds: {
    min_engagement_rate: number;
    target_engagement_rate: number;
    alert_drop_percentage: number;
  };
}

export interface StrategyLog {
  id: number;
  changed_at: string;
  changed_by: string;
  field: string;
  old_value: string;
  new_value: string;
  reason: string;
}

export interface EvolutionLog {
  id: number;
  timestamp: string;
  level: number;
  component: string;
  change_description: string;
  performance_before?: string;
  performance_after?: string;
  rolled_back: boolean;
}

export interface HealthStatus {
  status: string;
  version: string;
  uptime: number;
}

export type Channel = 'twitter' | 'instagram' | 'facebook' | 'blog_naver' | 'blog_tistory' | 'email';
