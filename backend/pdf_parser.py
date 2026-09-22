"""
PDF Parser for VIBGYOR Daily Diary Timetable PDFs.
Extracts class updates, periods 1-10, homework (RWSH), classwork (CWSH),
words of the day, and teacher notes with multiple fallback extractors.
"""

import os
import re
import subprocess
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False


NON_HOMEWORK_KEYWORDS = {
    "",
    "nil",
    "na",
    "n/a",
    "none",
    "rwshnil",
    "rwsh-nil",
    "rwsh - nil",
    "not applicable",
}


def standardize_nil(val: Optional[str]) -> str:
    """
    Standardizes any nil, Nil, NIL, N/A, None, CWSH - Nil, RWSH - Nil, etc.
    strictly to uppercase 'NIL'. Preserves meaningful text.
    """
    if not val:
        return "NIL"
    s = val.strip()
    if not s:
        return "NIL"
    cleaned = re.sub(r"[^a-zA-Z0-9]", "", s).lower()
    if cleaned in {"nil", "na", "none", "notapplicable", "cwshnil", "rwshnil", "null"}:
        return "NIL"
    if re.match(r"^(?:(?:cwsh|rwsh)\s*[-:]\s*)?nil\.?$", s, re.IGNORECASE):
        return "NIL"
    return s


def canonicalize_subject(subject: Optional[str]) -> str:
    """
    Standardizes subject name by stripping support/spoken tags like '(S)'
    and normalizing spelling variants.
    E.g. 'Mathematics(S)' -> 'Mathematics'
         'English Literature(S)' -> 'English Literature'
         'Language Arts(S)' -> 'Language Arts'
         'Computers' / 'Computer' -> 'Computers'
         'Skill programme' / 'Skill Program' -> 'Skill Program'
    """
    if not subject:
        return "General"
    s = subject.strip()
    s = re.sub(r"\s*\([Ss](?:upport|poken)?\)\s*$", "", s).strip()
    if re.match(r"^computer(s)?$", s, re.IGNORECASE):
        return "Computers"
    if re.match(r"^skill programm?e$", s, re.IGNORECASE):
        return "Skill Program"
    if re.match(r"^literature$", s, re.IGNORECASE):
        return "English Literature"
    return s


def clean_teacher_note(text: Optional[str]) -> str:
    """
    Cleans teacher note by stripping repetitive salutations ('Dear Parents,')
    and valedictions ('Warm Regards.', 'Regards.'), and unwrapping narrow column line breaks.
    """
    if not text:
        return ""

    lines = [l.strip() for l in text.splitlines()]
    salutation_re = re.compile(
        r"^(?:dear\s+parents?|dear\s+sir(?:\s*/\s*madam)?|hello\s+parents?|notes?|additional\s+information)\s*[:,\.]?$",
        re.I,
    )
    valediction_re = re.compile(
        r"^(?:warm\s+regards|with\s+warm\s+regards|best\s+regards|kind\s+regards|regards|thanks\s+and\s+regards|thank\s+you)\s*[\.,]?$",
        re.I,
    )

    raw_paras: List[List[str]] = []
    current: List[str] = []

    for l in lines:
        if not l:
            if current:
                raw_paras.append(current)
                current = []
            continue
        if salutation_re.match(l):
            if current:
                raw_paras.append(current)
                current = []
            continue
        if valediction_re.match(l):
            if current:
                raw_paras.append(current)
                current = []
            continue
        current.append(l)

    if current:
        raw_paras.append(current)

    cleaned_paras: List[str] = []
    for words in raw_paras:
        p = " ".join(words)
        p = re.sub(
            r"^(?:dear\s+parents?|dear\s+parent|notes?)\s*[:,\.]?\s*",
            "",
            p,
            flags=re.I,
        )
        p = re.sub(
            r"\s*(?:warm\s+regards|with\s+warm\s+regards|best\s+regards|kind\s+regards|regards|thanks\s+and\s+regards|thank\s+you)\s*[\.,]?\s*$",
            "",
            p,
            flags=re.I,
        )
        p = p.strip()
        if p:
            cleaned_paras.append(p)

    return "\n\n".join(cleaned_paras)


def normalize_date_str(raw_date: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Normalizes date string into (iso_date YYYY-MM-DD, display_date DD/MM/YYYY).
    Handles DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.
    """
    if not raw_date:
        return None, None
    raw_date = raw_date.strip()
    # Check DD/MM/YYYY or DD-MM-YYYY
    match_dmy = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$", raw_date)
    if match_dmy:
        day, month, year = int(match_dmy.group(1)), int(match_dmy.group(2)), int(match_dmy.group(3))
        iso_str = f"{year:04d}-{month:02d}-{day:02d}"
        display_str = f"{day:02d}/{month:02d}/{year:04d}"
        return iso_str, display_str

    # Check YYYY-MM-DD or YYYY/MM/DD
    match_ymd = re.match(r"^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$", raw_date)
    if match_ymd:
        year, month, day = int(match_ymd.group(1)), int(match_ymd.group(2)), int(match_ymd.group(3))
        iso_str = f"{year:04d}-{month:02d}-{day:02d}"
        display_str = f"{day:02d}/{month:02d}/{year:04d}"
        return iso_str, display_str

    return None, raw_date


def is_homework_active(reinforcement: Optional[str]) -> bool:
    """
    Checks if a reinforcement value indicates active homework.
    Returns False for Nil, NIL, RWSH - NIL, etc.
    """
    if not reinforcement:
        return False
    cleaned = re.sub(r"[^a-zA-Z0-9]", "", reinforcement).lower()
    if not cleaned or cleaned in NON_HOMEWORK_KEYWORDS:
        return False
    return True


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extracts text using available engines:
    1. pypdf
    2. pdftotext CLI (poppler)
    3. pdfplumber
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    # Method 1: pypdf
    if HAS_PYPDF:
        try:
            reader = pypdf.PdfReader(pdf_path)
            pages_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            combined = "\n".join(pages_text).strip()
            if combined:
                return combined
        except Exception as err:
            print(f"[pdf_parser] pypdf extraction failed on {pdf_path}: {err}")

    # Method 2: pdftotext CLI
    pdftotext_bins = ["/opt/homebrew/bin/pdftotext", "/usr/local/bin/pdftotext", "pdftotext"]
    for bin_path in pdftotext_bins:
        try:
            result = subprocess.run(
                [bin_path, "-layout", pdf_path, "-"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=True,
            )
            if result.stdout.strip():
                return result.stdout.strip()
        except Exception:
            continue

    # Method 3: pdfplumber
    if HAS_PDFPLUMBER:
        try:
            with pdfplumber.open(pdf_path) as pdf:
                pages_text = [p.extract_text() or "" for p in pdf.pages]
                combined = "\n".join(pages_text).strip()
                if combined:
                    return combined
        except Exception as err:
            print(f"[pdf_parser] pdfplumber extraction failed on {pdf_path}: {err}")

    raise RuntimeError(f"Failed to extract text from {pdf_path} using all available engines.")


def parse_vibgyor_text(text: str) -> Dict[str, Any]:
    """
    Parses raw extracted text from a VIBGYOR daily diary timetable.
    Returns structured dictionary with:
      - date: YYYY-MM-DD
      - display_date: DD/MM/YYYY
      - grade: e.g. 'Grade - 1F'
      - words_of_the_day: List[str] e.g. ['hear', 'tame']
      - words_raw: str e.g. 'hear,tame'
      - teacher_note: str
      - periods: List[dict] (periods 1 to 10)
    """
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Extract date and grade from header
    raw_date_str = None
    grade_str = None
    header_match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s+(?:Grade\s*-\s*([A-Za-z0-9]+))?", text)
    if header_match:
        raw_date_str = header_match.group(1)
        if header_match.group(2):
            grade_str = f"Grade - {header_match.group(2)}"
        else:
            # Check secondary grade pattern
            g_match = re.search(r"Grade\s*-\s*([A-Za-z0-9]+)", text)
            grade_str = f"Grade - {g_match.group(1)}" if g_match else "Grade - 1F"
    else:
        # Fallback date search
        d_match = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b", text)
        if d_match:
            raw_date_str = d_match.group(1)
        g_match = re.search(r"Grade\s*-\s*([A-Za-z0-9]+)", text)
        grade_str = f"Grade - {g_match.group(1)}" if g_match else "Grade - 1F"

    iso_date, display_date = normalize_date_str(raw_date_str)

    # Locate boundaries of each period
    period_indices: List[Tuple[int, Any]] = []
    for idx, line in enumerate(lines):
        m = re.match(r"^Period\s*-\s*(\d+)", line, re.IGNORECASE)
        if m:
            period_indices.append((idx, int(m.group(1))))
        elif "Additional Information" in line:
            period_indices.append((idx, "additional"))
            break

    periods: List[Dict[str, Any]] = []
    for i in range(len(period_indices)):
        idx, p_num = period_indices[i]
        if p_num == "additional":
            continue

        next_idx = period_indices[i + 1][0] if i + 1 < len(period_indices) else len(lines)
        period_lines = lines[idx:next_idx]

        p_data: Dict[str, Any] = {
            "period_number": p_num,
            "subject": "",
            "topic": "",
            "sub_topic": "",
            "cw": "",
            "reinforcement": "",
            "submission_date": "",
            "submission_date_iso": None,
            "skill_assessed": "",
            "is_homework": False,
        }

        current_field = None
        for pline in period_lines[1:]:  # skip 'Period - X' header
            if pline.startswith("Subject"):
                p_data["subject"] = pline[len("Subject"):].strip()
                current_field = "subject"
            elif pline.startswith("Sub Topic"):
                p_data["sub_topic"] = pline[len("Sub Topic"):].strip()
                current_field = "sub_topic"
            elif pline.startswith("Topic"):
                p_data["topic"] = pline[len("Topic"):].strip()
                current_field = "topic"
            elif pline.startswith("CW"):
                p_data["cw"] = pline[len("CW"):].strip()
                current_field = "cw"
            elif pline.startswith("Reinforcement"):
                p_data["reinforcement"] = pline[len("Reinforcement"):].strip()
                current_field = "reinforcement"
            elif pline.startswith("Submission date"):
                p_data["submission_date"] = pline[len("Submission date"):].strip()
                current_field = "submission_date"
            elif pline.startswith("Skill Assessed"):
                p_data["skill_assessed"] = pline[len("Skill Assessed"):].strip()
                current_field = "skill_assessed"
            else:
                # Skill may follow submission date without 'Skill Assessed' label
                if current_field == "submission_date" and not p_data["skill_assessed"]:
                    p_data["skill_assessed"] = pline
                    current_field = "skill_assessed"
                elif current_field:
                    p_data[current_field] += " " + pline

        # Clean and standardize string values
        for key in ["subject", "topic", "sub_topic", "cw", "reinforcement", "submission_date", "skill_assessed"]:
            p_data[key] = p_data[key].strip()

        p_data["subject"] = canonicalize_subject(p_data["subject"])

        # Standardize NIL for classwork, homework, submission date, and skill assessed
        for key in ["cw", "reinforcement", "submission_date", "skill_assessed"]:
            p_data[key] = standardize_nil(p_data[key])

        # Parse submission date ISO if present
        sub_iso, _ = normalize_date_str(p_data["submission_date"] if p_data["submission_date"] != "NIL" else None)
        p_data["submission_date_iso"] = sub_iso

        # Homework detection
        p_data["is_homework"] = is_homework_active(p_data["reinforcement"])

        periods.append(p_data)

    # Sort periods by period_number
    periods.sort(key=lambda x: x["period_number"])

    # Parse Additional Information (Words of the day + Teacher's Note)
    words_of_the_day: List[str] = []
    teacher_note = ""

    add_idx = None
    for l_idx, p_num in period_indices:
        if p_num == "additional":
            add_idx = l_idx
            break

    if add_idx is not None:
        add_lines = lines[add_idx:]
        note_accumulator: List[str] = []
        for aline in add_lines:
            if "Words for the day" in aline:
                m_words = re.search(r"Words for the day\s*(.*)", aline, re.IGNORECASE)
                if m_words:
                    w_str = m_words.group(1).strip()
                    words_of_the_day = [w.strip() for w in re.split(r"[,; ]+", w_str) if w.strip()]
            elif aline == "Additional Information" or aline == "Note":
                continue
            else:
                note_accumulator.append(aline)

        teacher_note = "\n".join(note_accumulator).strip()

    return {
        "date": iso_date,
        "display_date": display_date,
        "grade": grade_str or "Grade - 1F",
        "words_of_the_day": words_of_the_day,
        "words_raw": ",".join(words_of_the_day),
        "teacher_note": teacher_note,
        "periods": periods,
    }


def parse_vibgyor_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Parses a VIBGYOR daily diary PDF file directly from path.
    """
    text = extract_text_from_pdf(pdf_path)
    result = parse_vibgyor_text(text)
    result["source_pdf"] = os.path.basename(pdf_path)
    return result


if __name__ == "__main__":
    import sys
    test_files = sys.argv[1:] or [
        "sample_data/sample_2026-09-18.pdf",
        "sample_data/sample_2026-09-21.pdf",
    ]
    for path in test_files:
        if os.path.exists(path):
            parsed = parse_vibgyor_pdf(path)
            print(f"\n==================== {path} ====================")
            print(f"Date: {parsed['date']} ({parsed['display_date']}) | Grade: {parsed['grade']}")
            print(f"Words of the Day: {parsed['words_of_the_day']}")
            print(f"Teacher's Note: {repr(parsed['teacher_note'])}")
            print(f"Total Periods: {len(parsed['periods'])}")
            for p in parsed["periods"]:
                hw_flag = " [HOMEWORK ACTIVE]" if p["is_homework"] else ""
                print(f"  Period {p['period_number']:2d}: {p['subject']} | Topic: {p['topic']} | CW: {p['cw']} | Reinf: {p['reinforcement']}{hw_flag}")
