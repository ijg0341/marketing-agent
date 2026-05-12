import { useState, useEffect, useCallback } from 'react';
import {
  GitPullRequest, Check, X, Loader2, AlertTriangle, Trash2, RefreshCw,
} from 'lucide-react';
import { api } from '../api';

interface Proposal {
  id: number;
  task_id: string;
  target_file: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'conflict';
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_note: string | null;
  diff?: string;
  before_content?: string;
  after_content?: string;
}

const TASK_LABEL: Record<string, string> = {
  strategy_evolution: '전략 자동 진화',
  prompt_evolution: '템플릿 자체 개선',
};

const STATUS_TABS = [
  { id: 'pending',  label: '대기 중',  tone: 'amber'   },
  { id: 'applied',  label: '적용됨',   tone: 'emerald' },
  { id: 'rejected', label: '거절됨',   tone: 'surface' },
  { id: 'conflict', label: '충돌',     tone: 'red'     },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]['id'];

export function ProposalsPage() {
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, Proposal>>({});
  const [actingId, setActingId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await api.proposals.list();
      const byStatus: Record<string, number> = {};
      for (const p of all as Proposal[]) {
        byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      }
      setCounts(byStatus);
      setProposals((all as Proposal[]).filter((p) => p.status === filter));
    } catch (e: any) {
      setError(e.message ?? '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailCache[id]) {
      try {
        const detail = await api.proposals.get(id);
        setDetailCache((prev) => ({ ...prev, [id]: detail }));
      } catch (e: any) {
        setError(e.message ?? '상세 불러오기 실패');
      }
    }
  };

  const onApprove = async (id: number) => {
    if (!confirm('이 변경안을 승인하고 파일에 반영합니다. 계속할까요?')) return;
    setActingId(id);
    try {
      await api.proposals.approve(id);
      await fetchAll();
      setExpandedId(null);
    } catch (e: any) {
      setError(e.message ?? '승인 실패 (충돌일 수 있음)');
    } finally {
      setActingId(null);
    }
  };

  const onReject = async (id: number) => {
    if (!confirm('이 변경안을 거절합니다. 계속할까요?')) return;
    setActingId(id);
    try {
      await api.proposals.reject(id);
      await fetchAll();
      setExpandedId(null);
    } catch (e: any) {
      setError(e.message ?? '거절 실패');
    } finally {
      setActingId(null);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm('기록을 영구 삭제합니다. 계속할까요?')) return;
    setActingId(id);
    try {
      await api.proposals.delete(id);
      await fetchAll();
      setExpandedId(null);
    } catch (e: any) {
      setError(e.message ?? '삭제 실패');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-10 pb-8">
      {/* Header */}
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[24px] font-bold text-surface-50 tracking-tight leading-none">진화 제안</h1>
          <p className="text-[14px] text-surface-200 mt-2">자동화 태스크가 제안한 yaml 변경안 — 사람이 승인해야 반영됩니다</p>
        </div>
        <button
          onClick={fetchAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-surface-200 hover:text-surface-50 hover:bg-surface-800 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </header>

      {/* Status tabs */}
      <div className="flex items-center gap-6 text-[14px] border-b border-surface-800 pb-0">
        {STATUS_TABS.map((tab) => {
          const active = filter === tab.id;
          const count = counts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`relative pb-3 font-medium transition-colors inline-flex items-center gap-2 ${
                active ? 'text-surface-50' : 'text-surface-300 hover:text-surface-100'
              }`}
            >
              {tab.label}
              <span className={`text-[12px] tabular-nums px-1.5 py-0.5 rounded ${
                active ? 'bg-surface-800 text-surface-100' : 'text-surface-300'
              }`}>{count}</span>
              {active && <span className="absolute bottom-0 left-0 right-0 h-px bg-primary-500" />}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="text-[14px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-surface-200">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[14px]">로딩 중...</span>
        </div>
      ) : proposals.length === 0 ? (
        <div className="py-20 text-center">
          <GitPullRequest className="w-7 h-7 text-surface-600 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-surface-300">
            {filter === 'pending' ? '대기 중인 제안이 없습니다' : `${STATUS_TABS.find((t) => t.id === filter)?.label} 항목이 없습니다`}
          </p>
          {filter === 'pending' && (
            <p className="text-[12.5px] text-surface-400 mt-1.5">
              strategy_evolution / prompt_evolution 태스크가 실행되면 여기에 변경안이 쌓입니다
            </p>
          )}
        </div>
      ) : (
        <div className="border-t border-surface-800">
          {proposals.map((p) => {
            const detail = detailCache[p.id];
            const isExpanded = expandedId === p.id;
            const isActing = actingId === p.id;
            return (
              <article key={p.id} className="border-b border-surface-800">
                <div
                  className="flex items-center gap-4 py-4 px-2 -mx-2 rounded hover:bg-surface-800/40 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(p.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-[15px] font-semibold text-surface-50">
                        {TASK_LABEL[p.task_id] ?? p.task_id}
                      </h3>
                      <StatusPill status={p.status} />
                      <span className="text-[14px] text-surface-300 ml-auto tabular-nums">
                        {new Date(p.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <code className="text-[12px] bg-surface-900 px-1.5 py-0.5 rounded text-surface-300 font-mono">
                        {p.target_file}
                      </code>
                    </div>
                    {p.reason && (
                      <p className="text-[13px] text-surface-200 mt-2 leading-relaxed line-clamp-2">
                        {p.reason}
                      </p>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pb-6 space-y-4 animate-fade-in">
                    {/* Reason full */}
                    {p.reason && (
                      <div className="bg-surface-900 border border-surface-800 rounded-md px-4 py-3">
                        <p className="text-[12px] uppercase tracking-[0.12em] font-semibold text-surface-300 mb-1.5">변경 근거</p>
                        <p className="text-[13.5px] text-surface-100 leading-relaxed whitespace-pre-wrap">{p.reason}</p>
                      </div>
                    )}

                    {/* Diff */}
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.12em] font-semibold text-surface-300 mb-2">Diff (unified)</p>
                      {detail?.diff ? (
                        <DiffView diff={detail.diff} />
                      ) : (
                        <div className="flex items-center gap-2 text-[13px] text-surface-300 py-3">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          diff 로딩 중...
                        </div>
                      )}
                    </div>

                    {/* Decision metadata */}
                    {p.status !== 'pending' && (
                      <div className="bg-surface-900 border border-surface-800 rounded-md px-4 py-3 text-[13px] text-surface-200">
                        <span className="font-semibold text-surface-100">{p.status === 'applied' ? '적용됨' : p.status === 'rejected' ? '거절됨' : '충돌'}</span>
                        {p.decided_at && (
                          <span className="text-surface-300"> · {new Date(p.decided_at).toLocaleString('ko-KR')}</span>
                        )}
                        {p.decided_by && (
                          <span className="text-surface-300"> · by {p.decided_by}</span>
                        )}
                        {p.decision_note && (
                          <p className="mt-1.5 text-surface-200">{p.decision_note}</p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      {p.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => onReject(p.id)}
                            disabled={isActing}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-surface-200 border border-surface-700 hover:bg-surface-800 hover:text-surface-50 rounded-md transition-colors disabled:opacity-40"
                          >
                            <X className="w-3.5 h-3.5" />
                            거절
                          </button>
                          <button
                            onClick={() => onApprove(p.id)}
                            disabled={isActing}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-md transition-colors disabled:opacity-40"
                          >
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            승인하고 파일에 반영
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onDelete(p.id)}
                          disabled={isActing}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-surface-300 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          기록 삭제
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Proposal['status'] }) {
  const config: Record<Proposal['status'], { label: string; dot: string; text: string }> = {
    pending:  { label: '대기 중', dot: 'bg-amber-500',   text: 'text-amber-400'   },
    applied:  { label: '적용됨',  dot: 'bg-emerald-500', text: 'text-emerald-400' },
    rejected: { label: '거절됨',  dot: 'bg-surface-500', text: 'text-surface-300' },
    approved: { label: '승인됨',  dot: 'bg-emerald-500', text: 'text-emerald-400' },
    conflict: { label: '충돌',    dot: 'bg-red-500',     text: 'text-red-400'     },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium ${c.text}`}>
      {status === 'conflict' && <AlertTriangle className="w-3.5 h-3.5" />}
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function DiffView({ diff }: { diff: string }) {
  const lines = diff.split('\n');
  return (
    <pre className="bg-surface-950 border border-surface-800 rounded-md overflow-x-auto text-[12.5px] font-mono leading-relaxed">
      {lines.map((line, i) => {
        let cls = 'text-surface-200';
        if (line.startsWith('+++') || line.startsWith('---')) cls = 'text-surface-400 font-semibold';
        else if (line.startsWith('@@')) cls = 'text-primary-400 bg-primary-500/10';
        else if (line.startsWith('+')) cls = 'text-emerald-400 bg-emerald-500/10';
        else if (line.startsWith('-')) cls = 'text-red-400 bg-red-500/10';
        return (
          <div key={i} className={`px-3 ${cls}`}>
            {line || ' '}
          </div>
        );
      })}
    </pre>
  );
}
