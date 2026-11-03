import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Post } from "./components/Post";
import { C } from "./lib/brand";
import { ensureFonts } from "./lib/fonts";
import { FPS } from "./lib/util";
import { SearchFeed } from "./shots/SearchFeed";
import { Watch } from "./shots/Watch";
import { EndCard } from "./shots/EndCard";

ensureFonts();

/**
 * The director. Every shot is a pure function of film time, so frames can be
 * rendered in any order and a still always matches the video.
 *
 *   0.0 - 4.0  SearchFeed  (search hook -> feed fly-over -> container transform)
 *   4.0 - 7.0  Watch       (Like / Subscribe / bell -> progress bar fills the frame red)
 *   7.0 - 10.0 EndCard     (red frame shrinks into the play button -> lockup -> CTA)
 */
export function Film() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {t < 4 && <SearchFeed t={t} />}
      {t >= 4 && t < 7 && <Watch t={t} />}
      {t >= 7 && <EndCard t={t} />}
      <Post frame={frame} />
    </AbsoluteFill>
  );
}
