import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Loader2, AlertCircle, ExternalLink, Monitor, Smartphone, Copy, Check, CheckCheck } from 'lucide-react';
import { marked } from 'marked';
import { ChannelBadge } from '../components/ChannelBadge';
import { StatusBadge } from '../components/StatusBadge';
import { ContentPreview } from '../components/ContentPreview';
import { api } from '../api';

const MANUAL_BLOG_CHANNELS = new Set(['blog_naver', 'blog_tistory']);

function buildBlogHtml(rawText: string): string {
  const lines = rawText.split('\n');
  const title = (lines[0] ?? '').replace(/^#+\s*/, '').trim();
  const body = lines.slice(1).join('\n').trim();
  const bodyHtml = body ? marked.parse(body, { async: false }) as string : '';
  const titleHtml = title ? `<h1>${escapeHtml(title)}</h1>\n` : '';
  return titleHtml + bodyHtml;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch] as string));
}

export function ContentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api.content.get(parseInt(id, 10))
      .then((data) => {
        if (cancelled) return;
        setContent(data);
        setText(data.content_text ?? '');
        setMediaUrl(data.media_url ?? '');
        setError(null);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(`콘텐츠를 불러올 수 없습니다: ${e.message ?? e}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const isQueued = content?.status === 'queued';
  const isManualBlog = !!content && MANUAL_BLOG_CHANNELS.has(content.channel);
  const dirty = !!content && (
    text !== (content.content_text ?? '') ||
    (mediaUrl || '') !== (content.media_url ?? '')
  );

  const handleSave = async () => {
    if (!content || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      await api.content.update(content.id, {
        content_text: text,
        media_url: mediaUrl || undefined,
      });
      setContent({ ...content, content_text: text, media_url: mediaUrl || null });
    } catch (e: any) {
      setError(e.message ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!content) return;
    if (!window.confirm('이 콘텐츠를 삭제하시겠습니까?')) return;
    setDeleting(true);
    setError(null);
    try {
      await api.content.delete(content.id);
      navigate('/content');
    } catch (e: any) {
      setError(e.message ?? '삭제 실패');
      setDeleting(false);
    }
  };

  const handleCopyHtml = async () => {
    try {
      const html = buildBlogHtml(text);
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) {
      setError(`HTML 복사 실패: ${e.message ?? e}`);
    }
  };

  const handleMarkPosted = async () => {
    if (!content) return;
    if (!window.confirm('이 콘텐츠를 직접 게시한 것으로 처리하시겠습니까?')) return;
    setMarking(true);
    setError(null);
    try {
      const updated = await api.content.markPosted(content.id);
      setContent({ ...content, status: updated.status, posted_at: updated.posted_at });
    } catch (e: any) {
      setError(e.message ?? '발행 완료 처리 실패');
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/content')}
          className="flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="w-4 h-4" />
          콘텐츠 목록
        </button>
        <div className="p-6 rounded-lg bg-red-50 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/content')}
          className="flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="w-4 h-4" />
          콘텐츠 목록
        </button>
        <div className="flex items-center gap-2">
          <ChannelBadge channel={content.channel} />
          <StatusBadge status={content.status} />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 편집 영역 */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">본문</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!isQueued}
              className="w-full min-h-[280px] px-3 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono leading-relaxed disabled:bg-surface-50 disabled:text-surface-500"
            />
          </div>

          {(['instagram', 'facebook'].includes(content.channel)) && (
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">
                미디어 URL {content.channel === 'instagram' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                disabled={!isQueued}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-surface-50 disabled:text-surface-500"
              />
            </div>
          )}

          {!isQueued && (
            <div className="flex items-start gap-2 text-xs text-surface-500 bg-surface-50 rounded-lg p-3">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>큐 상태 콘텐츠만 편집 / 삭제할 수 있습니다.</span>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isQueued && (
              <>
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  저장
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  삭제
                </button>
              </>
            )}
            {isManualBlog && isQueued && (
              <>
                <button
                  onClick={handleCopyHtml}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '복사됨' : 'HTML 복사'}
                </button>
                <button
                  onClick={handleMarkPosted}
                  disabled={marking}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                  발행 완료 처리
                </button>
              </>
            )}
            {content.external_id && content.channel === 'twitter' && (
              <a
                href={`https://x.com/i/status/${content.external_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Twitter에서 보기
              </a>
            )}
          </div>

          {isManualBlog && isQueued && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 space-y-1.5">
              <p className="font-semibold">📋 수동 발행 안내</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>위에서 본문/제목을 검토하고 필요하면 수정 → 저장</li>
                <li><strong>HTML 복사</strong> 버튼으로 변환된 HTML을 클립보드로 복사</li>
                <li>{content.channel === 'blog_naver' ? '네이버 블로그' : '티스토리'} 글쓰기 화면에서 HTML 모드로 전환 후 붙여넣기</li>
                <li>발행 후 <strong>발행 완료 처리</strong> 버튼으로 상태를 게시됨으로 변경</li>
              </ol>
            </div>
          )}

          {/* 메타 정보 */}
          <div className="rounded-lg border border-surface-200 p-4 space-y-1.5 text-xs text-surface-500 bg-surface-50">
            <div>생성: {new Date(content.created_at).toLocaleString('ko-KR')}</div>
            {content.posted_at && <div>게시: {new Date(content.posted_at).toLocaleString('ko-KR')}</div>}
            {content.external_id && <div>외부 ID: {content.external_id}</div>}
            {content.error_message && (
              <div className="text-red-600 break-all">에러: {content.error_message}</div>
            )}
          </div>
        </div>

        {/* 미리보기: PC + 모바일 */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-3.5 h-3.5 text-surface-500" />
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">PC 미리보기</p>
            </div>
            <div className="rounded-lg border border-surface-200 p-5 bg-surface-50 overflow-x-auto">
              <ContentPreview channel={content.channel} text={text} mediaUrl={mediaUrl} />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-3.5 h-3.5 text-surface-500" />
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">모바일 미리보기 (375px)</p>
            </div>
            <div className="rounded-lg border border-surface-200 p-5 bg-surface-50 flex justify-center">
              <div className="w-[375px] max-w-full rounded-2xl border border-surface-300 bg-white p-3 shadow-sm">
                <ContentPreview channel={content.channel} text={text} mediaUrl={mediaUrl} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
