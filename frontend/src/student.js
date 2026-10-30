/**
 * Reading the child's profile for display.
 */

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
