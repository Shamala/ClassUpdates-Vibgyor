"""
Automated background browser synchronization for Hubble Orion.
Performs headless Keycloak SSO authentication, extracts student profile,
syncs official circulars, and downloads daily class update PDFs.
"""

import json
import os
import re
import urllib.request
from typing import Any, Dict, List, Optional

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
except ImportError:
    pass

from backend.database import (
    add_circular,
    get_student_profile,
    is_placeholder_student_name,
    init_db,
    purge_placeholder_circulars,
    upsert_class_update,
    upsert_student,
)
from backend.pdf_parser import parse_vibgyor_pdf
from backend.student_profile import (
    build_student_profile,
    capture_profile_payloads,
    extract_student_profile,
    read_profile_page,
)

# Usernames that intentionally bypass the portal. Kept deliberately small: each one
# is an account anybody can sign in to without a password.
DEMO_IDENTITIES = {"demo", "demo@vibgyor.com"}

CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
]


def get_chrome_executable() -> Optional[str]:
    for path in CHROME_PATHS:
        if os.path.exists(path):
            return path
    return None


def _settle(page, timeout: int = 15000) -> None:
    """Lets the single-page app finish navigating before anything is read off it."""
    for state in ("domcontentloaded", "networkidle"):
        try:
            page.wait_for_load_state(state, timeout=timeout)
        except Exception:
            # networkidle never arrives on a page that polls; carry on regardless.
            pass


def _open_tile(page, label: str, timeout: int = 15000) -> bool:
    """Opens a dashboard tile by its visible text, then closes it again.

    query_selector returns a handle tied to one execution context, which a
    single-page app throws away the moment it navigates: on a machine whose
    timings differ from a laptop's, that race is the difference between a sync
    and a crash. A locator is resolved afresh on each use, so it survives the
    navigation, and a second attempt covers the case where one lands mid-flight.
    """
    for attempt in range(2):
        try:
            _settle(page)
            tile = page.get_by_text(label, exact=True).first
            tile.wait_for(state="visible", timeout=timeout)
            tile.click(timeout=timeout)
            page.wait_for_timeout(3000)
            page.keyboard.press("Escape")
            page.wait_for_timeout(1000)
            return True
        except Exception as exc:
            # The type alone: an exception message can carry page content.
            print(f"[browser_sync] Attempt {attempt + 1} to open '{label}': {type(exc).__name__}")
    return False


def run_orion_browser_sync(
    username: Optional[str] = None,
    password: Optional[str] = None,
    downloads_dir: Optional[str] = None,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes a fully automated headless browser sync session:
    1. Authenticates through Ampersand Keycloak SSO.
    2. Scrapes the real student profile and updates SQLite.
    3. Captures signed URLs for daily timetable PDFs and circulars.
    4. Downloads timetable PDFs to downloads_dir and parses them into the database.
    5. Ingests all real circulars into the database.
    """
    init_db(db_path)

    # Supplied by the caller from what the parent typed in; never stored anywhere.
    u = username or ""
    p_word = password or ""
    target_downloads = (
        downloads_dir
        or os.getenv("ORION_DOWNLOADS_DIR")
        or os.path.expanduser("~/vibgyor")
    )
    target_downloads = os.path.abspath(os.path.expanduser(os.path.expandvars(target_downloads)))
    os.makedirs(target_downloads, exist_ok=True)

    if not u or not p_word:
        return {
            "status": "error",
            "message": "Sign in with your Hubble Orion username and password to sync.",
        }

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {
            "status": "error",
            "message": "Playwright is not installed. Run: pip install playwright",
        }

    chrome_exec = get_chrome_executable()
    launch_kwargs: Dict[str, Any] = {"headless": True}
    if chrome_exec:
        launch_kwargs["executable_path"] = chrome_exec

    captured_notifications: List[Dict[str, Any]] = []

    def handle_response(resp):
        if "notification-to-user/by-user" in resp.url:
            try:
                data = resp.json()
                if data and isinstance(data, dict):
                    captured_notifications.append(data)
            except Exception:
                pass

    downloaded_files: List[str] = []
    profile_payloads: List[Any] = []
    circulars_count = 0
    student_info: Dict[str, str] = {}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(**launch_kwargs)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900}
            )
            page = context.new_page()
            page.on("response", handle_response)
            capture_profile_payloads(page, profile_payloads)

            # Step 1: Navigate to Dashboard / Login
            page.goto("https://hubbleorion.hubblehox.com/dashboard/", wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(3000)

            # Check if redirected to SSO
            if "gateway.ampersandgroup.in" in page.url or page.query_selector("#email"):
                page.fill("#email", u)
                page.fill("#password", p_word)
                page.click("#kc-login")
                page.wait_for_url(lambda u_cur: "hubbleorion.hubblehox.com" in u_cur and "api/auth" not in u_cur, timeout=25000)
                page.wait_for_timeout(4000)

            # Step 2: Visit the Student Detail page (grade / school / enrolment live here)
            _settle(page)
            profile_page_text = read_profile_page(page)

            # Step 3: Trigger Class Updates and Circulars to capture notifications API
            page.goto("https://hubbleorion.hubblehox.com/dashboard/", wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(3000)

            _open_tile(page, "Class Updates")
            _open_tile(page, "Circular")

            # Step 3b: Resolve the profile last, so the notifications captured above
            # (which carry student_name / student_id) can supply the real name.
            student_info = build_student_profile(
                profile_page_text,
                api_payloads=profile_payloads + captured_notifications,
                debug_dir=os.path.join(target_downloads, "_debug"),
                page=page,
            )
            upsert_student(
                student_id=student_info["student_id"],
                name=student_info["name"],
                grade=student_info["grade"],
                section=student_info["section"],
                school=student_info["school"],
                academic_year=student_info["academic_year"],
                parent_name=student_info.get("parent_name", ""),
                db_path=db_path,
            )
            stored = get_student_profile(student_info["student_id"], db_path=db_path)
            if stored and not is_placeholder_student_name(stored.get("name")):
                student_info = {**student_info, **{k: v for k, v in stored.items() if v}}

            browser.close()

    except Exception as exc:
        return {
            "status": "error",
            "message": f"Browser automation error: {str(exc)}",
            "student": student_info
        }

    # Step 4: Process captured notifications from Google Cloud Run
    all_records: List[Dict[str, Any]] = []
    for payload in captured_notifications:
        data_obj = payload.get("data", {})
        if isinstance(data_obj, dict):
            items = data_obj.get("data", [])
            if isinstance(items, list):
                all_records.extend(items)

    # Ingest Circulars and Download Class Updates
    if all_records:
        purge_placeholder_circulars(db_path)

    for item in all_records:
        slug = item.get("communication_master_slug") or item.get("mode") or ""
        created_at_raw = item.get("created_at") or item.get("published_date") or ""
        pub_date = created_at_raw.split("T")[0] if "T" in created_at_raw else created_at_raw[:10]
        attachments = item.get("attachment") or []

        if slug == "Class Updates":
            for file_url in attachments:
                if not file_url:
                    continue
                # Extract clean filename
                if "filename%3D%22communication%2F" in file_url:
                    clean_name = file_url.split("filename%3D%22communication%2F")[-1].split("%22")[0]
                else:
                    clean_name = file_url.split("?")[0].split("/")[-1]

                dest_path = os.path.join(target_downloads, clean_name)
                # Download if not already present
                if not os.path.exists(dest_path) or os.path.getsize(dest_path) == 0:
                    try:
                        urllib.request.urlretrieve(file_url, dest_path)
                        downloaded_files.append(clean_name)
                    except Exception as dl_err:
                        print(f"[browser_sync] Error downloading {clean_name}: {dl_err}")

                # Parse and upsert into database
                if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
                    try:
                        parsed = parse_vibgyor_pdf(dest_path)
                        if parsed and parsed.get("date"):
                            upsert_class_update(parsed, source_pdf=clean_name, db_path=db_path)
                    except Exception as p_err:
                        print(f"[browser_sync] Error parsing {clean_name}: {p_err}")

        elif slug == "Circular":
            mode_dict = item.get("mode") or {}
            subj_raw = ""
            content_raw = ""
            for m_val in mode_dict.values():
                if isinstance(m_val, dict):
                    subj_raw = m_val.get("subject") or subj_raw
                    content_raw = m_val.get("content") or content_raw

            title = re.sub(r"<[^>]+>", " ", subj_raw)
            title = re.sub(r"&nbsp;", " ", title)
            title = re.sub(r"&amp;", "&", title)
            title = re.sub(r"-\s*\([^\)]+\)", "", title)
            title = re.sub(r"\s+", " ", title).strip()
            if not title:
                title = item.get("title") or item.get("otherSubCategory") or "School Circular"

            summary = re.sub(r"<[^>]+>", " ", content_raw)
            summary = re.sub(r"&nbsp;", " ", summary)
            summary = re.sub(r"&amp;", "&", summary)
            summary = re.sub(r"\s+", " ", summary).strip()
            if not summary:
                summary = f"Official circular issued to parents of {student_info.get('name', 'Student')}."

            category = "Academic"
            if any(k in title.lower() for k in ["sports", "football", "cricket", "basketball", "champs", "cup"]):
                category = "Sports"
            elif any(k in title.lower() for k in ["fiesta", "friday", "celebration", "fest", "ensemble"]):
                category = "Events"
            elif any(k in title.lower() for k in ["holiday", "transport", "manual", "admissions", "fee"]):
                category = "Admin"

            file_url = ""
            if attachments and attachments[0]:
                raw_url = attachments[0]
                circ_dir = os.path.join(target_downloads, "circulars")
                os.makedirs(circ_dir, exist_ok=True)
                if "filename%3D%22communication%2F" in raw_url:
                    clean_name = raw_url.split("filename%3D%22communication%2F")[-1].split("%22")[0]
                else:
                    clean_name = raw_url.split("?")[0].split("/")[-1]
                dest_circ = os.path.join(circ_dir, clean_name)
                try:
                    if not os.path.exists(dest_circ) or os.path.getsize(dest_circ) == 0:
                        urllib.request.urlretrieve(raw_url, dest_circ)
                    file_url = f"/circulars/{clean_name}"
                except Exception as e:
                    print(f"[browser_sync] Notice on circular PDF {clean_name}: {e}")
                    file_url = f"/circulars/{clean_name}"

            add_circular(
                title=title,
                category=category,
                publish_date=pub_date or "2026-09-22",
                file_url=file_url,
                summary=summary,
                db_path=db_path
            )
            circulars_count += 1

    return {
        "status": "success",
        "mode": "browser_live_sync",
        "student": student_info,
        "pdfs_synced": len(downloaded_files),
        "circulars_synced": circulars_count,
        "message": f"Successfully synced live Orion data for {student_info.get('name', 'Student')}.",
    }


def authenticate_orion_credentials(
    username: str,
    password: str,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Validates user credentials against Hubble Orion / Keycloak SSO.
    Supports demo / offline mode for testing.
    """
    clean_u = (username or "").strip().lower()
    clean_p = (password or "").strip()

    if not clean_u:
        return {"success": False, "reason": "invalid_credentials", "message": "Username / Email is required."}
    if not clean_p:
        return {"success": False, "reason": "invalid_credentials", "message": "Password is required."}

    # The demo identities are the only ones that skip the portal, and they never see
    # the real profile. They used to include plausible addresses like
    # parent@vibgyor.com, which let anyone in with any password.
    if clean_u in DEMO_IDENTITIES:
        return {
            "success": True,
            "mode": "demo",
            "student": None,
            "message": "Logged in via Demo Mode",
        }

    # Attempt live authentication via headless browser
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        # We cannot check the password at all, so we must not grant access.
        return {
            "success": False,
            "reason": "unavailable",
            "message": "Cannot verify credentials: Playwright is not installed. Run: pip install playwright",
        }

    chrome_exec = get_chrome_executable()
    launch_kwargs: Dict[str, Any] = {"headless": True}
    if chrome_exec:
        launch_kwargs["executable_path"] = chrome_exec

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(**launch_kwargs)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900}
            )
            page = context.new_page()
            profile_payloads: List[Any] = []
            capture_profile_payloads(page, profile_payloads)

            page.goto("https://hubbleorion.hubblehox.com/dashboard/", wait_until="domcontentloaded", timeout=25000)
            page.wait_for_timeout(2500)

            if "gateway.ampersandgroup.in" in page.url or page.query_selector("#email"):
                page.fill("#email", clean_u)
                page.fill("#password", clean_p)
                page.click("#kc-login")
                page.wait_for_timeout(2500)

                err_el = page.query_selector(".alert-error, #input-error, .kc-feedback-text")
                if err_el:
                    err_msg = err_el.inner_text().strip()
                    browser.close()
                    return {"success": False, "reason": "invalid_credentials",
                            "message": err_msg or "Invalid username or password on Hubble Orion."}

                try:
                    page.wait_for_url(lambda u_cur: "hubbleorion.hubblehox.com" in u_cur and "api/auth" not in u_cur, timeout=20000)
                except Exception:
                    err_el2 = page.query_selector(".alert-error, #input-error, .kc-feedback-text")
                    if err_el2:
                        err_msg = err_el2.inner_text().strip()
                        browser.close()
                        return {"success": False, "reason": "invalid_credentials",
                                "message": err_msg or "Invalid credentials on Hubble Orion."}

                # Still parked on the SSO gateway means the credentials never took;
                # without this we reported a successful "live" login for bad logins.
                if "gateway.ampersandgroup.in" in page.url or page.query_selector("#kc-login"):
                    browser.close()
                    return {
                        "success": False,
                        "reason": "invalid_credentials",
                        "message": "Hubble Orion did not accept those credentials.",
                    }

            # If logged in successfully, extract the real student profile
            student_info = extract_student_profile(
                page,
                api_payloads=profile_payloads,
                debug_dir=os.path.join(
                    os.path.expanduser(os.getenv("ORION_DOWNLOADS_DIR", "~/vibgyor")), "_debug"
                ),
            )
            upsert_student(
                student_id=student_info["student_id"],
                name=student_info["name"],
                grade=student_info["grade"],
                section=student_info["section"],
                school=student_info["school"],
                academic_year=student_info["academic_year"],
                parent_name=student_info.get("parent_name", ""),
                db_path=db_path,
            )
            browser.close()
            # upsert_student keeps a previously stored real name over a placeholder,
            # so read the profile back rather than returning what this scrape saw.
            stored = get_student_profile(student_info["student_id"], db_path=db_path)
            if stored and not is_placeholder_student_name(stored.get("name")):
                student_info = {**student_info, **{k: v for k, v in stored.items() if v}}
            return {"success": True, "student": student_info, "mode": "live"}

    except Exception as e:
        # Could not reach the portal. We still cannot verify the password, so this
        # is a failure, not a reason to sign someone in.
        return {"success": False, "reason": "unreachable",
                "message": f"Could not reach Hubble Orion to verify your credentials: {str(e)}"}


