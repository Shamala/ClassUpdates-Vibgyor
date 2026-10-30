import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../Backdrop";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Backdrop>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 90px" }}>
        <Interactive.Div
          name="Logo"
          style={{
            width: 200,
            height: 200,
            borderRadius: 48,
            backgroundColor: "#4f46e5",
            color: "white",
            fontSize: 120,
            fontWeight: 800,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 24px 48px rgba(79, 70, 229, 0.35)",
            scale: interpolate(frame, [0, 0.8 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
          }}
        >
          V
        </Interactive.Div>
        <Interactive.Div
          name="Title"
          style={{
            marginTop: 64,
            fontSize: 132,
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: -4,
            opacity: interpolate(frame, [0.5 * fps, 1.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [0.5 * fps, 1.2 * fps], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          VIBGYOR Class Updates
        </Interactive.Div>
        <Interactive.Div
          name="Tagline"
          style={{
            marginTop: 40,
            fontSize: 64,
            lineHeight: 1.25,
            fontWeight: 500,
            color: "#4f46e5",
            opacity: interpolate(frame, [1.2 * fps, 1.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          The class diary, every day, on your phone
        </Interactive.Div>
      </AbsoluteFill>
    </Backdrop>
  );
};
