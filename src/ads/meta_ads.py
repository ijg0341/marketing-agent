from __future__ import annotations

import logging
import os
from typing import Any

import httpx

from src.ads.base import AdMetricResult, AdsAdapter, CampaignResult

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.facebook.com/v19.0"


class MetaAdsAdapter(AdsAdapter):
    """Meta (Facebook + Instagram) Ads API adapter.

    Requires: META_ADS_ACCOUNT_ID, META_ACCESS_TOKEN
    """

    platform = "meta"

    def __init__(self) -> None:
        self.account_id = os.getenv("META_ADS_ACCOUNT_ID", "")
        self.access_token = os.getenv("META_ACCESS_TOKEN", "")

    async def _request(self, method: str, path: str, json: dict | None = None, params: dict | None = None) -> dict:
        url = f"{GRAPH_API}{path}"
        base_params = {"access_token": self.access_token, **(params or {})}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(method, url, params=base_params, json=json)
            resp.raise_for_status()
            return resp.json()

    async def create_campaign(self, name, objective, daily_budget, currency, targeting, start_date=None, end_date=None, bid_strategy="auto") -> CampaignResult:
        objective_map = {
            "awareness": "OUTCOME_AWARENESS",
            "traffic": "OUTCOME_TRAFFIC",
            "engagement": "OUTCOME_ENGAGEMENT",
            "conversions": "OUTCOME_SALES",
        }
        data = {
            "name": name,
            "objective": objective_map.get(objective, "OUTCOME_AWARENESS"),
            "status": "PAUSED",
            "special_ad_categories": [],
        }
        result = await self._request("POST", f"/act_{self.account_id}/campaigns", params=data)
        campaign_id = result.get("id", "")

        # Create ad set with targeting and budget
        adset_data = {
            "name": f"{name} - Ad Set",
            "campaign_id": campaign_id,
            "daily_budget": int(daily_budget * 100),  # cents
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "REACH",
            "targeting": targeting,
            "status": "PAUSED",
        }
        if start_date:
            adset_data["start_time"] = start_date
        if end_date:
            adset_data["end_time"] = end_date

        await self._request("POST", f"/act_{self.account_id}/adsets", params=adset_data)

        return CampaignResult(platform_id=campaign_id, status="paused", details=result)

    async def update_campaign(self, platform_campaign_id, **kwargs) -> CampaignResult:
        result = await self._request("POST", f"/{platform_campaign_id}", params=kwargs)
        return CampaignResult(platform_id=platform_campaign_id, status="updated", details=result)

    async def pause_campaign(self, platform_campaign_id) -> CampaignResult:
        return await self.update_campaign(platform_campaign_id, status="PAUSED")

    async def resume_campaign(self, platform_campaign_id) -> CampaignResult:
        return await self.update_campaign(platform_campaign_id, status="ACTIVE")

    async def delete_campaign(self, platform_campaign_id) -> bool:
        await self._request("DELETE", f"/{platform_campaign_id}")
        return True

    async def create_ad(self, platform_campaign_id, ad_type, headline, body_text, media_url, cta_type, destination_url) -> CampaignResult:
        # Create ad creative
        creative_data: dict[str, Any] = {
            "name": headline or "Ad Creative",
            "object_story_spec": {
                "page_id": os.getenv("FACEBOOK_PAGE_ID", ""),
                "link_data": {
                    "message": body_text or "",
                    "link": destination_url or "",
                    "name": headline or "",
                },
            },
        }
        if media_url:
            creative_data["object_story_spec"]["link_data"]["image_url"] = media_url
        if cta_type:
            cta_map = {"learn_more": "LEARN_MORE", "shop_now": "SHOP_NOW", "sign_up": "SIGN_UP", "contact_us": "CONTACT_US"}
            creative_data["object_story_spec"]["link_data"]["call_to_action"] = {
                "type": cta_map.get(cta_type, "LEARN_MORE")
            }

        result = await self._request("POST", f"/act_{self.account_id}/adcreatives", params=creative_data)
        creative_id = result.get("id", "")
        return CampaignResult(platform_id=creative_id, status="created", details=result)

    async def get_campaign_metrics(self, platform_campaign_id, date_from, date_to) -> list[AdMetricResult]:
        params = {
            "fields": "impressions,clicks,spend,cpc,cpm,ctr,actions",
            "time_range": f'{{"since":"{date_from}","until":"{date_to}"}}',
            "time_increment": 1,
        }
        result = await self._request("GET", f"/{platform_campaign_id}/insights", params=params)
        metrics = []
        for entry in result.get("data", []):
            conversions = 0
            for action in entry.get("actions", []):
                if action.get("action_type") in ("purchase", "lead", "complete_registration"):
                    conversions += int(action.get("value", 0))
            metrics.append(AdMetricResult(
                impressions=int(entry.get("impressions", 0)),
                clicks=int(entry.get("clicks", 0)),
                conversions=conversions,
                spend=float(entry.get("spend", 0)),
                cpc=float(entry.get("cpc", 0)),
                cpm=float(entry.get("cpm", 0)),
                ctr=float(entry.get("ctr", 0)),
                raw=entry,
            ))
        return metrics

    async def verify_credentials(self) -> bool:
        try:
            await self._request("GET", f"/act_{self.account_id}", params={"fields": "name"})
            return True
        except Exception:
            return False

    def get_supported_objectives(self) -> list[dict[str, str]]:
        return [
            {"id": "awareness", "name": "Awareness", "description": "Reach people likely to remember your ads"},
            {"id": "traffic", "name": "Traffic", "description": "Send people to a destination (website, app)"},
            {"id": "engagement", "name": "Engagement", "description": "Get more messages, video views, or post engagement"},
            {"id": "conversions", "name": "Sales", "description": "Find people likely to purchase"},
        ]

    def get_targeting_options(self) -> dict[str, Any]:
        return {
            "age_range": {"min": 18, "max": 65},
            "genders": [{"id": 0, "name": "All"}, {"id": 1, "name": "Male"}, {"id": 2, "name": "Female"}],
            "locations": {"type": "geo_locations", "fields": ["countries", "regions", "cities", "zips"]},
            "interests": {"type": "flexible_spec", "note": "Use Marketing API interest search"},
            "behaviors": {"type": "flexible_spec", "note": "Purchase behavior, device usage, etc."},
            "languages": ["ko", "en", "ja", "zh"],
            "placements": ["facebook_feed", "instagram_feed", "instagram_stories", "audience_network", "messenger"],
            "custom_audiences": {"type": "id_list", "note": "Retargeting, lookalike audiences"},
        }
