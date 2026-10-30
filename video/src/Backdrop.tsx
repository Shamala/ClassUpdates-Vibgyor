import { AbsoluteFill } from "remotion";
import { fontFamily } from "./fonts";

// The app's page: a pale background under its rainbow VIBGYOR strip.
export const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: "#f8fafc", fontFamily, color: "#0f172a" }}>
    <AbsoluteFill
      style={{
        height: 14,
        background: "linear-gradient(90deg, #7c3aed 0%, #2563eb 20%, #06b6d4 40%, #10b981 60%, #eab308 80%, #ef4444 100%)",
      }}
    />
    {children}
  </AbsoluteFill>
);
