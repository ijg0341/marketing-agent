from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.analytics.collector import collect_all_metrics
from src.config import agent_config
from src.db.database import get_db
from src.db.repository import MetricRepository

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


PERIOD_HOURS = {
    "24h": 24,
    "7d": 168,
    "30d": 720,
}


@router.get("")
async def get_analytics(
    period: str = Query("24h", enum=list(PERIOD_HOURS.keys())),
    channel: str | None = None,
    db: Session = Depends(get_db),
):
    hours = PERIOD_HOURS[period]
    repo = MetricRepository(db)
    summary = repo.get_summary(channel=channel, hours=hours)
    return {"period": period, "channel": channel or "all", **summary}


@router.get("/details")
async def get_analytics_details(
    period: str = Query("24h", enum=list(PERIOD_HOURS.keys())),
    channel: str | None = None,
    db: Session = Depends(get_db),
):
    hours = PERIOD_HOURS[period]
    repo = MetricRepository(db)
    metrics = repo.get_by_period(channel=channel, hours=hours)
    return [
        {
            "id": m.id,
            "content_id": m.content_id,
            "channel": m.channel,
            "timestamp": str(m.timestamp),
            "impressions": m.impressions,
            "engagements": m.engagements,
            "clicks": m.clicks,
            "engagement_rate": m.engagement_rate,
        }
        for m in metrics
    ]


@router.post("/collect")
async def trigger_collection(db: Session = Depends(get_db)):
    channels = agent_config.get_enabled_channels()
    if not channels:
        return {"message": "No enabled channels", "results": {}}
    results = await collect_all_metrics(db, channels)
    return {"message": "Collection complete", "results": results}
