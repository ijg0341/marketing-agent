import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  CheckCheck,
} from 'lucide-react';
import { marked } from 'marked';
import { ContentPreview } from '../components/ContentPreview';
import { api } from '../api';

const MANUAL_BLOG_CHANNELS = new Set(['blog_naver', 'blog_tistory']);

const CHANNEL_META: Record<string, { label: string; dot: string }> = {
  twitter:      { label: 'Twitter',       dot: 'bg-sky-500' },
  instagram:    { label: 'Instagram',     dot: 'bg-pink-500' },
  facebook:     { label: 'Facebook',      dot: 'bg-blue-600' },
  blog_naver:   { label: '네이버 블로그',   dot: 'bg-emerald-500' },
  blog_tistory: { label: '티스토리',       dot: 'bg-orange-500' },
  email:        { label: 'Email',         dot: 'bg-amber-500' },
};

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  queued: { label: '대기 중', dot: 'bg-amber-500',   text: 'text-amber-700' },
  posted: { label: '발행됨',  dot: 'bg-emerald-500', text: 'text-emerald-700' },
  failed: { label: '실패',    dot: 'bg-red-500',     text: 'text-red-700' },
};

function buildBlogHtml(rawText: string): string {
  const lines = rawText.split('\n');
  const title = (lines[0] ?? '').replace(/^#+\s*/, '').trim();
  const body = lines.slice(1).join('\n').trim();
  const bodyHtml = body ? (marked.parse(body, { async: false }) as string) : '';
  const titleHtml = title ? `<h1>${escapeHtml(title)}</h1>\n` : '';
  return titleHtml + bodyHtml;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch] as string));
}

function extractHeadline(text: string): string {
  const first = text.split('\n').find((l) => l.trim()) ?? '';
  return first.replace(/^#+\s*/, '').trim();
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
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
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

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
  const showMediaField = !!content && ['instagram', 'facebook'].includes(content.channel);
  const dirty = !!content && (
    text !== (content.content_text ?? '') ||
    (mediaUrl || '') !== (content.media_url ?? '')
  );
  const headline = useMemo(() => extractHeadline(text), [text]);

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
          className="flex items-center gap-2 text-sm text-surface-600 hover:text-surface-50"
        >
          <ArrowLeft className="w-4 h-4" />
          콘텐츠 목록
        </button>
        <div className="text-sm text-red-700">
          <AlertCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          {error}
        </div>
      </div>
    );
  }

  if (!content) return null;

  const channelMeta = CHANNEL_META[content.channel] ?? { label: content.channel, dot: 'bg-surface-9000' };
  const statusMeta = STATUS_META[content.status] ?? { label: content.status, dot: 'bg-surface-400', text: 'text-surface-200' };

  return (
    // Layout의 p-6 캔슬 + 흰 캔버스로 한 페이지 흐름
    <div className="-mx-8 -my-7 bg-surface-950 min-h-screen">
      <div className="px-10 pt-10 pb-16">

        {/* ── Back link (subtle) ─────────────────────────────────────── */}
        <button
          onClick={() => navigate('/content')}
          className="group inline-flex items-center gap-1.5 text-[14px] text-surface-200 hover:text-surface-50 transition-colors mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          콘텐츠
        </button>

        {/* ── Page header: meta line + title + actions ──────────────── */}
        <div className="flex items-end justify-between gap-8 mb-3">
          {/* Meta row */}
          <div className="flex items-center gap-2.5 text-[14px] text-surface-200">
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${channelMeta.dot}`} />
              <span className="font-medium text-surface-200">{channelMeta.label}</span>
            </span>
            <span className="text-surface-600">·</span>
            <span className={`inline-flex items-center gap-1.5 ${statusMeta.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
              <span className="font-medium">{statusMeta.label}</span>
            </span>
            <span className="text-surface-600">·</span>
            <span className="font-mono text-surface-200">#{content.id}</span>
            {dirty && (
              <>
                <span className="text-surface-600">·</span>
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-medium">저장되지 않음</span>
                </span>
              </>
            )}
          </div>

          {/* Actions (ghost-first, only Save is filled) */}
          <div className="flex items-center gap-1">
            {content.external_id && content.channel === 'twitter' && (
              <a
                href={`https://x.com/i/status/${content.external_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[14px] font-medium text-surface-600 hover:text-surface-50 hover:bg-surface-800 rounded-md transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Twitter
              </a>
            )}
            {isManualBlog && isQueued && (
              <>
                <button
                  onClick={handleCopyHtml}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[14px] font-medium text-surface-600 hover:text-surface-50 hover:bg-surface-800 rounded-md transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '복사됨' : 'HTML 복사'}
                </button>
                <button
                  onClick={handleMarkPosted}
                  disabled={marking}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[14px] font-medium text-surface-600 hover:text-surface-50 hover:bg-surface-800 rounded-md disabled:opacity-50 transition-colors"
                >
                  {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                  발행 완료
                </button>
              </>
            )}
            {isQueued && (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[14px] font-medium text-surface-600 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  삭제
                </button>
                <div className="w-px h-5 bg-surface-700 mx-1" />
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:bg-surface-700 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  저장
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Title ──────────────────────────────────────────────────── */}
        <h1 className="text-[28px] font-bold text-surface-50 tracking-tight leading-[1.2] mb-2 max-w-4xl">
          {headline || <span className="text-surface-600 italic font-normal">제목 없음</span>}
        </h1>
        <p className="text-[14px] text-surface-200">
          {formatRelative(content.created_at)} 생성
          {content.posted_at && <> · {formatRelative(content.posted_at)} 발행</>}
          {content.template_version && <> · <span className="text-surface-200">{content.template_version}</span></>}
        </p>

        {/* Error banner */}
        {error && (
          <div className="mt-8 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Read-only notice */}
        {!isQueued && (
          <p className="mt-8 text-[14px] text-surface-200">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusMeta.dot} mr-1.5 align-middle`} />
            <strong className="text-surface-200 font-medium">{statusMeta.label}</strong>{' '}
            상태 — 큐 상태 콘텐츠만 편집·삭제할 수 있습니다.
          </p>
        )}

        {/* ── Workspace: editor (left) | preview (right) ───────────── */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-x-14 gap-y-10">

          {/* Editor 영역 — 박스 없음, underline 스타일 */}
          <section>
            <Label>본문</Label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!isQueued}
              spellCheck={false}
              placeholder={isManualBlog ? '첫 줄은 제목, 두 번째 줄부터 본문...' : '본문을 입력하세요'}
              className="w-full min-h-[480px] text-[14px] bg-transparent border-0 focus:outline-none resize-y font-mono leading-[1.85] text-surface-50 placeholder:text-surface-500 disabled:text-surface-200"
            />
            <div className="flex items-center justify-between pt-3 border-t border-surface-800">
              <span className="text-[14px] text-surface-200 tabular-nums">
                {text.length.toLocaleString()} characters
              </span>
              {isManualBlog && (
                <span className="text-[14px] text-surface-200">Markdown 지원</span>
              )}
            </div>

            {showMediaField && (
              <div className="mt-10">
                <Label>
                  미디어 URL
                  {content.channel === 'instagram' && <span className="ml-1.5 text-red-500 normal-case tracking-normal text-[14px] font-medium">필수</span>}
                </Label>
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  disabled={!isQueued}
                  placeholder="https://example.com/image.jpg"
                  className="w-full text-[14px] bg-transparent border-0 border-b border-surface-800 pb-2 focus:border-surface-900 focus:outline-none transition-colors placeholder:text-surface-500 disabled:text-surface-200 font-mono"
                />
              </div>
            )}

            {isManualBlog && isQueued && (
              <div className="mt-12">
                <Label>수동 발행</Label>
                <ol className="text-[11.5px] text-surface-600 space-y-2 list-decimal pl-5 marker:text-surface-200 marker:font-medium leading-relaxed">
                  <li>본문/제목 검토 후 <span className="text-surface-50 font-medium">저장</span></li>
                  <li><span className="text-surface-50 font-medium">HTML 복사</span>로 클립보드에 복사</li>
                  <li>
                    {content.channel === 'blog_naver' ? '네이버 블로그' : '티스토리'} 글쓰기에서{' '}
                    <span className="text-surface-50 font-medium">HTML 모드</span> 전환 후 붙여넣기
                  </li>
                  <li>발행 후 <span className="text-surface-50 font-medium">발행 완료</span> 클릭</li>
                </ol>
              </div>
            )}
          </section>

          {/* Preview 영역 — 살짝 다른 배경으로 영역만 분리 (박스 X) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <Label className="!mb-0">미리보기</Label>
              <div className="flex items-center gap-4 text-[14px]">
                {(['desktop', 'mobile'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPreviewMode(m)}
                    className={`relative pb-1 font-medium transition-colors ${
                      previewMode === m
                        ? 'text-surface-50'
                        : 'text-surface-200 hover:text-surface-600'
                    }`}
                  >
                    {m === 'desktop' ? 'PC' : '모바일'}
                    {previewMode === m && (
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-surface-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-900 rounded-2xl p-8 min-h-[480px]">
              {previewMode === 'mobile' ? (
                <div className="flex justify-center pt-2">
                  <div className="w-[375px] max-w-full rounded-[36px] border-[8px] border-surface-900 bg-surface-900 p-3 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)]">
                    <div className="h-1 w-12 mx-auto mb-2 bg-surface-700 rounded-full" />
                    <ContentPreview channel={content.channel} text={text} mediaUrl={mediaUrl} />
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <ContentPreview channel={content.channel} text={text} mediaUrl={mediaUrl} />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Footer meta — 한 줄, 박스 없음 ───────────────────────── */}
        <div className="mt-16 pt-6 border-t border-surface-800">
          <dl className="flex flex-wrap gap-x-10 gap-y-2.5 text-[14px]">
            <MetaItem label="생성" value={new Date(content.created_at).toLocaleString('ko-KR')} />
            {content.posted_at && (
              <MetaItem label="게시" value={new Date(content.posted_at).toLocaleString('ko-KR')} />
            )}
            {content.template_version && (
              <MetaItem label="템플릿" value={content.template_version} />
            )}
            {content.external_id && (
              <MetaItem label="외부 ID" value={content.external_id} mono />
            )}
          </dl>
        </div>

        {content.error_message && (
          <div className="mt-8">
            <Label className="!text-red-600">발행 에러</Label>
            <p className="text-[14px] text-red-700 break-all leading-relaxed font-mono">
              {content.error_message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-4 ${className}`}>
      {children}
    </div>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-surface-200">{label}</dt>
      <dd className={`text-surface-200 ${mono ? 'font-mono text-[14px]' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
