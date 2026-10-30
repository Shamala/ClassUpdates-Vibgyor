/**
 * Dark and light mode. index.html sets the starting class before anything is
 * drawn, so the page never flashes the wrong colours; this keeps it in step with
 * the toggle and with the system setting.
 */
import { showToast } from "./toast.svelte.js";

export const theme = $state({ isDark: false });

function apply(isDark) {
  document.documentElement.classList.toggle("dark", isDark);
  theme.isDark = isDark;
}

export function initTheme() {
  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  apply(stored === "dark" || (!stored && prefersDark));

  // Follow the system setting until the parent picks one themselves
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) apply(e.matches);
  });
}

export function toggleTheme() {
  const isDark = !document.documentElement.classList.contains("dark");
  apply(isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
  showToast(isDark ? "Dark mode activated 🌙" : "Light mode activated ☀️", "info");
}
