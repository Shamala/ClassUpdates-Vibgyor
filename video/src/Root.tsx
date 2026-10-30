import { Composition, Folder } from "remotion";
import { LandscapeVideo } from "./LandscapeVideo";
import { VerticalVideo } from "./VerticalVideo";
import * as L from "./landscape";
import * as V from "./vertical";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Landscape-Scenes">
        <Composition id="Landscape-Intro" component={L.Intro} width={1920} height={1080} fps={30} durationInFrames={120} />
        <Composition id="Landscape-Problem" component={L.Problem} width={1920} height={1080} fps={30} durationInFrames={150} />
        <Composition id="Landscape-Passcode" component={L.Passcode} width={1920} height={1080} fps={30} durationInFrames={150} />
        <Composition id="Landscape-Daily" component={L.Daily} width={1920} height={1080} fps={30} durationInFrames={210} />
        <Composition id="Landscape-Homework" component={L.Homework} width={1920} height={1080} fps={30} durationInFrames={150} />
        <Composition id="Landscape-Flashcards" component={L.Flashcards} width={1920} height={1080} fps={30} durationInFrames={150} />
        <Composition id="Landscape-Weekly" component={L.Weekly} width={1920} height={1080} fps={30} durationInFrames={180} />
        <Composition id="Landscape-Circulars" component={L.Circulars} width={1920} height={1080} fps={30} durationInFrames={120} />
        <Composition id="Landscape-Outro" component={L.Outro} width={1920} height={1080} fps={30} durationInFrames={150} />
      </Folder>
      <Folder name="Vertical-Scenes">
        <Composition id="Vertical-Intro" component={V.Intro} width={1080} height={1920} fps={30} durationInFrames={120} />
        <Composition id="Vertical-Problem" component={V.Problem} width={1080} height={1920} fps={30} durationInFrames={150} />
        <Composition id="Vertical-Passcode" component={V.Passcode} width={1080} height={1920} fps={30} durationInFrames={150} />
        <Composition id="Vertical-Daily" component={V.Daily} width={1080} height={1920} fps={30} durationInFrames={210} />
        <Composition id="Vertical-Homework" component={V.Homework} width={1080} height={1920} fps={30} durationInFrames={150} />
        <Composition id="Vertical-Flashcards" component={V.Flashcards} width={1080} height={1920} fps={30} durationInFrames={150} />
        <Composition id="Vertical-Weekly" component={V.Weekly} width={1080} height={1920} fps={30} durationInFrames={180} />
        <Composition id="Vertical-Circulars" component={V.Circulars} width={1080} height={1920} fps={30} durationInFrames={120} />
        <Composition id="Vertical-Outro" component={V.Outro} width={1080} height={1920} fps={30} durationInFrames={150} />
      </Folder>
      <Composition id="ClassUpdatesVideo" component={LandscapeVideo} width={1920} height={1080} fps={30} durationInFrames={1260} />
      <Composition id="ClassUpdatesVertical" component={VerticalVideo} width={1080} height={1920} fps={30} durationInFrames={1260} />
    </>
  );
};
