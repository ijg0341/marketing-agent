from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.db.models import Content, EvolutionLog, Metric, StrategyLog


class ContentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, **kwargs: Any) -> Content:
        content = Content(**kwargs)
        self.db.add(content)
        self.db.commit()
        self.db.refresh(content)
        return content

    def get_queued(self, channel: str | None = None) -> list[Content]:
        q = select(Content).where(Content.status == "queued")
        if channel:
            q = q.where(Content.channel == channel)
        q = q.order_by(Content.created_at)
        return list(self.db.scalars(q).all())

    def mark_posted(self, content_id: int, external_id: str | None = None) -> Content:
        content = self.db.get(Content, content_id)
        content.status = "posted"
        content.posted_at = datetime.now(timezone.utc)
        if external_id:
            content.external_id = external_id
        self.db.commit()
        return content

    def mark_failed(self, content_id: int) -> Content:
        content = self.db.get(Content, content_id)
        content.status = "failed"
        self.db.commit()
        return content

    def get_recent(self, channel: str | None = None, limit: int = 50) -> list[Content]:
        q = select(Content).where(Content.status == "posted")
        if channel:
            q = q.where(Content.channel == channel)
        q = q.order_by(Content.posted_at.desc()).limit(limit)
        return list(self.db.scalars(q).all())


class MetricRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record(self, **kwargs: Any) -> Metric:
        metric = Metric(**kwargs)
        self.db.add(metric)
        self.db.commit()
        self.db.refresh(metric)
        return metric

    def get_by_period(
        self,
        channel: str | None = None,
        hours: int = 24,
    ) -> list[Metric]:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        q = select(Metric).where(Metric.timestamp >= since)
        if channel:
            q = q.where(Metric.channel == channel)
        q = q.order_by(Metric.timestamp.desc())
        return list(self.db.scalars(q).all())

    def get_summary(self, channel: str | None = None, hours: int = 24) -> dict[str, Any]:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        q = select(
            func.count(Metric.id).label("count"),
            func.sum(Metric.impressions).label("total_impressions"),
            func.sum(Metric.engagements).label("total_engagements"),
            func.sum(Metric.clicks).label("total_clicks"),
            func.sum(Metric.conversions).label("total_conversions"),
            func.avg(Metric.engagement_rate).label("avg_engagement_rate"),
        ).where(Metric.timestamp >= since)
        if channel:
            q = q.where(Metric.channel == channel)
        row = self.db.execute(q).one()
        return {
            "count": row.count or 0,
            "total_impressions": row.total_impressions or 0,
            "total_engagements": row.total_engagements or 0,
            "total_clicks": row.total_clicks or 0,
            "total_conversions": row.total_conversions or 0,
            "avg_engagement_rate": round(row.avg_engagement_rate or 0, 4),
        }


class StrategyLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def log_change(self, **kwargs: Any) -> StrategyLog:
        entry = StrategyLog(**kwargs)
        self.db.add(entry)
        self.db.commit()
        return entry

    def get_recent(self, limit: int = 20) -> list[StrategyLog]:
        q = select(StrategyLog).order_by(StrategyLog.changed_at.desc()).limit(limit)
        return list(self.db.scalars(q).all())


class EvolutionLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def log_evolution(self, **kwargs: Any) -> EvolutionLog:
        entry = EvolutionLog(**kwargs)
        self.db.add(entry)
        self.db.commit()
        return entry

    def get_recent(self, level: int | None = None, limit: int = 20) -> list[EvolutionLog]:
        q = select(EvolutionLog)
        if level:
            q = q.where(EvolutionLog.level == level)
        q = q.order_by(EvolutionLog.timestamp.desc()).limit(limit)
        return list(self.db.scalars(q).all())
