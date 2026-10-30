/**
 * The Word History pop-up: whether it is open, which mode it is in (the word
 * list or the flashcards), the current flashcard set and which past weeks are
 * expanded. Expanded weeks stay expanded the next time it opens.
 */
import { state } from "../state.svelte.js";
import { showToast } from "../toast.svelte.js";
import { groupWordWeeks, drillWordsFor } from "./wordHistory.js";

export const wordModal = $state({
  open: false,
  mode: "bank", // 'bank' (the list) or 'drill' (flashcards)
  drillIndex: 0,
  drillWords: [],
  isWordHidden: false,
  expandedWeeks: {}, // mondayKey: boolean
});

function prepareDrill(scope) {
  wordModal.drillWords = drillWordsFor(groupWordWeeks(state.availableDates, state.selectedDate), scope);
  wordModal.drillIndex = 0;
  wordModal.isWordHidden = false;
}

export function openWordHistory() {
  prepareDrill("this_week");
  wordModal.mode = "bank";
  wordModal.open = true;
}

export function closeWordHistory() {
  wordModal.open = false;
}

export function setWordMode(mode) {
  wordModal.mode = mode;
  if (mode === "drill" && wordModal.drillWords.length === 0) {
    prepareDrill("this_week");
  }
}

export function startDrill(scope) {
  prepareDrill(scope);
  setWordMode("drill");
}

export function toggleWeek(mondayKey) {
  wordModal.expandedWeeks[mondayKey] = !wordModal.expandedWeeks[mondayKey];
}

export function toggleWordReveal() {
  wordModal.isWordHidden = !wordModal.isWordHidden;
}

export function prevWord() {
  if (wordModal.drillIndex > 0) {
    wordModal.drillIndex--;
    wordModal.isWordHidden = false;
  }
}

export function nextWord() {
  if (wordModal.drillIndex < wordModal.drillWords.length - 1) {
    wordModal.drillIndex++;
    wordModal.isWordHidden = false;
  }
}

export function shuffleWords() {
  const arr = [...wordModal.drillWords];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  wordModal.drillWords = arr;
  wordModal.drillIndex = 0;
  wordModal.isWordHidden = false;
  showToast("Flashcards shuffled 🔀", "info");
}

export function copyWords(words) {
  if (!words.length) return;
  navigator.clipboard.writeText(words.join(", ")).then(
    () => showToast("Copied words to clipboard! 📋", "success"),
    () => showToast("Could not copy to clipboard", "error"),
  );
}
