"""
SQLite Database Manager for ClassUpdates-Vibgyor.
Handles persistence for students, daily timetable updates, periods,
homework tracking, and official circulars.
"""

import json
import os
import re
import secrets
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from backend.pdf_parser import canonicalize_subject, clean_teacher_note, parse_vibgyor_pdf, standardize_nil

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vibgyor.db")


def get_db_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    target_path = db_path or DB_PATH
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: Optional[str] = None):
    """Initializes tables and seeds default student profile."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            grade TEXT NOT NULL,
            section TEXT NOT NULL,
            school TEXT NOT NULL,
            academic_year TEXT NOT NULL,
            roll_no TEXT,
            parent_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS class_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            date TEXT UNIQUE NOT NULL,       -- YYYY-MM-DD
            display_date TEXT NOT NULL,      -- DD/MM/YYYY
            grade TEXT NOT NULL,
            words_of_the_day TEXT,           -- comma separated or JSON string
            teacher_note TEXT,
            source_pdf TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS periods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            update_id INTEGER NOT NULL,
            date TEXT NOT NULL,               -- YYYY-MM-DD for fast lookup
            period_number INTEGER NOT NULL,   -- 1 to 10
            subject TEXT NOT NULL,
            topic TEXT,
            sub_topic TEXT,
            cw TEXT,
            reinforcement TEXT,
            submission_date TEXT,
            submission_date_iso TEXT,
            skill_assessed TEXT,
            is_homework INTEGER DEFAULT 0,    -- 0 or 1
            is_completed INTEGER DEFAULT 0,   -- 0 or 1
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (update_id) REFERENCES class_updates(id) ON DELETE CASCADE,
            UNIQUE(date, period_number)
        );

        CREATE TABLE IF NOT EXISTS circulars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,           -- Academic, Events, Sports, Admin
            publish_date TEXT NOT NULL,       -- YYYY-MM-DD
            file_url TEXT,
            summary TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_class_updates_date ON class_updates(date);
        CREATE INDEX IF NOT EXISTS idx_periods_date ON periods(date);
        CREATE INDEX IF NOT EXISTS idx_periods_homework ON periods(is_homework);

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            display_name TEXT,
            student_id TEXT,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            student_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
    """)

    # Seed default student if not present
    cursor.execute("SELECT id FROM students LIMIT 1")
    if not cursor.fetchone():
        cursor.execute("""
            INSERT INTO students (student_id, name, grade, section, school, academic_year, roll_no, parent_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "STU-GRADE1F",
            "Student",
            "Grade 1",
            "F",
            "VIBGYOR High",
            "2026 - 27",
            "",
            "Parent"
        ))

    # Standardize NIL across all period fields in the database
    cursor.execute("""
        UPDATE periods SET cw = 'NIL'
        WHERE LOWER(TRIM(cw)) IN ('nil', 'na', 'none', 'cwsh - nil', 'cwsh-nil', 'null', '') OR cw IS NULL;
    """)
    cursor.execute("""
        UPDATE periods SET reinforcement = 'NIL'
        WHERE LOWER(TRIM(reinforcement)) IN ('nil', 'na', 'none', 'rwsh - nil', 'rwsh-nil', 'null', '') OR reinforcement IS NULL;
    """)
    cursor.execute("""
        UPDATE periods SET submission_date = 'NIL'
        WHERE LOWER(TRIM(submission_date)) IN ('nil', 'na', 'none', 'null', '-', '') OR submission_date IS NULL;
    """)
    cursor.execute("""
        UPDATE periods SET skill_assessed = 'NIL'
        WHERE LOWER(TRIM(skill_assessed)) IN ('nil', 'na', 'none', 'null', '') OR skill_assessed IS NULL;
    """)

    # Standardize subject names (e.g. Mathematics(S) -> Mathematics)
    cursor.execute("UPDATE periods SET subject = 'Mathematics' WHERE subject LIKE 'Mathematics(S)%' OR subject LIKE 'Mathematics (S)%'")
    cursor.execute("UPDATE periods SET subject = 'English Literature' WHERE subject LIKE 'English Literature(S)%' OR subject LIKE 'English Literature (S)%'")
    cursor.execute("UPDATE periods SET subject = 'Language Arts' WHERE subject LIKE 'Language Arts(S)%' OR subject LIKE 'Language Arts (S)%'")
    cursor.execute("UPDATE periods SET subject = 'Computers' WHERE subject = 'Computer'")
    cursor.execute("UPDATE periods SET subject = 'Skill Program' WHERE subject = 'Skill programme'")
    cursor.execute("UPDATE periods SET subject = 'English Literature' WHERE subject = 'Literature'")

    # Ensure circulars route to Orion app URL rather than expired GCS tokens
    cursor.execute("UPDATE circulars SET file_url = 'https://hubbleorion.hubblehox.com/' WHERE file_url LIKE '%storage.googleapis.com%' OR file_url LIKE '%X-Goog-%'")

    # Clean teacher notes of boilerplate greetings and valedictions
    cursor.execute("SELECT id, teacher_note FROM class_updates WHERE teacher_note IS NOT NULL AND teacher_note != ''")
    for r in cursor.fetchall():
        cleaned_tn = clean_teacher_note(r["teacher_note"])
        cursor.execute("UPDATE class_updates SET teacher_note = ? WHERE id = ?", (cleaned_tn, r["id"]))

    conn.commit()
    conn.close()


def create_or_get_user(
    username: str,
    student_id: Optional[str] = None,
    display_name: Optional[str] = None,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieves an existing user or creates a new user record."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    clean_username = username.strip().lower()
    cursor.execute("SELECT * FROM users WHERE username = ?", (clean_username,))
    row = cursor.fetchone()
    if row:
        user = dict(row)
        updates = []
        params = []
        if student_id and student_id != user.get("student_id"):
            updates.append("student_id = ?")
            params.append(student_id)
        if display_name and display_name != user.get("display_name"):
            updates.append("display_name = ?")
            params.append(display_name)
        updates.append("last_login = CURRENT_TIMESTAMP")
        if updates:
            params.append(user["id"])
            cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user["id"],))
            user = dict(cursor.fetchone())
        conn.close()
        return user

    cursor.execute("""
        INSERT INTO users (username, display_name, student_id, last_login)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    """, (clean_username, display_name or clean_username, student_id))
    conn.commit()
    user_id = cursor.lastrowid
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = dict(cursor.fetchone())
    conn.close()
    return user


def create_session(
    user_id: int,
    username: str,
    student_id: Optional[str] = None,
    duration_days: int = 7,
    db_path: Optional[str] = None,
) -> str:
    """Generates a secure random session token valid for duration_days."""
    token = secrets.token_hex(32)
    expires_at = datetime.utcnow() + timedelta(days=duration_days)
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO user_sessions (token, user_id, username, student_id, expires_at)
        VALUES (?, ?, ?, ?, ?)
    """, (token, user_id, username.strip().lower(), student_id, expires_at.isoformat()))
    conn.commit()
    conn.close()
    return token


def get_session_user(token: str, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Validates session token and returns user and student details."""
    if not token:
        return None
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.token, s.expires_at, u.id as user_id, u.username, u.display_name, u.student_id
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
    """, (token,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None

    expires_at_str = row["expires_at"]
    try:
        expires_at = datetime.fromisoformat(expires_at_str)
        if expires_at < datetime.utcnow():
            delete_session(token, db_path=db_path)
            return None
    except Exception:
        pass

    return dict(row)


def delete_session(token: str, db_path: Optional[str] = None) -> bool:
    """Deletes a session token on logout."""
    if not token:
        return False
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected


def get_student_profile(student_id: Optional[str] = None, db_path: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves student profile."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    if student_id:
        cursor.execute("SELECT * FROM students WHERE student_id = ?", (student_id,))
    else:
        cursor.execute("SELECT * FROM students ORDER BY id ASC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {
            "student_id": "STU-GRADE1F",
            "name": "Student",
            "grade": "Grade 1",
            "section": "F",
            "school": "VIBGYOR High",
            "academic_year": "2026 - 27",
            "roll_no": "",
            "parent_name": "Parent"
        }
    return dict(row)


def upsert_student(
    student_id: str,
    name: str,
    grade: str,
    section: str,
    school: str,
    academic_year: str = "2026 - 27",
    roll_no: str = "",
    parent_name: str = "",
    db_path: Optional[str] = None
):
    """Inserts or updates the real student profile, purging any demo placeholder."""
    clean_name = " ".join([w.capitalize() for w in name.split()])
    clean_parent = " ".join([w.capitalize() for w in parent_name.split()]) if parent_name else ""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE student_id = 'VIB-2026-1F-042'")
    cursor.execute("SELECT id FROM students WHERE student_id = ?", (student_id,))
    existing = cursor.fetchone()
    if existing:
        cursor.execute("""
            UPDATE students SET name = ?, grade = ?, section = ?, school = ?, academic_year = ?, roll_no = ?, parent_name = ?
            WHERE student_id = ?
        """, (clean_name, grade, section, school, academic_year, roll_no, clean_parent, student_id))
    else:
        cursor.execute("""
            INSERT INTO students (student_id, name, grade, section, school, academic_year, roll_no, parent_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (student_id, clean_name, grade, section, school, academic_year, roll_no, clean_parent))
    conn.commit()
    conn.close()


def purge_placeholder_circulars(db_path: Optional[str] = None):
    """Purges initial hardcoded demo circulars."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM circulars WHERE file_url LIKE '/circulars/%'")
    conn.commit()
    conn.close()


def upsert_class_update(parsed_data: Dict[str, Any], source_pdf: Optional[str] = None, db_path: Optional[str] = None) -> int:
    """
    Upserts a parsed daily update and its 10 periods.
    Preserves is_completed status if periods already exist and were marked completed.
    """
    iso_date = parsed_data.get("date")
    display_date = parsed_data.get("display_date") or iso_date
    if not iso_date:
        raise ValueError("Cannot upsert class update without a valid ISO date.")

    grade = parsed_data.get("grade", "Grade - 1F")
    words_raw = parsed_data.get("words_raw") or ",".join(parsed_data.get("words_of_the_day", []))
    teacher_note = parsed_data.get("teacher_note", "")
    pdf_name = source_pdf or parsed_data.get("source_pdf", "")

    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # Get student_id
    cursor.execute("SELECT student_id FROM students LIMIT 1")
    s_row = cursor.fetchone()
    student_id = s_row["student_id"] if s_row else "VIB-2026-1F-042"

    # Upsert into class_updates
    cursor.execute("""
        INSERT INTO class_updates (student_id, date, display_date, grade, words_of_the_day, teacher_note, source_pdf)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
            grade = excluded.grade,
            words_of_the_day = excluded.words_of_the_day,
            teacher_note = excluded.teacher_note,
            source_pdf = CASE WHEN excluded.source_pdf != '' THEN excluded.source_pdf ELSE class_updates.source_pdf END
    """, (student_id, iso_date, display_date, grade, words_raw, teacher_note, pdf_name))

    cursor.execute("SELECT id FROM class_updates WHERE date = ?", (iso_date,))
    update_id = cursor.fetchone()["id"]

    # Upsert periods, preserving completion status
    for p in parsed_data.get("periods", []):
        p_num = p["period_number"]
        # Check existing completion status
        cursor.execute("SELECT is_completed, completed_at FROM periods WHERE date = ? AND period_number = ?", (iso_date, p_num))
        existing = cursor.fetchone()
        existing_completed = existing["is_completed"] if existing else 0
        existing_completed_at = existing["completed_at"] if existing else None

        is_hw = 1 if p.get("is_homework") else 0

        cursor.execute("""
            INSERT INTO periods (
                update_id, date, period_number, subject, topic, sub_topic,
                cw, reinforcement, submission_date, submission_date_iso,
                skill_assessed, is_homework, is_completed, completed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date, period_number) DO UPDATE SET
                subject = excluded.subject,
                topic = excluded.topic,
                sub_topic = excluded.sub_topic,
                cw = excluded.cw,
                reinforcement = excluded.reinforcement,
                submission_date = excluded.submission_date,
                submission_date_iso = excluded.submission_date_iso,
                skill_assessed = excluded.skill_assessed,
                is_homework = excluded.is_homework,
                is_completed = CASE WHEN excluded.is_homework = 0 THEN 0 ELSE periods.is_completed END,
                completed_at = CASE WHEN excluded.is_homework = 0 THEN NULL ELSE periods.completed_at END
        """, (
            update_id,
            iso_date,
            p_num,
            canonicalize_subject(p.get("subject", "")),
            p.get("topic", "").strip(),
            p.get("sub_topic", "").strip(),
            standardize_nil(p.get("cw")),
            standardize_nil(p.get("reinforcement")),
            standardize_nil(p.get("submission_date")),
            p.get("submission_date_iso"),
            standardize_nil(p.get("skill_assessed")),
            is_hw,
            existing_completed,
            existing_completed_at
        ))

    conn.commit()
    conn.close()
    return update_id


def get_available_dates(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns all dates with class updates, ordered chronologically descending."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.date, u.display_date, u.grade, u.words_of_the_day,
               COUNT(CASE WHEN p.is_homework = 1 THEN 1 END) as homework_count,
               COUNT(CASE WHEN p.is_homework = 1 AND p.is_completed = 1 THEN 1 END) as completed_homework_count
        FROM class_updates u
        LEFT JOIN periods p ON u.date = p.date
        GROUP BY u.date
        ORDER BY u.date DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        words = [w.strip() for w in (r["words_of_the_day"] or "").split(",") if w.strip()]
        result.append({
            "date": r["date"],
            "display_date": r["display_date"],
            "grade": r["grade"],
            "words_of_the_day": words,
            "words_raw": r["words_of_the_day"] or "",
            "homework_count": r["homework_count"],
            "completed_homework_count": r["completed_homework_count"],
            "has_pending_homework": (r["homework_count"] > r["completed_homework_count"]),
        })
    return result


def get_daily_update(date_str: str, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves full breakdown for a single day."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM class_updates WHERE date = ?", (date_str,))
    update_row = cursor.fetchone()
    if not update_row:
        conn.close()
        return None

    cursor.execute("""
        SELECT * FROM periods
        WHERE date = ?
        ORDER BY period_number ASC
    """, (date_str,))
    period_rows = cursor.fetchall()
    conn.close()

    periods = []
    hw_count = 0
    hw_completed_count = 0

    for pr in period_rows:
        p_dict = dict(pr)
        p_dict["is_homework"] = bool(p_dict["is_homework"])
        p_dict["is_completed"] = bool(p_dict["is_completed"])
        if p_dict["is_homework"]:
            hw_count += 1
            if p_dict["is_completed"]:
                hw_completed_count += 1
        periods.append(p_dict)

    words = [w.strip() for w in (update_row["words_of_the_day"] or "").split(",") if w.strip()]

    return {
        "id": update_row["id"],
        "student_id": update_row["student_id"],
        "date": update_row["date"],
        "display_date": update_row["display_date"],
        "grade": update_row["grade"],
        "words_of_the_day": words,
        "words_raw": update_row["words_of_the_day"] or "",
        "teacher_note": clean_teacher_note(update_row["teacher_note"] or ""),
        "source_pdf": update_row["source_pdf"],
        "total_periods": len(periods),
        "homework_count": hw_count,
        "completed_homework_count": hw_completed_count,
        "all_homework_completed": (hw_count > 0 and hw_count == hw_completed_count),
        "periods": periods,
    }


def get_weekly_updates(start_date: Optional[str] = None, db_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns a consolidated 5-day view (Monday to Friday) covering the given date,
    or the latest update date if start_date is omitted.
    Includes:
      - days: List of daily summaries (periods, topics, CWSH, homework)
      - weekly_dictation_words: Unique list of all words of the day across the week
      - active_homework_items: All homework tasks due or assigned this week
    """
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    if not start_date:
        cursor.execute("SELECT MAX(date) as max_date FROM class_updates")
        row = cursor.fetchone()
        if row and row["max_date"]:
            start_date = row["max_date"]
        else:
            start_date = datetime.now().strftime("%Y-%m-%d")

    conn.close()

    try:
        ref_dt = datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError:
        ref_dt = datetime.now()

    # Determine Monday of this week
    monday_dt = ref_dt - timedelta(days=ref_dt.weekday())
    week_dates = [(monday_dt + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(5)]

    days_data = []
    weekly_words_set = []
    active_homework = []

    for d in week_dates:
        day_update = get_daily_update(d, db_path=db_path)
        if day_update:
            days_data.append(day_update)
            for w in day_update["words_of_the_day"]:
                if w not in weekly_words_set:
                    weekly_words_set.append(w)
            seen_hw_keys = set()
            for p in day_update["periods"]:
                if p["is_homework"]:
                    hw_k = f"{p['subject'].lower()}|{(p['reinforcement'] or '').lower()}"
                    if hw_k not in seen_hw_keys:
                        seen_hw_keys.add(hw_k)
                        active_homework.append({
                            "period_id": p["id"],
                            "date": p["date"],
                            "period_number": p["period_number"],
                            "subject": p["subject"],
                            "topic": p["topic"],
                            "reinforcement": p["reinforcement"],
                            "submission_date": p["submission_date"],
                            "submission_date_iso": p["submission_date_iso"],
                            "is_completed": p["is_completed"],
                        })
        else:
            # Placeholder for day without updates
            cur_dt = datetime.strptime(d, "%Y-%m-%d")
            days_data.append({
                "date": d,
                "display_date": cur_dt.strftime("%d/%m/%Y"),
                "grade": "Grade - 1F",
                "words_of_the_day": [],
                "teacher_note": "",
                "total_periods": 0,
                "homework_count": 0,
                "completed_homework_count": 0,
                "periods": [],
                "is_empty": True,
            })

    return {
        "week_start": week_dates[0],
        "week_end": week_dates[-1],
        "days": days_data,
        "weekly_dictation_words": weekly_words_set,
        "active_homework_items": active_homework,
    }


def toggle_homework_status(period_id: int, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Toggles the is_completed state for a period homework item."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT id, is_completed, period_number, subject, date, reinforcement FROM periods WHERE id = ?", (period_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    current_status = row["is_completed"]
    new_status = 0 if current_status else 1
    completed_at = datetime.now().isoformat() if new_status else None

    # Update this period and any duplicate periods on the same date with matching subject & reinforcement (e.g. double periods)
    cursor.execute("""
        UPDATE periods
        SET is_completed = ?, completed_at = ?
        WHERE date = ? AND LOWER(subject) = LOWER(?) AND LOWER(COALESCE(reinforcement, '')) = LOWER(COALESCE(?, ''))
    """, (new_status, completed_at, row["date"], row["subject"], row["reinforcement"] or ""))

    conn.commit()

    cursor.execute("SELECT * FROM periods WHERE id = ?", (period_id,))
    updated_row = dict(cursor.fetchone())
    conn.close()

    updated_row["is_homework"] = bool(updated_row["is_homework"])
    updated_row["is_completed"] = bool(updated_row["is_completed"])
    return updated_row


def get_circulars(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns all circulars ordered by publish_date descending."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM circulars ORDER BY publish_date DESC, id DESC")
    rows = cursor.fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["is_read"] = bool(d["is_read"])
        if d.get("file_url") and ("storage.googleapis.com" in d["file_url"] or "X-Goog-" in d["file_url"]):
            d["file_url"] = "https://hubbleorion.hubblehox.com/"
        result.append(d)
    return result


def summarize_circular_text(title: str, raw_content: str = "") -> str:
    """
    Produces a concise, parent-friendly 1-2 sentence executive summary
    for school circulars, stripping long boilerplate, templates, and placeholders.
    """
    tl = (title or "").lower()

    if "holiday" in tl:
        return "Official VIBGYOR academic calendar and scheduled student holiday list for academic year 2026-27, detailing term breaks and national holidays."
    if "user manual" in tl or "parent app" in tl:
        return "Parent manual introducing new features in Hubble Orion, including daily timetable sync, digital diary updates, and school announcements."
    if "try out" in tl or "school team" in tl:
        return "Tryout schedule and eligibility criteria for students seeking admission to official school sports teams (Basketball, Football, Cricket, etc.)."
    if "external exam" in tl:
        return "Information and schedule for optional external academic competitions and Olympiads (Science, Math, SpellBee) conducted in school."
    if "fun friday" in tl:
        return "Monthly themed Fun Friday interactive activities planned for primary learners on the last Friday of each month. No heavy schoolbags required."
    if "family fiesta" in tl:
        return "Celebration details for the annual VIVA Family Fiesta celebrating 18 years with creative showcases, games, and community events."
    if "winter cup" in tl:
        return "Details regarding the 3-day Youth Winter Cup Football tournament in Bengaluru organized in association with Olympia Sportz & Events."
    if "junior champs" in tl and "football" in tl:
        return "Interschool football championship details for junior students focusing on teamwork, agility, and sportsmanship."
    if "junior champs" in tl and "basketball" in tl:
        return "Interschool basketball tournament details for junior grades emphasizing skills development, team coordination, and match play."
    if "junior champs" in tl and "cricket" in tl:
        return "Interschool cricket tournament information for junior learners covering coaching schedules, matches, and team participation."
    if "stars ensemble" in tl:
        return "Audition and participation circular for the VIVA Stars Ensemble and Junior Stars Ensemble music and cultural showcases."
    if "viva" in tl and ("announcement" in tl or "details" in tl):
        return "Official announcement and participation guidelines for VIBGYOR Viva annual inter-school cultural, sports, and arts fest."
    if "after school" in tl:
        return "Details and enrollment information for post-school activity clubs, sports training, and creative enrichment programs."

    if not raw_content:
        return f"Official circular regarding {title} for parents."

    cleaned = re.sub(r"<[^>]+>", " ", raw_content)
    cleaned = re.sub(r"&nbsp;", " ", cleaned)
    cleaned = re.sub(r"&amp;", "&", cleaned)
    cleaned = re.sub(r"_{2,}", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Strip greeting boilerplate
    cleaned = re.sub(r"^(?:Dear Parent[s]?,?|Greetings!?|Warm Regards,?|Dear All,?)\s*", "", cleaned, flags=re.IGNORECASE).strip()

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned) if len(s.strip()) > 15]
    if sentences:
        first_few = " ".join(sentences[:2])
        if len(first_few) > 220:
            first_few = first_few[:217] + "..."
        return first_few

    return cleaned[:200] if len(cleaned) > 200 else (cleaned or f"Official circular regarding {title}.")


def add_circular(
    title: str,
    category: str,
    publish_date: str,
    file_url: str = "",
    summary: str = "",
    db_path: Optional[str] = None
) -> int:
    """Inserts a circular if not already existing with the same title and date, with clean concise summary."""
    clean_summary = summarize_circular_text(title, summary)
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, summary, file_url FROM circulars WHERE title = ? AND publish_date = ?", (title, publish_date))
    existing = cursor.fetchone()
    if existing:
        # Update summary or file_url if empty or needs cleaning
        c_id = existing["id"]
        cursor.execute("""
            UPDATE circulars SET
                summary = ?,
                file_url = CASE WHEN ? != '' THEN ? ELSE file_url END
            WHERE id = ?
        """, (clean_summary, file_url, file_url, c_id))
        conn.commit()
        conn.close()
        return c_id

    cursor.execute("""
        INSERT INTO circulars (title, category, publish_date, file_url, summary)
        VALUES (?, ?, ?, ?, ?)
    """, (title, category, publish_date, file_url, clean_summary))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id


def mark_circular_read(circular_id: int, is_read: bool = True, db_path: Optional[str] = None):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE circulars SET is_read = ? WHERE id = ?", (1 if is_read else 0, circular_id))
    conn.commit()
    conn.close()


def seed_sample_data(db_path: Optional[str] = None):
    """
    Seeds initial data using the two sample PDFs from sample_data/
    and adds realistic official school circulars.
    """
    init_db(db_path)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    samples = [
        os.path.join(base_dir, "sample_data", "sample_2026-09-18.pdf"),
        os.path.join(base_dir, "sample_data", "sample_2026-09-21.pdf"),
    ]

    for sample in samples:
        if os.path.exists(sample):
            try:
                parsed = parse_vibgyor_pdf(sample)
                upsert_class_update(parsed, source_pdf=os.path.basename(sample), db_path=db_path)
                print(f"[database] Seeded {sample} successfully.")
            except Exception as err:
                print(f"[database] Failed to seed {sample}: {err}")

    # Purge any dummy placeholder circulars
    purge_placeholder_circulars(db_path)

    # Ingest real circulars from captured notification records if available
    notif_json = os.path.join(base_dir, "sample_data", "captured_notifications.json")
    if os.path.exists(notif_json):
        try:
            with open(notif_json) as f:
                items = json.load(f)
            if items:
                records = items[-1].get("body", {}).get("data", {}).get("data", [])
                import re
                for item in records:
                    if item.get("communication_master_slug") == "Circular":
                        mode_dict = item.get("mode") or {}
                        subj_raw = ""
                        content_raw = ""
                        for m_val in mode_dict.values():
                            if isinstance(m_val, dict):
                                subj_raw = m_val.get("subject") or subj_raw
                                content_raw = m_val.get("content") or content_raw

                        title = re.sub(r"<[^>]+>", " ", subj_raw)
                        title = re.sub(r"&nbsp;", " ", title)
                        title = re.sub(r"&amp;", "&", title)
                        title = re.sub(r"-\s*\([^\)]+\)", "", title)
                        title = re.sub(r"\s+", " ", title).strip()
                        if not title:
                            continue

                        summary = re.sub(r"<[^>]+>", " ", content_raw)
                        summary = re.sub(r"&nbsp;", " ", summary)
                        summary = re.sub(r"&amp;", "&", summary)
                        summary = re.sub(r"\s+", " ", summary).strip()

                        created_at_raw = item.get("created_at") or item.get("published_date") or ""
                        pub_date = created_at_raw.split("T")[0] if "T" in created_at_raw else "2026-09-22"

                        category = "Academic"
                        if any(k in title.lower() for k in ["sports", "football", "cricket", "basketball", "champs", "cup"]):
                            category = "Sports"
                        elif any(k in title.lower() for k in ["fiesta", "friday", "celebration", "fest", "ensemble"]):
                            category = "Events"
                        elif any(k in title.lower() for k in ["holiday", "transport", "manual", "admissions", "fee"]):
                            category = "Admin"

                        atts = item.get("attachment") or []
                        file_url = atts[0] if atts else ""
                        add_circular(title=title, category=category, publish_date=pub_date, file_url=file_url, summary=summary, db_path=db_path)
        except Exception as err:
            print(f"[database] Error importing captured circulars: {err}")

    # Ensure all circulars in the database have clean, concise summaries
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, summary FROM circulars")
    for row in cursor.fetchall():
        clean_sum = summarize_circular_text(row["title"], row["summary"])
        cursor.execute("UPDATE circulars SET summary = ? WHERE id = ?", (clean_sum, row["id"]))
    conn.commit()
    conn.close()


if __name__ == "__main__":
    seed_sample_data()
    print("Database initialization and seeding complete.")
    dates = get_available_dates()
    print("Available dates:", dates)
