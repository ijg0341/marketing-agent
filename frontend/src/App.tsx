import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ContentPage } from './pages/ContentPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { StrategyPage } from './pages/StrategyPage';
import { EvolutionPage } from './pages/EvolutionPage';
import { SettingsPage } from './pages/SettingsPage';
import { ScheduledTasksPage } from './pages/ScheduledTasksPage';
import { AdsPage } from './pages/AdsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="/ads" element={<AdsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/strategy" element={<StrategyPage />} />
          <Route path="/evolution" element={<EvolutionPage />} />
          <Route path="/scheduled-tasks" element={<ScheduledTasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
