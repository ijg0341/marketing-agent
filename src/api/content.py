from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config import agent_config
from src.content.publisher import publish_queued
from src.db.database import get_db
from src.db.models import Content
from src.db.repository import AssetRepository, ContentRepository

router = APIRouter(prefix="/api/content", tags=["content"])


class ContentCreate(BaseModel):
    channel: str
    content_text: str
    media_url: str | None = None
    template_version: str | None = None


class ContentUpdate(BaseModel):
    content_text: str | None = None
    media_url: str | None = None
    channel: str | None = None


class ContentResponse(BaseModel):
    id: int
    channel: str
    content_text: str
    status: str
    created_at: str
    posted_at: str | None = None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[dict[str, Any]])
async def list_content(
    status: str | None = None,
    channel: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = select(Content)
    if status is not None:
        q = q.where(Content.status == status)
    if channel is not None:
        q = q.where(Content.channel == channel)
    q = q.order_by(Content.created_at.desc()).limit(limit)
    items = list(db.scalars(q).all())
    return [
        {
            "id": c.id,
            "channel": c.channel,
            "content_text": c.content_text,
            "media_url": c.media_url,
            "status": c.status,
            "created_at": str(c.created_at),
            "posted_at": str(c.posted_at) if c.posted_at else None,
            "external_id": c.external_id,
        }
        for c in items
    ]


@router.post("", response_model=dict[str, Any])
async def create_content(body: ContentCreate, db: Session = Depends(get_db)):
    repo = ContentRepository(db)
    asset_repo = AssetRepository(db)
    strategy = agent_config.strategy
    content = repo.create(
        channel=body.channel,
        content_text=body.content_text,
        media_url=body.media_url,
        template_version=body.template_version,
        strategy_version=strategy.get("version"),
    )
    asset_repo.mark_used_in_content(body.content_text, body.media_url)
    return {"id": content.id, "status": content.status, "channel": content.channel}


@router.post("/batch", response_model=dict[str, Any])
async def create_batch(items: list[ContentCreate], db: Session = Depends(get_db)):
    repo = ContentRepository(db)
    asset_repo = AssetRepository(db)
    strategy = agent_config.strategy
    created = []
    for item in items:
        c = repo.create(
            channel=item.channel,
            content_text=item.content_text,
            media_url=item.media_url,
            template_version=item.template_version,
            strategy_version=strategy.get("version"),
        )
        asset_repo.mark_used_in_content(item.content_text, item.media_url)
        created.append({"id": c.id, "channel": c.channel})
    return {"created": len(created), "items": created}


@router.get("/queued")
async def get_queued(channel: str | None = None, db: Session = Depends(get_db)):
    repo = ContentRepository(db)
    items = repo.get_queued(channel)
    return [
        {
            "id": c.id,
            "channel": c.channel,
            "content_text": c.content_text,
            "media_url": c.media_url,
            "created_at": str(c.created_at),
        }
        for c in items
    ]


@router.get("/recent")
async def get_recent(channel: str | None = None, limit: int = 20, db: Session = Depends(get_db)):
    repo = ContentRepository(db)
    items = repo.get_recent(channel, limit)
    return [
        {
            "id": c.id,
            "channel": c.channel,
            "content_text": c.content_text,
            "media_url": c.media_url,
            "status": c.status,
            "posted_at": str(c.posted_at) if c.posted_at else None,
            "external_id": c.external_id,
        }
        for c in items
    ]


@router.post("/publish")
async def publish(channel: str | None = None, db: Session = Depends(get_db)):
    results = await publish_queued(db, channel)
    return {"published": len([r for r in results if r.get("success")]), "results": results}


@router.get("/{content_id}", response_model=dict[str, Any])
async def get_content(content_id: int, db: Session = Depends(get_db)):
    repo = ContentRepository(db)
    c = repo.get(content_id)
    if not c:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")
    return {
        "id": c.id,
        "channel": c.channel,
        "content_text": c.content_text,
        "media_url": c.media_url,
        "status": c.status,
        "created_at": str(c.created_at),
        "posted_at": str(c.posted_at) if c.posted_at else None,
        "external_id": c.external_id,
        "error_message": getattr(c, "error_message", None),
    }


@router.put("/{content_id}", response_model=dict[str, Any])
async def update_content(content_id: int, body: ContentUpdate, db: Session = Depends(get_db)):
    repo = ContentRepository(db)
    existing = repo.get(content_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")
    if existing.status != "queued":
        raise HTTPException(status_code=400, detail="Only queued content can be edited")
    content = repo.update(
        content_id,
        content_text=body.content_text,
        media_url=body.media_url,
        channel=body.channel,
    )
    return {
        "id": content.id,
        "channel": content.channel,
        "content_text": content.content_text,
        "media_url": content.media_url,
        "status": content.status,
    }


@router.post("/{content_id}/mark-posted", response_model=dict[str, Any])
async def mark_content_posted(content_id: int, db: Session = Depends(get_db)):
    """Mark a queued content as posted (manual publish flow for Naver/Tistory blogs)."""
    repo = ContentRepository(db)
    existing = repo.get(content_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")
    if existing.status != "queued":
        raise HTTPException(status_code=400, detail="Only queued content can be marked posted")
    content = repo.mark_posted(content_id)
    return {
        "id": content.id,
        "channel": content.channel,
        "status": content.status,
        "posted_at": str(content.posted_at) if content.posted_at else None,
    }


@router.delete("/{content_id}")
async def delete_content(content_id: int, db: Session = Depends(get_db)):
    repo = ContentRepository(db)
    existing = repo.get(content_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")
    if existing.status == "posted":
        raise HTTPException(status_code=400, detail="Posted content cannot be deleted")
    repo.delete(content_id)
    return {"status": "deleted", "id": content_id}
