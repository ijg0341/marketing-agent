import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { RefreshCw, Loader2 } from 'lucide-react';
import { ChannelBadge } from '../components/ChannelBadge';
import { api } from '../api';

const emptyMetrics = [
  { label: '노출수',      value: '0',    change: '+0%',  up: true },
  { label: '참여수',      value: '0',    change: '+0%',  up: true },
  { label: '클릭수',      value: '0',    change: '+0%',  up: true },
  { label: '평균 참여율', value: '0.0%', change: '+0%p', up: true },
];

const EmptyState = ({ label = '아직 데이터가 없습니다' }: { label?: string }) => (
  <div className="py-12 text-center text-[14px] text-surface-200">
    {label}
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

      if (summary) {
        setMetrics([
          { label: '노출수',      value: (summary.total_impressions ?? 0).toLocaleString(), change: '+0%',  up: true },
          { label: '참여수',      value: (summary.total_engagements ?? 0).toLocaleString(), change: '+0%',  up: true },
          { label: '클릭수',      value: (summary.total_clicks ?? 0).toLocaleString(),      change: '+0%',  up: true },
          { label: '평균 참여율', value: `${(summary.avg_engagement_rate ?? 0).toFixed(1)}%`, change: '+0%p', up: true },
        ]);
      }

      if (Array.isArray(details) && details.length > 0) {
        const byDate: Record<string, { impressions: number; engagements: number; clicks: number }> = {};
        for (const d of details) {
          const key = d.timestamp ? new Date(d.timestamp).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) : 'unknown';
          if (!byDate[key]) byDate[key] = { impressions: 0, engagements: 0, clicks: 0 };
          byDate[key].impressions += d.impressions ?? 0;
          byDate[key].engagements += d.engagements ?? 0;
          byDate[key].clicks += d.clicks ?? 0;
        }
        setDailyData(Object.entries(byDate).map(([date, v]) => ({ date, ...v })));
      } else {
        setDailyData([]);
      }

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
      setError(err.message ?? 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      await api.analytics.collect();
      await fetchData(period);
    } catch (err: any) {
      setError(err.message ?? 'Failed to collect metrics');
    } finally {
      setCollecting(false);
    }
  };

  const periodLabels: Record<string, string> = { '24h': '24시간', '7d': '7일', '30d': '30일' };

  return (
    <div className="space-y-12 pb-8">
      {/* ═══ Header ═══════════════════════════════════════════════ */}
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[24px] font-bold text-surface-50 tracking-tight leading-none">분석</h1>
          <p className="text-[14px] text-surface-200 mt-2">Twitter 성과 분석 및 인사이트 · {periodLabels[period]}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCollect}
            disabled={collecting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-surface-200 hover:text-surface-50 hover:bg-surface-800 rounded-md disabled:opacity-50 transition-colors"
          >
            {collecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            메트릭 수집
          </button>
          <div className="flex items-center gap-4 text-[14px]">
            {Object.entries(periodLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`relative pb-1 font-medium transition-colors ${
                  period === key ? 'text-surface-50' : 'text-surface-300 hover:text-surface-100'
                }`}
              >
                {label}
                {period === key && <span className="absolute bottom-0 left-0 right-0 h-px bg-primary-500" />}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="text-[14px] text-red-700">{error}</div>
      )}

      {/* ═══ KPI Row ══════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-x-10 gap-y-6">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-2">{m.label}</p>
            <p className="text-[22px] font-bold text-surface-50 tabular-nums leading-none tracking-tight">{m.value}</p>
            <p className={`text-[14px] font-medium mt-2 ${m.up ? 'text-emerald-600' : 'text-red-600'}`}>
              {m.change} <span className="text-surface-200 font-normal">이전 기간 대비</span>
            </p>
          </div>
        ))}
      </section>

      {/* ═══ Performance Chart ════════════════════════════════════ */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200">기간별 성과 (Twitter)</h2>
          {loading && <Loader2 className="w-3 h-3 text-surface-200 animate-spin" />}
        </div>
        {dailyData.length === 0 ? (
          <div className="border-t border-surface-800"><EmptyState /></div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={dailyData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1570ef" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1570ef" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} stroke="#27272a" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} stroke="#27272a" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #27272a',
                  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.4)',
                  fontSize: '12px',
                  padding: '8px 10px',
                }}
                labelStyle={{ color: '#8b5cf6', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} iconType="circle" />
              <Area type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} fill="url(#impGrad)" name="노출수" />
              <Area type="monotone" dataKey="engagements" stroke="#1570ef" strokeWidth={2} fill="url(#engGrad)" name="참여수" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ═══ Top Content ══════════════════════════════════════════ */}
      <section>
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-4">성과 상위 Twitter 콘텐츠</h2>
        {topContent.length === 0 ? (
          <div className="border-t border-surface-800"><EmptyState /></div>
        ) : (
          <div className="border-t border-surface-800">
            {topContent.map((item, i) => (
              <div key={item.id} className="flex items-center gap-4 py-3.5 border-b border-surface-800">
                <span className="text-[18px] font-bold text-surface-600 w-8 tabular-nums flex-shrink-0">#{i + 1}</span>
                <div className="w-[100px] flex-shrink-0">
                  <ChannelBadge channel={item.channel} />
                </div>
                <p className="text-[15px] text-surface-50 truncate flex-1 leading-snug">{item.text}</p>
                <span className="text-[13px] text-surface-300 tabular-nums w-24 flex-shrink-0">
                  노출 {item.impressions.toLocaleString()}
                </span>
                <span className="text-[13px] text-surface-300 tabular-nums w-24 flex-shrink-0">
                  참여 {item.engagements.toLocaleString()}
                </span>
                <span className="text-[15px] font-semibold text-surface-50 tabular-nums w-16 text-right flex-shrink-0">
                  {item.rate}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
