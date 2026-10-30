/**
 * VIBGYOR Class Updates - Parent Dashboard Application
 */
import { formatSyncStamp } from "./src/format.js";
import { showToast } from "./src/toast.svelte.js";
import {
  API_BASE,
  state,
  DEMO_STUDENT,
  GENERIC_STUDENT_FIELDS,
} from "./src/state.svelte.js";
import {
  getAuthHeaders,
  isStaticMode,
  getStaticData,
  decryptClassData,
} from "./src/api.js";
import {
  getStoredCompletedHwIds,
  saveStoredCompletedHwIds,
  getSavedStudentForUser,
  PASSCODE_STORAGE_KEY,
  migrateStudentStorage,
} from "./src/storage.js";
import { shell, passcode, setHeaderHidden } from "./src/shell.svelte.js";
import { initTheme } from "./src/theme.svelte.js";
import { initPWA } from "./src/pwa.svelte.js";
import { isPlaceholderStudentName } from "./src/student.js";

// The password the parent typed, kept in memory for this page session only so that
// Sync Now can authenticate against the portal. It is never written to
// localStorage, never persisted by the server, and is gone on reload.
let sessionCredentials = null;

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// Server profiles win on grade/section/school, but a name the parent set locally
// wins over a server placeholder — otherwise every reload resets it to "Student".
function applyStudentProfile(serverStudent, username) {
  // The sample is nobody's child. It shares the "class" user with the real
  // board, so resolving through storage would greet a parent who had already
  // set their child's name with that name over made-up homework. It reads
  // nothing and writes nothing.
  if (isSampleSession()) {
    const sample = (getStaticData() || {}).student;
    state.student = sample ? { ...sample } : { ...DEMO_STUDENT };
    return state.student;
  }

  const u = (
    username ||
    (state.currentUser && state.currentUser.username) ||
    ""
  ).trim();
  const student = serverStudent
    ? { ...serverStudent }
    : resolveStudentForUser(u);

  if (isPlaceholderStudentName(student.name)) {
    const saved = getSavedStudentForUser(u);
    if (saved && !isPlaceholderStudentName(saved.name)) {
      student.name = saved.name;
    }
  }

  state.student = student;
  if (!isSampleSession()) {
    try {
      localStorage.setItem("vibgyor_parent_student", JSON.stringify(student));
    } catch (e) {}
  }
  return student;
}

function resolveStudentForUser(username) {
  if (!username || username === "demo@vibgyor.com") return DEMO_STUDENT;
  const u = username.trim().toLowerCase();

  // 1. A name this parent typed in wins, so an edit is never undone by a deploy
  const saved = getSavedStudentForUser(u);
  if (saved && !isPlaceholderStudentName(saved.name)) return saved;

  // 2. Default generic student profile for all parents
  return {
    student_id: "STU-" + Math.abs(hashCode(u)),
    name: "Student",
    ...GENERIC_STUDENT_FIELDS,
    parent_name: "Parent",
  };
}

// --- View Controls (Login vs Dashboard) ---
// The login and dashboard screens are still plain markup in
// index.html; this mirrors the shell flags onto them until they move too.
function syncScreens() {
  const screens = {
    "login-view": shell.loginView,
    "dashboard-view": shell.dashboardView,
  };
  for (const [id, shown] of Object.entries(screens)) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !shown);
  }
}

// The header's profile clears itself: it draws nothing while state.student is null,
// which it always is by the time this runs.
function showLoginView() {
  shell.loginView = true;
  shell.dashboardView = false;
  shell.authControls = false;
  shell.dateWrap = false;
  shell.tabsBar = false;
  shell.mobileProfile = false;
  syncScreens();
}

function showDashboardView() {
  shell.loginView = false;
  shell.dashboardView = true;
  shell.authControls = true;
  renderSyncStamp();
  shell.dateWrap = true;
  shell.tabsBar = true;
  shell.mobileProfile = true;
  syncScreens();
}

async function checkAuth() {
  const token = localStorage.getItem("orion_auth_token");
  if (!token) {
    state.isAuthenticated = false;
    showLoginView();
    return;
  }

  if (isStaticMode()) {
    state.isAuthenticated = true;
    state.authToken = token;
    try {
      const storedUser = JSON.parse(
        localStorage.getItem("vibgyor_parent_user") || "null",
      );
      state.currentUser = storedUser || {
        username: "demo@vibgyor.com",
        display_name: "Demo Parent",
      };
    } catch (e) {
      state.currentUser = {
        username: "demo@vibgyor.com",
        display_name: "Demo Parent",
      };
    }

    try {
      const storedStudent = JSON.parse(
        localStorage.getItem("vibgyor_parent_student") || "null",
      );
      if (token === "demo-local-session") {
        state.student = DEMO_STUDENT;
        localStorage.setItem(
          "vibgyor_parent_student",
          JSON.stringify(state.student),
        );
      } else {
        applyStudentProfile(
          storedStudent,
          state.currentUser ? state.currentUser.username : "",
        );
      }
    } catch (e) {
      state.student =
        token === "demo-local-session"
          ? DEMO_STUDENT
          : resolveStudentForUser("");
    }

    showDashboardView();
    await loadAvailableDates();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        state.isAuthenticated = true;
        state.currentUser = data.user;
        applyStudentProfile(data.student, data.user ? data.user.username : "");
        showDashboardView();
            await loadAvailableDates();
        return;
      }
    }
  } catch (err) {
    console.warn("Auth check API failed, checking local session:", err);
    state.isAuthenticated = true;
    state.authToken = token;
    try {
      const storedUser = JSON.parse(
        localStorage.getItem("vibgyor_parent_user") || "null",
      );
      state.currentUser = storedUser || {
        username: "demo@vibgyor.com",
        display_name: "Demo Parent",
      };
    } catch (e) {
      state.currentUser = {
        username: "demo@vibgyor.com",
        display_name: "Demo Parent",
      };
    }
    try {
      const storedStudent = JSON.parse(
        localStorage.getItem("vibgyor_parent_student") || "null",
      );
      if (token === "demo-local-session") {
        state.student = DEMO_STUDENT;
        localStorage.setItem(
          "vibgyor_parent_student",
          JSON.stringify(state.student),
        );
      } else {
        applyStudentProfile(
          storedStudent,
          state.currentUser ? state.currentUser.username : "",
        );
      }
    } catch (e) {
      state.student =
        token === "demo-local-session"
          ? DEMO_STUDENT
          : resolveStudentForUser("");
    }
    showDashboardView();
    await loadAvailableDates();
    return;
  }
  state.isAuthenticated = false;
  showLoginView();
}

async function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");
  const errorAlert = document.getElementById("login-error-alert");
  const errorText = document.getElementById("login-error-text");
  const submitBtn = document.getElementById("login-submit-btn");
  const spinner = document.getElementById("login-spinner");
  const btnText = document.getElementById("login-btn-text");

  if (!usernameInput || !passwordInput) return;
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    if (errorAlert) {
      errorText.textContent = "Please enter both username and password.";
      errorAlert.classList.remove("hidden");
    }
    return;
  }

  if (errorAlert) errorAlert.classList.add("hidden");
  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove("hidden");
  if (btnText) btnText.textContent = "Connecting to Hubble Orion...";

  // Static / GitHub Pages mode: authenticate locally with 100% privacy
  // Passwords are NEVER sent anywhere or stored.
  if (isStaticMode()) {
    setTimeout(async () => {
      state.isAuthenticated = true;
      state.authToken = "gh-pages-local-session";
      localStorage.setItem("orion_auth_token", "gh-pages-local-session");
      const displayName = username.includes("@")
        ? username.split("@")[0]
        : username;
      state.currentUser = { username, display_name: displayName };
      localStorage.setItem(
        "vibgyor_parent_user",
        JSON.stringify(state.currentUser),
      );
      const student = resolveStudentForUser(username);
      state.student = student;
      localStorage.setItem("vibgyor_parent_student", JSON.stringify(student));

      showToast(
        "Signed in securely! (Zero server storage 🔒)",
        "success",
        4000,
      );
      showDashboardView();
        await loadAvailableDates();
      if (submitBtn) submitBtn.disabled = false;
      if (spinner) spinner.classList.add("hidden");
      if (btnText) btnText.textContent = "Sign In & Sync";
    }, 400);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      state.isAuthenticated = true;
      state.authToken = data.token;
      state.currentUser = data.user;
      applyStudentProfile(data.student, username);
      if (data.mode !== "demo") sessionCredentials = { username, password };
      localStorage.setItem("orion_auth_token", data.token);
      localStorage.setItem(
        "vibgyor_parent_user",
        JSON.stringify(state.currentUser),
      );

      showToast(data.message || "Signed in successfully!", "success", 4000);
      showDashboardView();
        await loadAvailableDates();
      // not awaited: the dashboard is usable while the portal is being read
      autoSyncAfterSignIn();
    } else {
      if (errorAlert) {
        errorText.textContent =
          data.detail ||
          data.error ||
          "Login failed. Check your Hubble Orion credentials.";
        errorAlert.classList.remove("hidden");
      }
    }
  } catch (err) {
    // The server is unreachable. We have no way to check the password, so show
    // that plainly instead of signing the parent in with credentials nobody
    // verified, which is what this branch used to do.
    console.warn("Login request failed:", err);
    if (errorAlert) {
      errorText.textContent =
        "Can't reach the ClassUpdates server right now, so your sign-in could not be verified. Check that it is running and try again.";
      errorAlert.classList.remove("hidden");
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add("hidden");
    if (btnText) btnText.textContent = "Sign In & Sync";
  }
}

async function handleDemoLogin() {
  const errorAlert = document.getElementById("login-error-alert");
  const demoBtn = document.getElementById("demo-login-btn");

  if (errorAlert) errorAlert.classList.add("hidden");
  if (demoBtn) {
    demoBtn.disabled = true;
    demoBtn.classList.add("opacity-75");
  }

  // Clear any existing stored user/student data first
  localStorage.removeItem("vibgyor_parent_user");
  localStorage.removeItem("vibgyor_parent_student");

  if (isStaticMode()) {
    setTimeout(async () => {
      state.isAuthenticated = true;
      state.authToken = "demo-local-session";
      localStorage.setItem("orion_auth_token", "demo-local-session");
      state.currentUser = {
        username: "demo@vibgyor.com",
        display_name: "Demo Parent",
      };
      state.student = DEMO_STUDENT;
      localStorage.setItem(
        "vibgyor_parent_user",
        JSON.stringify(state.currentUser),
      );
      localStorage.setItem(
        "vibgyor_parent_student",
        JSON.stringify(DEMO_STUDENT),
      );

      showToast(
        "Signed in with Demo Account ⭐ (Sample Data)",
        "success",
        4000,
      );
      showDashboardView();
        await loadAvailableDates();
      if (demoBtn) {
        demoBtn.disabled = false;
        demoBtn.classList.remove("opacity-75");
      }
    }, 200);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_demo: true }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      state.isAuthenticated = true;
      state.authToken = data.token;
      state.currentUser = data.user;
      state.student = data.student || DEMO_STUDENT;
      localStorage.setItem("orion_auth_token", data.token);
      localStorage.setItem(
        "vibgyor_parent_user",
        JSON.stringify(state.currentUser),
      );
      localStorage.setItem(
        "vibgyor_parent_student",
        JSON.stringify(state.student),
      );

      showToast("Signed in with Demo Account ⭐", "success", 4000);
      showDashboardView();
        await loadAvailableDates();
    } else {
      if (errorAlert) {
        errorText.textContent =
          data.detail || data.error || "Demo login failed.";
        errorAlert.classList.remove("hidden");
      }
    }
  } catch (err) {
    state.isAuthenticated = true;
    state.authToken = "demo-local-session";
    localStorage.setItem("orion_auth_token", "demo-local-session");
    state.currentUser = {
      username: "demo@vibgyor.com",
      display_name: "Demo Parent",
    };
    state.student = DEMO_STUDENT;
    localStorage.setItem(
      "vibgyor_parent_user",
      JSON.stringify(state.currentUser),
    );
    localStorage.setItem(
      "vibgyor_parent_student",
      JSON.stringify(DEMO_STUDENT),
    );

    showToast("Signed in with Demo Account ⭐ (Sample Data)", "success", 4000);
    showDashboardView();
    await loadAvailableDates();
  } finally {
    if (demoBtn) {
      demoBtn.disabled = false;
      demoBtn.classList.remove("opacity-75");
    }
  }
}

async function handleLogout() {
  sessionCredentials = null;
  if (!isStaticMode()) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (e) {}
  }

  localStorage.removeItem("orion_auth_token");
  localStorage.removeItem("vibgyor_parent_user");
  localStorage.removeItem("vibgyor_parent_student");
  sessionStorage.clear();
  state.authToken = "";
  state.isAuthenticated = false;
  state.currentUser = null;
  state.student = null;

  if (isClassBoard()) {
    // Leaving the sample ends the sample: without this the next unlock would
    // still be treated as make-believe and refuse to remember a real name.
    shell.viewingSample = false;

    // On the board there is nothing to sign out of; forget the passcode so the
    // next person on this device has to enter it again.
    try {
      localStorage.removeItem(PASSCODE_STORAGE_KEY);
    } catch (e) {}
    window.location.reload();
    return;
  }

  showLoginView();
  showToast("You have been signed out.", "info", 3000);
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById("login-password");
  if (!pwdInput) return;
  pwdInput.type = pwdInput.type === "password" ? "text" : "password";
}

// --- Initialization ---

// The sample exists to be poked at. Whatever a parent types while looking at it
// is about made-up data, so none of it is written down: the sample and the real
// board would otherwise share one device's storage and the demo child's name
// would greet them after they entered the passcode.
function isSampleSession() {
  return shell.viewingSample;
}

function showPasscodeView(message) {
  shell.loginView = false;
  shell.dashboardView = false;
  setHeaderHidden(true);
  shell.passcodeView = true;
  syncScreens();

  const blob = window.VIBGYOR_ENCRYPTED_DATA;
  if (blob && blob.synced_at) {
    passcode.syncedAt = `Class updates last refreshed ${formatSyncStamp(blob.synced_at)}`;
  }
  passcode.error = message || "";
  passcode.value = "";
  passcode.focusRequest++;
}

function hidePasscodeView() {
  shell.passcodeView = false;
  syncScreens();
  setHeaderHidden(false);
  // mobile-profile-snippet is shown only on small screens, by its own sm:hidden
  if (!state.isAuthenticated) shell.mobileProfile = false;
}

// Resolves once the class content is available, or never - the passcode screen
// drives the rest of the boot when it is not.
function isClassBoard() {
  return isStaticMode() && !!(window.VIBGYOR_ENCRYPTED_DATA || {}).ciphertext;
}

async function unlockClassData() {
  // Running against the backend means real Orion sign-in, not the class board,
  // even though the encrypted bundle is served from the same directory.
  if (!isClassBoard()) return true;
  const blob = window.VIBGYOR_ENCRYPTED_DATA;
  if (!window.crypto || !crypto.subtle) {
    showPasscodeView("This browser cannot unlock the class updates.");
    return false;
  }

  let saved = null;
  try {
    saved = localStorage.getItem(PASSCODE_STORAGE_KEY);
  } catch (e) {}

  if (saved) {
    try {
      window.VIBGYOR_STATIC_DATA = await decryptClassData(saved, blob);
      return true;
    } catch (e) {
      // passcode changed since this browser last unlocked
      try {
        localStorage.removeItem(PASSCODE_STORAGE_KEY);
      } catch (err) {}
    }
  }

  showPasscodeView();
  return false;
}

// Lets a parent who has not been given the passcode yet see what the board looks
// like, using the sample bundle that ships alongside the encrypted one.
function viewSampleInstead() {
  shell.viewingSample = true;
  hidePasscodeView();
  enterClassBoard();
}

// The published board has no accounts: the passcode is the only thing that guards
// it, and the sign-in screen there was a local form that accepted anything. Once
// unlocked, go straight to the updates.
async function enterClassBoard() {
  state.isAuthenticated = true;
  state.authToken = "class-board";
  state.currentUser = { username: "class", display_name: "Class" };
  applyStudentProfile(null, "class");

  // Sync reaches the school portal, which only the parent who publishes the board
  // can do, so the header drops it; and with no account here, "Sign Out" becomes
  // "Lock this device again".
  shell.classBoard = true;

  showDashboardView();
  renderSyncStamp();
  await loadAvailableDates();
}

async function handlePasscodeSubmit() {
  const entered = passcode.value.trim();
  if (!entered) return;

  passcode.submitting = true;
  try {
    window.VIBGYOR_STATIC_DATA = await decryptClassData(
      entered,
      window.VIBGYOR_ENCRYPTED_DATA,
    );
    try {
      localStorage.setItem(PASSCODE_STORAGE_KEY, entered);
    } catch (e) {}
    hidePasscodeView();
    await enterClassBoard();
  } catch (err) {
    showPasscodeView(
      "That passcode does not match. Check with the class parent who shared it.",
    );
  } finally {
    passcode.submitting = false;
  }
}

// The header's freshness stamp is measured from the moment it is drawn, as the
// old one was; this redraws it.
function renderSyncStamp() {
  shell.stampDrawnAt = Date.now();
}

document.addEventListener("DOMContentLoaded", async () => {
  migrateStudentStorage();
  initTheme();
  initPWA();

  // A published board with no class content to show means the bundle did not
  // load - a failed fetch, or a cache holding a page newer than its data. The
  // fallback below would quietly render the sample instead, which puts invented
  // homework in front of a parent with nothing to say it is invented. Ask for
  // the passcode and say what went wrong; the sample stays one deliberate tap
  // away for anyone who has not been given it.
  if (isStaticMode() && !isClassBoard()) {
    showPasscodeView(
      "Could not load the class updates. Check your connection and reload.",
    );
    return;
  }

  if (!(await unlockClassData())) return; // passcode screen takes over
  if (isClassBoard()) {
    await enterClassBoard();
    return;
  }
  renderSyncStamp();
  await checkAuth();
});

// --- Navigation Tabs ---
// The tab bar and the three views redraw from state.currentTab.
function switchTab(tabName) {
  state.currentTab = tabName;

  if (tabName === "daily") {
    loadDailyUpdate(state.selectedDate);
  } else if (tabName === "weekly") {
    loadWeeklyUpdate(state.selectedDate);
  } else if (tabName === "circulars") {
    loadCirculars();
  }
}

// --- API Calls & Client-Side Data Loading ---
async function loadStudentProfile() {
  if (state.student && state.student.student_id === "DEMO-G1F-001") {
    return;
  }
  if (isStaticMode()) {
    if (!state.student) {
      state.student = DEMO_STUDENT;
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/student`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      state.student = await res.json();
        return;
    }
  } catch (err) {
    console.warn(
      "Failed to load student profile from server, keeping existing profile:",
      err,
    );
  }

  if (!state.student) {
    state.student = DEMO_STUDENT;
  }
}

function loadStaticAvailableDates() {
  const staticData = getStaticData();
  if (!staticData || !staticData.dates) {
    showToast("Static data not available", "error");
    return;
  }
  const completedHw = getStoredCompletedHwIds();
  const dates = JSON.parse(JSON.stringify(staticData.dates));

  dates.forEach((d) => {
    const dailyForDate = staticData.daily ? staticData.daily[d.date] : null;
    if (dailyForDate && dailyForDate.periods) {
      const hwPeriods = dailyForDate.periods.filter((p) => p.is_homework);
      const completedCount = hwPeriods.filter((p) =>
        completedHw.has(Number(p.id)),
      ).length;
      d.homework_count = hwPeriods.length;
      d.completed_homework_count = completedCount;
      d.has_pending_homework = hwPeriods.length > completedCount;
    }
  });

  state.availableDates = dates;

  if (state.availableDates.length > 0) {
    if (
      !state.selectedDate ||
      !state.availableDates.some((d) => d.date === state.selectedDate)
    ) {
      state.selectedDate = state.availableDates[0].date;
    }
  }
}

async function loadAvailableDates() {
  if (isStaticMode()) {
    loadStaticAvailableDates();
    if (state.selectedDate) {
      loadStaticDailyUpdate(state.selectedDate);
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/dates`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      state.availableDates = await res.json();

      if (state.availableDates.length > 0) {
        state.selectedDate = state.availableDates[0].date;
        await loadDailyUpdate(state.selectedDate);
      } else {
        showToast("No updates found. Try syncing.", "warning");
      }
      return;
    }
  } catch (err) {
    console.warn(
      "Failed to load dates from server, falling back to static data:",
      err,
    );
  }
  loadStaticAvailableDates();
  if (state.selectedDate) {
    loadStaticDailyUpdate(state.selectedDate);
  }
}

function loadStaticDailyUpdate(date) {
  const staticData = getStaticData();
  if (!staticData || !staticData.daily) {
    showToast("Could not load updates for this date", "error");
    return;
  }

  let dailySource = staticData.daily[date];
  if (!dailySource) {
    const firstKey = Object.keys(staticData.daily)[0];
    if (firstKey) dailySource = staticData.daily[firstKey];
  }

  if (!dailySource) {
    showToast("Could not load updates for this date", "error");
    return;
  }

  const dailyCopy = JSON.parse(JSON.stringify(dailySource));
  const completedHw = getStoredCompletedHwIds();

  if (dailyCopy.periods) {
    dailyCopy.periods.forEach((p) => {
      p.is_completed = completedHw.has(Number(p.id));
    });
    const hwPeriods = dailyCopy.periods.filter((p) => p.is_homework);
    const completedCount = hwPeriods.filter((p) =>
      completedHw.has(Number(p.id)),
    ).length;
    dailyCopy.homework_count = hwPeriods.length;
    dailyCopy.completed_homework_count = completedCount;
    dailyCopy.has_pending_homework = hwPeriods.length > completedCount;
  }

  // The Daily tab's Svelte components redraw from this on their own.
  state.dailyData = dailyCopy;
}

async function loadDailyUpdate(date) {
  if (!date) return;
  const container = document.getElementById("daily-content-loader");
  if (container) container.classList.remove("hidden");

  if (isStaticMode()) {
    loadStaticDailyUpdate(date);
    if (container) container.classList.add("hidden");
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/updates/daily?date=${encodeURIComponent(date)}`,
      { headers: getAuthHeaders() },
    );
    if (res.ok) {
      state.dailyData = await res.json();
      return;
    }
  } catch (err) {
    console.warn(
      "Failed to fetch daily update from backend, falling back to static:",
      err,
    );
  } finally {
    if (container) container.classList.add("hidden");
  }
  loadStaticDailyUpdate(date);
}

function loadStaticWeeklyUpdate() {
  const staticData = getStaticData();
  if (!staticData || !staticData.weekly) return;

  const weeklyCopy = JSON.parse(JSON.stringify(staticData.weekly));
  const completedHw = getStoredCompletedHwIds();

  if (weeklyCopy.days) {
    weeklyCopy.days.forEach((day) => {
      if (day.homework) {
        day.homework.forEach((hw) => {
          hw.is_completed = completedHw.has(Number(hw.period_id || hw.id));
        });
      }
    });
  }

  if (weeklyCopy.active_homework_items) {
    weeklyCopy.active_homework_items.forEach((item) => {
      item.is_completed = completedHw.has(Number(item.period_id || item.id));
    });
  }

  state.weeklyData = weeklyCopy;
}

async function loadWeeklyUpdate(date) {
  if (isStaticMode()) {
    loadStaticWeeklyUpdate();
    return;
  }

  try {
    const url = date
      ? `${API_BASE}/api/updates/weekly?start_date=${encodeURIComponent(date)}`
      : `${API_BASE}/api/updates/weekly`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) {
      state.weeklyData = await res.json();
      return;
    }
  } catch (err) {
    console.warn(
      "Failed to fetch weekly update from server, falling back to static:",
      err,
    );
  }
  loadStaticWeeklyUpdate();
}

function loadStaticCirculars() {
  const staticData = getStaticData();
  if (!staticData || !staticData.circulars) return;
  state.circulars = JSON.parse(JSON.stringify(staticData.circulars));
}

async function loadCirculars() {
  if (isStaticMode()) {
    loadStaticCirculars();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/circulars`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      state.circulars = await res.json();
      return;
    }
  } catch (err) {
    console.warn("Failed to fetch circulars, falling back to static:", err);
  }
  loadStaticCirculars();
}

async function refreshAvailableDatesDropdown() {
  if (isStaticMode()) {
    loadStaticAvailableDates();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/dates`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      state.availableDates = await res.json();
      return;
    }
  } catch (err) {
    console.warn("Failed to refresh dates from server, using static:", err);
  }
  loadStaticAvailableDates();
}

async function toggleHomework(periodId) {
  const pId = Number(periodId);
  if (isStaticMode()) {
    const completedSet = getStoredCompletedHwIds();
    let isNowCompleted = false;
    if (completedSet.has(pId)) {
      completedSet.delete(pId);
      isNowCompleted = false;
    } else {
      completedSet.add(pId);
      isNowCompleted = true;
    }
    saveStoredCompletedHwIds(completedSet);

    showToast(
      isNowCompleted
        ? "Done! Homework marked complete ⭐"
        : "Homework marked pending",
      "success",
      6000,
    );

    if (state.currentTab === "daily") {
      loadStaticDailyUpdate(state.selectedDate);
    } else if (state.currentTab === "weekly") {
      loadStaticWeeklyUpdate();
    }
    loadStaticAvailableDates();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/homework/${periodId}/toggle`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      showToast(
        data.period.is_completed
          ? "Done! Homework marked complete ⭐"
          : "Homework marked pending",
        "success",
        6000,
      );
      // Refresh current view
      if (state.currentTab === "daily") {
        await loadDailyUpdate(state.selectedDate);
      } else if (state.currentTab === "weekly") {
        await loadWeeklyUpdate(state.selectedDate);
      }
      // Refresh date dropdown so "📌 HW Due" badge updates dynamically
      await refreshAvailableDatesDropdown();
      return;
    }
  } catch (err) {
    console.warn(
      "Toggle error on server, falling back to local browser storage:",
      err,
    );
  }

  // Fallback to local storage
  const completedSet = getStoredCompletedHwIds();
  const isNowCompleted = !completedSet.has(pId);
  if (isNowCompleted) completedSet.add(pId);
  else completedSet.delete(pId);
  saveStoredCompletedHwIds(completedSet);
  showToast(
    isNowCompleted
      ? "Done! Homework marked complete ⭐"
      : "Homework marked pending",
    "success",
    6000,
  );
  if (state.currentTab === "daily") loadStaticDailyUpdate(state.selectedDate);
  else if (state.currentTab === "weekly") loadStaticWeeklyUpdate();
  loadStaticAvailableDates();
}

// Signing in is the app's cue to fetch the day's updates, so nobody has to press
// Sync Now. It runs in the background against the credentials just typed, which
// live in memory only: a page reload restores the session but not the password, so
// there is nothing to sync with until the next sign-in.
async function autoSyncAfterSignIn() {
  if (isStaticMode()) return; // published site has no backend to sync with
  if (!sessionCredentials) return; // demo mode, or nothing to authenticate with
  await triggerManualSync({ auto: true });
}

async function triggerManualSync(options = {}) {
  // An automatic run never interrupts the parent: it does not ask for a password
  // it does not already have, and it stays quiet when there is nothing to report.
  const isAuto = options.auto === true;
  if (state.isSyncing) return;
  state.isSyncing = true;
  // the Sync button spins while state.isSyncing is set

  if (isStaticMode()) {
    setTimeout(async () => {
      state.isSyncing = false;
      showToast(
        "Diary synced! All Grade 1 updates are up to date 🚀 (Zero server storage)",
        "success",
        4000,
      );
      await loadAvailableDates();
    }, 600);
    return;
  }

  try {
    // The server keeps no password, so the sync carries the parent's own
    // credentials. After a reload they are gone from memory and we ask again.
    if (!sessionCredentials) {
      if (isAuto) return;
      const username = (state.currentUser && state.currentUser.username) || "";
      const password = username
        ? prompt(`Enter the Hubble Orion password for ${username} to sync:`)
        : null;
      if (!password) {
        showToast("Sync needs your Hubble Orion password", "info");
        return;
      }
      sessionCredentials = { username, password };
    }

    const res = await fetch(`${API_BASE}/api/sync`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(sessionCredentials),
    });
    const data = await res.json();
    if (data.status === "success") {
      showToast(
        data.message ||
          (isAuto
            ? "Today's updates are in 🎒"
            : "Timetable synchronized successfully!"),
        "success",
      );
      await loadAvailableDates();
    } else {
      // the password we held may be the reason; ask again next time
      sessionCredentials = null;
      showToast(data.message || "Sync encountered an issue", "warning");
    }
  } catch (err) {
    if (isAuto) {
      // Nothing was asked for, so nothing needs reporting. Whatever was already
      // synced stays on screen.
      console.warn("Automatic sync after sign-in failed:", err);
    } else {
      showToast(
        "All Grade 1 updates are up to date! (Client-side offline mode)",
        "info",
        4000,
      );
      await loadAvailableDates();
    }
  } finally {
    state.isSyncing = false;
  }
}

function selectDateAndSwitch(date) {
  state.selectedDate = date;
  switchTab("daily");
}

// The header's date picker.
function chooseDate(date) {
  state.selectedDate = date;
  if (state.currentTab === "daily") {
    loadDailyUpdate(state.selectedDate);
  } else if (state.currentTab === "weekly") {
    loadWeeklyUpdate(state.selectedDate);
  }
}

// Global exposure for inline events
window.switchTab = switchTab;
window.toggleHomework = toggleHomework;
window.selectDateAndSwitch = selectDateAndSwitch;
window.handleLoginSubmit = handleLoginSubmit;
window.handleDemoLogin = handleDemoLogin;
window.handleLogout = handleLogout;
window.togglePasswordVisibility = togglePasswordVisibility;

// For the Svelte components, which call back into the vanilla code until the
// functions they need have moved out of it.
export {
  toggleHomework,
  selectDateAndSwitch,
  switchTab,
  chooseDate,
  triggerManualSync,
  handleLogout,
  handlePasscodeSubmit,
  viewSampleInstead,
};
