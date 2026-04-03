from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from src.api import analytics, content, health, strategy
from src.config import settings
from src.db.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    init_db()
    logger.info("Marketing Agent API is ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Marketing Agent API",
    description="Self-evolving AI marketing agent — data & execution layer",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(content.router)
app.include_router(analytics.router)
app.include_router(strategy.router)


def main():
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )


if __name__ == "__main__":
    main()
