from __future__ import annotations

import logging

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

app = FastAPI(
    title="Marketing Agent API",
    description="Self-evolving AI marketing agent — data & execution layer",
    version="0.1.0",
)

app.include_router(health.router)
app.include_router(content.router)
app.include_router(analytics.router)
app.include_router(strategy.router)


@app.on_event("startup")
async def on_startup():
    logger.info("Initializing database...")
    init_db()
    logger.info("Marketing Agent API is ready.")


def main():
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )


if __name__ == "__main__":
    main()
