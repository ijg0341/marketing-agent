from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Content(Base):
    __tablename__ = "contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    channel: Mapped[str] = mapped_column(String(50), index=True)
    content_text: Mapped[str] = mapped_column(Text)
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    template_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    strategy_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="queued")  # queued, posted, failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Metric(Base):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    channel: Mapped[str] = mapped_column(String(50), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    engagements: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    conversions: Mapped[int] = mapped_column(Integer, default=0)
    engagement_rate: Mapped[float] = mapped_column(Float, default=0.0)
    raw_data: Mapped[str | None] = mapped_column(Text, nullable=True)

    def set_raw(self, data: dict) -> None:
        self.raw_data = json.dumps(data, ensure_ascii=False)

    def get_raw(self) -> dict:
        return json.loads(self.raw_data) if self.raw_data else {}


class StrategyLog(Base):
    __tablename__ = "strategy_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    changed_by: Mapped[str] = mapped_column(String(50))  # scheduled_task / manual
    field: Mapped[str] = mapped_column(String(200))
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class EvolutionLog(Base):
    __tablename__ = "evolution_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    level: Mapped[int] = mapped_column(Integer)  # 1, 2, 3
    component: Mapped[str] = mapped_column(String(100))
    change_description: Mapped[str] = mapped_column(Text)
    before_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    after_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    performance_before: Mapped[str | None] = mapped_column(Text, nullable=True)
    performance_after: Mapped[str | None] = mapped_column(Text, nullable=True)
    rolled_back: Mapped[bool] = mapped_column(Integer, default=False)
