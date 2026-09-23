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


class TestPlaceholderGuard(unittest.TestCase):
    def test_placeholders(self):
        for value in ["Student", "student", " N/A ", "", "-", None, "Ravi's Ward"]:
            self.assertTrue(is_placeholder_student_name(value), value)

    def test_real_name(self):
        self.assertFalse(is_placeholder_student_name("Aarav Rao"))


if __name__ == "__main__":
    unittest.main()
