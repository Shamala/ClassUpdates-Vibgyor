/**
 * The transient message strip at the bottom of the screen.
 */

let toastTimer = null;
let toastHideTimer = null;

function showToast(message, type = "info", duration = 5000) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  if (toastTimer) clearTimeout(toastTimer);
  if (toastHideTimer) clearTimeout(toastHideTimer);

  const bgClasses = {
    success: "bg-emerald-600 text-white shadow-emerald-900/30",
    warning: "bg-amber-600 text-white shadow-amber-900/30",
    error: "bg-rose-600 text-white shadow-rose-900/30",
    info: "bg-indigo-600 text-white shadow-indigo-900/30",
  };

  const icons = {
    success: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`,
    warning: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    error: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
    info: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  };

  toast.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 font-medium text-sm transition-all duration-300 ${
    bgClasses[type] || bgClasses.info
  }`;
  toast.innerHTML = `
    ${icons[type] || icons.info}
    <span class="flex-1">${message}</span>
    <button onclick="dismissToast()" class="ml-2 -mr-1 p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer" title="Dismiss">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;

  toast.classList.remove("hidden");
  void toast.offsetWidth; // Force reflow
  toast.classList.remove("opacity-0", "translate-y-4");

  toastTimer = setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-4");
    toastHideTimer = setTimeout(() => toast.classList.add("hidden"), 300);
  }, duration);
}

function dismissToast() {
  const toast = document.getElementById("toast");
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);
  if (toastHideTimer) clearTimeout(toastHideTimer);
  toast.classList.add("opacity-0", "translate-y-4");
  toastHideTimer = setTimeout(() => toast.classList.add("hidden"), 300);
}

export { showToast, dismissToast };
