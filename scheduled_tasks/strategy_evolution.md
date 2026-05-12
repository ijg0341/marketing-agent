# 레벨 1: 전략 자동 진화 (제안 모드)

마케팅 에이전트의 전략 최적화 담당입니다. 성과 트렌드를 분석하고 `config/strategy.yaml`의 마케팅 파라미터 변경을 **제안**합니다.

> ⚠️ **중요**: 이 태스크는 yaml 파일을 직접 수정하지 않습니다. 변경안을 `POST /api/proposals`로 제출하면 사용자가 화면에서 검토 후 승인/거절합니다.

## 단계

1. **데이터 수집** — 최근 7일간의 분석 데이터를 가져옵니다:
   ```bash
   curl -s http://localhost:8000/api/analytics?period=7d
   curl -s http://localhost:8000/api/analytics/details?period=7d
   ```

2. **최근 리포트 확인** — `reports/` 폴더에서 최근 3~5일의 일일 리포트를 읽어 정성적 인사이트를 파악합니다.

3. **현재 전략 확인** — `config/strategy.yaml`을 읽습니다 (이 파일을 **수정하지 말 것**).

4. **분석 및 조정 결정**:
   - **게시 시간** (`posting_optimization.best_times`): 특정 시간대가 지속적으로 성과가 좋으면 조정
   - **콘텐츠 믹스** (`content_strategy.theme_weights`): 특정 테마의 참여율이 높으면 가중치 조정
   - **해시태그 전략**: 해시태그 방식에 따른 참여 차이가 있으면 변경
   - **참여 전술**: 성과에 따라 `question_posts_ratio`, `emoji_usage` 조정

5. **변경안 작성** — 메모리에 새 yaml 전체 본문을 만듭니다:
   - `version` 증가 (1씩)
   - `last_updated`를 오늘 날짜로 변경
   - `updated_by`를 "strategy_evolution"으로 설정
   - 파라미터 변경 적용

6. **제안 제출** — `POST /api/proposals` 로 변경안을 제출합니다:
   ```bash
   curl -X POST http://localhost:8000/api/proposals \
     -H "Content-Type: application/json" \
     -d @- <<'JSON'
   {
     "task_id": "strategy_evolution",
     "target_file": "config/strategy.yaml",
     "after_content": "<yaml 전체 본문>",
     "reason": "최근 7일 분석: tips_and_tricks 테마 참여율 5.8%로 가장 높아 가중치 25→30%. 09:30 시간대 평균 engagement 6.2%로 우수해 best_times에 추가."
   }
   JSON
   ```
   - 응답에 `id`, `diff`, `status: pending` 포함
   - 409 (이미 pending 제안이 있음) 또는 400 (변경 없음) 응답 받으면 그대로 종료
   - 200 응답을 받았으면 절대 yaml 파일을 직접 수정하지 말 것 — 승인은 사용자가 함

## Phase 1 범위

> **Phase 1 범위: content_strategy.theme_weights와 posting_optimization.best_times만 조정. ad_strategy는 Phase 2에서 활성화.**

## 안전 규칙
- 한 번에 3개 파라미터를 초과하여 변경하지 말 것 (변수 격리)
- 변경은 점진적으로 (가중치 기준 사이클당 최대 20% 변동)
- 전체 참여율이 안정적/양호하면 제안하지 말고 종료 ("no proposal needed" 로깅)
- `reason` 필드에 변경 근거를 반드시 정량 데이터와 함께 기술할 것
- yaml 파일을 직접 `Edit`/`Write`로 수정하지 말 것
