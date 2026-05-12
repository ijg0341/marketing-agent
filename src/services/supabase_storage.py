from __future__ import annotations

import uuid
from pathlib import Path

import httpx

from src.config import settings


ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


class SupabaseStorageError(Exception):
    pass


def _ensure_configured() -> None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseStorageError(
            "Supabase storage is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
        )


async def upload_image(
    file_bytes: bytes,
    content_type: str,
    original_filename: str | None = None,
) -> str:
    """Upload bytes to Supabase Storage and return a public URL."""
    _ensure_configured()

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise SupabaseStorageError(
            f"Unsupported content type: {content_type} (allowed: {', '.join(ALLOWED_CONTENT_TYPES)})"
        )

    ext = ALLOWED_CONTENT_TYPES[content_type]
    if original_filename:
        original_ext = Path(original_filename).suffix.lower()
        if original_ext in ALLOWED_CONTENT_TYPES.values():
            ext = original_ext

    object_path = f"{uuid.uuid4().hex}{ext}"
    bucket = settings.supabase_bucket
    base = settings.supabase_url.rstrip("/")

    upload_url = f"{base}/storage/v1/object/{bucket}/{object_path}"
    public_url = f"{base}/storage/v1/object/public/{bucket}/{object_path}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            upload_url,
            content=file_bytes,
            headers={
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Content-Type": content_type,
                "x-upsert": "false",
            },
        )

    if res.status_code >= 400:
        raise SupabaseStorageError(
            f"Supabase upload failed ({res.status_code}): {res.text[:300]}"
        )

    return public_url
