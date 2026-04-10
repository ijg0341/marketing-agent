from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config import agent_config, load_yaml, reload, save_yaml

router = APIRouter(prefix="/api/settings", tags=["settings"])

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"


# --- Models ---

class ProductConfig(BaseModel):
    name: str | None = None
    description: str | None = None
    website: str | None = None
    category: str | None = None


class BrandConfig(BaseModel):
    tone: str | None = None
    voice_guidelines: str | None = None
    language: str | None = None
    hashtag_pool: list[str] | None = None


class TargetAudienceConfig(BaseModel):
    demographics: dict[str, Any] | None = None
    pain_points: list[str] | None = None
    value_propositions: list[str] | None = None


class CompetitorConfig(BaseModel):
    name: str | None = None
    url: str | None = None


class AgentConfigUpdate(BaseModel):
    product: ProductConfig | None = None
    brand: BrandConfig | None = None
    target_audience: TargetAudienceConfig | None = None
    competitors: list[CompetitorConfig] | None = None
    context: str | None = None


class PlatformCredentials(BaseModel):
    credentials: dict[str, str]


class ChannelSettingsUpdate(BaseModel):
    enabled: bool | None = None
    posting_schedule: dict[str, Any] | None = None
    limits: dict[str, Any] | None = None


# --- Agent Config (Product/Brand/Audience) ---

@router.get("/agent")
async def get_agent_config():
    """Get the full agent configuration (product, brand, target audience, competitors)."""
    return load_yaml("agent.yaml")


@router.put("/agent")
async def update_agent_config(body: AgentConfigUpdate):
    """Update agent configuration."""
    config = load_yaml("agent.yaml")
    if body.product:
        existing = config.get("product", {})
        for k, v in body.product.model_dump(exclude_none=True).items():
            existing[k] = v
        config["product"] = existing
    if body.brand:
        existing = config.get("brand", {})
        for k, v in body.brand.model_dump(exclude_none=True).items():
            existing[k] = v
        config["brand"] = existing
    if body.target_audience:
        existing = config.get("target_audience", {})
        for k, v in body.target_audience.model_dump(exclude_none=True).items():
            existing[k] = v
        config["target_audience"] = existing
    if body.context is not None:
        config["context"] = body.context
    if body.competitors is not None:
        config["competitors"] = [c.model_dump(exclude_none=True) for c in body.competitors]
    save_yaml("agent.yaml", config)
    return config


# --- Channel Settings ---

@router.get("/channels")
async def get_channels():
    """Get all channel configurations."""
    return load_yaml("channels.yaml")


@router.put("/channels/{channel_id}")
async def update_channel(channel_id: str, body: ChannelSettingsUpdate):
    """Update a specific channel's settings."""
    channels = load_yaml("channels.yaml")
    if channel_id not in channels:
        raise HTTPException(status_code=404, detail=f"Channel '{channel_id}' not found")
    updates = body.model_dump(exclude_none=True)
    channels[channel_id].update(updates)
    save_yaml("channels.yaml", channels)
    # Reload in-memory channel config so the scheduler and agent see the new state
    agent_config.reload_channels()
    # Notify scheduler to add/remove jobs for this channel (WP3 will implement this)
    try:
        from src.scheduler import reload_scheduler_jobs  # noqa: PLC0415 — WP3 dependency
        reload_scheduler_jobs(channel_id, channels[channel_id].get("enabled", False))
    except ImportError:
        pass
    return channels[channel_id]


# --- Platform Credentials ---

def _read_env() -> dict[str, str]:
    """Read .env file into a dict."""
    env = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    return env


def _write_env(env: dict[str, str]) -> None:
    """Write dict back to .env file, preserving comments."""
    lines = []
    if ENV_PATH.exists():
        existing_lines = ENV_PATH.read_text().splitlines()
        written_keys = set()
        for line in existing_lines:
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and "=" in stripped:
                key = stripped.split("=", 1)[0].strip()
                if key in env:
                    lines.append(f"{key}={env[key]}")
                    written_keys.add(key)
                else:
                    lines.append(line)
            else:
                lines.append(line)
        # Add new keys not in original file
        for key, value in env.items():
            if key not in written_keys:
                lines.append(f"{key}={value}")
    else:
        for key, value in env.items():
            lines.append(f"{key}={value}")
    ENV_PATH.write_text("\n".join(lines) + "\n")


# Platform credential key mappings
PLATFORM_KEYS = {
    "twitter": {
        "keys": ["TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET", "TWITTER_BEARER_TOKEN"],
        "labels": {
            "TWITTER_API_KEY": "API Key",
            "TWITTER_API_SECRET": "API Secret",
            "TWITTER_ACCESS_TOKEN": "Access Token",
            "TWITTER_ACCESS_SECRET": "Access Secret",
            "TWITTER_BEARER_TOKEN": "Bearer Token",
        },
        "guide": {
            "url": "https://developer.x.com/en/portal/dashboard",
            "steps": [
                "1. [X Developer Portal](https://developer.x.com)에서 개발자 계정 가입 (X 계정으로 로그인 → Sign up)",
                "2. Free 플랜 선택 (트윗 게시만 할 경우 무료로 충분, 메트릭 조회는 Basic $200/월 필요)",
                "3. 가입 완료 시 기본 프로젝트와 앱이 자동 생성됨",
                "4. [Dashboard](https://developer.x.com/en/portal/dashboard)에서 앱 이름 클릭 → Keys and Tokens 탭",
                "5. API Key / API Secret 복사 (Consumer Keys 섹션)",
                "6. Access Token / Access Secret → Generate 버튼 클릭 후 복사",
                "7. Bearer Token → Generate 버튼 클릭 후 복사",
            ],
        },
    },
    "instagram": {
        "keys": ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID"],
        "labels": {
            "INSTAGRAM_ACCESS_TOKEN": "Access Token",
            "INSTAGRAM_BUSINESS_ACCOUNT_ID": "Business Account ID",
        },
        "guide": {
            "url": "https://developers.facebook.com/apps/",
            "steps": [
                "1. Facebook 비즈니스 페이지에 Instagram 프로페셔널 계정 연결",
                "2. [Meta for Developers](https://developers.facebook.com/apps/)에서 앱 생성 (Business 타입)",
                "3. Instagram Graph API 추가",
                "4. 앱 설정 > 기본 설정에서 앱 ID/Secret 확인",
                "5. [Graph API Explorer](https://developers.facebook.com/tools/explorer/)에서 Access Token 생성 (instagram_basic, instagram_content_publish 권한)",
                "6. Instagram Business Account ID는 /me/accounts API로 조회",
            ],
        },
    },
    "facebook": {
        "keys": ["FACEBOOK_PAGE_ACCESS_TOKEN", "FACEBOOK_PAGE_ID"],
        "labels": {
            "FACEBOOK_PAGE_ACCESS_TOKEN": "Page Access Token",
            "FACEBOOK_PAGE_ID": "Page ID",
        },
        "guide": {
            "url": "https://developers.facebook.com/tools/explorer/",
            "steps": [
                "1. [Facebook 페이지 만들기](https://www.facebook.com/pages/create)에서 비즈니스 페이지 생성 (없는 경우)",
                "2. [Meta for Developers](https://developers.facebook.com/apps/)에서 앱 생성",
                "3. [Graph API Explorer](https://developers.facebook.com/tools/explorer/)에서 페이지 권한 포함 토큰 생성 (pages_manage_posts, pages_read_engagement)",
                "4. Page ID는 페이지 설정 > 페이지 투명성에서 확인",
                "5. 장기 토큰이 필요하면 [Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)에서 연장",
            ],
        },
    },
    "blog": {
        "keys": ["WORDPRESS_URL", "WORDPRESS_USERNAME", "WORDPRESS_APP_PASSWORD"],
        "labels": {
            "WORDPRESS_URL": "WordPress Site URL",
            "WORDPRESS_USERNAME": "Username",
            "WORDPRESS_APP_PASSWORD": "Application Password",
        },
        "guide": {
            "url": "",
            "steps": [
                "1. WordPress 관리자 로그인 (yoursite.com/wp-admin)",
                "2. 사용자 > 프로필 > Application Passwords 섹션",
                "3. 새 Application Password 이름 입력 후 생성",
                "4. 생성된 비밀번호 복사 (한 번만 표시됨)",
                "5. WordPress URL은 사이트 주소 (예: https://myblog.com)",
            ],
        },
    },
    "email": {
        "keys": ["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"],
        "labels": {
            "SENDGRID_API_KEY": "API Key",
            "SENDGRID_FROM_EMAIL": "From Email Address",
        },
        "guide": {
            "url": "https://app.sendgrid.com/settings/api_keys",
            "steps": [
                "1. [SendGrid](https://signup.sendgrid.com/)에서 계정 생성",
                "2. [API Keys](https://app.sendgrid.com/settings/api_keys) > Create API Key",
                "3. Full Access 또는 Restricted Access (Mail Send 권한 필수) 선택",
                "4. 생성된 API Key 복사",
                "5. From Email은 [Sender Authentication](https://app.sendgrid.com/settings/sender_auth)에서 인증된 이메일 사용",
            ],
        },
    },
    "meta_ads": {
        "keys": ["META_ADS_ACCOUNT_ID", "META_ACCESS_TOKEN"],
        "labels": {
            "META_ADS_ACCOUNT_ID": "Ad Account ID",
            "META_ACCESS_TOKEN": "Access Token",
        },
        "guide": {
            "url": "https://business.facebook.com/settings/ad-accounts",
            "steps": [
                "1. [Meta 비즈니스 관리자](https://business.facebook.com/settings)에서 설정",
                "2. [광고 계정](https://business.facebook.com/settings/ad-accounts) 생성 또는 기존 계정 연결",
                "3. 광고 계정 ID는 설정 > 광고 계정 정보에서 확인 (act_ 제외한 숫자)",
                "4. [결제 수단](https://business.facebook.com/settings/payment-methods) 등록",
                "5. [Graph API Explorer](https://developers.facebook.com/tools/explorer/)에서 Access Token 생성 (ads_management, ads_read 권한)",
            ],
        },
    },
    "google_ads": {
        "keys": ["GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET"],
        "labels": {
            "GOOGLE_ADS_CUSTOMER_ID": "Customer ID (xxx-xxx-xxxx)",
            "GOOGLE_ADS_DEVELOPER_TOKEN": "Developer Token",
            "GOOGLE_ADS_REFRESH_TOKEN": "OAuth Refresh Token",
            "GOOGLE_ADS_CLIENT_ID": "OAuth Client ID",
            "GOOGLE_ADS_CLIENT_SECRET": "OAuth Client Secret",
        },
        "guide": {
            "url": "https://ads.google.com",
            "steps": [
                "1. [Google Ads](https://ads.google.com)에서 계정 생성",
                "2. Customer ID는 우측 상단에 표시 (xxx-xxx-xxxx 형식)",
                "3. 결제 수단 등록: 도구 및 설정 > 결제 > 결제 수단",
                "4. [Google Ads API](https://developers.google.com/google-ads/api/docs/get-started/introduction)에서 개발자 토큰 신청",
                "5. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 OAuth 2.0 클라이언트 ID/Secret 생성",
                "6. [OAuth Playground](https://developers.google.com/oauthplayground/)에서 Refresh Token 획득",
            ],
        },
    },
    "ga4": {
        "keys": ["GA4_PROPERTY_ID", "GA4_CREDENTIALS_JSON"],
        "labels": {
            "GA4_PROPERTY_ID": "GA4 Property ID (e.g. 123456789)",
            "GA4_CREDENTIALS_JSON": "Service Account JSON (full JSON string)",
        },
        "guide": {
            "url": "https://analytics.google.com",
            "steps": [
                "1. [Google Analytics](https://analytics.google.com)에서 GA4 속성 생성 (없는 경우)",
                "2. GA4 Property ID 확인: 관리 > 속성 설정 > 속성 ID (숫자)",
                "3. [Google Cloud Console > IAM](https://console.cloud.google.com/iam-admin/serviceaccounts)에서 서비스 계정 생성",
                "4. 서비스 계정에 'Analytics Viewer' 역할 부여",
                "5. [서비스 계정 키](https://console.cloud.google.com/iam-admin/serviceaccounts) > 키 탭 > JSON 키 생성 후 전체 내용 복사",
                "6. GA4 속성 > [관리 > 속성 액세스 관리](https://analytics.google.com/analytics/web/#/a-p/admin/property/access-management)에서 서비스 계정 이메일 추가",
            ],
        },
    },
    "twitter_ads": {
        "keys": ["TWITTER_ADS_ACCOUNT_ID"],
        "labels": {
            "TWITTER_ADS_ACCOUNT_ID": "Ads Account ID",
        },
        "guide": {
            "url": "https://ads.twitter.com",
            "steps": [
                "1. [X Ads](https://ads.twitter.com)에서 광고 계정 생성",
                "2. 결제 수단 등록: 설정 > 결제 수단 추가",
                "3. Ads Account ID는 URL에서 확인 (ads.twitter.com/accounts/xxxxx)",
                "4. [X Developer Portal](https://developer.x.com/en/portal/dashboard)에서 Ads API 액세스 별도 신청",
                "5. 기존 Twitter API Key/Secret/Token은 콘텐츠 채널용과 동일하게 사용",
            ],
        },
    },
}


@router.get("/platforms")
async def get_platforms():
    """Get all platform credential configurations with guides."""
    env = _read_env()
    result = {}
    for platform_id, config in PLATFORM_KEYS.items():
        connected = all(bool(env.get(k, "").strip()) for k in config["keys"])
        fields = []
        for key in config["keys"]:
            val = env.get(key, "")
            fields.append({
                "key": key,
                "label": config["labels"][key],
                "has_value": bool(val.strip()),
                "value_preview": f"{val[:4]}...{val[-4:]}" if len(val) > 12 else ("***" if val else ""),
            })
        result[platform_id] = {
            "id": platform_id,
            "connected": connected,
            "fields": fields,
            "guide": config["guide"],
        }
    return result


@router.put("/platforms/{platform_id}/credentials")
async def update_platform_credentials(platform_id: str, body: PlatformCredentials):
    """Update credentials for a specific platform."""
    if platform_id not in PLATFORM_KEYS:
        raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")
    allowed_keys = set(PLATFORM_KEYS[platform_id]["keys"])
    env = _read_env()
    for key, value in body.credentials.items():
        if key not in allowed_keys:
            raise HTTPException(status_code=400, detail=f"Invalid key '{key}' for platform '{platform_id}'")
        env[key] = value
        # Also update the runtime environment so changes take effect immediately
        os.environ[key] = value
    _write_env(env)
    # Reload settings singleton so credential changes take effect immediately in this process
    reload()
    return {"status": "updated", "platform": platform_id}


@router.post("/platforms/{platform_id}/test")
async def test_platform_connection(platform_id: str):
    """Test connection to a platform using stored credentials."""
    from src.ads.google_ads import GoogleAdsAdapter
    from src.ads.meta_ads import MetaAdsAdapter
    from src.ads.twitter_ads import TwitterAdsAdapter
    from src.channels.blog import BlogAdapter
    from src.channels.email_channel import EmailAdapter
    from src.channels.facebook import FacebookAdapter
    from src.channels.instagram import InstagramAdapter
    from src.channels.twitter import TwitterAdapter

    adapters = {
        "twitter": TwitterAdapter,
        "instagram": InstagramAdapter,
        "facebook": FacebookAdapter,
        "blog": BlogAdapter,
        "email": EmailAdapter,
        "meta_ads": MetaAdsAdapter,
        "google_ads": GoogleAdsAdapter,
        "twitter_ads": TwitterAdsAdapter,
    }
    adapter_cls = adapters.get(platform_id)
    if not adapter_cls:
        raise HTTPException(status_code=404, detail=f"No adapter for platform '{platform_id}'")
    try:
        adapter = adapter_cls()
        ok = await adapter.verify_credentials()
        return {"platform": platform_id, "connected": ok, "error": None}
    except Exception as e:
        return {"platform": platform_id, "connected": False, "error": str(e)}
