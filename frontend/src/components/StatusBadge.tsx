import { clsx } from 'clsx';

const STATUS_META: Record<string, { label: string; dot: string }> = {
  queued: { label: '대기 중', dot: 'bg-amber-400' },
  posted: { label: '발행됨',  dot: 'bg-emerald-400' },
  failed: { label: '실패',    dot: 'bg-red-400' },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-surface-100">
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', meta?.dot ?? 'bg-surface-500')} />
      {meta?.label ?? status}
    </span>
  );
}
