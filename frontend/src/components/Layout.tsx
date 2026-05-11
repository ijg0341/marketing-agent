import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="px-8 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
