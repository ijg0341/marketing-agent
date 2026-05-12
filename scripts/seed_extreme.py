"""Make the existing seeded metrics MORE extreme:

  pain_point_content    ~6.0%   (winner)
  customer_stories      ~4.0%
  tips_and_tricks       ~2.0%
  industry_insights     ~0.2%   (severe loser)
  product_updates       ~0.1%   (severe loser)

Overall average falls well below the 5% target → strategy_evolution
should propose theme_weight redistribution.

Also writes a recent reports/daily_*.md with qualitative recommendation
so the task has both quantitative and qualitative signals.
"""

import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "marketing_agent.db"

THEME_TARGETS = {
    "pain_point_content": 0.060,
    "customer_stories":   0.040,
    "tips_and_tricks":    0.020,
    "industry_insights":  0.002,
    "product_updates":    0.001,
}


def update_metrics():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()
    updated = 0
    for theme, target in THEME_TARGETS.items():
        cur.execute(
            "SELECT id FROM contents WHERE content_text LIKE ?",
            (f"[{theme}]%",),
        )
        cids = [row[0] for row in cur.fetchall()]
        for cid in cids:
            cur.execute(
                "SELECT id, impressions FROM metrics WHERE content_id = ? ORDER BY id",
                (cid,),
            )
            for mid, impressions in cur.fetchall():
                engagements = max(0, int(impressions * target))
                er = engagements / impressions if impressions > 0 else 0.0
                cur.execute(
                    "UPDATE metrics SET engagements = ?, clicks = ?, engagement_rate = ? WHERE id = ?",
                    (engagements, engagements // 3, er, mid),
                )
                updated += 1
    conn.commit()

    print(f"Updated {updated} metrics")
    print("\nPer-theme avg engagement (after update):")
    for theme, target in THEME_TARGETS.items():
        cur.execute(
            "SELECT AVG(engagement_rate), COUNT(*) FROM metrics WHERE content_id IN ("
            "SELECT id FROM contents WHERE content_text LIKE ?)",
            (f"[{theme}]%",),
        )
        avg, cnt = cur.fetchone()
        print(f"  {theme:<22} target={target:.4f}  actual={(avg or 0):.4f}  n={cnt}")

    cur.execute("SELECT AVG(engagement_rate) FROM metrics")
    overall = cur.fetchone()[0]
    print(f"\nOverall avg ER: {overall:.4f}  (target: 0.05)")
    conn.close()


def write_recent_report():
    today = datetime.now(timezone.utc).date()
    path = ROOT / "reports" / f"daily_{today.isoformat()}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    body = f"""# Daily Report — {today.isoformat()}

## 핵심 요약
지난 5일간 25개 콘텐츠 발행, 평균 engagement rate 약 2.4%. **target 5% 대비 절반 수준**으로 명백한 미달. 테마별 격차가 크게 벌어지고 있어 가중치 재분배가 필요합니다.

## 채널별 성과 (Twitter)
| theme | n | avg ER | 평가 |
|---|---|---|---|
| pain_point_content | 5 | ~6.0% | ✅ target 초과 |
| customer_stories | 5 | ~4.0% | △ target 근접 |
| tips_and_tricks | 5 | ~2.0% | ⚠ target 미달 |
| industry_insights | 5 | ~0.2% | ❌ 거의 무반응 |
| product_updates | 5 | ~0.1% | ❌ 거의 무반응 |

## 추천 조치
**전략 조정 권장**:
- `pain_point_content` 가중치 0.20 → **0.30** 으로 상향 (현 5개 모두 target 초과)
- `industry_insights` 가중치 0.20 → **0.10** 으로 하향 (5개 모두 1% 미만)
- `product_updates` 가중치 0.15 → **0.05** 으로 하향 (5개 모두 1% 미만)

## 전략 조정 필요 여부
**Yes — 즉시 권장**: 테마별 5x~60x 격차 확인됨. 통계적 유의성 충족 (theme당 n=5).
"""
    path.write_text(body, encoding="utf-8")
    print(f"\nWrote {path}")


if __name__ == "__main__":
    update_metrics()
    write_recent_report()
