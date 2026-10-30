/**
 * Loading the class content into `state`, from the local server or from the
 * bundled data on the published board, and ticking homework off.
 */

import { showToast } from "./toast.svelte.js";
import { API_BASE, state } from "./state.svelte.js";
import { getAuthHeaders, isStaticMode, getStaticData } from "./api.js";
import { getStoredCompletedHwIds, saveStoredCompletedHwIds } from "./storage.js";
import { shell } from "./shell.svelte.js";

function loadStaticAvailableDates() {
  const staticData = getStaticData();
  if (!staticData || !staticData.dates) {
    showToast("Static data not available", "error");
    return;
  }
  const completedHw = getStoredCompletedHwIds();
  const dates = JSON.parse(JSON.stringify(staticData.dates));

  dates.forEach((d) => {
    const dailyForDate = staticData.daily ? staticData.daily[d.date] : null;
    if (dailyForDate && dailyForDate.periods) {
      const hwPeriods = dailyForDate.periods.filter((p) => p.is_homework);
      const completedCount = hwPeriods.filter((p) =>
        completedHw.has(Number(p.id)),
      ).length;
      d.homework_count = hwPeriods.length;
      d.completed_homework_count = completedCount;
      d.has_pending_homework = hwPeriods.length > completedCount;
    }
  });

  state.availableDates = dates;

  if (state.availableDates.length > 0) {
    if (
      !state.selectedDate ||
      !state.availableDates.some((d) => d.date === state.selectedDate)
    ) {
      state.selectedDate = state.availableDates[0].date;
    }
  }
}

async function loadAvailableDates() {
  if (isStaticMode()) {
    loadStaticAvailableDates();
    if (state.selectedDate) {
      loadStaticDailyUpdate(state.selectedDate);
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/dates`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      state.availableDates = await res.json();

      if (state.availableDates.length > 0) {
        state.selectedDate = state.availableDates[0].date;
        await loadDailyUpdate(state.selectedDate);
      } else {
        showToast("No updates found. Try syncing.", "warning");
      }
      return;
    }
  } catch (err) {
    console.warn(
      "Failed to load dates from server, falling back to static data:",
      err,
    );
  }
  loadStaticAvailableDates();
  if (state.selectedDate) {
    loadStaticDailyUpdate(state.selectedDate);
  }
}

function loadStaticDailyUpdate(date) {
  const staticData = getStaticData();
  if (!staticData || !staticData.daily) {
    showToast("Could not load updates for this date", "error");
    return;
  }

  let dailySource = staticData.daily[date];
  if (!dailySource) {
    const firstKey = Object.keys(staticData.daily)[0];
    if (firstKey) dailySource = staticData.daily[firstKey];
  }

  if (!dailySource) {
    showToast("Could not load updates for this date", "error");
    return;
  }

  const dailyCopy = JSON.parse(JSON.stringify(dailySource));
  const completedHw = getStoredCompletedHwIds();

  if (dailyCopy.periods) {
    dailyCopy.periods.forEach((p) => {
      p.is_completed = completedHw.has(Number(p.id));
    });
    const hwPeriods = dailyCopy.periods.filter((p) => p.is_homework);
    const completedCount = hwPeriods.filter((p) =>
      completedHw.has(Number(p.id)),
    ).length;
    dailyCopy.homework_count = hwPeriods.length;
    dailyCopy.completed_homework_count = completedCount;
    dailyCopy.has_pending_homework = hwPeriods.length > completedCount;
  }

  // The Daily tab's Svelte components redraw from this on their own.
  state.dailyData = dailyCopy;
}

async function loadDailyUpdate(date) {
  if (!date) return;
  shell.dailyLoading = true;

  if (isStaticMode()) {
    loadStaticDailyUpdate(date);
    shell.dailyLoading = false;
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/updates/daily?date=${encodeURIComponent(date)}`,
      { headers: getAuthHeaders() },
    );
    if (res.ok) {
      state.dailyData = await res.json();
      return;
    }
  } catch (err) {
    console.warn(
      "Failed to fetch daily update from backend, falling back to static:",
      err,
    );
  } finally {
    shell.dailyLoading = false;
  }
  loadStaticDailyUpdate(date);
}

function loadStaticWeeklyUpdate() {
  const staticData = getStaticData();
  if (!staticData || !staticData.weekly) return;

  const weeklyCopy = JSON.parse(JSON.stringify(staticData.weekly));
  const completedHw = getStoredCompletedHwIds();

  if (weeklyCopy.days) {
    weeklyCopy.days.forEach((day) => {
      if (day.homework) {
        day.homework.forEach((hw) => {
          hw.is_completed = completedHw.has(Number(hw.period_id || hw.id));
        });
      }
    });
  }

  if (weeklyCopy.active_homework_items) {
    weeklyCopy.active_homework_items.forEach((item) => {
      item.is_completed = completedHw.has(Number(item.period_id || item.id));
    });
  }

  state.weeklyData = weeklyCopy;
}

async function loadWeeklyUpdate(date) {
  if (isStaticMode()) {
    loadStaticWeeklyUpdate();
    return;
  }

  try {
    const url = date
      ? `${API_BASE}/api/updates/weekly?start_date=${encodeURIComponent(date)}`
      : `${API_BASE}/api/updates/weekly`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) {
      state.weeklyData = await res.json();
      return;
    }
  } catch (err) {
    console.warn(
      "Failed to fetch weekly update from server, falling back to static:",
      err,
    );
  }
  loadStaticWeeklyUpdate();
}

function loadStaticCirculars() {
  const staticData = getStaticData();
  if (!staticData || !staticData.circulars) return;
  state.circulars = JSON.parse(JSON.stringify(staticData.circulars));
}

async function loadCirculars() {
  if (isStaticMode()) {
    loadStaticCirculars();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/circulars`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      state.circulars = await res.json();
      return;
    }
  } catch (err) {
    console.warn("Failed to fetch circulars, falling back to static:", err);
  }
  loadStaticCirculars();
}

async function refreshAvailableDatesDropdown() {
  if (isStaticMode()) {
    loadStaticAvailableDates();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/dates`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      state.availableDates = await res.json();
      return;
    }
  } catch (err) {
    console.warn("Failed to refresh dates from server, using static:", err);
  }
  loadStaticAvailableDates();
}

async function toggleHomework(periodId) {
  const pId = Number(periodId);
  if (isStaticMode()) {
    const completedSet = getStoredCompletedHwIds();
    let isNowCompleted = false;
    if (completedSet.has(pId)) {
      completedSet.delete(pId);
      isNowCompleted = false;
    } else {
      completedSet.add(pId);
      isNowCompleted = true;
    }
    saveStoredCompletedHwIds(completedSet);

    showToast(
      isNowCompleted
        ? "Done! Homework marked complete ⭐"
        : "Homework marked pending",
      "success",
      6000,
    );

    if (state.currentTab === "daily") {
      loadStaticDailyUpdate(state.selectedDate);
    } else if (state.currentTab === "weekly") {
      loadStaticWeeklyUpdate();
    }
    loadStaticAvailableDates();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/homework/${periodId}/toggle`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      showToast(
        data.period.is_completed
          ? "Done! Homework marked complete ⭐"
          : "Homework marked pending",
        "success",
        6000,
      );
      // Refresh current view
      if (state.currentTab === "daily") {
        await loadDailyUpdate(state.selectedDate);
      } else if (state.currentTab === "weekly") {
        await loadWeeklyUpdate(state.selectedDate);
      }
      // Refresh date dropdown so "📌 HW Due" badge updates dynamically
      await refreshAvailableDatesDropdown();
      return;
    }
  } catch (err) {
    console.warn(
      "Toggle error on server, falling back to local browser storage:",
      err,
    );
  }

  // Fallback to local storage
  const completedSet = getStoredCompletedHwIds();
  const isNowCompleted = !completedSet.has(pId);
  if (isNowCompleted) completedSet.add(pId);
  else completedSet.delete(pId);
  saveStoredCompletedHwIds(completedSet);
  showToast(
    isNowCompleted
      ? "Done! Homework marked complete ⭐"
      : "Homework marked pending",
    "success",
    6000,
  );
  if (state.currentTab === "daily") loadStaticDailyUpdate(state.selectedDate);
  else if (state.currentTab === "weekly") loadStaticWeeklyUpdate();
  loadStaticAvailableDates();
}

export {
  loadAvailableDates,
  loadDailyUpdate,
  loadWeeklyUpdate,
  loadCirculars,
  toggleHomework,
};
