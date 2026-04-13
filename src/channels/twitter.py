from __future__ import annotations

import hashlib
import hmac
import asyncio
import logging
import secrets
import time
from base64 import b64encode
from urllib.parse import quote

import httpx

from src.channels.base import ChannelAdapter, MetricSnapshot, PublishResult
from src.config import settings

logger = logging.getLogger(__name__)

API_BASE = "https://api.twitter.com/2"


class TwitterAdapter(ChannelAdapter):
    name = "twitter"

    def __init__(self) -> None:
        self._bearer = settings.twitter_bearer_token
        self._api_key = settings.twitter_api_key
        self._api_secret = settings.twitter_api_secret
        self._access_token = settings.twitter_access_token
        self._access_secret = settings.twitter_access_secret

    def _oauth_headers(self, method: str, url: str) -> dict[str, str]:
        ts = str(int(time.time()))
        nonce = secrets.token_urlsafe(32)
        params = {
            "oauth_consumer_key": self._api_key,
            "oauth_nonce": nonce,
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": ts,
            "oauth_token": self._access_token,
            "oauth_version": "1.0",
        }
        param_str = "&".join(f"{quote(k)}={quote(v)}" for k, v in sorted(params.items()))
        base_string = f"{method.upper()}&{quote(url, safe='')}&{quote(param_str, safe='')}"
        signing_key = f"{quote(self._api_secret)}&{quote(self._access_secret)}"
        sig = b64encode(
            hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
        ).decode()
        params["oauth_signature"] = sig
        auth_header = "OAuth " + ", ".join(
            f'{quote(k)}="{quote(v)}"' for k, v in sorted(params.items())
        )
        return {"Authorization": auth_header}

    async def publish(self, text: str, media_url: str | None = None) -> PublishResult:
        url = f"{API_BASE}/tweets"
        payload = {"text": text}
        max_attempts = 3
        last_error: str = ""

        for attempt in range(1, max_attempts + 1):
            try:
                headers = self._oauth_headers("POST", url)
                headers["Content-Type"] = "application/json"
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)

                if resp.status_code in (200, 201):
                    data = resp.json().get("data", {})
                    tweet_id = data.get("id")
                    return PublishResult(
                        success=True,
                        external_id=tweet_id,
                        url=f"https://x.com/i/status/{tweet_id}" if tweet_id else None,
                    )

                if resp.status_code == 429:
                    retry_after = resp.headers.get("retry-after", "unknown")
                    logger.warning(
                        "Twitter rate limit hit (attempt %d/%d). retry-after: %s",
                        attempt, max_attempts, retry_after,
                    )
                    last_error = f"429 rate limited (retry-after: {retry_after})"
                    if attempt < max_attempts:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        continue

                elif resp.status_code in (500, 502, 503):
                    logger.warning(
                        "Twitter transient error %d (attempt %d/%d): %s",
                        resp.status_code, attempt, max_attempts, resp.text[:200],
                    )
                    last_error = f"{resp.status_code}: {resp.text}"
                    if attempt < max_attempts:
                        wait = 2 ** attempt
                        await asyncio.sleep(wait)
                        continue

                else:
                    logger.error(
                        "Twitter HTTP error %d: %s",
                        resp.status_code, resp.text[:500],
                    )
                    return PublishResult(success=False, error=f"{resp.status_code}: {resp.text}")

            except httpx.TimeoutException as exc:
                logger.error(
                    "Twitter request timed out (attempt %d/%d): %s",
                    attempt, max_attempts, exc,
                )
                last_error = f"Request timed out: {exc}"
                if attempt < max_attempts:
                    wait = 2 ** attempt
                    await asyncio.sleep(wait)
                    continue
                raise RuntimeError(f"Twitter publish failed after {max_attempts} attempts due to timeout") from exc

        return PublishResult(success=False, error=last_error)

    async def collect_metrics(self, external_id: str) -> MetricSnapshot:
        url = f"{API_BASE}/tweets/{external_id}"
        params = {"tweet.fields": "public_metrics"}
        headers = {"Authorization": f"Bearer {self._bearer}"}
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params=params, headers=headers)
        except Exception:
            logger.exception("Twitter collect_metrics request failed for tweet %s", external_id)
            return MetricSnapshot()
        if resp.status_code in (401, 403):
            logger.warning(
                "Twitter Free Tier: public_metrics unavailable. "
                "Upgrade to Basic ($200/mo) for full analytics."
            )
            return MetricSnapshot()
        if resp.status_code != 200:
            return MetricSnapshot()
        metrics = resp.json().get("data", {}).get("public_metrics", {})
        impressions = metrics.get("impression_count", 0)
        engagements = (
            metrics.get("like_count", 0)
            + metrics.get("retweet_count", 0)
            + metrics.get("reply_count", 0)
            + metrics.get("quote_count", 0)
        )
        rate = engagements / impressions if impressions > 0 else 0
        return MetricSnapshot(
            impressions=impressions,
            engagements=engagements,
            clicks=metrics.get("url_link_clicks", 0),
            engagement_rate=round(rate, 4),
            raw=metrics,
        )

    async def verify_credentials(self) -> bool:
        url = f"{API_BASE}/users/me"
        try:
            headers = self._oauth_headers("GET", url)
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
            return resp.status_code == 200
        except Exception as e:
            logger.error("Twitter verify_credentials failed: %s", e)
            return False
