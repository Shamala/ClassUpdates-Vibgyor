"""
Reading a class update that was posted as a picture of the timetable.
"""

import io
import os
import sys
import tempfile
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend import pdf_ocr
from backend.pdf_parser import parse_vibgyor_pdf

ROWS = [
    ("18/09/2026", "Grade - 1F"),
    ("Period - 1", ""),
    ("Subject", "Mathematics"),
    ("Topic", "Subtraction"),
    ("Sub Topic", "Revision of borrowing"),
    ("CW", "CWSH - 12"),
    ("Reinforcement", "RWSH - 12"),
    ("Submission date", "21/09/2026"),
    ("Skill Assessed", "Computational fluency"),
    ("Period - 2", ""),
    ("Subject", "Social Science"),
    ("Topic", "Animals around me"),
    ("Sub Topic", "Recap of Plants and Animals"),
    ("CW", "Nil"),
    ("Reinforcement", "Nil"),
    ("Submission date", "Nil"),
    ("", ""),
    ("Additional Information", ""),
    ("Words for the day", "apple,river"),
]


def picture_pdf(path):
    """A timetable whose lettering is a picture and whose ruled lines are real, like the school's."""
    from PIL import Image, ImageDraw, ImageFont

    width, height, zoom = 612, 792, 4
    left, divider, right, top, row_height = 75, 200, 540, 60, 14
    image = Image.new("L", (width * zoom, height * zoom), 255)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=9 * zoom)
    for index, (label, value) in enumerate(ROWS):
        y = (top + index * row_height + 2) * zoom
        draw.text(((left + 3) * zoom, y), label, fill=0, font=font)
        draw.text(((divider + 3) * zoom, y), value, fill=0, font=font)
    jpeg = io.BytesIO()
    image.save(jpeg, "JPEG", quality=95)

    ops = []
    for index in range(len(ROWS)):  # the value column's shading
        y = height - (top + (index + 1) * row_height)
        ops.append(f"1 1 1 rg {divider} {y} {right - divider} {row_height} re f")
    ops.append(f"q {width} 0 0 {height} 0 0 cm /Im0 Do Q")
    for index in range(len(ROWS) + 1):  # the ruled lines
        y = height - (top + index * row_height)
        ops.append(f"0 0 0 rg {left} {y} {right - left} 0.5 re f")
    content = "\n".join(ops).encode()

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] /Contents 4 0 R "
        f"/Resources << /XObject << /Im0 5 0 R >> >> >>".encode(),
        b"<< /Length %d >>\nstream\n%s\nendstream" % (len(content), content),
        b"<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceGray "
        b"/BitsPerComponent 8 /Filter /DCTDecode /Length %d >>\nstream\n%s\nendstream"
        % (image.width, image.height, len(jpeg.getvalue()), jpeg.getvalue()),
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n%s\nendobj\n" % (number, body)
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    for offset in offsets:
        out += b"%010d 00000 n \n" % offset
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref)
    with open(path, "wb") as handle:
        handle.write(out)


class TestLabels(unittest.TestCase):
    def test_misread_labels_are_put_right(self):
        self.assertEqual(pdf_ocr.normalize_label("cw"), "CW")
        self.assertEqual(pdf_ocr.normalize_label("Cw"), "CW")
        self.assertEqual(pdf_ocr.normalize_label("Subiect"), "Subject")
        self.assertEqual(pdf_ocr.normalize_label("Sub Tonic"), "Sub Topic")
        self.assertEqual(pdf_ocr.normalize_label("Words for the dav"), "Words for the day")

    def test_period_headers_are_spaced_the_way_the_parser_expects(self):
        self.assertEqual(pdf_ocr.normalize_label("Period -7"), "Period - 7")
        self.assertEqual(pdf_ocr.normalize_label("Period - 10"), "Period - 10")

    def test_anything_else_is_left_alone(self):
        self.assertEqual(pdf_ocr.normalize_label("5/10/2026"), "5/10/2026")
        self.assertEqual(pdf_ocr.normalize_label(""), "")

    def test_rows_become_the_lines_a_typed_pdf_gives(self):
        text = pdf_ocr.rows_to_text([("5/10/2026", "Grade - 1F"), ("Period -1", ""), ("cw", "CWSH - 34"), ("", "")])
        self.assertEqual(text, "5/10/2026 Grade - 1F\nPeriod - 1\nCW CWSH - 34")


class TestAgreement(unittest.TestCase):
    def test_the_majority_reading_wins(self):
        readings = [{(0, 1): "(Pg no-26)"}, {(0, 1): "(Pgn0-26)"}, {(0, 1): "(Pg no-26)"}]
        self.assertEqual(pdf_ocr._agreed(readings, (0, 1)), "(Pg no-26)")

    def test_a_lost_space_does_not_split_the_vote(self):
        readings = [{(0, 1): "Recap of Plants"}, {(0, 1): "RecapofPlants"}, {(0, 1): "RecapofPlants"}]
        self.assertEqual(pdf_ocr._agreed(readings, (0, 1)), "Recap of Plants")

    def test_a_cell_only_one_size_saw_is_treated_as_empty(self):
        self.assertEqual(pdf_ocr._agreed([{(0, 1): "ee"}, {}, {}], (0, 1)), "")


@unittest.skipUnless(pdf_ocr.ocr_available(), "needs tesseract, pdfplumber and pypdfium2")
class TestPicturePdf(unittest.TestCase):
    def test_a_timetable_with_no_text_in_it_is_still_read(self):
        path = os.path.join(tempfile.mkdtemp(), "picture.pdf")
        picture_pdf(path)
        parsed = parse_vibgyor_pdf(path)
        self.assertEqual(parsed["date"], "2026-09-18")
        self.assertEqual(parsed["grade"], "Grade - 1F")
        self.assertEqual(parsed["words_of_the_day"], ["apple", "river"])
        first, second = parsed["periods"]
        self.assertEqual(first["subject"], "Mathematics")
        self.assertEqual(first["sub_topic"], "Revision of borrowing")
        self.assertEqual(first["cw"], "CWSH - 12")
        self.assertEqual(first["reinforcement"], "RWSH - 12")
        self.assertEqual(first["submission_date_iso"], "2026-09-21")
        self.assertEqual(first["skill_assessed"], "Computational fluency")
        self.assertTrue(first["is_homework"])
        self.assertEqual(second["subject"], "Social Science")
        self.assertEqual(second["sub_topic"], "Recap of Plants and Animals")
        self.assertFalse(second["is_homework"])


if __name__ == "__main__":
    unittest.main()
