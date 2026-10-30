import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { Intro } from "./landscape/Intro";
import { Problem } from "./landscape/Problem";
import { Passcode } from "./landscape/Passcode";
import { Daily } from "./landscape/Daily";
import { Homework } from "./landscape/Homework";
import { Flashcards } from "./landscape/Flashcards";
import { Weekly } from "./landscape/Weekly";
import { Circulars } from "./landscape/Circulars";
import { Outro } from "./landscape/Outro";

// The full video, landscape (1920 x 1080). Nine scenes joined by 15-frame transitions,
// each overlapping the scenes either side: 1380 frames of scenes less
// 8 x 15 = 1260 frames (42 s at 30 fps). The music is public/music.m4a,
// made by scripts/make_music.py.
export const LandscapeVideo: React.FC = () => (
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
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Daily" durationInFrames={210}>
        <Daily />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Homework" durationInFrames={150}>
        <Homework />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Flashcards" durationInFrames={150}>
        <Flashcards />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Weekly" durationInFrames={180}>
        <Weekly />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 15 })} />
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
