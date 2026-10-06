/**
 * The day's homework checklist, from the diary's periods.
 */
import { getCanonicalSubject } from "../subjects.js";

// Homework periods, once each - a double period repeats the same homework - with
// the subject name normalised, in the order the timetable gives them. Ticking
// one off leaves it where it is, so the list does not jump under the parent's finger.
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

  return uniqueHomework;
}

export function hasDueDate(item) {
  return Boolean(item.submission_date) && item.submission_date.toUpperCase() !== "NIL";
}
