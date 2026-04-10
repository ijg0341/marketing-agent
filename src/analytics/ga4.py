from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class GA4Client:
    """Google Analytics 4 Data API client using service account credentials."""

    API_BASE = "https://analyticsdata.googleapis.com/v1beta"

    def __init__(self) -> None:
        self.property_id = os.getenv("GA4_PROPERTY_ID", "")
        self._creds_json = os.getenv("GA4_CREDENTIALS_JSON", "")
        self._access_token: str | None = None
        self._token_expiry: float = 0

    def is_configured(self) -> bool:
        return bool(self.property_id and self._creds_json)

    async def _get_access_token(self) -> str:
        if self._access_token and time.time() < self._token_expiry:
            return self._access_token

        try:
            creds = json.loads(self._creds_json)
        except (json.JSONDecodeError, TypeError):
            raise RuntimeError("Invalid GA4_CREDENTIALS_JSON")

        # Build JWT for service account
        import base64

        now = int(time.time())
        header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode()).rstrip(b"=")
        payload = base64.urlsafe_b64encode(json.dumps({
            "iss": creds.get("client_email", ""),
            "scope": "https://www.googleapis.com/auth/analytics.readonly",
            "aud": "https://oauth2.googleapis.com/token",
            "iat": now,
            "exp": now + 3600,
        }).encode()).rstrip(b"=")

        signing_input = header + b"." + payload

        # RS256 signing with private key
        try:
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import padding

            private_key = serialization.load_pem_private_key(
                creds["private_key"].encode(), password=None
            )
            signature = private_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
            sig_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=")
        except ImportError:
            # Fallback: if cryptography not installed, raise clear error
            raise RuntimeError("Install 'cryptography' package for GA4 service account auth: pip install cryptography")

        jwt_token = (signing_input + b"." + sig_b64).decode()

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": jwt_token,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            self._access_token = data["access_token"]
            self._token_expiry = time.time() + data.get("expires_in", 3600) - 60
            return self._access_token

    async def _request(self, method: str, path: str, json_body: dict | None = None) -> dict:
        token = await self._get_access_token()
        url = f"{self.API_BASE}/properties/{self.property_id}{path}"
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(method, url, headers=headers, json=json_body)
            resp.raise_for_status()
            return resp.json()

    async def run_report(
        self,
        date_from: str,
        date_to: str,
        dimensions: list[str] | None = None,
        metrics: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Run a GA4 report. Dates in YYYY-MM-DD format."""
        if not self.is_configured():
            return []

        if metrics is None:
            metrics = ["sessions", "totalUsers", "screenPageViews", "conversions", "eventCount"]

        body: dict[str, Any] = {
            "dateRanges": [{"startDate": date_from, "endDate": date_to}],
            "metrics": [{"name": m} for m in metrics],
        }
        if dimensions:
            body["dimensions"] = [{"name": d} for d in dimensions]

        result = await self._request("POST", ":runReport", json_body=body)

        rows = []
        metric_headers = [h["name"] for h in result.get("metricHeaders", [])]
        dim_headers = [h["name"] for h in result.get("dimensionHeaders", [])]

        for row in result.get("rows", []):
            entry: dict[str, Any] = {}
            for i, dim in enumerate(row.get("dimensionValues", [])):
                entry[dim_headers[i]] = dim["value"]
            for i, met in enumerate(row.get("metricValues", [])):
                entry[metric_headers[i]] = met["value"]
            rows.append(entry)

        return rows

    async def get_overview(self, date_from: str, date_to: str) -> dict[str, Any]:
        """Get high-level GA4 overview metrics."""
        rows = await self.run_report(
            date_from, date_to,
            metrics=["sessions", "totalUsers", "newUsers", "screenPageViews",
                     "averageSessionDuration", "bounceRate", "conversions", "eventCount"],
        )
        if rows:
            return rows[0]
        return {}

    async def get_traffic_by_source(self, date_from: str, date_to: str) -> list[dict]:
        """Get traffic breakdown by source/medium."""
        return await self.run_report(
            date_from, date_to,
            dimensions=["sessionSourceMedium"],
            metrics=["sessions", "totalUsers", "conversions", "eventCount"],
        )

    async def get_traffic_by_channel(self, date_from: str, date_to: str) -> list[dict]:
        """Get traffic breakdown by default channel grouping."""
        return await self.run_report(
            date_from, date_to,
            dimensions=["sessionDefaultChannelGroup"],
            metrics=["sessions", "totalUsers", "screenPageViews", "conversions"],
        )

    async def get_daily_metrics(self, date_from: str, date_to: str) -> list[dict]:
        """Get daily metrics for trend charts."""
        return await self.run_report(
            date_from, date_to,
            dimensions=["date"],
            metrics=["sessions", "totalUsers", "screenPageViews", "conversions"],
        )

    async def get_top_pages(self, date_from: str, date_to: str, limit: int = 10) -> list[dict]:
        """Get top pages by views."""
        rows = await self.run_report(
            date_from, date_to,
            dimensions=["pagePath", "pageTitle"],
            metrics=["screenPageViews", "totalUsers", "averageSessionDuration"],
        )
        return sorted(rows, key=lambda r: int(r.get("screenPageViews", 0)), reverse=True)[:limit]

    async def verify_connection(self) -> bool:
        """Test GA4 connection."""
        if not self.is_configured():
            return False
        try:
            await self.get_overview("yesterday", "yesterday")
            return True
        except Exception as e:
            logger.error(f"GA4 connection test failed: {e}")
            return False
