import { useState, useEffect } from 'react';
import {
  Clock, Pencil, X, Save, Plus, Trash2, ChevronDown, ChevronUp,
  CalendarClock, Bot, FileText, Code, Zap, Mail, Loader2,
  Power, CheckCircle2, AlertTriangle, Play,
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

const levelIcons: Record<string, typeof Zap> = {
  daily_analysis: CalendarClock,
  content_planning: FileText,
  strategy_evolution: Zap,
  code_evolution: Code,
  prompt_evolution: Bot,
};

const levelColors: Record<string, string> = {
  daily_analysis: 'bg-blue-50 text-blue-600 border-blue-200',
  content_planning: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  strategy_evolution: 'bg-amber-50 text-amber-600 border-amber-200',
  code_evolution: 'bg-purple-50 text-purple-600 border-purple-200',
  prompt_evolution: 'bg-pink-50 text-pink-600 border-pink-200',
};

function cronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, , , dow] = parts;

  const dayMap: Record<string, string> = {
    '*': '매일',
    '1': '월요일',
    '2': '화요일',
    '3': '수요일',
    '4': '목요일',
    '5': '금요일',
    '6': '토요일',
    '0': '일요일',
  };

  let dayStr = '매일';
  if (dow !== '*') {
    const days = dow.split(',').map((d) => dayMap[d] || d);
    dayStr = days.join(', ');
  }

  return `${dayStr} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
}

// Mock data matching the actual scheduled_tasks/*.md files
const initialTasks: ScheduledTask[] = [
  {
    id: 'daily_analysis',
    title: 'Daily Performance Analysis & Report',
    description: 'Daily Performance Analysis & Report',
    cron: '3 9 * * *',
    filename: 'daily_analysis.md',
    content: `# Daily Performance Analysis & Report

You are the marketing agent's analytics brain. Your job is to analyze yesterday's marketing performance and generate an actionable daily report.

## Steps

1. **Collect metrics** — Call the FastAPI server to gather performance data:
   \`\`\`bash
   curl -s http://localhost:8000/api/analytics?period=24h
   curl -s http://localhost:8000/api/analytics/details?period=24h
   \`\`\`

2. **Read current strategy** — Read \`config/strategy.yaml\` to understand the current marketing strategy and its thresholds.

3. **Analyze performance**:
   - Compare engagement rates against \`performance_thresholds\` in strategy.yaml
   - Identify top-performing and under-performing content
   - Spot trends (rising/falling engagement by channel, time, content type)
   - Check if any metric dropped more than \`alert_drop_percentage\`

4. **Generate report** — Write a markdown report to \`reports/daily_YYYY-MM-DD.md\` with:
   - Executive summary (2-3 sentences)
   - Channel-by-channel breakdown (impressions, engagements, engagement rate, clicks)
   - Top 3 best performing posts with analysis of why they worked
   - Bottom 3 posts with analysis of what to avoid
   - Recommendations for tomorrow's content
   - Flag if strategy adjustment is needed

5. **Log any anomalies** — If engagement dropped significantly, note it in the report and flag for the strategy evolution task.

## Important
- Always read the latest reports from previous days for trend comparison
- Be data-driven — base all recommendations on actual numbers
- Keep the report concise but actionable`,
  },
  {
    id: 'content_planning',
    title: 'Daily Content Planning & Generation',
    description: 'Daily Content Planning & Generation',
    cron: '17 10 * * *',
    filename: 'content_planning.md',
    content: `# Daily Content Planning & Generation

You are the marketing agent's content creator. Generate and queue today's marketing content based on the current strategy and recent performance data.

## Steps

1. **Read current strategy** — Read \`config/strategy.yaml\` for content themes, weights, and posting optimization settings.

2. **Read product info** — Read \`config/agent.yaml\` for product details, brand voice, and target audience.

3. **Check recent performance** — Read the latest daily report from \`reports/\` to understand what content types are performing well.

4. **Read templates** — Read the relevant templates from \`src/content/templates/\` for the content types you'll generate.

5. **Generate content** — For each enabled channel (check \`config/channels.yaml\`):
   - Select content themes based on \`theme_weights\` in strategy
   - Follow the brand voice and tone guidelines
   - Apply hashtag strategy from strategy.yaml
   - Ensure content fits channel constraints (e.g., 280 chars for Twitter)
   - Generate enough content for today's posting schedule

6. **Queue content** — Submit generated content to the API:
   \`\`\`bash
   curl -X POST http://localhost:8000/api/content \\
     -H "Content-Type: application/json" \\
     -d '{"channel": "twitter", "content_text": "...", "template_version": "sns_post_v1"}'
   \`\`\`

7. **Verify** — Check the queue:
   \`\`\`bash
   curl -s http://localhost:8000/api/content/queued
   \`\`\`

## Guidelines
- Content should feel authentic, not AI-generated
- Follow the brand voice strictly
- Vary content types throughout the day
- Include CTAs in promotional content
- Use the language specified in agent.yaml`,
  },
  {
    id: 'strategy_evolution',
    title: 'Level 1: Strategy Auto-Evolution',
    description: 'Strategy Auto-Evolution (Mon/Thu)',
    cron: '42 11 * * 1,4',
    filename: 'strategy_evolution.md',
    content: `# Level 1: Strategy Auto-Evolution

You are the marketing agent's strategy optimizer. Analyze performance trends and automatically adjust marketing parameters in \`config/strategy.yaml\`.

## Steps

1. **Gather data** — Get the last 7 days of analytics:
   \`\`\`bash
   curl -s http://localhost:8000/api/analytics?period=7d
   curl -s http://localhost:8000/api/analytics/details?period=7d
   \`\`\`

2. **Read recent reports** — Read the last 3-5 daily reports from \`reports/\` for qualitative insights.

3. **Read current strategy** — Read \`config/strategy.yaml\` and \`config/channels.yaml\`.

4. **Analyze and decide** what to adjust:
   - **Posting times**: If certain time slots consistently outperform others, shift \`best_times\`
   - **Content mix**: If certain themes get more engagement, adjust \`theme_weights\`
   - **Hashtag strategy**: If engagement differs by hashtag approach, change \`hashtag_strategy\`
   - **Engagement tactics**: Adjust \`question_posts_ratio\`, \`emoji_usage\` based on what works
   - **Channel priority**: If one channel dramatically outperforms, increase its posting frequency

5. **Apply changes** — Edit \`config/strategy.yaml\` directly

6. **Log the change** via API

## Safety Rules
- Never change more than 3 parameters at once
- Keep changes incremental (max 20% shift in weights per cycle)
- If overall engagement has been stable/good, make minimal changes
- Always document the reasoning for each change`,
  },
  {
    id: 'code_evolution',
    title: 'Level 3: Code Self-Review & Improvement',
    description: 'Code Self-Review & Improvement (Wed)',
    cron: '22 14 * * 3',
    filename: 'code_evolution.md',
    content: `# Level 3: Code Self-Review & Improvement

You are the marketing agent's code evolution engine. Review and improve the Python codebase itself.

## Steps

1. **Read the full codebase** — Review all files under \`src/\`

2. **Check for issues**:
   - Bugs or error-prone code patterns
   - Missing error handling in critical paths
   - Performance bottlenecks
   - Missing channel adapters
   - Useful API endpoints that don't exist yet

3. **Check test coverage** — Read \`tests/\` and identify untested code paths.

4. **Plan improvements** — Prioritize by impact

5. **Implement changes** — Keep changes focused and well-scoped

6. **Verify** — Run the test suite

## Safety Rules
- NEVER modify config files
- NEVER modify scheduled task prompts
- Run tests after every change
- Keep changes small and incremental`,
  },
  {
    id: 'prompt_evolution',
    title: 'Level 2: Prompt & Template Self-Improvement',
    description: 'Prompt & Template Improvement (Fri)',
    cron: '51 14 * * 5',
    filename: 'prompt_evolution.md',
    content: `# Level 2: Prompt & Template Self-Improvement

You are the marketing agent's template optimizer. Improve the content generation templates based on performance data.

## Steps

1. **Analyze template performance** — Compare content performance by template version

2. **Read current templates** — Read all files in \`src/content/templates/\`

3. **Identify patterns** in high-performing content:
   - What hooks work best?
   - What CTAs drive more clicks?
   - What structure gets more engagement?
   - What tone resonates with the audience?

4. **Improve templates** — Edit the template YAML files directly

5. **Log the evolution**

## Safety Rules
- Keep a clear before/after record of changes
- Only change templates that have sufficient data (>10 posts)
- If a template change leads to lower performance, revert
- Never delete working templates — evolve them incrementally`,
  },
];

export function ScheduledTasksPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>(initialTasks);
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

  /* ---------- fetch tasks + cron status on mount ---------- */
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
          setTasks(initialTasks);
        }
        setEnabledCrons(cronStatus.enabled_tasks || {});
      } catch (err) {
        console.error('Failed to fetch scheduled tasks:', err);
        setTasks(initialTasks);
        setError('Failed to load tasks from API. Showing mock data.');
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
    } catch (err) {
      console.error('Failed to toggle cron:', err);
      setError(`스케줄 ${!currentlyEnabled ? '등록' : '해제'} 실패. 서버 로그를 확인하세요.`);
    } finally {
      setTogglingId(null);
    }
  };

  const runTask = async (taskId: string) => {
    setRunningIds((prev) => new Set(prev).add(taskId));
    try {
      const res = await api.scheduledTasks.run(taskId);
      if (res.status === 'already_running') {
        setError(`${taskId}이(가) 이미 실행 중입니다 (PID: ${res.pid})`);
      }
    } catch (err) {
      console.error('Failed to run task:', err);
      setError(`${taskId} 실행 실패. Claude CLI가 설치되어 있는지 확인하세요.`);
      setRunningIds((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
      return;
    }
    // Poll for completion
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
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, content: editContent, cron: editCron } : t
        )
      );
    } catch (err) {
      console.error('Failed to save task:', err);
      // Fallback: update locally
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, content: editContent, cron: editCron } : t
        )
      );
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const deleteTask = async (taskId: string) => {
    try {
      await api.scheduledTasks.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      // Fallback: delete locally
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  const createTask = async () => {
    if (!newId.trim()) return;
    const title = newContent.match(/^#\s+(.+)$/m)?.[1] || newId;
    setSaving(true);
    try {
      await api.scheduledTasks.create(newId, { content: newContent, cron: newCron });
      setTasks((prev) => [
        ...prev,
        {
          id: newId,
          title,
          description: title,
          cron: newCron,
          content: newContent,
          filename: `${newId}.md`,
        },
      ]);
    } catch (err) {
      console.error('Failed to create task:', err);
      // Fallback: create locally
      setTasks((prev) => [
        ...prev,
        {
          id: newId,
          title,
          description: title,
          cron: newCron,
          content: newContent,
          filename: `${newId}.md`,
        },
      ]);
    } finally {
      setSaving(false);
      setShowNewForm(false);
      setNewId('');
      setNewCron('0 9 * * *');
      setNewContent('# New Task\n\nDescribe the task prompt here.\n\n## Steps\n\n1. ...\n');
    }
  };

  const toggleExpand = (id: string) => {
    if (editingId === id) return;
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Scheduled Tasks</h1>
          <p className="text-sm text-surface-500 mt-0.5">Claude Code 스케줄 프롬프트 관리</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
        >
          {showNewForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showNewForm ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <span>{error}</span>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl border border-primary-200">
        <Bot className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
        <div className="text-sm text-primary-800">
          <p className="font-medium">Claude Code 스케줄 프롬프트</p>
          <p className="text-primary-600 mt-0.5">
            각 태스크의 <strong>스케줄 토글</strong>로 cron 등록/해제를 할 수 있습니다.
            활성화하면 설정된 시간에 Claude Code가 자동으로 프롬프트를 실행합니다.
          </p>
        </div>
      </div>

      {/* Cron Status Summary */}
      <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-surface-200 shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-surface-700">
            <strong>{Object.keys(enabledCrons).length}</strong>개 활성 /
            <span className="text-surface-400 ml-1">{tasks.length}개 전체</span>
          </span>
        </div>
        {Object.keys(enabledCrons).length === 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            아직 활성화된 스케줄이 없습니다
          </div>
        )}
      </div>

      {/* New Task Form */}
      {showNewForm && (
        <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-surface-900">Create New Scheduled Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Task ID (snake_case)</label>
              <input
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value.replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. weekly_report"
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">
                Cron Schedule
                <span className="text-surface-400 font-normal ml-1">(min hour dom mon dow)</span>
              </label>
              <input
                type="text"
                value={newCron}
                onChange={(e) => setNewCron(e.target.value)}
                placeholder="0 9 * * *"
                className="w-full px-3 py-2 text-sm font-mono border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-surface-400 mt-1">{cronToHuman(newCron)}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Prompt Content (Markdown)</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 text-sm font-mono border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={createTask}
              disabled={!newId.trim() || saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-surface-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading scheduled tasks...</span>
        </div>
      ) : (
        <>
          {/* Task Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {tasks.map((task) => {
              const Icon = levelIcons[task.id] || Mail;
              const isEnabled = task.id in enabledCrons;
              return (
                <div key={task.id} className={`bg-white rounded-xl border p-4 shadow-sm text-center ${isEnabled ? 'border-emerald-200' : 'border-surface-200'}`}>
                  <div className={`inline-flex p-2.5 rounded-lg border mb-2 ${levelColors[task.id] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-surface-700 truncate">{task.id}</p>
                  <p className="text-xs text-surface-400 mt-0.5 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {cronToHuman(task.cron)}
                  </p>
                  <div className={`text-xs mt-1.5 font-medium ${isEnabled ? 'text-emerald-600' : 'text-surface-400'}`}>
                    {isEnabled ? '● 활성' : '○ 비활성'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Task Cards */}
          <div className="space-y-3">
            {tasks.map((task) => {
              const Icon = levelIcons[task.id] || Mail;
              const isExpanded = expandedId === task.id;
              const isEditing = editingId === task.id;
              const isCronEnabled = task.id in enabledCrons;
              const isToggling = togglingId === task.id;

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isCronEnabled ? 'border-emerald-200' : 'border-surface-200'}`}
                >
                  {/* Card Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-50 transition-colors"
                    onClick={() => toggleExpand(task.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${levelColors[task.id] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-surface-900">{task.title}</h3>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-surface-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {cronToHuman(task.cron)}
                          </span>
                          <code className="text-xs bg-surface-100 px-1.5 py-0.5 rounded text-surface-500">{task.cron}</code>
                          <span className="text-xs text-surface-400">{task.filename}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Cron Toggle Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCron(task.id, isCronEnabled, task.cron);
                        }}
                        disabled={isToggling}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          isCronEnabled
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-surface-100 text-surface-500 hover:bg-surface-200 border border-surface-200'
                        } disabled:opacity-50`}
                        title={isCronEnabled ? '스케줄 비활성화' : '스케줄 활성화'}
                      >
                        {isToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                        {isCronEnabled ? '활성' : '비활성'}
                      </button>
                      {/* Run button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          runTask(task.id);
                        }}
                        disabled={runningIds.has(task.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 disabled:opacity-50"
                        title="지금 실행"
                      >
                        {runningIds.has(task.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        {runningIds.has(task.id) ? '실행 중...' : '실행'}
                      </button>
                      {!isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(task);
                          }}
                          className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`"${task.title}" 태스크를 삭제하시겠습니까?`)) {
                            deleteTask(task.id);
                          }
                        }}
                        className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-surface-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-surface-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-surface-100">
                      {isEditing ? (
                        <div className="p-4 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-surface-600 mb-1">
                              Cron Schedule
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={editCron}
                                onChange={(e) => setEditCron(e.target.value)}
                                className="w-48 px-3 py-2 text-sm font-mono border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                              <span className="text-xs text-surface-400">{cronToHuman(editCron)}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-surface-600 mb-1">
                              Prompt Content
                            </label>
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={20}
                              className="w-full px-3 py-2 text-sm font-mono leading-relaxed border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(task.id)}
                              disabled={saving}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="report-markdown text-sm leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.content}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
