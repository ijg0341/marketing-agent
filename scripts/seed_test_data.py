"""One-shot seed for evolution testing.

Inserts 25 contents (5 per theme) + matching metrics with intentional
engagement-rate divergence so strategy_evolution has a clear signal:

  pain_point_content   ~10.5%   (winner)
  customer_stories      ~8.2%
  tips_and_tricks       ~5.8%
  industry_insights     ~1.4%   (loser)
  product_updates       ~0.9%   (loser)
"""

import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "data" / "marketing_agent.db"

themes_data = [
    ("pain_point_content", [
        "[pain_point_content] 화면설계서 수정 요청 5번이면 반나절 사라집니다. SSOT 기반이라면 한 번의 수정으로 끝",
        "[pain_point_content] 디자인 핸드오프할 때마다 디스크립션 다시 정리하기, 너무 비효율적이죠",
        "[pain_point_content] 기획서 작성 3일 → 검토 1일 → 수정 또 1일. 이 사이클 벗어나고 싶지 않으세요?",
        "[pain_point_content] 문서 일관성 깨지는 순간, PM의 야근이 시작됩니다",
        "[pain_point_content] 요구사항이 한 줄 바뀌었을 뿐인데 전체 문서를 다시 손봐야 하는 고통",
    ], 0.105),
    ("customer_stories", [
        "[customer_stories] 플랜도그 1개월 사용한 스타트업 CTO 후기: 'PRD 작성 시간이 80% 줄었습니다'",
        "[customer_stories] PM 5년차가 말하는 플랜도그 활용법 — 신규 기능 기획 1주일이 1일로",
        "[customer_stories] SI 에이전시에서 플랜도그로 클라이언트 미팅 시간 50% 단축한 사례",
        "[customer_stories] 1인 개발자 김OO님: '혼자서 PM+개발 다 하는데 플랜도그가 PM 역할 대신해요'",
        "[customer_stories] 15명 규모 핀테크팀이 플랜도그 도입 후 산출물 품질 일관성을 어떻게 확보했나",
    ], 0.082),
    ("tips_and_tricks", [
        "[tips_and_tricks] 기획서 작성 꿀팁: 자연어로 요구사항을 흩뿌리듯 적고 구조화는 AI에게",
        "[tips_and_tricks] 플로우 차트 그릴 때 트리거-액션-결과 3구조로 분리하면 누락이 줄어요",
        "[tips_and_tricks] PRD 작성 시 가장 먼저 적어야 할 것은 '이걸 안 만들면 어떻게 되는가'",
        "[tips_and_tricks] 경험상 사용자 인터뷰 후 24시간 안에 인사이트 정리 안 하면 휘발됩니다",
        "[tips_and_tricks] 디자인 시안 받기 전에 와이어프레임으로 합의하면 재작업 50% 줄어요",
    ], 0.058),
    ("industry_insights", [
        "[industry_insights] 2026년 PM 트렌드: AI 보조 도구의 일상화. 자료 조사부터 산출물 작성까지",
        "[industry_insights] 글로벌 SaaS 시장의 design-eng 컨버전스 트렌드 분석",
        "[industry_insights] 플로우차트 표준이 BPMN에서 더 가벼운 형태로 이동 중",
        "[industry_insights] 대기업 PM 채용 공고에 등장하는 새 키워드: 'AI literacy'",
        "[industry_insights] UX 리서치 자동화 도구들 비교 — 2026년 1분기 동향",
    ], 0.014),
    ("product_updates", [
        "[product_updates] 플랜도그 v2.3 — 멀티 PDF 분기 export 기능 추가",
        "[product_updates] 신규 기능: 화면 컴포넌트 라이브러리 자동 동기화",
        "[product_updates] 베타: 협업자 코멘트 실시간 알림 (3월 말 정식 출시)",
        "[product_updates] 버그 수정: 한글 깨짐 이슈 / 모바일 미리보기 최적화",
        "[product_updates] 플랜도그 + Figma 플러그인 v1.0 출시",
    ], 0.009),
]


def main():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()
    now = datetime.now(timezone.utc)

    inserted = 0
    for theme, texts, target_er in themes_data:
        for i, text in enumerate(texts):
            created = now - timedelta(days=4 - i, hours=2)
            cur.execute(
                """
                INSERT INTO contents
                  (channel, content_text, template_version, strategy_version, status, created_at, posted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                ("twitter", text, "plandog_v1", 1, "posted", created.isoformat(), created.isoformat()),
            )
            cid = cur.lastrowid
            impressions = 100 + (i * 5)
            engagements = max(1, int(impressions * target_er))
            actual_er = engagements / impressions if impressions > 0 else 0.0
            cur.execute(
                """
                INSERT INTO metrics
                  (content_id, channel, timestamp, impressions, engagements, clicks, conversions, engagement_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (cid, "twitter", created.isoformat(), impressions, engagements, engagements // 3, 0, actual_er),
            )
            inserted += 1

    conn.commit()
    print(f"Inserted {inserted} contents + matching metrics")
    cur.execute("SELECT COUNT(*) FROM contents")
    print(f"Total contents: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM metrics")
    print(f"Total metrics: {cur.fetchone()[0]}")

    # Per-theme engagement summary
    print("\nPer-theme avg engagement (newly inserted):")
    for theme, _, target in themes_data:
        cur.execute(
            "SELECT AVG(engagement_rate) FROM metrics WHERE content_id IN ("
            "SELECT id FROM contents WHERE content_text LIKE ?"
            ")",
            (f"[{theme}]%",),
        )
        avg = cur.fetchone()[0] or 0
        print(f"  {theme:<22} target={target:.3f}  actual={avg:.4f}")

    conn.close()


if __name__ == "__main__":
    main()
