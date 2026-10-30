/**
 * Which circulars the Circulars tab shows for a category and a search.
 */

// "all", or a category matched without regard to case; the search looks in the
// title and the summary.
export function filterCirculars(circulars, category, searchTerm) {
  const term = (searchTerm || "").toLowerCase();
  return (circulars || []).filter((c) => {
    const matchesCat = category === "all" || c.category.toLowerCase() === category.toLowerCase();
    const matchesSearch =
      !term || c.title.toLowerCase().includes(term) || (c.summary && c.summary.toLowerCase().includes(term));
    return matchesCat && matchesSearch;
  });
}

export const CATEGORIES = [
  { key: "all", label: "All Notices" },
  { key: "academic", label: "Academic" },
  { key: "events", label: "Events" },
  { key: "sports", label: "Sports" },
  { key: "admin", label: "Admin" },
];
