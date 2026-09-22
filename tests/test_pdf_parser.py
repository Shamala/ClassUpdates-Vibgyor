"""
Unit and integration tests for VIBGYOR PDF timetable parser.
Tests sample_2026-09-18.pdf and sample_2026-09-21.pdf.
"""

import os
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.pdf_parser import (
    canonicalize_subject,
    clean_teacher_note,
    is_homework_active,
    normalize_date_str,
    parse_vibgyor_pdf,
    standardize_nil,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLE_18 = os.path.join(BASE_DIR, "sample_data", "sample_2026-09-18.pdf")
SAMPLE_21 = os.path.join(BASE_DIR, "sample_data", "sample_2026-09-21.pdf")


class TestVibgyorPdfParser(unittest.TestCase):
    def test_normalize_date_str(self):
        iso, display = normalize_date_str("18/09/2026")
        self.assertEqual(iso, "2026-09-18")
        self.assertEqual(display, "18/09/2026")

        iso2, display2 = normalize_date_str("2026-09-21")
        self.assertEqual(iso2, "2026-09-21")
        self.assertEqual(display2, "21/09/2026")

        iso_none, _ = normalize_date_str(None)
        self.assertIsNone(iso_none)

        iso_invalid, disp_invalid = normalize_date_str("NIL")
        self.assertIsNone(iso_invalid)
        self.assertEqual(disp_invalid, "NIL")

    def test_is_homework_active(self):
        self.assertFalse(is_homework_active("Nil"))
        self.assertFalse(is_homework_active("NIL"))
        self.assertFalse(is_homework_active("RWSH - NIL"))
        self.assertFalse(is_homework_active(""))
        self.assertFalse(is_homework_active(None))
    def test_standardize_nil(self):
        self.assertEqual(standardize_nil("nil"), "NIL")
        self.assertEqual(standardize_nil("Nil"), "NIL")
        self.assertEqual(standardize_nil("CWSH - Nil"), "NIL")
        self.assertEqual(standardize_nil("RWSH - NIL"), "NIL")
        self.assertEqual(standardize_nil("NA"), "NIL")
        self.assertEqual(standardize_nil("None"), "NIL")
        self.assertEqual(standardize_nil(""), "NIL")
        self.assertEqual(standardize_nil(None), "NIL")
        self.assertEqual(standardize_nil("24A,B,C & D"), "24A,B,C & D")
        self.assertEqual(standardize_nil("RWSH-14,15"), "RWSH-14,15")

    def test_canonicalize_subject(self):
        self.assertEqual(canonicalize_subject("Mathematics(S)"), "Mathematics")
        self.assertEqual(canonicalize_subject("Mathematics (S)"), "Mathematics")
        self.assertEqual(canonicalize_subject("English Literature(S)"), "English Literature")
        self.assertEqual(canonicalize_subject("Language Arts(s)"), "Language Arts")
        self.assertEqual(canonicalize_subject("Computer"), "Computers")
        self.assertEqual(canonicalize_subject("Skill programme"), "Skill Program")
        self.assertEqual(canonicalize_subject("Literature"), "English Literature")
        self.assertEqual(canonicalize_subject("Robotics"), "Robotics")
        self.assertEqual(canonicalize_subject(None), "General")

    def test_clean_teacher_note(self):
        sample = """Dear Parents,
Kindly help your ward revise the topic of Addition in
Mathematics. Please refer to the VExplore book and
reinforcement worksheets for practice.
Warm Regards.
Dear Parents,
Kindly assist your ward in revising Naming words, Noun
helpers,Action words,Verbs(Subject-Verb Agreement),
Being verbs, Sentence Structure, long vowel sounds,' r '
controlled vowels, final 'e' words in Language Arts.
Regards."""
        cleaned = clean_teacher_note(sample)
        self.assertNotIn("Dear Parents", cleaned)
        self.assertNotIn("Warm Regards", cleaned)
        self.assertNotIn("Regards", cleaned)
        self.assertIn("Kindly help your ward revise the topic of Addition in Mathematics. Please refer to the VExplore book and reinforcement worksheets for practice.", cleaned)
        self.assertIn("Kindly assist your ward in revising Naming words", cleaned)

    def test_parse_sample_2026_09_18(self):
        self.assertTrue(os.path.exists(SAMPLE_18), f"File not found: {SAMPLE_18}")
        data = parse_vibgyor_pdf(SAMPLE_18)

        # Date and Grade
        self.assertEqual(data["date"], "2026-09-18")
        self.assertEqual(data["display_date"], "18/09/2026")
        self.assertEqual(data["grade"], "Grade - 1F")

        # Words of the day
        self.assertEqual(data["words_of_the_day"], ["hear", "tame"])
        self.assertIn("hear,tame", data["words_raw"])

        # Teacher's note
        self.assertTrue(data["teacher_note"].startswith("Dear Parents,"))
        self.assertIn("Addition in", data["teacher_note"])
        self.assertIn("Warm Regards.", data["teacher_note"])

        # Total periods
        self.assertEqual(len(data["periods"]), 10)

        # Period 7: Active homework RWSH-14,15
        p7 = next(p for p in data["periods"] if p["period_number"] == 7)
        self.assertEqual(p7["subject"], "Social Science")
        self.assertEqual(p7["topic"], "Animals Around Me")
        self.assertEqual(p7["reinforcement"], "RWSH-14,15")
        self.assertEqual(p7["submission_date"], "21/09/2026")
        self.assertEqual(p7["submission_date_iso"], "2026-09-21")
        self.assertTrue(p7["is_homework"])
        self.assertIn("Experiential Learning", p7["skill_assessed"])

        # Period 8: CWSH-22 classwork
        p8 = next(p for p in data["periods"] if p["period_number"] == 8)
        self.assertEqual(p8["subject"], "Social Science")
        self.assertEqual(p8["cw"], "CWSH-22")
        self.assertFalse(p8["is_homework"])

        # Period 5: Skill assessed Collaboration
        p5 = next(p for p in data["periods"] if p["period_number"] == 5)
        self.assertEqual(p5["subject"], "Hindi")
        self.assertEqual(p5["skill_assessed"], "Collaboration")

        # Period 6: Mathematics revision with standardized NIL
        p6 = next(p for p in data["periods"] if p["period_number"] == 6)
        self.assertEqual(p6["subject"], "Mathematics")
        self.assertEqual(p6["cw"], "NIL")
        self.assertEqual(p6["reinforcement"], "NIL")
        self.assertFalse(p6["is_homework"])

    def test_parse_sample_2026_09_21(self):
        self.assertTrue(os.path.exists(SAMPLE_21), f"File not found: {SAMPLE_21}")
        data = parse_vibgyor_pdf(SAMPLE_21)

        # Date and Grade
        self.assertEqual(data["date"], "2026-09-21")
        self.assertEqual(data["display_date"], "21/09/2026")
        self.assertEqual(data["grade"], "Grade - 1F")

        # Words of the day
        self.assertEqual(data["words_of_the_day"], ["gone", "saw"])
        self.assertIn("gone,saw", data["words_raw"])

        # Teacher's note (should be empty for 21st)
        self.assertEqual(data["teacher_note"], "")

        # Total periods
        self.assertEqual(len(data["periods"]), 10)

        # Period 1: CW 24A,B,C & D
        p1 = next(p for p in data["periods"] if p["period_number"] == 1)
        self.assertEqual(p1["subject"], "Language Arts")
        self.assertEqual(p1["topic"], "Fluffy has a Bath")
        self.assertEqual(p1["sub_topic"], "Comprehension")
        self.assertEqual(p1["cw"], "24A,B,C & D")
        self.assertFalse(p1["is_homework"])

        # Period 2: Skill Assessed Computational fluency
        p2 = next(p for p in data["periods"] if p["period_number"] == 2)
        self.assertEqual(p2["subject"], "Mathematics")
        self.assertEqual(p2["skill_assessed"], "Computational fluency")

        # Period 7: Robotics project homework
        p7 = next(p for p in data["periods"] if p["period_number"] == 7)
        self.assertEqual(p7["subject"], "Robotics")
        self.assertEqual(p7["topic"], "Project 3: Windy Wonder Machine")
        self.assertIn("Tinkercad project 3", p7["reinforcement"])
        self.assertTrue(p7["is_homework"])
        self.assertEqual(p7["submission_date"], "NIL")


if __name__ == "__main__":
    unittest.main()
