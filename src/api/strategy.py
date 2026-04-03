from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.config import agent_config
from src.db.database import get_db
from src.db.repository import EvolutionLogRepository, StrategyLogRepository

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


class StrategyUpdate(BaseModel):
    updates: dict[str, Any]
    changed_by: str = "manual"
    reason: str = ""


@router.get("")
async def get_strategy():
    return agent_config.strategy


@router.put("")
async def update_strategy(body: StrategyUpdate, db: Session = Depends(get_db)):
    log_repo = StrategyLogRepository(db)
    old_strategy = agent_config.strategy.copy()

    for field, new_value in body.updates.items():
        old_value = old_strategy.get(field)
        log_repo.log_change(
            changed_by=body.changed_by,
            field=field,
            old_value=str(old_value),
            new_value=str(new_value),
            reason=body.reason,
        )

    updated = agent_config.update_strategy(body.updates)
    return {"message": "Strategy updated", "strategy": updated}


@router.get("/log")
async def get_strategy_log(limit: int = 20, db: Session = Depends(get_db)):
    repo = StrategyLogRepository(db)
    logs = repo.get_recent(limit)
    return [
        {
            "id": l.id,
            "changed_at": str(l.changed_at),
            "changed_by": l.changed_by,
            "field": l.field,
            "old_value": l.old_value,
            "new_value": l.new_value,
            "reason": l.reason,
        }
        for l in logs
    ]


@router.get("/evolution")
async def get_evolution_log(level: int | None = None, limit: int = 20, db: Session = Depends(get_db)):
    repo = EvolutionLogRepository(db)
    logs = repo.get_recent(level=level, limit=limit)
    return [
        {
            "id": e.id,
            "timestamp": str(e.timestamp),
            "level": e.level,
            "component": e.component,
            "change_description": e.change_description,
            "rolled_back": bool(e.rolled_back),
        }
        for e in logs
    ]
