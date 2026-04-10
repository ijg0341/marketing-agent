import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Eye, Heart, MousePointerClick, Target, RefreshCw, Loader2 } from 'lucide-react';
import { ChannelBadge } from '../components/ChannelBadge';
import { api } from '../api';

// ── Fallback mock data (shown before API responds or when API returns empty) ──

const defaultDailyData = [
  { date: '03/31', impressions: 5200, engagements: 310, clicks: 120 },
  { date: '04/01', impressions: 6100, engagements: 380, clicks: 145 },
  { date: '04/02', impressions: 5800, engagements: 350, clicks: 132 },
  { date: '04/03', impressions: 7200, engagements: 420, clicks: 178 },
  { date: '04/04', impressions: 8100, engagements: 490, clicks: 201 },
  { date: '04/05', impressions: 7400, engagements: 445, clicks: 189 },
  { date: '04/06', impressions: 8900, engagements: 530, clicks: 225 },
];

const defaultChannelComparison = [
  { channel: 'Twitter', impressions: 18200, engagements: 1050, clicks: 420, rate: 5.8 },
  { channel: 'Instagram', impressions: 15600, engagements: 980, clicks: 310, rate: 6.3 },
  { channel: 'Facebook', impressions: 8400, engagements: 450, clicks: 280, rate: 5.4 },
  { channel: 'Blog', impressions: 4500, engagements: 220, clicks: 145, rate: 4.9 },
  { channel: 'Email', impressions: 2220, engagements: 147, clicks: 48, rate: 6.6 },
];

const defaultTopContent = [
  { id: 1, channel: 'instagram', text: '비즈니스 성장을 위한 5가지 핵심 전략 📈', impressions: 4200, engagements: 320, rate: 7.6 },
  { id: 2, channel: 'twitter', text: '🚀 새로운 기능 출시! AI 기반 마케팅 자동화', impressions: 3800, engagements: 285, rate: 7.5 },
  { id: 3, channel: 'facebook', text: '고객 성공 사례: 참여율 3배 증가', impressions: 2900, engagements: 203, rate: 7.0 },
  { id: 4, channel: 'blog', text: '2026년 디지털 마케팅 트렌드 분석', impressions: 2400, engagements: 156, rate: 6.5 },
  { id: 5, channel: 'twitter', text: '💡 콘텐츠 게시 최적 시간을 AI가 분석합니다', impressions: 2100, engagements: 134, rate: 6.4 },
];

const defaultMetrics = [
  { label: 'Total Impressions', value: '48,920', change: '+12.3%', up: true, icon: Eye },
  { label: 'Total Engagements', value: '2,847', change: '+15.2%', up: true, icon: Heart },
  { label: 'Total Clicks', value: '1,203', change: '-2.1%', up: false, icon: MousePointerClick },
  { label: 'Avg. Engagement Rate', value: '5.8%', change: '+0.8%p', up: true, icon: Target },
];

export function AnalyticsPage() {
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState(defaultMetrics);
  const [dailyData, setDailyData] = useState(defaultDailyData);
  const [channelComparison, setChannelComparison] = useState(defaultChannelComparison);
  const [topContent, setTopContent] = useState(defaultTopContent);

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const [summary, details, recent] = await Promise.all([
        api.analytics.summary(p),
        api.analytics.details(p),
        api.content.recent(50),
      ]);

      // Map summary to metric cards
      if (summary) {
        setMetrics([
          {
            label: 'Total Impressions',
            value: (summary.total_impressions ?? 0).toLocaleString(),
            change: '+0%',
            up: true,
            icon: Eye,
          },
          {
            label: 'Total Engagements',
            value: (summary.total_engagements ?? 0).toLocaleString(),
            change: '+0%',
            up: true,
            icon: Heart,
          },
          {
            label: 'Total Clicks',
            value: (summary.total_clicks ?? 0).toLocaleString(),
            change: '+0%',
            up: true,
            icon: MousePointerClick,
          },
          {
            label: 'Avg. Engagement Rate',
            value: `${(summary.avg_engagement_rate ?? 0).toFixed(1)}%`,
            change: '+0%p',
            up: true,
            icon: Target,
          },
        ]);
      }

      // Map details to daily chart and channel comparison
      if (Array.isArray(details) && details.length > 0) {
        // Group by date for the area chart
        const byDate: Record<string, { impressions: number; engagements: number; clicks: number }> = {};
        const byChannel: Record<string, { impressions: number; engagements: number; clicks: number }> = {};

        for (const d of details) {
          // Daily aggregation
          const dateKey = d.timestamp
            ? new Date(d.timestamp).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
            : 'unknown';
          if (!byDate[dateKey]) byDate[dateKey] = { impressions: 0, engagements: 0, clicks: 0 };
          byDate[dateKey].impressions += d.impressions ?? 0;
          byDate[dateKey].engagements += d.engagements ?? 0;
          byDate[dateKey].clicks += d.clicks ?? 0;

          // Channel aggregation
          const ch = d.channel ?? 'Other';
          if (!byChannel[ch]) byChannel[ch] = { impressions: 0, engagements: 0, clicks: 0 };
          byChannel[ch].impressions += d.impressions ?? 0;
          byChannel[ch].engagements += d.engagements ?? 0;
          byChannel[ch].clicks += d.clicks ?? 0;
        }

        const dailyArr = Object.entries(byDate).map(([date, v]) => ({ date, ...v }));
        if (dailyArr.length > 0) setDailyData(dailyArr);

        const channelArr = Object.entries(byChannel).map(([channel, v]) => ({
          channel: channel.charAt(0).toUpperCase() + channel.slice(1),
          impressions: v.impressions,
          engagements: v.engagements,
          clicks: v.clicks,
          rate: v.impressions > 0 ? parseFloat(((v.engagements / v.impressions) * 100).toFixed(1)) : 0,
        }));
        if (channelArr.length > 0) setChannelComparison(channelArr);
      }

      // Map recent content to top performing table
      if (Array.isArray(recent) && recent.length > 0) {
        const mapped = recent
          .map((c: any, i: number) => ({
            id: c.id ?? i + 1,
            channel: (c.channel ?? 'twitter').toLowerCase(),
            text: c.content_text ?? c.text ?? '',
            impressions: c.impressions ?? 0,
            engagements: c.engagements ?? 0,
            rate: c.impressions > 0 ? parseFloat(((c.engagements / c.impressions) * 100).toFixed(1)) : 0,
          }))
          .sort((a: any, b: any) => b.rate - a.rate)
          .slice(0, 5);
        if (mapped.length > 0) setTopContent(mapped);
      }
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError(err.message ?? 'Failed to load analytics data');
      // Keep current data (fallback defaults on first load)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      await api.analytics.collect();
      // Refresh data after collection
      await fetchData(period);
    } catch (err: any) {
      console.error('Metric collection failed:', err);
      setError(err.message ?? 'Failed to collect metrics');
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Analytics</h1>
          <p className="text-sm text-surface-500 mt-0.5">성과 분석 및 인사이트</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCollect}
            disabled={collecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
          >
            {collecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Collect Metrics
          </button>
          <div className="flex gap-1 bg-white rounded-lg border border-surface-200 p-1">
            {['24h', '7d', '30d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p ? 'bg-primary-500 text-white' : 'text-surface-500 hover:bg-surface-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading Overlay for metric cards */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-surface-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading analytics...
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-surface-500 font-medium">{m.label}</span>
              <m.icon className="w-4.5 h-4.5 text-surface-400" />
            </div>
            <p className="text-2xl font-bold text-surface-900">{m.value}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${m.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {m.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {m.change} vs previous period
            </div>
          </div>
        ))}
      </div>

      {/* Performance Over Time */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-surface-900 mb-4">Performance Over Time</h2>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="engagementsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
            <Legend />
            <Area type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} fill="url(#impressionsGrad)" name="Impressions" />
            <Area type="monotone" dataKey="engagements" stroke="#10b981" strokeWidth={2} fill="url(#engagementsGrad)" name="Engagements" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Channel Comparison + Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Channel Comparison */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-surface-900 mb-4">Channel Comparison</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={channelComparison} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="channel" tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="engagements" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Engagements" />
              <Bar dataKey="clicks" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Clicks" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Content */}
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm">
          <div className="p-5 border-b border-surface-100">
            <h2 className="text-sm font-semibold text-surface-900">Top Performing Content</h2>
          </div>
          <div className="divide-y divide-surface-50">
            {topContent.map((item, i) => (
              <div key={item.id} className="px-5 py-3 flex items-start gap-3">
                <span className="text-lg font-bold text-surface-300 w-6 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ChannelBadge channel={item.channel} />
                    <span className="text-xs text-surface-400">{item.rate}% engagement</span>
                  </div>
                  <p className="text-sm text-surface-700 truncate">{item.text}</p>
                  <div className="flex gap-4 mt-1 text-xs text-surface-400">
                    <span>{item.impressions.toLocaleString()} impressions</span>
                    <span>{item.engagements.toLocaleString()} engagements</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
