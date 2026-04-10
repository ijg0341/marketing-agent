from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter

from src.analytics.ga4 import GA4Client

router = APIRouter(prefix="/api/ga4", tags=["ga4"])

_client = GA4Client()

PERIOD_MAP = {
    "24h": 1,
    "7d": 7,
    "30d": 30,
    "90d": 90,
}


def _date_range(period: str) -> tuple[str, str]:
    days = PERIOD_MAP.get(period, 7)
    end = datetime.now()
    start = end - timedelta(days=days)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


@router.get("/status")
async def ga4_status():
    """Check if GA4 is configured."""
    return {"configured": _client.is_configured()}


@router.get("/overview")
async def ga4_overview(period: str = "7d"):
    """Get GA4 overview metrics."""
    if not _client.is_configured():
        return {"configured": False, "data": None}
    date_from, date_to = _date_range(period)
    data = await _client.get_overview(date_from, date_to)
    return {"configured": True, "period": period, "data": data}


@router.get("/traffic/sources")
async def ga4_traffic_sources(period: str = "7d"):
    if not _client.is_configured():
        return {"configured": False, "data": []}
    date_from, date_to = _date_range(period)
    data = await _client.get_traffic_by_source(date_from, date_to)
    return {"configured": True, "data": data}


@router.get("/traffic/channels")
async def ga4_traffic_channels(period: str = "7d"):
    if not _client.is_configured():
        return {"configured": False, "data": []}
    date_from, date_to = _date_range(period)
    data = await _client.get_traffic_by_channel(date_from, date_to)
    return {"configured": True, "data": data}


@router.get("/daily")
async def ga4_daily(period: str = "7d"):
    if not _client.is_configured():
        return {"configured": False, "data": []}
    date_from, date_to = _date_range(period)
    data = await _client.get_daily_metrics(date_from, date_to)
    return {"configured": True, "data": data}


@router.get("/pages")
async def ga4_top_pages(period: str = "7d", limit: int = 10):
    if not _client.is_configured():
        return {"configured": False, "data": []}
    date_from, date_to = _date_range(period)
    data = await _client.get_top_pages(date_from, date_to, limit)
    return {"configured": True, "data": data}


@router.post("/test")
async def ga4_test():
    """Test GA4 connection."""
    if not _client.is_configured():
        return {"connected": False, "error": "GA4_PROPERTY_ID and GA4_CREDENTIALS_JSON not set"}
    ok = await _client.verify_connection()
    return {"connected": ok, "error": None if ok else "Connection failed"}
