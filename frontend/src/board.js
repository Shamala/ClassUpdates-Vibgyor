/**
 * The published class board: unlocking it with the class passcode, or showing
 * the sample to someone who has not been given it.
 */

import { state } from "./state.svelte.js";
import { isStaticMode, decryptClassData } from "./api.js";
import { PASSCODE_STORAGE_KEY } from "./storage.js";
import {
  shell,
  passcode,
  showPasscodeView,
  showDashboardView,
  renderSyncStamp,
} from "./shell.svelte.js";
import { applyStudentProfile } from "./student.js";
import { loadAvailableDates } from "./data.js";

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
    await enterClassBoard();
  } catch (err) {
    showPasscodeView(
      "That passcode does not match. Check with the class parent who shared it.",
    );
  } finally {
    passcode.submitting = false;
  }
}

export {
  isClassBoard,
  unlockClassData,
  viewSampleInstead,
  enterClassBoard,
  handlePasscodeSubmit,
};
