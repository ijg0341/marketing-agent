import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Eye, Heart, MousePointerClick, Target, RefreshCw, Loader2 } from 'lucide-react';
import { ChannelBadge } from '../components/ChannelBadge';
import { api } from '../api';

const emptyMetrics = [
  { label: 'Total Impressions', value: '0', change: '+0%', up: true, icon: Eye },
  { label: 'Total Engagements', value: '0', change: '+0%', up: true, icon: Heart },
  { label: 'Total Clicks', value: '0', change: '+0%', up: true, icon: MousePointerClick },
  { label: 'Avg. Engagement Rate', value: '0.0%', change: '+0%p', up: true, icon: Target },
];

const EmptyState = () => (
  <div className="flex items-center justify-center py-12 text-sm text-surface-400">
    아직 데이터가 없습니다. Collect Metrics를 실행하면 데이터가 수집됩니다.
  </div>
);

export function AnalyticsPage() {
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState(emptyMetrics);
  const [dailyData, setDailyData] = useState<{ date: string; impressions: number; engagements: number; clicks: number }[]>([]);
  const [topContent, setTopContent] = useState<{ id: number; channel: string; text: string; impressions: number; engagements: number; rate: number }[]>([]);

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

      // Map details to daily chart
      if (Array.isArray(details) && details.length > 0) {
        const byDate: Record<string, { impressions: number; engagements: number; clicks: number }> = {};

        for (const d of details) {
          const dateKey = d.timestamp
            ? new Date(d.timestamp).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
            : 'unknown';
          if (!byDate[dateKey]) byDate[dateKey] = { impressions: 0, engagements: 0, clicks: 0 };
          byDate[dateKey].impressions += d.impressions ?? 0;
          byDate[dateKey].engagements += d.engagements ?? 0;
          byDate[dateKey].clicks += d.clicks ?? 0;
        }

        const dailyArr = Object.entries(byDate).map(([date, v]) => ({ date, ...v }));
        setDailyData(dailyArr);
      } else {
        setDailyData([]);
      }

      // Map recent content to top performing table (Twitter only)
      if (Array.isArray(recent) && recent.length > 0) {
        const mapped = recent
          .filter((c: any) => (c.channel ?? 'twitter').toLowerCase() === 'twitter')
          .map((c: any, i: number) => ({
            id: c.id ?? i + 1,
            channel: 'twitter',
            text: c.content_text ?? c.text ?? '',
            impressions: c.impressions ?? 0,
            engagements: c.engagements ?? 0,
            rate: c.impressions > 0 ? parseFloat(((c.engagements / c.impressions) * 100).toFixed(1)) : 0,
          }))
          .sort((a: any, b: any) => b.rate - a.rate)
          .slice(0, 5);
        setTopContent(mapped);
      } else {
        setTopContent([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError(err.message ?? 'Failed to load analytics data');
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
          <p className="text-sm text-surface-500 mt-0.5">Twitter 성과 분석 및 인사이트</p>
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

      {/* Loading indicator */}
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
        <h2 className="text-sm font-semibold text-surface-900 mb-4">Performance Over Time (Twitter)</h2>
        {dailyData.length === 0 ? (
          <EmptyState />
        ) : (
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
        )}
      </div>

      {/* Top Content */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm">
        <div className="p-5 border-b border-surface-100">
          <h2 className="text-sm font-semibold text-surface-900">Top Performing Twitter Content</h2>
        </div>
        {topContent.length === 0 ? (
          <EmptyState />
        ) : (
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
        )}
      </div>
    </div>
  );
}
