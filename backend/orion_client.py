"""
VIBGYOR Orion Portal Client.
Connects to https://hubbleorion.hubblehox.com to sync child timetable updates,
notices, and circulars. Includes robust offline fallback to ingest any PDFs
dropped into sample_data/ or downloads.
"""

import glob
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from backend.database import (
    add_circular,
    get_available_dates,
    init_db,
    upsert_class_update,
)
from backend.pdf_parser import parse_vibgyor_pdf


class OrionClient:
    """Client for VIBGYOR Hubble Orion portal."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        downloads_dir: Optional[str] = None,
    ):
        self.base_url = (
            base_url
            or os.getenv("ORION_BASE_URL", "https://hubbleorion.hubblehox.com")
        ).rstrip("/")
        self.username = username or os.getenv("ORION_USERNAME", "")
        self.password = password or os.getenv("ORION_PASSWORD", "")

        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.sample_data_dir = os.path.join(project_root, "sample_data")
        raw_downloads = (
            downloads_dir
            or os.getenv("ORION_DOWNLOADS_DIR")
            or os.path.join(project_root, "downloads")
        )
        self.downloads_dir = os.path.abspath(os.path.expanduser(os.path.expandvars(raw_downloads)))
        try:
            os.makedirs(self.downloads_dir, exist_ok=True)
        except OSError:
            pass

        self.session_token: Optional[str] = None
        self.is_authenticated: bool = False

    def is_dummy_or_empty_credentials(self) -> bool:
        """Checks if configured credentials are empty or placeholder values."""
        if not self.username or not self.password:
            return True
        dummy_markers = ["example.com", "dummy", "demo", "placeholder", "your_username", "parent_demo"]
        return any(marker in self.username.lower() for marker in dummy_markers)

    def authenticate(self) -> bool:
        """
        Attempts login against the Orion portal.
        Returns False gracefully on connection failure, offline mode, or dummy credentials.
        """
        if self.is_dummy_or_empty_credentials():
            print("[orion_client] Empty or placeholder credentials detected. Using local ingestion mode.")
            return False

        login_url = f"{self.base_url}/api/v1/auth/login"
        payload = json.dumps({"username": self.username, "password": self.password}).encode("utf-8")
        req = urllib.request.Request(
            login_url,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "ClassUpdates-Vibgyor/1.0"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self.session_token = data.get("token") or data.get("access_token")
                self.is_authenticated = bool(self.session_token)
                return self.is_authenticated
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, Exception) as err:
            print(f"[orion_client] Online login attempt failed ({err}). Falling back to local offline mode.")
            self.is_authenticated = False
            return False

    def sync_local_pdfs(self, custom_dirs: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Scans local directories for VIBGYOR timetable PDFs and ingests them into the database.
        """
        dirs_to_scan = [self.sample_data_dir]
        if os.path.exists(self.downloads_dir):
            dirs_to_scan.append(self.downloads_dir)
        if custom_dirs:
            dirs_to_scan.extend(custom_dirs)

        processed_files: List[str] = []
        errors: List[str] = []
        updates_count = 0

        for d in dirs_to_scan:
            if not os.path.exists(d):
                continue
            pdf_patterns = [os.path.join(d, "*.pdf"), os.path.join(d, "*.PDF")]
            for pattern in pdf_patterns:
                for pdf_file in glob.glob(pattern):
                    base_name = os.path.basename(pdf_file)
                    try:
                        parsed = parse_vibgyor_pdf(pdf_file)
                        if parsed and parsed.get("date"):
                            upsert_class_update(parsed, source_pdf=base_name)
                            processed_files.append(base_name)
                            updates_count += 1
                    except Exception as parse_err:
                        errors.append(f"{base_name}: {str(parse_err)}")

        return {
            "status": "success",
            "mode": "offline_local_sync",
            "files_processed": list(set(processed_files)),
            "new_updates": updates_count,
            "errors": errors,
            "message": f"Successfully ingested {len(set(processed_files))} timetable PDF(s) from local storage.",
        }

    def sync_all(
        self,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main sync orchestrator:
        1. Attempts automated background browser sync against Hubble Orion Keycloak SSO using provided or configured credentials.
        2. Seamlessly falls back to local PDF ingestion if browser sync is unavailable.
        """
        init_db()

        u = username or self.username
        p = password or self.password

        if u and p and not any(marker in u.lower() for marker in ["example.com", "dummy", "demo", "placeholder"]):
            try:
                from backend.browser_sync import run_orion_browser_sync
                result = run_orion_browser_sync(
                    username=u,
                    password=p,
                    downloads_dir=self.downloads_dir
                )
                if result.get("status") == "success":
                    return result
                print(f"[orion_client] Browser sync warning: {result.get('message')}")
            except Exception as e:
                print(f"[orion_client] Browser sync failed: {e}. Falling back to local PDFs.")

        # Fallback to local storage ingestion
        return self.sync_local_pdfs()


# Convenience singleton
default_client = OrionClient()


def trigger_sync(
    username: Optional[str] = None,
    password: Optional[str] = None,
) -> Dict[str, Any]:
    """Helper function to trigger sync with optional dynamic credentials."""
    return default_client.sync_all(username=username, password=password)


if __name__ == "__main__":
    result = trigger_sync()
    print("Sync result:", json.dumps(result, indent=2))
