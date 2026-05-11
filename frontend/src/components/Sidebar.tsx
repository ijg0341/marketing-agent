import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings2,
  CalendarClock,
} from 'lucide-react';
import { clsx } from 'clsx';

const links = [
  { to: '/',                icon: LayoutDashboard, label: '대시보드' },
  { to: '/content',         icon: FileText,        label: '콘텐츠' },
  { to: '/analytics',       icon: BarChart3,       label: '분석' },
  { to: '/scheduled-tasks', icon: CalendarClock,   label: '자동화' },
  { to: '/settings',        icon: Settings2,       label: '설정' },
];

export function Sidebar() {
  return (
    <aside className="w-[232px] bg-surface-950 border-r border-surface-800 flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold text-[11.5px] tracking-tight">
            M
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-surface-50 tracking-tight leading-tight">
              Marketing Agent
            </h1>
            <p className="text-[13px] text-surface-300 mt-0.5">자율 진화 시스템</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5">
        <p className="px-2.5 mt-2 mb-2 text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200">
          Workspace
        </p>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-2.5 px-2.5 py-[7px] my-[1px] rounded-md text-[14px] font-medium transition-colors',
                isActive
                  ? 'bg-surface-800 text-surface-50'
                  : 'text-surface-200 hover:text-surface-100 hover:bg-surface-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx('w-[15px] h-[15px]', isActive ? 'text-surface-50' : 'text-surface-200 group-hover:text-surface-200')} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer status */}
      <div className="px-5 py-4 border-t border-surface-800">
        <div className="flex items-center gap-2 text-[11.5px] text-surface-200">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span>시스템 활성</span>
        </div>
      </div>
    </aside>
  );
}
