"""
Which day a synced class update is filed under.
"""

import os
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.browser_sync import class_update_date


class TestClassUpdateDate(unittest.TestCase):
    def test_posting_date_beats_a_wrong_date_inside_the_pdf(self):
        # The real 28 September PDF was headed 26/09/2026.
        item = {"published_date": "2026-09-28T00:00:00.000Z", "created_at": "2026-09-28T06:10:00.000Z"}
        parsed = {"date": "2026-09-26"}
        self.assertEqual(
            class_update_date(item, "1_F_28_th_September_1790577646076.pdf", parsed), "2026-09-28"
        )

    def test_created_at_is_read_in_ist(self):
        # 20:00 UTC on the 27th is 01:30 IST on the 28th.
        item = {"created_at": "2026-09-27T20:00:00.000Z"}
        self.assertEqual(class_update_date(item, "x.pdf", {"date": "2026-09-26"}), "2026-09-28")

    def test_file_name_is_used_without_a_posting_date(self):
        parsed = {"date": "2026-09-26"}
        self.assertEqual(class_update_date({}, "1_F_28_th_September_1790577646076.pdf", parsed), "2026-09-28")
        self.assertEqual(class_update_date({}, "1F_29th_September_1790669885238.pdf", parsed), "2026-09-29")
        self.assertEqual(class_update_date({}, "1_F_22_nd_September_1790058218504.pdf", parsed), "2026-09-22")

    def test_pdf_date_is_the_last_resort(self):
        self.assertEqual(class_update_date({}, "update.pdf", {"date": "2026-09-26"}), "2026-09-26")


if __name__ == "__main__":
    unittest.main()
