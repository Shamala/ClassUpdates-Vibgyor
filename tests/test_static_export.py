"""
Tests for the published class board bundle.

The board is shared with other parents, so what must never leak matters as much as
what must appear: no student identity, no one family's homework ticks, and no real
class content in the clear.
"""

import base64
import json
import os
import sys
import unittest
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.static_export import (
    CIRCULAR_WINDOW_DAYS,
    CLASS_STUDENT,
    _recent_circulars,
    _strip_bookkeeping,
    _strip_completion,
    _strip_identity,
    encrypt,
    sanitise,
)


def decrypt(blob, passcode):
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

    key = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=base64.b64decode(blob["salt"]),
        iterations=blob["iterations"],
    ).derive(passcode.encode())
    plain = AESGCM(key).decrypt(
        base64.b64decode(blob["iv"]), base64.b64decode(blob["ciphertext"]), None
    )
    return json.loads(plain.decode())


PAYLOAD = {
    "student": dict(CLASS_STUDENT),
    "dates": [{"date": "2026-09-23", "homework_count": 2,
               "completed_homework_count": 2, "has_pending_homework": False,
               "words_of_the_day": ["thump", "kind"], "words_raw": "thump,kind"}],
    "daily": {"2026-09-23": {
        "date": "2026-09-23", "teacher_note": "Revise addition with your child.",
        "source_pdf": "1_F_23rd_September.pdf",
        "words_of_the_day": ["thump", "kind"], "words_raw": "thump,kind",
        "completed_homework_count": 2, "all_homework_completed": True,
        "periods": [{"period_number": 1, "subject": "Language Arts",
                     "topic": "Fluffy has a Bath", "sub_topic": "Subject and Predicate",
                     "cw": "CWSH-22", "reinforcement": "RWSH-14,15",
                     "skill_assessed": "Computational fluency",
                     "is_homework": True, "is_completed": True,
                     "completed_at": "2026-09-23 10:00:00"}]}},
    "weekly": {"week_start": "2026-09-21", "days": [],
               "weekly_dictation_words": ["thump", "kind"],
               "active_homework_items": [
                   {"topic": "Robotics", "reinforcement": "Tinkercad project 3",
                    "is_completed": True}]},
    "circulars": [{"title": "Sports Day", "summary": "Real circular text."}],
    "synced_at": "2026-09-23T12:00:00+00:00",
}


class TestCompletionIsNotPublished(unittest.TestCase):
    """Ticks are personal and the schema stores them per period, not per parent."""

    def setUp(self):
        self.clean = _strip_completion(json.loads(json.dumps(PAYLOAD)))

    def test_period_ticks_are_cleared(self):
        period = self.clean["daily"]["2026-09-23"]["periods"][0]
        self.assertFalse(period["is_completed"])
        self.assertIsNone(period["completed_at"])

    def test_counts_are_cleared(self):
        day = self.clean["daily"]["2026-09-23"]
        self.assertEqual(day["completed_homework_count"], 0)
        self.assertFalse(day["all_homework_completed"])
        self.assertEqual(self.clean["dates"][0]["completed_homework_count"], 0)

    def test_pending_flag_recomputed_for_a_fresh_browser(self):
        self.assertTrue(self.clean["dates"][0]["has_pending_homework"])

    def test_class_content_is_untouched(self):
        period = self.clean["daily"]["2026-09-23"]["periods"][0]
        self.assertEqual(period["reinforcement"], "RWSH-14,15")
        self.assertEqual(period["topic"], "Fluffy has a Bath")


class TestNoStudentIdentity(unittest.TestCase):
    def test_published_student_is_the_class_placeholder(self):
        self.assertEqual(CLASS_STUDENT["name"], "Student")
        self.assertNotIn("roll_no_value", CLASS_STUDENT)
        self.assertEqual(CLASS_STUDENT["parent_name"], "")


class TestIdentifiersAreStripped(unittest.TestCase):
    """
    Every synced row carries the student_id it was fetched under, which is the
    enrolment number. Replacing only the student object leaves it in the rows.
    """

    def test_student_id_is_replaced_everywhere(self):
        payload = {
            "student": {"student_id": "EN00000000001"},
            "daily": {"2026-09-23": {
                "student_id": "EN00000000001",
                "periods": [{"student_id": "VIB-TEST-0001", "topic": "x"}],
            }},
        }
        blob = json.dumps(_strip_identity(payload))
        self.assertNotIn("EN00000000001", blob)
        self.assertNotIn("VIB-TEST-0001", blob)
        self.assertEqual(blob.count(CLASS_STUDENT["student_id"]), 3)

    def test_other_fields_survive(self):
        cleaned = _strip_identity({"periods": [{"student_id": "EN1", "topic": "Shapes"}]})
        self.assertEqual(cleaned["periods"][0]["topic"], "Shapes")


class TestDemoBundleIsScrubbed(unittest.TestCase):
    def setUp(self):
        self.demo = sanitise(PAYLOAD)

    def test_real_class_content_is_gone(self):
        blob = json.dumps(self.demo)
        for real in ("Fluffy has a Bath", "Revise addition", "CWSH-22",
                     "RWSH-14,15", "Sports Day", "Real circular text", "thump",
                     "Tinkercad"):
            self.assertNotIn(real, blob, f"{real!r} leaked into the demo bundle")

    def test_shape_is_preserved(self):
        self.assertEqual(list(self.demo["daily"].keys()), ["2026-09-23"])
        self.assertEqual(len(self.demo["daily"]["2026-09-23"]["periods"]), 1)
        self.assertEqual(self.demo["student"]["name"], "Demo Student")


class TestEncryption(unittest.TestCase):
    def test_round_trip(self):
        blob = encrypt(PAYLOAD, "test-passcode")
        self.assertEqual(decrypt(blob, "test-passcode"), PAYLOAD)

    def test_wrong_passcode_fails(self):
        blob = encrypt(PAYLOAD, "test-passcode")
        with self.assertRaises(Exception):
            decrypt(blob, "wrong-passcode")

    def test_ciphertext_reveals_no_class_content(self):
        blob = encrypt(PAYLOAD, "test-passcode")
        serialized = json.dumps(blob)
        for real in ("Fluffy", "RWSH", "Sports Day", "Revise addition"):
            self.assertNotIn(real, serialized)

    def test_salt_and_iv_differ_each_build(self):
        a, b = encrypt(PAYLOAD, "x"), encrypt(PAYLOAD, "x")
        self.assertNotEqual(a["salt"], b["salt"])
        self.assertNotEqual(a["iv"], b["iv"])

    def test_sync_time_stays_readable_for_the_lock_screen(self):
        self.assertEqual(encrypt(PAYLOAD, "x")["synced_at"], PAYLOAD["synced_at"])


class TestBookkeepingStripped(unittest.TestCase):
    """Row timestamps are noise to a parent and break change detection."""

    def test_created_at_is_removed_at_every_depth(self):
        payload = {
            "circulars": [{"title": "Notice", "created_at": "2026-09-23 15:43:24"}],
            "daily": {"2026-09-23": {"periods": [{"subject": "Math", "created_at": "x"}]}},
        }
        cleaned = _strip_bookkeeping(payload)
        self.assertNotIn("created_at", cleaned["circulars"][0])
        self.assertNotIn("created_at", cleaned["daily"]["2026-09-23"]["periods"][0])

    def test_updated_at_is_removed_too(self):
        self.assertEqual(_strip_bookkeeping({"a": 1, "updated_at": "x"}), {"a": 1})

    def test_real_content_is_untouched(self):
        payload = {"circulars": [{"title": "Notice", "publish_date": "2026-09-14"}]}
        self.assertEqual(_strip_bookkeeping(payload), payload)

    def test_two_builds_of_the_same_content_fingerprint_alike(self):
        """The whole point: a rebuilt database must not look like new content."""
        first = {"daily": {"d": [{"topic": "Fractions", "created_at": "2026-09-23 15:37:56"}]}}
        second = {"daily": {"d": [{"topic": "Fractions", "created_at": "2026-09-24 08:31:02"}]}}
        self.assertEqual(_strip_bookkeeping(first), _strip_bookkeeping(second))


class TestCircularWindow(unittest.TestCase):
    """The board is a current-term noticeboard, not the school's whole archive."""

    ANCHOR = "2026-09-23"

    def circulars(self, *dates):
        return [{"title": f"Notice {d}", "publish_date": d} for d in dates]

    def test_recent_circulars_are_kept(self):
        recent = self.circulars("2026-09-22", "2026-08-30")
        self.assertEqual(_recent_circulars(recent, self.ANCHOR), recent)

    def test_circulars_older_than_the_window_are_dropped(self):
        kept = _recent_circulars(self.circulars("2026-09-22", "2026-01-05"), self.ANCHOR)
        self.assertEqual([c["publish_date"] for c in kept], ["2026-09-22"])

    def test_the_window_edge_is_inclusive(self):
        edge = (
            datetime.strptime(self.ANCHOR, "%Y-%m-%d") - timedelta(days=CIRCULAR_WINDOW_DAYS)
        ).date().isoformat()
        kept = _recent_circulars(self.circulars(edge), self.ANCHOR)
        self.assertEqual(len(kept), 1)

    def test_an_unusable_anchor_keeps_everything(self):
        every = self.circulars("2026-09-22", "2024-01-05")
        self.assertEqual(_recent_circulars(every, ""), every)

    def test_missing_dates_do_not_empty_the_tab(self):
        """Filtering every row away would look like the school stopped writing."""
        undated = [{"title": "Notice", "publish_date": ""}]
        self.assertEqual(_recent_circulars(undated, self.ANCHOR), undated)


if __name__ == "__main__":
    unittest.main()
