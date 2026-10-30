/**
 * The dictation words of every recorded day, grouped into school weeks, for the
 * Word History pop-up and its flashcards.
 */

// The Monday of the week an ISO date falls in, as an ISO date.
export function getMondayOfWeek(isoDate) {
  if (!isoDate) return "";
  try {
    const parts = isoDate.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dateNum = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dateNum}`;
  } catch (e) {
    return isoDate;
  }
}

// "Oct 26 – Oct 30": Monday to Friday of the week starting on mondayIso.
export function getWeekRangeLabel(mondayIso) {
  try {
    const parts = mondayIso.split("-");
    const m = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const f = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    f.setDate(f.getDate() + 4);
    const mStr = m.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const fStr = f.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${mStr} – ${fStr}`;
  } catch (e) {
    return mondayIso;
  }
}

/**
 * The days that have words, by the Monday of their week (each week's days in
 * date order, the weeks newest first), and which week counts as "this week":
 * the selected date's, or failing that the newest day's.
 */
export function groupWordWeeks(availableDates, selectedDate) {
  const datesWithWords = (availableDates || []).filter(
    (d) => d.words_of_the_day && d.words_of_the_day.length > 0,
  );

  const refDate =
    selectedDate || (datesWithWords[0] ? datesWithWords[0].date : new Date().toISOString().split("T")[0]);
  const activeMonday = getMondayOfWeek(refDate);

  const weeksMap = {};
  datesWithWords.forEach((d) => {
    const monday = getMondayOfWeek(d.date);
    if (!weeksMap[monday]) {
      weeksMap[monday] = [];
    }
    weeksMap[monday].push(d);
  });

  Object.keys(weeksMap).forEach((mKey) => {
    weeksMap[mKey].sort((a, b) => a.date.localeCompare(b.date));
  });

  const sortedWeekKeys = Object.keys(weeksMap).sort((a, b) => b.localeCompare(a));

  return { activeMonday, weeksMap, sortedWeekKeys };
}

// A week's words, trimmed, each once, in the order they were taught.
export function weekWords(days) {
  const words = [];
  (days || []).forEach((d) => {
    (d.words_of_the_day || []).forEach((w) => {
      const trimmed = w.trim();
      if (trimmed && !words.includes(trimmed)) {
        words.push(trimmed);
      }
    });
  });
  return words;
}

/**
 * The flashcards for a practice set: "this_week", "week_<monday>" or "all".
 * Each word appears once regardless of case, with the day it was taught.
 */
export function drillWordsFor(history, scope = "this_week") {
  const { activeMonday, weeksMap, sortedWeekKeys } = history;
  let days = [];

  if (scope === "this_week" && weeksMap[activeMonday]) {
    days = weeksMap[activeMonday];
  } else if (scope.startsWith("week_")) {
    const wKey = scope.replace("week_", "");
    days = weeksMap[wKey] || [];
  } else if (scope === "all") {
    sortedWeekKeys.forEach((mKey) => {
      days = days.concat(weeksMap[mKey] || []);
    });
  } else {
    if (weeksMap[activeMonday] && weeksMap[activeMonday].length > 0) {
      days = weeksMap[activeMonday];
    } else if (sortedWeekKeys.length > 0) {
      days = weeksMap[sortedWeekKeys[0]];
    }
  }

  const words = [];
  days.forEach((d) => {
    (d.words_of_the_day || []).forEach((w) => {
      const trimmed = w.trim();
      if (trimmed && !words.some((existing) => existing.word.toLowerCase() === trimmed.toLowerCase())) {
        words.push({ word: trimmed, date: d.date, display_date: d.display_date });
      }
    });
  });
  return words;
}
