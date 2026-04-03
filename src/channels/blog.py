from __future__ import annotations

from base64 import b64encode

import httpx

from src.channels.base import ChannelAdapter, MetricSnapshot, PublishResult
from src.config import settings


class WordPressAdapter(ChannelAdapter):
    name = "blog"

    def __init__(self) -> None:
        self._url = settings.wordpress_url.rstrip("/")
        self._user = settings.wordpress_username
        self._password = settings.wordpress_app_password

    def _auth_header(self) -> dict[str, str]:
        cred = b64encode(f"{self._user}:{self._password}".encode()).decode()
        return {"Authorization": f"Basic {cred}"}

    async def publish(self, text: str, media_url: str | None = None) -> PublishResult:
        url = f"{self._url}/wp-json/wp/v2/posts"
        # text format: first line = title, rest = content
        lines = text.strip().split("\n", 1)
        title = lines[0].strip("# ").strip()
        content = lines[1].strip() if len(lines) > 1 else ""

        payload = {
            "title": title,
            "content": content,
            "status": "publish",
        }
        if media_url:
            payload["featured_media_url"] = media_url

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=self._auth_header())

        if resp.status_code not in (200, 201):
            return PublishResult(success=False, error=f"{resp.status_code}: {resp.text}")

        data = resp.json()
        post_id = str(data.get("id", ""))
        link = data.get("link", "")
        return PublishResult(success=True, external_id=post_id, url=link)

    async def collect_metrics(self, external_id: str) -> MetricSnapshot:
        # WordPress doesn't have built-in analytics API
        # Metrics come from external tools (Google Analytics, Jetpack, etc.)
        # Return page view count if Jetpack stats are available
        url = f"{self._url}/wp-json/wp/v2/posts/{external_id}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._auth_header())

        if resp.status_code != 200:
            return MetricSnapshot()

        data = resp.json()
        # Try Jetpack stats endpoint as fallback
        stats_url = f"{self._url}/wp-json/wpcom/v2/sites/{self._url.split('//')[1]}/stats/post/{external_id}"
        async with httpx.AsyncClient() as client:
            stats_resp = await client.get(stats_url, headers=self._auth_header())

        views = 0
        raw = {}
        if stats_resp.status_code == 200:
            stats = stats_resp.json()
            views = stats.get("views", 0)
            raw = stats

        return MetricSnapshot(impressions=views, raw=raw)

    async def verify_credentials(self) -> bool:
        url = f"{self._url}/wp-json/wp/v2/users/me"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._auth_header())
        return resp.status_code == 200
