import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Heart,
  MessageCircle,
  Repeat2,
  BarChart3,
  Share,
  Bookmark,
  MoreHorizontal,
  Send,
  ThumbsUp,
} from 'lucide-react';

// ── Parsers ─────────────────────────────────────────────────────────────────

function parseBlog(text: string): { title: string; body: string } {
  const lines = text.split('\n');
  const title = (lines[0] ?? '').replace(/^#+\s*/, '').trim();
  const body = lines.slice(1).join('\n').trim();
  return { title, body };
}

function parseEmail(text: string): { subject: string; recipients: string; body: string } {
  const lines = text.split('\n');
  const subject = lines[0]?.trim() ?? '';
  const recipients = lines[1]?.trim() ?? '';
  const body = lines.slice(2).join('\n').trim();
  return { subject, recipients, body };
}

// ── Channel Previews ────────────────────────────────────────────────────────

function TwitterPreview({ text }: { text: string }) {
  return (
    <div className="bg-surface-800 rounded-2xl border border-surface-700 p-4 max-w-md w-full">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[15px] font-bold text-surface-50">PLANDOG</span>
            <span className="text-[14px] text-surface-400">@plandog</span>
            <span className="text-[14px] text-surface-400">·</span>
            <span className="text-[14px] text-surface-400">2시간</span>
          </div>
          <p className="text-[15px] text-surface-50 mt-1 whitespace-pre-wrap break-words leading-snug">
            {text || <span className="text-surface-400">(본문 없음)</span>}
          </p>
          <div className="mt-3 flex items-center justify-between text-surface-400 max-w-[300px]">
            <button className="hover:text-sky-400 transition-colors"><MessageCircle className="w-4 h-4" /></button>
            <button className="hover:text-emerald-400 transition-colors"><Repeat2 className="w-4 h-4" /></button>
            <button className="hover:text-pink-400 transition-colors"><Heart className="w-4 h-4" /></button>
            <button className="hover:text-sky-400 transition-colors"><BarChart3 className="w-4 h-4" /></button>
            <button className="hover:text-sky-400 transition-colors"><Share className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InstagramPreview({ text, mediaUrl }: { text: string; mediaUrl?: string | null }) {
  const firstLine = text.split('\n')[0] ?? '';
  return (
    <div className="bg-surface-800 rounded-lg border border-surface-700 max-w-sm w-full overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-surface-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-red-400 to-yellow-400 p-0.5">
            <div className="w-full h-full rounded-full bg-surface-800" />
          </div>
          <span className="text-sm font-semibold text-surface-50">plandog</span>
        </div>
        <MoreHorizontal className="w-4 h-4 text-surface-300" />
      </div>
      <div className="aspect-square bg-surface-900 flex items-center justify-center overflow-hidden">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div
          className="text-xs text-surface-400 items-center justify-center w-full h-full flex"
          style={{ display: mediaUrl ? 'none' : 'flex' }}
        >
          {mediaUrl ? '이미지 로드 실패' : '이미지 미설정'}
        </div>
      </div>
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-4 text-surface-50">
          <Heart className="w-[22px] h-[22px]" />
          <MessageCircle className="w-[22px] h-[22px]" />
          <Send className="w-[22px] h-[22px]" />
        </div>
        <Bookmark className="w-[22px] h-[22px] text-surface-50" />
      </div>
      <div className="px-3 pt-2 pb-3">
        <p className="text-[13px] font-semibold text-surface-50">좋아요 0개</p>
        <p className="text-sm text-surface-50 mt-1 break-words">
          <span className="font-semibold">plandog</span>{' '}
          <span>{firstLine || <span className="text-surface-400">(캡션 없음)</span>}</span>
        </p>
        {text.split('\n').length > 1 && (
          <p className="text-xs text-surface-300 mt-1">… 더 보기 (총 {text.length}자)</p>
        )}
      </div>
    </div>
  );
}

function FacebookPreview({ text, mediaUrl }: { text: string; mediaUrl?: string | null }) {
  return (
    <div className="bg-surface-800 rounded-lg border border-surface-700 max-w-md w-full overflow-hidden">
      <div className="flex items-start justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            P
          </div>
          <div>
            <div className="text-[14px] font-semibold text-surface-50">PLANDOG</div>
            <div className="text-[12px] text-surface-400">방금 전 · 🌐</div>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-surface-300" />
      </div>
      <p className="px-3 pb-3 text-[15px] text-surface-50 whitespace-pre-wrap break-words leading-snug">
        {text || <span className="text-surface-400">(본문 없음)</span>}
      </p>
      {mediaUrl && (
        <div className="aspect-video bg-surface-900">
          <img
            src={mediaUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      )}
      <div className="px-3 py-2 flex items-center justify-between text-[12px] text-surface-400 border-b border-surface-700">
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px]">👍</span>
          좋아요 0
        </span>
        <span>댓글 0 · 공유 0</span>
      </div>
      <div className="grid grid-cols-3">
        <button className="flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-surface-200 hover:bg-surface-700/50 transition-colors">
          <ThumbsUp className="w-4 h-4" /> 좋아요
        </button>
        <button className="flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-surface-200 hover:bg-surface-700/50 transition-colors">
          <MessageCircle className="w-4 h-4" /> 댓글
        </button>
        <button className="flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-surface-200 hover:bg-surface-700/50 transition-colors">
          <Share className="w-4 h-4" /> 공유
        </button>
      </div>
    </div>
  );
}

function BlogPreview({
  text,
  platform,
}: {
  text: string;
  platform: 'naver' | 'tistory';
}) {
  const { title, body } = parseBlog(text);
  const meta = platform === 'naver'
    ? { label: 'NAVER 블로그', accent: 'text-emerald-400', dot: 'bg-emerald-400', category: '기획·PM' }
    : { label: 'TISTORY',      accent: 'text-orange-400',  dot: 'bg-orange-400',  category: 'PM/기획' };
  const today = '2026. 05. 11.';
  return (
    <article className="bg-surface-800 rounded-lg border border-surface-700 p-6 max-w-2xl w-full">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-surface-700">
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className={`text-[11px] font-bold uppercase tracking-wider ${meta.accent}`}>{meta.label}</span>
      </div>
      <h1 className="text-[22px] font-bold text-surface-50 mb-2 break-words leading-tight">
        {title || <span className="text-surface-400 font-normal">(제목 없음)</span>}
      </h1>
      <div className="flex items-center gap-2 text-[12px] text-surface-400 mb-5">
        <span className="font-medium text-surface-200">플랜도그</span>
        <span>·</span>
        <span>{meta.category}</span>
        <span>·</span>
        <span>{today}</span>
      </div>
      <div className="report-markdown text-[14.5px] leading-relaxed text-surface-100">
        {body ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        ) : (
          <span className="text-surface-400">(본문 없음)</span>
        )}
      </div>
      <div className="mt-6 pt-4 border-t border-surface-700 flex items-center gap-5 text-[12px] text-surface-400">
        <span className="inline-flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5" /> 공감 0
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" /> 댓글 0
        </span>
      </div>
    </article>
  );
}

function EmailPreview({ text }: { text: string }) {
  const { subject, recipients, body } = parseEmail(text);
  return (
    <div className="bg-surface-800 rounded-lg border border-surface-700 max-w-md w-full overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-700">
        <h2 className="text-[16px] font-semibold text-surface-50 break-words leading-snug">
          {subject || <span className="text-surface-400 font-normal">(제목 없음)</span>}
        </h2>
      </div>
      <div className="px-4 py-3 border-b border-surface-700 space-y-1.5 text-[12px]">
        <div className="flex gap-2">
          <span className="text-surface-400 w-11 shrink-0">보낸이</span>
          <span className="text-surface-100">PLANDOG &lt;hello@plandog.io&gt;</span>
        </div>
        <div className="flex gap-2">
          <span className="text-surface-400 w-11 shrink-0">받는이</span>
          <span className="text-surface-100 break-all">
            {recipients || <span className="text-surface-400">(없음)</span>}
          </span>
        </div>
      </div>
      {body ? (
        <div
          className="p-4 text-sm text-surface-100 break-words leading-relaxed"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      ) : (
        <p className="p-4 text-sm text-surface-400">(본문 없음)</p>
      )}
    </div>
  );
}

// ── Public component ────────────────────────────────────────────────────────

export function ContentPreview({
  channel,
  text,
  mediaUrl,
}: {
  channel: string;
  text: string;
  mediaUrl?: string | null;
}) {
  switch (channel) {
    case 'twitter':
      return <TwitterPreview text={text} />;
    case 'instagram':
      return <InstagramPreview text={text} mediaUrl={mediaUrl} />;
    case 'facebook':
      return <FacebookPreview text={text} mediaUrl={mediaUrl} />;
    case 'blog_naver':
      return <BlogPreview text={text} platform="naver" />;
    case 'blog_tistory':
      return <BlogPreview text={text} platform="tistory" />;
    case 'email':
      return <EmailPreview text={text} />;
    default:
      return (
        <div className="text-sm text-surface-300 p-4 rounded-lg border border-surface-700 bg-surface-800">
          알 수 없는 채널: <code>{channel}</code>
        </div>
      );
  }
}
