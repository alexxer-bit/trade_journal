import React from "react";
import { Composition } from "remotion";
import { HundredShort, HUNDRED_FRAMES } from "./videos/hundred/Hundred";

export const RemotionRoot: React.FC = () => (

  <Composition id="HundredShort" component={HundredShort} durationInFrames={HUNDRED_FRAMES} fps={30} width={1080} height={1920} />

);
