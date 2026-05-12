from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text
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


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    url: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


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


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(String(50), index=True)  # twitter, meta, google
    platform_campaign_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    name: Mapped[str] = mapped_column(String(200))
    objective: Mapped[str] = mapped_column(String(50))  # awareness, traffic, engagement, conversions
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, active, paused, completed, error
    daily_budget: Mapped[float] = mapped_column(Float, default=0.0)
    total_budget: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="KRW")
    bid_strategy: Mapped[str] = mapped_column(String(50), default="auto")  # auto, manual_cpc, manual_cpm, target_cpa
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    targeting: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON: age, gender, location, interests, etc.
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    def set_targeting(self, data: dict) -> None:
        self.targeting = json.dumps(data, ensure_ascii=False)

    def get_targeting(self) -> dict:
        return json.loads(self.targeting) if self.targeting else {}


class AdGroup(Base):
    __tablename__ = "ad_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(Integer, index=True)
    platform_adgroup_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    targeting_override: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    bid_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    def set_targeting_override(self, data: dict) -> None:
        self.targeting_override = json.dumps(data, ensure_ascii=False)

    def get_targeting_override(self) -> dict:
        return json.loads(self.targeting_override) if self.targeting_override else {}


class Ad(Base):
    __tablename__ = "ads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ad_group_id: Mapped[int] = mapped_column(Integer, index=True)
    platform_ad_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    name: Mapped[str] = mapped_column(String(200))
    ad_type: Mapped[str] = mapped_column(String(50))  # image, video, carousel, text
    headline: Mapped[str | None] = mapped_column(String(500), nullable=True)
    body_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cta_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # learn_more, shop_now, sign_up, etc.
    destination_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class AdMetric(Base):
    __tablename__ = "ad_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(Integer, index=True)
    ad_group_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ad_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    platform: Mapped[str] = mapped_column(String(50))
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    conversions: Mapped[int] = mapped_column(Integer, default=0)
    spend: Mapped[float] = mapped_column(Float, default=0.0)
    cpc: Mapped[float] = mapped_column(Float, default=0.0)
    cpm: Mapped[float] = mapped_column(Float, default=0.0)
    ctr: Mapped[float] = mapped_column(Float, default=0.0)
    roas: Mapped[float] = mapped_column(Float, default=0.0)
    raw_data: Mapped[str | None] = mapped_column(Text, nullable=True)
