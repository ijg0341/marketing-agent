from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter

from src.config import load_yaml

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"


def _read_env() -> dict[str, str]:
    env = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    return env


@router.get("/status")
async def get_onboarding_status():
    """Check what setup steps are completed."""
    env = _read_env()
    agent = load_yaml("agent.yaml")
    channels = load_yaml("channels.yaml")

    # Step 1: Marketing target configured
    product = agent.get("product", {})
    has_context = bool(agent.get("context", "").strip())
    target_done = bool(
        product.get("name", "").strip()
        and product.get("name") != "My Product"
    ) and has_context

    # Step 2: At least one content platform connected
    content_platforms = {
        "twitter": ["TWITTER_API_KEY", "TWITTER_ACCESS_TOKEN"],
        "instagram": ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID"],
        "facebook": ["FACEBOOK_PAGE_ACCESS_TOKEN", "FACEBOOK_PAGE_ID"],
        "blog": ["WORDPRESS_URL", "WORDPRESS_APP_PASSWORD"],
        "email": ["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"],
    }
    connected_content = []
    for platform, keys in content_platforms.items():
        if all(bool(env.get(k, "").strip()) for k in keys):
            connected_content.append(platform)

    # Step 3: At least one ad platform connected
    ad_platforms = {
        "meta_ads": ["META_ADS_ACCOUNT_ID", "META_ACCESS_TOKEN"],
        "google_ads": ["GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN"],
        "twitter_ads": ["TWITTER_ADS_ACCOUNT_ID"],
    }
    connected_ads = []
    for platform, keys in ad_platforms.items():
        if all(bool(env.get(k, "").strip()) for k in keys):
            connected_ads.append(platform)

    # Step 4: At least one channel enabled
    enabled_channels = [name for name, cfg in channels.items() if cfg.get("enabled")]

    # Step 5: GA4 connected
    ga4_done = bool(env.get("GA4_PROPERTY_ID", "").strip() and env.get("GA4_CREDENTIALS_JSON", "").strip())

    # Step 6: Has published content
    # Check via DB — but for simplicity, check if reports exist
    reports_dir = Path(__file__).resolve().parent.parent.parent / "reports"
    has_reports = any(reports_dir.glob("daily_*.md")) if reports_dir.exists() else False

    steps = [
        {
            "id": "marketing_target",
            "title": "마케팅 대상 설정",
            "description": "제품/서비스 정보와 마케팅 브리핑을 등록하세요",
            "completed": target_done,
            "route": "/settings",
            "tab": "target",
        },
        {
            "id": "content_platform",
            "title": "콘텐츠 채널 연동",
            "description": "Twitter(X) API를 연결하여 콘텐츠 자동 게시를 시작하세요",
            "completed": len(connected_content) > 0,
            "connected": connected_content,
            "route": "/settings",
            "tab": "platforms",
        },
        {
            "id": "channel_enabled",
            "title": "채널 활성화",
            "description": "연동된 콘텐츠 채널을 활성화하여 자동 게시를 시작하세요",
            "completed": len(enabled_channels) > 0,
            "enabled": enabled_channels,
            "route": "/settings",
            "tab": "channels",
        },
        {
            "id": "ad_platform",
            "title": "광고 플랫폼 연동",
            "description": "최소 1개 광고 플랫폼(Meta/Google/Twitter)의 API를 연결하세요",
            "completed": len(connected_ads) > 0,
            "connected": connected_ads,
            "route": "/settings",
            "tab": "platforms",
            "optional": True,
        },
        {
            "id": "first_campaign",
            "title": "첫 광고 캠페인 생성",
            "description": "캠페인을 생성하여 광고 집행을 시작하세요",
            "completed": has_reports,  # TODO: check campaigns table instead
            "route": "/ads",
            "optional": True,
        },
        {
            "id": "ga4",
            "title": "Google Analytics 연동",
            "description": "GA4를 연결하면 광고 유입 → 사이트 전환까지 추적할 수 있습니다",
            "completed": ga4_done,
            "route": "/settings",
            "tab": "platforms",
            "optional": True,
        },
    ]

    completed_count = sum(1 for s in steps if s["completed"])
    total_required = sum(1 for s in steps if not s.get("optional"))
    required_done = sum(1 for s in steps if s["completed"] and not s.get("optional"))

    return {
        "steps": steps,
        "completed": completed_count,
        "total": len(steps),
        "required_done": required_done,
        "required_total": total_required,
        "all_required_complete": required_done >= total_required,
        "setup_complete": completed_count == len(steps),
    }
