/**
 * Maps the timetable's subject spellings onto canonical names and the badge
 * colours defined in style.css.
 */

// --- Helpers ---
function getCanonicalSubject(rawSubj) {
  if (!rawSubj) return "General";
  let s = rawSubj.trim();
  // Strip trailing (S), (s), (Support), (Spoken)
  s = s.replace(/\s*\([Ss](?:upport|poken)?\)\s*$/i, "").trim();
  if (/^computer(s)?$/i.test(s)) return "Computers";
  if (/^skill programm?e$/i.test(s)) return "Skill Program";
  if (/^literature$/i.test(s)) return "English Literature";
  return s;
}

function getSubjectHeaderClass(subject) {
  const s = (subject || "").toLowerCase();
  if (s.includes("math")) return "subject-header-math";
  if (
    s.includes("english") ||
    s.includes("language") ||
    s.includes("literature")
  )
    return "subject-header-english";
  if (s.includes("science")) return "subject-header-science";
  if (s.includes("robotics")) return "subject-header-robotics";
  if (s.includes("kannada")) return "subject-header-kannada";
  if (s.includes("hindi")) return "subject-header-hindi";
  if (s.includes("spa") || s.includes("art") || s.includes("physical"))
    return "subject-header-spa";
  if (s.includes("computer")) return "subject-header-computers";
  return "subject-header-default";
}

function getSubjectBadgeClass(subject) {
  const s = (subject || "").toLowerCase();
  if (s.includes("math")) return "subject-badge-math";
  if (
    s.includes("english") ||
    s.includes("language") ||
    s.includes("literature")
  )
    return "subject-badge-english";
  if (s.includes("science")) return "subject-badge-science";
  if (s.includes("robotics")) return "subject-badge-robotics";
  if (s.includes("kannada")) return "subject-badge-kannada";
  if (s.includes("hindi")) return "subject-badge-hindi";
  if (s.includes("spa") || s.includes("art") || s.includes("physical"))
    return "subject-badge-spa";
  if (s.includes("computer")) return "subject-badge-computers";
  return "subject-badge-default";
}

function getCircularCategoryBadge(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("acad"))
    return "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50";
  if (c.includes("sport"))
    return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50";
  if (c.includes("event"))
    return "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50";
  return "bg-slate-100 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-600/50";
}

export {
  getCanonicalSubject,
  getSubjectHeaderClass,
  getSubjectBadgeClass,
  getCircularCategoryBadge,
};
