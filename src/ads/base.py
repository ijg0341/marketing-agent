from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class CampaignResult:
    platform_id: str
    status: str
    details: dict[str, Any] | None = None


@dataclass
class AdMetricResult:
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    spend: float = 0.0
    cpc: float = 0.0
    cpm: float = 0.0
    ctr: float = 0.0
    roas: float = 0.0
    raw: dict[str, Any] | None = None


class AdsAdapter(ABC):
    """Abstract base for advertising platform integrations."""

    platform: str = ""

    @abstractmethod
    async def create_campaign(
        self,
        name: str,
        objective: str,
        daily_budget: float,
        currency: str,
        targeting: dict[str, Any],
        start_date: str | None = None,
        end_date: str | None = None,
        bid_strategy: str = "auto",
    ) -> CampaignResult:
        ...

    @abstractmethod
    async def update_campaign(self, platform_campaign_id: str, **kwargs: Any) -> CampaignResult:
        ...

    @abstractmethod
    async def pause_campaign(self, platform_campaign_id: str) -> CampaignResult:
        ...

    @abstractmethod
    async def resume_campaign(self, platform_campaign_id: str) -> CampaignResult:
        ...

    @abstractmethod
    async def delete_campaign(self, platform_campaign_id: str) -> bool:
        ...

    @abstractmethod
    async def create_ad(
        self,
        platform_campaign_id: str,
        ad_type: str,
        headline: str | None,
        body_text: str | None,
        media_url: str | None,
        cta_type: str | None,
        destination_url: str | None,
    ) -> CampaignResult:
        ...

    @abstractmethod
    async def get_campaign_metrics(
        self, platform_campaign_id: str, date_from: str, date_to: str
    ) -> list[AdMetricResult]:
        ...

    @abstractmethod
    async def verify_credentials(self) -> bool:
        ...

    @abstractmethod
    def get_supported_objectives(self) -> list[dict[str, str]]:
        ...

    @abstractmethod
    def get_targeting_options(self) -> dict[str, Any]:
        ...
