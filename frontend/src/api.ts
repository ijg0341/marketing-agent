const BASE = '/api';
const API_KEY_STORAGE = 'marketing_agent_api_key';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = getApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  const res = await fetch(`${BASE}${path}`, { headers, ...options });
  if (res.status === 401) throw new Error('AUTH_REQUIRED');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  health: () => request<any>('/health'),

  content: {
    list: (params?: { status?: string; channel?: string; limit?: number }) => {
      const p = new URLSearchParams();
      if (params?.status) p.set('status', params.status);
      if (params?.channel) p.set('channel', params.channel);
      if (params?.limit != null) p.set('limit', String(params.limit));
      const qs = p.toString();
      return request<any[]>(`/content${qs ? `?${qs}` : ''}`);
    },
    create: (data: { channel: string; content_text: string; media_url?: string; template_version?: string }) =>
      request<any>('/content', { method: 'POST', body: JSON.stringify(data) }),
    createBatch: (items: any[]) =>
      request<any>('/content/batch', { method: 'POST', body: JSON.stringify({ items }) }),
    queued: () => request<any[]>('/content/queued'),
    recent: (limit = 20) => request<any[]>(`/content/recent?limit=${limit}`),
    publish: () => request<any>('/content/publish', { method: 'POST' }),
  },

  analytics: {
    summary: (period = '7d') => request<any>(`/analytics?period=${period}`),
    details: (period = '7d') => request<any>(`/analytics/details?period=${period}`),
    collect: () => request<any>('/analytics/collect', { method: 'POST' }),
  },

  strategy: {
    get: () => request<any>('/strategy'),
    update: (data: { updates: any; changed_by: string; reason: string }) =>
      request<any>('/strategy', { method: 'PUT', body: JSON.stringify(data) }),
    log: (limit = 20) => request<any[]>(`/strategy/log?limit=${limit}`),
    evolution: (limit = 20) => request<any[]>(`/strategy/evolution?limit=${limit}`),
  },

  ads: {
    platforms: () => request<any[]>('/ads/platforms'),
    campaigns: (platform?: string, status?: string) => {
      const params = new URLSearchParams();
      if (platform) params.set('platform', platform);
      if (status) params.set('status', status);
      return request<any[]>(`/ads/campaigns?${params}`);
    },
    createCampaign: (data: any) => request<any>('/ads/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    getCampaign: (id: number) => request<any>(`/ads/campaigns/${id}`),
    updateCampaign: (id: number, data: any) => request<any>(`/ads/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCampaign: (id: number) => request<any>(`/ads/campaigns/${id}`, { method: 'DELETE' }),
    activateCampaign: (id: number) => request<any>(`/ads/campaigns/${id}/activate`, { method: 'POST' }),
    pauseCampaign: (id: number) => request<any>(`/ads/campaigns/${id}/pause`, { method: 'POST' }),
    resumeCampaign: (id: number) => request<any>(`/ads/campaigns/${id}/resume`, { method: 'POST' }),
    campaignMetrics: (id: number, days?: number) => request<any>(`/ads/campaigns/${id}/metrics?days=${days || 7}`),
    createDraft: () => request<any>('/ads/campaigns/draft', { method: 'POST' }),
  },

  ga4: {
    status: () => request<any>('/ga4/status'),
    overview: (period = '7d') => request<any>(`/ga4/overview?period=${period}`),
    trafficSources: (period = '7d') => request<any>(`/ga4/traffic/sources?period=${period}`),
    trafficChannels: (period = '7d') => request<any>(`/ga4/traffic/channels?period=${period}`),
    daily: (period = '7d') => request<any>(`/ga4/daily?period=${period}`),
    topPages: (period = '7d', limit = 10) => request<any>(`/ga4/pages?period=${period}&limit=${limit}`),
    test: () => request<any>('/ga4/test', { method: 'POST' }),
  },

  onboarding: {
    status: () => request<any>('/onboarding/status'),
  },

  reports: {
    list: () => request<any[]>('/reports'),
    get: (filename: string) => request<any>(`/reports/${filename}`),
  },

  scheduledTasks: {
    list: () => request<any[]>('/scheduled-tasks'),
    get: (id: string) => request<any>(`/scheduled-tasks/${id}`),
    update: (id: string, data: { content: string; cron?: string }) =>
      request<any>(`/scheduled-tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    create: (id: string, data: { content: string; cron?: string }) =>
      request<any>(`/scheduled-tasks?task_id=${id}`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/scheduled-tasks/${id}`, { method: 'DELETE' }),
    cronStatus: () => request<any>('/scheduled-tasks/cron/status'),
    toggleCron: (id: string, data: { enabled: boolean; cron?: string }) =>
      request<any>(`/scheduled-tasks/${id}/cron`, { method: 'PUT', body: JSON.stringify(data) }),
    run: (id: string) => request<any>(`/scheduled-tasks/${id}/run`, { method: 'POST' }),
    runStatus: (id: string) => request<any>(`/scheduled-tasks/${id}/status`),
  },
};
