import { loadFont } from "@remotion/google-fonts/Commissioner";

// The app's own typeface
export const { fontFamily } = loadFont("normal", {
  weights: ["500", "700", "800"],
  subsets: ["latin"],
});
