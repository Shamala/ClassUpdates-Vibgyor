import { AbsoluteFill, Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../Backdrop";
import { Phone } from "../Phone";

// Ticking homework off.
export const Homework: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Backdrop>
      <AbsoluteFill style={{ left: 90, top: 170, width: 900, height: 560, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
        <Interactive.Div
          name="Headline"
          style={{
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1.05,
            opacity: interpolate(frame, [0.2 * fps, 0.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [0.2 * fps, 0.9 * fps], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Tick it off
        </Interactive.Div>
        <Interactive.Div
          name="Body"
          style={{
            marginTop: 28,
            fontSize: 60,
            fontWeight: 500,
            lineHeight: 1.25,
            color: "#475569",
            opacity: interpolate(frame, [0.8 * fps, 1.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Done homework stays ticked on your phone.
        </Interactive.Div>
      </AbsoluteFill>
      <Phone
        x={306} y={800} screenWidth={440}
        style={{
          translate: interpolate(frame, [0, 0.9 * fps], ["0px 200px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
          }),
        }}
      >
        <Img name="Before" src={staticFile("screens/homework-before.png")} style={{ position: "absolute", top: 0, left: 0, width: 440 }} />
        <Img
          name="After"
          src={staticFile("screens/homework-after.png")}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 440,
            opacity: interpolate(frame, [2.2 * fps, 2.4 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
        <Interactive.Div
          name="Tap"
          style={{
            position: "absolute",
            left: 28,
            top: 718,
            width: 51,
            height: 51,
            borderRadius: 25,
            backgroundColor: "rgba(79, 70, 229, 0.35)",
            border: "3px solid #4f46e5",
            scale: interpolate(frame, [1.8 * fps, 2.2 * fps, 2.6 * fps], [0.4, 1, 1.6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              output: "perceptual-scale",
            }),
            opacity: interpolate(frame, [1.8 * fps, 2.2 * fps, 2.6 * fps], [0, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      </Phone>
    </Backdrop>
  );
};
