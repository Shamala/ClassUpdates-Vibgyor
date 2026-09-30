/**
 * Where the dashboard's data comes from: the backend, or the static bundle.
 */
import { state } from "./state.js";

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (state.authToken) {
    headers["Authorization"] = `Bearer ${state.authToken}`;
  }
  return headers;
}

// --- Client-Side Static Mode Helpers (for GitHub Pages & Offline Use) ---

// Lets the published board be previewed against the local server, which
// otherwise runs as the publisher's own tool and shows the portal sign-in.
// Setting window.__FORCE_STATIC_MODE by hand cannot do this: a reload starts a
// fresh page and the flag is gone before the boot reads it. Remembered for the
// tab so reloads keep the preview; "?board=0" ends it.
const BOARD_PREVIEW_KEY = "vibgyor_board_preview";

function boardPreviewRequested() {
  try {
    const asked = new URLSearchParams(window.location.search).get("board");
    if (asked !== null) {
      const on = asked !== "0" && asked !== "false";
      if (on) sessionStorage.setItem(BOARD_PREVIEW_KEY, "1");
      else sessionStorage.removeItem(BOARD_PREVIEW_KEY);
      return on;
    }
    return sessionStorage.getItem(BOARD_PREVIEW_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function isStaticMode() {
  return (
    window.location.hostname.endsWith("github.io") ||
    window.location.protocol === "file:" ||
    Boolean(window.__FORCE_STATIC_MODE) ||
    boardPreviewRequested()
  );
}

function getStaticData() {
  return window.VIBGYOR_STATIC_DATA || null;
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function decryptClassData(passcode, blob) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passcode),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(blob.salt),
      iterations: blob.iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(blob.iv) },
    key,
    fromBase64(blob.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

export { getAuthHeaders, isStaticMode, getStaticData, decryptClassData };
