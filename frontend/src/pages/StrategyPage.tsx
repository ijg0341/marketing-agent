import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
} from 'recharts';
import { Save, RotateCcw, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../api';

// ── Fallback mock data ──

const defaultThemeWeights = [
  { name: 'Product Updates', value: 0.2, color: '#3b82f6' },
  { name: 'Industry Insights', value: 0.3, color: '#10b981' },
  { name: 'Tips & Tricks', value: 0.25, color: '#f59e0b' },
  { name: 'Customer Stories', value: 0.25, color: '#8b5cf6' },
];

const defaultContentMix = [
  { name: 'Educational', value: 0.4, color: '#3b82f6' },
  { name: 'Promotional', value: 0.2, color: '#f59e0b' },
  { name: 'Engagement', value: 0.3, color: '#10b981' },
  { name: 'Brand Awareness', value: 0.1, color: '#ec4899' },
];

const defaultChannelRadar = [
  { channel: 'Twitter', performance: 78, target: 85 },
  { channel: 'Instagram', performance: 82, target: 80 },
  { channel: 'Facebook', performance: 65, target: 75 },
  { channel: 'Blog', performance: 70, target: 70 },
  { channel: 'Email', performance: 88, target: 80 },
];

const defaultPostingTimes = [
  { channel: 'Twitter', times: ['10:00', '15:00', '20:00'] },
  { channel: 'Instagram', times: ['09:00', '18:00'] },
  { channel: 'Facebook', times: ['12:00', '17:00'] },
  { channel: 'Blog', times: ['10:00'] },
  { channel: 'Email', times: ['09:00'] },
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
  { id: 3, changed_at: '2026-04-01T11:00:00', changed_by: 'manual', field: 'engagement_tactics.emoji_usage', old_value: 'minimal', new_value: 'moderate', reason: '브랜드 가이드라인 업데이트: 이모지 적절히 사용 허용' },
  { id: 4, changed_at: '2026-03-28T16:45:00', changed_by: 'strategy_evolution', field: 'content_mix.engagement', old_value: '0.25', new_value: '0.30', reason: '참여 유도형 콘텐츠가 더 높은 상호작용률을 기록' },
];

const PIE_COLORS_THEME = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];
const PIE_COLORS_MIX = ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#ef4444'];

export function StrategyPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'log'>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [themeWeights, setThemeWeights] = useState(defaultThemeWeights);
  const [contentMix, setContentMix] = useState(defaultContentMix);
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

        // Map theme_weights from strategy YAML
        if (data.theme_weights) {
          const mapped = Object.entries(data.theme_weights).map(([key, value], i) => ({
            name: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            value: Number(value),
            color: PIE_COLORS_THEME[i % PIE_COLORS_THEME.length],
          }));
          if (mapped.length > 0) setThemeWeights(mapped);
        }

        // Map content_mix
        if (data.content_mix) {
          const mapped = Object.entries(data.content_mix).map(([key, value], i) => ({
            name: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            value: Number(value),
            color: PIE_COLORS_MIX[i % PIE_COLORS_MIX.length],
          }));
          if (mapped.length > 0) setContentMix(mapped);
        }

        // Map channel performance targets to radar
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

        // Map posting optimization
        if (data.posting_optimization?.best_times) {
          const mapped = Object.entries(data.posting_optimization.best_times).map(([ch, times]: [string, any]) => ({
            channel: ch.charAt(0).toUpperCase() + ch.slice(1),
            times: Array.isArray(times) ? times : [times],
          }));
          if (mapped.length > 0) setPostingTimes(mapped);
        }

        // Map performance thresholds
        if (data.performance_thresholds) {
          const pt = data.performance_thresholds;
          setThresholds({
            min_engagement_rate: pt.min_engagement_rate ?? defaultThresholds.min_engagement_rate,
            target_engagement_rate: pt.target_engagement_rate ?? defaultThresholds.target_engagement_rate,
            current_engagement_rate: pt.current_engagement_rate ?? defaultThresholds.current_engagement_rate,
            alert_drop_percent: pt.alert_drop_percent ?? defaultThresholds.alert_drop_percent,
          });
        }

        // Strategy info
        setStrategyInfo({
          version: data.version ? `v${data.version}` : defaultStrategyInfo.version,
          last_updated: data.last_updated ?? data.updated_at ?? defaultStrategyInfo.last_updated,
          updated_by: data.updated_by ?? data.last_changed_by ?? defaultStrategyInfo.updated_by,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch strategy:', err);
      setError(err.message ?? 'Failed to load strategy');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLog = useCallback(async () => {
    try {
      const data = await api.strategy.log(20);
      if (Array.isArray(data) && data.length > 0) {
        setLogEntries(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch strategy log:', err);
    }
  }, []);

  useEffect(() => {
    fetchStrategy();
  }, [fetchStrategy]);

  useEffect(() => {
    if (activeTab === 'log') {
      fetchLog();
    }
  }, [activeTab, fetchLog]);

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
      console.error('Failed to save strategy:', err);
      setError(err.message ?? 'Failed to save strategy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Strategy</h1>
          <p className="text-sm text-surface-500 mt-0.5">마케팅 전략 관리 및 자동 최적화</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-white rounded-lg border border-surface-200 p-1">
            {(['overview', 'log'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === t ? 'bg-primary-500 text-white' : 'text-surface-500 hover:bg-surface-100'
                }`}
              >
                {t === 'overview' ? 'Overview' : 'Change Log'}
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-surface-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading strategy...
        </div>
      )}

      {activeTab === 'overview' ? (
        <>
          {/* Strategy Info Card */}
          <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-surface-500">Strategy Version</span>
                <p className="text-lg font-bold text-surface-900">{strategyInfo.version}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-surface-500">Last Updated</span>
                <p className="text-sm font-medium text-surface-700">{strategyInfo.last_updated}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-surface-500">Updated By</span>
                <p className="text-sm font-medium text-surface-700">{strategyInfo.updated_by}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                <button
                  onClick={fetchStrategy}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Theme Weights */}
            <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-surface-900 mb-4">Theme Weights</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={themeWeights} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {themeWeights.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {themeWeights.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-surface-600">{t.name}</span>
                    </div>
                    <span className="font-medium text-surface-900">{(t.value * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Mix */}
            <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-surface-900 mb-4">Content Mix</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={contentMix} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {contentMix.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {contentMix.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-surface-600">{t.name}</span>
                    </div>
                    <span className="font-medium text-surface-900">{(t.value * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel Radar */}
            <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-surface-900 mb-4">Channel Performance vs Target</h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={channelRadar}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="channel" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Radar name="Performance" dataKey="performance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  <Radar name="Target" dataKey="target" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Posting Optimization */}
            <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-surface-900 mb-4">Posting Optimization</h2>
              <div className="space-y-3">
                {postingTimes.map((item) => (
                  <div key={item.channel} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                    <span className="text-sm font-medium text-surface-700">{item.channel}</span>
                    <div className="flex gap-1.5">
                      {item.times.map((t) => (
                        <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-surface-100 rounded text-xs text-surface-600">
                          <Clock className="w-3 h-3" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Thresholds */}
            <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-surface-900 mb-4">Performance Thresholds</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-surface-500">Min Engagement Rate</span>
                    <span className="font-medium text-surface-900">{thresholds.min_engagement_rate}%</span>
                  </div>
                  <div className="w-full bg-surface-100 rounded-full h-2">
                    <div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min((thresholds.min_engagement_rate / thresholds.target_engagement_rate) * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-surface-500">Target Engagement Rate</span>
                    <span className="font-medium text-surface-900">{thresholds.target_engagement_rate}%</span>
                  </div>
                  <div className="w-full bg-surface-100 rounded-full h-2">
                    <div className="bg-primary-400 h-2 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-surface-500">Current Engagement Rate</span>
                    <span className="font-bold text-emerald-600">{thresholds.current_engagement_rate}%</span>
                  </div>
                  <div className="w-full bg-surface-100 rounded-full h-2">
                    <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${Math.min((thresholds.current_engagement_rate / thresholds.target_engagement_rate) * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 mt-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-700">
                    <span className="font-medium">Alert threshold:</span> {thresholds.alert_drop_percent}% drop triggers strategy review
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Strategy Change Log */
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm">
          <div className="p-5 border-b border-surface-100">
            <h2 className="text-sm font-semibold text-surface-900">Strategy Change History</h2>
          </div>
          <div className="divide-y divide-surface-50">
            {logEntries.map((entry) => (
              <div key={entry.id} className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      entry.changed_by === 'manual'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {entry.changed_by}
                    </span>
                    <code className="text-xs bg-surface-100 px-2 py-0.5 rounded text-surface-600">{entry.field}</code>
                  </div>
                  <span className="text-xs text-surface-400">{new Date(entry.changed_at).toLocaleString('ko-KR')}</span>
                </div>
                <p className="text-sm text-surface-700 mb-2">{entry.reason}</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-red-500 line-through">{entry.old_value}</span>
                  <span className="text-surface-400">→</span>
                  <span className="text-emerald-600 font-medium">{entry.new_value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
