/**
 * Moving between tabs and dates. The tab bar and the views redraw from
 * state.currentTab and state.selectedDate; these also load what they show.
 */

import { state } from "./state.svelte.js";
import { loadDailyUpdate, loadWeeklyUpdate, loadCirculars } from "./data.js";

// The tab bar and the three views redraw from state.currentTab.
function switchTab(tabName) {
  state.currentTab = tabName;

  if (tabName === "daily") {
    loadDailyUpdate(state.selectedDate);
  } else if (tabName === "weekly") {
    loadWeeklyUpdate(state.selectedDate);
  } else if (tabName === "circulars") {
    loadCirculars();
  }
}

function selectDateAndSwitch(date) {
  state.selectedDate = date;
  switchTab("daily");
}

// The header's date picker.
function chooseDate(date) {
  state.selectedDate = date;
  if (state.currentTab === "daily") {
    loadDailyUpdate(state.selectedDate);
  } else if (state.currentTab === "weekly") {
    loadWeeklyUpdate(state.selectedDate);
  }
}

export {
  switchTab,
  selectDateAndSwitch,
  chooseDate,
};
