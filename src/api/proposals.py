from __future__ import annotations

import difflib
import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.db.models import EvolutionProposal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proposals", tags=["proposals"])

PROJECT_DIR = Path(__file__).resolve().parent.parent.parent

# Whitelist of files an evolution task is allowed to propose changes to.
# Path is relative to PROJECT_DIR.
ALLOWED_TARGETS: dict[str, set[str]] = {
    "strategy_evolution": {"config/strategy.yaml"},
    "prompt_evolution": {
        "src/content/templates/sns_post.yaml",
        "src/content/templates/blog_post.yaml",
        "src/content/templates/email_campaign.yaml",
    },
}


class ProposalCreate(BaseModel):
    task_id: str
    target_file: str
    after_content: str
    reason: str | None = None


class ProposalDecision(BaseModel):
    decided_by: str | None = "user"
    note: str | None = None


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _resolve_target(target_file: str) -> Path:
    """Resolve target file relative to PROJECT_DIR, blocking path traversal."""
    path = (PROJECT_DIR / target_file).resolve()
    if not str(path).startswith(str(PROJECT_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid target_file path")
    return path


def _unified_diff(before: str, after: str, target_file: str) -> str:
    return "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=f"a/{target_file}",
            tofile=f"b/{target_file}",
            n=3,
        )
    )


def _serialize(p: EvolutionProposal, include_diff: bool = False) -> dict:
    data = {
        "id": p.id,
        "task_id": p.task_id,
        "target_file": p.target_file,
        "reason": p.reason,
        "status": p.status,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "decided_at": p.decided_at.isoformat() if p.decided_at else None,
        "decided_by": p.decided_by,
        "decision_note": p.decision_note,
    }
    if include_diff:
        data["before_content"] = p.before_content
        data["after_content"] = p.after_content
        data["diff"] = _unified_diff(p.before_content, p.after_content, p.target_file)
    return data


@router.get("")
async def list_proposals(status: str | None = None, db: Session = Depends(get_db)):
    """List proposals, optionally filtered by status."""
    q = db.query(EvolutionProposal)
    if status:
        q = q.filter(EvolutionProposal.status == status)
    items = q.order_by(EvolutionProposal.created_at.desc()).limit(200).all()
    return [_serialize(p) for p in items]


@router.get("/{proposal_id}")
async def get_proposal(proposal_id: int, db: Session = Depends(get_db)):
    p = db.get(EvolutionProposal, proposal_id)
    if not p:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return _serialize(p, include_diff=True)


@router.post("")
async def create_proposal(body: ProposalCreate, db: Session = Depends(get_db)):
    """Create a new proposal. Called by evolution scheduled tasks."""
    allowed = ALLOWED_TARGETS.get(body.task_id)
    if not allowed:
        raise HTTPException(status_code=400, detail=f"Unknown task_id: {body.task_id}")
    if body.target_file not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"target_file '{body.target_file}' not allowed for {body.task_id}",
        )

    path = _resolve_target(body.target_file)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Target file not found: {body.target_file}")

    before_content = path.read_text(encoding="utf-8")
    if before_content == body.after_content:
        raise HTTPException(status_code=400, detail="No changes — after_content matches current file")

    # Block multiple pending proposals for the same target.
    existing = (
        db.query(EvolutionProposal)
        .filter(
            EvolutionProposal.target_file == body.target_file,
            EvolutionProposal.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A pending proposal already exists for {body.target_file} (id={existing.id})",
        )

    proposal = EvolutionProposal(
        task_id=body.task_id,
        target_file=body.target_file,
        before_content=before_content,
        after_content=body.after_content,
        before_hash=_sha256(before_content),
        reason=body.reason,
        status="pending",
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    logger.info("Created proposal %d for %s by %s", proposal.id, body.target_file, body.task_id)
    return _serialize(proposal, include_diff=True)


@router.post("/{proposal_id}/approve")
async def approve_proposal(proposal_id: int, body: ProposalDecision, db: Session = Depends(get_db)):
    """Approve a proposal — write after_content to target_file."""
    p = db.get(EvolutionProposal, proposal_id)
    if not p:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if p.status != "pending":
        raise HTTPException(status_code=409, detail=f"Proposal is {p.status}, not pending")

    path = _resolve_target(p.target_file)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Target file disappeared: {p.target_file}")

    current = path.read_text(encoding="utf-8")
    if _sha256(current) != p.before_hash:
        # File changed since the proposal was created.
        p.status = "conflict"
        p.decided_at = datetime.now(timezone.utc)
        p.decided_by = body.decided_by
        p.decision_note = "Target file changed after proposal — conflict"
        db.commit()
        raise HTTPException(
            status_code=409,
            detail="Target file changed since proposal was created. Marked as conflict.",
        )

    path.write_text(p.after_content, encoding="utf-8")
    p.status = "applied"
    p.decided_at = datetime.now(timezone.utc)
    p.decided_by = body.decided_by
    p.decision_note = body.note
    db.commit()
    db.refresh(p)
    logger.info("Applied proposal %d to %s", p.id, p.target_file)
    return _serialize(p, include_diff=True)


@router.post("/{proposal_id}/reject")
async def reject_proposal(proposal_id: int, body: ProposalDecision, db: Session = Depends(get_db)):
    """Reject a proposal — no file changes."""
    p = db.get(EvolutionProposal, proposal_id)
    if not p:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if p.status != "pending":
        raise HTTPException(status_code=409, detail=f"Proposal is {p.status}, not pending")

    p.status = "rejected"
    p.decided_at = datetime.now(timezone.utc)
    p.decided_by = body.decided_by
    p.decision_note = body.note
    db.commit()
    db.refresh(p)
    return _serialize(p, include_diff=True)


@router.delete("/{proposal_id}")
async def delete_proposal(proposal_id: int, db: Session = Depends(get_db)):
    p = db.get(EvolutionProposal, proposal_id)
    if not p:
        raise HTTPException(status_code=404, detail="Proposal not found")
    db.delete(p)
    db.commit()
    return {"status": "deleted", "id": proposal_id}
