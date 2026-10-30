import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../Backdrop";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Backdrop>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <Interactive.Div
          name="Headline"
          style={{
            fontSize: 150,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1.05,
            opacity: interpolate(frame, [0.2 * fps, 0.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Updated every school afternoon
        </Interactive.Div>
        <Interactive.Div
          name="Body"
          style={{
            marginTop: 40,
            fontSize: 78,
            fontWeight: 500,
            color: "#475569",
            opacity: interpolate(frame, [0.9 * fps, 1.6 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Add it to your home screen. It works offline too.
        </Interactive.Div>
        <Interactive.Div
          name="Address"
          style={{
            marginTop: 80,
            fontSize: 64,
            fontWeight: 700,
            color: "white",
            backgroundColor: "#4f46e5",
            padding: "24px 48px",
            borderRadius: 32,
            opacity: interpolate(frame, [1.8 * fps, 2.4 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            scale: interpolate(frame, [1.8 * fps, 2.4 * fps], [0.9, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 14 }),
              output: "perceptual-scale",
            }),
          }}
        >
          shamala.github.io/ClassUpdates-Vibgyor
        </Interactive.Div>
      </AbsoluteFill>
    </Backdrop>
  );
};
