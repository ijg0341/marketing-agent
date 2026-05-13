# Marketing Agent

> 콘텐츠 마케팅의 작성 → 게시 → 분석 → 전략 진화를 자동화하는 셀프 호스팅 AI 마케팅 에이전트

| Tech | |
|---|---|
| Backend | FastAPI · SQLAlchemy · APScheduler · SQLite |
| Frontend | React 19 · Vite · TypeScript · Tailwind |
| AI | Claude Code CLI (호스트 인증) |
| Infra | Docker Compose · 호스트 cron |

---

## 핵심 기능

### 콘텐츠 워크플로우
- **자동 콘텐츠 생성** — Claude가 매일 활성 채널별로 콘텐츠를 만들고 큐에 등록 (`content_planning` 태스크)
- **다채널 발행** — Twitter, Instagram, Facebook, 블로그 (네이버/티스토리 반자동), Email
- **이미지 자산 관리** — Supabase Storage 기반 자산 풀, 콘텐츠 자동 매칭 (`/assets`)
- **채널별 PC/모바일 미리보기** — 발행 전 실제 게시 모습 확인

### 분석 & 진화
- **일일 성과 리포트** — `daily_analysis` 태스크가 어제 콘텐츠 성과를 분석해 리포트 생성
- **AI 진화 제안** — `strategy_evolution` / `prompt_evolution` 태스크가 yaml 변경안을 제출 → **사용자가 화면에서 승인해야 반영** (`/proposals`)
- **충돌 감지** — sha256 해시로 동시 편집 방지

### 자동화 관리
- 화면에서 cron 일정 토글 / 프롬프트 직접 편집 / 즉시 실행

---

## 빠른 시작

### 사전 요건
- Docker + Docker Compose
- 호스트에 [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) 설치 + 로그인
- (선택) Twitter/Instagram 등 채널별 API 키

### 설치
```bash
git clone <repo-url>
cd marketing-agent

# .env 설정
cp .env.example .env
# 최소: API_SECRET_KEY, ANTHROPIC_API_KEY (또는 호스트 claude CLI OAuth)

# 컨테이너 기동
docker compose up -d --build
```

### 접속
- 프론트엔드: http://localhost:8000
- API 문서: http://localhost:8000/docs
- 첫 화면에서 `.env`의 `API_SECRET_KEY`로 로그인

### 호스트 cron 등록 (자동 실행 원할 때)
화면의 자동화 페이지에서 태스크 토글로 등록. 또는 직접:
```cron
17 10 * * * cd /path/to/marketing-agent && cat scheduled_tasks/content_planning.md \
  | claude --print --allowed-tools 'Bash Read Write' \
  >> logs/content_planning.log 2>&1
```

---

## 아키텍처 한눈에

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React)                                        │
│  └─ /proposals · /scheduled-tasks · /content · /assets │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP
┌────────────────────▼─────────── Docker Container ───────┐
│  FastAPI (uvicorn)                                      │
│  ├─ /api/proposals      ← 진화 제안 승인 워크플로우      │
│  ├─ /api/scheduled-tasks ← 태스크 + cron 토글           │
│  ├─ /api/content        ← 콘텐츠 큐                    │
│  └─ APScheduler         ← 발행 + 메트릭 수집           │
│  SQLite (data/marketing_agent.db)                       │
└────────────────────┬────────────────────────────────────┘
                     │ volume mount: scheduled_tasks/
┌────────────────────▼────────────────────── Host OS ─────┐
│  cron → claude CLI → scheduled_tasks/*.md               │
│  분석 / 콘텐츠 생성 / 진화 제안 → POST /api/proposals    │
└─────────────────────────────────────────────────────────┘
```

> Claude CLI는 컨테이너에 안 들어가고 호스트에서 실행 — 사용자별 OAuth 인증을 컨테이너로 옮기기 어렵기 때문.

---

## 자동화 태스크

| 태스크 | 주기 (기본) | 하는 일 |
|---|---|---|
| `daily_analysis` | 매일 09:03 | 어제 성과 분석 + `reports/daily_*.md` 작성 |
| `content_planning` | 매일 10:17 | 활성 채널별 콘텐츠 생성 + 큐 등록 |
| `strategy_evolution` | 월/목 11:42 | `config/strategy.yaml` 변경안 **제안** (직접 수정 X) |
| `prompt_evolution` | 금 14:51 | 콘텐츠 템플릿 변경안 **제안** (직접 수정 X) |

evolution 태스크가 만든 변경안은 `진화 제안` 메뉴에서 사용자 승인 후에만 yaml에 반영됨.

---

## 디렉토리 구조

```
marketing-agent/
├── src/                      # FastAPI 백엔드
│   ├── api/                  # REST 엔드포인트
│   ├── channels/             # Twitter/Instagram/... 어댑터
│   ├── content/              # 콘텐츠 생성/발행
│   ├── analytics/            # 메트릭 수집
│   ├── ads/                  # 광고 모듈 (1차 비활성)
│   └── db/                   # SQLAlchemy 모델
├── frontend/                 # React 프론트엔드
├── scheduled_tasks/          # Claude 실행 프롬프트 (md)
├── config/                   # yaml 설정 (strategy, channels, agent)
├── reports/                  # 일일 리포트 (gitignored)
├── logs/                     # cron 실행 로그 (gitignored)
└── data/                     # SQLite DB (gitignored)
```

---

## 자세한 사용법

→ [USER_MANUAL.md](./USER_MANUAL.md)

---

## 개발

```bash
# 백엔드
pip install -e ".[dev]"
python -m uvicorn src.main:app --reload

# 프론트엔드
cd frontend && npm install && npm run dev

# 테스트
pytest
ruff check src/

# 컨테이너 재빌드 (코드 변경 시)
docker compose up -d --build
```

---

## 라이선스

(미정)
