# 레벨 1: 전략 자동 진화

마케팅 에이전트의 전략 최적화 담당입니다. 성과 트렌드를 분석하고 `config/strategy.yaml`의 마케팅 파라미터를 자동으로 조정합니다.

## 단계

1. **데이터 수집** — 최근 7일간의 분석 데이터를 가져옵니다:
   ```bash
   curl -s http://localhost:8000/api/analytics?period=7d
   curl -s http://localhost:8000/api/analytics/details?period=7d
   ```

2. **최근 리포트 확인** — `reports/` 폴더에서 최근 3~5일의 일일 리포트를 읽어 정성적 인사이트를 파악합니다.

3. **현재 전략 확인** — `config/strategy.yaml`과 `config/channels.yaml`을 읽습니다.

4. **분석 및 조정 결정**:
   - **게시 시간**: 특정 시간대가 지속적으로 성과가 좋으면 `best_times` 조정
   - **콘텐츠 믹스**: 특정 테마의 참여율이 높으면 `theme_weights` 조정
   - **해시태그 전략**: 해시태그 방식에 따른 참여 차이가 있으면 `hashtag_strategy` 변경
   - **참여 전술**: 성과에 따라 `question_posts_ratio`, `emoji_usage` 조정
   - **채널 우선순위**: 특정 채널 성과가 압도적이면 게시 빈도 증가

5. **변경 적용** — `config/strategy.yaml`을 직접 수정합니다:
   - `version` 증가 (1씩)
   - `last_updated`를 오늘 날짜로 변경
   - `updated_by`를 "strategy_evolution"으로 설정
   - 파라미터 변경 적용

6. **변경 기록** — API를 통해 변경 사항을 로깅합니다:
   ```bash
   curl -X PUT http://localhost:8000/api/strategy \
     -H "Content-Type: application/json" \
     -d '{"updates": {...}, "changed_by": "strategy_evolution", "reason": "..."}'
   ```

## Phase 1 범위

> **Phase 1 범위: content_strategy.theme_weights와 posting_optimization.best_times만 조정. ad_strategy는 Phase 2에서 활성화.**

## 안전 규칙
- 한 번에 3개 파라미터를 초과하여 변경하지 말 것 (변수 격리)
- 변경은 점진적으로 (가중치 기준 사이클당 최대 20% 변동)
- 전체 참여율이 안정적/양호하면 최소한의 변경만
- 모든 변경의 근거를 반드시 문서화할 것
