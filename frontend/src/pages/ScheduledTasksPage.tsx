import { useState, useEffect } from 'react';
import {
  Clock, Pencil, X, Save, Plus, Trash2, ChevronDown,
  Bot, Loader2, Power, Play, AlertTriangle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api';

interface ScheduledTask {
  id: string;
  title: string;
  description: string;
  cron: string;
  content: string;
  filename: string;
}

const CATEGORIES = [
  { id: 'analysis',     label: '분석',     dot: 'bg-blue-500'    },
  { id: 'content',      label: '콘텐츠',   dot: 'bg-emerald-500' },
  { id: 'optimization', label: '최적화',   dot: 'bg-amber-500'   },
  { id: 'system',       label: '시스템',   dot: 'bg-purple-500'  },
] as const;

const TASK_CATEGORY: Record<string, string> = {
  daily_analysis: 'analysis',
  ad_performance_analysis: 'analysis',
  content_planning: 'content',
  strategy_evolution: 'optimization',
  ad_budget_optimization: 'optimization',
  prompt_evolution: 'system',
  code_evolution: 'system',
};

function cronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, , , dow] = parts;
  const dayMap: Record<string, string> = {
    '*': '매일', '1': '월요일', '2': '화요일', '3': '수요일',
    '4': '목요일', '5': '금요일', '6': '토요일', '0': '일요일',
  };
  let dayStr = '매일';
  if (dow !== '*') {
    dayStr = dow.split(',').map((d) => dayMap[d] || d).join(', ');
  }
  return `${dayStr} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
}

export function ScheduledTasksPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCron, setEditCron] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newId, setNewId] = useState('');
  const [newCron, setNewCron] = useState('0 9 * * *');
  const [newContent, setNewContent] = useState('# New Task\n\nDescribe the task prompt here.\n\n## Steps\n\n1. ...\n');
  const [enabledCrons, setEnabledCrons] = useState<Record<string, string>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        setError(null);
        const [data, cronStatus] = await Promise.all([
          api.scheduledTasks.list(),
          api.scheduledTasks.cronStatus().catch(() => ({ enabled_tasks: {} })),
        ]);
        if (data && data.length > 0) {
          const mapped: ScheduledTask[] = data.map((t: any) => ({
            id: t.id || t.task_id,
            title: t.title || t.id || t.task_id,
            description: t.description || t.title || t.id || t.task_id,
            cron: t.cron || '0 0 * * *',
            content: t.content || '',
            filename: t.filename || `${t.id || t.task_id}.md`,
          }));
          setTasks(mapped);
        } else {
          setTasks([]);
        }
        setEnabledCrons(cronStatus.enabled_tasks || {});
      } catch {
        setError('태스크를 불러오지 못했습니다');
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const toggleCron = async (taskId: string, currentlyEnabled: boolean, cron: string) => {
    setTogglingId(taskId);
    try {
      await api.scheduledTasks.toggleCron(taskId, { enabled: !currentlyEnabled, cron });
      if (!currentlyEnabled) {
        setEnabledCrons((prev) => ({ ...prev, [taskId]: cron }));
      } else {
        setEnabledCrons((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }
    } catch {
      setError(`스케줄 ${!currentlyEnabled ? '등록' : '해제'} 실패`);
    } finally {
      setTogglingId(null);
    }
  };

  const runTask = async (taskId: string) => {
    setRunningIds((prev) => new Set(prev).add(taskId));
    try {
      const res = await api.scheduledTasks.run(taskId);
      if (res.status === 'already_running') {
        setError(`${taskId} 이미 실행 중 (PID: ${res.pid})`);
      }
    } catch {
      setError(`${taskId} 실행 실패`);
      setRunningIds((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
      return;
    }
    const poll = setInterval(async () => {
      try {
        const status = await api.scheduledTasks.runStatus(taskId);
        if (!status.running) {
          clearInterval(poll);
          setRunningIds((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
        }
      } catch {
        clearInterval(poll);
        setRunningIds((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
      }
    }, 5000);
  };

  const startEdit = (task: ScheduledTask) => {
    setEditingId(task.id);
    setEditContent(task.content);
    setEditCron(task.cron);
    setExpandedId(task.id);
  };

  const saveEdit = async (taskId: string) => {
    setSaving(true);
    try {
      await api.scheduledTasks.update(taskId, { content: editContent, cron: editCron });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, content: editContent, cron: editCron } : t));
    } catch {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, content: editContent, cron: editCron } : t));
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await api.scheduledTasks.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  const createTask = async () => {
    if (!newId.trim()) return;
    const title = newContent.match(/^#\s+(.+)$/m)?.[1] || newId;
    setSaving(true);
    try {
      await api.scheduledTasks.create(newId, { content: newContent, cron: newCron });
      setTasks((prev) => [...prev, { id: newId, title, description: title, cron: newCron, content: newContent, filename: `${newId}.md` }]);
    } catch {
      setTasks((prev) => [...prev, { id: newId, title, description: title, cron: newCron, content: newContent, filename: `${newId}.md` }]);
    } finally {
      setSaving(false);
      setShowNewForm(false);
      setNewId('');
      setNewCron('0 9 * * *');
      setNewContent('# New Task\n\nDescribe the task prompt here.\n\n## Steps\n\n1. ...\n');
    }
  };

  const activeCount = Object.keys(enabledCrons).length;

  return (
    <div className="space-y-10 pb-8">
      {/* ═══ Header ═══════════════════════════════════════════════ */}
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[24px] font-bold text-surface-50 tracking-tight leading-none">자동화</h1>
          <p className="text-[14px] text-surface-200 mt-2">Claude Code 스케줄 프롬프트 관리</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 transition-colors"
        >
          {showNewForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showNewForm ? '취소' : '새 태스크'}
        </button>
      </header>

      {/* Info banner — minimal */}
      <div className="pl-4 border-l-2 border-surface-900">
        <p className="text-[14px] text-surface-200 font-medium">Claude Code 스케줄 프롬프트</p>
        <p className="text-[14px] text-surface-200 mt-1 leading-relaxed">
          각 태스크의 <strong className="text-surface-200">스케줄 토글</strong>로 cron 등록/해제. 활성화 시 설정 시간에 Claude Code가 자동 실행.
        </p>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-6 text-[11.5px]">
        <span className="inline-flex items-center gap-2 text-surface-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <strong className="font-semibold text-surface-50 tabular-nums">{activeCount}</strong>개 활성
          <span className="text-surface-200 tabular-nums">/ {tasks.length} 전체</span>
        </span>
        {activeCount === 0 && tasks.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[14px] text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            아직 활성화된 스케줄이 없습니다
          </span>
        )}
      </div>

      {error && (
        <div className="text-[14px] text-red-700">{error}</div>
      )}

      {/* New Task Form */}
      {showNewForm && (
        <section className="border-y border-surface-800 py-6 space-y-4 animate-fade-in">
          <h3 className="text-[14px] font-semibold text-surface-50">새 스케줄 태스크 생성</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="태스크 ID (snake_case)">
              <input
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value.replace(/[^a-z0-9_]/g, ''))}
                placeholder="weekly_report"
                className="w-full px-3 py-2 text-[14px] bg-surface-900 border border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-surface-100/15 focus:border-surface-500 placeholder:text-surface-500 font-mono"
              />
            </Field>
            <Field label="실행 스케줄 (cron)">
              <input
                type="text"
                value={newCron}
                onChange={(e) => setNewCron(e.target.value)}
                placeholder="0 9 * * *"
                className="w-full px-3 py-2 text-[14px] bg-surface-900 border border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-surface-100/15 focus:border-surface-500 placeholder:text-surface-500 font-mono"
              />
              <p className="text-[14px] text-surface-200 mt-1.5">{cronToHuman(newCron)}</p>
            </Field>
          </div>
          <Field label="프롬프트 내용 (마크다운)">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 text-[14px] bg-surface-900 border border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-surface-100/15 focus:border-surface-500 font-mono leading-relaxed resize-y"
            />
          </Field>
          <div className="flex justify-end">
            <button
              onClick={createTask}
              disabled={!newId.trim() || saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-40 transition-colors"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? '생성 중...' : '생성'}
            </button>
          </div>
        </section>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-surface-200">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[14px]">로딩 중...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-20 text-center">
          <Bot className="w-7 h-7 text-surface-600 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-surface-600">등록된 태스크가 없습니다</p>
          <p className="text-[12.5px] text-surface-300 mt-1.5">새 태스크 버튼으로 첫 태스크를 만들어보세요</p>
        </div>
      ) : (
        // ═══ Tasks by Category ════════════════════════════════════
        <div className="space-y-10">
          {CATEGORIES.map((cat) => {
            const catTasks = tasks.filter((t) => (TASK_CATEGORY[t.id] || 'system') === cat.id);
            if (catTasks.length === 0) return null;
            const catActive = catTasks.filter((t) => t.id in enabledCrons).length;
            return (
              <section key={cat.id}>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="inline-flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200">
                    <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                    {cat.label}
                  </h2>
                  <span className="text-[14px] text-surface-200 tabular-nums">
                    {catActive}/{catTasks.length} 활성
                  </span>
                </div>

                <div className="border-t border-surface-800">
                  {catTasks.map((task) => {
                    const isExpanded = expandedId === task.id;
                    const isEditing = editingId === task.id;
                    const isCronEnabled = task.id in enabledCrons;
                    const isToggling = togglingId === task.id;
                    const isRunning = runningIds.has(task.id);

                    return (
                      <div
                        key={task.id}
                        className="border-b border-surface-800"
                      >
                        {/* Row */}
                        <div
                          className="flex items-center gap-4 py-3.5 group hover:bg-surface-800/40 transition-colors -mx-2 px-2 rounded cursor-pointer"
                          onClick={() => !isEditing && setExpandedId(isExpanded ? null : task.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-[15px] font-semibold text-surface-50">{task.title}</h3>
                              {isCronEnabled && (
                                <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-emerald-700">
                                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                  활성
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[12.5px]">
                              <span className="inline-flex items-center gap-1 text-surface-200">
                                <Clock className="w-3 h-3" />
                                {cronToHuman(task.cron)}
                              </span>
                              <code className="text-[12px] bg-surface-900 px-1.5 py-0.5 rounded text-surface-300 font-mono">{task.cron}</code>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleCron(task.id, isCronEnabled, task.cron)}
                              disabled={isToggling}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium rounded-md transition-colors ${
                                isCronEnabled
                                  ? 'text-emerald-700 hover:bg-emerald-50'
                                  : 'text-surface-300 hover:text-surface-100 hover:bg-surface-800'
                              } disabled:opacity-50`}
                              title={isCronEnabled ? '스케줄 비활성화' : '스케줄 활성화'}
                            >
                              {isToggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                              {isCronEnabled ? '활성' : '비활성'}
                            </button>
                            <button
                              onClick={() => runTask(task.id)}
                              disabled={isRunning}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium text-surface-600 hover:text-surface-50 hover:bg-surface-800 rounded-md disabled:opacity-50 transition-colors"
                              title="지금 실행"
                            >
                              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                              {isRunning ? '실행 중' : '실행'}
                            </button>
                            {!isEditing && (
                              <button
                                onClick={() => startEdit(task)}
                                className="p-1.5 text-surface-300 hover:text-surface-100 hover:bg-surface-800 rounded transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`"${task.title}" 태스크를 삭제하시겠습니까?`)) deleteTask(task.id);
                              }}
                              className="p-1.5 text-surface-200 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ChevronDown className={`w-3.5 h-3.5 text-surface-200 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {/* Expanded */}
                        {isExpanded && (
                          <div className="pb-5 pl-1 animate-fade-in">
                            {isEditing ? (
                              <div className="space-y-3 pt-2">
                                <Field label="실행 스케줄">
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="text"
                                      value={editCron}
                                      onChange={(e) => setEditCron(e.target.value)}
                                      className="w-48 px-3 py-2 text-[14px] font-mono bg-surface-900 border border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-surface-100/15 focus:border-surface-500"
                                    />
                                    <span className="text-[14px] text-surface-200">{cronToHuman(editCron)}</span>
                                  </div>
                                </Field>
                                <Field label="프롬프트 내용">
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={20}
                                    className="w-full px-3 py-2 text-[14px] font-mono leading-relaxed bg-surface-900 border border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-surface-100/15 focus:border-surface-500 resize-y"
                                  />
                                </Field>
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-3 py-2 text-[12.5px] font-medium text-surface-300 hover:text-surface-50 hover:bg-surface-800 rounded-md transition-colors"
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={() => saveEdit(task.id)}
                                    disabled={saving}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50 transition-colors"
                                  >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    저장
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="report-markdown text-[14px] leading-relaxed bg-surface-900 rounded-lg px-5 py-4">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.content}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[14px] font-semibold uppercase tracking-[0.12em] text-surface-200 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
