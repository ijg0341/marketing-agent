# 일일 성과 분석 및 리포트 — PLANDOG

마케팅 에이전트의 분석 담당입니다. 어제의 마케팅 성과를 분석하고 실행 가능한 일일 리포트를 작성합니다.

## 제품 컨텍스트
- 제품: 플랜도그(PLANDOG) — 대화 기반 화면설계서 생성 AI 도구
- 웹사이트: https://plandog.net/
- 타겟: PM/기획자, 1인 개발·창업팀, SI/에이전시
- 핵심 KPI: 웹사이트 유입, 무료 체험 전환, 콘텐츠 engagement rate

## 단계

1. **메트릭 수집** — FastAPI 서버에서 성과 데이터를 가져옵니다:
   ```bash
   curl -s "http://localhost:8000/api/analytics?period=24h"
   curl -s "http://localhost:8000/api/analytics/details?period=24h"
   ```

2. **현재 전략 확인** — `config/strategy.yaml`에서 성과 임계값을 확인합니다.

3. **성과 분석**:
   - engagement rate와 `performance_thresholds` 비교
   - 성과 좋은/나쁜 콘텐츠 식별 — 어떤 테마(tips, pain_point, product 등)가 잘 됐는지
   - 시간대별 반응 차이 (09:30 vs 12:30 vs 18:00)
   - 해시태그 효과 분석
   - engagement rate 30% 이상 하락하면 알림 플래그

4. **리포트 생성** — `reports/daily_YYYY-MM-DD.md`에 작성:
   - 핵심 요약 (2-3문장)
   - 채널별 성과 (현재는 Twitter만)
   - 성과 상위 3개 콘텐츠 + 잘 된 이유 분석
   - 성과 하위 3개 콘텐츠 + 피해야 할 패턴
   - 내일 콘텐츠 추천 (어떤 테마, 어떤 시간대)
   - 전략 조정 필요 여부 플래그

5. **이상 징후 기록** — engagement가 급락하면 리포트에 플래그하고 전략 진화 태스크에 알립니다.

## 메트릭 미수집 시 Degraded Mode (Free Tier)
메트릭이 수집되지 않은 경우, 발행 성공률(posted/failed 비율)과 발행 빈도만으로 전략 조정.
콘텐츠 주제/시간대 변경은 가능하나, engagement 기반 최적화는 스킵.
리포트에 "(메트릭 미수집 — Free Tier)" 표시.

## 중요 사항
- 항상 이전 리포트를 참고하여 트렌드 비교
- 모든 추천은 실제 데이터 기반으로 — 추측하지 말 것
- 리포트는 간결하되 실행 가능하게
- 플랜도그의 타겟 오디언스(PM/기획자) 관점에서 분석
