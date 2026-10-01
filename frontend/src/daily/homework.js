/**
 * The day's homework checklist, from the diary's periods.
 */
import { getCanonicalSubject } from "../subjects.js";

// Homework periods, once each - a double period repeats the same homework - with
// the subject name normalised and anything already done moved to the end.
export function activeHomework(periods) {
  const homeworkPeriods = (periods || []).filter((p) => p.is_homework);

  const uniqueHomework = [];
  const seenHw = new Set();
  for (const p of homeworkPeriods) {
    const subj = getCanonicalSubject(p.subject);
    const key = `${subj.toLowerCase()}|${(p.reinforcement || "").toLowerCase()}`;
    if (!seenHw.has(key)) {
      seenHw.add(key);
      uniqueHomework.push({ ...p, subject: subj });
    }
  }

  // Sort completed items last so that pending homework appears first in the list
  uniqueHomework.sort((a, b) => a.is_completed - b.is_completed);
  return uniqueHomework;
}

export function hasDueDate(item) {
  return Boolean(item.submission_date) && item.submission_date.toUpperCase() !== "NIL";
}
