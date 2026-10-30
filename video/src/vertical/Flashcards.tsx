import { AbsoluteFill, Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../Backdrop";
import { Phone } from "../Phone";

// Word History, then its flashcards.
export const Flashcards: React.FC = () => {
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
          Dictation practice
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
          This week's words as flashcards, read aloud.
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
        <Img name="Word list" src={staticFile("screens/words-list.png")} style={{ position: "absolute", top: 0, left: 0, width: 440 }} />
        <Img
          name="Flashcard"
          src={staticFile("screens/flashcard.png")}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 440,
            opacity: interpolate(frame, [2 * fps, 2.4 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      </Phone>
    </Backdrop>
  );
};
