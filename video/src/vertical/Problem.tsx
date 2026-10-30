import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../Backdrop";

// The school posts one dense PDF a day.
export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Backdrop>
      <Interactive.Div
        name="PDF page"
        style={{
          position: "absolute",
          left: 280,
          top: 860,
          width: 520,
          height: 740,
          borderRadius: 24,
          backgroundColor: "white",
          border: "3px solid #e2e8f0",
          boxShadow: "0 30px 60px rgba(15, 23, 42, 0.15)",
          padding: 48,
          rotate: interpolate(frame, [0, 1 * fps], ["-14deg", "-5deg"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 14 }),
          }),
          translate: interpolate(frame, [0, 1 * fps], ["0px 120px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 14 }),
          }),
        }}
      >
        <div style={{ display: "inline-block", backgroundColor: "#ef4444", color: "white", fontSize: 40, fontWeight: 800, padding: "8px 20px", borderRadius: 10 }}>
          PDF
        </div>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <div
            key={i}
            style={{ marginTop: i % 4 === 0 ? 40 : 18, height: 18, width: `${[92, 70, 84, 60][i % 4]}%`, borderRadius: 9, backgroundColor: i % 4 === 0 ? "#94a3b8" : "#e2e8f0" }}
          />
        ))}
      </Interactive.Div>
      <AbsoluteFill style={{ left: 90, top: 170, width: 900, height: 600, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
        <Interactive.Div
          name="Headline"
          style={{
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1.05,
            opacity: interpolate(frame, [0.3 * fps, 1 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          One PDF a day
        </Interactive.Div>
        <Interactive.Div
          name="Body"
          style={{
            marginTop: 28,
            fontSize: 60,
            fontWeight: 500,
            lineHeight: 1.25,
            color: "#475569",
            opacity: interpolate(frame, [1.2 * fps, 1.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Ten periods, homework and dictation words, in a school portal.
        </Interactive.Div>
      </AbsoluteFill>
    </Backdrop>
  );
};
