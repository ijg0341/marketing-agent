import { clsx } from 'clsx';

const CHANNEL_META: Record<string, { label: string; dot: string }> = {
  twitter:      { label: 'Twitter',     dot: 'bg-sky-400' },
  instagram:    { label: 'Instagram',   dot: 'bg-pink-400' },
  facebook:     { label: 'Facebook',    dot: 'bg-blue-500' },
  blog_naver:   { label: '네이버 블로그', dot: 'bg-emerald-400' },
  blog_tistory: { label: '티스토리',     dot: 'bg-orange-400' },
  email:        { label: 'Email',       dot: 'bg-amber-400' },
};

export function ChannelBadge({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel];
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-surface-50">
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', meta?.dot ?? 'bg-surface-500')} />
      {meta?.label ?? channel}
    </span>
  );
}
