from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from src.channels.base import ChannelAdapter
from src.channels.twitter import TwitterAdapter
from src.db.repository import ContentRepository

logger = logging.getLogger(__name__)

ADAPTERS: dict[str, type[ChannelAdapter]] = {
    "twitter": TwitterAdapter,
}


def get_adapter(channel: str) -> ChannelAdapter:
    cls = ADAPTERS.get(channel)
    if cls is None:
        raise ValueError(f"Unknown channel: {channel}")
    return cls()


async def publish_queued(db: Session, channel: str | None = None) -> list[dict[str, Any]]:
    repo = ContentRepository(db)
    queued = repo.get_queued(channel)
    results = []
    for content in queued:
        try:
            adapter = get_adapter(content.channel)
            result = await adapter.publish(content.content_text, content.media_url)
            if result.success:
                repo.mark_posted(content.id, result.external_id)
                logger.info(f"Published content {content.id} to {content.channel}: {result.url}")
            else:
                repo.mark_failed(content.id)
                logger.error(f"Failed to publish content {content.id}: {result.error}")
            results.append({
                "content_id": content.id,
                "channel": content.channel,
                "success": result.success,
                "external_id": result.external_id,
                "url": result.url,
                "error": result.error,
            })
        except Exception as e:
            repo.mark_failed(content.id)
            logger.exception(f"Error publishing content {content.id}")
            results.append({
                "content_id": content.id,
                "channel": content.channel,
                "success": False,
                "error": str(e),
            })
    return results
