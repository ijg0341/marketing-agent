# 레벨 3: 코드 자체 리뷰 및 개선

마케팅 에이전트의 코드 진화 엔진입니다. Python 소스코드를 리뷰하고 개선합니다.

## 현재 제품 컨텍스트
- 이 마케팅 에이전트는 플랜도그(PLANDOG) 마케팅을 자동화하는 시스템
- Phase 1 MVP: Twitter 1채널 자율 루프 (콘텐츠 생성 → 발행 → 분석 → 전략 조정)
- 기술 스택: FastAPI + SQLAlchemy + APScheduler, React + TypeScript

## 단계

1. **전체 코드 읽기** — `src/` 하위 모든 파일을 리뷰합니다:
   - `main.py`, `config.py`, `scheduler.py`
   - `api/*.py`
   - `channels/*.py`
   - `analytics/*.py`
   - `content/*.py`
   - `db/*.py`
   - `ads/*.py`

2. **이슈 확인**:
   - 버그 또는 에러 발생 가능한 코드 패턴
   - 핵심 경로(API 호출, DB 작업)의 누락된 에러 처리
   - 성능 병목
   - Twitter 어댑터의 안정성 (OAuth 서명, 재시도 로직, rate limit 대응)
   - API 엔드포인트의 입력 검증 누락

3. **테스트 커버리지 확인** — `tests/`를 읽고 테스트되지 않은 코드 경로를 식별합니다.

4. **개선 계획** — 영향도 기준으로 우선순위 결정:
   - 버그 수정 (최우선)
   - Twitter 파이프라인 안정성 (Phase 1 핵심)
   - 성능 개선
   - 테스트 커버리지

5. **변경 구현**:
   - 기존 파일을 수정하거나 필요시 새 파일 생성
   - 기존 코드 패턴과 스타일을 따를 것
   - 변경은 집중적이고 범위를 한정할 것

6. **검증** — 테스트 스위트를 실행합니다:
   ```bash
   cd /Users/goalle/vibework/marketing-agent && python3.12 -m pytest tests/ -v
   ```
   테스트가 실패하면 마무리 전에 반드시 수정합니다.

7. **진화 기록** — `logs/evolution_log.jsonl`에 기록합니다:
   - 무엇을 왜 변경했는지
   - 변경 전/후 설명
   - 테스트 결과

## 안전 규칙
- 설정 파일(agent.yaml, channels.yaml, strategy.yaml)은 절대 수정하지 말 것
- 스케줄 태스크 프롬프트는 절대 수정하지 말 것
- 모든 변경 후 테스트를 실행할 것
- 테스트가 실패하면 즉시 되돌릴 것
- 변경은 작고 점진적으로 — 실행당 하나의 개선만
- 강력한 근거 없이 새로운 의존성을 추가하지 말 것
