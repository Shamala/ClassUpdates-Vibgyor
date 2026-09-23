"""
Tests for the unattended (GitHub Actions) sync.

This repository is public, which makes the job's build log public too. What the
job prints therefore matters as much as what it does: the credentials it was
given and anything it scraped must never appear in that log.
"""

import io
import os
import tempfile
import sys
import unittest
from contextlib import redirect_stdout

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend import scheduled_sync

USERNAME = "parent@example.com"
PASSWORD = "sup3r-secret-pass"
PASSCODE = "test-passcode"


class ScheduledSyncTestCase(unittest.TestCase):
    """Restores the environment and any patched function after every test."""

    def setUp(self):
        self._env = {
            key: os.environ.get(key)
            for key in ("ORION_USERNAME", "ORION_PASSWORD", "SITE_PASSCODE", "PUBLISH_AFTER_SYNC")
        }
        self._patched = {}
        os.environ["ORION_USERNAME"] = USERNAME
        os.environ["ORION_PASSWORD"] = PASSWORD
        os.environ["SITE_PASSCODE"] = PASSCODE
        os.environ.pop("PUBLISH_AFTER_SYNC", None)

    def tearDown(self):
        for key, value in self._env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        for name, original in self._patched.items():
            setattr(scheduled_sync, name, original)

    def patch(self, name, replacement):
        self._patched.setdefault(name, getattr(scheduled_sync, name))
        setattr(scheduled_sync, name, replacement)

    def run_job(self, publish=False):
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            code = scheduled_sync.run(publish=publish)
        return code, buffer.getvalue()


class TestRedaction(ScheduledSyncTestCase):
    def test_credentials_never_survive(self):
        cleaned = scheduled_sync.redact(f"Login failed for {USERNAME} using {PASSWORD}")
        self.assertNotIn(USERNAME, cleaned)
        self.assertNotIn(PASSWORD, cleaned)
        self.assertEqual(cleaned.count(scheduled_sync.REDACTED), 2)

    def test_passcode_never_survives(self):
        self.assertNotIn(PASSCODE, scheduled_sync.redact(f"bundle built with {PASSCODE}"))

    def test_scraped_student_details_never_survive(self):
        result = {"student": {"name": "Aarav Rao", "student_id": "EN00000000001"}}
        cleaned = scheduled_sync.redact("Synced for Aarav Rao (EN00000000001).", result)
        self.assertNotIn("Aarav Rao", cleaned)
        self.assertNotIn("EN00000000001", cleaned)

    def test_harmless_text_is_left_alone(self):
        for key in ("ORION_USERNAME", "ORION_PASSWORD", "SITE_PASSCODE"):
            os.environ.pop(key, None)
        self.assertEqual(scheduled_sync.redact("nothing to hide"), "nothing to hide")

    def test_short_values_are_not_treated_as_secrets(self):
        """A one or two character value would redact half the log."""
        os.environ["ORION_PASSWORD"] = "ab"
        self.assertEqual(scheduled_sync.redact("a babble of words"), "a babble of words")


class TestStepOutput(ScheduledSyncTestCase):
    """The workflow skips a whole site deployment when nothing changed."""

    def outputs(self, tmp_path):
        os.environ["GITHUB_OUTPUT"] = tmp_path
        self.addCleanup(os.environ.pop, "GITHUB_OUTPUT", None)

    def test_a_real_publish_is_reported(self):
        path = os.path.join(tempfile.mkdtemp(), "out.txt")
        self.outputs(path)
        self.patch(
            "run_orion_browser_sync",
            lambda **kwargs: {"status": "success", "pdfs_synced": 1, "circulars_synced": 1},
        )
        self.patch("get_available_dates", lambda: [{"date": "2026-09-23"}])
        self.patch("publish_class_board", lambda *a, **k: {"published": True, "branch": "main"})
        self.run_job(publish=True)
        self.assertIn("published=true", open(path).read())

    def test_an_unchanged_board_is_reported_as_not_published(self):
        path = os.path.join(tempfile.mkdtemp(), "out.txt")
        self.outputs(path)
        self.patch(
            "run_orion_browser_sync",
            lambda **kwargs: {"status": "success", "pdfs_synced": 0, "circulars_synced": 0},
        )
        self.patch("get_available_dates", lambda: [{"date": "2026-09-23"}])
        self.patch("publish_class_board", lambda *a, **k: {"published": False, "reason": "no change"})
        self.run_job(publish=True)
        self.assertIn("published=false", open(path).read())

    def test_a_dry_run_reports_nothing_published(self):
        path = os.path.join(tempfile.mkdtemp(), "out.txt")
        self.outputs(path)
        self.patch(
            "run_orion_browser_sync",
            lambda **kwargs: {"status": "success", "pdfs_synced": 0, "circulars_synced": 0},
        )
        self.patch("get_available_dates", lambda: [])
        self.run_job(publish=False)
        self.assertIn("published=false", open(path).read())

    def test_running_outside_a_workflow_is_harmless(self):
        os.environ.pop("GITHUB_OUTPUT", None)
        self.patch(
            "run_orion_browser_sync",
            lambda **kwargs: {"status": "success", "pdfs_synced": 0, "circulars_synced": 0},
        )
        self.patch("get_available_dates", lambda: [])
        code, _ = self.run_job(publish=False)
        self.assertEqual(code, 0)


class TestRun(ScheduledSyncTestCase):
    def test_missing_credentials_stop_the_run(self):
        os.environ.pop("ORION_USERNAME", None)
        os.environ.pop("ORION_PASSWORD", None)
        code, output = self.run_job()
        self.assertEqual(code, 2)
        self.assertIn("must both be set", output)

    def test_a_dry_run_reports_counts_and_publishes_nothing(self):
        self.patch(
            "run_orion_browser_sync",
            lambda **kwargs: {"status": "success", "pdfs_synced": 3, "circulars_synced": 2},
        )
        self.patch("get_available_dates", lambda: [{"date": "2026-09-23"}, {"date": "2026-09-22"}])
        self.patch("publish_class_board", lambda *a, **k: self.fail("a dry run must not publish"))

        code, output = self.run_job(publish=False)
        self.assertEqual(code, 0)
        self.assertIn("3 class update PDFs", output)
        self.assertIn("2 day(s) of history", output)
        self.assertIn("2026-09-22 to 2026-09-23", output)
        self.assertIn("Dry run", output)

    def test_a_published_run_calls_the_publisher(self):
        published = []
        self.patch(
            "run_orion_browser_sync",
            lambda **kwargs: {"status": "success", "pdfs_synced": 1, "circulars_synced": 0},
        )
        self.patch("get_available_dates", lambda: [{"date": "2026-09-23"}])
        self.patch(
            "publish_class_board",
            lambda *a, **k: published.append(True) or {"published": True, "branch": "main"},
        )
        code, output = self.run_job(publish=True)
        self.assertEqual(code, 0)
        self.assertTrue(published)
        self.assertIn("republished", output)

    def test_a_failed_sync_reports_a_redacted_reason(self):
        self.patch(
            "run_orion_browser_sync",
            lambda **kwargs: {
                "status": "error",
                "message": f"Bad password {PASSWORD}",
                "student": {"name": "Aarav Rao"},
            },
        )
        code, output = self.run_job()
        self.assertEqual(code, 1)
        self.assertNotIn(PASSWORD, output)
        self.assertNotIn("Aarav Rao", output)

    def test_publishing_is_off_unless_the_environment_asks(self):
        self.patch(
            "run_orion_browser_sync",
            lambda **kwargs: {"status": "success", "pdfs_synced": 0, "circulars_synced": 0},
        )
        self.patch("get_available_dates", lambda: [])
        self.patch("publish_class_board", lambda *a, **k: self.fail("must not publish by default"))
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            self.assertEqual(scheduled_sync.run(), 0)
        self.assertIn("Dry run", buffer.getvalue())


if __name__ == "__main__":
    unittest.main()
