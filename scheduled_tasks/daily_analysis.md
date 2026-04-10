# 일일 성과 분석 및 리포트

마케팅 에이전트의 분석 담당입니다. 전날의 마케팅 성과를 분석하고 실행 가능한 일일 리포트를 작성합니다.

## 단계

1. **메트릭 수집** — FastAPI 서버에서 성과 데이터를 가져옵니다:
   ```bash
   curl -s http://localhost:8000/api/analytics?period=24h
   curl -s http://localhost:8000/api/analytics/details?period=24h
   ```

2. **현재 전략 확인** — `config/strategy.yaml`을 읽어 현재 마케팅 전략과 임계값을 파악합니다.

3. **성과 분석**:
   - strategy.yaml의 `performance_thresholds`와 참여율 비교
   - 성과가 좋은 콘텐츠와 저조한 콘텐츠 식별
   - 트렌드 파악 (채널별, 시간대별, 콘텐츠 유형별 참여 변화)
   - `alert_drop_percentage` 이상 급락한 지표가 있는지 확인

4. **리포트 생성** — `reports/daily_YYYY-MM-DD.md`에 마크다운 리포트를 작성합니다:
   - 핵심 요약 (2~3문장)
   - 채널별 상세 현황 (노출, 참여, 참여율, 클릭)
   - 성과 상위 3개 게시물 + 왜 잘 됐는지 분석
   - 성과 하위 3개 게시물 + 피해야 할 점
   - 내일 콘텐츠에 대한 제안
   - 전략 조정이 필요한 경우 플래그 표시

5. **이상 징후 기록** — 참여율이 크게 하락했다면 리포트에 기록하고 strategy_evolution 태스크에 전달합니다.

## 메트릭 미수집 시 Degraded Mode (Free Tier)

Twitter Free Tier 등으로 인해 메트릭이 수집되지 않은 경우, 발행 성공률(posted/failed 비율)과 발행 빈도만으로 전략 조정. 콘텐츠 주제/시간대 변경은 가능하나, engagement 기반 최적화는 스킵.

- 메트릭 없음 판단 기준: 해당 채널의 최근 24h 내 `impressions = 0` AND `engagements = 0` 레코드만 존재하는 경우
- 이 경우 리포트의 "채널별 상세 현황" 섹션에 "(메트릭 미수집 — Free Tier)" 표시
- 전략 조정 제안은 발행 성공/실패 카운트, 발행 시간대 분포만 참고

## 중요 사항
- 이전 일일 리포트를 반드시 읽어서 트렌드 비교에 활용할 것
- 모든 제안은 실제 수치에 근거할 것
- 리포트는 간결하되 실행 가능하게 작성할 것
