from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class PublishResult:
    success: bool
    external_id: str | None = None
    url: str | None = None
    error: str | None = None


@dataclass
class MetricSnapshot:
    impressions: int = 0
    engagements: int = 0
    clicks: int = 0
    conversions: int = 0
    engagement_rate: float = 0.0
    raw: dict[str, Any] | None = None


class ChannelAdapter(ABC):
    name: str

    @abstractmethod
    async def publish(self, text: str, media_url: str | None = None) -> PublishResult:
        ...

    @abstractmethod
    async def collect_metrics(self, external_id: str) -> MetricSnapshot:
        ...

    @abstractmethod
    async def verify_credentials(self) -> bool:
        ...
