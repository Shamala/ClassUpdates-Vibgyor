/**
 * Entry point. Starts the vanilla dashboard, then mounts the parts of the page
 * that have moved to Svelte. Each phase of the migration adds a line here until
 * the whole page is one component.
 */
import { mount } from "svelte";
import "../app.js";
import Toast from "./Toast.svelte";
import WordsHero from "./daily/WordsHero.svelte";

mount(Toast, { target: document.getElementById("toast") });
mount(WordsHero, { target: document.getElementById("hero-words-container") });
