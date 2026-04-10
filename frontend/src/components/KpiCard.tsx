import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface Props {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: ReactNode;
}

export function KpiCard({ title, value, change, changeType = 'neutral', icon }: Props) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-500 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 text-surface-900">{value}</p>
          {change && (
            <p
              className={clsx(
                'text-xs font-medium mt-1',
                changeType === 'up' && 'text-emerald-600',
                changeType === 'down' && 'text-red-500',
                changeType === 'neutral' && 'text-surface-400'
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="p-2.5 bg-primary-50 rounded-lg text-primary-600">
          {icon}
        </div>
      </div>
    </div>
  );
}
