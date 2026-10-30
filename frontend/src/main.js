/**
 * Entry point. Starts the vanilla dashboard, then mounts the parts of the page
 * that have moved to Svelte. Each phase of the migration adds a line here until
 * the whole page is one component.
 */
import { mount } from "svelte";
import "../app.js";
import Toast from "./Toast.svelte";
import Header from "./shell/Header.svelte";
import NameModal from "./shell/NameModal.svelte";
import PasscodeView from "./shell/PasscodeView.svelte";
import DailyView from "./daily/DailyView.svelte";
import WeeklyView from "./weekly/WeeklyView.svelte";
import CircularsView from "./circulars/CircularsView.svelte";
import NoticeModal from "./circulars/NoticeModal.svelte";
import WordHistoryModal from "./words/WordHistoryModal.svelte";

// Mounted before a placeholder rather than into a wrapper, so the component's
// own root element sits where the static HTML used to, with nothing between it
// and the layout around it.
function mountAt(Component, slotId) {
  const slot = document.getElementById(slotId);
  mount(Component, { target: slot.parentNode, anchor: slot });
}

mount(Toast, { target: document.getElementById("toast") });
mountAt(Header, "header-slot");
mountAt(NameModal, "name-modal-slot");
mountAt(PasscodeView, "passcode-view-slot");
mountAt(DailyView, "view-daily-slot");
mountAt(WeeklyView, "view-weekly-slot");
mountAt(CircularsView, "view-circulars-slot");
mountAt(WordHistoryModal, "word-modal-slot");
mountAt(NoticeModal, "notice-modal-slot");
