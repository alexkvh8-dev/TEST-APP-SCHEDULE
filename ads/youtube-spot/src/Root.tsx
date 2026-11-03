import React from "react";
import { Composition } from "remotion";

import { Film } from "./Film";
import { DURATION, FPS, H, W } from "./lib/util";

export function Root() {
  return (
    <Composition
      id="YouTubeSpot"
      component={Film}
      durationInFrames={Math.round(DURATION * FPS)}
      fps={FPS}
      width={W}
      height={H}
    />
  );
}
