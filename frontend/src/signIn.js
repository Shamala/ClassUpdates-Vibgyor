/**
 * Signing in and out. The local server signs in with Hubble Orion credentials
 * or the demo account; on the published board "signing out" locks the device.
 */

import { showToast } from "./toast.svelte.js";
import { API_BASE, state, DEMO_STUDENT } from "./state.svelte.js";
import { getAuthHeaders, isStaticMode } from "./api.js";
import { PASSCODE_STORAGE_KEY } from "./storage.js";
import { shell, login, showLoginView, showDashboardView } from "./shell.svelte.js";
import { applyStudentProfile, resolveStudentForUser } from "./student.js";
import { loadAvailableDates } from "./data.js";
import { rememberCredentials, forgetCredentials, autoSyncAfterSignIn } from "./sync.js";
import { isClassBoard } from "./board.js";

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

function showLoginError(message) {
  login.error = message;
  login.errorShown = true;
}

async function handleLoginSubmit() {
  const username = login.username.trim();
  const password = login.password;

  if (!username || !password) {
    showLoginError("Please enter both username and password.");
    return;
  }

  login.errorShown = false;
  login.submitting = true;

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
      login.submitting = false;
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
      if (data.mode !== "demo") rememberCredentials({ username, password });
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
      showLoginError(
        data.detail ||
          data.error ||
          "Login failed. Check your Hubble Orion credentials.",
      );
    }
  } catch (err) {
    // The server is unreachable. We have no way to check the password, so show
    // that plainly instead of signing the parent in with credentials nobody
    // verified, which is what this branch used to do.
    console.warn("Login request failed:", err);
    showLoginError(
      "Can't reach the ClassUpdates server right now, so your sign-in could not be verified. Check that it is running and try again.",
    );
  } finally {
    login.submitting = false;
  }
}

async function handleDemoLogin() {
  login.errorShown = false;
  login.demoBusy = true;

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
      login.demoBusy = false;
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
      showLoginError(data.detail || data.error || "Demo login failed.");
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
    login.demoBusy = false;
  }
}

async function handleLogout() {
  forgetCredentials();
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

export { checkAuth, handleLoginSubmit, handleDemoLogin, handleLogout };
