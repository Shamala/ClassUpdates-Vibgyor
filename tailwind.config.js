/**
 * The CDN build used to read this config from a <script> tag in index.html.
 * It is the same configuration; it just runs at build time now, so the browser
 * is handed finished CSS instead of compiling it on every page load.
 */
module.exports = {
  darkMode: "class",
  // Scanned as plain text, so every utility must appear as a literal string.
  // The dashboard builds its markup in template literals with the class names
  // written out in full, which this picks up.
  content: ["./frontend/index.html", "./frontend/app.js"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Commissioner", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
};
