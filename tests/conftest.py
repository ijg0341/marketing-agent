from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.db.database import Base, get_db
from src.main import app


@pytest.fixture(scope="session")
def engine():
    """In-memory SQLite engine with check_same_thread=False for APScheduler compatibility."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db(engine):
    """Per-test database session that rolls back after each test."""
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="function")
def client(db):
    """FastAPI TestClient with overridden DB dependency and auth disabled for tests."""
    import src.config as config_mod
    import src.main as main_mod

    def override_get_db():
        try:
            yield db
        finally:
            pass

    # Disable API key auth during tests — patch both module references
    original_config = getattr(config_mod.settings, 'api_secret_key', '')
    original_main = getattr(main_mod.settings, 'api_secret_key', '')
    object.__setattr__(config_mod.settings, 'api_secret_key', '')
    object.__setattr__(main_mod.settings, 'api_secret_key', '')

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()
    object.__setattr__(config_mod.settings, 'api_secret_key', original_config)
    object.__setattr__(main_mod.settings, 'api_secret_key', original_main)
