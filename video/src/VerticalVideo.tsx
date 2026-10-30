import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { Intro } from "./vertical/Intro";
import { Problem } from "./vertical/Problem";
import { Passcode } from "./vertical/Passcode";
import { Daily } from "./vertical/Daily";
import { Homework } from "./vertical/Homework";
import { Flashcards } from "./vertical/Flashcards";
import { Weekly } from "./vertical/Weekly";
import { Circulars } from "./vertical/Circulars";
import { Outro } from "./vertical/Outro";

// The full video, vertical (1080 x 1920), for phones. Nine scenes joined by 15-frame transitions,
// each overlapping the scenes either side: 1380 frames of scenes less
// 8 x 15 = 1260 frames (42 s at 30 fps). The music is public/music.m4a,
// made by scripts/make_music.py.
export const VerticalVideo: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence name="Intro" durationInFrames={120}>
        <Intro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Problem" durationInFrames={150}>
        <Problem />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Passcode" durationInFrames={150}>
        <Passcode />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Daily" durationInFrames={210}>
        <Daily />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Homework" durationInFrames={150}>
        <Homework />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Flashcards" durationInFrames={150}>
        <Flashcards />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Weekly" durationInFrames={180}>
        <Weekly />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Circulars" durationInFrames={120}>
        <Circulars />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Outro" durationInFrames={150}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Audio name="Music" src={staticFile("music.m4a")} volume={0.7} />
  </AbsoluteFill>
);
