import { useState, useEffect, useCallback } from 'react';
import { Code, FileText, Zap, CheckCircle2, XCircle, ArrowUpRight, Loader2 } from 'lucide-react';
import { api } from '../api';

// ── Fallback mock data ──

const defaultEvolutionLog = [
  {
    id: 1,
    timestamp: '2026-04-06T14:22:00',
    level: 3,
    component: 'src/channels/twitter.py',
    change_description: 'Twitter API 호출에 지수 백오프 재시도 로직을 추가했습니다. 속도 제한(429)과 서버 오류(5xx)를 안정적으로 처리합니다.',
    performance_before: '실패율: 8.2%',
    performance_after: '실패율: 1.1%',
    rolled_back: false,
  },
  {
    id: 2,
    timestamp: '2026-04-05T14:51:00',
    level: 2,
    component: 'src/content/templates/sns_post.yaml',
    change_description: '참여 유도 템플릿의 훅 문구를 개선했습니다. 일반적인 CTA를 질문형 훅으로 교체하고, 고성과 훅 패턴 3개를 추가했습니다.',
    performance_before: '평균 참여율: 4.2%',
    performance_after: '평균 참여율: 5.8%',
    rolled_back: false,
  },
  {
    id: 3,
    timestamp: '2026-04-04T11:42:00',
    level: 1,
    component: 'config/strategy.yaml',
    change_description: '업계 인사이트 테마 가중치를 25%에서 30%로 증가시키고, 제품 업데이트를 25%에서 20%로 줄였습니다. 7일간 참여율 분석 기반.',
    performance_before: '테마별 참여율 분포: 3.8~5.2%',
    performance_after: '테마별 참여율 분포: 4.5~6.3%',
    rolled_back: false,
  },
  {
    id: 4,
    timestamp: '2026-04-03T14:22:00',
    level: 3,
    component: 'src/analytics/collector.py',
    change_description: '메트릭 일괄 수집을 순차 호출에서 async gather 방식으로 최적화했습니다. 수집 시간이 12초에서 3초로 단축되었습니다.',
    performance_before: '수집 시간: ~12초',
    performance_after: '수집 시간: ~3초',
    rolled_back: false,
  },
  {
    id: 5,
    timestamp: '2026-04-02T14:51:00',
    level: 2,
    component: 'src/content/templates/email_campaign.yaml',
    change_description: '이메일 제목에 개인화 토큰을 추가 시도했습니다. A/B 테스트에서 오픈율이 크게 하락하여 롤백했습니다.',
    performance_before: '오픈율: 32%',
    performance_after: '오픈율: 24%',
    rolled_back: true,
  },
  {
    id: 6,
    timestamp: '2026-04-01T11:42:00',
    level: 1,
    component: 'config/strategy.yaml',
    change_description: 'Twitter에 저녁 게시 시간대(20:00)를 추가했습니다. 오후 8~9시 시간대에 높은 참여 활동이 관측된 데이터에 근거합니다.',
    performance_before: '일일 평균 노출수: 5,800',
    performance_after: '일일 평균 노출수: 7,200',
    rolled_back: false,
  },
];

const levelConfig: Record<number, { label: string; icon: typeof Zap; color: string; bg: string }> = {
  1: { label: 'Strategy', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  2: { label: 'Template', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  3: { label: 'Code', icon: Code, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
};

export function EvolutionPage() {
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evolutionLog, setEvolutionLog] = useState(defaultEvolutionLog);

  const fetchEvolution = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.strategy.evolution(50);
      if (Array.isArray(data) && data.length > 0) {
        setEvolutionLog(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch evolution data:', err);
      setError(err.message ?? 'Failed to load evolution data');
      // Keep fallback defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvolution();
  }, [fetchEvolution]);

  const filtered = filterLevel ? evolutionLog.filter((e) => e.level === filterLevel) : evolutionLog;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Evolution</h1>
          <p className="text-sm text-surface-500 mt-0.5">AI 자동 진화 기록</p>
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-surface-200 p-1">
          <button
            onClick={() => setFilterLevel(null)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterLevel === null ? 'bg-primary-500 text-white' : 'text-surface-500 hover:bg-surface-100'
            }`}
          >
            All
          </button>
          {[1, 2, 3].map((l) => (
            <button
              key={l}
              onClick={() => setFilterLevel(l)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterLevel === l ? 'bg-primary-500 text-white' : 'text-surface-500 hover:bg-surface-100'
              }`}
            >
              L{l} {levelConfig[l].label}
            </button>
          ))}
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
          Loading evolution data...
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
          <p className="text-xs text-surface-500 font-medium">Total Evolutions</p>
          <p className="text-2xl font-bold text-surface-900 mt-1">{evolutionLog.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
          <p className="text-xs text-surface-500 font-medium">Successful</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{evolutionLog.filter((e) => !e.rolled_back).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
          <p className="text-xs text-surface-500 font-medium">Rolled Back</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{evolutionLog.filter((e) => e.rolled_back).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
          <p className="text-xs text-surface-500 font-medium">Success Rate</p>
          <p className="text-2xl font-bold text-surface-900 mt-1">
            {evolutionLog.length > 0
              ? Math.round((evolutionLog.filter((e) => !e.rolled_back).length / evolutionLog.length) * 100)
              : 0}%
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {filtered.map((entry) => {
          const config = levelConfig[entry.level];
          const Icon = config?.icon ?? Zap;
          const entryConfig = config ?? { label: `L${entry.level}`, color: 'text-surface-600', bg: 'bg-surface-50 border-surface-200' };
          return (
            <div
              key={entry.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                entry.rolled_back ? 'border-red-200' : 'border-surface-200'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${entryConfig.bg} ${entryConfig.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      Level {entry.level}: {entryConfig.label}
                    </span>
                    {entry.rolled_back ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        Rolled Back
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Applied
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-surface-400">{new Date(entry.timestamp).toLocaleString('ko-KR')}</span>
                </div>

                <code className="text-xs bg-surface-100 px-2 py-0.5 rounded text-surface-500">{entry.component}</code>
                <p className="text-sm text-surface-700 mt-2">{entry.change_description}</p>

                {(entry.performance_before || entry.performance_after) && (
                  <div className="flex items-center gap-4 mt-3 p-3 bg-surface-50 rounded-lg">
                    <div className="text-xs">
                      <span className="text-surface-500">Before: </span>
                      <span className="text-surface-700 font-medium">{entry.performance_before}</span>
                    </div>
                    <ArrowUpRight className={`w-4 h-4 ${entry.rolled_back ? 'text-red-400' : 'text-emerald-500'}`} />
                    <div className="text-xs">
                      <span className="text-surface-500">After: </span>
                      <span className={`font-medium ${entry.rolled_back ? 'text-red-600' : 'text-emerald-600'}`}>{entry.performance_after}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
