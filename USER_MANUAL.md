# Marketing Agent 사용 매뉴얼

## 목차

1. [처음 시작하기](#1-처음-시작하기)
2. [Step 1: 마케팅 대상 설정](#2-step-1-마케팅-대상-설정)
3. [Step 2: 플랫폼 연동](#3-step-2-플랫폼-연동)
4. [Step 3: 채널 설정](#4-step-3-채널-설정)
5. [Step 4: 첫 콘텐츠 게시](#5-step-4-첫-콘텐츠-게시)
6. [Step 5: 첫 광고 캠페인 집행](#6-step-5-첫-광고-캠페인-집행)
7. [성과 확인하기](#7-성과-확인하기)
8. [전략 관리](#8-전략-관리)
9. [AI 자동화 관리](#9-ai-자동화-관리)
10. [일일 운영 가이드](#10-일일-운영-가이드)

---

## 1. 처음 시작하기

### 이 시스템이 하는 일
Marketing Agent는 SNS 마케팅의 **전체 사이클**을 관리합니다:
- 콘텐츠 작성 → 게시 → 성과 수집 → 분석 → 전략 자동 조정

### 접속
- 대시보드: http://localhost:5173 (개발 모드) 또는 http://localhost:8000 (프로덕션)
- API 문서: http://localhost:8000/docs

### 최초 설정 순서
처음 사용할 때 반드시 이 순서대로 진행하세요:

```
Settings > Marketing Target 설정
    ↓
Settings > Platform Connections에서 API 키 등록
    ↓
Settings > Channel Settings에서 채널 ON/OFF
    ↓
Content에서 첫 콘텐츠 게시
    ↓
Advertising에서 첫 광고 캠페인 생성
```

---

## 2. Step 1: 마케팅 대상 설정

> 사이드바 > **Settings** > **Marketing Target** 탭

가장 먼저, **무엇을 마케팅할 것인지** 등록합니다.

### 제품/서비스 정보
| 필드 | 설명 | 예시 |
|------|------|------|
| **Product Name** | 제품/서비스 이름 | "VibeWork" |
| **Description** | 한 줄 설명 | "AI 기반 업무 자동화 플랫폼" |
| **Website URL** | 공식 사이트 | "https://vibework.io" |
| **Category** | 분류 | SaaS, E-commerce, Education 등 |

### 브랜드 설정
| 필드 | 설명 | 선택지 |
|------|------|--------|
| **Brand Tone** | 브랜드 말투 | professional_friendly(추천), casual, formal, playful, authoritative |
| **Language** | 주 사용 언어 | ko(한국어), en(영어), ja(일본어) |
| **Voice Guidelines** | 콘텐츠 작성 지침 | 자유 입력. 예: "~합니다 체를 사용, 이모지는 적절히" |
| **Hashtag Pool** | 기본 해시태그 목록 | 입력 후 Enter로 추가. 예: #마케팅자동화, #AI |

### 타겟 오디언스
| 필드 | 설명 | 예시 |
|------|------|------|
| **Age Range** | 타겟 연령대 | "25-45" |
| **Interests** | 관심사 태그 | 마케팅, 스타트업, 생산성 |
| **Pain Points** | 고객 고충 | "반복 업무에 시간을 너무 많이 씀" |
| **Value Propositions** | 제공 가치 | "AI로 마케팅 업무 80% 자동화" |

### 경쟁사 (선택)
- **+ Add** 버튼으로 경쟁사 이름 + URL 추가
- AI가 경쟁사 대비 차별화된 콘텐츠를 생성하는 데 활용

작성 완료 후 **Save** 클릭

---

## 3. Step 2: 플랫폼 연동

> 사이드바 > **Settings** > **Platform Connections** 탭

각 플랫폼의 API 키를 등록합니다. **사용할 플랫폼만 등록하면 됩니다.**

### 콘텐츠 채널 (무료 게시)

#### Twitter / X
1. https://developer.x.com 에서 개발자 계정 생성
2. Projects & Apps > 새 프로젝트 생성
3. App 생성 후 **Keys and Tokens** 탭에서 확인:
   - API Key / API Secret
   - Access Token / Access Secret
   - Bearer Token
4. 대시보드의 Twitter 카드에 각 값 입력 → **Save** → **Test Connection**

#### Instagram
1. Facebook 비즈니스 페이지에 Instagram 프로페셔널 계정 연결
2. https://developers.facebook.com 에서 앱 생성 (Business 타입)
3. Instagram Graph API 추가
4. Graph API Explorer에서 Access Token 생성
   - 필요 권한: `instagram_basic`, `instagram_content_publish`
5. Instagram Business Account ID는 `/me/accounts` API로 조회
6. 대시보드에 입력 → **Save** → **Test Connection**

#### Facebook
1. Facebook 비즈니스 페이지가 없으면 생성
2. https://developers.facebook.com 에서 앱 생성
3. Graph API Explorer에서 페이지 토큰 생성
   - 필요 권한: `pages_manage_posts`, `pages_read_engagement`
4. Page ID는 페이지 설정 > 페이지 투명성에서 확인
5. 대시보드에 입력 → **Save** → **Test Connection**

#### WordPress Blog
1. WordPress 관리자 > 사용자 > 프로필 > Application Passwords
2. 새 Application Password 생성 후 복사
3. 대시보드에 Site URL + Username + Password 입력 → **Save** → **Test Connection**

#### SendGrid Email
1. https://sendgrid.com 계정 생성
2. Settings > API Keys > Create API Key
3. Settings > Sender Authentication에서 발신 이메일 인증
4. 대시보드에 API Key + From Email 입력 → **Save** → **Test Connection**

### 광고 플랫폼 (유료)

#### Meta Ads (Facebook + Instagram 광고)
1. https://business.facebook.com 에서 비즈니스 관리자 설정
2. 광고 계정 생성 + **결제 수단 등록** (카드/계좌)
3. 광고 계정 ID 확인 (설정 > 광고 계정 정보, `act_` 제외한 숫자)
4. developers.facebook.com Graph API Explorer에서 토큰 생성
   - 필요 권한: `ads_management`, `ads_read`
5. 대시보드에 입력 → **Save** → **Test Connection**

#### Google Ads
1. https://ads.google.com 에서 계정 생성 + **결제 수단 등록**
2. Customer ID 확인 (우측 상단, xxx-xxx-xxxx 형식)
3. https://developers.google.com/google-ads/api 에서 개발자 토큰 신청
4. Google Cloud Console에서 OAuth 2.0 Client ID/Secret 생성
5. OAuth Playground에서 Refresh Token 획득
6. 대시보드에 5개 값 입력 → **Save** → **Test Connection**

#### Twitter Ads
1. https://ads.twitter.com 에서 광고 계정 생성 + **결제 수단 등록**
2. Ads Account ID는 URL에서 확인 (`ads.twitter.com/accounts/xxxxx`)
3. Ads API 액세스는 developer.x.com에서 별도 신청
4. 대시보드에 Account ID 입력 (나머지는 Twitter 콘텐츠 채널과 동일 키 사용)
5. **Save** → **Test Connection**

### 연동 상태 확인
- **Connected** (초록): 정상 연결
- **Not Connected** (회색): 키 미입력
- 각 플랫폼 카드의 **Setup Guide** 버튼을 클릭하면 단계별 가이드가 바로 표시됩니다

---

## 4. Step 3: 채널 설정

> 사이드바 > **Settings** > **Channel Settings** 탭

### 채널 활성화
- 각 채널의 **토글 스위치**로 ON/OFF
- API 키가 등록된 채널만 ON으로 설정하세요

### 게시 스케줄 설정
| 설정 | 설명 | 추천값 |
|------|------|--------|
| **Frequency** | 게시 빈도 | Daily |
| **Max Posts/Day** | 일일 최대 게시 수 | Twitter: 3~5, Instagram: 1~2, Facebook: 1~2 |
| **Posting Times** | 게시 시간대 | 10:00, 15:00, 20:00 (한국 시간) |

### 최적 게시 시간 참고
| 채널 | 추천 시간 |
|------|----------|
| Twitter | 오전 10시, 오후 3시, 저녁 8시 |
| Instagram | 오전 9시, 저녁 6시 |
| Facebook | 정오 12시, 오후 5시 |
| Blog | 오전 10시 (주 1~2회) |
| Email | 오전 9시 (주 1회) |

---

## 5. Step 4: 첫 콘텐츠 게시

> 사이드바 > **Content**

### 콘텐츠 직접 작성하기
1. **New Content** 클릭
2. 채널 선택 (예: Twitter)
3. 템플릿 선택:
   - `SNS Post v1` — 트위터/인스타/페이스북
   - `Blog Post v1` — 블로그
   - `Email Campaign v1` — 이메일
4. 콘텐츠 입력 (예: "AI 마케팅 자동화로 업무 시간 80%를 절약하세요! 🚀 #마케팅자동화")
5. **Add to Queue** → 큐에 등록

### 게시하기
- **Publish Queued** 클릭 → 대기 중인 콘텐츠 즉시 게시
- 또는 Channel Settings에 설정한 시간에 자동 게시

### 콘텐츠 상태
| 상태 | 의미 | 조치 |
|------|------|------|
| **Queued** (노란색) | 게시 대기 중 | 내용 확인 후 게시 |
| **Posted** (초록색) | 게시 완료 | Analytics에서 성과 확인 |
| **Failed** (빨간색) | 게시 실패 | API 키 확인 → 재등록 |

### 유의사항
- Twitter: 280자 제한
- Instagram: 이미지 URL 필수 (Media URL 입력)
- Blog: 긴 형태의 글 작성 가능
- Email: 뉴스레터 형태, 제목줄 포함 권장

---

## 6. Step 5: 첫 광고 캠페인 집행

> 사이드바 > **Advertising**

### 캠페인 생성
1. **New Campaign** 클릭
2. 기본 정보:
   - **Platform**: 광고할 플랫폼 선택
   - **Campaign Name**: 알아보기 쉬운 이름 (예: "4월 봄 프로모션")
   - **Objective**: 목표 선택
     | 목표 | 설명 | 언제 사용 |
     |------|------|----------|
     | Awareness | 많은 사람에게 노출 | 브랜드 알리기 |
     | Traffic | 웹사이트 방문 유도 | 랜딩페이지 트래픽 |
     | Engagement | 좋아요/공유 유도 | 커뮤니티 활성화 |
     | Conversions | 구매/가입 유도 | 매출 직결 |

3. 예산:
   - **Daily Budget**: 일일 예산 (예: ₩30,000)
   - **Total Budget**: 총 한도 (예: ₩900,000)
   - **Bid Strategy**: `Auto` 추천 (처음에는)

4. 기간: 시작일 / 종료일

5. 타겟팅:
   - **Age**: 제품에 맞는 연령 (예: 25~44)
   - **Gender**: All (특별한 이유 없으면)
   - **Locations**: "서울", "경기" 등
   - **Interests**: 제품 관련 관심사 태그 추가
   - **Placements**: 광고 노출 위치 체크

6. 광고 소재:
   - **Headline**: 클릭을 유도하는 제목
   - **Body Text**: 핵심 가치 전달
   - **Media URL**: 광고 이미지/영상 URL
   - **CTA**: Learn More(일반) / Shop Now(쇼핑) / Sign Up(가입)
   - **Destination URL**: 클릭 시 이동할 페이지

7. **Create Campaign** → draft 상태로 생성

### 캠페인 시작
- 목록에서 해당 캠페인의 **▶ 버튼** 클릭 → 플랫폼에 전송 + 활성화
- 이후 설정한 예산에 따라 등록된 카드에서 자동 결제

### 캠페인 관리
| 버튼 | 동작 |
|------|------|
| ▶ (Play) | 활성화 또는 재개 |
| ⏸ (Pause) | 일시정지 (비용 발생 중단) |
| 🗑 (Delete) | 캠페인 삭제 |

### 첫 캠페인 추천 설정
- 플랫폼: **Meta** (가장 직관적)
- 목표: **Traffic**
- 일일 예산: **₩10,000~20,000** (테스트)
- 기간: **7일**
- 타겟: 넓게 잡고 시작 → 데이터 보면서 좁히기

---

## 7. 성과 확인하기

### Dashboard (전체 요약)
> 사이드바 > **Dashboard**

- **KPI 카드**: 주요 지표 한눈에 (게시물, 노출, 참여, 클릭, 참여율)
- **채널 성과 차트**: 어떤 채널이 잘 되고 있는지
- **콘텐츠 믹스**: 콘텐츠 유형 비율 확인
- **주간 트렌드**: 요일별 성과 패턴
- **기간 전환**: 우측 상단 24h / 7d / 30d

### Analytics (상세 분석)
> 사이드바 > **Analytics**

- **일별 추이**: 노출/참여 변화 그래프
- **채널 비교**: 채널별 성과 나란히 비교
- **Top Content**: 가장 잘 된 콘텐츠 5개 → 왜 잘 됐는지 분석
- **Collect Metrics**: 수동으로 최신 성과 수집 트리거

### 광고 성과 (Advertising 페이지)
- 캠페인별: Spend, Impressions, Clicks, CTR, ROAS
- **Spend Trend**: 플랫폼별 일일 지출 추이 차트

### 핵심 지표 읽는 법
| 지표 | 좋은 수준 | 나쁜 수준 | 조치 |
|------|----------|----------|------|
| **Engagement Rate** | 3% 이상 | 1% 미만 | 콘텐츠 주제/톤 변경 |
| **CTR** (광고) | 2% 이상 | 0.5% 미만 | 소재/타겟 변경 |
| **ROAS** (광고) | 3.0 이상 | 1.0 미만 | 예산 조정 또는 중단 |

---

## 8. 전략 관리

### Strategy (전략 현황)
> 사이드바 > **Strategy**

**Overview 탭**:
- 테마 가중치 / 콘텐츠 믹스 파이차트
- 채널 성과 vs 목표 레이더 차트
- 게시 최적 시간대
- 성과 임계값 (최소/목표 참여율)

**Change Log 탭**:
- 전략이 변경된 이력 전체 조회
- 누가(AI/수동), 무엇을, 왜 변경했는지

### 전략은 언제 직접 수정해야 하나?
- 새 제품/서비스 런칭 시
- 시즌/이벤트에 맞춘 콘텐츠 방향 전환
- AI 자동 조정이 의도와 다른 방향으로 갈 때
- 특정 채널을 집중적으로 키우고 싶을 때

---

## 9. AI 자동화 관리

### Evolution (자동 진화 기록)
> 사이드바 > **Evolution**

AI가 시스템을 자동으로 개선한 이력:
| 레벨 | 대상 | 주기 |
|------|------|------|
| **L1** | 마케팅 전략 조정 | 월/목 |
| **L2** | 콘텐츠 템플릿 개선 | 금요일 |
| **L3** | 소스코드 개선 | 수요일 |

- **Applied** (초록): 적용된 변경
- **Rolled Back** (빨간): 실패하여 되돌린 변경
- 성공률이 낮으면 → 전략을 수동으로 재설정

### Scheduled Tasks (스케줄 프롬프트)
> 사이드바 > **Scheduled Tasks**

AI 태스크 프롬프트를 직접 편집할 수 있습니다:

| 태스크 | 주기 | 하는 일 |
|--------|------|---------|
| daily_analysis | 매일 09:03 | 전날 성과 분석 + 리포트 |
| content_planning | 매일 10:17 | 오늘 콘텐츠 생성 + 큐 등록 |
| strategy_evolution | 월/목 11:42 | 전략 자동 최적화 |
| code_evolution | 수 14:22 | 코드 리뷰 + 개선 |
| prompt_evolution | 금 14:51 | 템플릿 성과 분석 + 개선 |

**편집 방법**: 카드 클릭 → 펼치기 → 연필 아이콘 → 프롬프트 수정 → Save

**새 태스크 추가**: New Task → ID + Cron + 프롬프트 작성 → Create

---

## 10. 일일 운영 가이드

### 아침 루틴 (5분)
1. **Dashboard** → 전날 성과 빠르게 확인
2. **Content** → AI가 생성한 오늘 콘텐츠 큐 검토
   - 부적절한 내용 수정/삭제
   - 필요하면 직접 추가 작성
3. 문제 없으면 자동 게시에 맡기거나 **Publish Queued**

### 수시 체크
4. **Advertising** → 진행 중 캠페인 성과
   - CTR < 1%: 소재/타겟 재검토
   - ROAS > 3: 예산 증액 고려
   - 예산 소진: 종료 또는 연장

### 주간 리뷰 (15분)
5. **Analytics** (7d) → 주간 트렌드 파악
6. **Strategy** > Change Log → AI 전략 변경 검토
7. **Evolution** → AI 개선 이력 확인
8. 필요시 전략 수동 조정

### 월간 리뷰 (30분)
9. **Analytics** (30d) → 월간 전체 성과
10. 채널별 ROI 비교 → 저성과 채널 OFF 고려
11. 광고 캠페인 월간 정산 확인
12. 다음 달 마케팅 방향 설정 → Strategy/Content에 반영
