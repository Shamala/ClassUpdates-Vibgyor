/**
 * The pop-up that asks for the child's name, opened by clicking the name in the
 * header. The name is kept on this device only.
 */
import { state } from "../state.svelte.js";
import { shell } from "../shell.svelte.js";
import { showToast } from "../toast.svelte.js";
import { isPlaceholderStudentName, isDemoStudent } from "../student.js";

export const nameModal = $state({ open: false, value: "" });

export function editStudentName() {
  if (!state.isAuthenticated || isDemoStudent(state.student)) return;
  const current = state.student ? state.student.name : "";
  nameModal.value = isPlaceholderStudentName(current) ? "" : current;
  nameModal.open = true;
}

export function closeNameModal() {
  nameModal.open = false;
}

export function submitStudentName() {
  const entered = nameModal.value.trim();
  closeNameModal();
  if (!entered || !state.student) return;

  // Match the backend's capitalisation so a typed name and a synced one look alike
  const name = entered
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  if (name === state.student.name) return;
  state.student.name = name;

  // The sample is nobody's child, so nothing typed while viewing it is kept
  if (!shell.viewingSample) {
    if (state.currentUser && state.currentUser.username) {
      localStorage.setItem(
        "vibgyor_student_for_" + state.currentUser.username.toLowerCase(),
        JSON.stringify(state.student),
      );
    }
    localStorage.setItem("vibgyor_parent_student", JSON.stringify(state.student));
  }
  showToast(`Updated student name to ${state.student.name} ⭐`, "success", 3000);
}
