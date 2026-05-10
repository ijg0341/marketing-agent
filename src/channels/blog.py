"""Manual blog adapters — Naver Blog & Tistory.

Both platforms shut down (or severely restricted) their public OpenAPI for new
applicants, so we cannot auto-publish. These adapters serve as a placeholder
that signals the publisher to skip auto-publish for blog channels. Users copy
the rendered HTML from the UI and paste into Naver/Tistory editors manually,
then mark the content as posted via the API.
"""
from __future__ import annotations

import logging

from src.channels.base import ChannelAdapter, MetricSnapshot, PublishResult

logger = logging.getLogger(__name__)


MANUAL_PUBLISH_ERROR = "MANUAL_PUBLISH_REQUIRED"


class _ManualBlogAdapter(ChannelAdapter):
    """Shared base — signals manual publish, no automated metrics."""

    name = "blog_base"

    async def publish(self, text: str, media_url: str | None = None) -> PublishResult:
        return PublishResult(success=False, error=MANUAL_PUBLISH_ERROR)

    async def collect_metrics(self, external_id: str) -> MetricSnapshot:
        # No metrics API available — analytics must be entered manually if needed
        return MetricSnapshot()

    async def verify_credentials(self) -> bool:
        # No credentials to verify; treat as always "connected" so the channel
        # remains usable for manual publish workflows.
        return True


class NaverBlogAdapter(_ManualBlogAdapter):
    name = "blog_naver"


class TistoryBlogAdapter(_ManualBlogAdapter):
    name = "blog_tistory"
