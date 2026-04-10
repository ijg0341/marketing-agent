# 일일 콘텐츠 기획 및 생성

마케팅 에이전트의 콘텐츠 담당입니다. 현재 전략과 최근 성과 데이터를 바탕으로 오늘의 마케팅 콘텐츠를 생성하고 큐에 등록합니다.

## 단계

1. **현재 전략 확인** — `config/strategy.yaml`에서 콘텐츠 테마, 가중치, 게시 최적화 설정을 읽습니다.

2. **제품 정보 확인** — `config/agent.yaml`에서 제품 상세, 브랜드 톤, 타겟 오디언스를 읽습니다.

3. **최근 성과 확인** — `reports/` 폴더의 최신 일일 리포트를 읽어 어떤 콘텐츠 유형이 잘 되고 있는지 파악합니다.

4. **템플릿 확인** — `src/content/templates/`에서 생성할 콘텐츠 유형에 맞는 템플릿을 읽습니다.

5. **콘텐츠 생성** — 활성화된 각 채널(`config/channels.yaml` 확인)에 대해:
   - 전략의 `theme_weights`에 따라 콘텐츠 주제 선택
   - 브랜드 톤과 작성 가이드라인 준수
   - strategy.yaml의 해시태그 전략 적용
   - 채널 제약 사항 **반드시** 준수:
     - **Twitter**: 본문 + 해시태그 합산 **280자 이하** (초과 시 트윗 실패). 생성 후 반드시 len() 확인.
     - 기타 채널: 각 채널 가이드라인 준수
   - 오늘의 게시 스케줄에 맞게 충분한 콘텐츠 생성
   - 템플릿 참조: `src/content/templates/` 폴더 (예: `sns_post_v1`, `blog_post_v1`)

6. **콘텐츠 큐 등록** — 생성된 콘텐츠를 API로 제출합니다 (API URL: `http://localhost:8000`):
   ```bash
   curl -X POST http://localhost:8000/api/content \
     -H "Content-Type: application/json" \
     -d '{"channel": "twitter", "content_text": "...", "template_version": "sns_post_v1"}'
   ```
   여러 개는 `http://localhost:8000/api/content/batch`를 사용합니다:
   ```bash
   curl -X POST http://localhost:8000/api/content/batch \
     -H "Content-Type: application/json" \
     -d '[{"channel": "twitter", "content_text": "...", "template_version": "sns_post_v1"}, ...]'
   ```

7. **확인** — 큐 상태 및 필터 조회:
   ```bash
   # 전체 큐 확인
   curl -s http://localhost:8000/api/content/queued

   # 상태별 필터 조회 (queued / posted / failed)
   curl -s "http://localhost:8000/api/content?status=queued"
   curl -s "http://localhost:8000/api/content?status=failed"
   ```

## 가이드라인
- 콘텐츠는 자연스럽고 진정성 있게 작성할 것 (AI가 쓴 느낌 배제)
- 브랜드 톤을 반드시 준수할 것
- 하루 동안 콘텐츠 유형을 다양하게 배치할 것
- 홍보성 콘텐츠에는 CTA를 포함할 것
- agent.yaml에 지정된 언어를 사용할 것
