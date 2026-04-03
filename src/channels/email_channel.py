from __future__ import annotations

import httpx

from src.channels.base import ChannelAdapter, MetricSnapshot, PublishResult
from src.config import settings

SENDGRID_API = "https://api.sendgrid.com/v3"


class SendGridAdapter(ChannelAdapter):
    name = "email"

    def __init__(self) -> None:
        self._api_key = settings.sendgrid_api_key
        self._from_email = settings.sendgrid_from_email

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def publish(self, text: str, media_url: str | None = None) -> PublishResult:
        # text format: first line = subject, second line = recipient list name or emails, rest = body
        lines = text.strip().split("\n", 2)
        if len(lines) < 3:
            return PublishResult(success=False, error="Email format: line1=subject, line2=to_emails(comma-sep), line3+=html_body")

        subject = lines[0].strip()
        recipients = [e.strip() for e in lines[1].split(",")]
        body = lines[2].strip()

        personalizations = [{"to": [{"email": r} for r in recipients]}]

        payload = {
            "personalizations": personalizations,
            "from": {"email": self._from_email},
            "subject": subject,
            "content": [{"type": "text/html", "value": body}],
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{SENDGRID_API}/mail/send", json=payload, headers=self._headers())

        if resp.status_code in (200, 202):
            msg_id = resp.headers.get("X-Message-Id", "")
            return PublishResult(success=True, external_id=msg_id)
        return PublishResult(success=False, error=f"{resp.status_code}: {resp.text}")

    async def collect_metrics(self, external_id: str) -> MetricSnapshot:
        # SendGrid global stats for the last day
        url = f"{SENDGRID_API}/stats"
        params = {"start_date": "2026-01-01", "limit": 1, "offset": 0}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=self._headers())

        if resp.status_code != 200:
            return MetricSnapshot()

        data = resp.json()
        if not data:
            return MetricSnapshot()

        stats = data[0].get("stats", [{}])[0].get("metrics", {})
        delivered = stats.get("delivered", 0)
        opens = stats.get("unique_opens", 0)
        clicks = stats.get("unique_clicks", 0)
        rate = opens / delivered if delivered > 0 else 0

        return MetricSnapshot(
            impressions=delivered,
            engagements=opens,
            clicks=clicks,
            engagement_rate=round(rate, 4),
            raw=stats,
        )

    async def verify_credentials(self) -> bool:
        url = f"{SENDGRID_API}/user/profile"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers())
        return resp.status_code == 200
