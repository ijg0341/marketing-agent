import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Send, Search, Loader2 } from 'lucide-react';
import { ChannelBadge } from '../components/ChannelBadge';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../api';

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
                <option value="sns_post_v1">SNS Post v1</option>
                <option value="blog_post_v1">Blog Post v1</option>
                <option value="email_campaign_v1">Email Campaign v1</option>
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
            <div key={item.id} className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm hover:shadow-md transition-shadow">
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
    </div>
  );
}
