import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings2,
  Zap,
  Activity,
  CalendarClock,
  Megaphone,
} from 'lucide-react';
import { clsx } from 'clsx';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/ads', icon: Megaphone, label: 'Advertising' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/content', icon: FileText, label: 'Content' },
  { to: '/strategy', icon: Zap, label: 'Strategy' },
  { to: '/evolution', icon: Activity, label: 'Evolution' },
  { to: '/scheduled-tasks', icon: CalendarClock, label: 'Scheduled Tasks' },
  { to: '/settings', icon: Settings2, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-surface-900 text-white flex flex-col shrink-0">
      <div className="p-5 border-b border-surface-700">
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-400" />
          Marketing Agent
        </h1>
        <p className="text-xs text-surface-400 mt-1">Self-Evolving System</p>
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
          <span className="text-xs text-surface-400">System Active</span>
        </div>
      </div>
    </aside>
  );
}
