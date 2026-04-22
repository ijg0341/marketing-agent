from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
from typing import Any
from urllib.parse import quote

import httpx

from src.ads.base import AdMetricResult, AdsAdapter, CampaignResult

logger = logging.getLogger(__name__)

ADS_API_BASE = "https://ads-api.x.com/12"


class TwitterAdsAdapter(AdsAdapter):
    """Twitter / X Ads API adapter.

    Requires: TWITTER_ADS_ACCOUNT_ID, TWITTER_API_KEY, TWITTER_API_SECRET,
              TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
    """

    platform = "twitter"

    def __init__(self) -> None:
        from src.config import settings
        self.account_id = settings.twitter_ads_account_id
        self.api_key = settings.twitter_api_key
        self.api_secret = settings.twitter_api_secret
        self.access_token = settings.twitter_access_token
        self.access_secret = settings.twitter_access_secret

    def _oauth_header(self, method: str, url: str, params: dict | None = None) -> str:
        oauth = {
            "oauth_consumer_key": self.api_key,
            "oauth_nonce": hashlib.md5(str(time.time()).encode()).hexdigest(),
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": str(int(time.time())),
            "oauth_token": self.access_token,
            "oauth_version": "1.0",
        }
        all_params = {**oauth, **(params or {})}
        param_str = "&".join(f"{quote(k)}={quote(str(v))}" for k, v in sorted(all_params.items()))
        base_string = f"{method.upper()}&{quote(url, safe='')}&{quote(param_str, safe='')}"
        signing_key = f"{quote(self.api_secret)}&{quote(self.access_secret)}"
        signature = hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
        import base64
        oauth["oauth_signature"] = base64.b64encode(signature).decode()
        header = ", ".join(f'{quote(k)}="{quote(str(v))}"' for k, v in sorted(oauth.items()))
        return f"OAuth {header}"

    async def _request(self, method: str, path: str, json: dict | None = None) -> dict:
        url = f"{ADS_API_BASE}/accounts/{self.account_id}{path}"
        headers = {"Authorization": self._oauth_header(method, url)}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(method, url, headers=headers, json=json)
            resp.raise_for_status()
            return resp.json()

    async def create_campaign(self, name, objective, daily_budget, currency, targeting, start_date=None, end_date=None, bid_strategy="auto") -> CampaignResult:
        objective_map = {
            "awareness": "REACH",
            "traffic": "WEBSITE_CLICKS",
            "engagement": "ENGAGEMENTS",
            "conversions": "WEBSITE_CONVERSIONS",
        }
        data = {
            "name": name,
            "objective": objective_map.get(objective, "REACH"),
            "daily_budget_amount_local_micro": int(daily_budget * 1_000_000),
            "currency": currency,
            "status": "PAUSED",
        }
        if start_date:
            data["start_time"] = start_date
        result = await self._request("POST", "/campaigns", json=data)
        campaign_data = result.get("data", {})
        return CampaignResult(
            platform_id=campaign_data.get("id", ""),
            status="paused",
            details=campaign_data,
        )

    async def update_campaign(self, platform_campaign_id, **kwargs) -> CampaignResult:
        result = await self._request("PUT", f"/campaigns/{platform_campaign_id}", json=kwargs)
        return CampaignResult(platform_id=platform_campaign_id, status="updated", details=result.get("data"))

    async def pause_campaign(self, platform_campaign_id) -> CampaignResult:
        return await self.update_campaign(platform_campaign_id, status="PAUSED")

    async def resume_campaign(self, platform_campaign_id) -> CampaignResult:
        return await self.update_campaign(platform_campaign_id, status="ACTIVE")

    async def delete_campaign(self, platform_campaign_id) -> bool:
        await self._request("DELETE", f"/campaigns/{platform_campaign_id}")
        return True

    async def create_ad(self, platform_campaign_id, ad_type, headline, body_text, media_url, cta_type, destination_url) -> CampaignResult:
        # Twitter ads require: line_item (ad group) -> promoted tweet
        data = {"campaign_id": platform_campaign_id, "objective": "WEBSITE_CLICKS", "bid_type": "AUTO"}
        result = await self._request("POST", "/line_items", json=data)
        line_item_id = result.get("data", {}).get("id", "")
        return CampaignResult(platform_id=line_item_id, status="created", details=result.get("data"))

    async def get_campaign_metrics(self, platform_campaign_id, date_from, date_to) -> list[AdMetricResult]:
        params = f"?entity=CAMPAIGN&entity_ids={platform_campaign_id}&start_time={date_from}&end_time={date_to}&metric_groups=ENGAGEMENT,BILLING"
        result = await self._request("GET", f"/stats/accounts/{self.account_id}{params}")
        metrics = []
        for entry in result.get("data", []):
            m = entry.get("id_data", [{}])[0].get("metrics", {})
            metrics.append(AdMetricResult(
                impressions=sum(m.get("impressions", [0])),
                clicks=sum(m.get("clicks", [0])),
                spend=sum(m.get("billed_charge_local_micro", [0])) / 1_000_000,
                raw=m,
            ))
        return metrics

    async def verify_credentials(self) -> bool:
        try:
            await self._request("GET", "")
            return True
        except Exception:
            return False

    def get_supported_objectives(self) -> list[dict[str, str]]:
        return [
            {"id": "awareness", "name": "Brand Awareness", "description": "Maximize reach"},
            {"id": "traffic", "name": "Website Traffic", "description": "Drive clicks to your site"},
            {"id": "engagement", "name": "Engagement", "description": "Get more interactions"},
            {"id": "conversions", "name": "Conversions", "description": "Drive specific actions"},
        ]

    def get_targeting_options(self) -> dict[str, Any]:
        return {
            "age_ranges": ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
            "genders": ["all", "male", "female"],
            "locations": {"type": "country/region/city", "note": "Use Twitter API location search"},
            "interests": {"type": "category_ids", "note": "Use Twitter API interest taxonomy"},
            "keywords": {"type": "list", "note": "Target by keyword"},
            "languages": ["ko", "en", "ja", "zh"],
            "devices": ["mobile", "desktop", "all"],
            "placements": ["timeline", "search", "profile"],
        }
