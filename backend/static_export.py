"""
Builds the published bundle for the shared class board.

The class diary is class-level: every parent in the class receives the identical
daily PDF. Only the child's name and the homework ticks are personal, and both
already live in each parent's own browser. So this exports the class content and
deliberately exports no student identity and no completion state.

Two files are written:

  class_data.enc.js  the real class content, encrypted with the class passcode.
                     Safe to commit and publish: without the passcode it is
                     ciphertext. The passcode never leaves this machine.
  static_data.js     a sanitised sample with the same shape, used by the demo
                     button, so the published site shows nothing real in clear.

The payload comes from the same database functions the REST API serves, so the
published shapes cannot drift from the live ones.
"""

import base64
import hashlib
import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

# Depends on the data layer, not the web layer: main imports the publisher, which
# imports this, so reaching back into main would be a cycle.
from backend.database import (
    get_available_dates,
    get_circulars,
    get_daily_update,
    get_weekly_updates,
    init_db,
)

PBKDF2_ITERATIONS = 250_000
FRONTEND_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend"
)

# Published in place of the real child, so every parent sets their own name locally.
CLASS_STUDENT = {
    "student_id": "CLASS",
    "name": "Student",
    "grade": "Grade 1",
    "section": "F",
    "school": "VIBGYOR High",
    "academic_year": "2026 - 27",
    "roll_no": "",
    "parent_name": "",
}


# The shared board is a current-term noticeboard, not the school's whole archive.
# An unattended sync reaches far more of the portal's notification feed than a
# hurried manual one ever did, and without this the Circulars tab would fill with
# months of notices nobody is looking for any more.
CIRCULAR_WINDOW_DAYS = 60


def _recent_circulars(circulars, anchor_date: str):
    """Keeps the circulars published within the window before anchor_date.

    Anchored to the newest class update rather than to today, so a board with no
    new data does not quietly change shape (and force a redeploy) every night.
    """
    try:
        anchor = datetime.strptime(anchor_date, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return circulars
    cutoff = (anchor - timedelta(days=CIRCULAR_WINDOW_DAYS)).isoformat()
    kept = [c for c in circulars if (c.get("publish_date") or "") >= cutoff]
    # An unparseable or missing date on every row should not empty the tab.
    return kept or circulars


def _monday_of(iso_date: str) -> str:
    day = datetime.strptime(iso_date, "%Y-%m-%d").date()
    return (day - timedelta(days=day.weekday())).isoformat()


def _strip_completion(node: Any) -> Any:
    """
    Removes one parent's homework ticks from the published data.

    Completion is personal and the database stores it per class period rather than
    per parent, so publishing it as-is would show everyone one family's progress.
    Each browser overlays its own ticks from localStorage instead.
    """
    if isinstance(node, dict):
        out = {}
        for key, value in node.items():
            if key == "is_completed":
                out[key] = False
            elif key == "completed_at":
                out[key] = None
            elif key == "completed_homework_count":
                out[key] = 0
            elif key == "all_homework_completed":
                out[key] = False
            else:
                out[key] = _strip_completion(value)
        if "homework_count" in out and "has_pending_homework" in out:
            out["has_pending_homework"] = bool(out.get("homework_count"))
        return out
    if isinstance(node, list):
        return [_strip_completion(item) for item in node]
    return node


def _strip_identity(node: Any) -> Any:
    """
    Removes the identifiers that ride along inside the class rows.

    Every daily update and period row carries the student_id it was synced under,
    which is the enrolment number. The class board identifies nobody, so these are
    replaced wholesale rather than relying on the student object alone.
    """
    if isinstance(node, dict):
        return {
            key: (CLASS_STUDENT["student_id"] if key == "student_id" else _strip_identity(value))
            for key, value in node.items()
        }
    if isinstance(node, list):
        return [_strip_identity(item) for item in node]
    return node


def build_payload(db_path: Optional[str] = None) -> Dict[str, Any]:
    init_db(db_path)
    dates = get_available_dates()
    if not dates:
        raise SystemExit("No class updates in the database. Run a sync first.")

    daily = {}
    for entry in dates:
        daily[entry["date"]] = get_daily_update(entry["date"])

    payload = {
        "student": dict(CLASS_STUDENT),
        "dates": dates,
        "daily": daily,
        "weekly": get_weekly_updates(start_date=_monday_of(dates[0]["date"])),
        "circulars": _recent_circulars(get_circulars(), dates[0]["date"]),
        "synced_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    return _strip_identity(_strip_completion(payload))


SAMPLE_WORDS = ["apple", "river", "cloud", "stone", "bright", "quiet"]


def sanitise(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Keeps the structure, replaces every piece of real class content."""
    data = json.loads(json.dumps(payload))
    data["student"] = {
        **CLASS_STUDENT,
        "student_id": "DEMO-G1F-001",
        "name": "Demo Student",
        "school": "VIBGYOR High (Demo)",
    }

    def sample_words(index: int):
        return [SAMPLE_WORDS[index % len(SAMPLE_WORDS)], SAMPLE_WORDS[(index + 1) % len(SAMPLE_WORDS)]]

    for index, entry in enumerate(data.get("dates", [])):
        entry["words_of_the_day"] = sample_words(index)
        entry["words_raw"] = ",".join(entry["words_of_the_day"])

    def scrub_update(update: Dict[str, Any], index: int):
        update["words_of_the_day"] = sample_words(index)
        update["words_raw"] = ",".join(update["words_of_the_day"])
        update["teacher_note"] = "Sample teacher note for the demo dashboard."
        update["source_pdf"] = "sample.pdf"
        for period in update.get("periods", []) or []:
            period["topic"] = "Sample topic"
            period["sub_topic"] = "Sample sub-topic"
            if period.get("cw") not in (None, "", "NIL"):
                period["cw"] = "Sample class work"
            if period.get("reinforcement") not in (None, "", "NIL"):
                period["reinforcement"] = "Sample homework"
            if period.get("skill_assessed") not in (None, "", "NIL"):
                period["skill_assessed"] = "Sample skill"

    for index, update in enumerate((data.get("daily") or {}).values()):
        scrub_update(update, index)

    weekly = data.get("weekly") or {}
    for index, day in enumerate(weekly.get("days", []) or []):
        scrub_update(day, index)
    # the weekly view also carries its own rolled-up copies of the same content
    if weekly.get("weekly_dictation_words"):
        weekly["weekly_dictation_words"] = SAMPLE_WORDS[: len(weekly["weekly_dictation_words"])]
    for item in weekly.get("active_homework_items", []) or []:
        item["topic"] = "Sample topic"
        item["reinforcement"] = "Sample homework"

    for circular in data.get("circulars", []) or []:
        circular["title"] = "Sample circular"
        circular["summary"] = "Sample circular summary for the demo dashboard."
        circular["file_url"] = ""
    return data


def content_hash(payload: Dict[str, Any]) -> str:
    """
    Fingerprints the class content, ignoring when it was synced.

    Each build uses a fresh salt and IV, so the ciphertext always differs even when
    nothing changed. Without this, every sync would commit and redeploy the board.
    """
    body = {k: v for k, v in payload.items() if k != "synced_at"}
    return hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def published_content_hash(out_dir: Optional[str] = None) -> Optional[str]:
    """The fingerprint of whatever is already published, or None."""
    path = os.path.join(out_dir or FRONTEND_DIR, "class_data.enc.js")
    try:
        with open(path) as fh:
            found = re.search(r'"content_hash"\s*:\s*"([0-9a-f]{64})"', fh.read())
        return found.group(1) if found else None
    except OSError:
        return None


def encrypt(payload: Dict[str, Any], passcode: str) -> Dict[str, Any]:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

    salt = secrets.token_bytes(16)
    iv = secrets.token_bytes(12)
    key = PBKDF2HMAC(
        algorithm=hashes.SHA256(), length=32, salt=salt, iterations=PBKDF2_ITERATIONS
    ).derive(passcode.encode("utf-8"))
    ciphertext = AESGCM(key).encrypt(iv, json.dumps(payload).encode("utf-8"), None)
    return {
        "v": 1,
        "kdf": "PBKDF2-SHA256",
        "iterations": PBKDF2_ITERATIONS,
        "salt": base64.b64encode(salt).decode(),
        "iv": base64.b64encode(iv).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode(),
        # plaintext so the lock screen can show how fresh the data is
        "synced_at": payload.get("synced_at"),
        # lets a publish skip itself when the class content has not changed
        "content_hash": content_hash(payload),
    }


def write_bundles(
    passcode: str,
    db_path: Optional[str] = None,
    out_dir: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    out_dir = out_dir or FRONTEND_DIR
    payload = payload if payload is not None else build_payload(db_path)

    encrypted_path = os.path.join(out_dir, "class_data.enc.js")
    with open(encrypted_path, "w") as fh:
        fh.write(
            "/**\n"
            " * Class content for the shared board, encrypted with the class passcode.\n"
            " * Generated by backend/static_export.py - do not edit by hand.\n"
            " * Without the passcode this file is ciphertext, so it is safe to publish.\n"
            " */\n"
            "window.VIBGYOR_ENCRYPTED_DATA = "
            + json.dumps(encrypt(payload, passcode), indent=2)
            + ";\n"
        )

    demo_path = os.path.join(out_dir, "static_data.js")
    with open(demo_path, "w") as fh:
        fh.write(
            "/**\n"
            " * Sample dataset for the demo button. Same shape as the real class data,\n"
            " * with every piece of real content replaced.\n"
            " * Generated by backend/static_export.py - do not edit by hand.\n"
            " */\n"
            "window.VIBGYOR_STATIC_DATA = "
            + json.dumps(sanitise(payload), indent=2)
            + ";\n"
        )
    return {
        "encrypted": encrypted_path,
        "demo": demo_path,
        "synced_at": payload["synced_at"],
        "content_hash": content_hash(payload),
    }


if __name__ == "__main__":
    try:
        from dotenv import load_dotenv

        load_dotenv(os.path.join(os.path.dirname(FRONTEND_DIR), ".env"))
    except ImportError:
        pass

    code = (os.getenv("SITE_PASSCODE") or "").strip()
    if not code:
        raise SystemExit(
            "SITE_PASSCODE is not set. Add it to .env (it is gitignored and never "
            "leaves this machine); parents need it to open the published board."
        )
    result = write_bundles(code)
    print(f"Wrote {result['encrypted']}")
    print(f"Wrote {result['demo']}")
    print(f"Class content synced at {result['synced_at']}")
