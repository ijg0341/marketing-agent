from __future__ import annotations

import httpx

from src.channels.base import ChannelAdapter, MetricSnapshot, PublishResult
from src.config import settings

GRAPH_API = "https://graph.facebook.com/v21.0"


class InstagramAdapter(ChannelAdapter):
    name = "instagram"

    def __init__(self) -> None:
        self._token = settings.instagram_access_token
        self._account_id = settings.instagram_business_account_id

    async def publish(self, text: str, media_url: str | None = None) -> PublishResult:
        if not media_url:
            return PublishResult(success=False, error="Instagram requires media_url for posts")

        async with httpx.AsyncClient() as client:
            # Step 1: Create media container
            create_url = f"{GRAPH_API}/{self._account_id}/media"
            create_payload = {
                "image_url": media_url,
                "caption": text,
                "access_token": self._token,
            }
            resp = await client.post(create_url, data=create_payload)
            if resp.status_code != 200:
                return PublishResult(success=False, error=f"Container creation failed: {resp.text}")

            container_id = resp.json().get("id")
            if not container_id:
                return PublishResult(success=False, error="No container ID returned")

            # Step 2: Publish the container
            publish_url = f"{GRAPH_API}/{self._account_id}/media_publish"
            publish_payload = {
                "creation_id": container_id,
                "access_token": self._token,
            }
            resp = await client.post(publish_url, data=publish_payload)
            if resp.status_code != 200:
                return PublishResult(success=False, error=f"Publish failed: {resp.text}")

            media_id = resp.json().get("id")
            return PublishResult(
                success=True,
                external_id=media_id,
                url=f"https://www.instagram.com/p/{media_id}/" if media_id else None,
            )

    async def collect_metrics(self, external_id: str) -> MetricSnapshot:
        url = f"{GRAPH_API}/{external_id}/insights"
        params = {
            "metric": "impressions,reach,likes,comments,shares,saved",
            "access_token": self._token,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params)

        if resp.status_code != 200:
            return MetricSnapshot()

        raw = {}
        for item in resp.json().get("data", []):
            raw[item["name"]] = item["values"][0]["value"] if item.get("values") else 0

        impressions = raw.get("impressions", 0)
        engagements = raw.get("likes", 0) + raw.get("comments", 0) + raw.get("shares", 0) + raw.get("saved", 0)
        rate = engagements / impressions if impressions > 0 else 0

        return MetricSnapshot(
            impressions=impressions,
            engagements=engagements,
            engagement_rate=round(rate, 4),
            raw=raw,
        )

    async def verify_credentials(self) -> bool:
        url = f"{GRAPH_API}/{self._account_id}"
        params = {"fields": "id,username", "access_token": self._token}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params)
        return resp.status_code == 200
