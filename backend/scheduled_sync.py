"""
Runs an Orion sync from an unattended job (GitHub Actions) and, when asked,
republishes the class board.

This is written for an environment whose logs are public. Nothing scraped from
the portal is ever printed: the output is counts and status words, and every
line goes through redact() so a stray exception string cannot leak the
credentials or the child's name into a public build log.
"""

import os
import sys
from typing import Any, Dict, List, Optional

from backend.browser_sync import run_orion_browser_sync
from backend.database import get_available_dates
from backend.publish import publish_class_board

REDACTED = "[redacted]"
TRUTHY = {"1", "true", "yes", "on"}


def _secrets(result: Optional[Dict[str, Any]] = None) -> List[str]:
    """Every value that must never reach a log line."""
    values = [
        os.getenv("ORION_USERNAME") or "",
        os.getenv("ORION_PASSWORD") or "",
        os.getenv("SITE_PASSCODE") or "",
    ]
    student = (result or {}).get("student") or {}
    if isinstance(student, dict):
        values.extend(str(v) for v in student.values())
    return [v.strip() for v in values if v and len(v.strip()) > 2]


def redact(text: Any, result: Optional[Dict[str, Any]] = None) -> str:
    cleaned = str(text)
    for secret in sorted(_secrets(result), key=len, reverse=True):
        if secret in cleaned:
            cleaned = cleaned.replace(secret, REDACTED)
    return cleaned


def _truthy(value: Optional[str]) -> bool:
    return (value or "").strip().lower() in TRUTHY


def run(publish: Optional[bool] = None) -> int:
    username = (os.getenv("ORION_USERNAME") or "").strip()
    password = os.getenv("ORION_PASSWORD") or ""
    if not username or not password:
        print("ORION_USERNAME and ORION_PASSWORD must both be set.")
        return 2

    if publish is None:
        publish = _truthy(os.getenv("PUBLISH_AFTER_SYNC"))

    result = run_orion_browser_sync(username=username, password=password)
    if result.get("status") != "success":
        print("Sync failed: " + redact(result.get("message", "no reason given"), result))
        return 1

    dates = get_available_dates()
    print(
        "Sync succeeded: {pdfs} class update PDFs, {circulars} circulars, "
        "{days} day(s) of history in the database.".format(
            pdfs=result.get("pdfs_synced", 0),
            circulars=result.get("circulars_synced", 0),
            days=len(dates),
        )
    )
    if dates:
        print(f"Covering {dates[-1]['date']} to {dates[0]['date']}.")

    if not publish:
        print("Dry run: the published board was left untouched.")
        return 0

    outcome = publish_class_board()
    if outcome.get("published"):
        print(f"Board republished on {outcome.get('branch')}.")
    else:
        print("Board not republished: " + redact(outcome.get("reason", "unknown"), result))
    return 0


if __name__ == "__main__":
    sys.exit(run())
