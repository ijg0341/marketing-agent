import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

// ── Validation ───────────────────────────────────────────────────────────────

type Level = 'ok' | 'warning' | 'error';

interface ValidationResult {
  level: Level;
  message: string;
}

function validateTwitter(text: string): ValidationResult {
  const len = text.length;
  if (len === 0) return { level: 'error', message: '본문 비어있음' };
  if (len > 280) return { level: 'error', message: `${len}자 — 280자 초과 (게시 실패)` };
  if (len > 250) return { level: 'warning', message: `${len}/280자 — 한도 근접` };
  return { level: 'ok', message: `${len}/280자` };
}

function validateInstagram(text: string, mediaUrl?: string | null): ValidationResult {
  if (!mediaUrl) return { level: 'error', message: '이미지 URL 필수 (Instagram은 이미지 없이 게시 불가)' };
  if (text.length > 2200) return { level: 'error', message: `${text.length}자 — 2,200자 초과` };
  if (text.length === 0) return { level: 'warning', message: '캡션이 비어있습니다' };
  return { level: 'ok', message: `${text.length}/2,200자 · 미디어 OK` };
}

function validateFacebook(text: string): ValidationResult {
  const len = text.length;
  if (len === 0) return { level: 'error', message: '본문 비어있음' };
  if (len < 40) return { level: 'warning', message: `${len}자 — 짧음 (80~200자 권장)` };
  if (len > 500) return { level: 'warning', message: `${len}자 — 긺 (engagement 떨어질 수 있음)` };
  return { level: 'ok', message: `${len}자` };
}

function validateBlog(text: string): { result: ValidationResult; title: string; body: string } {
  const lines = text.split('\n');
  const title = (lines[0] ?? '').replace(/^#+\s*/, '').trim();
  const body = lines.slice(1).join('\n').trim();
  if (!title) return { result: { level: 'error', message: '첫 줄에 제목이 필요합니다' }, title, body };
  if (!body) return { result: { level: 'error', message: '본문이 비어있습니다' }, title, body };
  if (body.length < 200) return { result: { level: 'warning', message: `본문 ${body.length}자 — SEO에는 800자+ 권장` }, title, body };
  return { result: { level: 'ok', message: `제목 + 본문 ${body.length}자` }, title, body };
}

function validateEmail(text: string): {
  result: ValidationResult;
  subject: string;
  recipients: string;
  body: string;
} {
  const lines = text.split('\n');
  if (lines.length < 3) {
    return {
      result: { level: 'error', message: '포맷: 줄1=제목, 줄2=수신자(쉼표 구분), 줄3+=HTML 본문' },
      subject: lines[0]?.trim() ?? '',
      recipients: lines[1]?.trim() ?? '',
      body: '',
    };
  }
  const subject = lines[0].trim();
  const recipients = lines[1].trim();
  const body = lines.slice(2).join('\n').trim();
  if (!subject) return { result: { level: 'error', message: '제목 비어있음' }, subject, recipients, body };
  if (!recipients || !recipients.includes('@')) {
    return { result: { level: 'error', message: '수신자 이메일 누락 (쉼표 구분)' }, subject, recipients, body };
  }
  if (!body) return { result: { level: 'error', message: '본문 비어있음' }, subject, recipients, body };
  const count = recipients.split(',').filter((e) => e.trim()).length;
  return { result: { level: 'ok', message: `${count}명에게 발송 준비 완료` }, subject, recipients, body };
}

// ── Validation Badge ────────────────────────────────────────────────────────

function ValidationBadge({ result }: { result: ValidationResult }) {
  const styles: Record<Level, string> = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  };
  const Icon = result.level === 'ok' ? CheckCircle2 : result.level === 'warning' ? AlertTriangle : AlertCircle;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${styles[result.level]}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{result.message}</span>
    </div>
  );
}

// ── Channel Previews ────────────────────────────────────────────────────────

function TwitterPreview({ text }: { text: string }) {
  const v = validateTwitter(text);
  return (
    <div className="space-y-2">
      <ValidationBadge result={v} />
      <div className="bg-white rounded-2xl border border-surface-200 p-4 max-w-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-surface-900">PLANDOG</span>
              <span className="text-sm text-surface-400">@plandog</span>
            </div>
            <p className="text-sm text-surface-900 mt-0.5 whitespace-pre-wrap break-words">
              {text || <span className="text-surface-400">(본문 없음)</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InstagramPreview({ text, mediaUrl }: { text: string; mediaUrl?: string | null }) {
  const v = validateInstagram(text, mediaUrl);
  const firstLine = text.split('\n')[0] ?? '';
  return (
    <div className="space-y-2">
      <ValidationBadge result={v} />
      <div className="bg-white rounded-lg border border-surface-200 max-w-sm overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-surface-100">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 via-red-400 to-yellow-400" />
          <span className="text-sm font-semibold text-surface-900">plandog</span>
        </div>
        <div className="aspect-square bg-surface-100 flex items-center justify-center overflow-hidden">
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
        <div className="p-3">
          <p className="text-sm text-surface-900">
            <span className="font-semibold">plandog</span>{' '}
            <span>{firstLine || <span className="text-surface-400">(캡션 없음)</span>}</span>
          </p>
          {text.split('\n').length > 1 && (
            <p className="text-xs text-surface-400 mt-1">… 캡션 더 보기 (총 {text.length}자)</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FacebookPreview({ text, mediaUrl }: { text: string; mediaUrl?: string | null }) {
  const v = validateFacebook(text);
  return (
    <div className="space-y-2">
      <ValidationBadge result={v} />
      <div className="bg-white rounded-lg border border-surface-200 max-w-md overflow-hidden">
        <div className="flex items-center gap-2 p-3">
          <div className="w-9 h-9 rounded-full bg-blue-600" />
          <div>
            <div className="text-sm font-semibold text-surface-900">PLANDOG</div>
            <div className="text-xs text-surface-400">방금 전 · 🌐</div>
          </div>
        </div>
        <p className="px-3 pb-3 text-sm text-surface-900 whitespace-pre-wrap break-words">
          {text || <span className="text-surface-400">(본문 없음)</span>}
        </p>
        {mediaUrl && (
          <div className="aspect-video bg-surface-100">
            <img
              src={mediaUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}
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
  const { result, title, body } = validateBlog(text);
  const meta = platform === 'naver'
    ? { label: 'NAVER 블로그', accent: 'text-emerald-600', dot: 'bg-emerald-500' }
    : { label: 'TISTORY', accent: 'text-orange-600', dot: 'bg-orange-500' };
  return (
    <div className="space-y-2">
      <ValidationBadge result={result} />
      <article className="bg-white rounded-lg border border-surface-200 p-5 max-w-2xl">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-surface-100">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${meta.accent}`}>{meta.label}</span>
        </div>
        <h1 className="text-xl font-bold text-surface-900 mb-3 break-words">{title || <span className="text-surface-400">(제목 없음)</span>}</h1>
        <div className="report-markdown text-sm leading-relaxed text-surface-700">
          {body ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          ) : (
            <span className="text-surface-400">(본문 없음)</span>
          )}
        </div>
      </article>
    </div>
  );
}

function EmailPreview({ text }: { text: string }) {
  const { result, subject, recipients, body } = validateEmail(text);
  return (
    <div className="space-y-2">
      <ValidationBadge result={result} />
      <div className="bg-white rounded-lg border border-surface-200 max-w-md overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100 space-y-1.5 bg-surface-50">
          <div className="text-xs">
            <span className="text-surface-500">제목: </span>
            <span className="text-surface-900 font-medium break-all">{subject || <span className="text-surface-400">(없음)</span>}</span>
          </div>
          <div className="text-xs">
            <span className="text-surface-500">수신자: </span>
            <span className="text-surface-900 break-all">{recipients || <span className="text-surface-400">(없음)</span>}</span>
          </div>
        </div>
        {body ? (
          <div
            className="p-4 text-sm text-surface-700 break-words"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <p className="p-4 text-sm text-surface-400">(본문 없음)</p>
        )}
      </div>
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
        <div className="text-sm text-surface-500 p-4 rounded-lg border border-surface-200 bg-surface-50">
          알 수 없는 채널: <code>{channel}</code>
        </div>
      );
  }
}
