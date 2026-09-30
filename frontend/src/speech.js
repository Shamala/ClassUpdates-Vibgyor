/**
 * Pronunciation for the spelling flashcards (Web Speech API).
 */

import { showToast } from "./toast.svelte.js";

// --- Pronunciation (Web Speech API) ---
//
// The drill words are standard storybook English, never proper nouns, so en-US is
// always the right target. Regional voices (en-IN, en-GB, en-AU) differ on exactly
// the vowels a child is learning to spell, so they are a last resort.
const SPEECH_LANG = "en-US";

// Novelty and character voices that some platforms still list, including the macOS
// Eddy / Flo / Grandma / Reed / Rocko family. Several are en-US and one is even the
// system default, so without this they outrank the voice you actually want.
const UNUSABLE_VOICE_PATTERN =
  /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|eddy|flo|fred|good news|grandma|grandpa|hysterical|jester|junior|kathy|organ|ralph|reed|rocko|sandy|shelley|superstar|trinoids|whisper|wobble|zarvox|eloquence)\b/i;

// Markers vendors use for their neural / high-quality voices.
const NATURAL_VOICE_PATTERN = /natural|neural|premium|enhanced|siri/i;

// Known-clear general-purpose voices, so the winner is deterministic rather than
// whichever acceptable voice the platform happened to list first.
const PREFERRED_VOICE_PATTERN =
  /\b(samantha|alex|ava|allison|susan|nicky|tom|aaron|evan|joelle|noelle|zoe|google us english|zira|david|aria|jenny|guy|andrew|emma)\b/i;

// A single word gives the engine no context, so homographs ("read", "lead", "live",
// "tear", "bow", "wind") get the engine's most frequent reading, which may not be
// the one the story used. No rate or voice setting can fix that, because it is a
// word-sense choice rather than an audio-quality one. Respell a word here to force
// the intended reading, e.g. read: "reed".
const PRONUNCIATION_OVERRIDES = {};

// Storybook words can contain an apostrophe ("don't"), which breaks a single-quoted
// inline handler. Emit the argument as a double-quoted JS string with the quotes
// entity-encoded, so the HTML parser hands the handler back a correct literal.
function toInlineArg(value) {
  return JSON.stringify(String(value)).replace(/"/g, "&quot;");
}

let voicesLoadedPromise = null;

function getVoicesAsync() {
  const synth = window.speechSynthesis;
  const ready = synth.getVoices();
  if (ready.length) return Promise.resolve(ready);

  if (!voicesLoadedPromise) {
    voicesLoadedPromise = new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve(synth.getVoices());
      };
      if (synth.addEventListener) {
        synth.addEventListener("voiceschanged", finish, { once: true });
      }
      // Safari and some Android builds never fire voiceschanged
      setTimeout(finish, 1000);
    });
  }
  return voicesLoadedPromise;
}

function scoreVoice(voice, preferLocal) {
  if (UNUSABLE_VOICE_PATTERN.test(voice.name)) return -Infinity;

  const lang = (voice.lang || "").replace("_", "-");
  let score;
  if (lang === SPEECH_LANG) score = 100;
  else if (lang.startsWith("en")) score = 20;
  else return -Infinity; // never read English words with a non-English voice

  if (NATURAL_VOICE_PATTERN.test(voice.name)) score += 40;
  if (PREFERRED_VOICE_PATTERN.test(voice.name)) score += 25;

  // localService === false means the browser ships the text to a server and streams
  // the audio back. That is a better voice when it works, but it is silent when the
  // parent is offline, which this PWA explicitly supports. An on-device voice
  // therefore wins any tie, and is the only candidate at all when offline.
  if (voice.localService) score += preferLocal ? 60 : 20;
  else if (preferLocal) return -Infinity;

  if (voice.default) score += 5;
  return score;
}

function pickVoice(voices, preferLocal) {
  let best = null;
  let bestScore = -Infinity;
  voices.forEach((voice) => {
    const score = scoreVoice(voice, preferLocal);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  });
  return best;
}

async function speakForSpelling(word) {
  if (!word) return;
  if (!("speechSynthesis" in window)) {
    showToast("Pronunciation audio not supported on this browser", "info");
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel(); // no overlapping audio if the button is tapped twice

  const cleaned = String(word).trim().replace(/[.\s]+$/, "");
  if (!cleaned) return;
  const spoken = PRONUNCIATION_OVERRIDES[cleaned.toLowerCase()] || cleaned;

  const voices = await getVoicesAsync();
  // navigator.onLine only reports whether an interface exists, so it is a hint, not
  // a guarantee; the watchdog below is what actually catches a dead network voice.
  const offline = navigator.onLine === false;
  const localVoice = pickVoice(voices, true);
  const firstChoice = pickVoice(voices, offline) || localVoice;

  let usedFallback = false;

  const speakWith = (voice, isFallback) => {
    // A bare word makes some engines use list intonation; a terminal period gives
    // the falling contour of a finished utterance, which sounds less clipped.
    const utterance = new SpeechSynthesisUtterance(spoken + ".");
    utterance.lang = SPEECH_LANG;
    // 0.85 keeps each phoneme distinct for spelling practice without the dragged,
    // slurred quality that rates below ~0.8 produce on most engines.
    utterance.rate = 0.85;
    // Shifting pitch moves the formants too, which is what makes a voice sound
    // synthetic. Natural pitch is clearer for a child than a "friendlier" one.
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (voice) utterance.voice = voice;

    let started = false;
    utterance.onstart = () => {
      started = true;
    };

    const fallBackToLocal = () => {
      if (usedFallback || isFallback || !localVoice || localVoice === voice) return;
      usedFallback = true;
      synth.cancel();
      speakWith(localVoice, true);
    };

    utterance.onerror = (event) => {
      if (event && event.error === "canceled") return;
      fallBackToLocal();
    };

    synth.speak(utterance);

    // Chrome can leave the queue paused after a cancel()
    if (synth.paused) synth.resume();

    // A network voice that never starts fails silently: no audio, no error. If
    // nothing has begun by now, retry on-device rather than leave the parent
    // tapping a button that does nothing.
    if (!voice || !voice.localService) {
      setTimeout(() => {
        if (!started) fallBackToLocal();
      }, 2500);
    }
  };

  speakWith(firstChoice, false);
}

// Backwards compatibility alias
const speakWord = speakForSpelling;

export {
  toInlineArg,
  speakForSpelling,
  speakWord,
  PRONUNCIATION_OVERRIDES,
};
