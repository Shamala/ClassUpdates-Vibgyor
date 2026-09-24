# Class Updates — Grade 1

The daily class diary, homework and school circulars for the class, on one page
you can keep on your phone.

---

## Opening the board

👉 **[https://shamala.github.io/ClassUpdates-Vibgyor/](https://shamala.github.io/ClassUpdates-Vibgyor/)**

It asks for the **class passcode**. Enter it once and that device remembers it —
after that the link opens straight on the updates.

The passcode is shared in the class parents' group. Without it, **"See a sample"**
shows exactly how the board looks, filled with made-up data, so you can have a
look before you ask for it.

---

## What's on it

| | |
| --- | --- |
| **Daily Diary** | Each period, what was taught, the class work done and the homework set |
| **Weekly Overview** | Monday to Friday at a glance, with the week's dictation words together in one place |
| **Circulars & Notices** | School circulars, searchable, with clean summaries |

Homework can be ticked off as it gets done. Ticks are yours alone — they stay on
your device, and no other parent sees them.

The dictation words come with **flashcards that read each word aloud**, for
spelling practice without a grown-up having to sit through it.

---

## Making it yours

**Add your child's name.** The board is shared by the whole class, so it doesn't
know whose phone it is on. Tap the name at the top and type theirs in. It is saved
on that device only and is never shared.

**Install it like an app.** Open the link on your phone and choose *Add to Home
Screen*. It opens full screen, and it keeps working without a signal — whatever you
last loaded stays readable on the school run.

**Dark mode** is there if you prefer it.

---

## Staying up to date

The board refreshes itself every afternoon. Under the title is a line telling you
when it was last updated; it turns amber if that was more than a day and a half
ago, so you are never reading stale homework without knowing it.

---

## Your privacy

- The board carries **class content only** — no names, no roll numbers, no contact details.
- Your child's name, your homework ticks and your settings stay **in your own browser**. Nothing is uploaded, so no one else can see them — not other parents, not whoever publishes the board.
- The passcode is not just a screen to get past: **the updates themselves are encrypted with it**. Somebody who has the link but not the passcode gets nothing readable.
- **No tracking cookies and no advertising.** Visits are counted anonymously, with nothing stored on your device and no way to follow a visitor from one day to the next.

---

## Running Locally

### Quick Start
Start the server with the launcher script:

```bash
./start.sh
```

Or directly using Python:

```bash
./venv/bin/python -m backend.main 8000
```

Then open **[http://localhost:8000](http://localhost:8000)** in your browser.

> **Tip**: If port `8000` is already in use, run on another port or terminate the existing process:
> ```bash
> ./venv/bin/python -m backend.main 8080
> # or kill existing: kill $(lsof -t -i :8000)
> ```

### First-Time Setup (New Machine)
```bash
# Set up virtual environment and dependencies
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt

# (Optional) Download Playwright browser for portal sync
./venv/bin/python -m playwright install chromium

# Launch
./start.sh
```

### Rebuilding Styles (Tailwind CSS)
The compiled stylesheet (`frontend/tailwind.css`) is already pre-built and included, so Node.js is **not required** just to run the app. If you modify any utility classes in the HTML/JS:

```bash
npm run build:css    # Rebuild once
npm run watch:css    # Auto-rebuild on file save
```

### Running Tests
```bash
./venv/bin/pytest
# or: ./venv/bin/python -m unittest discover -s tests -t .
```

---

Built for one class; usable by any school that publishes a similar daily diary.
Full technical documentation is in **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.
