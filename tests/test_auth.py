"""
Authentication Tests for ClassUpdates-Vibgyor.
Tests login, session creation, session validation (/api/auth/me), and logout.
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


def execute_auth_request(method: str, path: str, payload=None, token: str = None, headers_extra=None):
    body_bytes = b""
    if payload is not None:
        body_bytes = json.dumps(payload).encode("utf-8")

    headers_lines = [
        f"{method} {path} HTTP/1.1",
        "Host: localhost",
        f"Content-Length: {len(body_bytes)}",
    ]
    if payload is not None:
        headers_lines.append("Content-Type: application/json")
    if token:
        headers_lines.append(f"Authorization: Bearer {token}")
    if headers_extra:
        for k, v in headers_extra.items():
            headers_lines.append(f"{k}: {v}")

    req_str = "\r\n".join(headers_lines) + "\r\n\r\n"
    req_bytes = req_str.encode("utf-8") + body_bytes

    sock = DummySocket(req_bytes)
    VibgyorHTTPRequestHandler(sock, ("127.0.0.1", 50000), None)

    sock.wfile.seek(0)
    raw_response = sock.wfile.read()

    header_end = raw_response.find(b"\r\n\r\n")
    if header_end == -1:
        return 500, {}, None

    header_part = raw_response[:header_end].decode("utf-8", errors="replace")
    body_part = raw_response[header_end + 4:]

    lines = header_part.split("\r\n")
    status_line = lines[0]
    parts = status_line.split(" ")
    status_code = int(parts[1]) if len(parts) > 1 else 200

    resp_headers = {}
    for line in lines[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            resp_headers[k.strip().lower()] = v.strip()

    parsed_body = None
    if body_part:
        try:
            parsed_body = json.loads(body_part.decode("utf-8"))
        except Exception:
            parsed_body = body_part

    return status_code, resp_headers, parsed_body


class TestVibgyorAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_sample_data()

    def test_demo_login_success(self):
        """Test logging in via Demo Mode."""
        status, headers, body = execute_auth_request("POST", "/api/auth/login", payload={"is_demo": True})
        self.assertEqual(status, 200)
        self.assertTrue(body.get("success"))
        self.assertIn("token", body)
        self.assertEqual(body.get("mode"), "demo")
        self.assertIn("student", body)
        self.assertEqual(body["student"]["name"], "Demo Student")

    def test_demo_login_by_username(self):
        """Test logging in by passing username 'demo'."""
        status, headers, body = execute_auth_request("POST", "/api/auth/login", payload={"username": "demo", "password": "any"})
        self.assertEqual(status, 200)
        self.assertTrue(body.get("success"))
        self.assertIn("token", body)

    def test_empty_credentials_rejected(self):
        """Test empty credentials return 401."""
        status, headers, body = execute_auth_request("POST", "/api/auth/login", payload={"username": "", "password": ""})
        self.assertEqual(status, 401)
        self.assertFalse(body.get("success", False))

    def test_auth_me_unauthenticated(self):
        """Test /api/auth/me without token returns authenticated=False."""
        status, headers, body = execute_auth_request("GET", "/api/auth/me")
        self.assertEqual(status, 200)
        self.assertFalse(body.get("authenticated"))

    def test_auth_me_with_valid_token(self):
        """Test /api/auth/me with a valid token returns authenticated user and student."""
        # 1. Login to get token
        status, headers, body = execute_auth_request("POST", "/api/auth/login", payload={"is_demo": True})
        token = body["token"]

        # 2. Check /api/auth/me with Bearer token
        status, headers, me_body = execute_auth_request("GET", "/api/auth/me", token=token)
        self.assertEqual(status, 200)
        self.assertTrue(me_body.get("authenticated"))
        self.assertIn("user", me_body)
        self.assertIn("student", me_body)
        self.assertEqual(me_body["student"]["name"], "Demo Student")

    def test_logout(self):
        """Test /api/auth/logout clears the session."""
        # 1. Login
        status, headers, body = execute_auth_request("POST", "/api/auth/login", payload={"is_demo": True})
        token = body["token"]

        # 2. Logout
        status, headers, logout_body = execute_auth_request("POST", "/api/auth/logout", token=token)
        self.assertEqual(status, 200)
        self.assertTrue(logout_body.get("success"))

        # 3. /api/auth/me should now be unauthenticated
        status, headers, me_body = execute_auth_request("GET", "/api/auth/me", token=token)
        self.assertEqual(status, 200)
        self.assertFalse(me_body.get("authenticated"))


if __name__ == "__main__":
    unittest.main()

