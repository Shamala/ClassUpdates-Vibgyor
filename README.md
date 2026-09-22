# ClassUpdates-Vibgyor

A modern, high-contrast, parent-first dashboard and timetable intelligence pipeline for **VIBGYOR High**.

Specifically tailored for **Grade 1 (Grade 1F, Marathahalli)**, this system transforms raw, cryptic daily diary timetable PDFs into clear, actionable daily and weekly updates for busy parents.

---

## 🌐 Live Web App (GitHub Pages)

You can use the live web app directly in your browser without installing anything:

👉 **[https://shamala.github.io/ClassUpdates-Vibgyor/](https://shamala.github.io/ClassUpdates-Vibgyor/)**

Click **"✨ Explore Demo / Sample Account"** to test immediately with real Grade 1 sample updates.

---

## 🔒 Privacy & Data Security Architecture

> [!IMPORTANT]
> **Zero Remote Server Storage**: This application **does NOT store or transmit private credentials (usernames or passwords) to any remote database or external server**. All updates, preferences, and homework checkmarks are stored strictly inside the user's browser.

### Privacy Safeguards:

1. **Zero Password Storage**:
   - When hosted on GitHub Pages or used in client-side mode, passwords are **never sent across the internet, recorded in logs, or saved on any remote server**.
   - Authentication operates locally within your browser sandbox.

2. **100% Client-Side Browser Storage (`localStorage`)**:
   - Your interactive homework checkmarks (`vibgyor_completed_hw_ids`), display preferences (`theme`), and session state (`orion_auth_token`) exist purely inside your browser's private local storage.
   - Clicking **"Sign Out"** or clearing your browser site data immediately wipes all session tokens and preferences from your device.

3. **Zero Third-Party Trackers & Telemetry**:
   - No tracking pixels, Google Analytics, or third-party cookies are used.
   - Only Google Fonts (`Commissioner`) and Tailwind CSS are loaded from reputable CDNs.

4. **Transparent & Fully Inspectable**:
   - The frontend code consists entirely of readable, open-source HTML, CSS, and vanilla JavaScript (`frontend/index.html`, `frontend/app.js`, `frontend/static_data.js`).
   - Anyone can open browser Developer Tools (**Inspect → Network**) to inspect and verify that no credentials or private data leave their machine.

---

## 🌟 Key Highlights & Features

1. **Hubble Orion Parent Login & Multi-User Support**
   - Secure parent authentication supporting Hubble Orion credentials.
   - 1-click **Demo / Sample Mode** to instantly explore the dashboard with pre-seeded data without external credentials.
   - Session management with token authorization and persistent sign-in state.

2. **Word Bank & Flashcard Drill (Surprise Dictation Prep)**
   - Grade 1 students face continuous surprise dictations in school.
   - **Mobile-Native Bottom Sheet**: No nested scroll traps on phones; displays "This Week's Focus" right on top above the fold.
   - **Interactive Flashcards**: Practice spelling word-by-word with **Child-Tuned Audio Pronunciation** (`rate=0.75`, `pitch=1.05`), blind test hide/reveal, and shuffle.
   - **Past Weeks Archive**: Collapsible weekly accordions to review previous vocabulary without cluttering the screen.
   - **1-Click Copy**: Instant clipboard copy for WhatsApp sharing or printing.

3. **Active Homework (RWSH) Tracker with Real-Time Dropdown Sync**
   - Automatically filters out inactive periods (`Nil`, `NIL`, `RWSH - NIL`).
   - Identifies active reinforcement homework (e.g. `RWSH-14,15` due 21/09/2026; Tinkercad Robotics project).
   - Interactive checklist persists completion status locally to `localStorage` (and SQLite when running with backend).
   - **Real-Time Date Dropdown Badging**: Automatically adds/removes `" 📌 HW Due"` badges in the date selector in real time when homework is toggled.
   - Handles double periods seamlessly with unified task counts.

4. **Class Work (CWSH) & 10-Period Daily Timetable**
   - Structured timetable covering Periods 1 through 10.
   - Distinct subject badges (Language Arts, Mathematics, Social Science, Robotics, Kannada, Hindi, SPA, Computers).
   - Displays Class Work done (CWSH, e.g. `CWSH-22`, `24A,B,C & D`) and Assessed Skills (e.g. `Computational fluency`, `Experiential Learning`).

5. **Teacher's Notes & Cleaned Notices**
   - Highlights remarks and guidance from teachers with clean, boilerplate-free formatting.

6. **5-Day Weekly Consolidated Overview**
   - Monday-to-Friday curriculum matrix with disabled future day buttons.
   - Weekly Dictation Word Bank consolidating all vocabulary for weekend revision.
   - Weekly Homework Deadlines list with due dates.

7. **Circulars & Notices Hub**
   - School circulars categorized by Academic, Sports, Events, and Admin.
   - Search filter, clean summaries, and direct links.

8. **Design & Accessibility**
   - Seamless **Dark Mode & Light Mode** toggle with anti-flicker detection.
   - Expressive, calm typography powered by Google Fonts **Commissioner**.
   - Fully responsive for mobile and desktop screens.

---

## 📁 Repository Structure

```text
ClassUpdates-Vibgyor/
├── .github/
│   └── workflows/
│       └── deploy.yml    # Automated GitHub Pages CI/CD workflow
├── backend/
│   ├── database.py       # SQLite3 database manager & initial seeding
│   ├── pdf_parser.py     # Multi-engine VIBGYOR timetable PDF parser
│   ├── orion_client.py   # Orion portal client & offline fallback ingest
│   └── main.py           # REST API server & static asset host
├── frontend/
│   ├── index.html        # Modern Tailwind parent dashboard
│   ├── app.js            # Client-side reactivity & API / localStorage integration
│   ├── static_data.js    # Pre-bundled Grade 1 sample dataset for GitHub Pages
│   └── style.css         # Custom tokens & rainbow accent strip
├── sample_data/
│   ├── sample_2026-09-18.pdf
│   └── sample_2026-09-21.pdf
├── tests/
│   ├── test_pdf_parser.py # Tests parsing on both sample PDFs
│   ├── test_api.py        # Integration tests for REST endpoints and static assets
│   └── test_auth.py       # Authentication and session tests
├── .env.example
├── requirements.txt
├── start.sh
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Launch the Application

Run the launcher script:

```bash
./start.sh
```

Or run directly with Python:

```bash
python3 -m backend.main 8000
```

Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 🧪 Running Tests

Run the complete test suite (25 tests covering PDF extraction, authentication, and REST APIs):

```bash
./venv/bin/pytest
```

Or with Python's built-in test discovery:

```bash
python3 -m unittest discover tests
```

### Test Coverage Highlights:

- **`sample_2026-09-18.pdf`**:
  - Date: `2026-09-18` (18/09/2026)
  - Words of the Day: `hear, tame`
  - Active Homework: Period 7 (Social Science) `RWSH-14,15` due `21/09/2026`
  - CW: Period 8 `CWSH-22`
  - Teacher Note: Addition revision instructions
- **`sample_2026-09-21.pdf`**:
  - Date: `2026-09-21` (21/09/2026)
  - Words of the Day: `gone, saw`
  - Active Homework: Period 7 (Robotics) `Tinkercad project 3`
  - CW: Period 1 `24A,B,C & D`
- **REST Endpoints & Static Files**:
  - `GET /api/student`
  - `GET /api/dates`
  - `GET /api/updates/daily?date=YYYY-MM-DD`
  - `GET /api/updates/weekly?start_date=YYYY-MM-DD`
  - `GET /api/circulars`
  - `POST /api/homework/{id}/toggle`
  - `POST /api/sync`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
  - `GET /style.css`, `GET /app.js`, `GET /static_data.js`

---

## ⚙️ Configuration (`.env`)

For optional automated live synchronization directly from Hubble Orion:

```ini
ORION_BASE_URL=https://hubbleorion.hubblehox.com
ORION_USERNAME=parent_email@example.com
ORION_PASSWORD=your_orion_password
ORION_DOWNLOADS_DIR=
PORT=8000
HOST=0.0.0.0
```
