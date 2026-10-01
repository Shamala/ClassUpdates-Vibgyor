/**
 * Entry point. Starts the vanilla dashboard, then mounts the parts of the page
 * that have moved to Svelte. Each phase of the migration adds a line here until
 * the whole page is one component.
 */
import { mount } from "svelte";
import "../app.js";
import Toast from "./Toast.svelte";
import WordsHero from "./daily/WordsHero.svelte";
import TeacherNote from "./daily/TeacherNote.svelte";

mount(Toast, { target: document.getElementById("toast") });
mount(WordsHero, { target: document.getElementById("hero-words-container") });

// Mounted before a placeholder rather than into a wrapper, so the section sits
// directly in the Daily tab's spaced column as it did when it was static HTML.
function mountAt(Component, slotId) {
  const slot = document.getElementById(slotId);
  mount(Component, { target: slot.parentNode, anchor: slot });
}
mountAt(TeacherNote, "teacher-note-slot");
