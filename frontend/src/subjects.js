/**
 * Maps the timetable's subject spellings onto canonical names and the tag
 * colours (ShaMallya tag tokens) defined in style.css.
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

// Subject and category colours come from the ShaMallya tag tokens (see .tag-* in style.css).
function subjectHue(subject) {
  const s = (subject || "").toLowerCase();
  if (s.includes("math")) return "blue";
  if (s.includes("english") || s.includes("language") || s.includes("literature")) return "amber";
  if (s.includes("science")) return "green";
  if (s.includes("robotics")) return "purple";
  if (s.includes("kannada")) return "orange";
  if (s.includes("hindi")) return "red";
  if (s.includes("spa") || s.includes("art") || s.includes("physical")) return "pink";
  if (s.includes("computer")) return "indigo";
  return "neutral";
}

function getSubjectHeaderClass(subject) {
  return `tag-${subjectHue(subject)}`;
}

function getSubjectBadgeClass(subject) {
  return `tag-${subjectHue(subject)}`;
}

function getCircularCategoryBadge(cat) {
  const c = (cat || "").toLowerCase();
  const hue = c.includes("acad") ? "blue" : c.includes("sport") ? "green" : c.includes("event") ? "purple" : "neutral";
  return `border tag-${hue}`;
}

export {
  getCanonicalSubject,
  getSubjectHeaderClass,
  getSubjectBadgeClass,
  getCircularCategoryBadge,
};
