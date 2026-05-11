import { useState, useEffect, useCallback } from 'react';
import { Code, FileText, Zap, ArrowUpRight, Loader2 } from 'lucide-react';
import { api } from '../api';

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
];

const levelConfig: Record<number, { label: string; icon: typeof Zap; dot: string }> = {
  1: { label: 'Strategy', icon: Zap,      dot: 'bg-amber-500' },
  2: { label: 'Template', icon: FileText, dot: 'bg-purple-500' },
  3: { label: 'Code',     icon: Code,     dot: 'bg-blue-600' },
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
      setError(err.message ?? 'Failed to load evolution data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvolution(); }, [fetchEvolution]);

  const filtered = filterLevel ? evolutionLog.filter((e) => e.level === filterLevel) : evolutionLog;
  const successCount = evolutionLog.filter((e) => !e.rolled_back).length;
  const rolledBackCount = evolutionLog.filter((e) => e.rolled_back).length;
  const successRate = evolutionLog.length > 0 ? Math.round((successCount / evolutionLog.length) * 100) : 0;

  return (
    <div className="space-y-12 pb-8">
      {/* ═══ Header ═══════════════════════════════════════════════ */}
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[24px] font-bold text-surface-50 tracking-tight leading-none">Evolution</h1>
          <p className="text-[14px] text-surface-200 mt-2">AI 자동 진화 기록</p>
        </div>
        <div className="flex items-center gap-4 text-[14px]">
          <button
            onClick={() => setFilterLevel(null)}
            className={`relative pb-1 font-medium transition-colors ${filterLevel === null ? 'text-surface-50' : 'text-surface-300 hover:text-surface-100'}`}
          >
            전체
            {filterLevel === null && <span className="absolute bottom-0 left-0 right-0 h-px bg-primary-500" />}
          </button>
          {[1, 2, 3].map((l) => (
            <button
              key={l}
              onClick={() => setFilterLevel(l)}
              className={`relative pb-1 font-medium transition-colors inline-flex items-center gap-1.5 ${filterLevel === l ? 'text-surface-50' : 'text-surface-300 hover:text-surface-100'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${levelConfig[l].dot}`} />
              L{l} {levelConfig[l].label}
              {filterLevel === l && <span className="absolute bottom-0 left-0 right-0 h-px bg-primary-500" />}
            </button>
          ))}
        </div>
      </header>

      {error && <div className="text-[14px] text-red-700">{error}</div>}

      {/* ═══ Stats ════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-x-10 gap-y-6">
        <StatBlock label="총 진화" value={evolutionLog.length.toString()} />
        <StatBlock label="성공" value={successCount.toString()} tone="success" />
        <StatBlock label="롤백" value={rolledBackCount.toString()} tone="danger" />
        <StatBlock label="성공률" value={`${successRate}%`} />
      </section>

      {/* ═══ Timeline ═════════════════════════════════════════════ */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200">진화 타임라인</h2>
          {loading && <Loader2 className="w-3 h-3 text-surface-200 animate-spin" />}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[14px] text-surface-200 border-t border-surface-800">
            진화 기록이 없습니다
          </div>
        ) : (
          <div className="border-t border-surface-800">
            {filtered.map((entry) => {
              const config = levelConfig[entry.level] ?? { label: `L${entry.level}`, icon: Zap, dot: 'bg-surface-9000' };
              const Icon = config.icon;
              return (
                <article
                  key={entry.id}
                  className={`flex gap-5 py-5 border-b border-surface-800 ${entry.rolled_back ? 'opacity-70' : ''}`}
                >
                  {/* Level indicator */}
                  <div className="flex-shrink-0 pt-1">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-surface-900 border border-surface-800 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-surface-600" />
                      </div>
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white ${config.dot}`} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[11.5px] font-medium text-surface-200">
                        Level {entry.level} · {config.label}
                      </span>
                      {entry.rolled_back ? (
                        <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          롤백됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          적용됨
                        </span>
                      )}
                      <span className="text-[14px] text-surface-200 ml-auto tabular-nums">
                        {new Date(entry.timestamp).toLocaleString('ko-KR')}
                      </span>
                    </div>

                    <code className="text-[11.5px] text-surface-600 bg-surface-900 px-1.5 py-0.5 rounded font-mono">
                      {entry.component}
                    </code>
                    <p className="text-[13px] text-surface-300 mt-2 leading-relaxed">
                      {entry.change_description}
                    </p>

                    {(entry.performance_before || entry.performance_after) && (
                      <div className="mt-3 flex items-center gap-3 text-[14px]">
                        <span className="text-surface-200">
                          {entry.performance_before}
                        </span>
                        <ArrowUpRight className={`w-3.5 h-3.5 ${entry.rolled_back ? 'text-red-500 rotate-90' : 'text-emerald-500'}`} />
                        <span className={`font-medium ${entry.rolled_back ? 'text-red-700' : 'text-emerald-700'}`}>
                          {entry.performance_after}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatBlock({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  const color = tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : 'text-surface-50';
  return (
    <div>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-2">{label}</p>
      <p className={`text-[18px] font-bold tabular-nums leading-none tracking-tight ${color}`}>{value}</p>
    </div>
  );
}
