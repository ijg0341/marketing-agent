import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  route: string;
  tab?: string;
  optional?: boolean;
}

function isStepActiveOnPage(step: Step, pathname: string): boolean {
  if (step.route === '/settings' && pathname === '/settings') return true;
  if (step.route === '/content' && pathname === '/content') return true;
  if (step.route === '/ads' && pathname === '/ads') return true;
  return false;
}

export function OnboardingBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [requiredDone, setRequiredDone] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    api.onboarding.status()
      .then((res) => {
        setSteps(res.steps ?? []);
        setAllDone(res.setup_complete ?? false);
        setRequiredDone(res.all_required_complete ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [location.pathname]);

  if (loading || dismissed || allDone) return null;

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const nextStep =
    steps.find((s) => !s.completed && !s.optional) ||
    steps.find((s) => !s.completed);
  const activeStepOnPage = steps.find(
    (s) => !s.completed && isStepActiveOnPage(s, location.pathname),
  );

  const handleStepClick = (step: Step) => {
    if (isStepActiveOnPage(step, location.pathname)) return;
    const url = step.tab ? `${step.route}?tab=${step.tab}` : step.route;
    navigate(url);
  };

  return (
    <div className="mb-7 border-y border-surface-800">
      <div
        className="px-1 py-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-900/60 transition-colors -mx-1 px-1 rounded"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-md bg-primary-500 text-white flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-surface-50">시작하기</h2>
              <span className="text-[14px] text-surface-200 tabular-nums">
                {completedCount}/{steps.length} 완료
              </span>
            </div>
            {!collapsed && (
              <p className="text-[14px] text-surface-200 mt-0.5 truncate">
                {activeStepOnPage ? (
                  <>현재 단계: <span className="text-surface-50 font-medium">{activeStepOnPage.title}</span></>
                ) : requiredDone ? (
                  '필수 설정 완료 — 선택 항목도 설정해보세요'
                ) : nextStep ? (
                  <>다음 단계: <span className="text-surface-50 font-medium">{nextStep.title}</span></>
                ) : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {collapsed ? <ChevronDown className="w-4 h-4 text-surface-200" /> : <ChevronUp className="w-4 h-4 text-surface-200" />}
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="p-1 hover:bg-surface-800 rounded transition-colors text-surface-300 hover:text-surface-100"
            title="숨기기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-px bg-surface-800 relative">
        <div className="absolute inset-y-0 left-0 bg-primary-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {!collapsed && (
        <div className="py-4 flex flex-wrap gap-1.5">
          {steps.map((step, idx) => {
            const isActive = activeStepOnPage?.id === step.id;
            const isNext = nextStep?.id === step.id && !isActive;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step)}
                className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[14px] font-medium transition-colors ${
                  step.completed
                    ? 'text-emerald-400 hover:bg-emerald-500/10'
                    : isActive
                    ? 'bg-primary-500 text-white'
                    : isNext
                    ? 'bg-surface-800 text-surface-50 hover:bg-surface-700'
                    : 'text-surface-200 hover:bg-surface-900 hover:text-surface-200'
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[11.5px] font-bold ${
                    isActive ? 'bg-white text-primary-600' : isNext ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-200'
                  }`}>
                    {idx + 1}
                  </span>
                )}
                <span>{step.title}</span>
                {step.optional && <span className="text-[11.5px] text-surface-200 ml-0.5">선택</span>}
                {!step.completed && !isActive && <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
