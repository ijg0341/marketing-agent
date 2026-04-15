from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.ads.google_ads import GoogleAdsAdapter
from src.ads.meta_ads import MetaAdsAdapter
from src.ads.twitter_ads import TwitterAdsAdapter
from src.db.database import get_db
from src.db.repository import (
    AdGroupRepository,
    AdMetricRepository,
    AdRepository,
    CampaignRepository,
)

router = APIRouter(prefix="/api/ads", tags=["ads"])


# --- Pydantic Models ---

class CampaignCreate(BaseModel):
    platform: str  # twitter, meta, google
    name: str
    objective: str  # awareness, traffic, engagement, conversions
    daily_budget: float
    total_budget: float = 0.0
    currency: str = "KRW"
    bid_strategy: str = "auto"
    start_date: str | None = None
    end_date: str | None = None
    targeting: dict[str, Any] = {}


class CampaignUpdate(BaseModel):
    name: str | None = None
    daily_budget: float | None = None
    total_budget: float | None = None
    bid_strategy: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    targeting: dict[str, Any] | None = None


class AdCreate(BaseModel):
    ad_group_id: int
    name: str
    ad_type: str = "image"
    headline: str | None = None
    body_text: str | None = None
    media_url: str | None = None
    cta_type: str | None = None
    destination_url: str | None = None


class AdGroupCreate(BaseModel):
    campaign_id: int
    name: str
    targeting_override: dict[str, Any] | None = None
    bid_amount: float | None = None


# --- Helpers ---

def _get_adapter(platform: str):
    adapters = {
        "twitter": TwitterAdsAdapter,
        "meta": MetaAdsAdapter,
        "google": GoogleAdsAdapter,
    }
    cls = adapters.get(platform)
    if not cls:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    return cls()


def _campaign_to_dict(c) -> dict:
    return {
        "id": c.id,
        "platform": c.platform,
        "platform_campaign_id": c.platform_campaign_id,
        "name": c.name,
        "objective": c.objective,
        "status": c.status,
        "daily_budget": c.daily_budget,
        "total_budget": c.total_budget,
        "currency": c.currency,
        "bid_strategy": c.bid_strategy,
        "start_date": c.start_date.isoformat() if c.start_date else None,
        "end_date": c.end_date.isoformat() if c.end_date else None,
        "targeting": c.get_targeting(),
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


def _adgroup_to_dict(ag) -> dict:
    return {
        "id": ag.id,
        "campaign_id": ag.campaign_id,
        "platform_adgroup_id": ag.platform_adgroup_id,
        "name": ag.name,
        "status": ag.status,
        "targeting_override": ag.get_targeting_override(),
        "bid_amount": ag.bid_amount,
        "created_at": ag.created_at.isoformat() if ag.created_at else None,
    }


def _ad_to_dict(ad) -> dict:
    return {
        "id": ad.id,
        "ad_group_id": ad.ad_group_id,
        "platform_ad_id": ad.platform_ad_id,
        "name": ad.name,
        "ad_type": ad.ad_type,
        "headline": ad.headline,
        "body_text": ad.body_text,
        "media_url": ad.media_url,
        "cta_type": ad.cta_type,
        "destination_url": ad.destination_url,
        "status": ad.status,
        "created_at": ad.created_at.isoformat() if ad.created_at else None,
    }


# --- Platform Info ---

@router.get("/platforms")
async def list_platforms():
    """List available ad platforms with their objectives and targeting options."""
    platforms = []
    for AdapterCls in [TwitterAdsAdapter, MetaAdsAdapter, GoogleAdsAdapter]:
        adapter = AdapterCls()
        platforms.append({
            "id": adapter.platform,
            "name": {"twitter": "Twitter / X", "meta": "Meta (Facebook & Instagram)", "google": "Google Ads"}[adapter.platform],
            "objectives": adapter.get_supported_objectives(),
            "targeting_options": adapter.get_targeting_options(),
        })
    return platforms


# --- Campaigns ---

@router.get("/campaigns")
async def list_campaigns(platform: str | None = None, status: str | None = None, db: Session = Depends(get_db)):
    repo = CampaignRepository(db)
    campaigns = repo.list_all(platform=platform, status=status)
    return [_campaign_to_dict(c) for c in campaigns]


@router.post("/campaigns")
async def create_campaign(body: CampaignCreate, db: Session = Depends(get_db)):
    repo = CampaignRepository(db)
    targeting_json = json.dumps(body.targeting, ensure_ascii=False) if body.targeting else None
    campaign = repo.create(
        platform=body.platform,
        name=body.name,
        objective=body.objective,
        daily_budget=body.daily_budget,
        total_budget=body.total_budget,
        currency=body.currency,
        bid_strategy=body.bid_strategy,
        targeting=targeting_json,
    )
    return _campaign_to_dict(campaign)


@router.post("/campaigns/draft")
async def create_campaign_draft(db: Session = Depends(get_db)):
    """AI-generate a Twitter Ads campaign draft based on product info and strategy."""
    from src.config import agent_config

    # Read product info and ad strategy
    product = agent_config.product
    brand = agent_config.brand
    target = agent_config.target_audience
    strategy = agent_config.strategy.get("ad_strategy", {})
    budget_info = agent_config.strategy.get("marketing_budget", {})

    # Build AI prompt
    prompt = f"""You are a Twitter Ads campaign strategist. Create a campaign for this product:

Product: {product.get('name', '')} - {product.get('description', '')}
Website: {product.get('website', '')}
Brand tone: {brand.get('tone', '')}
Target audience: {target.get('demographics', {})}
Pain points: {target.get('pain_points', [])}
Ad strategy: {strategy}
Monthly budget: {budget_info.get('total_budget', 0)} KRW

Design a Twitter Ads campaign. Return ONLY valid JSON (no markdown):
{{
    "name": "campaign name in Korean",
    "objective": "traffic",
    "daily_budget": 10000,
    "targeting": {{
        "age_range": "25-44",
        "gender": "all",
        "interests": ["technology", "productivity"],
        "keywords": ["기획", "PM", "UX"],
        "languages": ["ko"],
        "locations": ["South Korea"]
    }},
    "ad_text": "광고 소재 텍스트 (140자 이내)",
    "headline": "헤드라인 텍스트"
}}"""

    # Try Anthropic SDK
    campaign_data = None
    try:
        import anthropic
        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text
        # Try to parse JSON from response
        if "```" in text:
            text = text.split("```")[1].strip()
            if text.startswith("json"):
                text = text[4:].strip()
        campaign_data = json.loads(text)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("AI draft generation failed: %s. Using template.", e)

    # Fallback template if AI fails
    if not campaign_data:
        campaign_data = {
            "name": f"{product.get('name', 'Product')} 트래픽 캠페인",
            "objective": "traffic",
            "daily_budget": 10000,
            "targeting": {
                "age_range": "25-44",
                "gender": "all",
                "interests": ["technology"],
                "keywords": ["기획", "PM"],
                "languages": ["ko"],
                "locations": ["South Korea"],
            },
            "ad_text": f"{product.get('name', '')} - {product.get('description', '')}",
            "headline": product.get("name", "Product"),
        }

    # Save as draft campaign
    repo = CampaignRepository(db)
    campaign = repo.create(
        platform="twitter",
        name=campaign_data.get("name", "AI Generated Campaign"),
        objective=campaign_data.get("objective", "traffic"),
        daily_budget=campaign_data.get("daily_budget", 10000),
        total_budget=budget_info.get("total_budget", 0),
        targeting=campaign_data.get("targeting", {}),
        status="draft",
    )

    return {
        "campaign": {
            "id": campaign.id,
            "name": campaign.name,
            "platform": campaign.platform,
            "objective": campaign.objective,
            "daily_budget": campaign.daily_budget,
            "targeting": campaign.targeting_data,
            "status": campaign.status,
        },
        "ai_suggestion": {
            "ad_text": campaign_data.get("ad_text", ""),
            "headline": campaign_data.get("headline", ""),
        },
    }


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    repo = CampaignRepository(db)
    campaign = repo.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _campaign_to_dict(campaign)


@router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: int, body: CampaignUpdate, db: Session = Depends(get_db)):
    repo = CampaignRepository(db)
    updates = body.model_dump(exclude_none=True)
    if "targeting" in updates:
        updates["targeting"] = json.dumps(updates["targeting"], ensure_ascii=False)
    campaign = repo.update(campaign_id, **updates)
    return _campaign_to_dict(campaign)


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    repo = CampaignRepository(db)
    repo.delete(campaign_id)
    return {"status": "deleted"}


@router.post("/campaigns/{campaign_id}/activate")
async def activate_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """Sync campaign to the ad platform and set to active."""
    repo = CampaignRepository(db)
    campaign = repo.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    adapter = _get_adapter(campaign.platform)
    try:
        result = await adapter.create_campaign(
            name=campaign.name,
            objective=campaign.objective,
            daily_budget=campaign.daily_budget,
            currency=campaign.currency,
            targeting=campaign.get_targeting(),
            start_date=campaign.start_date.isoformat() if campaign.start_date else None,
            end_date=campaign.end_date.isoformat() if campaign.end_date else None,
            bid_strategy=campaign.bid_strategy,
        )
        repo.update(campaign_id, platform_campaign_id=result.platform_id, status="active")
        return {"status": "activated", "platform_id": result.platform_id}
    except Exception as e:
        repo.update(campaign_id, status="error")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: int, db: Session = Depends(get_db)):
    repo = CampaignRepository(db)
    campaign = repo.get(campaign_id)
    if not campaign or not campaign.platform_campaign_id:
        raise HTTPException(status_code=400, detail="Campaign not synced to platform")
    adapter = _get_adapter(campaign.platform)
    await adapter.pause_campaign(campaign.platform_campaign_id)
    repo.update(campaign_id, status="paused")
    return {"status": "paused"}


@router.post("/campaigns/{campaign_id}/resume")
async def resume_campaign(campaign_id: int, db: Session = Depends(get_db)):
    repo = CampaignRepository(db)
    campaign = repo.get(campaign_id)
    if not campaign or not campaign.platform_campaign_id:
        raise HTTPException(status_code=400, detail="Campaign not synced to platform")
    adapter = _get_adapter(campaign.platform)
    await adapter.resume_campaign(campaign.platform_campaign_id)
    repo.update(campaign_id, status="active")
    return {"status": "active"}


# --- Ad Groups ---

@router.get("/campaigns/{campaign_id}/adgroups")
async def list_adgroups(campaign_id: int, db: Session = Depends(get_db)):
    repo = AdGroupRepository(db)
    return [_adgroup_to_dict(ag) for ag in repo.list_by_campaign(campaign_id)]


@router.post("/adgroups")
async def create_adgroup(body: AdGroupCreate, db: Session = Depends(get_db)):
    repo = AdGroupRepository(db)
    kwargs: dict[str, Any] = {"campaign_id": body.campaign_id, "name": body.name}
    if body.bid_amount is not None:
        kwargs["bid_amount"] = body.bid_amount
    if body.targeting_override:
        kwargs["targeting_override"] = json.dumps(body.targeting_override, ensure_ascii=False)
    ag = repo.create(**kwargs)
    return _adgroup_to_dict(ag)


# --- Ads ---

@router.get("/adgroups/{adgroup_id}/ads")
async def list_ads(adgroup_id: int, db: Session = Depends(get_db)):
    repo = AdRepository(db)
    return [_ad_to_dict(ad) for ad in repo.list_by_adgroup(adgroup_id)]


@router.post("/ads")
async def create_ad(body: AdCreate, db: Session = Depends(get_db)):
    repo = AdRepository(db)
    ad = repo.create(**body.model_dump())
    return _ad_to_dict(ad)


# --- Metrics ---

@router.get("/campaigns/{campaign_id}/metrics")
async def get_campaign_metrics(campaign_id: int, days: int = 7, db: Session = Depends(get_db)):
    repo = AdMetricRepository(db)
    summary = repo.get_campaign_summary(campaign_id, days=days)
    daily = repo.get_daily_metrics(campaign_id, days=days)
    return {
        "summary": summary,
        "daily": [
            {
                "date": m.date.isoformat() if m.date else None,
                "impressions": m.impressions,
                "clicks": m.clicks,
                "conversions": m.conversions,
                "spend": m.spend,
                "cpc": m.cpc,
                "ctr": m.ctr,
                "roas": m.roas,
            }
            for m in daily
        ],
    }


@router.post("/campaigns/{campaign_id}/metrics/collect")
async def collect_campaign_metrics(campaign_id: int, date_from: str, date_to: str, db: Session = Depends(get_db)):
    """Pull metrics from the ad platform and store locally."""
    c_repo = CampaignRepository(db)
    m_repo = AdMetricRepository(db)
    campaign = c_repo.get(campaign_id)
    if not campaign or not campaign.platform_campaign_id:
        raise HTTPException(status_code=400, detail="Campaign not synced to platform")
    adapter = _get_adapter(campaign.platform)
    results = await adapter.get_campaign_metrics(campaign.platform_campaign_id, date_from, date_to)
    for r in results:
        m_repo.record(
            campaign_id=campaign_id,
            platform=campaign.platform,
            impressions=r.impressions,
            clicks=r.clicks,
            conversions=r.conversions,
            spend=r.spend,
            cpc=r.cpc,
            cpm=r.cpm,
            ctr=r.ctr,
            roas=r.roas,
            raw_data=json.dumps(r.raw) if r.raw else None,
        )
    return {"collected": len(results)}
