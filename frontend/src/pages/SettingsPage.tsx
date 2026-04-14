import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Megaphone,
  Search as SearchIcon,
  Target,
  Settings,
  Link2,
  Sliders,
  AlertCircle,
  DollarSign,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const BASE = '/api/settings';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentSettings {
  product_name: string;
  website_url: string;
  language: string;
  context: string; // 자유 텍스트 마케팅 브리핑
}

interface CredentialField {
  key: string;
  label: string;
  type?: string;
  has_value: boolean;
  masked_preview: string; // mapped from API's value_preview
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional?: boolean;
  route?: string;
  tab?: string;
}

interface OnboardingStatus {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  required_done: number;
  required_total: number;
  all_required_complete: boolean;
  setup_complete: boolean;
}

interface Platform {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  credential_fields: CredentialField[];
  setup_guide?: string[];
}

interface ChannelConfig {
  id: string;
  name: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  frequency: string;
  max_posts_per_day: number;
  posting_times: string[];
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ---------------------------------------------------------------------------
// Toast system
// ---------------------------------------------------------------------------

let toastId = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in ${
            t.type === 'success'
              ? 'bg-emerald-600 text-white'
              : t.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-surface-700 text-white'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (type: Toast['type'], message: string) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message }]);
      const timer = setTimeout(() => dismiss(id), 4000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  return { toasts, show, dismiss };
}

// ---------------------------------------------------------------------------
// Reusable small components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-surface-700 mb-1">{children}</label>;
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} />;
}

// ---------------------------------------------------------------------------
// Platform icon resolver
// ---------------------------------------------------------------------------

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  twitter: Globe,
  instagram: Globe,
  facebook: Globe,
  blog: Globe,
  email: Mail,
  meta_ads: Megaphone,
  google_ads: SearchIcon,
  twitter_ads: Globe,
};

function getPlatformIcon(id: string) {
  return PLATFORM_ICONS[id] || Globe;
}

// ---------------------------------------------------------------------------
// Defaults / constants
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
];

const DEFAULT_CONTEXT = `## 제품/서비스 소개
(제품명)은 (한 줄 설명)입니다.
주요 기능: (기능 1), (기능 2), (기능 3)
카테고리: SaaS / E-commerce / Education / 기타

## 브랜드 톤 & 작성 가이드
- 말투: ~합니다 체 / 반말 / 격식체
- 톤: 전문적이되 친근하게 / 캐주얼 / 공식적
- 이모지 사용: 적절히 / 많이 / 사용하지 않음
- 기타 작성 지침: (자유 기술)

## 타겟 오디언스
- 연령대: 25~45세
- 직업/역할: 마케터, 스타트업 대표, 1인 사업자
- 관심사: 생산성, AI, 마케팅 자동화
- 고충/니즈:
  - (고객이 겪는 문제 1)
  - (고객이 겪는 문제 2)
- 우리가 제공하는 가치:
  - (가치 제안 1)
  - (가치 제안 2)

## 경쟁사
- (경쟁사 이름 1) (URL) — 간단한 설명
- (경쟁사 이름 2) (URL) — 간단한 설명

## 해시태그
#해시태그1 #해시태그2 #해시태그3

## 기타 참고사항
(AI가 콘텐츠 생성 시 알아야 할 추가 정보를 자유롭게 작성하세요)
`;

const emptyAgent: AgentSettings = {
  product_name: '',
  website_url: '',
  language: 'ko',
  context: '',
};

// ---------------------------------------------------------------------------
// Tab 1: Marketing Target
// ---------------------------------------------------------------------------

function MarketingTargetTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [data, setData] = useState<AgentSettings>(emptyAgent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request<any>('/agent')
      .then((raw) => {
        const p = raw?.product ?? {};
        const b = raw?.brand ?? {};
        setData({
          product_name: p.name ?? '',
          website_url: p.website ?? '',
          language: b.language ?? 'ko',
          context: (raw?.context ?? '').trim() || DEFAULT_CONTEXT,
        });
      })
      .catch(() => {
        toast.show('error', '마케팅 대상 설정을 불러오지 못했습니다');
        setData(emptyAgent);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        product: {
          name: data.product_name,
          website: data.website_url,
        },
        brand: {
          language: data.language,
        },
        context: data.context,
      };
      await request('/agent', { method: 'PUT', body: JSON.stringify(payload) });
      toast.show('success', '마케팅 대상 설정이 저장되었습니다');
    } catch {
      toast.show('error', '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-6 h-6 text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-6 space-y-5">
        <h3 className="text-base font-semibold text-surface-900">기본 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <SectionLabel>제품/서비스 이름</SectionLabel>
            <input
              value={data.product_name}
              onChange={(e) => setData((prev) => ({ ...prev, product_name: e.target.value }))}
              placeholder="예: VibeWork"
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <SectionLabel>웹사이트 URL</SectionLabel>
            <input
              value={data.website_url}
              onChange={(e) => setData((prev) => ({ ...prev, website_url: e.target.value }))}
              placeholder="https://example.com"
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <SectionLabel>주 사용 언어</SectionLabel>
            <select
              value={data.language}
              onChange={(e) => setData((prev) => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 마케팅 브리핑 */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-surface-900">마케팅 브리핑</h3>
          <p className="text-xs text-surface-500 mt-1">
            제품 설명, 브랜드 톤, 타겟 오디언스, 경쟁사, 해시태그 등을 자유롭게 작성하세요.
            AI가 콘텐츠 생성과 전략 수립 시 이 내용을 컨텍스트로 활용합니다.
          </p>
        </div>
        <textarea
          value={data.context}
          onChange={(e) => setData((prev) => ({ ...prev, context: e.target.value }))}
          rows={20}
          placeholder="마케팅 브리핑을 작성하세요..."
          className="w-full px-4 py-3 text-sm font-mono leading-relaxed border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
        />
        <p className="text-xs text-surface-400">
          마크다운 형식으로 작성할 수 있습니다. 구조는 자유이며, AI가 자연어로 이해합니다.
        </p>
      </div>

      {/* 저장 */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {saving ? <Spinner /> : <Save className="w-4 h-4" />}
          저장
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Platform Connections
// ---------------------------------------------------------------------------

function PlatformCard({
  platform,
  toast,
  onUpdate,
}: {
  platform: Platform;
  toast: ReturnType<typeof useToast>;
  onUpdate: () => void;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guide, setGuide] = useState<string[] | null>(platform.setup_guide || null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const Icon = getPlatformIcon(platform.id);

  const toggleGuide = async () => {
    if (guideOpen) {
      setGuideOpen(false);
      return;
    }
    setGuideOpen(true);
    if (!guide) {
      setGuideLoading(true);
      try {
        const res = await request<{ steps: string[] }>(`/platforms/${platform.id}/guide`);
        setGuide(res.steps);
      } catch {
        setGuide(['Setup guide could not be loaded. Please check the documentation.']);
      } finally {
        setGuideLoading(false);
      }
    }
  };

  const saveCredentials = async () => {
    setSaving(true);
    try {
      await request(`/platforms/${platform.id}/credentials`, {
        method: 'PUT',
        body: JSON.stringify({ credentials: creds }),
      });
      toast.show('success', `${platform.name} credentials saved`);
      setCreds({});
      setEditing({});
      onUpdate();
    } catch {
      toast.show('error', `Failed to save ${platform.name} credentials`);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await request<any>(`/platforms/${platform.id}/test`, {
        method: 'POST',
      });
      setTestResult({
        ok: res.connected ?? res.ok ?? false,
        message: res.connected ? 'Connected successfully' : (res.error || 'Connection failed'),
      });
    } catch {
      setTestResult({ ok: false, message: 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const hasEdits = Object.keys(creds).length > 0;

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center">
              <Icon className="w-5 h-5 text-surface-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-900">{platform.name}</h3>
              <p className="text-xs text-surface-500">{platform.description}</p>
            </div>
          </div>
          <span
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              platform.connected
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-surface-100 text-surface-500'
            }`}
          >
            {platform.connected ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            {platform.connected ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Setup Guide Toggle */}
        <button
          onClick={toggleGuide}
          className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 mb-4"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Setup Guide
          {guideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Guide content */}
        {guideOpen && (
          <div className="mb-4 p-4 bg-surface-50 rounded-lg border border-surface-100">
            {guideLoading ? (
              <div className="flex items-center gap-2 text-sm text-surface-500">
                <Spinner /> Loading guide...
              </div>
            ) : (
              <ol className="space-y-2">
                {(guide || []).map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-surface-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: step
                          .replace(/^\d+\.\s*/, '')
                          .replace(
                            /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
                            '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 underline hover:text-primary-800">$1</a>'
                          ),
                      }}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* Credential Fields */}
        {platform.credential_fields.length > 0 && (
          <div className="space-y-3">
            {platform.credential_fields.map((field) => {
              const isEditing = editing[field.key] || !field.has_value;
              return (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-surface-600 mb-1">{field.label}</label>
                  {field.has_value && !isEditing ? (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-500 font-mono tracking-wider">
                        {field.masked_preview}
                      </span>
                      <button
                        onClick={() => setEditing((prev) => ({ ...prev, [field.key]: true }))}
                        className="p-2 text-surface-400 hover:text-surface-600 transition-colors"
                        title="Edit"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type={field.type === 'password' ? 'password' : 'text'}
                        value={creds[field.key] || ''}
                        onChange={(e) => setCreds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.has_value ? 'Enter new value to replace...' : `Enter ${field.label.toLowerCase()}`}
                        className="flex-1 px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {field.has_value && (
                        <button
                          onClick={() => {
                            setEditing((prev) => ({ ...prev, [field.key]: false }));
                            setCreds((prev) => {
                              const next = { ...prev };
                              delete next[field.key];
                              return next;
                            });
                          }}
                          className="p-2 text-surface-400 hover:text-surface-600 transition-colors"
                          title="Cancel"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-surface-100">
          <button
            onClick={saveCredentials}
            disabled={saving || !hasEdits}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-colors"
          >
            {saving ? <Spinner /> : <Save className="w-3.5 h-3.5" />}
            Save Credentials
          </button>
          <button
            onClick={testConnection}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 disabled:opacity-40 transition-colors"
          >
            {testing ? <Spinner /> : <RefreshCw className="w-3.5 h-3.5" />}
            연결 테스트
          </button>
          {testResult && (
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                testResult.ok ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {testResult.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PlatformConnectionsTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlatforms = useCallback(() => {
    request<any>('/platforms')
      .then((raw) => {
        // API returns { twitter: {...}, instagram: {...} } — convert to Platform[]
        const PLATFORM_NAMES: Record<string, string> = {
          twitter: 'Twitter / X',
          instagram: 'Instagram',
          facebook: 'Facebook',
          blog: 'WordPress Blog',
          email: 'SendGrid Email',
          meta_ads: 'Meta Ads (Facebook & Instagram)',
          google_ads: 'Google Ads',
          twitter_ads: 'Twitter Ads',
        };
        const list: Platform[] = Object.entries(raw).map(([id, val]: [string, any]) => ({
          id,
          name: PLATFORM_NAMES[id] || id,
          description: '',
          connected: val.connected ?? false,
          credential_fields: (val.fields ?? []).map((f: any) => ({
            key: f.key,
            label: f.label,
            type: f.type ?? 'password',
            has_value: f.has_value ?? false,
            masked_preview: f.value_preview ?? f.masked_preview ?? '',
          })),
          setup_guide: val.guide?.steps ?? null,
        }));
        setPlatforms(list);
      })
      .catch(() => toast.show('error', 'Failed to load platform connections'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPlatforms();
  }, [loadPlatforms]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-6 h-6 text-primary-500" />
      </div>
    );
  }

  if (platforms.length === 0) {
    return (
      <div className="text-center py-16 text-surface-500 text-sm">
        No platforms configured. Check your backend API.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {platforms.map((p) => (
        <PlatformCard key={p.id} platform={p} toast={toast} onUpdate={loadPlatforms} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Channel Settings
// ---------------------------------------------------------------------------

function ChannelSettingsTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTime, setNewTime] = useState<Record<string, string>>({});

  useEffect(() => {
    request<any>('/channels')
      .then((raw) => {
        const CHANNEL_NAMES: Record<string, string> = {
          twitter: 'Twitter / X',
          instagram: 'Instagram',
          facebook: 'Facebook',
          blog: 'WordPress Blog',
          email: 'SendGrid Email',
        };
        const list: ChannelConfig[] = Object.entries(raw).map(([id, val]: [string, any]) => ({
          id,
          name: CHANNEL_NAMES[id] || id,
          enabled: val.enabled ?? false,
          status: val.enabled ? 'connected' : 'disconnected',
          frequency: val.posting_schedule?.frequency ?? 'daily',
          max_posts_per_day: val.limits?.max_posts_per_day ?? 3,
          posting_times: val.posting_schedule?.times ?? [],
        }));
        setChannels(list);
      })
      .catch(() => toast.show('error', 'Failed to load channel settings'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateChannel = async (id: string, patch: Partial<ChannelConfig>) => {
    // Optimistic UI update
    const prev = channels;
    setChannels((chs) => chs.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)));

    // If enabled changed, immediately call API
    if ('enabled' in patch) {
      try {
        const current = prev.find((ch) => ch.id === id);
        await request(`/channels/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            enabled: patch.enabled,
            posting_schedule: {
              frequency: current?.frequency || 'daily',
              times: current?.posting_times || ['10:00'],
              timezone: 'Asia/Seoul',
            },
            limits: {
              max_posts_per_day: current?.max_posts_per_day || 5,
            },
          }),
        });
        toast.show('success', `${id} 채널 ${patch.enabled ? '활성화' : '비활성화'} 완료`);
      } catch (err) {
        // Rollback on failure
        setChannels(prev);
        toast.show('error', `채널 상태 변경 실패`);
      }
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Convert ChannelConfig[] back to per-channel API calls
      for (const ch of channels) {
        await request(`/channels/${ch.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            enabled: ch.enabled,
            posting_schedule: {
              frequency: ch.frequency,
              times: ch.posting_times,
              timezone: 'Asia/Seoul',
            },
            limits: {
              max_posts_per_day: ch.max_posts_per_day,
            },
          }),
        });
      }
      toast.show('success', 'Channel settings saved');
    } catch {
      toast.show('error', 'Failed to save channel settings');
    } finally {
      setSaving(false);
    }
  };

  const statusConfig = {
    connected: { label: 'Connected', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
    disconnected: { label: 'Disconnected', color: 'text-surface-400', bg: 'bg-surface-100', icon: XCircle },
    error: { label: 'Error', color: 'text-red-500', bg: 'bg-red-50', icon: AlertCircle },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-6 h-6 text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {channels.map((ch) => {
        const st = statusConfig[ch.status];
        const StIcon = st.icon;
        return (
          <div
            key={ch.id}
            className={`bg-white rounded-xl border shadow-sm transition-opacity ${
              ch.enabled ? 'border-surface-200' : 'border-surface-100 opacity-60'
            }`}
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-surface-900">{ch.name}</h3>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                    <StIcon className="w-3.5 h-3.5" />
                    {st.label}
                  </span>
                </div>
                <button
                  onClick={() => updateChannel(ch.id, { enabled: !ch.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    ch.enabled ? 'bg-primary-500' : 'bg-surface-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      ch.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Settings when enabled */}
              {ch.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-surface-100">
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Frequency</label>
                    <select
                      value={ch.frequency}
                      onChange={(e) => updateChannel(ch.id, { frequency: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Max Posts/Day</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={ch.max_posts_per_day}
                      onChange={(e) => updateChannel(ch.id, { max_posts_per_day: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Posting Times</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ch.posting_times.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-surface-100 rounded text-xs text-surface-600 font-medium"
                        >
                          {t}
                          <button
                            onClick={() =>
                              updateChannel(ch.id, {
                                posting_times: ch.posting_times.filter((pt) => pt !== t),
                              })
                            }
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={newTime[ch.id] || ''}
                          onChange={(e) => setNewTime((prev) => ({ ...prev, [ch.id]: e.target.value }))}
                          className="px-1.5 py-0.5 text-xs border border-surface-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <button
                          onClick={() => {
                            const time = newTime[ch.id];
                            if (time && !ch.posting_times.includes(time)) {
                              updateChannel(ch.id, {
                                posting_times: [...ch.posting_times, time].sort(),
                              });
                              setNewTime((prev) => ({ ...prev, [ch.id]: '' }));
                            }
                          }}
                          className="px-2 py-1 border border-dashed border-surface-300 rounded text-xs text-surface-400 hover:text-surface-600 hover:border-surface-400 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* System Info */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-surface-900 mb-4">System Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-surface-500">API Server</p>
            <p className="text-sm font-medium text-emerald-600 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Running
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Database</p>
            <p className="text-sm font-medium text-surface-700 mt-0.5">SQLite</p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Strategy Version</p>
            <p className="text-sm font-medium text-surface-700 mt-0.5">v1</p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Scheduler</p>
            <p className="text-sm font-medium text-emerald-600 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Active
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {saving ? <Spinner /> : <Save className="w-4 h-4" />}
          Save Channel Settings
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onboarding Wizard
// ---------------------------------------------------------------------------

function OnboardingWizard({
  status,
  onDismiss,
  onNavigate,
}: {
  status: OnboardingStatus;
  onDismiss: () => void;
  onNavigate: (tab: string) => void;
}) {
  const pct = Math.round((status.required_done / status.required_total) * 100);
  const nextStep = status.steps.find((s) => !s.completed && !s.optional);

  return (
    <div className="bg-gradient-to-r from-primary-50 to-sky-50 rounded-xl border border-primary-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-sm font-semibold text-primary-900">초기 설정 마법사</h2>
          <p className="text-xs text-primary-700 mt-0.5">
            필수 항목 {status.required_done}/{status.required_total} 완료 ({pct}%)
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-primary-400 hover:text-primary-600 p-1"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="w-full bg-primary-100 rounded-full h-1.5 mb-4">
        <div
          className="bg-primary-500 h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2 mb-4">
        {status.steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm ${
              step.completed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : step.optional
                ? 'bg-white border-surface-200 text-surface-500'
                : 'bg-white border-surface-200 text-surface-700'
            }`}
          >
            <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              step.completed
                ? 'bg-emerald-500 text-white'
                : 'bg-surface-200 text-surface-500'
            }`}>
              {step.completed ? '✓' : ''}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{step.title}</span>
                {step.optional && (
                  <span className="text-xs text-surface-400 shrink-0">(선택)</span>
                )}
              </div>
              {!step.completed && (
                <p className="text-xs text-surface-400 mt-0.5 truncate">{step.description}</p>
              )}
            </div>
            {!step.completed && step.tab && (
              <button
                onClick={() => onNavigate(step.tab!)}
                className="shrink-0 text-xs font-medium text-primary-600 hover:text-primary-800 bg-primary-50 rounded px-2 py-1 border border-primary-200"
              >
                설정
              </button>
            )}
          </div>
        ))}
      </div>

      {nextStep && (
        <p className="text-xs text-primary-700">
          다음 단계: <span className="font-semibold">{nextStep.title}</span> — {nextStep.description}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4: Marketing Budget
// ---------------------------------------------------------------------------

interface MarketingBudget {
  total_budget: number;
  start_date: string;
  end_date: string;
}

function BudgetTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [budget, setBudget] = useState<MarketingBudget>({ total_budget: 0, start_date: '', end_date: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/strategy')
      .then((r) => { if (!r.ok) throw new Error('fetch failed'); return r.json(); })
      .then((data) => {
        const mb = data?.marketing_budget ?? {};
        setBudget({
          total_budget: mb.total_budget ?? 0,
          start_date: mb.start_date ?? '',
          end_date: mb.end_date ?? '',
        });
      })
      .catch(() => toast.show('error', '예산 설정을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dailyGuide = (() => {
    if (!budget.start_date || !budget.end_date || !budget.total_budget) return null;
    const ms = new Date(budget.end_date).getTime() - new Date(budget.start_date).getTime();
    const days = Math.round(ms / 86400000);
    if (days <= 0) return null;
    return Math.round(budget.total_budget / days);
  })();

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/strategy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: { marketing_budget: budget },
          changed_by: 'user',
          reason: '마케팅 예산 설정',
        }),
      });
      if (!res.ok) throw new Error('save failed');
      toast.show('success', '마케팅 예산이 저장되었습니다');
    } catch {
      toast.show('error', '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-6 h-6 text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-6 space-y-5">
        <h3 className="text-base font-semibold text-surface-900">마케팅 예산</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <SectionLabel>총 예산 (₩)</SectionLabel>
            <input
              type="number"
              min={0}
              value={budget.total_budget || ''}
              onChange={(e) => setBudget((prev) => ({ ...prev, total_budget: Number(e.target.value) }))}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <SectionLabel>시작일</SectionLabel>
            <input
              type="date"
              value={budget.start_date}
              onChange={(e) => setBudget((prev) => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <SectionLabel>종료일</SectionLabel>
            <input
              type="date"
              value={budget.end_date}
              onChange={(e) => setBudget((prev) => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        {dailyGuide !== null && (
          <div className="pt-1">
            <SectionLabel>일일 예산 가이드</SectionLabel>
            <p className="text-sm text-surface-700 font-medium">
              ₩{dailyGuide.toLocaleString()} / 일
            </p>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? <Spinner /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings Page
// ---------------------------------------------------------------------------

type TabKey = 'target' | 'platforms' | 'channels' | 'budget';

const TABS: { key: TabKey; label: string; sublabel: string; icon: React.ElementType }[] = [
  { key: 'target', label: 'Marketing Target', sublabel: '마케팅 대상', icon: Target },
  { key: 'platforms', label: 'Platform Connections', sublabel: '플랫폼 연동', icon: Link2 },
  { key: 'channels', label: 'Channel Settings', sublabel: '채널 설정', icon: Sliders },
  { key: 'budget', label: '마케팅 예산', sublabel: 'Budget', icon: DollarSign },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('target');
  const toast = useToast();

  // Onboarding wizard state
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [wizardDismissed, setWizardDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/onboarding/status')
      .then((r) => r.json())
      .then((data: OnboardingStatus) => {
        if (!data.all_required_complete) {
          setOnboarding(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleWizardNavigate = (tab: string) => {
    if (tab === 'target' || tab === 'platforms' || tab === 'channels' || tab === 'budget') {
      setActiveTab(tab as TabKey);
    }
  };

  const showWizard = onboarding && !wizardDismissed && !onboarding.all_required_complete;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-surface-400" />
          <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
        </div>
        <p className="text-sm text-surface-500">마케팅 대상, 플랫폼 연동, 채널 설정을 관리합니다</p>
      </div>

      {/* Onboarding Wizard */}
      {showWizard && (
        <OnboardingWizard
          status={onboarding}
          onDismiss={() => setWizardDismissed(true)}
          onNavigate={handleWizardNavigate}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-surface-200">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="text-xs text-surface-400 hidden sm:inline">({tab.sublabel})</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'target' && <MarketingTargetTab toast={toast} />}
        {activeTab === 'platforms' && <PlatformConnectionsTab toast={toast} />}
        {activeTab === 'channels' && <ChannelSettingsTab toast={toast} />}
        {activeTab === 'budget' && <BudgetTab toast={toast} />}
      </div>
    </div>
  );
}
