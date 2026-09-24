"""
API Integration and Unit Tests for ClassUpdates-Vibgyor.
Tests all endpoints using in-memory HTTP protocol parsing and dispatch,
avoiding OS sandbox network socket restrictions.
"""

import io
import json
import os
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.database import init_db, seed_sample_data
from backend.main import VibgyorHTTPRequestHandler


class DummySocket:
    """In-memory socket shim to test HTTP server handler without opening network ports."""

    def __init__(self, request_bytes: bytes):
        self.rfile = io.BytesIO(request_bytes)
        self.wfile = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if "b" in mode:
            if "r" in mode:
                return self.rfile
            else:
                return self.wfile
        return None

    def sendall(self, data: bytes):
        self.wfile.write(data)


def execute_http_request(method: str, path: str, payload=None):
    """
    Executes an in-memory HTTP request against VibgyorHTTPRequestHandler.
    Returns (status_code: int, headers: dict, data: Any).
    """
    body_bytes = b""
    if payload is not None:
        body_bytes = json.dumps(payload).encode("utf-8")

    req_str = f"{method} {path} HTTP/1.1\r\nHost: localhost\r\nContent-Length: {len(body_bytes)}\r\n\r\n"
    req_bytes = req_str.encode("utf-8") + body_bytes

    sock = DummySocket(req_bytes)
    # Instantiate handler with dummy socket and mock client address
    VibgyorHTTPRequestHandler(sock, ("127.0.0.1", 50000), None)

    sock.wfile.seek(0)
    raw_response = sock.wfile.read()

    # Split headers and body
    header_end = raw_response.find(b"\r\n\r\n")
    if header_end == -1:
        return 500, {}, raw_response.decode("utf-8", errors="replace")

    headers_part = raw_response[:header_end].decode("utf-8", errors="replace")
    body_part = raw_response[header_end + 4 :]

    status_line = headers_part.splitlines()[0]
    status_code = int(status_line.split()[1])

    headers = {}
    for line in headers_part.splitlines()[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip()

    # Try parse JSON
    try:
        data = json.loads(body_part.decode("utf-8"))
    except Exception:
        data = body_part.decode("utf-8", errors="replace")

    return status_code, headers, data


class TestVibgyorApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_sample_data()

    def test_student_profile_endpoint(self):
        status, headers, data = execute_http_request("GET", "/api/student")
        self.assertEqual(status, 200)
        self.assertIn("application/json", headers.get("content-type", ""))
        self.assertEqual(data["name"], "Demo Student")
        self.assertIn(data["grade"], ["Grade 1", "Grade I"])
        self.assertEqual(data["section"], "F")
        self.assertIn("VIBGYOR", data["school"])

    def test_dates_endpoint(self):
        status, _, data = execute_http_request("GET", "/api/dates")
        self.assertEqual(status, 200)
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 2)
        dates_list = [d["date"] for d in data]
        self.assertIn("2026-09-18", dates_list)
        self.assertIn("2026-09-21", dates_list)

    def test_daily_update_endpoint_18th(self):
        status, _, data = execute_http_request("GET", "/api/updates/daily?date=2026-09-18")
        self.assertEqual(status, 200)
        self.assertEqual(data["date"], "2026-09-18")
        self.assertEqual(data["words_of_the_day"], ["hear", "tame"])
        self.assertIn("Addition in Mathematics", data["teacher_note"])
        self.assertNotIn("Dear Parents", data["teacher_note"])
        self.assertNotIn("Warm Regards", data["teacher_note"])
        self.assertEqual(len(data["periods"]), 10)

        # Period 7 has active homework
        p7 = next(p for p in data["periods"] if p["period_number"] == 7)
        self.assertTrue(p7["is_homework"])
        self.assertEqual(p7["reinforcement"], "RWSH-14,15")

        # Period 8 has CWSH-22
        p8 = next(p for p in data["periods"] if p["period_number"] == 8)
        self.assertEqual(p8["cw"], "CWSH-22")

    def test_daily_update_endpoint_21st(self):
        status, _, data = execute_http_request("GET", "/api/updates/daily?date=2026-09-21")
        self.assertEqual(status, 200)
        self.assertEqual(data["date"], "2026-09-21")
        self.assertEqual(data["words_of_the_day"], ["gone", "saw"])
        self.assertEqual(len(data["periods"]), 10)

        # Period 1 has CW 24A,B,C & D
        p1 = next(p for p in data["periods"] if p["period_number"] == 1)
        self.assertEqual(p1["cw"], "24A,B,C & D")

        # Period 2 and Period 6 both canonicalized to Mathematics
        p2 = next(p for p in data["periods"] if p["period_number"] == 2)
        p6 = next(p for p in data["periods"] if p["period_number"] == 6)
        self.assertEqual(p2["subject"], "Mathematics")
        self.assertEqual(p6["subject"], "Mathematics")

        # Period 7 has Tinkercad project
        p7 = next(p for p in data["periods"] if p["period_number"] == 7)
        self.assertTrue(p7["is_homework"])
        self.assertIn("Tinkercad project 3", p7["reinforcement"])

    def test_weekly_update_endpoint(self):
        status, _, data = execute_http_request("GET", "/api/updates/weekly?start_date=2026-09-21")
        self.assertEqual(status, 200)
        self.assertIn("week_start", data)
        self.assertIn("week_end", data)
        self.assertIn("days", data)
        self.assertEqual(len(data["days"]), 5)  # 5 school days Mon-Fri

        # Weekly words
        self.assertIn("gone", data["weekly_dictation_words"])
        self.assertIn("saw", data["weekly_dictation_words"])

    def test_circulars_endpoint(self):
        status, _, data = execute_http_request("GET", "/api/circulars")
        self.assertEqual(status, 200)
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 4)
        titles = [c["title"] for c in data]
        self.assertTrue(any("Viva" in t for t in titles))
        self.assertTrue(any("Exam" in t or "Holiday" in t for t in titles))
        # Ensure summaries are concise
        for c in data:
            self.assertTrue(len(c["summary"]) <= 350)

    def test_toggle_homework_completion(self):
        _, _, daily = execute_http_request("GET", "/api/updates/daily?date=2026-09-18")
        hw_period = next(p for p in daily["periods"] if p["is_homework"])
        p_id = hw_period["id"]
        initial_status = hw_period["is_completed"]

        # Toggle via POST
        status1, _, res1 = execute_http_request("POST", f"/api/homework/{p_id}/toggle")
        self.assertEqual(status1, 200)
        self.assertTrue(res1["success"])
        self.assertEqual(res1["period"]["is_completed"], not initial_status)

        # Toggle back
        status2, _, res2 = execute_http_request("POST", f"/api/homework/{p_id}/toggle")
        self.assertEqual(status2, 200)
        self.assertTrue(res2["success"])
        self.assertEqual(res2["period"]["is_completed"], initial_status)

    def test_sync_endpoint(self):
        from unittest.mock import patch
        with patch("backend.main.handle_trigger_sync", return_value={"status": "success", "files_processed": ["sample.pdf"]}):
            status, _, res = execute_http_request("POST", "/api/sync")
            self.assertEqual(status, 200)
            self.assertEqual(res["status"], "success")
            self.assertIn("files_processed", res)

    def test_circular_pdf_serving(self):
        # Serving existing PDF
        status, headers, content = execute_http_request("GET", "/circulars/sample_2026-09-18.pdf")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get("content-type"), "application/pdf")

        # Serving nonexistent circular gives friendly notice page, not 404
        status2, headers2, content2 = execute_http_request("GET", "/circulars/circular-diagnostic-assessment.pdf")
        self.assertEqual(status2, 200)
        self.assertIn("text/html", headers2.get("content-type", ""))
        self.assertIn("In-App School Notice", content2)

    def test_serve_frontend_root(self):
        status, headers, content = execute_http_request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", headers.get("content-type", ""))
        self.assertIn("VIBGYOR", content)
        self.assertIn("Words of the Day", content)

    def test_serve_static_assets(self):
        # Verify relative static file endpoints
        for asset, expected_mime in [
            ("/tailwind.css", "css"),
            ("/style.css", "css"),
            ("/app.js", "javascript"),
            ("/static_data.js", "javascript"),
            ("/manifest.json", "json"),
            ("/sw.js", "javascript"),
            ("/icons/icon-192.png", "image"),
        ]:
            status, headers, content = execute_http_request("GET", asset)
            self.assertEqual(status, 200, f"Failed to serve {asset}")
            self.assertIn(expected_mime, headers.get("content-type", "").lower())

    def test_page_styles_itself_without_a_cdn(self):
        """The compiled stylesheet must ship, and no CDN compiler may come back.

        cdn.tailwindcss.com warns that it is not for production: it hands every
        visitor a compiler and leaves the page unstyled until it has run.
        """
        status, _, page = execute_http_request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn('href="tailwind.css"', page)
        self.assertNotIn("cdn.tailwindcss.com", page)

        status, headers, css = execute_http_request("GET", "/tailwind.css")
        self.assertEqual(status, 200)
        self.assertIn("css", headers.get("content-type", "").lower())
        # a utility the dashboard actually uses, and a dark-mode variant
        self.assertIn(".flex", css)
        self.assertIn("dark", css)

    def test_not_found_endpoint(self):
        status, _, data = execute_http_request("GET", "/api/nonexistent")
        self.assertEqual(status, 404)


if __name__ == "__main__":
    unittest.main()
