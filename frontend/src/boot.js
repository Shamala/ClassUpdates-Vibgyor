/**
 * Starts the app once the page is drawn: unlocks the board, or signs in.
 */

import { isStaticMode } from "./api.js";
import { migrateStudentStorage } from "./storage.js";
import { showPasscodeView, renderSyncStamp } from "./shell.svelte.js";
import { initTheme } from "./theme.svelte.js";
import { initPWA } from "./pwa.svelte.js";
import { isClassBoard, unlockClassData, enterClassBoard } from "./board.js";
import { checkAuth } from "./signIn.js";

async function boot() {
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
}

export {
  boot,
};
