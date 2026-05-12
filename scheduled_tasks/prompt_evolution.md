# 레벨 2: 프롬프트 및 템플릿 자체 개선 (제안 모드)

마케팅 에이전트의 템플릿 최적화 담당입니다. 성과 데이터를 바탕으로 콘텐츠 생성 템플릿의 변경을 **제안**합니다.

> ⚠️ **중요**: 이 태스크는 yaml 템플릿을 직접 수정하지 않습니다. 변경안을 `POST /api/proposals`로 제출하면 사용자가 화면에서 검토 후 승인/거절합니다.

## 단계

1. **템플릿별 성과 분석** — `template_version`별 콘텐츠 성과를 비교합니다:
   ```bash
   curl -s http://localhost:8000/api/content/recent?limit=50
   curl -s http://localhost:8000/api/analytics?period=7d
   ```

2. **현재 템플릿 확인** — `src/content/templates/`의 모든 파일을 읽습니다 (이 파일들을 **수정하지 말 것**):
   - `sns_post.yaml`
   - `blog_post.yaml`
   - `email_campaign.yaml`

3. **고성과 콘텐츠 패턴 식별**:
   - 어떤 훅(첫 문장)이 가장 효과적인가?
   - 어떤 CTA가 더 많은 클릭을 유도하는가?
   - 어떤 구조가 더 높은 참여를 이끄는가?
   - 어떤 톤이 오디언스에게 잘 맞는가?

4. **변경안 작성** — 한 사이클에 **한 템플릿 파일만** 개선합니다. 메모리에 새 yaml 전체 본문을 만듭니다:
   - `version` 증가
   - `last_updated` 업데이트
   - `structure`, `guidelines`, `example_hooks` 개선
   - 성공한 콘텐츠에서 발견된 새로운 패턴 추가
   - 지속적으로 성과가 낮은 패턴 수정 또는 제거

5. **제안 제출** — `POST /api/proposals` 로 변경안을 제출합니다:
   ```bash
   curl -X POST http://localhost:8000/api/proposals \
     -H "Content-Type: application/json" \
     -d @- <<'JSON'
   {
     "task_id": "prompt_evolution",
     "target_file": "src/content/templates/sns_post.yaml",
     "after_content": "<yaml 전체 본문>",
     "reason": "최근 50개 콘텐츠 중 질문형 훅이 진술형 대비 평균 engagement 1.7배. example_hooks에 질문형 5개 추가, 과거 평탄 훅 2개 제거."
   }
   JSON
   ```
   - 응답에 `id`, `diff`, `status: pending` 포함
   - 409 (이미 pending 제안이 있음) 또는 400 (변경 없음) 응답 받으면 그대로 종료
   - 200 응답을 받았으면 절대 yaml 파일을 직접 수정하지 말 것 — 승인은 사용자가 함

## 안전 규칙
- 변경 전/후를 명확히 기록할 것
- 충분한 데이터가 있는 템플릿만 변경할 것 (해당 템플릿으로 10개 이상 게시)
- 한 사이클당 **1개 템플릿 파일**만 제안 (다중 제안 금지)
- 작동하는 패턴을 삭제하지 말 것 — 점진적으로 진화시킬 것
- yaml 파일을 직접 `Edit`/`Write`로 수정하지 말 것
