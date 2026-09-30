/**
 * The transient message strip at the bottom of the screen.
 *
 * The state lives here and Toast.svelte draws it. showToast() keeps the
 * signature it had as vanilla JS, so none of its callers had to change.
 *
 * The `.svelte.js` extension is what lets a plain module use runes: `$state`
 * makes `toast` reactive, so assigning to it redraws the component. In React
 * terms it is a store the component subscribes to, with no subscribe call.
 */

export const toast = $state({ open: false, message: "", type: "info" });

let hideTimer = null;

export function showToast(message, type = "info", duration = 5000) {
  clearTimeout(hideTimer);
  toast.message = message;
  toast.type = type;
  toast.open = true;
  hideTimer = setTimeout(dismissToast, duration);
}

export function dismissToast() {
  clearTimeout(hideTimer);
  toast.open = false;
}
