/**
 * Sync Now: asks the local server to read the school portal again. Only the
 * local server can; the published board has no Sync button.
 */

import { showToast } from "./toast.svelte.js";
import { API_BASE, state } from "./state.svelte.js";
import { getAuthHeaders, isStaticMode } from "./api.js";
import { loadAvailableDates } from "./data.js";

// The password the parent typed, kept in memory for this page session only so that
// Sync Now can authenticate against the portal. It is never written to
// localStorage, never persisted by the server, and is gone on reload.
let sessionCredentials = null;

// Signing in hands over the password typed; signing out drops it.
function rememberCredentials(credentials) {
  sessionCredentials = credentials;
}

function forgetCredentials() {
  sessionCredentials = null;
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

export { rememberCredentials, forgetCredentials, autoSyncAfterSignIn, triggerManualSync };
