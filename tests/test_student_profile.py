"""
Unit tests for Hubble Orion student profile extraction.

These cover the page layouts that previously made the scraper fall back to the
placeholder name "Student" for every parent.
"""

import os
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.database import is_placeholder_student_name
from backend.student_profile import parse_profile_payloads, parse_profile_text


class TestParseProfileText(unittest.TestCase):
    def test_single_line_colon_layout(self):
        text = "\n".join([
            "Student Detail",
            "Student Name : Aarav Rao",
            "Enrolment Number : VIB-2026-1F-042",
            "School : VIBGYOR High",
            "Grade : Grade 1",
            "Division : F",
            "Academic Year : 2026 - 27",
            "Father Name : Shamala Rao",
        ])
        got = parse_profile_text(text)
        self.assertEqual(got["name"], "Aarav Rao")
        self.assertEqual(got["student_id"], "VIB-2026-1F-042")
        self.assertEqual(got["section"], "F")
        self.assertEqual(got["parent_name"], "Shamala Rao")

    def test_label_and_value_on_separate_lines(self):
        """The card layout that broke the old parser."""
        text = "\n".join([
            "Student Name",
            "Aarav Rao",
            "Enrolment Number",
            "VIB-2026-1F-042",
            "Grade",
            "1F",
            "Academic Year",
            "2026 - 27",
        ])
        got = parse_profile_text(text)
        self.assertEqual(got["name"], "Aarav Rao")
        self.assertEqual(got["student_id"], "VIB-2026-1F-042")
        # "1F" splits into grade + section
        self.assertEqual(got["grade"], "Grade 1")
        self.assertEqual(got["section"], "F")

    def test_label_with_no_value_is_not_filled_from_next_label(self):
        text = "\n".join(["Student Name", "Enrolment Number", "VIB-1"])
        got = parse_profile_text(text)
        self.assertNotIn("name", got)
        self.assertEqual(got["student_id"], "VIB-1")

    def test_placeholder_name_is_rejected(self):
        got = parse_profile_text("Student Name : Student\nGrade : Grade 1")
        self.assertNotIn("name", got)

    def test_case_and_whitespace_tolerance(self):
        text = "STUDENT NAME:  Aarav  Rao\nDIVISION:F"
        got = parse_profile_text(text)
        self.assertEqual(got["name"], "Aarav Rao")
        self.assertEqual(got["section"], "F")

    def test_empty_text_returns_nothing(self):
        self.assertEqual(parse_profile_text(""), {})


class TestParseProfilePayloads(unittest.TestCase):
    def test_nested_api_payload(self):
        payload = {"data": {"student": {
            "studentName": "Aarav Rao",
            "enrolmentNumber": "VIB-2026-1F-042",
            "gradeName": "Grade 1",
            "divisionName": "F",
            "academicYear": "2026 - 27",
        }}}
        got = parse_profile_payloads([payload])
        self.assertEqual(got["name"], "Aarav Rao")
        self.assertEqual(got["student_id"], "VIB-2026-1F-042")
        self.assertEqual(got["section"], "F")

    def test_list_payload_and_placeholder_rejection(self):
        got = parse_profile_payloads([[{"studentName": "Student"}]])
        self.assertNotIn("name", got)


class TestNotificationsPayload(unittest.TestCase):
    """
    The notifications endpoint (notification-to-user/by-user) is where the portal
    actually exposes the student name, in snake_case. The Student Detail page does
    not render it, which is why every sync used to store the placeholder.
    """

    def _capture(self, name="Aarav Rao", student_id="901234"):
        return [{
            "url": "https://.../notification-to-user/by-user?page=1",
            "status": 200,
            "body": {"status": 200, "data": {"totalCount": 1, "data": [{
                "_id": "abc123",
                "student_id": student_id,
                "student_name": name,
                "user_type": 2,
                "attachmentFiles": [{"fileName": "1_F_22_nd_September.pdf"}],
            }]}},
        }]

    def test_name_and_id_from_notifications(self):
        got = parse_profile_payloads(self._capture())
        self.assertEqual(got["name"], "Aarav Rao")
        self.assertEqual(got["student_id"], "901234")

    def test_numeric_student_id_is_stringified(self):
        got = parse_profile_payloads(self._capture(student_id=901234))
        self.assertEqual(got["student_id"], "901234")

    def test_placeholder_in_notifications_is_rejected(self):
        got = parse_profile_payloads(self._capture(name="Student"))
        self.assertNotIn("name", got)

    def test_notifications_url_is_captured(self):
        from backend.student_profile import PROFILE_URL_HINTS
        url = "https://run.app/api/notification-to-user/by-user?studentId=1"
        self.assertTrue(any(tok in url.lower() for tok in PROFILE_URL_HINTS))


class TestBuildStudentProfile(unittest.TestCase):
    def test_api_name_beats_page_text_and_page_fills_the_rest(self):
        from backend.student_profile import build_student_profile
        page_text = "Student Name : Student\nGrade : 1F\nSchool : VIBGYOR High Marathahalli"
        payloads = [{"data": {"data": [{"student_name": "Aarav Rao", "student_id": "901234"}]}}]
        got = build_student_profile(page_text, api_payloads=payloads)
        self.assertEqual(got["name"], "Aarav Rao")
        self.assertEqual(got["student_id"], "901234")
        self.assertEqual(got["grade"], "Grade 1")
        self.assertEqual(got["section"], "F")
        self.assertEqual(got["school"], "VIBGYOR High Marathahalli")

    def test_nothing_found_falls_back_to_defaults(self):
        from backend.student_profile import DEFAULT_PROFILE, build_student_profile
        got = build_student_profile("Dashboard loading...", api_payloads=[])
        self.assertEqual(got, DEFAULT_PROFILE)


class TestPlaceholderGuard(unittest.TestCase):
    def test_placeholders(self):
        for value in ["Student", "student", " N/A ", "", "-", None, "Ravi's Ward"]:
            self.assertTrue(is_placeholder_student_name(value), value)

    def test_real_name(self):
        self.assertFalse(is_placeholder_student_name("Aarav Rao"))


if __name__ == "__main__":
    unittest.main()
