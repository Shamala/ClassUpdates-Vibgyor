/**
 * Which screen the page is showing, set by the boot, sign-in and passcode code
 * and read by the components that draw it.
 *
 * `screen` is one of three:
 * - "dashboard": the class updates, with the whole header;
 * - "login": the local server's sign-in, with only the header's theme and
 *   install buttons;
 * - "passcode": the class board's lock screen, with only the header's brand.
 *   Nothing in the header works before the board is unlocked: the date list has
 *   nothing to list, Sync reaches a portal this page cannot see, and the profile
 *   still shows whoever used this device last.
 */
import { formatSyncStamp } from "./format.js";

export const shell = $state({
  screen: "dashboard",
  // The published board: no Sync button, and Sign Out reads "Lock".
  classBoard: false,
  // The sample bundle shown to someone without the passcode.
  viewingSample: false,
  dailyLoading: false,
  // When the freshness stamp was last drawn (0: never), which is also the
  // moment its "x hours ago" is measured from.
  stampDrawnAt: 0,
});

// The class passcode screen. showPasscodeView() fills it in; bumping
// focusRequest puts the cursor back in the box.
export const passcode = $state({
  value: "",
  error: "",
  syncedAt: "",
  submitting: false,
  focusRequest: 0,
});

// The sign-in screen (local server only). handleLoginSubmit() and
// handleDemoLogin() in signIn.js read the typed values and report back here.
export const login = $state({
  username: "",
  password: "",
  error: "Invalid username or password",
  errorShown: false,
  submitting: false,
  demoBusy: false,
});

// The header's profile clears itself: it draws nothing while state.student is null,
// which it always is by the time this runs.
export function showLoginView() {
  shell.screen = "login";
}

export function showDashboardView() {
  shell.screen = "dashboard";
  renderSyncStamp();
}

export function showPasscodeView(message) {
  shell.screen = "passcode";

  const blob = window.VIBGYOR_ENCRYPTED_DATA;
  if (blob && blob.synced_at) {
    passcode.syncedAt = `Class updates last refreshed ${formatSyncStamp(blob.synced_at)}`;
  }
  passcode.error = message || "";
  passcode.value = "";
  passcode.focusRequest++;
}

// The header's freshness stamp is measured from the moment it is drawn, as the
// old one was; this redraws it.
export function renderSyncStamp() {
  shell.stampDrawnAt = Date.now();
}
