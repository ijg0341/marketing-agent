from __future__ import annotations

import logging
import re
import subprocess
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scheduled-tasks", tags=["scheduled-tasks"])

TASKS_DIR = Path(__file__).resolve().parent.parent.parent / "scheduled_tasks"
PROJECT_DIR = Path(__file__).resolve().parent.parent.parent

# Marker comment used to identify our crontab entries
CRON_MARKER = "# marketing-agent:"

# Default cron schedules for each task
DEFAULT_SCHEDULES: dict[str, dict[str, Any]] = {
    "daily_analysis": {"cron": "3 9 * * *", "description": "Daily Performance Analysis & Report"},
    "content_planning": {"cron": "17 10 * * *", "description": "Daily Content Planning & Generation"},
    "strategy_evolution": {"cron": "42 11 * * 1,4", "description": "Strategy Auto-Evolution (Mon/Thu)"},
    "prompt_evolution": {"cron": "51 14 * * 5", "description": "Prompt & Template Improvement (Fri)"},
}


class TaskUpdate(BaseModel):
    content: str
    cron: str | None = None


class CronToggle(BaseModel):
    enabled: bool
    cron: str | None = None


# ---------------------------------------------------------------------------
# Crontab helpers
# ---------------------------------------------------------------------------

def _read_crontab() -> str:
    """Read current user's crontab. Returns empty string if none."""
    try:
        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True, timeout=5)
        return result.stdout if result.returncode == 0 else ""
    except Exception:
        return ""


def _write_crontab(content: str) -> bool:
    """Write content as the user's crontab."""
    try:
        result = subprocess.run(
            ["crontab", "-"], input=content, capture_output=True, text=True, timeout=5,
        )
        return result.returncode == 0
    except Exception as e:
        logger.error("Failed to write crontab: %s", e)
        return False


def _get_enabled_tasks() -> dict[str, str]:
    """Parse crontab and return {task_id: cron_expression} for our managed entries."""
    crontab = _read_crontab()
    enabled: dict[str, str] = {}
    for line in crontab.splitlines():
        line = line.strip()
        if CRON_MARKER in line:
            # Extract task_id from marker: "# marketing-agent:task_id"
            marker_part = line.split(CRON_MARKER, 1)[1].strip()
            task_id = marker_part.strip()
            continue  # The actual cron line is next
        # Check if previous line was a marker — look for our project path
        if str(PROJECT_DIR) in line and "scheduled_tasks/" in line:
            # Parse: "3 9 * * * cd /path && claude scheduled_tasks/daily_analysis.md ..."
            # Extract task_id from the path
            match = re.search(r"scheduled_tasks/(\w+)\.md", line)
            if match:
                task_id = match.group(1)
                # Extract cron expression (first 5 fields)
                parts = line.split()
                if len(parts) >= 5:
                    cron_expr = " ".join(parts[:5])
                    enabled[task_id] = cron_expr
    return enabled


def _build_cron_line(task_id: str, cron: str) -> str:
    """Build a crontab entry for a task.

    Pipes the task markdown into `claude --print` via stdin so the file content
    becomes the actual prompt (passing the path as a positional argument would
    only send the path string, not the file content).

    In `--print` mode there is no user to approve tool prompts, so we must
    explicitly allow the tools the evolution tasks rely on (curl for API
    calls, Read for inspecting yaml).
    """
    logs_dir = PROJECT_DIR / "logs"
    return (
        f"{CRON_MARKER}{task_id}\n"
        f"{cron} cd {PROJECT_DIR} && cat scheduled_tasks/{task_id}.md | "
        f"claude --print --allowed-tools 'Bash Read Write' "
        f">> {logs_dir}/{task_id}.log 2>&1"
    )


def _parse_task_file(path: Path) -> dict[str, Any]:
    """Parse a scheduled task markdown file."""
    text = path.read_text(encoding="utf-8")
    name = path.stem

    # Extract title from first heading
    title_match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    title = title_match.group(1) if title_match else name

    defaults = DEFAULT_SCHEDULES.get(name, {})

    return {
        "id": name,
        "filename": path.name,
        "title": title,
        "content": text,
        "cron": defaults.get("cron", "0 9 * * *"),
        "description": defaults.get("description", title),
    }


@router.get("")
async def list_tasks():
    """List all scheduled task prompts."""
    if not TASKS_DIR.exists():
        return []
    tasks = []
    for path in sorted(TASKS_DIR.glob("*.md")):
        tasks.append(_parse_task_file(path))
    return tasks


@router.get("/{task_id}")
async def get_task(task_id: str):
    """Get a single scheduled task prompt."""
    path = TASKS_DIR / f"{task_id}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    return _parse_task_file(path)


@router.put("/{task_id}")
async def update_task(task_id: str, body: TaskUpdate):
    """Update a scheduled task prompt content."""
    path = TASKS_DIR / f"{task_id}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    path.write_text(body.content, encoding="utf-8")

    if body.cron:
        DEFAULT_SCHEDULES.setdefault(task_id, {})["cron"] = body.cron

    return _parse_task_file(path)


@router.post("")
async def create_task(task_id: str, body: TaskUpdate):
    """Create a new scheduled task prompt."""
    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    path = TASKS_DIR / f"{task_id}.md"
    if path.exists():
        raise HTTPException(status_code=409, detail=f"Task '{task_id}' already exists")
    path.write_text(body.content, encoding="utf-8")

    if body.cron:
        DEFAULT_SCHEDULES[task_id] = {"cron": body.cron, "description": task_id}

    return _parse_task_file(path)


@router.delete("/{task_id}")
async def delete_task(task_id: str):
    """Delete a scheduled task prompt."""
    path = TASKS_DIR / f"{task_id}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    path.unlink()
    DEFAULT_SCHEDULES.pop(task_id, None)
    return {"status": "deleted", "id": task_id}


# ---------------------------------------------------------------------------
# Manual execution
# ---------------------------------------------------------------------------

# Track running tasks to prevent double execution
_running_tasks: dict[str, subprocess.Popen] = {}


@router.post("/{task_id}/run")
async def run_task(task_id: str):
    """Manually execute a scheduled task via Claude CLI (background process)."""
    path = TASKS_DIR / f"{task_id}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

    # Check if already running
    if task_id in _running_tasks:
        proc = _running_tasks[task_id]
        if proc.poll() is None:  # Still running
            return {"status": "already_running", "task_id": task_id, "pid": proc.pid}
        else:
            del _running_tasks[task_id]

    # Ensure logs directory exists
    logs_dir = PROJECT_DIR / "logs"
    logs_dir.mkdir(exist_ok=True)
    log_file = logs_dir / f"{task_id}.log"

    try:
        with open(path, "rb") as pf, open(log_file, "a") as lf:
            proc = subprocess.Popen(
                ["claude", "--print", "--allowed-tools", "Bash Read Write"],
                cwd=str(PROJECT_DIR),
                stdin=pf,
                stdout=lf,
                stderr=lf,
                start_new_session=True,
            )
        _running_tasks[task_id] = proc
        logger.info("Started task %s (PID %d)", task_id, proc.pid)
        return {"status": "started", "task_id": task_id, "pid": proc.pid}
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start task: {e}")


@router.get("/{task_id}/status")
async def get_task_run_status(task_id: str):
    """Check if a task is currently running."""
    if task_id in _running_tasks:
        proc = _running_tasks[task_id]
        if proc.poll() is None:
            return {"task_id": task_id, "running": True, "pid": proc.pid}
        else:
            exit_code = proc.returncode
            del _running_tasks[task_id]
            return {"task_id": task_id, "running": False, "exit_code": exit_code}
    return {"task_id": task_id, "running": False}


# ---------------------------------------------------------------------------
# Crontab management endpoints
# ---------------------------------------------------------------------------

@router.get("/cron/status")
async def get_cron_status():
    """Get which tasks are enabled in the system crontab."""
    enabled = _get_enabled_tasks()
    return {
        "enabled_tasks": enabled,
        "project_dir": str(PROJECT_DIR),
        "crontab_available": _read_crontab() is not None,
    }


@router.put("/{task_id}/cron")
async def toggle_task_cron(task_id: str, body: CronToggle):
    """Enable or disable a task in the system crontab."""
    path = TASKS_DIR / f"{task_id}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

    crontab = _read_crontab()
    lines = crontab.splitlines() if crontab else []

    # Remove existing entries for this task
    filtered: list[str] = []
    skip_next = False
    for line in lines:
        if skip_next:
            skip_next = False
            continue
        if f"{CRON_MARKER}{task_id}" in line:
            skip_next = True  # Skip the marker and the next cron line
            continue
        # Also remove standalone cron lines for this task (without marker)
        if str(PROJECT_DIR) in line and f"scheduled_tasks/{task_id}.md" in line:
            continue
        filtered.append(line)

    if body.enabled:
        # Determine cron expression: use provided, or task default
        cron = body.cron or DEFAULT_SCHEDULES.get(task_id, {}).get("cron", "0 9 * * *")
        # Ensure logs directory exists
        (PROJECT_DIR / "logs").mkdir(exist_ok=True)
        # Add new entry
        filtered.append("")
        filtered.append(_build_cron_line(task_id, cron))

    new_crontab = "\n".join(filtered).strip() + "\n"
    success = _write_crontab(new_crontab)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update crontab")

    return {
        "status": "enabled" if body.enabled else "disabled",
        "task_id": task_id,
        "cron": body.cron if body.enabled else None,
    }
