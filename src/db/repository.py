from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.db.models import Ad, AdGroup, AdMetric, Campaign, Content, EvolutionLog, Metric, StrategyLog


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

    def mark_posted(self, content_id: int, external_id: str | None = None) -> Content | None:
        content = self.db.get(Content, content_id)
        if not content:
            return None
        content.status = "posted"
        content.posted_at = datetime.now(timezone.utc)
        if external_id:
            content.external_id = external_id
        self.db.commit()
        return content

    def mark_failed(self, content_id: int) -> Content | None:
        content = self.db.get(Content, content_id)
        if not content:
            return None
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


class CampaignRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, **kwargs: Any) -> Campaign:
        campaign = Campaign(**kwargs)
        self.db.add(campaign)
        self.db.commit()
        self.db.refresh(campaign)
        return campaign

    def get(self, campaign_id: int) -> Campaign | None:
        return self.db.get(Campaign, campaign_id)

    def list_all(self, platform: str | None = None, status: str | None = None) -> list[Campaign]:
        q = select(Campaign)
        if platform:
            q = q.where(Campaign.platform == platform)
        if status:
            q = q.where(Campaign.status == status)
        q = q.order_by(Campaign.created_at.desc())
        return list(self.db.scalars(q).all())

    def update(self, campaign_id: int, **kwargs: Any) -> Campaign | None:
        campaign = self.db.get(Campaign, campaign_id)
        if not campaign:
            return None
        for k, v in kwargs.items():
            setattr(campaign, k, v)
        self.db.commit()
        self.db.refresh(campaign)
        return campaign

    def delete(self, campaign_id: int) -> None:
        campaign = self.db.get(Campaign, campaign_id)
        if campaign:
            self.db.delete(campaign)
            self.db.commit()


class AdGroupRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, **kwargs: Any) -> AdGroup:
        ag = AdGroup(**kwargs)
        self.db.add(ag)
        self.db.commit()
        self.db.refresh(ag)
        return ag

    def list_by_campaign(self, campaign_id: int) -> list[AdGroup]:
        q = select(AdGroup).where(AdGroup.campaign_id == campaign_id).order_by(AdGroup.created_at.desc())
        return list(self.db.scalars(q).all())

    def update(self, adgroup_id: int, **kwargs: Any) -> AdGroup | None:
        ag = self.db.get(AdGroup, adgroup_id)
        if not ag:
            return None
        for k, v in kwargs.items():
            setattr(ag, k, v)
        self.db.commit()
        self.db.refresh(ag)
        return ag

    def delete(self, adgroup_id: int) -> None:
        ag = self.db.get(AdGroup, adgroup_id)
        if ag:
            self.db.delete(ag)
            self.db.commit()


class AdRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, **kwargs: Any) -> Ad:
        ad = Ad(**kwargs)
        self.db.add(ad)
        self.db.commit()
        self.db.refresh(ad)
        return ad

    def list_by_adgroup(self, ad_group_id: int) -> list[Ad]:
        q = select(Ad).where(Ad.ad_group_id == ad_group_id).order_by(Ad.created_at.desc())
        return list(self.db.scalars(q).all())

    def update(self, ad_id: int, **kwargs: Any) -> Ad | None:
        ad = self.db.get(Ad, ad_id)
        if not ad:
            return None
        for k, v in kwargs.items():
            setattr(ad, k, v)
        self.db.commit()
        self.db.refresh(ad)
        return ad

    def delete(self, ad_id: int) -> None:
        ad = self.db.get(Ad, ad_id)
        if ad:
            self.db.delete(ad)
            self.db.commit()


class AdMetricRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record(self, **kwargs: Any) -> AdMetric:
        metric = AdMetric(**kwargs)
        self.db.add(metric)
        self.db.commit()
        self.db.refresh(metric)
        return metric

    def get_campaign_summary(self, campaign_id: int, days: int = 7) -> dict[str, Any]:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        q = select(
            func.sum(AdMetric.impressions).label("impressions"),
            func.sum(AdMetric.clicks).label("clicks"),
            func.sum(AdMetric.conversions).label("conversions"),
            func.sum(AdMetric.spend).label("spend"),
            func.avg(AdMetric.ctr).label("avg_ctr"),
            func.avg(AdMetric.cpc).label("avg_cpc"),
            func.avg(AdMetric.roas).label("avg_roas"),
        ).where(AdMetric.campaign_id == campaign_id, AdMetric.date >= since)
        row = self.db.execute(q).one()
        return {
            "impressions": row.impressions or 0,
            "clicks": row.clicks or 0,
            "conversions": row.conversions or 0,
            "spend": round(row.spend or 0, 2),
            "avg_ctr": round(row.avg_ctr or 0, 4),
            "avg_cpc": round(row.avg_cpc or 0, 2),
            "avg_roas": round(row.avg_roas or 0, 2),
        }

    def get_daily_metrics(self, campaign_id: int, days: int = 7) -> list[AdMetric]:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        q = select(AdMetric).where(
            AdMetric.campaign_id == campaign_id,
            AdMetric.date >= since,
        ).order_by(AdMetric.date)
        return list(self.db.scalars(q).all())
