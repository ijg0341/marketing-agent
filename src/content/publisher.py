from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from src.channels.base import ChannelAdapter
from src.channels.blog import MANUAL_PUBLISH_ERROR, NaverBlogAdapter, TistoryBlogAdapter
from src.channels.email_channel import SendGridAdapter
from src.channels.facebook import FacebookAdapter
from src.channels.instagram import InstagramAdapter
from src.channels.twitter import TwitterAdapter
from src.db.repository import ContentRepository

logger = logging.getLogger(__name__)

ADAPTERS: dict[str, type[ChannelAdapter]] = {
    "twitter": TwitterAdapter,
    "instagram": InstagramAdapter,
    "facebook": FacebookAdapter,
    "blog_naver": NaverBlogAdapter,
    "blog_tistory": TistoryBlogAdapter,
    "email": SendGridAdapter,
}

# Channels whose publish() is manual — keep content queued instead of marking failed.
MANUAL_CHANNELS = {"blog_naver", "blog_tistory"}


def get_adapter(channel: str) -> ChannelAdapter:
    # Note: get_adapter() creates new adapter instances each call, so Settings.reload() ensures latest credentials are used
    cls = ADAPTERS.get(channel)
    if cls is None:
        raise ValueError(f"Unknown channel: {channel}")
    if channel == "twitter":
        from src.config import settings as _settings
        missing = not all([
            _settings.twitter_api_key,
            _settings.twitter_api_secret,
            _settings.twitter_access_token,
            _settings.twitter_access_secret,
        ])
        if missing:
            raise ValueError("Twitter credentials not configured. Please complete onboarding.")
    return cls()


async def publish_queued(db: Session, channel: str | None = None) -> list[dict[str, Any]]:
    repo = ContentRepository(db)
    queued = repo.get_queued(channel)
    results = []
    for content in queued:
        # Manual channels (Naver/Tistory blogs) require human paste-publish — skip them here.
        if content.channel in MANUAL_CHANNELS:
            results.append({
                "content_id": content.id,
                "channel": content.channel,
                "success": False,
                "error": MANUAL_PUBLISH_ERROR,
                "skipped": True,
            })
            continue
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
