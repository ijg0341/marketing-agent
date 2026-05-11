import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Send, Search, Loader2 } from 'lucide-react';
import { ChannelBadge } from '../components/ChannelBadge';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../api';

const TEMPLATES = [
  { value: 'sns_post_v1', label: 'SNS Post' },
  { value: 'plandog_v1', label: 'PLANDOG' },
];

const ACTIVE_CHANNELS = [
  { value: '',             label: '전체' },
  { value: 'twitter',      label: 'Twitter / X' },
  { value: 'instagram',    label: 'Instagram' },
  { value: 'facebook',     label: 'Facebook' },
  { value: 'blog_naver',   label: '네이버 블로그' },
  { value: 'blog_tistory', label: '티스토리' },
  { value: 'email',        label: 'Email' },
];

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function ContentPage() {
  const [tab, setTab] = useState<'all' | 'queued' | 'posted' | 'failed'>('all');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const navigate = useNavigate();

  const [formChannel, setFormChannel] = useState(ACTIVE_CHANNELS[0].value);
  const [formTemplate, setFormTemplate] = useState('sns_post_v1');
  const [formMediaUrl, setFormMediaUrl] = useState('');
  const [formContent, setFormContent] = useState('');

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.content.list({ limit: 100 }).catch(() => null);
      if (items && Array.isArray(items)) {
        setContent(items);
      } else {
        const [queued, recent] = await Promise.all([
          api.content.queued().catch(() => [] as any[]),
          api.content.recent(50).catch(() => [] as any[]),
        ]);
        const map = new Map<number, any>();
        for (const item of [...(queued ?? []), ...(recent ?? [])]) {
          map.set(item.id, item);
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setContent(merged);
      }
    } catch {
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleCreate = async () => {
    if (!formContent.trim()) return;
    setSubmitting(true);
    try {
      await api.content.create({
        channel: formChannel,
        content_text: formContent,
        media_url: formMediaUrl || undefined,
        template_version: formTemplate,
      });
      setFormContent('');
      setFormMediaUrl('');
      setShowForm(false);
      await fetchContent();
    } catch (err) {
      console.error('Failed to create content:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await api.content.publish();
      await fetchContent();
    } catch (err) {
      console.error('Failed to publish:', err);
    } finally {
      setPublishing(false);
    }
  };

  const filtered = content.filter((c) => {
    if (tab !== 'all' && c.status !== tab) return false;
    if (search && !c.content_text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: content.length,
    queued: content.filter((c) => c.status === 'queued').length,
    posted: content.filter((c) => c.status === 'posted').length,
    failed: content.filter((c) => c.status === 'failed').length,
  };

  const tabLabels: Record<string, string> = {
    all: '전체',
    queued: '대기',
    posted: '발행됨',
    failed: '실패',
  };

  return (
    <div className="pb-8 space-y-8">
      {/* ═══ Header ═════════════════════════════════════════════════ */}
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[24px] font-bold text-surface-50 tracking-tight leading-none">콘텐츠</h1>
          <p className="text-[14px] text-surface-200 mt-2">콘텐츠 관리 및 게시</p>
        </div>
        <div className="flex items-center gap-1.5">
          {loading && <Loader2 className="w-3.5 h-3.5 text-surface-200 animate-spin mr-1" />}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-surface-200 hover:text-surface-50 hover:bg-surface-800 rounded-md disabled:opacity-50 transition-colors"
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            대기열 발행
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 transition-colors"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? '취소' : '콘텐츠 작성'}
          </button>
        </div>
      </header>

      {/* ═══ Create Form ═══════════════════════════════════════════ */}
      {showForm && (
        <section className="border-y border-surface-800 py-6 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="채널">
              <select
                value={formChannel}
                onChange={(e) => setFormChannel(e.target.value)}
                className="w-full px-3 py-2 text-[14px] bg-surface-900 border border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-surface-100/15 focus:border-surface-500 transition-colors"
              >
                {ACTIVE_CHANNELS.map((ch) => (
                  <option key={ch.value} value={ch.value}>{ch.label}</option>
                ))}
              </select>
            </Field>
            <Field label="템플릿">
              <select
                value={formTemplate}
                onChange={(e) => setFormTemplate(e.target.value)}
                className="w-full px-3 py-2 text-[14px] bg-surface-900 border border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-surface-100/15 focus:border-surface-500 transition-colors"
              >
                {TEMPLATES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="미디어 URL (선택)">
              <input
                type="url"
                value={formMediaUrl}
                onChange={(e) => setFormMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-[14px] bg-surface-900 border border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-surface-100/15 focus:border-surface-500 placeholder:text-surface-500 transition-colors"
              />
            </Field>
          </div>
          <Field label="내용">
            <textarea
              rows={3}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="콘텐츠를 입력하세요..."
              className="w-full px-3 py-2 text-[14px] bg-surface-900 border border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-surface-100/15 focus:border-surface-500 placeholder:text-surface-500 resize-y transition-colors"
            />
          </Field>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={submitting || !formContent.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              대기열에 추가
            </button>
          </div>
        </section>
      )}

      {/* ═══ Filter Toolbar ═══════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-4 border-b border-surface-800 pb-3">
        <div className="flex items-center gap-6 text-[14px]">
          {(['all', 'queued', 'posted', 'failed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative pb-3 -mb-3 font-medium transition-colors ${
                tab === t ? 'text-surface-50' : 'text-surface-300 hover:text-surface-100'
              }`}
            >
              {tabLabels[t]}
              <span className={`ml-1 text-[12.5px] tabular-nums ${tab === t ? 'text-surface-200' : 'text-surface-200'}`}>
                {counts[t]}
              </span>
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-primary-500" />
              )}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-200" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색..."
            className="w-full pl-8 pr-3 py-2 text-[14px] bg-surface-900 border border-transparent rounded-md focus:outline-none focus:bg-surface-900 focus:border-surface-800 focus:ring-2 focus:ring-surface-100/10 placeholder:text-surface-500 transition-all"
          />
        </div>
      </div>

      {/* ═══ Content List ════════════════════════════════════════ */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Search className="w-7 h-7 text-surface-600 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-surface-600">
            {loading ? '불러오는 중...' : '아직 데이터가 없습니다'}
          </p>
          {!loading && (
            <p className="text-[12.5px] text-surface-300 mt-1.5">
              {tab !== 'all'
                ? `'${tabLabels[tab]}' 상태의 콘텐츠가 없습니다`
                : '콘텐츠 작성 버튼으로 첫 콘텐츠를 만들어보세요'}
            </p>
          )}
        </div>
      ) : (
        <div>
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/content/${item.id}`)}
              className="group w-full flex items-center gap-4 py-4 border-b border-surface-800 hover:bg-surface-800/40 transition-colors -mx-2 px-2 rounded text-left"
            >
              <div className="w-[130px] flex-shrink-0">
                <ChannelBadge channel={item.channel} />
              </div>
              <p className="text-[15px] text-surface-50 line-clamp-1 flex-1 group-hover:text-surface-50 leading-snug">
                {item.content_text}
              </p>
              <div className="w-[90px] flex-shrink-0">
                <StatusBadge status={item.status} />
              </div>
              <span className="text-[12.5px] text-surface-400 font-mono tabular-nums w-24 flex-shrink-0">
                {item.template_version ?? '—'}
              </span>
              <span className="text-[13px] text-surface-300 tabular-nums w-20 text-right flex-shrink-0">
                {formatRelative(item.posted_at ?? item.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[14px] font-semibold uppercase tracking-[0.12em] text-surface-200 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
