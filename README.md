# ClassUpdates-Vibgyor

A modern, high-contrast, parent-first dashboard and timetable intelligence pipeline for **VIBGYOR High**.

Specifically tailored for **Grade 1**, this system transforms raw, cryptic daily diary timetable PDFs into clear, actionable daily and weekly updates for busy parents.

---

## 🌐 Live Web App (GitHub Pages)

You can use the live web app directly in your browser without installing anything:

👉 **[https://shamala.github.io/ClassUpdates-Vibgyor/](https://shamala.github.io/ClassUpdates-Vibgyor/)**

It opens on a **class passcode** prompt. Parents of the class enter the passcode
once per device and go straight to the updates — there is no account to create and
no sign-in step. Without the passcode, **"See a sample"** shows the same dashboard
filled with sanitised demo data.

The board refreshes itself daily; see [Unattended Sync](#-unattended-sync-github-actions).

---

## 🔒 Privacy & Data Security Architecture

> [!IMPORTANT]
> **Parents never enter a portal password.** The shared board asks for one thing, the class passcode, and has no sign-in form and no accounts. Each parent's own data — their child's name, their homework ticks, their theme — is held in their own browser and is uploaded nowhere, so no parent can see another's and neither can whoever publishes the board.

### Privacy Safeguards:

1. **Where the Hubble Orion password lives** (there are exactly two places, and one of them stores it):
   - **The published board never asks for one.** A parent enters the class passcode and lands on the updates. The sign-in form is not merely hidden there — the boot path returns before it is ever reached, and GitHub Pages has no server to check a password against anyway.
   - **Running the backend locally**, you type your own credentials into the sign-in form. They are held in memory for that page session so **Sync Now** works without asking again, cleared on sign out, forgotten on reload, and never written to `.env`, to disk or to the database.
   - **The daily unattended sync does store it**, as the `ORION_PASSWORD` secret on the `github-pages` environment. That is unavoidable: signing in to the portal at 14:00 with nobody present means the password has to be readable by something. GitHub encrypts secrets at rest, releases them only to the job that names the environment, and masks them in logs, and `scheduled_sync` redacts them a second time on the way out. If you would rather not make that trade, delete the secret and drop the `schedule:` block from `.github/workflows/sync.yml`; signing in locally and pressing **Sync Now** still works, and the password goes back to living only in your head.

2. **What the published site deliberately does not contain**:
   - No student name, enrolment number, internal ids, parent email or phone number. The published bundle carries only class content.
   - If you set a student name on the published site, it stays in your own browser and is never uploaded.
   - The link alone is not enough to read the class content. The bundle is **encrypted with the class passcode** before it is published, so fetching the data file directly returns ciphertext; the passcode is typed in the parent's browser and only ever used there to derive the key. The published site has no accounts and no sign-in form — the passcode is the whole gate.

3. **100% Client-Side Browser Storage (`localStorage`)**:
   - Everything personal stays in the browser that created it: homework checkmarks (`vibgyor_completed_hw_ids`), the class passcode once accepted (`vibgyor_class_passcode`), the child's name (`vibgyor_parent_student`, `vibgyor_student_for_<user>`), the last signed-in user (`vibgyor_parent_user`), display preference (`theme`) and local session state (`orion_auth_token`).
   - None of it is uploaded, so one parent never sees another's child name or ticks, and none of it reaches the person who publishes the board.
   - Clearing your browser site data wipes all of it, and signing out clears the local session.

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

2. **Updates That Fetch Themselves**
   - A GitHub Actions job signs in to the portal and republishes the board **daily at 14:00 IST**, with no machine of yours switched on. See [Unattended Sync](#-unattended-sync-github-actions).
   - Running locally, signing in also fetches the day's diary, homework and circulars by itself, in the background, so the dashboard is usable within seconds while the portal is read behind it. **Sync Now** is still there for a manual refresh.
   - Locally, no password is stored to make this work: it uses the one you just typed, held in memory for that page session only, so a reload restores your session but not your password.

3. **Hubble Orion Parent Login (local backend only)**
   - Parent authentication against Hubble Orion: the credentials you type are checked by signing in to the portal, and a password it rejects is refused rather than waved through.
   - 1-click **Demo / Sample Mode** to instantly explore the dashboard with pre-seeded data without external credentials.
   - Session management with token authorization and persistent sign-in state.
   - The **published board has none of this**: it is a shared class board behind one passcode, so there is nothing to sign in to.

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
   - Naming the child uses an in-page dialog ("Whose updates are these?"), not the browser's `prompt()`, which stamps the site's hostname across the box and cannot be relabelled.
   - Seamless **Dark Mode & Light Mode** toggle with anti-flicker detection.
   - Expressive, calm typography powered by Google Fonts **Commissioner**.
   - Fully responsive for mobile and desktop screens.

---

## 📁 Repository Structure

```text
ClassUpdates-Vibgyor/
├── .github/
│   └── workflows/
│       ├── deploy.yml    # Publishes frontend/ to GitHub Pages on every push to main
│       └── sync.yml      # Daily unattended Orion sync, publish and deploy
├── scripts/
│   └── inject_analytics.py # Writes the analytics tag in at publish time
├── backend/
│   ├── static_export.py  # Builds the encrypted class bundle + sanitised demo bundle
│   ├── publish.py        # Republishes the class board after a successful sync
│   ├── database.py       # SQLite3 database manager & initial seeding
│   ├── pdf_parser.py     # Multi-engine VIBGYOR timetable PDF parser
│   ├── orion_client.py   # Orion portal client & offline fallback ingest
│   ├── browser_sync.py   # Headless SSO sign-in, PDF & circular capture
│   ├── student_profile.py # Extracts the student profile from the portal
│   ├── scheduled_sync.py # Unattended sync entry point, with public-log redaction
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
│   ├── test_scheduled_sync.py  # Nothing scraped may reach a public build log
│   └── test_student_profile.py # Profile extraction from portal pages and APIs
├── .env.example
├── requirements.txt
├── start.sh
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies

```bash
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python -m playwright install chromium
```

Invoke the tools as `python -m <tool>` rather than `./venv/bin/pip`. A virtual
environment records its own path inside every console script it generates, so
renaming or moving the directory leaves those scripts pointing at a path that no
longer exists; going through the interpreter sidesteps that entirely.

The last line downloads the headless browser that signs in to the portal. Skip it
and the dashboard still runs on seeded sample data — only syncing needs it.

### 2. Launch the Application

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

Run the complete test suite (85 tests covering PDF extraction, authentication, student profile extraction, published-bundle safety, scheduled-sync log hygiene, and REST APIs):

```bash
./venv/bin/python -m unittest discover -s tests -t .
```

`./venv/bin/pytest` runs the same suite — despite the name it is a small wrapper
around `unittest.discover`, so it needs nothing extra installed:

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
- **Published bundle**:
  - No student identity and no completion state survive into the published board.
  - Circulars are capped to the current term, and the cutoff edge is inclusive.
  - SQLite row timestamps are stripped, so a rebuilt database does not look like new content.
- **Unattended sync**:
  - The credentials, the passcode and every scraped value are redacted before anything is printed.
  - A dry run publishes nothing; the step output reports truthfully whether it did.
  - Missing credentials stop the run rather than falling back to anything.
- **Student profile extraction**:
  - Both portal layouts: `Label : Value` on one line, and a label with its value on the next.
  - The guardians nested beside the student in the profile API never win over the student's own name.
  - Empty form fields rendered as their own captions are not mistaken for values.
  - A failed lookup never overwrites a real profile already stored.

---

## 🤖 Unattended Sync (GitHub Actions)

`.github/workflows/sync.yml` runs a sync without a laptop involved, so the board can
refresh on a schedule rather than whenever someone remembers to press **Sync Now**.

It runs **daily at 14:00 IST** (`30 8 * * *`) and can also be started by hand from
the **Actions** tab. GitHub's scheduler is best-effort and often starts several
minutes late, which does not matter for a once-a-day refresh. A repository with no
activity for 60 days has its schedules disabled, so this stops if the project goes
quiet.

A sync that finds nothing new skips the site deployment: `scheduled_sync` reports
whether it published through a step output, and the Pages steps are gated on it.

**Secrets it needs** (Settings → Secrets and variables → Actions). They live on the
`github-pages` environment, which is why the job names that environment — an
environment secret is invisible to a job that does not:

| Secret | Purpose |
| --- | --- |
| `ORION_USERNAME` | Portal username |
| `ORION_PASSWORD` | Portal password |
| `SITE_PASSCODE` | Encrypts the published bundle; only needed when publishing |

A manual run leaves **Republish the board** unticked by default, which is a dry
run: it signs in and reports counts without touching what parents can see. A
scheduled run always publishes.

### Why the job prints so little

This repository is public, so its build logs are public. `backend/scheduled_sync.py`
prints counts and status words only, and everything it prints passes through
`redact()`, which strips the credentials and every value scraped from the portal —
including the child's name — from the text first. `tests/test_scheduled_sync.py`
holds that guarantee in place.

### Why the sync job deploys the site itself

A push made with the workflow's `GITHUB_TOKEN` deliberately does not start
another workflow — GitHub's guard against recursive runs. So the publish commit
lands on `main` and the Pages deploy never fires. The sync job therefore builds
and deploys the site it just produced, rather than waiting for a deploy that
will not come. Both workflows share the `pages` concurrency group so two
deployments cannot collide, and both inject analytics through
`scripts/inject_analytics.py` so the published page cannot differ depending on
which one built it.

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
not recovered, whereas the local database on a laptop keeps accumulating.

In practice this has not bitten: the first unattended runs reproduced all 7 days
held locally (15–23 Sep 2026) and the same 7 current-term circulars. Every run
prints how many days it reached, which is the number to watch. If it ever drops,
the fix is to seed the runner from the published bundle, which already holds the
full history and needs no new secret.

## ⚙️ Configuration (`.env`)

Your Hubble Orion username and password are **not** configured here. You type them
into the app when you sign in; they are used for that request and for a sync you
start in the same session, and are never written to disk or kept by the server.
The daily GitHub Actions sync is the one exception, and it keeps them as
encrypted secrets rather than in this file — see
[Unattended Sync](#-unattended-sync-github-actions).

```ini
ORION_BASE_URL=https://hubbleorion.hubblehox.com
ORION_DOWNLOADS_DIR=~/vibgyor

# The passcode class parents type to open the published board. The class content
# is encrypted with it, so the published file is ciphertext without it. Keep it
# out of the repository; share it with parents directly.
SITE_PASSCODE=
# Republish the board to GitHub Pages after each successful local sync
AUTO_PUBLISH=0

PORT=8000
HOST=0.0.0.0
```

`SITE_PASSCODE` and `AUTO_PUBLISH` only matter when you publish from your own
machine. The daily GitHub Actions run takes the passcode from the repository
secret of the same name and publishes regardless.
