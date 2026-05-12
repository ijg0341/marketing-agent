import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ContentPage } from './pages/ContentPage';
import { ContentDetailPage } from './pages/ContentDetailPage';
import { AssetsPage } from './pages/AssetsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { StrategyPage } from './pages/StrategyPage';
import { EvolutionPage } from './pages/EvolutionPage';
import { SettingsPage } from './pages/SettingsPage';
import { ScheduledTasksPage } from './pages/ScheduledTasksPage';
import { getApiKey, setApiKey, api } from './api';
import { KeyRound, Loader2, AlertCircle } from 'lucide-react';

function LoginGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function check() {
      try {
        // Try without key first — if server has no auth configured, skip login
        await api.onboarding.status();
        setAuthenticated(true);
      } catch (e: any) {
        if (e.message === 'AUTH_REQUIRED') {
          // Server requires auth — check if we have a stored key
          const key = getApiKey();
          if (key) {
            try {
              await api.onboarding.status();
              setAuthenticated(true);
            } catch {
              // Stored key is invalid
            }
          }
        }
      }
      setChecking(false);
    }
    check();
  }, []);

  const handleLogin = async () => {
    setError('');
    setApiKey(keyInput.trim());
    try {
      await api.onboarding.status();
      setAuthenticated(true);
    } catch {
      setError('API 키가 유효하지 않습니다. .env 파일의 API_SECRET_KEY를 확인하세요.');
      setApiKey('');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950 p-6">
        <div className="bg-surface-900 rounded-2xl border border-surface-800 p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-primary-500/10 rounded-xl">
              <KeyRound className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-[14px] font-semibold text-surface-50 tracking-tight">Marketing Agent</h1>
              <p className="text-[13px] text-surface-300 mt-0.5">API 키를 입력하세요</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[14px] font-semibold uppercase tracking-[0.12em] text-surface-200 mb-2">API Secret Key</label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder=".env 파일의 API_SECRET_KEY 값"
                className="w-full px-3 py-2.5 text-[14px] bg-surface-950 border border-surface-800 rounded-md text-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 font-mono placeholder:text-surface-500"
                autoFocus
              />
              <p className="text-[13px] text-surface-300 mt-2">
                서버의 <code className="px-1 py-0.5 bg-surface-800 rounded text-surface-200 font-mono">.env</code> 파일에서 확인할 수 있습니다.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[11.5px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={!keyInput.trim()}
              className="w-full py-2.5 text-[14px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <LoginGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/content" element={<ContentPage />} />
            <Route path="/content/:id" element={<ContentDetailPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/strategy" element={<StrategyPage />} />
            <Route path="/evolution" element={<EvolutionPage />} />
            <Route path="/scheduled-tasks" element={<ScheduledTasksPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LoginGate>
  );
}
