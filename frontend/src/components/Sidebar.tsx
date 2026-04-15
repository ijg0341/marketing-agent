import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Megaphone,
  Settings2,
  Zap,
  CalendarClock,
} from 'lucide-react';
import { clsx } from 'clsx';

const links = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/content', icon: FileText, label: '콘텐츠' },
  { to: '/analytics', icon: BarChart3, label: '분석' },
  { to: '/ads', icon: Megaphone, label: '광고' },
  { to: '/scheduled-tasks', icon: CalendarClock, label: '자동화' },
  { to: '/settings', icon: Settings2, label: '설정' },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-surface-900 text-white flex flex-col shrink-0">
      <div className="p-5 border-b border-surface-700">
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-400" />
          Marketing Agent
        </h1>
        <p className="text-xs text-surface-400 mt-1">자율 진화 마케팅 시스템</p>
      </div>
      <nav className="flex-1 py-3">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-5 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-surface-800 text-white border-r-2 border-primary-400'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800/50'
              )
            }
          >
            <Icon className="w-4.5 h-4.5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-surface-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-surface-400">시스템 활성</span>
        </div>
      </div>
    </aside>
  );
}
