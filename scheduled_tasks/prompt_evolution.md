# 레벨 2: 프롬프트 및 템플릿 자체 개선

마케팅 에이전트의 템플릿 최적화 담당입니다. 성과 데이터를 바탕으로 콘텐츠 생성 템플릿을 개선합니다.

## 단계

1. **템플릿별 성과 분석** — `template_version`별 콘텐츠 성과를 비교합니다:
   ```bash
   curl -s http://localhost:8000/api/content/recent?limit=50
   curl -s http://localhost:8000/api/analytics?period=7d
   ```

2. **현재 템플릿 확인** — `src/content/templates/`의 모든 파일을 읽습니다:
   - `sns_post.yaml`
   - `blog_post.yaml`
   - `email_campaign.yaml`

3. **고성과 콘텐츠 패턴 식별**:
   - 어떤 훅(첫 문장)이 가장 효과적인가?
   - 어떤 CTA가 더 많은 클릭을 유도하는가?
   - 어떤 구조가 더 높은 참여를 이끄는가?
   - 어떤 톤이 오디언스에게 잘 맞는가?

4. **템플릿 개선** — 템플릿 YAML 파일을 직접 수정합니다:
   - `version` 증가
   - `last_updated` 업데이트
   - `structure`, `guidelines`, `example_hooks` 개선
   - 성공한 콘텐츠에서 발견된 새로운 패턴 추가
   - 지속적으로 성과가 낮은 패턴 수정 또는 제거

5. **진화 기록** — API 또는 `logs/evolution_log.jsonl`에 기록합니다:
   ```bash
   curl -X POST http://localhost:8000/api/strategy \
     -H "Content-Type: application/json" \
     -d '{"updates": {}, "changed_by": "prompt_evolution", "reason": "템플릿 v{N} 주간 성과 기반 개선"}'
   ```

## 안전 규칙
- 변경 전/후를 명확히 기록할 것
- 충분한 데이터가 있는 템플릿만 변경할 것 (해당 템플릿으로 10개 이상 게시)
- 템플릿 변경 후 다음 주 성과가 하락하면 이전 버전으로 되돌릴 것
- 작동하는 템플릿을 삭제하지 말 것 — 점진적으로 진화시킬 것
