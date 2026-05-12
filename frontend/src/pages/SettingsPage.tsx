import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save, RefreshCw, CheckCircle2, Plus, X, Loader2,
  ChevronDown, ChevronUp, BookOpen, Eye, EyeOff, Globe, Mail,
  Target, Link2, Sliders, AlertCircle, DollarSign,
} from 'lucide-react';

// ─── API helpers ──────────────────────────────────────────────────────

const BASE = '/api/settings';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────

interface AgentSettings {
  product_name: string;
  website_url: string;
  language: string;
  context: string;
}

interface CredentialField {
  key: string;
  label: string;
  type?: string;
  has_value: boolean;
  masked_preview: string;
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

// ─── Toast system ─────────────────────────────────────────────────────

let toastId = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-lg text-[11.5px] font-medium animate-slide-in shadow-lg ${
            t.type === 'success'
              ? 'bg-surface-900 text-white border border-surface-800'
              : t.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-surface-900 text-white'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
          {t.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-3 h-3" />
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

// ─── Reusable small components ────────────────────────────────────────

function Spinner({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} />;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[14px] font-semibold uppercase tracking-[0.12em] text-surface-200 mb-1.5">
      {children}
      {required && <span className="ml-1 text-red-500 normal-case tracking-normal">*</span>}
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-4">
      {children}
    </h2>
  );
}

const INPUT_CLASS = 'w-full px-3 py-2 text-[14px] bg-surface-900 border border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-surface-100/15 focus:border-surface-500 placeholder:text-surface-500 disabled:bg-surface-900 transition-colors';

const PRIMARY_BTN = 'inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
const SECONDARY_BTN = 'inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-surface-200 hover:text-surface-50 hover:bg-surface-800 rounded-md disabled:opacity-50 transition-colors';

// ─── Platform icons ───────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  twitter: Globe,
  instagram: Globe,
  facebook: Globe,
  blog: Globe,
  email: Mail,
};

function getPlatformIcon(id: string) {
  return PLATFORM_ICONS[id] || Globe;
}

// ─── Constants ────────────────────────────────────────────────────────

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

// ─── Tab 1: Marketing Target ──────────────────────────────────────────

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
        product: { name: data.product_name, website: data.website_url },
        brand: { language: data.language },
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
    return <div className="flex items-center justify-center py-24"><Spinner className="w-5 h-5 text-surface-200" /></div>;
  }

  return (
    <div className="space-y-10">
      {/* 기본 정보 */}
      <section>
        <SectionLabel>기본 정보</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <FieldLabel>제품/서비스 이름</FieldLabel>
            <input
              value={data.product_name}
              onChange={(e) => setData((prev) => ({ ...prev, product_name: e.target.value }))}
              placeholder="VibeWork"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <FieldLabel>웹사이트 URL</FieldLabel>
            <input
              value={data.website_url}
              onChange={(e) => setData((prev) => ({ ...prev, website_url: e.target.value }))}
              placeholder="https://example.com"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <FieldLabel>주 사용 언어</FieldLabel>
            <select
              value={data.language}
              onChange={(e) => setData((prev) => ({ ...prev, language: e.target.value }))}
              className={INPUT_CLASS}
            >
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* 마케팅 브리핑 */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <SectionLabel>마케팅 브리핑</SectionLabel>
        </div>
        <p className="text-[13px] text-surface-300 mb-3 -mt-3 leading-relaxed max-w-2xl">
          제품 설명, 브랜드 톤, 타겟 오디언스, 경쟁사, 해시태그 등을 자유롭게 작성하세요.
          AI가 콘텐츠 생성과 전략 수립 시 이 내용을 컨텍스트로 활용합니다.
        </p>
        <textarea
          value={data.context}
          onChange={(e) => setData((prev) => ({ ...prev, context: e.target.value }))}
          rows={20}
          placeholder="마케팅 브리핑을 작성하세요..."
          className="w-full px-4 py-3 text-[14px] bg-surface-900 border border-surface-800 rounded-lg focus:outline-none focus:ring-4 focus:ring-surface-100/10 focus:border-surface-500 font-mono leading-relaxed resize-y placeholder:text-surface-500 transition-all"
        />
        <p className="text-[13px] text-surface-300 mt-2">
          Markdown 형식으로 작성할 수 있습니다. 구조는 자유이며 AI가 자연어로 이해합니다.
        </p>
      </section>

      <div className="flex justify-end pt-2 border-t border-surface-800">
        <button onClick={save} disabled={saving} className={PRIMARY_BTN}>
          {saving ? <Spinner /> : <Save className="w-3.5 h-3.5" />}
          저장
        </button>
      </div>
    </div>
  );
}

// ─── Tab 2: Platform Connections ──────────────────────────────────────

function PlatformRow({
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
  const [expanded, setExpanded] = useState(!platform.connected);

  const Icon = getPlatformIcon(platform.id);

  const toggleGuide = async () => {
    if (guideOpen) { setGuideOpen(false); return; }
    setGuideOpen(true);
    if (!guide) {
      setGuideLoading(true);
      try {
        const res = await request<{ steps: string[] }>(`/platforms/${platform.id}/guide`);
        setGuide(res.steps);
      } catch {
        setGuide(['설정 가이드를 불러오지 못했습니다']);
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
      toast.show('success', `${platform.name} 인증 정보 저장 완료`);
      setCreds({});
      setEditing({});
      onUpdate();
    } catch {
      toast.show('error', `${platform.name} 인증 정보 저장 실패`);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await request<any>(`/platforms/${platform.id}/test`, { method: 'POST' });
      setTestResult({
        ok: res.connected ?? res.ok ?? false,
        message: res.connected ? '연결 성공' : (res.error || '연결 실패'),
      });
    } catch {
      setTestResult({ ok: false, message: '연결 테스트 실패' });
    } finally {
      setTesting(false);
    }
  };

  const hasEdits = Object.keys(creds).length > 0;

  return (
    <div className="border-b border-surface-800">
      {/* Row */}
      <div
        className="flex items-center gap-4 py-4 cursor-pointer hover:bg-surface-800/40 transition-colors -mx-2 px-2 rounded"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-surface-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-surface-50">{platform.name}</h3>
          {platform.description && (
            <p className="text-[13px] text-surface-300 mt-0.5">{platform.description}</p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium flex-shrink-0 ${
          platform.connected ? 'text-emerald-700' : 'text-surface-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${platform.connected ? 'bg-emerald-500' : 'bg-surface-300'}`} />
          {platform.connected ? '연결됨' : '미연결'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-surface-200 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="pb-5 animate-fade-in space-y-4">
          {/* Setup guide toggle */}
          <button
            onClick={toggleGuide}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-surface-600 hover:text-surface-50 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            설정 가이드
            {guideOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {guideOpen && (
            <div className="bg-surface-900 rounded-lg px-4 py-3">
              {guideLoading ? (
                <div className="flex items-center gap-2 text-[11.5px] text-surface-200">
                  <Spinner /> 가이드 로딩 중...
                </div>
              ) : (
                <ol className="space-y-2">
                  {(guide || []).map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] text-surface-200 leading-relaxed">
                      <span className="shrink-0 w-4 h-4 rounded-full bg-surface-900 text-white flex items-center justify-center text-[14px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: step
                            .replace(/^\d+\.\s*/, '')
                            .replace(
                              /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
                              '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-surface-50 underline underline-offset-2 hover:text-surface-200">$1</a>',
                            ),
                        }}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Credentials */}
          {platform.credential_fields.length > 0 && (
            <div className="space-y-3">
              {platform.credential_fields.map((field) => {
                const isEditing = editing[field.key] || !field.has_value;
                return (
                  <div key={field.key}>
                    <FieldLabel>{field.label}</FieldLabel>
                    {field.has_value && !isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="flex-1 px-3 py-2 text-[14px] bg-surface-900 border border-surface-800 rounded-md text-surface-200 font-mono tracking-wider">
                          {field.masked_preview}
                        </span>
                        <button
                          onClick={() => setEditing((prev) => ({ ...prev, [field.key]: true }))}
                          className="p-2 text-surface-300 hover:text-surface-100 hover:bg-surface-800 rounded transition-colors"
                          title="편집"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type={field.type === 'password' ? 'password' : 'text'}
                          value={creds[field.key] || ''}
                          onChange={(e) => setCreds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.has_value ? '새 값을 입력하면 교체됩니다' : `${field.label} 입력`}
                          className={`flex-1 ${INPUT_CLASS}`}
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
                            className="p-2 text-surface-300 hover:text-surface-100 hover:bg-surface-800 rounded transition-colors"
                            title="취소"
                          >
                            <Eye className="w-3.5 h-3.5" />
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
          <div className="flex items-center gap-2 pt-2">
            <button onClick={saveCredentials} disabled={saving || !hasEdits} className={PRIMARY_BTN}>
              {saving ? <Spinner /> : <Save className="w-3.5 h-3.5" />}
              인증 정보 저장
            </button>
            <button onClick={testConnection} disabled={testing} className={SECONDARY_BTN}>
              {testing ? <Spinner /> : <RefreshCw className="w-3.5 h-3.5" />}
              연결 테스트
            </button>
            {testResult && (
              <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ml-1 ${
                testResult.ok ? 'text-emerald-700' : 'text-red-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${testResult.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {testResult.message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformConnectionsTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlatforms = useCallback(() => {
    request<any>('/platforms')
      .then((raw) => {
        const PLATFORM_NAMES: Record<string, string> = {
          twitter: 'Twitter / X',
          instagram: 'Instagram',
          facebook: 'Facebook',
          blog: 'WordPress Blog',
          email: 'SendGrid Email',
        };
        const HIDDEN_PLATFORMS = new Set(['meta_ads', 'google_ads', 'twitter_ads']);
        const list: Platform[] = Object.entries(raw)
          .filter(([id]) => !HIDDEN_PLATFORMS.has(id))
          .map(([id, val]: [string, any]) => ({
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
      .catch(() => toast.show('error', '플랫폼 연동 정보를 불러오지 못했습니다'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadPlatforms(); }, [loadPlatforms]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner className="w-5 h-5 text-surface-200" /></div>;
  }

  if (platforms.length === 0) {
    return (
      <div className="py-16 text-center text-[14px] text-surface-200">
        등록된 플랫폼이 없습니다
      </div>
    );
  }

  return (
    <div className="border-t border-surface-800">
      {platforms.map((p) => (
        <PlatformRow key={p.id} platform={p} toast={toast} onUpdate={loadPlatforms} />
      ))}
    </div>
  );
}

// ─── Tab 3: Channel Settings ──────────────────────────────────────────

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
      .catch(() => toast.show('error', '채널 설정을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateChannel = async (id: string, patch: Partial<ChannelConfig>) => {
    const prev = channels;
    setChannels((chs) => chs.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)));
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
            limits: { max_posts_per_day: current?.max_posts_per_day || 5 },
          }),
        });
        toast.show('success', `${id} 채널 ${patch.enabled ? '활성화' : '비활성화'} 완료`);
      } catch {
        setChannels(prev);
        toast.show('error', `채널 상태 변경 실패`);
      }
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
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
            limits: { max_posts_per_day: ch.max_posts_per_day },
          }),
        });
      }
      toast.show('success', '채널 설정이 저장되었습니다');
    } catch {
      toast.show('error', '채널 설정 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner className="w-5 h-5 text-surface-200" /></div>;
  }

  return (
    <div className="space-y-10">
      <section>
        <SectionLabel>채널</SectionLabel>
        <div className="border-t border-surface-800">
          {channels.map((ch) => (
            <div key={ch.id} className="border-b border-surface-800 py-4">
              {/* Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-[15px] font-semibold text-surface-50">{ch.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 text-[14px] font-medium ${
                    ch.enabled ? 'text-emerald-700' : 'text-surface-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ch.enabled ? 'bg-emerald-500' : 'bg-surface-300'}`} />
                    {ch.enabled ? '활성' : '비활성'}
                  </span>
                </div>
                <button
                  onClick={() => updateChannel(ch.id, { enabled: !ch.enabled })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    ch.enabled ? 'bg-surface-900' : 'bg-surface-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface-900 transition-transform shadow-sm ${
                      ch.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`}
                  />
                </button>
              </div>

              {ch.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <FieldLabel>게시 빈도</FieldLabel>
                    <select
                      value={ch.frequency}
                      onChange={(e) => updateChannel(ch.id, { frequency: e.target.value })}
                      className={INPUT_CLASS}
                    >
                      <option value="hourly">매시간</option>
                      <option value="daily">매일</option>
                      <option value="weekly">매주</option>
                      <option value="custom">커스텀</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>하루 최대 게시 수</FieldLabel>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={ch.max_posts_per_day}
                      onChange={(e) => updateChannel(ch.id, { max_posts_per_day: parseInt(e.target.value) || 1 })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <FieldLabel>게시 시간</FieldLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {ch.posting_times.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-800 rounded text-[11.5px] text-surface-200 font-mono tabular-nums"
                        >
                          {t}
                          <button
                            onClick={() => updateChannel(ch.id, { posting_times: ch.posting_times.filter((pt) => pt !== t) })}
                            className="hover:text-red-600"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={newTime[ch.id] || ''}
                          onChange={(e) => setNewTime((prev) => ({ ...prev, [ch.id]: e.target.value }))}
                          className="px-1.5 py-0.5 text-[11.5px] font-mono border border-surface-800 rounded focus:outline-none focus:ring-1 focus:ring-surface-100/20"
                        />
                        <button
                          onClick={() => {
                            const time = newTime[ch.id];
                            if (time && !ch.posting_times.includes(time)) {
                              updateChannel(ch.id, { posting_times: [...ch.posting_times, time].sort() });
                              setNewTime((prev) => ({ ...prev, [ch.id]: '' }));
                            }
                          }}
                          className="px-1.5 py-0.5 border border-dashed border-surface-700 rounded text-surface-200 hover:text-surface-50 hover:border-surface-900 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>시스템 정보</SectionLabel>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <SystemInfoItem label="API 서버" value="실행 중" tone="success" />
          <SystemInfoItem label="데이터베이스" value="SQLite" />
          <SystemInfoItem label="전략 버전" value="v1" mono />
          <SystemInfoItem label="스케줄러" value="활성" tone="success" />
        </dl>
      </section>

      <div className="flex justify-end pt-2 border-t border-surface-800">
        <button onClick={saveAll} disabled={saving} className={PRIMARY_BTN}>
          {saving ? <Spinner /> : <Save className="w-3.5 h-3.5" />}
          채널 설정 저장
        </button>
      </div>
    </div>
  );
}

function SystemInfoItem({ label, value, tone, mono }: { label: string; value: string; tone?: 'success'; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-surface-200 mb-1">{label}</dt>
      <dd className={`text-[14px] font-medium inline-flex items-center gap-1.5 ${
        tone === 'success' ? 'text-emerald-700' : 'text-surface-50'
      } ${mono ? 'font-mono' : ''}`}>
        {tone === 'success' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        {value}
      </dd>
    </div>
  );
}

// ─── Tab 4: Marketing Budget ──────────────────────────────────────────

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
    return <div className="flex items-center justify-center py-24"><Spinner className="w-5 h-5 text-surface-200" /></div>;
  }

  return (
    <div className="space-y-10">
      <section>
        <SectionLabel>마케팅 예산</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <FieldLabel>총 예산 (₩)</FieldLabel>
            <input
              type="number"
              min={0}
              value={budget.total_budget || ''}
              onChange={(e) => setBudget((prev) => ({ ...prev, total_budget: Number(e.target.value) }))}
              placeholder="0"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <FieldLabel>시작일</FieldLabel>
            <input
              type="date"
              value={budget.start_date}
              onChange={(e) => setBudget((prev) => ({ ...prev, start_date: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <FieldLabel>종료일</FieldLabel>
            <input
              type="date"
              value={budget.end_date}
              onChange={(e) => setBudget((prev) => ({ ...prev, end_date: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {dailyGuide !== null && (
          <div className="mt-6 pl-4 border-l-2 border-surface-900">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-1">일일 예산 가이드</p>
            <p className="text-[14px] font-bold text-surface-50 tabular-nums">
              ₩{dailyGuide.toLocaleString()} <span className="text-[14px] font-normal text-surface-200">/ 일</span>
            </p>
          </div>
        )}
      </section>

      <div className="flex justify-end pt-2 border-t border-surface-800">
        <button onClick={save} disabled={saving} className={PRIMARY_BTN}>
          {saving ? <Spinner /> : <Save className="w-3.5 h-3.5" />}
          저장
        </button>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────

type TabKey = 'target' | 'platforms' | 'channels' | 'budget';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'target',    label: '마케팅 대상', icon: Target },
  { key: 'platforms', label: '플랫폼 연동', icon: Link2 },
  { key: 'channels',  label: '채널 설정',   icon: Sliders },
  { key: 'budget',    label: '마케팅 예산', icon: DollarSign },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('target');
  const toast = useToast();

  return (
    <div className="space-y-8 pb-8">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* ═══ Header ═════════════════════════════════════════════ */}
      <header>
        <h1 className="text-[24px] font-bold text-surface-50 tracking-tight leading-none">설정</h1>
        <p className="text-[14px] text-surface-200 mt-2">마케팅 대상, 플랫폼 연동, 채널 설정을 관리합니다</p>
      </header>

      {/* Tabs */}
      <div className="border-b border-surface-800">
        <nav className="flex gap-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative inline-flex items-center gap-1.5 pb-3 -mb-px text-[14px] font-medium transition-colors ${
                  isActive ? 'text-surface-50' : 'text-surface-200 hover:text-surface-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-px bg-primary-500" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'target' && <MarketingTargetTab toast={toast} />}
        {activeTab === 'platforms' && <PlatformConnectionsTab toast={toast} />}
        {activeTab === 'channels' && <ChannelSettingsTab toast={toast} />}
        {activeTab === 'budget' && <BudgetTab toast={toast} />}
      </div>
    </div>
  );
}
