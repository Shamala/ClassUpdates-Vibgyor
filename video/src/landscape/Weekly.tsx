import { AbsoluteFill, Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../Backdrop";
import { Phone } from "../Phone";

// The Weekly Overview, scrolled through the days.
export const Weekly: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Backdrop>
      <AbsoluteFill style={{ left: 160, width: 940, display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
            translate: interpolate(frame, [0.2 * fps, 0.9 * fps], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          The whole week
        </Interactive.Div>
        <Interactive.Div
          name="Body"
          style={{
            marginTop: 40,
            fontSize: 78,
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
          Every day's words and homework, with due dates.
        </Interactive.Div>
      </AbsoluteFill>
      <Phone
        x={1190} y={112} screenWidth={380}
        style={{
          translate: interpolate(frame, [0, 0.9 * fps], ["0px 160px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
          }),
        }}
      >
        <Img
          name="Screen"
          src={staticFile("screens/weekly-full.png")}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 380,
            translate: interpolate(frame, [1.2 * fps, 5.5 * fps], ["0px 0px", "0px -1700px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.65, 0, 0.35, 1),
            }),
          }}
        />
      </Phone>
    </Backdrop>
  );
};
