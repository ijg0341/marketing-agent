from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.config import agent_config
from src.content.publisher import publish_queued
from src.db.database import SessionLocal

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _publish_job():
    enabled = agent_config.get_enabled_channels()
    if not enabled:
        return
    db = SessionLocal()
    try:
        for channel in enabled:
            results = await publish_queued(db, channel)
            published = [r for r in results if r.get("success")]
            if published:
                logger.info(f"Published {len(published)} items to {channel}")
    finally:
        db.close()


def setup_scheduler():
    channels_cfg = agent_config.channels
    for channel_name, cfg in channels_cfg.items():
        if not cfg.get("enabled"):
            continue
        schedule = cfg.get("posting_schedule", {})
        times = schedule.get("times", [])
        tz = schedule.get("timezone", "Asia/Seoul")
        for t in times:
            hour, minute = t.split(":")
            scheduler.add_job(
                _publish_job,
                CronTrigger(hour=int(hour), minute=int(minute), timezone=tz),
                id=f"publish_{channel_name}_{t}",
                replace_existing=True,
            )
            logger.info(f"Scheduled publish for {channel_name} at {t} ({tz})")

    scheduler.start()
    logger.info("Scheduler started.")


def shutdown_scheduler():
    scheduler.shutdown(wait=False)
