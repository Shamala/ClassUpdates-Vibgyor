/**
 * Offline support and the Install App button.
 */
import { showToast } from "./toast.svelte.js";

export const pwa = $state({ installVisible: false });

let deferredInstallPrompt = null;

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function initPWA() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    });
  }

  // Already installed and running on its own
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) {
    pwa.installVisible = false;
    return;
  }

  // Android, Chrome and Edge offer a native install prompt
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    pwa.installVisible = true;
  });

  window.addEventListener("appinstalled", () => {
    pwa.installVisible = false;
    deferredInstallPrompt = null;
    showToast("ClassUpdates installed successfully! 📱", "success", 5000);
  });

  // Safari has no prompt, so the button explains how instead
  if (isIos()) pwa.installVisible = true;
}

export async function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
      showToast("Installing ClassUpdates to your device! 🎉", "success", 4000);
    }
    deferredInstallPrompt = null;
    pwa.installVisible = false;
  } else if (isIos()) {
    showToast(
      "To install on iPhone/iPad: Tap the Share button ⎋ at the bottom of Safari and select 'Add to Home Screen' ⊞",
      "info",
      7000,
    );
  } else {
    showToast("To install: Open browser menu (⋮) and select 'Install app' or 'Add to Home Screen' 📲", "info", 5000);
  }
}
