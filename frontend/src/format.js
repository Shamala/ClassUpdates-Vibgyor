/**
 * Date formatting for the dashboard.
 */

function formatDatePretty(isoDate) {
  if (!isoDate) return "";
  try {
    const parts = isoDate.split("-");
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return isoDate;
  }
}

function getDayName(isoDate) {
  if (!isoDate) return "";
  try {
    const parts = isoDate.split("-");
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-US", { weekday: "long" });
  } catch (e) {
    return "";
  }
}

// "just now", "5 minutes ago", "3 days ago": how long before `now` an ISO
// timestamp was.
function formatSyncStamp(iso, now = Date.now()) {
  const when = new Date(iso);
  if (isNaN(when.getTime())) return iso;
  const mins = Math.round((now - when.getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export { formatDatePretty, getDayName, formatSyncStamp };
