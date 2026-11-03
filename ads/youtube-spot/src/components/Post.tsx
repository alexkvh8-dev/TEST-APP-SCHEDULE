import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

import { rng } from "../lib/util";

/**
 * The one finishing stack for the whole film: animated grain (pre-baked tiles,
 * chosen and offset per frame from a seeded generator, so a still and the
 * video always match) and a vignette that stays the same across every cut.
 */
export function Post({ frame, grain = 0.07, vignette = 0.34 }: { frame: number; grain?: number; vignette?: number }) {
  const r = rng(frame * 9973 + 17);
  const tile = Math.floor(r() * 6);
  const ox = Math.floor(r() * 256);
  const oy = Math.floor(r() * 256);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${vignette}) 100%)`,
        }}
      />
      <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: grain, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: -ox,
            top: -oy,
            width: 1920 + 512,
            height: 1080 + 512,
            backgroundImage: `url(${staticFile(`grain/g${tile}.png`)})`,
            backgroundRepeat: "repeat",
          }}
        />
        {/* Preload every tile once so no frame waits on a decode. */}
        <div style={{ display: "none" }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Img key={i} src={staticFile(`grain/g${i}.png`)} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
