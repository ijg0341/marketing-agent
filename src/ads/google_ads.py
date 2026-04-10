from __future__ import annotations

import logging
import os
from typing import Any

import httpx

from src.ads.base import AdMetricResult, AdsAdapter, CampaignResult

logger = logging.getLogger(__name__)

GOOGLE_ADS_API = "https://googleads.googleapis.com/v16"


class GoogleAdsAdapter(AdsAdapter):
    """Google Ads API adapter.

    Requires: GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN,
              GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET
    """

    platform = "google"

    def __init__(self) -> None:
        self.customer_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID", "").replace("-", "")
        self.developer_token = os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN", "")
        self.refresh_token = os.getenv("GOOGLE_ADS_REFRESH_TOKEN", "")
        self.client_id = os.getenv("GOOGLE_ADS_CLIENT_ID", "")
        self.client_secret = os.getenv("GOOGLE_ADS_CLIENT_SECRET", "")
        self._access_token: str | None = None

    async def _get_access_token(self) -> str:
        if self._access_token:
            return self._access_token
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self.refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )
            resp.raise_for_status()
            self._access_token = resp.json()["access_token"]
            return self._access_token

    async def _request(self, method: str, path: str, json: dict | None = None) -> dict:
        token = await self._get_access_token()
        url = f"{GOOGLE_ADS_API}/customers/{self.customer_id}{path}"
        headers = {
            "Authorization": f"Bearer {token}",
            "developer-token": self.developer_token,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(method, url, headers=headers, json=json)
            resp.raise_for_status()
            return resp.json()

    async def _search(self, query: str) -> list[dict]:
        result = await self._request("POST", "/googleAds:searchStream", json={"query": query})
        rows = []
        for batch in result if isinstance(result, list) else [result]:
            rows.extend(batch.get("results", []))
        return rows

    async def create_campaign(self, name, objective, daily_budget, currency, targeting, start_date=None, end_date=None, bid_strategy="auto") -> CampaignResult:
        # Step 1: Create budget
        budget_op = {
            "create": {
                "name": f"{name}_budget",
                "amountMicros": str(int(daily_budget * 1_000_000)),
                "deliveryMethod": "STANDARD",
            }
        }
        budget_result = await self._request("POST", "/campaignBudgets:mutate", json={"operations": [budget_op]})
        budget_rn = budget_result.get("results", [{}])[0].get("resourceName", "")

        # Step 2: Create campaign
        type_map = {
            "awareness": "DISPLAY",
            "traffic": "SEARCH",
            "engagement": "DISCOVERY",
            "conversions": "SEARCH",
        }
        campaign_op = {
            "create": {
                "name": name,
                "advertisingChannelType": type_map.get(objective, "SEARCH"),
                "status": "PAUSED",
                "campaignBudget": budget_rn,
                "maximizeClicks": {} if bid_strategy == "auto" else None,
            }
        }
        if start_date:
            campaign_op["create"]["startDate"] = start_date.replace("-", "")
        if end_date:
            campaign_op["create"]["endDate"] = end_date.replace("-", "")

        result = await self._request("POST", "/campaigns:mutate", json={"operations": [campaign_op]})
        campaign_rn = result.get("results", [{}])[0].get("resourceName", "")
        campaign_id = campaign_rn.split("/")[-1] if campaign_rn else ""

        return CampaignResult(platform_id=campaign_id, status="paused", details=result)

    async def update_campaign(self, platform_campaign_id, **kwargs) -> CampaignResult:
        rn = f"customers/{self.customer_id}/campaigns/{platform_campaign_id}"
        update_mask = ",".join(kwargs.keys())
        op = {"update": {"resourceName": rn, **kwargs}, "updateMask": update_mask}
        result = await self._request("POST", "/campaigns:mutate", json={"operations": [op]})
        return CampaignResult(platform_id=platform_campaign_id, status="updated", details=result)

    async def pause_campaign(self, platform_campaign_id) -> CampaignResult:
        return await self.update_campaign(platform_campaign_id, status="PAUSED")

    async def resume_campaign(self, platform_campaign_id) -> CampaignResult:
        return await self.update_campaign(platform_campaign_id, status="ENABLED")

    async def delete_campaign(self, platform_campaign_id) -> bool:
        rn = f"customers/{self.customer_id}/campaigns/{platform_campaign_id}"
        await self._request("POST", "/campaigns:mutate", json={"operations": [{"remove": rn}]})
        return True

    async def create_ad(self, platform_campaign_id, ad_type, headline, body_text, media_url, cta_type, destination_url) -> CampaignResult:
        # Create ad group first
        ag_op = {
            "create": {
                "name": f"Ad Group - {headline or 'default'}",
                "campaign": f"customers/{self.customer_id}/campaigns/{platform_campaign_id}",
                "type": "SEARCH_STANDARD",
                "status": "ENABLED",
            }
        }
        ag_result = await self._request("POST", "/adGroups:mutate", json={"operations": [ag_op]})
        ag_rn = ag_result.get("results", [{}])[0].get("resourceName", "")

        # Create responsive search ad
        ad_op = {
            "create": {
                "adGroup": ag_rn,
                "ad": {
                    "responsiveSearchAd": {
                        "headlines": [{"text": headline or ""}],
                        "descriptions": [{"text": body_text or ""}],
                    },
                    "finalUrls": [destination_url or ""],
                },
                "status": "ENABLED",
            }
        }
        result = await self._request("POST", "/adGroupAds:mutate", json={"operations": [ad_op]})
        ad_rn = result.get("results", [{}])[0].get("resourceName", "")
        ad_id = ad_rn.split("/")[-1] if ad_rn else ""
        return CampaignResult(platform_id=ad_id, status="created", details=result)

    async def get_campaign_metrics(self, platform_campaign_id, date_from, date_to) -> list[AdMetricResult]:
        query = f"""
            SELECT
                segments.date,
                metrics.impressions,
                metrics.clicks,
                metrics.conversions,
                metrics.cost_micros,
                metrics.average_cpc,
                metrics.ctr
            FROM campaign
            WHERE campaign.id = {platform_campaign_id}
            AND segments.date BETWEEN '{date_from}' AND '{date_to}'
            ORDER BY segments.date
        """
        rows = await self._search(query)
        metrics = []
        for row in rows:
            m = row.get("metrics", {})
            cost = int(m.get("costMicros", 0)) / 1_000_000
            imps = int(m.get("impressions", 0))
            metrics.append(AdMetricResult(
                impressions=imps,
                clicks=int(m.get("clicks", 0)),
                conversions=int(float(m.get("conversions", 0))),
                spend=cost,
                cpc=float(m.get("averageCpc", 0)) / 1_000_000,
                cpm=(cost / imps * 1000) if imps > 0 else 0,
                ctr=float(m.get("ctr", 0)),
                raw=row,
            ))
        return metrics

    async def verify_credentials(self) -> bool:
        try:
            await self._search("SELECT customer.id FROM customer LIMIT 1")
            return True
        except Exception:
            return False

    def get_supported_objectives(self) -> list[dict[str, str]]:
        return [
            {"id": "awareness", "name": "Brand Awareness", "description": "Display campaigns for maximum reach"},
            {"id": "traffic", "name": "Website Traffic", "description": "Search campaigns for clicks"},
            {"id": "engagement", "name": "Engagement", "description": "Discovery campaigns"},
            {"id": "conversions", "name": "Conversions", "description": "Search campaigns optimized for conversions"},
        ]

    def get_targeting_options(self) -> dict[str, Any]:
        return {
            "age_ranges": ["18-24", "25-34", "35-44", "45-54", "55-64", "65+", "undetermined"],
            "genders": ["male", "female", "undetermined"],
            "locations": {"type": "geo_target_constant", "note": "Use Google Ads geo targeting search"},
            "keywords": {"type": "list", "match_types": ["BROAD", "PHRASE", "EXACT"]},
            "audiences": {"type": "audience_segments", "note": "In-market, affinity, custom segments"},
            "languages": ["ko", "en", "ja", "zh"],
            "devices": ["mobile", "desktop", "tablet"],
            "placements": ["search", "display", "youtube", "discovery", "gmail"],
        }
