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

export { formatDatePretty, getDayName };
