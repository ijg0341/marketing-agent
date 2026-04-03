from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.config import agent_config
from src.content.publisher import publish_queued
from src.db.database import get_db
from src.db.repository import ContentRepository

router = APIRouter(prefix="/api/content", tags=["content"])


class ContentCreate(BaseModel):
    channel: str
    content_text: str
    media_url: str | None = None
    template_version: str | None = None


class ContentResponse(BaseModel):
    id: int
    channel: str
    content_text: str
    status: str
    created_at: str
    posted_at: str | None = None

    model_config = {"from_attributes": True}


@router.post("", response_model=dict[str, Any])
async def create_content(body: ContentCreate, db: Session = Depends(get_db)):
    repo = ContentRepository(db)
    strategy = agent_config.strategy
    content = repo.create(
        channel=body.channel,
        content_text=body.content_text,
        media_url=body.media_url,
        template_version=body.template_version,
        strategy_version=strategy.get("version"),
    )
    return {"id": content.id, "status": content.status, "channel": content.channel}


@router.post("/batch", response_model=dict[str, Any])
async def create_batch(items: list[ContentCreate], db: Session = Depends(get_db)):
    repo = ContentRepository(db)
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
        created.append({"id": c.id, "channel": c.channel})
    return {"created": len(created), "items": created}


@router.get("/queued")
async def get_queued(channel: str | None = None, db: Session = Depends(get_db)):
    repo = ContentRepository(db)
    items = repo.get_queued(channel)
    return [
        {"id": c.id, "channel": c.channel, "content_text": c.content_text, "created_at": str(c.created_at)}
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
