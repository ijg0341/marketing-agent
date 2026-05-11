import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
}

// 박스 없음 — KPI는 페이지에 직접 살아있게.
export function KpiCard({ title, value, change, changeType = 'neutral' }: Props) {
  return (
    <div className="py-1">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-2">
        {title}
      </p>
      <p className="text-[22px] font-bold text-surface-50 tabular-nums leading-none tracking-tight">
        {value}
      </p>
      {change && (
        <div
          className={clsx(
            'flex items-center gap-1 mt-2 text-[14px] font-medium',
            changeType === 'up' && 'text-emerald-600',
            changeType === 'down' && 'text-red-600',
            changeType === 'neutral' && 'text-surface-200'
          )}
        >
          {changeType === 'up' && <TrendingUp className="w-3 h-3" />}
          {changeType === 'down' && <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
  );
}
