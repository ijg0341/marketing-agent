import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
} from 'recharts';
import { Save, RotateCcw, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../api';

const defaultThemeWeights = [
  { name: 'Product Updates',   value: 0.2 },
  { name: 'Industry Insights', value: 0.3 },
  { name: 'Tips & Tricks',     value: 0.25 },
  { name: 'Customer Stories',  value: 0.25 },
];

const defaultContentMix = [
  { name: 'Educational',     value: 0.4 },
  { name: 'Promotional',     value: 0.2 },
  { name: 'Engagement',      value: 0.3 },
  { name: 'Brand Awareness', value: 0.1 },
];

const defaultChannelRadar = [
  { channel: 'Twitter',   performance: 78, target: 85 },
  { channel: 'Instagram', performance: 82, target: 80 },
  { channel: 'Facebook',  performance: 65, target: 75 },
  { channel: 'Blog',      performance: 70, target: 70 },
  { channel: 'Email',     performance: 88, target: 80 },
];

const defaultPostingTimes = [
  { channel: 'Twitter',   times: ['10:00', '15:00', '20:00'] },
  { channel: 'Instagram', times: ['09:00', '18:00'] },
  { channel: 'Facebook',  times: ['12:00', '17:00'] },
  { channel: 'Blog',      times: ['10:00'] },
  { channel: 'Email',     times: ['09:00'] },
];

const defaultThresholds = {
  min_engagement_rate: 2.0,
  target_engagement_rate: 5.0,
  current_engagement_rate: 5.8,
  alert_drop_percent: 30,
};

const defaultStrategyInfo = {
  version: 'v1',
  last_updated: '2026-04-05 14:30',
  updated_by: 'strategy_evolution',
};

const defaultStrategyLog = [
  { id: 1, changed_at: '2026-04-05T14:30:00', changed_by: 'strategy_evolution', field: 'theme_weights.industry_insights', old_value: '0.25', new_value: '0.30', reason: '업계 인사이트 게시물이 최근 7일간 18% 높은 참여율을 기록' },
  { id: 2, changed_at: '2026-04-03T09:15:00', changed_by: 'strategy_evolution', field: 'posting_optimization.best_times.twitter', old_value: '["10:00","15:00"]', new_value: '["10:00","15:00","20:00"]', reason: 'Twitter 저녁 시간대(오후 8시) 게시물의 참여율이 높게 나타남' },
  { id: 3, changed_at: '2026-04-01T11:00:00', changed_by: 'manual',              field: 'engagement_tactics.emoji_usage',          old_value: 'minimal', new_value: 'moderate', reason: '브랜드 가이드라인 업데이트: 이모지 적절히 사용 허용' },
  { id: 4, changed_at: '2026-03-28T16:45:00', changed_by: 'strategy_evolution', field: 'content_mix.engagement',                  old_value: '0.25',    new_value: '0.30',     reason: '참여 유도형 콘텐츠가 더 높은 상호작용률을 기록' },
];

// 차분한 monochrome + 1 accent
const PIE_COLORS = ['#8b5cf6', '#a1a1aa', '#71717a', '#52525b', '#a78bfa', '#3f3f46'];

export function StrategyPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'log'>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [themeWeights, setThemeWeights] = useState(defaultThemeWeights.map((d, i) => ({ ...d, color: PIE_COLORS[i] })));
  const [contentMix, setContentMix] = useState(defaultContentMix.map((d, i) => ({ ...d, color: PIE_COLORS[i] })));
  const [channelRadar, setChannelRadar] = useState(defaultChannelRadar);
  const [postingTimes, setPostingTimes] = useState(defaultPostingTimes);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [strategyInfo, setStrategyInfo] = useState(defaultStrategyInfo);
  const [logEntries, setLogEntries] = useState(defaultStrategyLog);
  const [rawStrategy, setRawStrategy] = useState<any>(null);

  const fetchStrategy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.strategy.get();
      if (data) {
        setRawStrategy(data);
        if (data.theme_weights) {
          const mapped = Object.entries(data.theme_weights).map(([key, value], i) => ({
            name: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            value: Number(value),
            color: PIE_COLORS[i % PIE_COLORS.length],
          }));
          if (mapped.length > 0) setThemeWeights(mapped);
        }
        if (data.content_mix) {
          const mapped = Object.entries(data.content_mix).map(([key, value], i) => ({
            name: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            value: Number(value),
            color: PIE_COLORS[i % PIE_COLORS.length],
          }));
          if (mapped.length > 0) setContentMix(mapped);
        }
        if (data.channels || data.channel_targets) {
          const source = data.channel_targets || data.channels;
          if (typeof source === 'object') {
            const mapped = Object.entries(source).map(([ch, cfg]: [string, any]) => ({
              channel: ch.charAt(0).toUpperCase() + ch.slice(1),
              performance: cfg.performance ?? cfg.current ?? 70,
              target: cfg.target ?? cfg.goal ?? 80,
            }));
            if (mapped.length > 0) setChannelRadar(mapped);
          }
        }
        if (data.posting_optimization?.best_times) {
          const mapped = Object.entries(data.posting_optimization.best_times).map(([ch, times]: [string, any]) => ({
            channel: ch.charAt(0).toUpperCase() + ch.slice(1),
            times: Array.isArray(times) ? times : [times],
          }));
          if (mapped.length > 0) setPostingTimes(mapped);
        }
        if (data.performance_thresholds) {
          const pt = data.performance_thresholds;
          setThresholds({
            min_engagement_rate: pt.min_engagement_rate ?? defaultThresholds.min_engagement_rate,
            target_engagement_rate: pt.target_engagement_rate ?? defaultThresholds.target_engagement_rate,
            current_engagement_rate: pt.current_engagement_rate ?? defaultThresholds.current_engagement_rate,
            alert_drop_percent: pt.alert_drop_percent ?? defaultThresholds.alert_drop_percent,
          });
        }
        setStrategyInfo({
          version: data.version ? `v${data.version}` : defaultStrategyInfo.version,
          last_updated: data.last_updated ?? data.updated_at ?? defaultStrategyInfo.last_updated,
          updated_by: data.updated_by ?? data.last_changed_by ?? defaultStrategyInfo.updated_by,
        });
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load strategy');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLog = useCallback(async () => {
    try {
      const data = await api.strategy.log(20);
      if (Array.isArray(data) && data.length > 0) setLogEntries(data);
    } catch {}
  }, []);

  useEffect(() => { fetchStrategy(); }, [fetchStrategy]);
  useEffect(() => { if (activeTab === 'log') fetchLog(); }, [activeTab, fetchLog]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.strategy.update({
        updates: rawStrategy ?? {},
        changed_by: 'manual',
        reason: 'Manual save from dashboard',
      });
      await fetchStrategy();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save strategy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-12 pb-8">
      {/* ═══ Header ═══════════════════════════════════════════════ */}
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[24px] font-bold text-surface-50 tracking-tight leading-none">Strategy</h1>
          <p className="text-[14px] text-surface-200 mt-2">마케팅 전략 관리 및 자동 최적화</p>
        </div>
        <div className="flex items-center gap-4 text-[14px]">
          {(['overview', 'log'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`relative pb-1 font-medium transition-colors ${activeTab === t ? 'text-surface-50' : 'text-surface-300 hover:text-surface-100'}`}
            >
              {t === 'overview' ? 'Overview' : 'Change Log'}
              {activeTab === t && <span className="absolute bottom-0 left-0 right-0 h-px bg-primary-500" />}
            </button>
          ))}
        </div>
      </header>

      {error && <div className="text-[14px] text-red-700">{error}</div>}

      {activeTab === 'overview' ? (
        <>
          {/* ═══ Strategy Info — inline ════════════════════════════ */}
          <section className="flex items-end justify-between gap-6 pb-6 border-b border-surface-800">
            <div className="flex gap-10">
              <InfoBlock label="버전" value={strategyInfo.version} mono />
              <InfoBlock label="마지막 업데이트" value={strategyInfo.last_updated} />
              <InfoBlock label="업데이트 주체" value={strategyInfo.updated_by} />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchStrategy}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-surface-200 hover:text-surface-50 hover:bg-surface-800 rounded-md transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                새로고침
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                저장
              </button>
            </div>
          </section>

          {loading && (
            <div className="flex items-center gap-2 text-[14px] text-surface-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              로딩 중...
            </div>
          )}

          {/* ═══ Charts ═══════════════════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div>
              <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-4">Theme Weights</h2>
              <PieWithLegend data={themeWeights} />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-4">Content Mix</h2>
              <PieWithLegend data={contentMix} />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-4">Channel Performance vs Target</h2>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={channelRadar}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="channel" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#71717a' }} stroke="transparent" />
                  <Radar name="Performance" dataKey="performance" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Target" dataKey="target" stroke="#1570ef" fill="#1570ef" fillOpacity={0.08} strokeWidth={2} strokeDasharray="4 3" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #27272a',
                      boxShadow: '0 4px 12px -2px rgba(0,0,0,0.4)',
                      fontSize: '12px',
                      padding: '8px 10px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ═══ Posting + Thresholds ════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-4">Posting Optimization</h2>
              <div className="border-t border-surface-800">
                {postingTimes.map((item) => (
                  <div key={item.channel} className="flex items-center justify-between py-2.5 border-b border-surface-800">
                    <span className="text-[14px] font-medium text-surface-200">{item.channel}</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {item.times.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-surface-800 rounded text-[14px] text-surface-600 font-mono tabular-nums">
                          <Clock className="w-2.5 h-2.5" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-4">Performance Thresholds</h2>
              <div className="space-y-4">
                <ThresholdBar label="Min Engagement Rate" value={thresholds.min_engagement_rate} target={thresholds.target_engagement_rate} tone="muted" />
                <ThresholdBar label="Target Engagement Rate" value={thresholds.target_engagement_rate} target={thresholds.target_engagement_rate} tone="primary" />
                <ThresholdBar label="Current Engagement Rate" value={thresholds.current_engagement_rate} target={thresholds.target_engagement_rate} tone="success" />

                <div className="flex items-start gap-2 mt-4 pl-3 border-l-2 border-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-[14px] text-surface-200">
                    <span className="font-medium text-surface-50">Alert threshold:</span> {thresholds.alert_drop_percent}% 하락 시 전략 재검토
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        /* ═══ Change Log ════════════════════════════════════════════ */
        <section>
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-4">변경 이력</h2>
          {logEntries.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-surface-200 border-t border-surface-800">기록이 없습니다</div>
          ) : (
            <div className="border-t border-surface-800">
              {logEntries.map((entry) => (
                <article key={entry.id} className="py-4 border-b border-surface-800">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-[14px] font-medium ${
                      entry.changed_by === 'manual' ? 'text-surface-200' : 'text-primary-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${entry.changed_by === 'manual' ? 'bg-surface-9000' : 'bg-primary-500'}`} />
                      {entry.changed_by}
                    </span>
                    <code className="text-[14px] bg-surface-900 px-1.5 py-0.5 rounded text-surface-600 font-mono">{entry.field}</code>
                    <span className="text-[14px] text-surface-200 ml-auto tabular-nums">
                      {new Date(entry.changed_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-surface-100 mb-2 leading-relaxed">{entry.reason}</p>
                  <div className="flex items-center gap-2.5 text-[14px] font-mono">
                    <span className="text-surface-200 line-through">{entry.old_value}</span>
                    <span className="text-surface-600">→</span>
                    <span className="text-emerald-700 font-medium">{entry.new_value}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function InfoBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-1">{label}</p>
      <p className={`text-[14px] text-surface-50 font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function PieWithLegend({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={2} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip
            formatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #27272a',
              boxShadow: '0 4px 12px -2px rgba(0,0,0,0.4)',
              fontSize: '12px',
              padding: '6px 10px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 mt-3">
        {data.map((t) => (
          <div key={t.name} className="flex items-center justify-between text-[14px]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-surface-600">{t.name}</span>
            </div>
            <span className="font-semibold text-surface-50 tabular-nums">{(t.value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </>
  );
}

function ThresholdBar({ label, value, target, tone }: { label: string; value: number; target: number; tone: 'muted' | 'primary' | 'success' }) {
  const pct = Math.min((value / target) * 100, 100);
  const barColor = tone === 'muted' ? 'bg-surface-400' : tone === 'primary' ? 'bg-surface-700' : 'bg-emerald-500';
  const textColor = tone === 'success' ? 'text-emerald-700' : 'text-surface-50';
  return (
    <div>
      <div className="flex justify-between text-[14px] mb-1.5">
        <span className="text-surface-600">{label}</span>
        <span className={`font-semibold tabular-nums ${textColor}`}>{value}%</span>
      </div>
      <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
