/**
 * Entry point: draws the page, then starts the app.
 */
import { mount } from "svelte";
import { boot } from "./boot.js";
import App from "./App.svelte";

// Mounted before a placeholder rather than into a wrapper, so the page's
// screens stay direct children of <body>, whose flex column lays them out.
const slot = document.getElementById("app-slot");
mount(App, { target: slot.parentNode, anchor: slot });
boot();
