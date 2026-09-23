/**
 * VIBGYOR Class Updates - Parent Dashboard Application
 */

const API_BASE = "";
const ORION_APP_URL = "https://hubbleorion.hubblehox.com/";

// Application State
const state = {
  currentTab: "daily",
  selectedDate: null,
  availableDates: [],
  student: null,
  dailyData: null,
  weeklyData: null,
  circulars: [],
  selectedCircularCategory: "all",
  circularSearchTerm: "",
  isSyncing: false,
  isAuthenticated: false,
  authToken: localStorage.getItem("orion_auth_token") || "",
  currentUser: null,
};

const wordModalState = {
  mode: "bank", // 'bank' or 'drill'
  drillIndex: 0,
  drillWords: [],
  isWordHidden: false,
  collapsedWeeks: {}, // mondayKey: boolean
};

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (state.authToken) {
    headers["Authorization"] = `Bearer ${state.authToken}`;
  }
  return headers;
}

// --- Client-Side Static Mode Helpers (for GitHub Pages & Offline Use) ---
function isStaticMode() {
  return (
    window.location.hostname.endsWith("github.io") ||
    window.location.protocol === "file:" ||
    Boolean(window.__FORCE_STATIC_MODE)
  );
}

function getStaticData() {
  return window.VIBGYOR_STATIC_DATA || null;
}

function getStoredCompletedHwIds() {
  try {
    const raw = localStorage.getItem("vibgyor_completed_hw_ids");
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(arr.map(Number));
  } catch (e) {
    return new Set();
  }
}

function saveStoredCompletedHwIds(set) {
  try {
    localStorage.setItem(
      "vibgyor_completed_hw_ids",
      JSON.stringify(Array.from(set)),
    );
  } catch (e) {}
}

// --- Theme Management (Dark / Light Mode) ---
function initTheme() {
  const theme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (!theme && prefersDark);

  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  updateThemeToggleIcon(isDark);

  // Listen for system preference changes when no explicit override is stored
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) {
        if (e.matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        updateThemeToggleIcon(e.matches);
      }
    });

  const themeBtn = document.getElementById("theme-toggle-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeToggleIcon(isDark);
  showToast(
    isDark ? "Dark mode activated 🌙" : "Light mode activated ☀️",
    "info",
  );
}

function updateThemeToggleIcon(isDark) {
  const sunIcon = document.getElementById("theme-sun-icon");
  const moonIcon = document.getElementById("theme-moon-icon");
  const themeBtn = document.getElementById("theme-toggle-btn");

  if (sunIcon && moonIcon) {
    if (isDark) {
      sunIcon.classList.remove("hidden");
      moonIcon.classList.add("hidden");
      if (themeBtn) themeBtn.title = "Switch to Light Mode";
    } else {
      sunIcon.classList.add("hidden");
      moonIcon.classList.remove("hidden");
      if (themeBtn) themeBtn.title = "Switch to Dark Mode";
    }
  }
}

const DEMO_STUDENT = {
  id: 1,
  student_id: "DEMO-G1F-001",
  name: "Demo Student",
  grade: "Grade 1",
  section: "F",
  school: "VIBGYOR High (Demo)",
  academic_year: "2026 - 27",
  roll_no: "01",
  parent_name: "Demo Parent",
};

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// The backend/PDF sync only knows the real child's name when the Orion scrape
// succeeds; otherwise it hands back one of these placeholders, which must never
// be shown as if it were a name, nor overwrite a name the parent typed in.
function isPlaceholderStudentName(name) {
  if (!name) return true;
  const n = String(name).trim().toLowerCase();
  if (!n || n === "student" || n === "n/a" || n === "-") return true;
  return n.includes("'s ward");
}

function getSavedStudentForUser(username) {
  const u = (username || "").trim().toLowerCase();
  if (!u) return null;
  try {
    const saved = localStorage.getItem("vibgyor_student_for_" + u);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed && parsed.name ? parsed : null;
  } catch (e) {
    return null;
  }
}

// Server profiles win on grade/section/school, but a name the parent set locally
// wins over a server placeholder — otherwise every reload resets it to "Student".
function applyStudentProfile(serverStudent, username) {
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
  try {
    localStorage.setItem("vibgyor_parent_student", JSON.stringify(student));
  } catch (e) {}
  return student;
}

function resolveStudentForUser(username) {
  if (!username || username === "demo@vibgyor.com") return DEMO_STUDENT;
  const u = username.trim().toLowerCase();

  // 1. Check if user previously saved their child's name in localStorage
  const saved = getSavedStudentForUser(u);
  if (saved && !isPlaceholderStudentName(saved.name)) return saved;

  // 2. Default generic student profile for all parents
  return {
    student_id: "STU-" + Math.abs(hashCode(u)),
    name: "Student",
    grade: "Grade 1",
    section: "F",
    school: "VIBGYOR High",
    academic_year: "2026 - 27",
    parent_name: "Parent",
  };
}

function editStudentName() {
  if (
    !state.isAuthenticated ||
    (state.student && state.student.student_id === "DEMO-G1F-001")
  ) {
    return;
  }
  const currentName = state.student ? state.student.name : "";
  const placeholder = isPlaceholderStudentName(currentName) ? "" : currentName;
  const newName = prompt("Enter child / student name:", placeholder);
  if (newName && newName.trim() && newName.trim() !== currentName) {
    // Match the backend's capitalisation so a typed name and a synced one look alike
    state.student.name = newName
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    if (state.currentUser && state.currentUser.username) {
      localStorage.setItem(
        "vibgyor_student_for_" + state.currentUser.username.toLowerCase(),
        JSON.stringify(state.student),
      );
    }
    localStorage.setItem(
      "vibgyor_parent_student",
      JSON.stringify(state.student),
    );
    renderStudentProfile();
    showToast(
      `Updated student name to ${state.student.name} ⭐`,
      "success",
      3000,
    );
  }
}

// --- View Controls (Login vs Dashboard) ---
function showLoginView() {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const authControls = document.getElementById("authenticated-controls");
  const dateWrap = document.getElementById("date-select-wrap");
  const tabsBar = document.getElementById("tabs-bar");
  const mobSnippet = document.getElementById("mobile-profile-snippet");
  const mobName = document.getElementById("mobile-student-name");
  const mobMeta = document.getElementById("mobile-student-meta");
  const deskName = document.getElementById("student-name");
  const deskMeta = document.getElementById("student-meta");
  const deskAvatar = document.getElementById("student-avatar");

  if (loginView) loginView.classList.remove("hidden");
  if (dashboardView) dashboardView.classList.add("hidden");
  if (authControls) authControls.classList.add("hidden");
  if (dateWrap) dateWrap.classList.add("hidden");
  if (tabsBar) tabsBar.classList.add("hidden");
  if (mobSnippet) mobSnippet.classList.add("hidden");
  if (mobName) mobName.textContent = "";
  if (mobMeta) mobMeta.textContent = "";
  if (deskName) deskName.textContent = "";
  if (deskMeta) deskMeta.textContent = "";
  if (deskAvatar) deskAvatar.textContent = "--";
}

function showDashboardView() {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const authControls = document.getElementById("authenticated-controls");
  const dateWrap = document.getElementById("date-select-wrap");
  const tabsBar = document.getElementById("tabs-bar");
  const mobSnippet = document.getElementById("mobile-profile-snippet");

  if (loginView) loginView.classList.add("hidden");
  if (dashboardView) dashboardView.classList.remove("hidden");
  if (authControls) authControls.classList.remove("hidden");
  if (dateWrap) dateWrap.classList.remove("hidden");
  if (tabsBar) tabsBar.classList.remove("hidden");
  if (mobSnippet) mobSnippet.classList.remove("hidden");
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
    renderStudentProfile();
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
        applyStudentProfile(
          data.student,
          data.user ? data.user.username : "",
        );
        showDashboardView();
        renderStudentProfile();
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
    renderStudentProfile();
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
      renderStudentProfile();
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
      localStorage.setItem("orion_auth_token", data.token);
      localStorage.setItem(
        "vibgyor_parent_user",
        JSON.stringify(state.currentUser),
      );

      showToast(data.message || "Signed in successfully!", "success", 4000);
      showDashboardView();
      renderStudentProfile();
      await loadAvailableDates();
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
    const displayName = username.includes("@")
      ? username.split("@")[0]
      : username;
    state.isAuthenticated = true;
    state.authToken = "local-offline-session";
    localStorage.setItem("orion_auth_token", "local-offline-session");
    state.currentUser = { username, display_name: displayName };
    localStorage.setItem(
      "vibgyor_parent_user",
      JSON.stringify(state.currentUser),
    );
    const student = resolveStudentForUser(username);
    state.student = student;
    localStorage.setItem("vibgyor_parent_student", JSON.stringify(student));

    showToast("Signed in offline mode", "info", 4000);
    showDashboardView();
    renderStudentProfile();
    await loadAvailableDates();
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
      renderStudentProfile();
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
      renderStudentProfile();
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
    renderStudentProfile();
    await loadAvailableDates();
  } finally {
    if (demoBtn) {
      demoBtn.disabled = false;
      demoBtn.classList.remove("opacity-75");
    }
  }
}

async function handleLogout() {
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

  showLoginView();
  showToast("You have been signed out.", "info", 3000);
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById("login-password");
  if (!pwdInput) return;
  pwdInput.type = pwdInput.type === "password" ? "text" : "password";
}

// --- PWA Installation & Service Worker Registration ---
let deferredInstallPrompt = null;

function initPWA() {
  // 1. Register Service Worker for offline support
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    });
  }

  const installBtn = document.getElementById("pwa-install-btn");
  if (!installBtn) return;

  // Check if app is already running in standalone / installed mode
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    installBtn.classList.add("hidden");
    installBtn.classList.remove("flex");
    return;
  }

  // 2. Listen for native browser install prompt (Android, Chrome, Edge)
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installBtn.classList.remove("hidden");
    installBtn.classList.add("flex");
  });

  // 3. Handle click on install button
  installBtn.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === "accepted") {
        showToast("Installing ClassUpdates to your device! 🎉", "success", 4000);
      }
      deferredInstallPrompt = null;
      installBtn.classList.add("hidden");
      installBtn.classList.remove("flex");
    } else {
      const isIos =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIos) {
        showToast(
          "To install on iPhone/iPad: Tap the Share button ⎋ at the bottom of Safari and select 'Add to Home Screen' ⊞",
          "info",
          7000,
        );
      } else {
        showToast(
          "To install: Open browser menu (⋮) and select 'Install app' or 'Add to Home Screen' 📲",
          "info",
          5000,
        );
      }
    }
  });

  // 4. Listen for successful installation
  window.addEventListener("appinstalled", () => {
    installBtn.classList.add("hidden");
    installBtn.classList.remove("flex");
    deferredInstallPrompt = null;
    showToast("ClassUpdates installed successfully! 📱", "success", 5000);
  });

  // If on iOS and not standalone, show the install button with iOS instructions
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIos && !isStandalone) {
    installBtn.classList.remove("hidden");
    installBtn.classList.add("flex");
  }
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initPWA();
  setupEventListeners();
  await checkAuth();
});

function setupEventListeners() {
  // Tabs
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Date select dropdown
  const dateSelect = document.getElementById("date-select");
  if (dateSelect) {
    dateSelect.addEventListener("change", (e) => {
      state.selectedDate = e.target.value;
      if (state.currentTab === "daily") {
        loadDailyUpdate(state.selectedDate);
      } else if (state.currentTab === "weekly") {
        loadWeeklyUpdate(state.selectedDate);
      }
    });
  }

  // Sync button
  const syncBtn = document.getElementById("sync-btn");
  if (syncBtn) {
    syncBtn.addEventListener("click", triggerManualSync);
  }

  // Word history modal toggle
  const wordHistoryBtn = document.getElementById("word-history-btn");
  const wordModal = document.getElementById("word-modal");
  const closeWordModal = document.getElementById("close-word-modal");
  if (wordHistoryBtn) {
    wordHistoryBtn.addEventListener("click", openWordHistoryModal);
  }
  if (closeWordModal) {
    closeWordModal.addEventListener("click", closeWordHistoryModal);
  }
  if (wordModal) {
    wordModal.addEventListener("click", (e) => {
      if (e.target === wordModal) {
        closeWordHistoryModal();
      }
    });
  }

  // Notice modal close
  const closeNoticeBtn = document.getElementById("close-notice-modal");
  const btnCloseNotice = document.getElementById("btn-close-notice");
  const noticeModal = document.getElementById("notice-modal");
  if (closeNoticeBtn) {
    closeNoticeBtn.addEventListener("click", closeNoticeModal);
  }
  if (btnCloseNotice) {
    btnCloseNotice.addEventListener("click", closeNoticeModal);
  }
  if (noticeModal) {
    noticeModal.addEventListener("click", (e) => {
      if (e.target === noticeModal) {
        closeNoticeModal();
      }
    });
  }

  // Global Escape key listener for open modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeWordHistoryModal();
      closeNoticeModal();
    }
  });
}

// --- Navigation Tabs ---
function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    if (btn.dataset.tab === tabName) {
      btn.className =
        "tab-active pb-3 text-sm flex items-center gap-2 cursor-pointer";
    } else {
      btn.className =
        "tab-inactive pb-3 text-sm flex items-center gap-2 cursor-pointer";
    }
  });

  document
    .getElementById("view-daily")
    .classList.toggle("hidden", tabName !== "daily");
  document
    .getElementById("view-weekly")
    .classList.toggle("hidden", tabName !== "weekly");
  document
    .getElementById("view-circulars")
    .classList.toggle("hidden", tabName !== "circulars");

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
    renderStudentProfile();
    return;
  }
  if (isStaticMode()) {
    if (!state.student) {
      state.student = DEMO_STUDENT;
    }
    renderStudentProfile();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/student`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      state.student = await res.json();
      renderStudentProfile();
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
  renderStudentProfile();
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
  renderDateDropdown();

  if (state.availableDates.length > 0) {
    if (
      !state.selectedDate ||
      !state.availableDates.some((d) => d.date === state.selectedDate)
    ) {
      state.selectedDate = state.availableDates[0].date;
    }
    const dateSelect = document.getElementById("date-select");
    if (dateSelect) dateSelect.value = state.selectedDate;
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
      renderDateDropdown();

      if (state.availableDates.length > 0) {
        state.selectedDate = state.availableDates[0].date;
        const dateSelect = document.getElementById("date-select");
        if (dateSelect) dateSelect.value = state.selectedDate;
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

  state.dailyData = dailyCopy;
  renderDailyView();
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
      renderDailyView();
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
  renderWeeklyView();
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
      renderWeeklyView();
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
  renderCircularsView();
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
      renderCircularsView();
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
      renderDateDropdown();
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

async function triggerManualSync() {
  if (state.isSyncing) return;
  state.isSyncing = true;
  const syncBtn = document.getElementById("sync-btn");
  const syncIcon = document.getElementById("sync-icon");
  if (syncIcon) syncIcon.classList.add("animate-spin");
  if (syncBtn) syncBtn.classList.add("opacity-75", "cursor-wait");

  if (isStaticMode()) {
    setTimeout(async () => {
      state.isSyncing = false;
      if (syncIcon) syncIcon.classList.remove("animate-spin");
      if (syncBtn) syncBtn.classList.remove("opacity-75", "cursor-wait");
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
    const res = await fetch(`${API_BASE}/api/sync`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.status === "success") {
      showToast(
        data.message || "Timetable synchronized successfully!",
        "success",
      );
      await loadAvailableDates();
    } else {
      showToast(data.message || "Sync encountered an issue", "warning");
    }
  } catch (err) {
    showToast(
      "All Grade 1 updates are up to date! (Client-side offline mode)",
      "info",
      4000,
    );
    await loadAvailableDates();
  } finally {
    state.isSyncing = false;
    if (syncIcon) syncIcon.classList.remove("animate-spin");
    if (syncBtn) syncBtn.classList.remove("opacity-75", "cursor-wait");
  }
}

// --- Render Functions ---

function renderStudentProfile() {
  if (!state.student) return;
  const nameEl = document.getElementById("student-name");
  const metaEl = document.getElementById("student-meta");
  const avatarEl = document.getElementById("student-avatar");
  const mobName = document.getElementById("mobile-student-name");
  const mobMeta = document.getElementById("mobile-student-meta");

  const isDemo = state.student.student_id === "DEMO-G1F-001";
  const isPlaceholder =
    !isDemo && isPlaceholderStudentName(state.student.name);
  const displayName = isPlaceholder ? "Add student name" : state.student.name;

  if (nameEl) {
    nameEl.textContent = displayName;
    nameEl.classList.toggle("italic", isPlaceholder);
    nameEl.classList.toggle("text-indigo-600", isPlaceholder);
    nameEl.classList.toggle("dark:text-indigo-400", isPlaceholder);
    if (!isDemo) {
      nameEl.title = "Click to edit child's name";
      nameEl.classList.add(
        "cursor-pointer",
        "hover:text-indigo-600",
        "dark:hover:text-indigo-400",
      );
      nameEl.onclick = editStudentName;
    } else {
      nameEl.title = "";
      nameEl.classList.remove(
        "cursor-pointer",
        "hover:text-indigo-600",
        "dark:hover:text-indigo-400",
      );
      nameEl.onclick = null;
    }
  }
  if (metaEl) {
    metaEl.textContent = `${state.student.grade} ${state.student.section} • ${state.student.school}`;
  }
  if (mobName) {
    mobName.textContent = displayName;
    mobName.classList.toggle("italic", isPlaceholder);
    if (!isDemo) {
      mobName.title = "Click to edit child's name";
      mobName.classList.add("cursor-pointer");
      mobName.onclick = editStudentName;
    } else {
      mobName.title = "";
      mobName.classList.remove("cursor-pointer");
      mobName.onclick = null;
    }
  }
  if (mobMeta) {
    mobMeta.textContent = `${state.student.grade} ${state.student.section}`;
  }

  if (avatarEl) {
    if (isPlaceholder) {
      avatarEl.textContent = "+";
      avatarEl.title = "Click the name to set your child's name";
    } else {
      const initials = (state.student.name || "")
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      avatarEl.textContent = initials || (isDemo ? "DS" : "ST");
      avatarEl.title = "";
    }
  }
}

function renderDateDropdown() {
  const select = document.getElementById("date-select");
  if (!select) return;

  const currentVal = state.selectedDate || select.value;
  select.innerHTML = "";

  state.availableDates.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.date;
    const hwBadge = d.has_pending_homework ? " 📌 HW Due" : "";
    opt.textContent = `${d.display_date} (${formatDatePretty(d.date)})${hwBadge}`;
    if (d.date === currentVal) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  if (currentVal) {
    select.value = currentVal;
  }
}

function renderDailyView() {
  const data = state.dailyData;
  if (!data) return;

  // 1. Hero Widget: Word of the Day
  renderWordOfTheDayHero(data.words_of_the_day);

  // 2. Active Homework Checklist
  renderActiveHomeworkSection(data.periods);

  // 3. Teacher's Note
  renderTeacherNoteSection(data.teacher_note);

  // 4. Periods & Classwork Timetable
  renderPeriodsTable(data.periods);
}

function renderWordOfTheDayHero(words) {
  const container = document.getElementById("hero-words-container");
  if (!container) return;

  if (!words || words.length === 0) {
    container.innerHTML = `
      <div class="text-white/80 italic text-sm">No special vocabulary words recorded for today.</div>
    `;
    return;
  }

  const chipsHtml = words
    .map(
      (w) => `
      <div class="word-chip px-5 py-3 rounded-2xl flex flex-col items-center shadow-sm">
        <span class="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase text-white">${w}</span>
        <span class="text-xs text-indigo-100 font-medium tracking-normal mt-1">Dictation Prep</span>
      </div>
    `,
    )
    .join("");

  container.innerHTML = `
    <div class="flex flex-wrap gap-4 items-center">
      ${chipsHtml}
    </div>
  `;
}

function renderActiveHomeworkSection(periods) {
  const container = document.getElementById("homework-container");
  const countBadge = document.getElementById("hw-count-badge");
  if (!container) return;

  const homeworkPeriods = (periods || []).filter((p) => p.is_homework);

  if (homeworkPeriods.length === 0) {
    if (countBadge) {
      countBadge.textContent = "0/0 Done";
      countBadge.className =
        "bg-slate-100 dark:bg-slate-700/60 text-slate-500 text-xs font-semibold px-2.5 py-0.5 rounded-full";
    }
    container.innerHTML = `
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center shadow-sm">
        <div class="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-full text-emerald-600 dark:text-emerald-400 mb-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h4 class="font-bold text-slate-800 dark:text-white">No Homework Assigned Today!</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">All classwork was completed in school. Enjoy reading time with your child!</p>
      </div>
    `;
    return;
  }

  // Deduplicate identical homework on the same day if double period
  const uniqueHomework = [];
  const seenHw = new Set();
  for (const p of homeworkPeriods) {
    const subj = getCanonicalSubject(p.subject);
    const key = `${subj.toLowerCase()}|${(p.reinforcement || "").toLowerCase()}`;
    if (!seenHw.has(key)) {
      seenHw.add(key);
      uniqueHomework.push({ ...p, subject: subj });
    }
  }

  if (countBadge) {
    const completedCount = uniqueHomework.filter((p) => p.is_completed).length;
    const totalCount = uniqueHomework.length;
    countBadge.textContent = `${completedCount}/${totalCount} Done`;
    countBadge.className =
      totalCount > 0 && completedCount === totalCount
        ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full"
        : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full";
  }

  const cardsHtml = uniqueHomework
    .map(
      (p) => `
      <div class="bg-white dark:bg-slate-800 border ${
        p.is_completed
          ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20"
          : "border-slate-200 dark:border-slate-700"
      } rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <input
              type="checkbox"
              id="hw-${p.id}"
              class="hw-checkbox mt-1"
              ${p.is_completed ? "checked" : ""}
              onchange="toggleHomework(${p.id})"
            />
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${getSubjectBadgeClass(
                  p.subject,
                )}">
                  ${p.subject}
                </span>
                ${
                  p.submission_date && p.submission_date.toUpperCase() !== "NIL"
                    ? `<span class="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        Due: ${p.submission_date}
                      </span>`
                    : ""
                }
              </div>
              <h4 class="font-bold text-slate-900 dark:text-white mt-2 text-base ${p.is_completed ? "line-through text-slate-400 dark:text-slate-500" : ""}">
                ${p.topic}
              </h4>
              <div class="mt-1 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-200 font-medium">
                <div class="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase mb-1">Homework Task (RWSH)</div>
                ${p.reinforcement}
              </div>
            </div>
          </div>
          <div>
            ${
              p.is_completed
                ? `<span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full">
                    Completed ✓
                  </span>`
                : `<span class="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/80 px-2.5 py-1 rounded-full">
                    Action Needed
                  </span>`
            }
          </div>
        </div>
      </div>
    `,
    )
    .join("");

  container.innerHTML = `<div class="grid gap-4">${cardsHtml}</div>`;
}

function cleanTeacherNote(text) {
  if (!text) return [];

  const lines = text.split("\n").map((l) => l.trim());
  const salutationRe =
    /^(?:dear\s+parents?|dear\s+sir(?:\s*\/\s*madam)?|hello\s+parents?|notes?|additional\s+information)\s*[:,\.]?$/i;
  const valedictionRe =
    /^(?:warm\s+regards|with\s+warm\s+regards|best\s+regards|kind\s+regards|regards|thanks\s+and\s+regards|thank\s+you)\s*[\.,]?$/i;

  const rawParagraphs = [];
  let currentWords = [];

  for (const line of lines) {
    if (!line) {
      if (currentWords.length > 0) {
        rawParagraphs.push(currentWords.join(" "));
        currentWords = [];
      }
      continue;
    }
    if (salutationRe.test(line)) {
      if (currentWords.length > 0) {
        rawParagraphs.push(currentWords.join(" "));
        currentWords = [];
      }
      continue;
    }
    if (valedictionRe.test(line)) {
      if (currentWords.length > 0) {
        rawParagraphs.push(currentWords.join(" "));
        currentWords = [];
      }
      continue;
    }
    currentWords.push(line);
  }

  if (currentWords.length > 0) {
    rawParagraphs.push(currentWords.join(" "));
  }

  const cleaned = [];
  for (const p of rawParagraphs) {
    let s = p
      .replace(/^(?:dear\s+parents?|dear\s+parent|notes?)\s*[:,\.]?\s*/i, "")
      .replace(
        /\s*(?:warm\s+regards|with\s+warm\s+regards|best\s+regards|kind\s+regards|regards|thanks\s+and\s+regards|thank\s+you)\s*[\.,]?\s*$/i,
        "",
      )
      .trim();
    if (s) cleaned.push(s);
  }

  return cleaned;
}

function renderTeacherNoteSection(note) {
  const container = document.getElementById("teacher-note-container");
  if (!container) return;

  const cleanedParagraphs = cleanTeacherNote(note);
  if (cleanedParagraphs.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  const bodyEl = document.getElementById("teacher-note-body");
  if (bodyEl) {
    bodyEl.innerHTML = cleanedParagraphs
      .map(
        (p) =>
          `<p class="leading-relaxed text-xs sm:text-sm text-amber-900/90 dark:text-amber-100/90 w-full">${p}</p>`,
      )
      .join(
        '<div class="my-2.5 border-t border-amber-200/60 dark:border-amber-800/60"></div>',
      );
  }
}

function groupPeriodsBySubject(periods) {
  if (!periods || periods.length === 0) return [];

  const groupMap = new Map();
  const orderedGroups = [];

  for (const p of periods) {
    const rawSubj = (p.subject || "General").trim();
    const canonicalSubj = getCanonicalSubject(rawSubj);
    const key = canonicalSubj.toLowerCase();

    const topicStr = (p.topic || "").trim();
    const subTopicStr = (p.sub_topic || "").trim();
    const cwStr = (p.cw || "").trim();
    const skillStr = (p.skill_assessed || "").trim();

    if (groupMap.has(key)) {
      const group = groupMap.get(key);
      group.periodCount += 1;
      group.periods.push(p);

      if (
        topicStr &&
        topicStr.toUpperCase() !== "NIL" &&
        !group.topics.includes(topicStr)
      ) {
        group.topics.push(topicStr);
      }

      if (
        subTopicStr &&
        subTopicStr.toUpperCase() !== "NIL" &&
        subTopicStr !== "—" &&
        !group.subTopics.includes(subTopicStr)
      ) {
        group.subTopics.push(subTopicStr);
      }

      if (
        cwStr &&
        cwStr.toUpperCase() !== "NIL" &&
        !group.classworks.includes(cwStr)
      ) {
        group.classworks.push(cwStr);
      }

      if (
        skillStr &&
        skillStr.toUpperCase() !== "NIL" &&
        skillStr.toUpperCase() !== "NA" &&
        !group.skills.includes(skillStr)
      ) {
        group.skills.push(skillStr);
      }

      if (p.is_homework) {
        const hwKey = `${(p.reinforcement || "").toLowerCase()}|${(p.submission_date || "").toLowerCase()}`;
        if (
          !group.homeworkList.some(
            (h) =>
              `${(h.reinforcement || "").toLowerCase()}|${(h.submission_date || "").toLowerCase()}` ===
              hwKey,
          )
        ) {
          group.homeworkList.push(p);
        }
      }
    } else {
      const newGroup = {
        subject: canonicalSubj,
        cleanSubject: key,
        periodCount: 1,
        periods: [p],
        topics: topicStr && topicStr.toUpperCase() !== "NIL" ? [topicStr] : [],
        subTopics:
          subTopicStr &&
          subTopicStr.toUpperCase() !== "NIL" &&
          subTopicStr !== "—"
            ? [subTopicStr]
            : [],
        classworks: cwStr && cwStr.toUpperCase() !== "NIL" ? [cwStr] : [],
        skills:
          skillStr &&
          skillStr.toUpperCase() !== "NIL" &&
          skillStr.toUpperCase() !== "NA"
            ? [skillStr]
            : [],
        homeworkList: p.is_homework ? [p] : [],
      };
      groupMap.set(key, newGroup);
      orderedGroups.push(newGroup);
    }
  }

  return orderedGroups;
}

function renderPeriodsTable(periods) {
  const container = document.getElementById("periods-container");
  if (!container) return;

  if (!periods || periods.length === 0) {
    container.innerHTML = `<div class="p-4 text-slate-400 dark:text-slate-500 text-sm">No periods found for this date.</div>`;
    return;
  }

  const subjectGroups = groupPeriodsBySubject(periods);

  const cardsHtml = subjectGroups
    .map((g) => {
      const hasHomework = g.homeworkList.length > 0;
      const topicDisplay = g.topics.length > 0 ? g.topics.join(" • ") : "NIL";
      const subTopicDisplay =
        g.subTopics.length > 0 ? g.subTopics.join(" • ") : "NIL";
      const cwDisplay =
        g.classworks.length > 0 ? g.classworks.join(", ") : "NIL";
      const skillDisplay = g.skills.length > 0 ? g.skills.join(", ") : "NIL";
      const headerClass = getSubjectHeaderClass(g.subject);

      return `
      <div class="bg-white dark:bg-slate-800 border ${
        hasHomework
          ? "border-amber-300 dark:border-amber-500/80 ring-2 ring-amber-100 dark:ring-amber-950/60 shadow-sm"
          : "border-slate-200 dark:border-slate-700 shadow-xs"
      } rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <!-- Header Banner: Pill color for header, HW marker before header title, Sessions count -->
          <div class="px-4 py-3 border-b flex items-center justify-between gap-2 ${headerClass}">
            <div class="flex items-center gap-2 min-w-0">
              ${
                hasHomework
                  ? `<div class="flex items-center gap-1.5 shrink-0" title="Active Homework Assigned">
                      <span class="hw-pulse-dot w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      <span class="bg-amber-500 text-white font-extrabold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full shadow-xs">
                        HW
                      </span>
                    </div>`
                  : ""
              }
              <h4 class="font-extrabold text-base tracking-tight truncate">${g.subject}</h4>
            </div>

            ${
              g.periodCount > 1
                ? `<span class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-current/20 shrink-0">
                    ${g.periodCount} Sessions
                  </span>`
                : ""
            }
          </div>

          <!-- Body: Topic & Sub-topic -->
          <div class="p-4 space-y-2">
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-baseline gap-1.5">
              <span class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider shrink-0">Topic:</span>
              <span class="leading-snug">${topicDisplay}</span>
            </div>
            ${
              subTopicDisplay !== "NIL"
                ? `<div class="text-xs text-slate-500 dark:text-slate-400 flex items-baseline gap-1.5">
                    <span class="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-400 tracking-wider shrink-0">Sub Topic:</span>
                    <span class="leading-snug">${subTopicDisplay}</span>
                  </div>`
                : ""
            }
          </div>
        </div>

        <!-- Footer: Class Work (CWSH), Skill Assessed, & Homework Section -->
        <div class="p-4 pt-0 space-y-2.5">
          <div class="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <span class="text-slate-400 dark:text-slate-400 font-medium">Class Work:</span>
            <span class="font-bold ${
              cwDisplay !== "NIL"
                ? "text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/60"
                : "text-slate-400 dark:text-slate-500"
            }">
              ${cwDisplay}
            </span>
          </div>

          ${
            skillDisplay !== "NIL"
              ? `<div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400 dark:text-slate-400 font-medium">Skill Assessed:</span>
                  <span class="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded font-medium border border-emerald-100 dark:border-emerald-800/60">${skillDisplay}</span>
                </div>`
              : ""
          }

          <!-- Homework Section if assigned -->
          ${
            hasHomework
              ? `<div class="mt-2 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs space-y-2">
                  <div class="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    Homework Task (RWSH)
                  </div>
                  ${g.homeworkList
                    .map(
                      (hw) => `
                    <div class="flex items-start justify-between gap-2">
                      <label class="flex items-start gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          class="hw-checkbox mt-0.5"
                          ${hw.is_completed ? "checked" : ""}
                          onchange="toggleHomework(${hw.id})"
                        />
                        <div class="flex-1">
                          <span class="font-bold text-slate-800 dark:text-slate-200 ${hw.is_completed ? "line-through text-slate-400 dark:text-slate-500" : ""}">
                            ${hw.reinforcement}
                          </span>
                          ${
                            hw.submission_date &&
                            hw.submission_date.toUpperCase() !== "NIL"
                              ? `<div class="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                                  Due: ${hw.submission_date}
                                </div>`
                              : ""
                          }
                        </div>
                      </label>
                      <span class="text-[10px] font-bold ${
                        hw.is_completed
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      } shrink-0">
                        ${hw.is_completed ? "✓ Done" : "⏳ Due"}
                      </span>
                    </div>
                  `,
                    )
                    .join("")}
                </div>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  container.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">${cardsHtml}</div>`;
}

function renderWeeklyView() {
  const container = document.getElementById("weekly-days-grid");
  const wordsContainer = document.getElementById("weekly-words-bank");
  const hwContainer = document.getElementById("weekly-hw-summary");
  if (!container || !state.weeklyData) return;

  const data = state.weeklyData;
  const todayStr = new Date().toISOString().split("T")[0];

  // Words bank
  if (wordsContainer) {
    if (data.weekly_dictation_words && data.weekly_dictation_words.length > 0) {
      wordsContainer.innerHTML = data.weekly_dictation_words
        .map(
          (w) => `
          <span class="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1.5 rounded-xl font-bold text-sm tracking-wide shadow-sm">
            ${w}
          </span>
        `,
        )
        .join("");
    } else {
      wordsContainer.innerHTML = `<span class="text-xs text-slate-400 dark:text-slate-500">No words found for this week.</span>`;
    }
  }

  // Active Homework items
  if (hwContainer) {
    if (data.active_homework_items && data.active_homework_items.length > 0) {
      hwContainer.innerHTML = data.active_homework_items
        .map(
          (item) => `
          <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                class="hw-checkbox"
                ${item.is_completed ? "checked" : ""}
                onchange="toggleHomework(${item.period_id})"
              />
              <div>
                <span class="font-bold text-slate-800 dark:text-slate-200">${getCanonicalSubject(item.subject)}</span>
                <p class="text-slate-600 dark:text-slate-400">${item.reinforcement || "NIL"}</p>
              </div>
            </div>
            <div class="text-right font-medium">
              <span class="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                ${item.submission_date && item.submission_date.toUpperCase() !== "NIL" ? item.submission_date : "No due date"}
              </span>
            </div>
          </div>
        `,
        )
        .join("");
    } else {
      hwContainer.innerHTML = `<div class="text-xs text-slate-400 dark:text-slate-500">No homework assigned this week.</div>`;
    }
  }

  // 5-Day Columns - ONLY content with homework, NO P1 P2, UNORDERED LIST
  container.innerHTML = (data.days || [])
    .map((day) => {
      const isSelected = day.date === state.selectedDate;
      const isFuture = day.date > todayStr;
      const hwPeriods = (day.periods || []).filter((p) => p.is_homework);
      const uniqueHw = [];
      const seenHw = new Set();
      for (const p of hwPeriods) {
        const subj = getCanonicalSubject(p.subject);
        const key = `${subj.toLowerCase()}|${(p.reinforcement || "").toLowerCase()}`;
        if (!seenHw.has(key)) {
          seenHw.add(key);
          uniqueHw.push({ ...p, subject: subj });
        }
      }

      return `
        <div class="bg-white dark:bg-slate-800 border ${
          isSelected
            ? "border-indigo-500 dark:border-indigo-400 shadow-md ring-2 ring-indigo-100 dark:ring-indigo-950/60"
            : "border-slate-200 dark:border-slate-700"
        } rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2 mb-3">
              <div>
                <h5 class="font-bold text-slate-900 dark:text-white text-sm">${getDayName(day.date)}</h5>
                <span class="text-xs text-slate-400 dark:text-slate-400">${day.display_date}</span>
              </div>
              ${
                uniqueHw.length > 0
                  ? `<span class="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60 font-bold text-xs px-2 py-0.5 rounded-full">${uniqueHw.length} HW</span>`
                  : `<span class="text-xs text-slate-400 dark:text-slate-500">No HW</span>`
              }
            </div>

            ${
              day.words_of_the_day && day.words_of_the_day.length > 0
                ? `<div class="mb-3 bg-indigo-50/50 dark:bg-indigo-950/40 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800/60">
                    <div class="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Dictation Words</div>
                    <div class="font-bold text-indigo-900 dark:text-indigo-200 text-sm">${day.words_of_the_day.join(", ")}</div>
                  </div>`
                : ""
            }

            <!-- Homework Content Only - Unordered List -->
            <div class="mt-2">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">Assigned Homework</div>
              ${
                uniqueHw.length === 0
                  ? `<div class="text-xs text-slate-400 dark:text-slate-500 italic py-3 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No homework assigned</div>`
                  : `<ul class="space-y-2 text-xs">
                      ${uniqueHw
                        .map(
                          (p) => `
                        <li class="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2.5">
                          <span class="text-amber-500 font-bold leading-none mt-1">•</span>
                          <div class="flex-1 min-w-0">
                            <div class="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-1">
                              <span class="truncate">${p.subject}</span>
                              ${
                                p.is_completed
                                  ? `<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓ Done</span>`
                                  : `<span class="text-[10px] text-amber-600 dark:text-amber-400 font-bold shrink-0">⏳ Due</span>`
                              }
                            </div>
                            <div class="text-slate-600 dark:text-slate-400 text-[11px] leading-snug mt-0.5">${p.reinforcement || "NIL"}</div>
                            ${
                              p.submission_date &&
                              p.submission_date.toUpperCase() !== "NIL"
                                ? `<div class="text-[10px] text-amber-800 dark:text-amber-300 font-semibold mt-1">Due: ${p.submission_date}</div>`
                                : ""
                            }
                          </div>
                        </li>
                      `,
                        )
                        .join("")}
                    </ul>`
              }
            </div>
          </div>

          ${
            isFuture
              ? `<button
                  disabled
                  class="mt-4 w-full text-center text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/40 py-1.5 rounded-lg cursor-not-allowed border border-slate-200/60 dark:border-slate-700/60"
                  title="Timetable updates are not yet available for future dates"
                >
                  Not Available Yet
                </button>`
              : `<button
                  onclick="selectDateAndSwitch('${day.date}')"
                  class="mt-4 w-full text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  View Daily Diary →
                </button>`
          }
        </div>
      `;
    })
    .join("");
}

function selectDateAndSwitch(date) {
  state.selectedDate = date;
  const select = document.getElementById("date-select");
  if (select) select.value = date;
  switchTab("daily");
}

function renderCircularsView() {
  const container = document.getElementById("circulars-container");
  if (!container) return;

  const categoryFilter = state.selectedCircularCategory;
  const searchTerm = (state.circularSearchTerm || "").toLowerCase();

  const filtered = state.circulars.filter((c) => {
    const matchesCat =
      categoryFilter === "all" ||
      c.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      c.title.toLowerCase().includes(searchTerm) ||
      (c.summary && c.summary.toLowerCase().includes(searchTerm));
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
        No circulars match your current filter.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((c) => {
      return `
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${getCircularCategoryBadge(c.category)}">
              ${c.category}
            </span>
            <span class="text-xs text-slate-400 dark:text-slate-500">${formatDatePretty(c.publish_date)}</span>
          </div>
          <h4 class="font-bold text-slate-900 dark:text-white text-base mb-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer" onclick="openNoticeModal(${c.id})">
            ${c.title}
          </h4>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-2">${c.summary || "No summary provided."}</p>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/80 gap-2">
          <span class="text-[11px] text-slate-400 dark:text-slate-400 font-medium flex items-center gap-1">
            <svg class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            Hubble Orion Portal
          </span>

          <div class="flex items-center gap-2">
            <a
              href="${ORION_APP_URL}"
              target="_blank"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold text-xs transition-colors"
              title="Navigate to Hubble Orion App (${ORION_APP_URL})"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Open in App
            </a>
            <button
              onclick="openNoticeModal(${c.id})"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold text-xs transition-colors cursor-pointer"
            >
              Read Notice
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function openNoticeModal(circularId) {
  const circular = (state.circulars || []).find((c) => c.id === circularId);
  if (!circular) return;

  const modal = document.getElementById("notice-modal");
  const titleEl = document.getElementById("notice-title");
  const contentEl = document.getElementById("notice-content");
  const dateEl = document.getElementById("notice-date");
  const badgeEl = document.getElementById("notice-category-badge");
  const pdfLink = document.getElementById("notice-pdf-link");

  if (titleEl) titleEl.innerText = circular.title;
  if (dateEl) dateEl.innerText = formatDatePretty(circular.publish_date);
  if (badgeEl) {
    badgeEl.innerText = circular.category;
    badgeEl.className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${getCircularCategoryBadge(circular.category)}`;
  }

  if (contentEl) {
    contentEl.innerHTML = `
      <div class="bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 rounded-2xl p-4 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
        <div class="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 tracking-wider mb-1">Executive Summary</div>
        ${circular.summary || "No summary provided."}
      </div>
      <div class="mt-4 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <span class="p-1.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
          </span>
          <div>
            <div class="font-bold text-slate-800 dark:text-slate-200">Hubble Orion Portal</div>
            <div class="text-slate-500 dark:text-slate-400 font-mono text-[11px]">${ORION_APP_URL}</div>
          </div>
        </div>
        <a href="${ORION_APP_URL}" target="_blank" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-2xs flex items-center gap-1">
          Open in App →
        </a>
      </div>
    `;
  }

  if (pdfLink) {
    pdfLink.href = ORION_APP_URL;
    pdfLink.target = "_blank";
    pdfLink.innerHTML = `
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
      </svg>
      Open in App
    `;
    pdfLink.classList.remove("hidden");
  }

  if (modal) modal.classList.remove("hidden");
}

function closeNoticeModal() {
  const modal = document.getElementById("notice-modal");
  if (modal) modal.classList.add("hidden");
}

function closeWordHistoryModal() {
  const modal = document.getElementById("word-modal");
  if (modal) modal.classList.add("hidden");
}

function getMondayOfWeek(isoDate) {
  if (!isoDate) return "";
  try {
    const parts = isoDate.split("-");
    const d = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    );
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dateNum = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dateNum}`;
  } catch (e) {
    return isoDate;
  }
}

function getWeekRangeLabel(mondayIso) {
  try {
    const parts = mondayIso.split("-");
    const m = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    );
    const f = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    );
    f.setDate(f.getDate() + 4);
    const mStr = m.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const fStr = f.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${mStr} – ${fStr}`;
  } catch (e) {
    return mondayIso;
  }
}

function getWordHistoryData() {
  const datesWithWords = (state.availableDates || []).filter(
    (d) => d.words_of_the_day && d.words_of_the_day.length > 0,
  );

  const refDate =
    state.selectedDate ||
    (datesWithWords[0]
      ? datesWithWords[0].date
      : new Date().toISOString().split("T")[0]);
  const activeMonday = getMondayOfWeek(refDate);

  const weeksMap = {};
  datesWithWords.forEach((d) => {
    const monday = getMondayOfWeek(d.date);
    if (!weeksMap[monday]) {
      weeksMap[monday] = [];
    }
    weeksMap[monday].push(d);
  });

  Object.keys(weeksMap).forEach((mKey) => {
    weeksMap[mKey].sort((a, b) => a.date.localeCompare(b.date));
  });

  const sortedWeekKeys = Object.keys(weeksMap).sort((a, b) =>
    b.localeCompare(a),
  );

  return {
    activeMonday,
    weeksMap,
    sortedWeekKeys,
  };
}

function prepareDrillWords(scope = "this_week") {
  const { activeMonday, weeksMap, sortedWeekKeys } = getWordHistoryData();
  let days = [];

  if (scope === "this_week" && weeksMap[activeMonday]) {
    days = weeksMap[activeMonday];
  } else if (scope.startsWith("week_")) {
    const wKey = scope.replace("week_", "");
    days = weeksMap[wKey] || [];
  } else if (scope === "all") {
    sortedWeekKeys.forEach((mKey) => {
      days = days.concat(weeksMap[mKey] || []);
    });
  } else {
    if (weeksMap[activeMonday] && weeksMap[activeMonday].length > 0) {
      days = weeksMap[activeMonday];
    } else if (sortedWeekKeys.length > 0) {
      days = weeksMap[sortedWeekKeys[0]];
    }
  }

  const words = [];
  days.forEach((d) => {
    (d.words_of_the_day || []).forEach((w) => {
      const trimmed = w.trim();
      if (
        trimmed &&
        !words.some(
          (existing) => existing.word.toLowerCase() === trimmed.toLowerCase(),
        )
      ) {
        words.push({
          word: trimmed,
          date: d.date,
          display_date: d.display_date,
        });
      }
    });
  });

  wordModalState.drillWords = words;
  wordModalState.drillIndex = 0;
  wordModalState.isWordHidden = false;
}

function speakForSpelling(word) {
  if (!word) return;
  if (!("speechSynthesis" in window)) {
    showToast("Pronunciation audio not supported on this browser", "info");
    return;
  }

  // 1. Cancel any active speech so audio doesn't overlap
  window.speechSynthesis.cancel();

  // 2. Create the utterance and trim whitespace
  const utterance = new SpeechSynthesisUtterance(word.trim());

  // 3. Child-optimized speech configurations
  utterance.rate = 0.75; // Slowed down by 25% so they can distinctively hear vowels and consonants
  utterance.pitch = 1.05; // Slightly higher pitch, which sounds friendlier and less robotic to children
  utterance.volume = 1.0; // Keep clarity at max volume

  // 4. Function to pick the clearest child-friendly voice
  const setBestVoice = () => {
    const voices = window.speechSynthesis.getVoices();

    // Prioritise Premium, Natural, or Google high-quality English voices
    const bestVoice =
      voices.find(
        (v) => v.lang.startsWith("en") && v.name.includes("Natural"),
      ) ||
      voices.find(
        (v) => v.lang.startsWith("en") && v.name.includes("Google"),
      ) ||
      voices.find(
        (v) => v.lang.startsWith("en") && v.name.includes("Premium"),
      ) ||
      voices.find((v) => v.lang.startsWith("en")); // Fallback to any English voice

    if (bestVoice) {
      utterance.voice = bestVoice;
    }
  };

  // 5. Handle cross-browser voice loading behavior
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = setBestVoice;
  }
  setBestVoice();

  // 6. Speak the word
  window.speechSynthesis.speak(utterance);
}

// Backwards compatibility alias
const speakWord = speakForSpelling;

function toggleWordReveal() {
  wordModalState.isWordHidden = !wordModalState.isWordHidden;
  renderWordModalContent();
}

function prevWordPractice() {
  if (wordModalState.drillIndex > 0) {
    wordModalState.drillIndex--;
    wordModalState.isWordHidden = false;
    renderWordModalContent();
  }
}

function nextWordPractice() {
  if (wordModalState.drillIndex < wordModalState.drillWords.length - 1) {
    wordModalState.drillIndex++;
    wordModalState.isWordHidden = false;
    renderWordModalContent();
  }
}

function shuffleDrillWords() {
  const arr = [...wordModalState.drillWords];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  wordModalState.drillWords = arr;
  wordModalState.drillIndex = 0;
  wordModalState.isWordHidden = false;
  renderWordModalContent();
  showToast("Flashcards shuffled 🔀", "info");
}

function copyWeekWords(wordsStr) {
  if (!wordsStr) return;
  navigator.clipboard.writeText(wordsStr).then(
    () => showToast("Copied words to clipboard! 📋", "success"),
    () => showToast("Could not copy to clipboard", "error"),
  );
}

function toggleWeekAccordion(mondayKey) {
  wordModalState.collapsedWeeks[mondayKey] =
    !wordModalState.collapsedWeeks[mondayKey];
  renderWordModalContent();
}

function startWordDrill(scope) {
  prepareDrillWords(scope);
  setWordModalMode("drill");
}

function setWordModalMode(mode) {
  wordModalState.mode = mode;

  const bankBtn = document.getElementById("word-mode-bank-btn");
  const drillBtn = document.getElementById("word-mode-drill-btn");

  const activeClass =
    "px-2.5 py-1 rounded-lg transition-all cursor-pointer bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold";
  const inactiveClass =
    "px-2.5 py-1 rounded-lg transition-all cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold";

  if (bankBtn && drillBtn) {
    if (mode === "bank") {
      bankBtn.className = activeClass;
      drillBtn.className = inactiveClass;
    } else {
      bankBtn.className = inactiveClass;
      drillBtn.className = activeClass;
      if (wordModalState.drillWords.length === 0) {
        prepareDrillWords("this_week");
      }
    }
  }

  renderWordModalContent();
}

function openWordHistoryModal() {
  const modal = document.getElementById("word-modal");
  if (!modal) return;

  prepareDrillWords("this_week");
  setWordModalMode("bank");
  modal.classList.remove("hidden");
}

function renderWordModalContent() {
  const bodyEl = document.getElementById("modal-words-body");
  if (!bodyEl) return;

  const { activeMonday, weeksMap, sortedWeekKeys } = getWordHistoryData();

  if (sortedWeekKeys.length === 0) {
    bodyEl.innerHTML = `
      <div class="text-center py-8 text-slate-400 dark:text-slate-500">
        <svg class="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        <p class="font-medium text-sm">No recorded dictation words found yet.</p>
      </div>
    `;
    return;
  }

  if (wordModalState.mode === "bank") {
    const thisWeekDays = weeksMap[activeMonday] || [];
    const thisWeekWords = [];
    thisWeekDays.forEach((d) => {
      (d.words_of_the_day || []).forEach((w) => {
        const trimmed = w.trim();
        if (trimmed && !thisWeekWords.includes(trimmed)) {
          thisWeekWords.push(trimmed);
        }
      });
    });

    const pastWeekKeys = sortedWeekKeys.filter((k) => k !== activeMonday);

    bodyEl.innerHTML = `
      <!-- This Week's Revision Focus Box -->
      <div class="bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-950/40 dark:to-slate-900/60 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl p-4 shadow-xs">
        <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-indigo-100 dark:border-indigo-900/60">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                This Week's Focus
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              ${getWeekRangeLabel(activeMonday)} • ${thisWeekWords.length} words for Friday dictation
            </p>
          </div>
          ${
            thisWeekWords.length > 0
              ? `
            <button
              onclick="copyWeekWords('${thisWeekWords.join(", ")}')"
              class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="Copy this week's words"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
              </svg>
              <span>Copy</span>
            </button>
          `
              : ""
          }
        </div>

        <!-- Word Pill Cloud -->
        ${
          thisWeekWords.length > 0
            ? `
          <div class="py-3 flex flex-wrap gap-2">
            ${thisWeekWords
              .map(
                (w) => `
              <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-200 font-extrabold text-sm sm:text-base rounded-xl border border-indigo-200/90 dark:border-indigo-800/80 shadow-2xs">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                ${w}
              </span>
            `,
              )
              .join("")}
          </div>

          <!-- Daily Breakdown -->
          <div class="pt-2 border-t border-indigo-100/60 dark:border-indigo-900/40 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            ${thisWeekDays
              .map(
                (d) => `
              <div class="flex items-center gap-1">
                <span class="font-bold text-slate-800 dark:text-slate-300">${getDayName(d.date).slice(0, 3)}:</span>
                <span class="text-slate-600 dark:text-slate-400 font-medium">${d.words_of_the_day.join(", ")}</span>
              </div>
            `,
              )
              .join("")}
          </div>

          <div class="mt-3 pt-2 border-t border-indigo-100/40 dark:border-indigo-900/30 flex justify-end">
            <button
              onclick="startWordDrill('this_week')"
              class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Practice flashcards (${thisWeekWords.length})</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        `
            : `
          <p class="text-xs text-slate-500 dark:text-slate-400 py-3">No dictation words recorded yet for this week.</p>
        `
        }
      </div>

      <!-- Past Weeks Archive -->
      ${
        pastWeekKeys.length > 0
          ? `
        <div class="space-y-2 pt-1">
          <h5 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
            Previous Weeks Archive
          </h5>
          <div class="space-y-2">
            ${pastWeekKeys
              .map((mKey) => {
                const days = weeksMap[mKey] || [];
                const words = [];
                days.forEach((d) => {
                  (d.words_of_the_day || []).forEach((w) => {
                    const trimmed = w.trim();
                    if (trimmed && !words.includes(trimmed)) {
                      words.push(trimmed);
                    }
                  });
                });
                const isExpanded = !!wordModalState.collapsedWeeks[mKey];

                return `
                  <div class="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-slate-50/60 dark:bg-slate-900/40 transition-colors">
                    <button
                      onclick="toggleWeekAccordion('${mKey}')"
                      class="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                          Week of ${getWeekRangeLabel(mKey)}
                        </span>
                        <span class="text-[11px] font-semibold px-2 py-0.5 bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                          ${words.length} words
                        </span>
                      </div>
                      <svg class="w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>

                    ${
                      isExpanded
                        ? `
                      <div class="p-3.5 pt-0 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
                        <div class="flex flex-wrap gap-1.5 pt-2.5">
                          ${words
                            .map(
                              (w) => `
                            <span class="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold">
                              ${w}
                            </span>
                          `,
                            )
                            .join("")}
                        </div>

                        <!-- Day breakdown for past week -->
                        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                          ${days
                            .map(
                              (d) => `
                            <div class="flex items-center gap-1">
                              <span class="font-semibold text-slate-700 dark:text-slate-300">${getDayName(d.date).slice(0, 3)} (${d.display_date}):</span>
                              <span>${d.words_of_the_day.join(", ")}</span>
                            </div>
                          `,
                            )
                            .join("")}
                        </div>

                        <div class="flex justify-between items-center text-xs pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <button
                            onclick="copyWeekWords('${words.join(", ")}')"
                            class="font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                            </svg>
                            <span>Copy words</span>
                          </button>
                          <button
                            onclick="startWordDrill('week_${mKey}')"
                            class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Drill this week →
                          </button>
                        </div>
                      </div>
                    `
                        : ""
                    }
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `
          : ""
      }
    `;
  } else {
    // Mode is 'drill' (Flashcard Practice)
    const totalWords = wordModalState.drillWords.length;
    if (totalWords === 0) {
      bodyEl.innerHTML = `
        <div class="text-center py-10 space-y-3">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">No words found in this practice set.</p>
          <button onclick="setWordModalMode('bank')" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer">
            Back to Word Bank
          </button>
        </div>
      `;
      return;
    }

    if (wordModalState.drillIndex >= totalWords) wordModalState.drillIndex = 0;
    if (wordModalState.drillIndex < 0) wordModalState.drillIndex = 0;

    const currentWord = wordModalState.drillWords[wordModalState.drillIndex];
    const isHidden = wordModalState.isWordHidden;

    bodyEl.innerHTML = `
      <div class="flex flex-col items-center justify-center py-2 space-y-4">
        <!-- Top meta bar -->
        <div class="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span class="font-bold">
            Word <span class="text-indigo-600 dark:text-indigo-400 text-sm font-extrabold">${wordModalState.drillIndex + 1}</span> of ${totalWords}
          </span>
          <div class="flex items-center gap-3">
            <button
              onclick="shuffleDrillWords()"
              class="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-semibold cursor-pointer transition-colors"
              title="Randomize word order"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>Shuffle</span>
            </button>
            <button
              onclick="setWordModalMode('bank')"
              class="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer transition-colors"
            >
              View all
            </button>
          </div>
        </div>

        <!-- Flashcard Display Card -->
        <div class="w-full max-w-sm bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800/90 dark:to-indigo-950/40 border-2 border-indigo-200/90 dark:border-indigo-800/80 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-md relative min-h-[190px] transition-all">
          ${
            isHidden
              ? `
            <div class="text-slate-400 dark:text-slate-500 font-mono font-black text-3xl tracking-[0.3em] select-none my-auto">
              ••••••••
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-3">
              Listen carefully and spell the word on paper!
            </p>
          `
              : `
            <div class="text-4xl sm:text-5xl font-black text-indigo-950 dark:text-white tracking-tight font-sans my-auto">
              ${currentWord.word}
            </div>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
              Taught on ${currentWord.display_date} (${getDayName(currentWord.date)})
            </p>
          `
          }

          <!-- Floating action buttons -->
          <div class="mt-5 flex items-center gap-2">
            <button
              onclick="speakForSpelling('${currentWord.word}')"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
              title="Read word aloud"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
              </svg>
              <span>Pronounce</span>
            </button>

            <button
              onclick="toggleWordReveal()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
            >
              ${
                isHidden
                  ? `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <span>Reveal Word</span>
              `
                  : `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
                </svg>
                <span>Hide (Blind Test)</span>
              `
              }
            </button>
          </div>
        </div>

        <!-- Navigation Prev / Next Buttons -->
        <div class="w-full max-w-sm flex items-center justify-between gap-3 pt-1">
          <button
            onclick="prevWordPractice()"
            ${wordModalState.drillIndex === 0 ? "disabled" : ""}
            class="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            <span>Previous</span>
          </button>

          <button
            onclick="nextWordPractice()"
            ${wordModalState.drillIndex === totalWords - 1 ? "disabled" : ""}
            class="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>Next</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}

// --- Helpers ---
function getCanonicalSubject(rawSubj) {
  if (!rawSubj) return "General";
  let s = rawSubj.trim();
  // Strip trailing (S), (s), (Support), (Spoken)
  s = s.replace(/\s*\([Ss](?:upport|poken)?\)\s*$/i, "").trim();
  if (/^computer(s)?$/i.test(s)) return "Computers";
  if (/^skill programm?e$/i.test(s)) return "Skill Program";
  if (/^literature$/i.test(s)) return "English Literature";
  return s;
}

function getSubjectHeaderClass(subject) {
  const s = (subject || "").toLowerCase();
  if (s.includes("math")) return "subject-header-math";
  if (
    s.includes("english") ||
    s.includes("language") ||
    s.includes("literature")
  )
    return "subject-header-english";
  if (s.includes("science")) return "subject-header-science";
  if (s.includes("robotics")) return "subject-header-robotics";
  if (s.includes("kannada")) return "subject-header-kannada";
  if (s.includes("hindi")) return "subject-header-hindi";
  if (s.includes("spa") || s.includes("art") || s.includes("physical"))
    return "subject-header-spa";
  if (s.includes("computer")) return "subject-header-computers";
  return "subject-header-default";
}

function getSubjectBadgeClass(subject) {
  const s = (subject || "").toLowerCase();
  if (s.includes("math")) return "subject-badge-math";
  if (
    s.includes("english") ||
    s.includes("language") ||
    s.includes("literature")
  )
    return "subject-badge-english";
  if (s.includes("science")) return "subject-badge-science";
  if (s.includes("robotics")) return "subject-badge-robotics";
  if (s.includes("kannada")) return "subject-badge-kannada";
  if (s.includes("hindi")) return "subject-badge-hindi";
  if (s.includes("spa") || s.includes("art") || s.includes("physical"))
    return "subject-badge-spa";
  if (s.includes("computer")) return "subject-badge-computers";
  return "subject-badge-default";
}

function getCircularCategoryBadge(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("acad"))
    return "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50";
  if (c.includes("sport"))
    return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50";
  if (c.includes("event"))
    return "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50";
  return "bg-slate-100 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-600/50";
}

function formatDatePretty(isoDate) {
  if (!isoDate) return "";
  try {
    const parts = isoDate.split("-");
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return isoDate;
  }
}

function getDayName(isoDate) {
  if (!isoDate) return "";
  try {
    const parts = isoDate.split("-");
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-US", { weekday: "long" });
  } catch (e) {
    return "";
  }
}

let toastTimer = null;
let toastHideTimer = null;

function showToast(message, type = "info", duration = 5000) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  if (toastTimer) clearTimeout(toastTimer);
  if (toastHideTimer) clearTimeout(toastHideTimer);

  const bgClasses = {
    success: "bg-emerald-600 text-white shadow-emerald-900/30",
    warning: "bg-amber-600 text-white shadow-amber-900/30",
    error: "bg-rose-600 text-white shadow-rose-900/30",
    info: "bg-indigo-600 text-white shadow-indigo-900/30",
  };

  const icons = {
    success: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`,
    warning: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    error: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
    info: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  };

  toast.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 font-medium text-sm transition-all duration-300 ${
    bgClasses[type] || bgClasses.info
  }`;
  toast.innerHTML = `
    ${icons[type] || icons.info}
    <span class="flex-1">${message}</span>
    <button onclick="dismissToast()" class="ml-2 -mr-1 p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer" title="Dismiss">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;

  toast.classList.remove("hidden");
  void toast.offsetWidth; // Force reflow
  toast.classList.remove("opacity-0", "translate-y-4");

  toastTimer = setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-4");
    toastHideTimer = setTimeout(() => toast.classList.add("hidden"), 300);
  }, duration);
}

function dismissToast() {
  const toast = document.getElementById("toast");
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);
  if (toastHideTimer) clearTimeout(toastHideTimer);
  toast.classList.add("opacity-0", "translate-y-4");
  toastHideTimer = setTimeout(() => toast.classList.add("hidden"), 300);
}

// Global exposure for inline events
window.switchTab = switchTab;
window.toggleHomework = toggleHomework;
window.selectDateAndSwitch = selectDateAndSwitch;
window.openWordHistoryModal = openWordHistoryModal;
window.closeWordHistoryModal = closeWordHistoryModal;
window.setWordModalMode = setWordModalMode;
window.toggleWeekAccordion = toggleWeekAccordion;
window.copyWeekWords = copyWeekWords;
window.startWordDrill = startWordDrill;
window.speakForSpelling = speakForSpelling;
window.speakWord = speakForSpelling;
window.toggleWordReveal = toggleWordReveal;
window.prevWordPractice = prevWordPractice;
window.nextWordPractice = nextWordPractice;
window.shuffleDrillWords = shuffleDrillWords;
window.toggleTheme = toggleTheme;
window.dismissToast = dismissToast;
window.filterCirculars = (cat) => {
  state.selectedCircularCategory = cat;
  document.querySelectorAll("[data-circ-cat]").forEach((btn) => {
    btn.className =
      btn.dataset.circCat === cat
        ? "px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-full cursor-pointer"
        : "px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full cursor-pointer transition-colors";
  });
  renderCircularsView();
};
window.searchCirculars = (term) => {
  state.circularSearchTerm = term;
  renderCircularsView();
};
window.openNoticeModal = openNoticeModal;
window.closeNoticeModal = closeNoticeModal;
window.handleLoginSubmit = handleLoginSubmit;
window.handleDemoLogin = handleDemoLogin;
window.handleLogout = handleLogout;
window.togglePasswordVisibility = togglePasswordVisibility;
