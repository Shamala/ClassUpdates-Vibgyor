"""
Student profile extraction for the Hubble Orion portal.

The portal renders the profile as label/value pairs whose exact markup changes
between releases: sometimes "Student Name : Aarav Rao" on one line, sometimes the
label and the value on two consecutive lines, sometimes only inside the JSON the
page fetches. The previous scraper handled only the single-line colon form, so a
layout change silently produced the placeholder name "Student" for every parent.

This module keeps the parsing pure and testable, tries the page's own API payloads
first, and dumps the raw page text when nothing matches so the next failure is
diagnosable instead of silent.
"""

import json
import os
import re
import time
from typing import Any, Dict, Iterable, List, Optional

from backend.database import DEFAULT_STUDENT_PROFILE, is_placeholder_student_name

PROFILE_URL = "https://hubbleorion.hubblehox.com/student-detail/"

DEFAULT_PROFILE: Dict[str, str] = dict(DEFAULT_STUDENT_PROFILE)

# field -> labels as they may appear on the page (normalised: lowercase, alnum only)
LABEL_ALIASES: Dict[str, List[str]] = {
    "student_id": [
        "enrolmentnumber", "enrollmentnumber", "enrolmentno", "enrollmentno",
        "enrolment", "admissionnumber", "admissionno", "grno", "grnumber",
        "studentid", "studentcode",
    ],
    "name": [
        "studentname", "studentsname", "nameofstudent", "childname",
        "nameofthestudent", "fullname", "name",
    ],
    "school": ["schoolname", "school", "campus", "branch"],
    "grade": ["gradename", "grade", "class", "standard", "std"],
    "section": ["division", "section", "div"],
    "academic_year": ["academicyear", "academicsession", "session", "year"],
    "parent_name": ["parentname", "fathername", "mothername", "guardianname"],
}

# JSON keys the portal's own API uses, in priority order.
#
# The Student Detail page shows the name as a bare line with no label (the visible
# "Student Name" label belongs to an empty, disabled input), so it cannot be read
# from the text. These endpoints carry it in structured form instead:
#   /api/guardian-student-details            -> student_name, grade_name, division
#   /admin/studentProfile/<id>               -> first_name/last_name, crt_* fields
#   /api/ac-students/student-yearly-details/ -> first_name/last_name, enrollment_number
#   /notification/notification-to-user/by-user -> student_name
API_KEYS: Dict[str, List[str]] = {
    "student_id": [
        "crt_enr_on", "enrollment_number", "enrolment_number", "enrolmentNumber",
        "enrollmentNumber", "admissionNumber", "admission_number", "grNumber",
        "studentCode", "studentId", "student_id",
    ],
    "name": [
        "student_full_name", "studentFullName", "student_name", "studentName",
        "fullName", "full_name", "displayName",
    ],
    "school": ["crt_school", "school_name", "schoolName", "school", "brand_name", "campusName"],
    "grade": ["crt_grade", "grade_name", "gradeName", "grade", "className", "class_name", "standard"],
    "section": [
        "crt_division", "division_name", "divisionName", "division",
        "sectionName", "section_name", "section",
    ],
    "academic_year": [
        "academic_year_name", "academicYearName", "academic_year", "academicYear",
        "academicSession", "academic_session", "session",
    ],
    "parent_name": [
        "parentName", "parent_name", "fatherName", "father_name",
        "motherName", "mother_name", "guardianName", "guardian_name",
    ],
}

# Composed from parts when the API gives the name in pieces rather than whole
NAME_PART_KEYS = (
    ("first_name", "middle_name", "last_name"),
    ("firstName", "middleName", "lastName"),
)

# /admin/studentProfile/<id> nests the guardians next to the student, and they carry
# first_name/last_name too. Only compose a name from an object that also carries one
# of these, or the dashboard ends up greeting the parent by name.
STUDENT_MARKER_KEYS = (
    "crt_enr_on", "enrollment_number", "enrolment_number", "student_id",
    "crt_grade", "grade_name", "crt_division", "student_yearly_id",
)

# URL fragments whose JSON responses are worth mining for the profile
PROFILE_URL_HINTS = (
    "student",
    "guardian",
    "notification-to-user",
    "by-user",
    "communication",
    "profile",
    "user-detail",
    "userdetail",
)

_NORMALISE_RE = re.compile(r"[^a-z0-9]+")
# a value that is really just another label, e.g. the line after "Student Name"
_MAX_VALUE_LEN = 80

# The profile page renders empty form fields as their own captions, so a two-line
# lookahead can pick up "Student Middle Name" or "Contact Info" as if it were a
# value. No real name, school or year ends in one of these words.
_LABEL_TAIL_WORDS = {
    "name", "info", "information", "details", "detail", "photo", "id",
    "number", "no", "date", "birth", "caste", "religion", "gender",
    "nationality", "tongue", "type", "status",
}


def _normalise_label(text: str) -> str:
    return _NORMALISE_RE.sub("", (text or "").lower())


def _field_for_label(label: str) -> Optional[str]:
    key = _normalise_label(label)
    if not key:
        return None
    for field, aliases in LABEL_ALIASES.items():
        if key in aliases:
            return field
    return None


def _is_usable_value(value: str) -> bool:
    v = (value or "").strip()
    if not v or len(v) > _MAX_VALUE_LEN:
        return False
    # the next line being a label means this field simply had no value rendered
    if _field_for_label(v) is not None:
        return False
    words = _NORMALISE_RE.sub(" ", v.lower()).split()
    return not (words and words[-1] in _LABEL_TAIL_WORDS)


def _split_grade_and_section(profile: Dict[str, str]) -> None:
    """Normalises forms like "Grade - 1F", "1F" or "Grade 1 F" into grade + section."""
    grade = (profile.get("grade") or "").strip()
    if not grade:
        return
    m = re.match(r"^(?:grade\s*[-:]?\s*)?(\d{1,2}|[IVX]+)\s*([A-Z])?$", grade, re.IGNORECASE)
    if not m:
        return
    profile["grade"] = f"Grade {m.group(1).upper()}"
    if m.group(2) and not (profile.get("section") or "").strip():
        profile["section"] = m.group(2).upper()


def parse_profile_text(body_text: str) -> Dict[str, str]:
    """
    Pulls profile fields out of the rendered page text.

    Handles both "Label : Value" on one line and a label followed by its value on
    the next line. Returns only the fields actually found — callers merge these
    over their defaults, so a missing field never clobbers a known one.
    """
    found: Dict[str, str] = {}
    if not body_text:
        return found

    lines = [ln.strip() for ln in body_text.replace("\xa0", " ").splitlines()]
    lines = [re.sub(r"\s+", " ", ln) for ln in lines if ln.strip()]

    for idx, line in enumerate(lines):
        label_part, _, value_part = line.partition(":")
        field = _field_for_label(label_part)
        if not field or field in found:
            continue

        value = value_part.strip()
        if not value and idx + 1 < len(lines):
            # label and value rendered as two separate elements
            value = lines[idx + 1].strip()

        if _is_usable_value(value):
            found[field] = value

    if "name" in found and is_placeholder_student_name(found["name"]):
        found.pop("name")
    _split_grade_and_section(found)
    return found


def _walk(payload: Any) -> Iterable[Dict[str, Any]]:
    if isinstance(payload, dict):
        yield payload
        for v in payload.values():
            yield from _walk(v)
    elif isinstance(payload, list):
        for v in payload:
            yield from _walk(v)


def _compose_name(objects: List[Dict[str, Any]]) -> Optional[str]:
    """Builds the name from first/middle/last on student-bearing records only."""
    for obj in objects:
        if not any(marker in obj for marker in STUDENT_MARKER_KEYS):
            continue
        for first_key, middle_key, last_key in NAME_PART_KEYS:
            first = obj.get(first_key)
            if not isinstance(first, str) or not first.strip():
                continue
            parts = [first, obj.get(middle_key) or "", obj.get(last_key) or ""]
            full = " ".join(p.strip() for p in parts if isinstance(p, str) and p.strip())
            if _is_usable_value(full) and not is_placeholder_student_name(full):
                return full
    return None


def parse_profile_payloads(payloads: Iterable[Any]) -> Dict[str, str]:
    """
    Mines the portal's own JSON responses, which survive UI redesigns.

    Fields are resolved by key priority across every captured object rather than by
    whichever object happened to be seen first, so a specific key like student_name
    always beats a generic one that some unrelated record also carries.
    """
    objects: List[Dict[str, Any]] = []
    for payload in payloads or []:
        objects.extend(_walk(payload))

    found: Dict[str, str] = {}
    for field, keys in API_KEYS.items():
        if field in found:
            continue
        for key in keys:
            for obj in objects:
                raw = obj.get(key)
                if isinstance(raw, (str, int)) and _is_usable_value(str(raw)):
                    found[field] = str(raw).strip()
                    break
            if field in found:
                break

    if "name" in found and is_placeholder_student_name(found["name"]):
        found.pop("name")
    if "name" not in found:
        # no explicit student_name field; fall back to first/middle/last
        composed = _compose_name(objects)
        if composed:
            found["name"] = composed
    _split_grade_and_section(found)
    return found


def dump_profile_debug(body_text: str, debug_dir: Optional[str], page=None) -> Optional[str]:
    """
    Saves the raw profile page so a failed extraction can be diagnosed.

    Written under downloads/ (gitignored) because it contains personal data.
    """
    if not debug_dir:
        return None
    try:
        os.makedirs(debug_dir, exist_ok=True)
        stamp = time.strftime("%Y%m%d-%H%M%S")
        path = os.path.join(debug_dir, f"student-detail-{stamp}.txt")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(body_text or "")
        if page is not None:
            try:
                page.screenshot(path=os.path.join(debug_dir, f"student-detail-{stamp}.png"), full_page=True)
            except Exception:
                pass
        return path
    except Exception as exc:
        print(f"[student_profile] Could not write debug dump: {exc}")
        return None


def read_profile_page(page, navigate: bool = True) -> str:
    """Loads the Student Detail page and returns its text. Never raises."""
    try:
        if navigate:
            page.goto(PROFILE_URL, wait_until="domcontentloaded", timeout=20000)
            try:
                # the profile is client-rendered; its API calls settle after load
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass
            page.wait_for_timeout(2000)
        return page.inner_text("body")
    except Exception as exc:
        print(f"[student_profile] Could not load {PROFILE_URL}: {exc}")
        return ""


def build_student_profile(
    body_text: str,
    api_payloads: Optional[List[Any]] = None,
    debug_dir: Optional[str] = None,
    page=None,
) -> Dict[str, str]:
    """
    Merges everything we know into a full profile, falling back to DEFAULT_PROFILE
    for any field the portal did not give us.

    The portal's own JSON wins over scraped page text: the Student Detail markup
    has changed between releases, while the notifications endpoint has reliably
    carried student_name / student_id throughout.
    """
    profile = dict(DEFAULT_PROFILE)
    from_text = parse_profile_text(body_text)
    from_api = parse_profile_payloads(api_payloads or [])

    profile.update({k: v for k, v in from_text.items() if v})
    profile.update({k: v for k, v in from_api.items() if v})

    if is_placeholder_student_name(profile.get("name")):
        dump = dump_profile_debug(body_text, debug_dir, page)
        print(
            "[student_profile] Student name not found in the profile page or any "
            "captured API response; using a placeholder. Raw page text saved to: "
            + (dump or "<not saved>")
        )
    return profile


def extract_student_profile(
    page,
    api_payloads: Optional[List[Any]] = None,
    debug_dir: Optional[str] = None,
    navigate: bool = True,
) -> Dict[str, str]:
    """Convenience wrapper: read the profile page, then merge it with any payloads."""
    body_text = read_profile_page(page, navigate=navigate)
    return build_student_profile(body_text, api_payloads, debug_dir, page)


def capture_profile_payloads(page, sink: List[Any]):
    """
    Attaches a response listener that collects any student-ish JSON the page fetches.
    Returns the handler so callers can keep it alive / detach it.
    """
    def _handler(resp):
        url = (resp.url or "").lower()
        if not any(tok in url for tok in PROFILE_URL_HINTS):
            return
        try:
            data = resp.json()
        except Exception:
            return
        if isinstance(data, (dict, list)):
            sink.append(data)

    page.on("response", _handler)
    return _handler
