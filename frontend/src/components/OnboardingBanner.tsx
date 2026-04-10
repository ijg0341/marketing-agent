import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2, ChevronRight, ChevronDown, ChevronUp, X, Rocket,
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

// 현재 페이지에서 해당 step이 활성인지 판단
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
  }, [location.pathname]); // 페이지 이동 시 상태 갱신

  if (loading || dismissed || allDone) return null;

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const nextStep = steps.find((s) => !s.completed && !s.optional) || steps.find((s) => !s.completed);

  // 현재 페이지에서 진행 중인 step 찾기
  const activeStepOnPage = steps.find(
    (s) => !s.completed && isStepActiveOnPage(s, location.pathname)
  );

  const handleStepClick = (step: Step) => {
    if (isStepActiveOnPage(step, location.pathname)) return; // 이미 해당 페이지면 이동 안 함
    const url = step.tab ? `${step.route}?tab=${step.tab}` : step.route;
    navigate(url);
  };

  return (
    <div className="bg-white rounded-xl border border-primary-200 shadow-sm overflow-hidden mb-6">
      {/* Header — 항상 보임 */}
      <div
        className="bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3 text-white">
          <Rocket className="w-5 h-5" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">시작하기</h2>
              <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">
                {completedCount}/{steps.length}
              </span>
            </div>
            {/* 현재 페이지에서 할 일 안내 */}
            {activeStepOnPage && !collapsed && (
              <p className="text-xs text-primary-100 mt-0.5">
                현재 단계: <strong className="text-white">{activeStepOnPage.title}</strong> — {activeStepOnPage.description}
              </p>
            )}
            {!activeStepOnPage && !collapsed && requiredDone && (
              <p className="text-xs text-primary-100 mt-0.5">
                필수 설정 완료! 선택 항목도 설정하면 더 많은 기능을 사용할 수 있습니다.
              </p>
            )}
            {!activeStepOnPage && !collapsed && !requiredDone && nextStep && (
              <p className="text-xs text-primary-100 mt-0.5">
                다음 단계: <strong className="text-white">{nextStep.title}</strong>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-primary-100" />
          ) : (
            <ChevronUp className="w-4 h-4 text-primary-100" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="p-1 hover:bg-white/20 rounded transition-colors text-primary-100"
            title="숨기기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar — 항상 보임 */}
      <div className="h-1 bg-primary-100">
        <div
          className="h-full bg-primary-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps — 접기/펼치기 */}
      {!collapsed && (
        <div className="p-3 flex flex-wrap gap-2">
          {steps.map((step, idx) => {
            const isActive = activeStepOnPage?.id === step.id;
            const isNext = nextStep?.id === step.id && !isActive;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                  step.completed
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : isActive
                    ? 'bg-primary-100 border-2 border-primary-400 text-primary-800 ring-2 ring-primary-200'
                    : isNext
                    ? 'bg-primary-50 border border-primary-200 text-primary-700 hover:bg-primary-100'
                    : 'bg-surface-50 border border-surface-200 text-surface-500 hover:bg-surface-100'
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 ${
                    isActive ? 'bg-primary-500 text-white' : isNext ? 'bg-primary-200 text-primary-700' : 'bg-surface-200 text-surface-500'
                  }`}>
                    {idx + 1}
                  </span>
                )}
                <span className="font-medium whitespace-nowrap">{step.title}</span>
                {step.optional && (
                  <span className="text-[10px] text-surface-400 bg-surface-100 px-1 py-0.5 rounded">선택</span>
                )}
                {!step.completed && !isActive && (
                  <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                )}
                {isActive && (
                  <span className="text-[10px] font-bold text-primary-600 bg-primary-200 px-1.5 py-0.5 rounded">진행 중</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
