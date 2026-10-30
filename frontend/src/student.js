/**
 * The child's profile: which one applies to whoever is signed in, and how to
 * show it.
 */

import { state, DEMO_STUDENT, GENERIC_STUDENT_FIELDS } from "./state.svelte.js";
import { getStaticData } from "./api.js";
import { getSavedStudentForUser } from "./storage.js";
import { shell } from "./shell.svelte.js";

export const DEMO_STUDENT_ID = "DEMO-G1F-001";

// The backend/PDF sync only knows the real child's name when the Orion scrape
// succeeds; otherwise it hands back one of these placeholders, which must never
// be shown as if it were a name, nor overwrite a name the parent typed in.
export function isPlaceholderStudentName(name) {
  if (!name) return true;
  const n = String(name).trim().toLowerCase();
  if (!n || n === "student" || n === "n/a" || n === "-") return true;
  return n.includes("'s ward");
}

export function isDemoStudent(student) {
  return !!student && student.student_id === DEMO_STUDENT_ID;
}

// Up to two capital letters for the avatar.
export function initials(name) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// The sample exists to be poked at. Whatever a parent types while looking at it
// is about made-up data, so none of it is written down: the sample and the real
// board would otherwise share one device's storage and the demo child's name
// would greet them after they entered the passcode.
function isSampleSession() {
  return shell.viewingSample;
}

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

export { applyStudentProfile, resolveStudentForUser };
