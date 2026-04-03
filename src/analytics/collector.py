from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from src.channels.base import ChannelAdapter
from src.content.publisher import get_adapter
from src.db.repository import ContentRepository, MetricRepository

logger = logging.getLogger(__name__)


async def collect_metrics_for_channel(db: Session, channel: str) -> list[dict[str, Any]]:
    content_repo = ContentRepository(db)
    metric_repo = MetricRepository(db)
    posted = content_repo.get_recent(channel=channel, limit=50)
    results = []

    adapter = get_adapter(channel)
    for content in posted:
        if not content.external_id:
            continue
        try:
            snapshot = await adapter.collect_metrics(content.external_id)
            metric_repo.record(
                content_id=content.id,
                channel=channel,
                impressions=snapshot.impressions,
                engagements=snapshot.engagements,
                clicks=snapshot.clicks,
                conversions=snapshot.conversions,
                engagement_rate=snapshot.engagement_rate,
            )
            results.append({
                "content_id": content.id,
                "impressions": snapshot.impressions,
                "engagements": snapshot.engagements,
                "engagement_rate": snapshot.engagement_rate,
            })
        except Exception as e:
            logger.exception(f"Error collecting metrics for content {content.id}")
            results.append({"content_id": content.id, "error": str(e)})

    return results


async def collect_all_metrics(db: Session, channels: list[str]) -> dict[str, Any]:
    all_results = {}
    for channel in channels:
        all_results[channel] = await collect_metrics_for_channel(db, channel)
    return all_results
