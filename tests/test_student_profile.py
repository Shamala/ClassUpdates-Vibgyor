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


class TestRealPortalShapes(unittest.TestCase):
    """
    Shapes taken from a live Hubble Orion session. Names here are invented.

    Two traps the portal sets:
      1. /admin/studentProfile/<id> nests the guardians beside the student, and
         they carry first_name/last_name too.
      2. The Student Detail page renders empty form fields as their own captions,
         so a two-line lookahead can read "Student Middle Name" as a value.
    """

    STUDENT_PROFILE = {"status": 200, "data": {"profile": {
        "id": 111111, "first_name": "Aarav", "middle_name": "", "last_name": "rao",
        "crt_grade": "Grade I", "crt_division": "F", "crt_board": "CBSE",
        "crt_school": "VIBGYOR Kids and High - Test Layout",
        "crt_enr_on": "EN10000000001", "academic_year_name": "2026 - 27",
    }, "guardians": [
        {"first_name": "Vikram", "last_name": "rao", "relation": "Father"},
        {"first_name": "MEERA", "last_name": "RAO", "relation": "Mother"},
    ]}}

    GUARDIAN_STUDENT_DETAILS = {"success": True, "data": {"students": [{
        "id": 111111, "student_name": "Aarav rao", "student_full_name": "Aarav rao",
        "crt_enr_on": "EN10000000001", "grade_name": "Grade I", "division": "F",
    }]}}

    DETAIL_PAGE_TEXT = "\n".join([
        "Student Detail", "VR", "Vikram rao", "Aarav rao",
        "Academic Year : 2026 - 27",
        "Enrolment Number : EN10000000001",
        "School : VIBGYOR Kids and High - Test Layout",
        "Grade : Grade I", "Board : CBSE", "Division : F", "House : Fire",
        "Student", "Parent", "Contact Info", "Medical Info",
        "Personal Details",
        "Student Name", "Student Name",
        "Student Middle Name", "Student Middle Name",
        "Gender", "Male", "Gender",
    ])

    def test_guardian_name_never_wins(self):
        got = parse_profile_payloads([self.STUDENT_PROFILE])
        self.assertEqual(got["name"], "Aarav rao")
        self.assertEqual(got["student_id"], "EN10000000001")
        self.assertEqual(got["school"], "VIBGYOR Kids and High - Test Layout")

    def test_explicit_student_name_field(self):
        got = parse_profile_payloads([self.GUARDIAN_STUDENT_DETAILS])
        self.assertEqual(got["name"], "Aarav rao")
        self.assertEqual(got["grade"], "Grade I")
        self.assertEqual(got["section"], "F")

    def test_page_text_yields_fields_but_never_a_form_label(self):
        got = parse_profile_text(self.DETAIL_PAGE_TEXT)
        self.assertEqual(got["student_id"], "EN10000000001")
        self.assertEqual(got["academic_year"], "2026 - 27")
        self.assertEqual(got["section"], "F")
        # the name is a bare line with no label, so text alone must not guess it
        self.assertNotIn("name", got)
        # "Parent" / "Contact Info" are tab captions, not a parent name
        self.assertNotIn("parent_name", got)

    def test_full_merge_matches_the_live_portal(self):
        from backend.student_profile import build_student_profile
        got = build_student_profile(
            self.DETAIL_PAGE_TEXT,
            api_payloads=[self.STUDENT_PROFILE, self.GUARDIAN_STUDENT_DETAILS],
        )
        self.assertEqual(got["name"], "Aarav rao")
        self.assertEqual(got["student_id"], "EN10000000001")
        self.assertEqual(got["grade"], "Grade I")
        self.assertEqual(got["section"], "F")
        self.assertEqual(got["academic_year"], "2026 - 27")
        self.assertEqual(got["school"], "VIBGYOR Kids and High - Test Layout")


class TestUpsertKeepsSpecificValues(unittest.TestCase):
    """A later, less successful sync must not degrade what an earlier one stored."""

    def setUp(self):
        import tempfile
        from backend.database import init_db
        self.db = os.path.join(tempfile.mkdtemp(), "t.db")
        init_db(self.db)

    def _upsert(self, **kw):
        from backend.database import upsert_student
        args = {"student_id": "EN1", "name": "Aarav Rao", "grade": "Grade I",
                "section": "F", "school": "VIBGYOR Kids and High - Test Layout",
                "academic_year": "2026 - 27"}
        args.update(kw)
        upsert_student(db_path=self.db, **args)

    def test_placeholders_do_not_overwrite_a_real_profile(self):
        from backend.database import get_student_profile
        self._upsert()
        # a degraded sync that resolved nothing
        self._upsert(name="Student", grade="Grade 1", school="VIBGYOR High")
        got = get_student_profile("EN1", db_path=self.db)
        self.assertEqual(got["name"], "Aarav Rao")
        self.assertEqual(got["grade"], "Grade I")
        self.assertEqual(got["school"], "VIBGYOR Kids and High - Test Layout")

    def test_a_better_sync_still_updates(self):
        from backend.database import get_student_profile
        self._upsert(school="VIBGYOR High")
        self._upsert(school="VIBGYOR Kids and High - Test Layout")
        self.assertEqual(
            get_student_profile("EN1", db_path=self.db)["school"],
            "VIBGYOR Kids and High - Test Layout",
        )

    def test_lookup_without_id_skips_the_seeded_placeholder(self):
        from backend.database import get_student_profile
        self._upsert()
        self.assertEqual(get_student_profile(db_path=self.db)["name"], "Aarav Rao")


class TestPlaceholderGuard(unittest.TestCase):
    def test_placeholders(self):
        for value in ["Student", "student", " N/A ", "", "-", None, "Ravi's Ward"]:
            self.assertTrue(is_placeholder_student_name(value), value)

    def test_real_name(self):
        self.assertFalse(is_placeholder_student_name("Aarav Rao"))


if __name__ == "__main__":
    unittest.main()
