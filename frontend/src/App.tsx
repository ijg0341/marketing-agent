import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ContentPage } from './pages/ContentPage';
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
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="bg-white rounded-2xl shadow-lg border border-surface-200 p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-primary-50 rounded-xl">
              <KeyRound className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900">Marketing Agent</h1>
              <p className="text-sm text-surface-500">API 키를 입력하세요</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">API Secret Key</label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder=".env 파일의 API_SECRET_KEY 값"
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                autoFocus
              />
              <p className="text-xs text-surface-400 mt-1.5">
                서버의 <code className="px-1 py-0.5 bg-surface-100 rounded">.env</code> 파일에서 확인할 수 있습니다.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={!keyInput.trim()}
              className="w-full py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
