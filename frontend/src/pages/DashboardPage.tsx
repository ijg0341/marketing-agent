import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText, Eye, Heart, Loader2, BarChart3, ArrowRight,
  CheckCircle2, Clock, Calendar, X,
} from 'lucide-react';
import { api } from '../api';

// ── Types ────────────────────────────────────────────────────────────────────

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

interface ContentItem {
  id: number;
  channel: string;
  content_text: string;
  status: string;
  posted_at: string | null;
  external_id?: string | null;
}

interface ContentKpi {
  totalPosts: number;
  totalImpressions: number;
  avgEngagementRate: number;
}

// ── Onboarding Progress Card ─────────────────────────────────────────────────

function OnboardingProgressCard({ status }: { status: OnboardingStatus }) {
  const pct = Math.round((status.required_done / status.required_total) * 100);
  const requiredSteps = status.steps.filter((s) => !s.optional);
  return (
    <div className="bg-gradient-to-r from-primary-50 to-sky-50 rounded-xl border border-primary-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-primary-900">초기 설정을 완료하세요</h2>
          <p className="text-xs text-primary-700 mt-0.5">
            필수 항목 {status.required_done}/{status.required_total} 완료 ({pct}%)
          </p>
        </div>
        <a
          href="/settings"
          className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 bg-white rounded-lg px-3 py-1.5 border border-primary-200"
        >
          설정하기 <ArrowRight className="w-3 h-3" />
        </a>
      </div>
      <div className="w-full bg-primary-100 rounded-full h-2 mb-4">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {requiredSteps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              step.completed
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-white text-surface-600 border border-surface-200'
            }`}
          >
            {step.completed ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            ) : (
              <Clock className="w-3.5 h-3.5 shrink-0 text-surface-400" />
            )}
            <span className="truncate">{step.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Channel Activity Row ──────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  blog: '블로그',
  email: 'Email',
};

const CHANNEL_BADGE_COLORS: Record<string, string> = {
  twitter: 'bg-sky-50 text-sky-600',
  instagram: 'bg-pink-50 text-pink-600',
  facebook: 'bg-blue-50 text-blue-600',
  blog: 'bg-amber-50 text-amber-600',
  email: 'bg-emerald-50 text-emerald-600',
};

const ALL_CHANNELS = ['twitter', 'instagram', 'facebook', 'blog', 'email'];

function ChannelActivityRow({ recentContent }: { recentContent: ContentItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-surface-900 mb-4">채널별 활동</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ALL_CHANNELS.map((ch) => {
          const items = recentContent.filter((c) => c.channel === ch);
          const today = items.filter((c) => {
            if (!c.posted_at) return false;
            const d = new Date(c.posted_at);
            const now = new Date();
            return d.toDateString() === now.toDateString();
          });
          return (
            <div key={ch} className="rounded-lg p-3 bg-surface-50">
              <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${CHANNEL_BADGE_COLORS[ch]}`}>
                {CHANNEL_LABELS[ch]}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-surface-900">{today.length}</span>
                <span className="text-xs text-surface-400">/ {items.length}</span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">오늘 / 전체</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(false);

  // Onboarding
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  // Content data
  const [contentKpi, setContentKpi] = useState<ContentKpi | null>(null);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);

  // GA4
  const [ga4Overview, setGa4Overview] = useState<any>(null);
  const [ga4Channels, setGa4Channels] = useState<any[]>([]);
  const [ga4Configured, setGa4Configured] = useState(false);

  // Reports
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportContents, setReportContents] = useState<Record<string, string>>({});
  const [reportModal, setReportModal] = useState<{ title: string; date: string; content: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [summary, recent, onboardingStatus] = await Promise.all([
          api.analytics.summary(period).catch(() => null),
          api.content.recent(10).catch(() => null),
          api.onboarding.status().catch(() => null),
        ]);

        if (cancelled) return;

        // Onboarding
        if (onboardingStatus) {
          setOnboarding(onboardingStatus);
        }

        // Content KPI from analytics summary
        if (summary) {
          setContentKpi({
            totalPosts: summary.count ?? 0,
            totalImpressions: summary.total_impressions ?? 0,
            avgEngagementRate: summary.avg_engagement_rate ?? 0,
          });
        } else {
          setContentKpi(null);
        }

        // Recent content — only real data
        if (recent && Array.isArray(recent) && recent.length > 0) {
          setRecentContent(recent);
        } else {
          setRecentContent([]);
        }

        // GA4 (independent, non-blocking)
        api.ga4.status().then((res) => {
          if (cancelled) return;
          setGa4Configured(res.configured);
          if (res.configured) {
            api.ga4.overview(period).then((r) => { if (!cancelled) setGa4Overview(r.data); }).catch(() => {});
            api.ga4.trafficChannels(period).then((r) => { if (!cancelled) setGa4Channels(r.data || []); }).catch(() => {});
          }
        }).catch(() => {});

        // Reports (independent, non-blocking)
        setReportsLoading(true);
        api.reports.list().then((res) => {
          if (cancelled) return;
          setReports(Array.isArray(res) ? res.slice(0, 5) : []);
        }).catch(() => {
          if (!cancelled) setReports([]);
        }).finally(() => {
          if (!cancelled) setReportsLoading(false);
        });

      } catch (err) {
        // silently handle — individual calls already caught above
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [period]);

  const showOnboarding = onboarding && !onboarding.all_required_complete;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">대시보드</h1>
          <p className="text-sm text-surface-500 mt-0.5">마케팅 성과 요약</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
          <div className="flex gap-1 bg-white rounded-lg border border-surface-200 p-1">
            {['24h', '7d', '30d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-500 hover:bg-surface-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 0. Onboarding Progress (if incomplete) ──────────────── */}
      {showOnboarding && <OnboardingProgressCard status={onboarding} />}

      {/* ── 1. Channel Activity Row ──────────────────────────────── */}
      <ChannelActivityRow recentContent={recentContent} />

      {/* ── 2. Content Marketing KPIs ───────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">콘텐츠 마케팅</h2>

        {/* Compact KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-surface-200 px-4 py-3 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-surface-50 rounded-lg text-surface-500">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-surface-400">전체 게시물</p>
              <p className="text-lg font-bold text-surface-800">
                {contentKpi ? contentKpi.totalPosts : '—'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-surface-200 px-4 py-3 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-surface-50 rounded-lg text-surface-500">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-surface-400">노출수</p>
              <p className="text-lg font-bold text-surface-800">
                {contentKpi ? (contentKpi.totalImpressions ?? 0).toLocaleString() : '—'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-surface-200 px-4 py-3 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-surface-50 rounded-lg text-surface-500">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-surface-400">평균 참여율</p>
              <p className="text-lg font-bold text-surface-800">
                {contentKpi ? `${contentKpi.avgEngagementRate}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent content list */}
        <div className="bg-white rounded-lg border border-surface-200 shadow-sm">
          <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-surface-600">최근 콘텐츠</p>
            <a href="/content" className="text-xs text-primary-600 hover:text-primary-700 font-medium">전체 보기</a>
          </div>
          {recentContent.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-400">아직 데이터가 없습니다</p>
              <p className="text-xs text-surface-400 mt-1">콘텐츠를 생성하고 게시하면 여기에 표시됩니다</p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-50">
              {recentContent.slice(0, 5).map((item) => (
                <li key={item.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <span className="text-xs text-surface-400 uppercase font-medium w-16 shrink-0">{item.channel}</span>
                  <span className="text-surface-700 truncate flex-1">{item.content_text}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    item.status === 'posted' ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-100 text-surface-500'
                  }`}>
                    {item.status === 'posted' ? '발행됨' : item.status === 'queued' ? '대기 중' : item.status === 'failed' ? '실패' : item.status}
                  </span>
                  <span className="text-xs text-surface-400 w-20 text-right shrink-0">
                    {item.posted_at
                      ? new Date(item.posted_at).toLocaleDateString('ko-KR')
                      : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── 4. GA4 Section (conditional) ─────────────────────────── */}
      {ga4Configured && ga4Overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              Google Analytics 개요
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '세션', value: ga4Overview.sessions || '0' },
                { label: '사용자', value: ga4Overview.totalUsers || '0' },
                { label: '페이지뷰', value: ga4Overview.screenPageViews || '0' },
                { label: '전환수', value: ga4Overview.conversions || '0' },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-surface-50 rounded-lg">
                  <p className="text-xs text-surface-500">{item.label}</p>
                  <p className="text-lg font-bold text-surface-900 mt-0.5">{Number(item.value).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-surface-900 mb-4">채널별 트래픽</h2>
            {ga4Channels.length > 0 ? (
              <div className="space-y-2">
                {ga4Channels.slice(0, 8).map((ch, i) => {
                  const sessions = Number(ch.sessions || 0);
                  const max = Number(ga4Channels[0]?.sessions || 1);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-surface-600 w-28 truncate">{ch.sessionDefaultChannelGroup}</span>
                      <div className="flex-1 h-5 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-400 rounded-full"
                          style={{ width: `${(sessions / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-surface-700 w-12 text-right">{sessions.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-surface-400">채널 데이터가 없습니다</p>
            )}
          </div>
        </div>
      )}

      {/* ── 5. 최근 리포트 ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">최근 리포트</h2>
          {reportsLoading && <Loader2 className="w-3 h-3 text-primary-400 animate-spin" />}
        </div>

        <div className="bg-surface-50 rounded-xl border border-surface-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📊</span>
            <h3 className="text-sm font-semibold text-surface-900">최근 리포트</h3>
          </div>

          {reportsLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-surface-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">리포트를 불러오는 중...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-400">아직 생성된 리포트가 없습니다. daily_analysis 스케줄을 활성화하면 자동으로 생성됩니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => {
                const filename: string = report.filename ?? report.name ?? String(report);
                const title: string = report.title ?? filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
                const date: string = report.created_at ?? report.date ?? '';
                const size: number | null = report.size ?? null;

                return (
                  <div key={filename} className="bg-white rounded-lg border border-surface-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => {
                        if (reportContents[filename]) {
                          setReportModal({ title, date, content: reportContents[filename] });
                        } else {
                          api.reports.get(filename).then(data => {
                            const content = typeof data === 'string' ? data : data.content ?? JSON.stringify(data, null, 2);
                            setReportContents(prev => ({ ...prev, [filename]: content }));
                            setReportModal({ title, date, content });
                          });
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors text-left"
                    >
                      <div className="p-1.5 bg-primary-50 rounded-md text-primary-500 shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">{title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {date && (
                            <span className="flex items-center gap-1 text-xs text-surface-400">
                              <Calendar className="w-3 h-3" />
                              {new Date(date).toLocaleDateString('ko-KR')}
                            </span>
                          )}
                          {size != null && (
                            <span className="text-xs text-surface-400">
                              {size < 1024 ? `${size}B` : `${(size / 1024).toFixed(1)}KB`}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Report Modal ─────────────────────────────────────────── */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReportModal(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-surface-100">
              <div>
                <h2 className="text-lg font-bold text-surface-900">{reportModal.title}</h2>
                <p className="text-xs text-surface-400 mt-0.5">{reportModal.date}</p>
              </div>
              <button onClick={() => setReportModal(null)} className="p-2 hover:bg-surface-100 rounded-lg">
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)] report-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportModal.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
