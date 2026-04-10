import { clsx } from 'clsx';

const statusStyles: Record<string, string> = {
  queued: 'bg-amber-100 text-amber-700',
  posted: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        statusStyles[status] || 'bg-gray-100 text-gray-700'
      )}
    >
      {status}
    </span>
  );
}
