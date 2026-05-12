from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.db.repository import AssetRepository
from src.services.supabase_storage import SupabaseStorageError, upload_image

router = APIRouter(prefix="/api/assets", tags=["assets"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


class AssetCreate(BaseModel):
    url: str
    description: str
    tags: str | None = None


class AssetUpdate(BaseModel):
    url: str | None = None
    description: str | None = None
    tags: str | None = None


def _serialize(a) -> dict:
    return {
        "id": a.id,
        "url": a.url,
        "description": a.description,
        "tags": a.tags,
        "used_count": a.used_count,
        "last_used_at": str(a.last_used_at) if a.last_used_at else None,
        "created_at": str(a.created_at),
    }


@router.get("")
async def list_assets(db: Session = Depends(get_db)):
    repo = AssetRepository(db)
    return [_serialize(a) for a in repo.list_all()]


@router.post("")
async def create_asset(body: AssetCreate, db: Session = Depends(get_db)):
    repo = AssetRepository(db)
    a = repo.create(url=body.url, description=body.description, tags=body.tags)
    return _serialize(a)


@router.post("/upload")
async def upload_asset(
    file: UploadFile = File(...),
    description: str = Form(...),
    tags: str | None = Form(None),
    db: Session = Depends(get_db),
):
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(file_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
    try:
        public_url = await upload_image(
            file_bytes,
            content_type=file.content_type or "",
            original_filename=file.filename,
        )
    except SupabaseStorageError as e:
        raise HTTPException(status_code=400, detail=str(e))

    repo = AssetRepository(db)
    a = repo.create(url=public_url, description=description, tags=tags)
    return _serialize(a)


@router.patch("/{asset_id}")
async def update_asset(asset_id: int, body: AssetUpdate, db: Session = Depends(get_db)):
    repo = AssetRepository(db)
    a = repo.update(
        asset_id,
        url=body.url,
        description=body.description,
        tags=body.tags,
    )
    if not a:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return _serialize(a)


@router.delete("/{asset_id}")
async def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    repo = AssetRepository(db)
    if not repo.delete(asset_id):
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return {"status": "deleted", "id": asset_id}
