/**
 * The CDN build used to read this config from a <script> tag in index.html.
 * It is the same configuration; it just runs at build time now, so the browser
 * is handed finished CSS instead of compiling it on every page load.
 */
// Colours follow @shamallya-ui/tokens. The app's existing Tailwind palette names are
// re-pointed at the ShaMallya ramps, so every existing class picks up the brand without
// markup changes, and opacity modifiers (bg-slate-900/60) keep working because the
// values are literal hex at build time. This is a migration bridge: new code should use
// the semantic tokens (var(--shamallya-semantic-...)) instead of palette steps.
const resolved = require("@shamallya-ui/tokens/resolved").light;
const ramp = (hue) =>
  Object.fromEntries(
    ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"].map((step) => [
      step,
      resolved[`shamallya.primitive.color.${hue}.${step}`],
    ]),
  );

module.exports = {
  darkMode: "class",
  // Scanned as plain text, so every utility must appear as a literal string.
  // The dashboard builds its markup in template literals with the class names
  // written out in full, which this picks up.
  content: [
    "./frontend/index.html",
    "./frontend/src/**/*.{js,svelte}",
  ],
  theme: {
    extend: {
      colors: {
        slate: ramp("neutral"),
        indigo: ramp("blue"),
        blue: ramp("blue"),
        amber: ramp("yellow"),
        emerald: ramp("green"),
        rose: ramp("red"),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
};
