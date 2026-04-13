from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, HTTPException

REPORTS_DIR = Path(__file__).resolve().parent.parent.parent / "reports"

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _extract_title(content: str) -> str:
    for line in content.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return ""


def _extract_date(filename: str) -> str:
    match = re.search(r"(\d{4}-\d{2}-\d{2})", filename)
    return match.group(1) if match else ""


def _report_meta(path: Path) -> dict:
    content = path.read_text(encoding="utf-8")
    return {
        "filename": path.name,
        "title": _extract_title(content),
        "date": _extract_date(path.name),
        "size": path.stat().st_size,
    }


@router.get("")
async def list_reports():
    """List all reports sorted by date descending."""
    if not REPORTS_DIR.exists():
        return []

    md_files = list(REPORTS_DIR.glob("*.md"))
    if not md_files:
        return []

    reports = [_report_meta(f) for f in md_files]
    reports.sort(key=lambda r: r["date"], reverse=True)
    return reports


@router.get("/{filename}")
async def get_report(filename: str):
    """Return the full content of a single report file."""
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    path = REPORTS_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Report not found")

    content = path.read_text(encoding="utf-8")
    return {
        "filename": filename,
        "title": _extract_title(content),
        "date": _extract_date(filename),
        "content": content,
    }
