import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { OnboardingBanner } from './OnboardingBanner';

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <OnboardingBanner />
        <Outlet />
      </main>
    </div>
  );
}
