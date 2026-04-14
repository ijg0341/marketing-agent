import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Send, Search, Loader2, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { ChannelBadge } from '../components/ChannelBadge';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../api';

const TEMPLATES = [
  { value: 'sns_post_v1', label: 'SNS Post' },
  { value: 'plandog_v1', label: 'PLANDOG' },
];

// Phase 1: active channels — only Twitter
const ACTIVE_CHANNELS = [
  { value: 'twitter', label: 'Twitter / X' },
];

export function ContentPage() {
  const [tab, setTab] = useState<'all' | 'queued' | 'posted' | 'failed'>('all');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any | null>(null);

  // Form state — default to first active channel
  const [formChannel, setFormChannel] = useState(ACTIVE_CHANNELS[0].value);
  const [formTemplate, setFormTemplate] = useState('sns_post_v1');
  const [formMediaUrl, setFormMediaUrl] = useState('');
  const [formContent, setFormContent] = useState('');

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      // Use the new /api/content endpoint with channel=twitter filter (Phase 1)
      const items = await api.content.list({ channel: 'twitter', limit: 100 }).catch(() => null);
      if (items && Array.isArray(items)) {
        setContent(items);
      } else {
        // Fallback: merge queued + recent
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
    } catch (err) {
      // Keep current state on error — no fallback to mock
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
      // Reset form
      setFormContent('');
      setFormMediaUrl('');
      setShowForm(false);
      // Refresh list
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Content</h1>
          <p className="text-sm text-surface-500 mt-0.5">콘텐츠 관리 및 게시</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish Queued
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'New Content'}
          </button>
        </div>
      </div>

      {/* New Content Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-surface-900">Create New Content</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Channel</label>
              <select
                value={formChannel}
                onChange={(e) => setFormChannel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {ACTIVE_CHANNELS.map((ch) => (
                  <option key={ch.value} value={ch.value}>{ch.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Template</label>
              <select
                value={formTemplate}
                onChange={(e) => setFormTemplate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {TEMPLATES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Media URL (optional)</label>
              <input
                type="url"
                value={formMediaUrl}
                onChange={(e) => setFormMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Content</label>
            <textarea
              rows={3}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Write your content here..."
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={submitting || !formContent.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add to Queue
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-surface-200 p-1">
          {(['all', 'queued', 'posted', 'failed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-primary-500 text-white'
                  : 'text-surface-500 hover:bg-surface-100'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)} ({counts[t]})
            </button>
          ))}
        </div>
      </div>

      {/* Content Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-surface-300 py-16 text-center">
          <Search className="w-8 h-8 text-surface-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-surface-500">
            {loading ? '불러오는 중...' : '아직 데이터가 없습니다'}
          </p>
          {!loading && (
            <p className="text-xs text-surface-400 mt-1">
              {tab !== 'all'
                ? `'${tab}' 상태의 콘텐츠가 없습니다`
                : 'New Content 버튼으로 첫 콘텐츠를 만들어보세요'}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div key={item.id} onClick={() => setSelectedContent(item)} className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-primary-200 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <ChannelBadge channel={item.channel} />
                <StatusBadge status={item.status} />
              </div>
              <p className="text-sm text-surface-700 line-clamp-2 mb-3">{item.content_text}</p>
              <div className="flex items-center justify-between text-xs text-surface-400">
                <span>{item.template_version ?? '—'}</span>
                <span>
                  {item.posted_at
                    ? `Posted ${new Date(item.posted_at).toLocaleString('ko-KR')}`
                    : item.created_at
                    ? `Created ${new Date(item.created_at).toLocaleString('ko-KR')}`
                    : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Detail Modal */}
      {selectedContent !== null && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedContent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-surface-200">
              <div className="flex items-center gap-2">
                <ChannelBadge channel={selectedContent.channel} />
                <StatusBadge status={selectedContent.status} />
              </div>
              <button
                onClick={() => setSelectedContent(null)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Full content text */}
              <p className="text-sm text-surface-800 whitespace-pre-wrap leading-relaxed">
                {selectedContent.content_text}
              </p>

              {/* Twitter link */}
              {selectedContent.external_id && (
                <a
                  href={`https://x.com/i/status/${selectedContent.external_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Twitter에서 보기
                </a>
              )}

              {/* Status details */}
              <div className="rounded-xl border border-surface-200 p-4 space-y-2 bg-surface-50">
                {selectedContent.status === 'posted' && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>
                      게시됨
                      {selectedContent.posted_at && (
                        <> · {new Date(selectedContent.posted_at).toLocaleString('ko-KR')}</>
                      )}
                    </span>
                  </div>
                )}
                {selectedContent.status === 'queued' && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>게시 대기 중</span>
                  </div>
                )}
                {selectedContent.status === 'failed' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-red-700">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span>게시 실패</span>
                    </div>
                    {selectedContent.error_message && (
                      <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="break-all">{selectedContent.error_message}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Created at */}
                {selectedContent.created_at && (
                  <div className="flex items-center gap-2 text-xs text-surface-400">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>생성됨 · {new Date(selectedContent.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-5 pb-5">
              <button
                onClick={() => setSelectedContent(null)}
                className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
