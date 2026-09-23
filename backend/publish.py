"""
Publishes the class board after a sync.

Regenerates the encrypted class bundle and the sanitised demo bundle, then commits
and pushes just those two files, which is what triggers the Pages deploy. Only the
generated files are staged, so anything else in the working tree is left alone.

Turned off unless AUTO_PUBLISH is enabled, so a checkout never pushes by surprise.
"""

import os
import subprocess
from typing import Any, Dict, Optional

from backend.static_export import build_payload, content_hash, published_content_hash, write_bundles

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLISHED_FILES = ["frontend/class_data.enc.js", "frontend/static_data.js"]


def _git(*args: str, cwd: Optional[str] = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args], cwd=cwd or REPO_DIR, capture_output=True, text=True, timeout=120
    )


def auto_publish_enabled() -> bool:
    return (os.getenv("AUTO_PUBLISH") or "").strip().lower() in {"1", "true", "yes", "on"}


def publish_class_board(passcode: Optional[str] = None, repo_dir: Optional[str] = None) -> Dict[str, Any]:
    """Never raises: a publishing problem must not fail the sync that triggered it."""
    repo_dir = repo_dir or REPO_DIR
    passcode = (passcode or os.getenv("SITE_PASSCODE") or "").strip()
    if not passcode:
        return {"published": False, "reason": "SITE_PASSCODE is not set"}

    frontend_dir = os.path.join(repo_dir, "frontend")
    try:
        payload = build_payload()
        # Each build re-encrypts with a fresh salt, so compare the class content
        # itself rather than the file, or every sync would redeploy the board.
        if content_hash(payload) == published_content_hash(frontend_dir):
            return {"published": False, "reason": "no change since the last publish"}
        result = write_bundles(passcode, out_dir=frontend_dir, payload=payload)
    except Exception as exc:
        return {"published": False, "reason": f"Could not build the bundle: {exc}"}

    try:
        staged = _git("add", "--", *PUBLISHED_FILES, cwd=repo_dir)
        if staged.returncode != 0:
            return {"published": False, "reason": staged.stderr.strip()}

        # nothing to do when the class content has not changed since last time
        if _git("diff", "--cached", "--quiet", "--", *PUBLISHED_FILES, cwd=repo_dir).returncode == 0:
            return {"published": False, "reason": "no change since the last publish"}

        message = f"Publish class updates synced at {result['synced_at']}"
        committed = _git("commit", "-m", message, "--only", "--", *PUBLISHED_FILES, cwd=repo_dir)
        if committed.returncode != 0:
            return {"published": False, "reason": committed.stderr.strip() or committed.stdout.strip()}

        branch = _git("rev-parse", "--abbrev-ref", "HEAD", cwd=repo_dir).stdout.strip()
        pushed = _git("push", "origin", branch, cwd=repo_dir)
        if pushed.returncode != 0:
            return {
                "published": False,
                "committed": True,
                "reason": f"Committed but could not push: {pushed.stderr.strip()}",
            }
        return {"published": True, "branch": branch, "synced_at": result["synced_at"]}
    except Exception as exc:
        return {"published": False, "reason": str(exc)}
