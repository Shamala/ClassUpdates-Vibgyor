/**
 * Which parts of the page shell are showing, set by the boot, sign-in and
 * passcode code in app.js and read by the components that draw them.
 *
 * Each flag stands for one element's `hidden` class in the old page, and the
 * functions that used to toggle those classes now set these instead, in the
 * same order, so every combination the page could get into is unchanged.
 */
export const shell = $state({
  passcodeView: false,
  loginView: false,
  dashboardView: true,
  headerControls: true,
  mobileProfile: false,
  tabsBar: true,
  authControls: true,
  dateWrap: true,
  // The published board: no Sync button, and Sign Out reads "Lock".
  classBoard: false,
  // The sample bundle shown to someone without the passcode.
  viewingSample: false,
  dailyLoading: false,
  // When the freshness stamp was last drawn (0: never), which is also the
  // moment its "x hours ago" is measured from.
  stampDrawnAt: 0,
});

// Hides the header's controls before the board is unlocked: the date list has
// nothing to list, Sync reaches a portal this page cannot see, and the profile
// still shows whoever used this device last.
export function setHeaderHidden(hidden) {
  shell.headerControls = !hidden;
  shell.mobileProfile = !hidden;
  shell.tabsBar = !hidden;
}

// The class passcode screen. showPasscodeView() in app.js fills it in; bumping
// focusRequest puts the cursor back in the box.
export const passcode = $state({
  value: "",
  error: "",
  syncedAt: "",
  submitting: false,
  focusRequest: 0,
});

// The sign-in screen (local server only). handleLoginSubmit() and
// handleDemoLogin() in app.js read the typed values and report back here.
export const login = $state({
  username: "",
  password: "",
  error: "Invalid username or password",
  errorShown: false,
  submitting: false,
  demoBusy: false,
});
