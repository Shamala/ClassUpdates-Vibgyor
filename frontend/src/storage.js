/**
 * What the dashboard keeps in this browser's localStorage.
 */

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

// --- Class passcode (published board only) ---
//
// The published class content is encrypted with the class passcode, so fetching
// the data file directly yields ciphertext rather than the diary. The passcode
// is never sent anywhere: it stays in this browser and only derives the key.
const PASSCODE_STORAGE_KEY = "vibgyor_class_passcode";

// Until the sample stopped writing to storage, it saved the name a parent typed
// against the board's own key: the two are both the "class" user. A name typed
// at the sample and a name typed at the real board are identical once saved, so
// there is no way to tell them apart afterwards and no way to delete only the
// wrong one. Clearing the board's saved child once is the only honest remedy;
// bump this and it happens again on every device, exactly once.
const STUDENT_STORAGE_VERSION = "2";
const STUDENT_STORAGE_VERSION_KEY = "vibgyor_student_storage_version";
const BOARD_STUDENT_KEYS = [
  "vibgyor_parent_student",
  "vibgyor_student_for_class",
];

function migrateStudentStorage() {
  try {
    if (
      localStorage.getItem(STUDENT_STORAGE_VERSION_KEY) ===
      STUDENT_STORAGE_VERSION
    ) {
      return;
    }
    // Only the board's own keys: a name saved against a real sign-in lives under
    // vibgyor_student_for_<email> and is nobody's mistake.
    BOARD_STUDENT_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(STUDENT_STORAGE_VERSION_KEY, STUDENT_STORAGE_VERSION);
  } catch (e) {}
}

export {
  getStoredCompletedHwIds,
  saveStoredCompletedHwIds,
  getSavedStudentForUser,
  PASSCODE_STORAGE_KEY,
  migrateStudentStorage,
};
