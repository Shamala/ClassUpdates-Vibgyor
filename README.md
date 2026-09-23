# ClassUpdates-Vibgyor

A modern, high-contrast, parent-first dashboard and timetable intelligence pipeline for **VIBGYOR High**.

Specifically tailored for **Grade 1**, this system transforms raw, cryptic daily diary timetable PDFs into clear, actionable daily and weekly updates for busy parents.

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
   - Your Hubble Orion password is **not** configured in `.env` and is never written to disk or to the database. You type it into the sign-in form; it is used for that request and then discarded.
   - Running locally, it is sent only to the server on your own machine, which uses it to sign in to Hubble Orion on your behalf. The browser keeps it in memory for the page session so **Sync Now** works without asking again, clears it on sign out, and forgets it on reload.
   - On GitHub Pages there is no server at all, so nothing is sent anywhere.

2. **What the published site deliberately does not contain**:
   - No student name, enrolment number, internal ids, parent email or phone number. The published bundle carries only class content.
   - If you set a student name on the published site, it stays in your own browser and is never uploaded.
   - Be aware that the published site has no server to check a password against, so **its sign-in is not verified and anyone with the link can open the dashboard**. Credential checking against Hubble Orion only happens when you run the backend locally, where a wrong password is rejected.

3. **100% Client-Side Browser Storage (`localStorage`)**:
   - Your interactive homework checkmarks (`vibgyor_completed_hw_ids`), display preferences (`theme`), and session state (`orion_auth_token`) exist purely inside your browser's private local storage.
   - Clicking **"Sign Out"** or clearing your browser site data immediately wipes all session tokens and preferences from your device.

4. **No Tracking Cookies; Optional Cookieless Visit Counting**:
   - No tracking pixels, no Google Analytics, no third-party cookies, no advertising or profiling.
   - Google Fonts (`Commissioner`) and Tailwind CSS are loaded from reputable CDNs.
   - The published site can optionally count visits with **GoatCounter**, which is open source and cookieless. It derives a daily unique visitor count from a salted hash of IP and user agent that rotates every day, so nothing is stored on the visitor's device and a person cannot be followed from one day to the next. It exists so the owner can tell whether the public link has spread beyond the family.
   - It is **off unless the `GOATCOUNTER_CODE` repository secret is set**. Clone or fork this repository and the published page loads no analytics at all. The service worker never caches or replays it.

5. **Transparent & Fully Inspectable**:
   - The frontend code consists entirely of readable, open-source HTML, CSS, and vanilla JavaScript (`frontend/index.html`, `frontend/app.js`, `frontend/static_data.js`).
   - Anyone can open browser Developer Tools (**Inspect → Network**) to inspect and verify that no credentials or private data leave their machine.

---

## 🌟 Key Highlights & Features

1. **Shared Class Board (published site)**
   - The class diary is the same for every parent in the class, so the published site is a shared board rather than a per-child account.
   - Parents open the link, enter the **class passcode** once per device, and see the daily diary, homework and circulars.
   - The passcode does not merely hide a screen: the class content is **encrypted with it** before publishing, so fetching the data file directly returns ciphertext. The passcode is never uploaded; it only derives the key in the parent's browser.
   - Each parent's child name and homework ticks stay in their own browser, so nobody sees anyone else's.
   - No student name, enrolment number or internal id is published. A **"See a sample"** link shows the sanitised demo data to anyone without the passcode.
   - A freshness stamp shows when the board was last refreshed, and turns amber once it is more than a day and a half old.

2. **Automatic Daily Updates on Sign-In**
   - Signing in fetches the day's diary, homework and circulars by itself, so there is nothing to press.
   - It runs in the background: the dashboard is usable within seconds while the portal is read behind it.
   - No password is stored anywhere to make this work. It uses the one you just typed, held in memory for that page session only, so a reload restores your session but not your password. **Sync Now** is still there for a manual refresh.

3. **Hubble Orion Parent Login & Multi-User Support**
   - Parent authentication against Hubble Orion: the credentials you type are checked by signing in to the portal, and a password it rejects is refused rather than waved through.
   - 1-click **Demo / Sample Mode** to instantly explore the dashboard with pre-seeded data without external credentials.
   - Session management with token authorization and persistent sign-in state.

4. **Word Bank & Flashcard Drill (Surprise Dictation Prep)**
   - Grade 1 students face continuous surprise dictations in school.
   - **Mobile-Native Bottom Sheet**: No nested scroll traps on phones; displays "This Week's Focus" right on top above the fold.
   - **Interactive Flashcards**: Practice spelling word-by-word with audio pronunciation, blind test hide/reveal, and shuffle.
   - **Pronunciation tuned for clarity**: targets `en-US` (the word lists are standard storybook English), picks the clearest available voice and skips the novelty voices some platforms list first, and speaks at `rate=0.85` / `pitch=1.0` so phonemes stay distinct without sounding synthetic.
   - **Works offline**: server-backed voices are silent without a connection, so an on-device voice wins any tie, is the only candidate when offline, and takes over automatically if a network voice fails or never starts.
   - Homographs (`read`, `lead`, `live`, `tear`) cannot be resolved from a single word, since the engine has no sentence to disambiguate with. `PRONUNCIATION_OVERRIDES` in `frontend/app.js` lets you respell one to force the intended reading.
   - **Past Weeks Archive**: Collapsible weekly accordions to review previous vocabulary without cluttering the screen.
   - **1-Click Copy**: Instant clipboard copy for WhatsApp sharing or printing.

5. **Active Homework (RWSH) Tracker with Real-Time Dropdown Sync**
   - Automatically filters out inactive periods (`Nil`, `NIL`, `RWSH - NIL`).
   - Identifies active reinforcement homework (e.g. `RWSH-14,15` due 21/09/2026; Tinkercad Robotics project).
   - Interactive checklist persists completion status locally to `localStorage` (and SQLite when running with backend).
   - **Real-Time Date Dropdown Badging**: Automatically adds/removes `" 📌 HW Due"` badges in the date selector in real time when homework is toggled.
   - Handles double periods seamlessly with unified task counts.

6. **Class Work (CWSH) & 10-Period Daily Timetable**
   - Structured timetable covering Periods 1 through 10.
   - Distinct subject badges (Language Arts, Mathematics, Social Science, Robotics, Kannada, Hindi, SPA, Computers).
   - Displays Class Work done (CWSH, e.g. `CWSH-22`, `24A,B,C & D`) and Assessed Skills (e.g. `Computational fluency`, `Experiential Learning`).

7. **Teacher's Notes & Cleaned Notices**
   - Highlights remarks and guidance from teachers with clean, boilerplate-free formatting.

8. **5-Day Weekly Consolidated Overview**
   - Monday-to-Friday curriculum matrix with disabled future day buttons.
   - Weekly Dictation Word Bank consolidating all vocabulary for weekend revision.
   - Weekly Homework Deadlines list with due dates.

9. **Circulars & Notices Hub**
   - School circulars categorized by Academic, Sports, Events, and Admin.
   - Search filter, clean summaries, and direct links.

10. **Installable Progressive Web App**
   - Installs to a phone or desktop home screen and opens like an app.
   - A service worker pre-caches the shell, so previously loaded updates stay readable without a connection.

11. **Design & Accessibility**
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
│   ├── static_export.py  # Builds the encrypted class bundle + sanitised demo bundle
│   ├── publish.py        # Republishes the class board after a successful sync
│   ├── database.py       # SQLite3 database manager & initial seeding
│   ├── pdf_parser.py     # Multi-engine VIBGYOR timetable PDF parser
│   ├── orion_client.py   # Orion portal client & offline fallback ingest
│   ├── browser_sync.py   # Headless SSO sign-in, PDF & circular capture
│   ├── student_profile.py # Extracts the student profile from the portal
│   └── main.py           # REST API server & static asset host
├── frontend/
│   ├── index.html        # Modern Tailwind parent dashboard
│   ├── app.js            # Client-side reactivity & API / localStorage integration
│   ├── class_data.enc.js # Class content, encrypted with the class passcode
│   ├── static_data.js    # Sanitised sample dataset (the "See a sample" view)
│   ├── style.css         # Custom tokens & rainbow accent strip
│   ├── sw.js             # Service worker: offline shell & asset caching
│   ├── manifest.json     # PWA manifest (installable app)
│   └── icons/            # App and home screen icons
├── sample_data/
│   ├── sample_2026-09-18.pdf
│   ├── sample_2026-09-21.pdf
│   └── captured_notifications.json # Anonymised portal payload used by tests
├── tests/
│   ├── test_pdf_parser.py      # Tests parsing on both sample PDFs
│   ├── test_api.py             # Integration tests for REST endpoints and static assets
│   ├── test_auth.py            # Authentication and session tests
│   ├── test_static_export.py   # What the published board must and must not contain
│   └── test_student_profile.py # Profile extraction from portal pages and APIs
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

Run the complete test suite (72 tests covering PDF extraction, authentication, student profile extraction, published-bundle safety, scheduled-sync log hygiene, and REST APIs):

```bash
./venv/bin/python -m unittest discover -s tests -t .
```

`pytest` also works if you install it (`pip install pytest`), but it is not a dependency:

```bash
./venv/bin/pytest
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
- **Authentication**:
  - A password the portal rejects returns `401` and issues no session token.
  - Credentials that cannot be checked at all (portal unreachable) return `503`, and are likewise refused.
  - Empty credentials return `401`; demo mode signs in without contacting the portal and only ever sees the demo profile.
- **Student profile extraction**:
  - Both portal layouts: `Label : Value` on one line, and a label with its value on the next.
  - The guardians nested beside the student in the profile API never win over the student's own name.
  - Empty form fields rendered as their own captions are not mistaken for values.
  - A failed lookup never overwrites a real profile already stored.

---

## 🤖 Unattended Sync (GitHub Actions)

`.github/workflows/sync.yml` runs a sync without a laptop involved, so the board can
refresh on a schedule rather than whenever someone remembers to press **Sync Now**.

It is **manual only** until a run proves the school portal accepts a sign-in from a
GitHub runner — datacentre IP ranges are often blocked or challenged. Once a run
succeeds, uncomment the `schedule:` block at the top of the workflow.

**Secrets it needs** (Settings → Secrets and variables → Actions). They live on the
`github-pages` environment, which is why the job names that environment — an
environment secret is invisible to a job that does not:

| Secret | Purpose |
| --- | --- |
| `ORION_USERNAME` | Portal username |
| `ORION_PASSWORD` | Portal password |
| `SITE_PASSCODE` | Encrypts the published bundle; only needed when publishing |

Run it from the **Actions** tab. Leave **Republish the board** unticked for a dry
run: it signs in and reports counts without touching what parents can see.

### Why the job prints so little

This repository is public, so its build logs are public. `backend/scheduled_sync.py`
prints counts and status words only, and everything it prints passes through
`redact()`, which strips the credentials and every value scraped from the portal —
including the child's name — from the text first. `tests/test_scheduled_sync.py`
holds that guarantee in place.

### What the board shows

An unattended run reaches far more of the portal's notification feed than a
hurried manual sync ever did, so the published board caps circulars at
`CIRCULAR_WINDOW_DAYS` (60) before the newest class update. The board stays a
current-term noticeboard rather than the school's whole archive, and the local
dashboard is unaffected — it still holds everything. The cutoff is anchored to
the newest class update, not to today, so a board with no new data does not
change shape overnight and force a pointless redeploy.

### Known limit: history

A runner starts with an empty database, so each run rebuilds from whatever the
portal's notification feed still returns. Days that have aged out of that feed are
not recovered, whereas the local database on a laptop keeps accumulating. A dry run
reports how many days it managed to reach, which is the number to watch before
switching the schedule on.

## ⚙️ Configuration (`.env`)

Your Hubble Orion username and password are **not** configured here. You type them
into the app when you sign in; they are used for that request and for a sync you
start in the same session, and are never written to disk or kept by the server.

```ini
ORION_BASE_URL=https://hubbleorion.hubblehox.com
ORION_DOWNLOADS_DIR=
PORT=8000
HOST=0.0.0.0
```
