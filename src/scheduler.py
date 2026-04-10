from __future__ import annotations

# Role Separation:
# - APScheduler: publish queued content + collect metrics (Python runtime, runs inside Docker)
# - Claude Code: content_planning + daily_analysis + strategy_evolution (host cron + CLI, runs outside Docker)

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.analytics.collector import collect_all_metrics
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


async def _collect_metrics_job():
    enabled = agent_config.get_enabled_channels()
    if not enabled:
        return
    db = SessionLocal()
    try:
        results = await collect_all_metrics(db, enabled)
        for channel, channel_results in results.items():
            success_count = sum(1 for r in channel_results if "error" not in r)
            logger.info("Collected metrics for %s: %d/%d records", channel, success_count, len(channel_results))
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

    scheduler.add_job(
        _collect_metrics_job,
        CronTrigger(hour="*/6"),
        id="collect_metrics",
        replace_existing=True,
    )
    logger.info("Scheduled metrics collection every 6 hours")

    scheduler.start()
    logger.info("Scheduler started.")


def shutdown_scheduler():
    scheduler.shutdown(wait=False)


def reload_scheduler_jobs(channel: str, enabled: bool) -> None:
    """Add or remove scheduled publish jobs for a channel after its enabled state changes."""
    if enabled:
        cfg = agent_config.channels.get(channel, {})
        schedule = cfg.get("posting_schedule", {})
        times = schedule.get("times", [])
        tz = schedule.get("timezone", "Asia/Seoul")
        if not times:
            logger.warning("reload_scheduler_jobs: no posting times configured for %s", channel)
            return
        for t in times:
            job_id = f"publish_{channel}_{t}"
            hour, minute = t.split(":")
            scheduler.add_job(
                _publish_job,
                CronTrigger(hour=int(hour), minute=int(minute), timezone=tz),
                id=job_id,
                replace_existing=True,
            )
            logger.info("Added scheduled publish job %s for %s at %s (%s)", job_id, channel, t, tz)
    else:
        cfg = agent_config.channels.get(channel, {})
        times = cfg.get("posting_schedule", {}).get("times", [])
        for t in times:
            job_id = f"publish_{channel}_{t}"
            if scheduler.get_job(job_id):
                scheduler.remove_job(job_id)
                logger.info("Removed scheduled publish job %s for %s", job_id, channel)
            else:
                logger.debug("reload_scheduler_jobs: job %s not found, nothing to remove", job_id)
