from __future__ import annotations

import httpx

from src.channels.base import ChannelAdapter, MetricSnapshot, PublishResult
from src.config import settings

GRAPH_API = "https://graph.facebook.com/v21.0"


class FacebookAdapter(ChannelAdapter):
    name = "facebook"

    def __init__(self) -> None:
        self._token = settings.facebook_page_access_token
        self._page_id = settings.facebook_page_id

    async def publish(self, text: str, media_url: str | None = None) -> PublishResult:
        async with httpx.AsyncClient() as client:
            if media_url:
                url = f"{GRAPH_API}/{self._page_id}/photos"
                payload = {
                    "url": media_url,
                    "message": text,
                    "access_token": self._token,
                }
            else:
                url = f"{GRAPH_API}/{self._page_id}/feed"
                payload = {
                    "message": text,
                    "access_token": self._token,
                }

            resp = await client.post(url, data=payload)
            if resp.status_code != 200:
                return PublishResult(success=False, error=f"{resp.status_code}: {resp.text}")

            post_id = resp.json().get("id") or resp.json().get("post_id")
            return PublishResult(
                success=True,
                external_id=post_id,
                url=f"https://www.facebook.com/{post_id}" if post_id else None,
            )

    async def collect_metrics(self, external_id: str) -> MetricSnapshot:
        url = f"{GRAPH_API}/{external_id}/insights"
        params = {
            "metric": "post_impressions,post_engaged_users,post_clicks,post_reactions_by_type_total",
            "access_token": self._token,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params)

        if resp.status_code != 200:
            return MetricSnapshot()

        raw = {}
        for item in resp.json().get("data", []):
            val = item["values"][0]["value"] if item.get("values") else 0
            raw[item["name"]] = val

        impressions = raw.get("post_impressions", 0)
        engagements = raw.get("post_engaged_users", 0)
        clicks = raw.get("post_clicks", 0)
        rate = engagements / impressions if impressions > 0 else 0

        return MetricSnapshot(
            impressions=impressions,
            engagements=engagements,
            clicks=clicks,
            engagement_rate=round(rate, 4),
            raw=raw,
        )

    async def verify_credentials(self) -> bool:
        url = f"{GRAPH_API}/{self._page_id}"
        params = {"fields": "id,name", "access_token": self._token}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params)
        return resp.status_code == 200
