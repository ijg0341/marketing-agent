import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  DollarSign, Target, TrendingUp, MousePointerClick,
  FileText, Eye, Heart, Loader2, BarChart3, ArrowRight,
  CheckCircle2, Clock, AtSign, ChevronDown, ChevronUp, Calendar,
} from 'lucide-react';
import { api } from '../api';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatWon = (n: number) => `₩${n.toLocaleString()}`;

const platformColors: Record<string, string> = {
  meta: 'bg-blue-100 text-blue-700',
  google: 'bg-red-100 text-red-700',
  twitter: 'bg-sky-100 text-sky-700',
};
const platformLabels: Record<string, string> = {
  meta: 'Meta',
  google: 'Google',
  twitter: 'Twitter',
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  draft: 'bg-surface-100 text-surface-600',
};

const PLATFORM_CHART_COLORS: Record<string, string> = {
  meta: '#3b82f6',
  google: '#ef4444',
  twitter: '#0ea5e9',
};

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

// ── Aggregation helpers ──────────────────────────────────────────────────────

function aggregateAdKpis(campaigns: any[]) {
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions ?? 0), 0);
  const avgRoas = campaigns.length > 0
    ? campaigns.reduce((s, c) => s + (c.roas ?? 0), 0) / campaigns.length
    : 0;
  const avgCtr = campaigns.length > 0
    ? campaigns.reduce((s, c) => s + (c.ctr ?? 0), 0) / campaigns.length
    : 0;
  return { totalSpend, totalConversions, avgRoas, avgCtr };
}

function buildPlatformDistribution(campaigns: any[]) {
  const byPlatform: Record<string, number> = {};
  for (const c of campaigns) {
    byPlatform[c.platform] = (byPlatform[c.platform] || 0) + (c.spend ?? 0);
  }
  return Object.entries(byPlatform).map(([platform, value]) => ({
    name: platformLabels[platform] || platform,
    value,
    color: PLATFORM_CHART_COLORS[platform] || '#94a3b8',
  }));
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

// ── Twitter Channel Status Card ───────────────────────────────────────────────

function TwitterStatusCard({ recentContent }: { recentContent: ContentItem[] }) {
  const twitterPosts = recentContent.filter((c) => c.channel === 'twitter');
  const postedToday = twitterPosts.filter((c) => {
    if (!c.posted_at) return false;
    const d = new Date(c.posted_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const queued = twitterPosts.filter((c) => c.status === 'queued');
  const lastPost = twitterPosts.find((c) => c.status === 'posted');

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-sky-50 rounded-lg text-sky-500">
          <AtSign className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-semibold text-surface-900">Twitter / X 채널</h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-surface-50 rounded-lg">
          <p className="text-2xl font-bold text-surface-900">{postedToday.length}</p>
          <p className="text-xs text-surface-500 mt-0.5">오늘 게시</p>
        </div>
        <div className="text-center p-3 bg-surface-50 rounded-lg">
          <p className="text-2xl font-bold text-surface-900">{queued.length}</p>
          <p className="text-xs text-surface-500 mt-0.5">대기 중</p>
        </div>
        <div className="text-center p-3 bg-surface-50 rounded-lg">
          <p className="text-2xl font-bold text-surface-900">{twitterPosts.length}</p>
          <p className="text-xs text-surface-500 mt-0.5">전체 게시</p>
        </div>
      </div>
      {lastPost?.posted_at && (
        <p className="text-xs text-surface-400 mt-3">
          마지막 게시: {new Date(lastPost.posted_at).toLocaleString('ko-KR')}
        </p>
      )}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(false);

  // Onboarding
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  // Ad data — Phase 1: no active ads, show 준비 중 placeholder
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const hasAdData = campaigns.length > 0;

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
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [reportContents, setReportContents] = useState<Record<string, string>>({});
  const [reportContentLoading, setReportContentLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [campaignData, summary, recent, onboardingStatus] = await Promise.all([
          api.ads.campaigns().catch(() => null),
          api.analytics.summary(period).catch(() => null),
          api.content.recent(10).catch(() => null),
          api.onboarding.status().catch(() => null),
        ]);

        if (cancelled) return;

        // Onboarding
        if (onboardingStatus) {
          setOnboarding(onboardingStatus);
        }

        // Campaigns — only use real data, never mock
        if (campaignData && Array.isArray(campaignData) && campaignData.length > 0) {
          setCampaigns(campaignData);
        } else {
          setCampaigns([]);
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

  // Report toggle handler
  async function toggleReport(filename: string) {
    if (expandedReport === filename) {
      setExpandedReport(null);
      return;
    }
    setExpandedReport(filename);
    if (reportContents[filename]) return;
    setReportContentLoading((prev) => ({ ...prev, [filename]: true }));
    try {
      const data = await api.reports.get(filename);
      setReportContents((prev) => ({ ...prev, [filename]: typeof data === 'string' ? data : data.content ?? JSON.stringify(data, null, 2) }));
    } catch {
      setReportContents((prev) => ({ ...prev, [filename]: '리포트를 불러올 수 없습니다.' }));
    } finally {
      setReportContentLoading((prev) => ({ ...prev, [filename]: false }));
    }
  }

  // Derived ad data
  const adKpis = aggregateAdKpis(campaigns);
  const platformDist = buildPlatformDistribution(campaigns);
  const activeCampaigns = campaigns.filter((c) => c.status !== 'draft').slice(0, 5);

  const showOnboarding = onboarding && !onboarding.all_required_complete;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
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

      {/* ── 1. Twitter Channel Status ────────────────────────────── */}
      <TwitterStatusCard recentContent={recentContent} />

      {/* ── 2. Content Marketing KPIs ───────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Content Marketing</h2>

        {/* Compact KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-surface-200 px-4 py-3 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-surface-50 rounded-lg text-surface-500">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-surface-400">Total Posts</p>
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
              <p className="text-xs text-surface-400">Impressions</p>
              <p className="text-lg font-bold text-surface-800">
                {contentKpi ? contentKpi.totalImpressions.toLocaleString() : '—'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-surface-200 px-4 py-3 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-surface-50 rounded-lg text-surface-500">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-surface-400">Avg Engagement</p>
              <p className="text-lg font-bold text-surface-800">
                {contentKpi ? `${contentKpi.avgEngagementRate}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent content list */}
        <div className="bg-white rounded-lg border border-surface-200 shadow-sm">
          <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-surface-600">Recent Content</p>
            <a href="/content" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View All</a>
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
                    {item.status}
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

      {/* ── 3. Ad Performance (Phase 1: 준비 중) ─────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Ad Performance</h2>

        {hasAdData ? (
          <>
            {/* Ad KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-surface-500 font-medium">Total Ad Spend</p>
                    <p className="text-3xl font-bold mt-1.5 text-surface-900">{formatWon(adKpis.totalSpend)}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-surface-500 font-medium">Total Conversions</p>
                    <p className="text-3xl font-bold mt-1.5 text-surface-900">{adKpis.totalConversions.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                    <Target className="w-6 h-6" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-surface-500 font-medium">Average ROAS</p>
                    <p className="text-3xl font-bold mt-1.5 text-surface-900">{adKpis.avgRoas.toFixed(1)}x</p>
                  </div>
                  <div className="p-3 bg-violet-50 rounded-lg text-violet-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-surface-500 font-medium">Average CTR</p>
                    <p className="text-3xl font-bold mt-1.5 text-surface-900">{adKpis.avgCtr.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                    <MousePointerClick className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Campaigns Table */}
            <div className="bg-white rounded-xl border border-surface-200 shadow-sm">
              <div className="p-5 border-b border-surface-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-surface-900">Active Campaigns</h2>
                <a
                  href="/ads"
                  className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100">
                      <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Platform</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Name</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Daily Budget</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Spend</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Impressions</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Clicks</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">CTR</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCampaigns.map((c) => (
                      <tr key={c.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${platformColors[c.platform] || 'bg-surface-100 text-surface-600'}`}>
                            {platformLabels[c.platform] || c.platform}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-surface-700 font-medium">{c.name}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[c.status] || 'bg-surface-100 text-surface-600'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-surface-600">{formatWon(c.daily_budget)}</td>
                        <td className="px-5 py-3 text-right text-surface-700 font-medium">{formatWon(c.spend)}</td>
                        <td className="px-5 py-3 text-right text-surface-600">{(c.impressions ?? 0).toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-surface-600">{(c.clicks ?? 0).toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-surface-600">{(c.ctr ?? 0).toFixed(1)}%</td>
                        <td className="px-5 py-3 text-right text-surface-700 font-medium">{(c.roas ?? 0).toFixed(1)}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ad Spend Trend + Platform Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-surface-900 mb-4">Daily Ad Spend by Platform</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v: number) => `₩${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value, name) => { if (typeof value !== 'number') return ''; return [formatWon(value), platformLabels[String(name)] || String(name)]; }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Legend formatter={(value: string) => platformLabels[value] || value} />
                    <Area type="monotone" dataKey="meta" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="google" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="twitter" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-surface-900 mb-4">Spend by Platform</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={platformDist} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                      {platformDist.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => { if (typeof value !== 'number') return ''; return formatWon(value); }} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-surface-600">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          /* Phase 1: 준비 중 placeholder */
          <div className="bg-white rounded-xl border border-dashed border-surface-300 p-10 text-center">
            <DollarSign className="w-10 h-10 text-surface-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-surface-500">광고 기능 준비 중</p>
            <p className="text-xs text-surface-400 mt-1">광고 플랫폼(Meta/Google/Twitter Ads)을 연동하면 캠페인 성과가 여기에 표시됩니다</p>
          </div>
        )}
      </div>

      {/* ── 4. GA4 Section (conditional) ─────────────────────────── */}
      {ga4Configured && ga4Overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              Google Analytics Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Sessions', value: ga4Overview.sessions || '0' },
                { label: 'Users', value: ga4Overview.totalUsers || '0' },
                { label: 'Page Views', value: ga4Overview.screenPageViews || '0' },
                { label: 'Conversions', value: ga4Overview.conversions || '0' },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-surface-50 rounded-lg">
                  <p className="text-xs text-surface-500">{item.label}</p>
                  <p className="text-lg font-bold text-surface-900 mt-0.5">{Number(item.value).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-surface-900 mb-4">Traffic by Channel</h2>
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
              <p className="text-sm text-surface-400">No channel data available</p>
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
                const isExpanded = expandedReport === filename;
                const isLoadingContent = reportContentLoading[filename] ?? false;
                const content = reportContents[filename];

                return (
                  <div key={filename} className="bg-white rounded-lg border border-surface-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleReport(filename)}
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
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-surface-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-surface-400 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-surface-100 bg-surface-50 px-4 py-3">
                        {isLoadingContent ? (
                          <div className="flex items-center gap-2 py-4 text-surface-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs">불러오는 중...</span>
                          </div>
                        ) : (
                          <pre className="text-xs text-surface-700 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                            {content}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
