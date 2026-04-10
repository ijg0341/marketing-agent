from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.channels.base import MetricSnapshot, PublishResult
from src.db.database import Base
from src.db.models import Content
from src.db.repository import ContentRepository


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    return Session()


# ---------------------------------------------------------------------------
# 1. Content create -> queued status
# ---------------------------------------------------------------------------

def test_content_create_queued_status():
    db = _make_db()
    repo = ContentRepository(db)
    content = repo.create(channel="twitter", content_text="Hello world #test")
    assert content.id is not None
    assert content.status == "queued"
    assert content.channel == "twitter"


# ---------------------------------------------------------------------------
# 2. Publish with mocked TwitterAdapter HTTP call
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_publish_with_mocked_twitter_http():
    """publish_queued should mark content as posted when HTTP call succeeds."""
    db = _make_db()
    repo = ContentRepository(db)
    repo.create(channel="twitter", content_text="Tweet #1")

    mock_result = PublishResult(success=True, external_id="tweet_abc123", url="https://x.com/i/status/tweet_abc123")

    # Mock get_adapter to return a TwitterAdapter whose publish() returns our mock result
    mock_adapter = AsyncMock()
    mock_adapter.publish = AsyncMock(return_value=mock_result)

    with patch("src.content.publisher.get_adapter", return_value=mock_adapter):
        from src.content.publisher import publish_queued
        results = await publish_queued(db, channel="twitter")

    assert len(results) == 1
    assert results[0]["success"] is True
    assert results[0]["external_id"] == "tweet_abc123"

    posted = db.query(Content).filter_by(status="posted").all()
    assert len(posted) == 1


# ---------------------------------------------------------------------------
# 3. Settings reload after credential save
# ---------------------------------------------------------------------------

def test_settings_reload_after_credential_save():
    """reload() should update the module-level settings singleton."""
    import src.config as config_module

    original_key = config_module.settings.twitter_api_key

    with patch.dict("os.environ", {"TWITTER_API_KEY": "new_test_key_xyz"}):
        config_module.reload()
        assert config_module.settings.twitter_api_key == "new_test_key_xyz"

    # Restore
    config_module.reload()


# ---------------------------------------------------------------------------
# 4. Scheduler job registration on channel enable
# ---------------------------------------------------------------------------

def test_scheduler_job_registration_on_channel_enable():
    """reload_scheduler_jobs adds a job when channel is enabled."""
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    from src import scheduler as sched_module

    # Replace the global scheduler with a fresh one (not started)
    original_scheduler = sched_module.scheduler
    test_scheduler = AsyncIOScheduler()
    sched_module.scheduler = test_scheduler

    fake_channels = {
        "twitter": {
            "enabled": True,
            "posting_schedule": {
                "times": ["09:00"],
                "timezone": "UTC",
            },
        }
    }

    # agent_config.channels is a read-only property backed by _channels; patch _channels directly
    original_channels = sched_module.agent_config._channels
    sched_module.agent_config._channels = fake_channels

    try:
        sched_module.reload_scheduler_jobs("twitter", enabled=True)
        job = test_scheduler.get_job("publish_twitter_09:00")
        assert job is not None, "Job should be registered after enabling channel"
    finally:
        sched_module.agent_config._channels = original_channels
        sched_module.scheduler = original_scheduler


# ---------------------------------------------------------------------------
# 5. Metrics collection fallback on 403 response
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_collect_metrics_403_graceful_degradation():
    """TwitterAdapter.collect_metrics should return empty MetricSnapshot on 403."""
    from src.channels.twitter import TwitterAdapter

    mock_response = MagicMock()
    mock_response.status_code = 403

    with patch("src.channels.twitter.settings") as mock_settings:
        mock_settings.twitter_bearer_token = "fake_bearer"
        mock_settings.twitter_api_key = ""
        mock_settings.twitter_api_secret = ""
        mock_settings.twitter_access_token = ""
        mock_settings.twitter_access_secret = ""

        adapter = TwitterAdapter()

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            snapshot = await adapter.collect_metrics("tweet_123")

    # Should degrade gracefully — all zero, no exception raised
    assert snapshot.impressions == 0
    assert snapshot.engagements == 0
    assert snapshot.clicks == 0


# ---------------------------------------------------------------------------
# 6. Onboarding status endpoint
# ---------------------------------------------------------------------------

def test_onboarding_status_endpoint(client):
    """GET /api/onboarding/status should return 200 with required fields."""
    response = client.get("/api/onboarding/status")
    assert response.status_code == 200
    data = response.json()
    assert "steps" in data
    assert "completed" in data
    assert "total" in data
    assert "all_required_complete" in data
    assert isinstance(data["steps"], list)
    assert len(data["steps"]) > 0
