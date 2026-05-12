from __future__ import annotations

import logging
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import FileResponse, JSONResponse

from src.api import ads, analytics, assets, content, ga4, health, onboarding, reports, scheduled_tasks, settings as settings_api, strategy
from src.config import settings
from src.db.database import init_db
from src.scheduler import setup_scheduler, shutdown_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    init_db()
    setup_scheduler()
    logger.info("Marketing Agent API is ready.")
    yield
    logger.info("Shutting down.")
    shutdown_scheduler()


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """Simple API key authentication for self-hosted instances.

    Skips auth for: health check, frontend assets, and when API_SECRET_KEY is not set.
    """

    OPEN_PATHS = {"/api/health", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        # Skip auth for health, docs, frontend assets, and when no key is configured
        if (
            not settings.api_secret_key
            or path in self.OPEN_PATHS
            or not path.startswith("/api")
        ):
            return await call_next(request)

        # Check Authorization header or X-API-Key header
        auth = request.headers.get("Authorization", "")
        api_key = request.headers.get("X-API-Key", "")
        token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else api_key

        if token != settings.api_secret_key:
            return JSONResponse(status_code=401, content={"detail": "Invalid or missing API key"})

        return await call_next(request)


app = FastAPI(
    title="Marketing Agent API",
    description="Self-evolving AI marketing agent — data & execution layer",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(APIKeyAuthMiddleware)

app.include_router(health.router)
app.include_router(content.router)
app.include_router(assets.router)
app.include_router(analytics.router)
app.include_router(strategy.router)
app.include_router(scheduled_tasks.router)
app.include_router(ads.router)
app.include_router(settings_api.router)
app.include_router(onboarding.router)
app.include_router(ga4.router)
app.include_router(reports.router)

# Serve React frontend static files
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve React SPA — all non-API routes fall through to index.html."""
        file_path = (FRONTEND_DIR / full_path).resolve()
        # Prevent path traversal — ensure resolved path is within FRONTEND_DIR
        if file_path.is_file() and str(file_path).startswith(str(FRONTEND_DIR.resolve())):
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")


def main():
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )


if __name__ == "__main__":
    main()
