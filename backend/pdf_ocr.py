"""
Reads a class update that was posted as a picture of the timetable.

Some days the PDF comes out of "Microsoft: Print To PDF" with every letter
drawn as a shape, so there is no text in it to extract. The table's ruled lines
are still real geometry, though, so each cell is cut out along them and read
with Tesseract on its own. Reading the page whole does not work: the ruled
lines and blue bands confuse it, and it misreads the labels the parser keys on.

The result is plain text in the same "Label value" lines a typed PDF gives, so
the ordinary parser handles it from there.
"""

import difflib
from collections import Counter
import os
import re
import shutil
import subprocess
import tempfile
from typing import Dict, List, Optional, Tuple

try:
    import pdfplumber
    import pypdfium2
    from PIL import ImageOps
    HAS_RENDERER = True
except ImportError:
    HAS_RENDERER = False

# Tesseract slips on a different cell at each size ("Pg no" became "Pgn0" at one
# and "Pq no" at another), so every cell is read at all three and the reading
# most of them agree on is kept.
RESOLUTIONS = (350, 450, 600)
# The blue header bands are lighter than this and the lettering darker.
INK_THRESHOLD = 90
LABELS = [
    "Subject",
    "Topic",
    "Sub Topic",
    "CW",
    "Reinforcement",
    "Submission date",
    "Skill Assessed",
    "Additional Information",
    "Words for the day",
    "Note",
]


def ocr_available() -> bool:
    return HAS_RENDERER and shutil.which("tesseract") is not None


def normalize_label(raw: str) -> str:
    """Maps a label as Tesseract read it back onto the spelling the parser expects."""
    text = re.sub(r"\s+", " ", raw or "").strip()
    period = re.match(r"^Period\s*[-–—]?\s*(\d{1,2})$", text, re.IGNORECASE)
    if period:
        return f"Period - {int(period.group(1))}"
    by_folded = {label.casefold(): label for label in LABELS}
    if text.casefold() in by_folded:
        return by_folded[text.casefold()]
    close = difflib.get_close_matches(text.casefold(), list(by_folded), n=1, cutoff=0.75)
    return by_folded[close[0]] if close else text


def rows_to_text(rows: List[Tuple[str, str]]) -> str:
    lines = []
    for label, value in rows:
        line = f"{normalize_label(label)} {value.strip()}".strip()
        if line:
            lines.append(line)
    return "\n".join(lines)


def _table_grid(page) -> Optional[Tuple[List[float], List[float]]]:
    """The y of every ruled line and the x of the column edges, in PDF points."""
    rules = [
        r for r in page.rects
        if (r["x1"] - r["x0"]) > 0.25 * page.width and (r["bottom"] - r["top"]) < 2
    ]
    if len(rules) < 3:
        return None
    ys: List[float] = []
    for y in sorted(r["top"] for r in rules):
        if not ys or y - ys[-1] > 2:
            ys.append(y)
    left = min(r["x0"] for r in rules)
    right = max(r["x1"] for r in rules)
    # The value column is shaded cell by cell; where that shading starts is the divider.
    shaded = [
        r["x0"] for r in page.rects
        if (r["bottom"] - r["top"]) > 4 and (r["x1"] - r["x0"]) > 20 and r["x0"] - left > 20
    ]
    xs = [left, min(shaded), right] if shaded else [left, right]
    return ys, xs


def _has_ink(cell, scale: float) -> bool:
    # Slivers of the ruled lines survive at a cell's edges, so only its middle counts.
    width, height = cell.size
    margin = int(2 * scale)
    core = cell.crop((margin, int(height * 0.2), max(margin + 1, width - margin), int(height * 0.8)))
    return core.histogram()[0] > 0


def _read_cells(cells: Dict[Tuple[int, int], "object"]) -> Dict[Tuple[int, int], str]:
    """One Tesseract run over every cell, each treated as a single line of text."""
    if not cells:
        return {}
    keys = sorted(cells)
    with tempfile.TemporaryDirectory() as folder:
        names = []
        for row, column in keys:
            name = os.path.join(folder, f"{row:04d}_{column}.png")
            ImageOps.expand(cells[(row, column)], border=20, fill=255).save(name)
            names.append(name)
        listing = os.path.join(folder, "cells.txt")
        with open(listing, "w") as handle:
            handle.write("\n".join(names))
        result = subprocess.run(
            ["tesseract", listing, "-", "--psm", "7"],
            capture_output=True, text=True, timeout=300,
        )
    # Tesseract ends each image's text with a form feed.
    texts = result.stdout.split("\f")
    return {key: texts[i].strip() if i < len(texts) else "" for i, key in enumerate(keys)}


def _read_page(grid, image, scale: float) -> Dict[Tuple[int, int], str]:
    ys, xs = grid
    cells = {}
    for row, (top, bottom) in enumerate(zip(ys, ys[1:])):
        for column, (x0, x1) in enumerate(zip(xs, xs[1:])):
            # Stay just inside the ruled lines; any further in clips the tails of g, j, p and y.
            box = tuple(int(round(v * scale)) for v in (x0 + 1, top + 0.3, x1 - 1, bottom - 0.3))
            if box[3] - box[1] < 8 or box[2] - box[0] < 8:
                continue
            cell = image.crop(box)
            if _has_ink(cell, scale):
                cells[(row, column)] = cell
    return _read_cells(cells)


def _agreed(readings: List[Dict[Tuple[int, int], str]], key: Tuple[int, int]) -> str:
    texts = [reading.get(key, "") for reading in readings]
    # Losing the gap between two words is the commonest slip, so readings that
    # differ only in spacing count as the same one, and the best spaced is kept.
    squeezed = [re.sub(r"\s+", "", text) for text in texts]
    winner = Counter(squeezed).most_common(1)[0][0]
    return max((t for t, q in zip(texts, squeezed) if q == winner), key=lambda t: t.count(" "))


def ocr_pdf_text(pdf_path: str) -> str:
    """Empty when the tools are missing or the page has no table to follow."""
    if not ocr_available():
        return ""
    rows: List[Tuple[str, str]] = []
    rendered = pypdfium2.PdfDocument(pdf_path)
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for index, page in enumerate(pdf.pages):
                grid = _table_grid(page)
                if not grid:
                    continue
                readings = []
                for dpi in RESOLUTIONS:
                    scale = dpi / 72
                    image = rendered[index].render(scale=scale).to_pil().convert("L")
                    image = image.point(lambda value: 0 if value < INK_THRESHOLD else 255)
                    readings.append(_read_page(grid, image, scale))
                for row in range(len(grid[0]) - 1):
                    rows.append((_agreed(readings, (row, 0)), _agreed(readings, (row, 1))))
    finally:
        rendered.close()
    return rows_to_text(rows)
