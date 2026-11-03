import React from "react";

import { E } from "../lib/ease";
import { lerp, seg } from "../lib/util";

export interface CursorKey {
  /** time the cursor arrives (fully stopped) at this point */
  t: number;
  x: number;
  y: number;
  /** click time, if it clicks here */
  click?: number;
}

/**
 * Cursor choreography: travel between keys on an arc with `smooth`, stop
 * before the click, press to 0.86 for ~80 ms and spring back.
 */
export function cursorState(keys: CursorKey[], t: number, travel = 0.42, arc = 46) {
  let x = keys[0].x;
  let y = keys[0].y;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    const p = seg(t, b.t - travel, b.t, E.smooth);
    if (p > 0) {
      x = lerp(a.x, b.x, p);
      y = lerp(a.y, b.y, p) - Math.sin(Math.PI * p) * arc;
    }
  }
  let press = 0;
  for (const k of keys) {
    if (k.click == null) continue;
    const down = seg(t, k.click - 0.06, k.click, E.inQuad);
    const up = seg(t, k.click, k.click + 0.22, E.outBack(2));
    press = Math.max(press, down * (1 - up));
  }
  return { x, y, scale: 1 - press * 0.14 };
}

export function Cursor({ x, y, scale = 1, opacity = 1, size = 34 }: { x: number; y: number; scale?: number; opacity?: number; size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 20 28"
      style={{
        position: "absolute",
        left: x - size * 0.12,
        top: y - size * 0.06,
        transform: `scale(${scale})`,
        transformOrigin: "12% 4%",
        opacity,
        filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.45))",
        overflow: "visible",
      }}
    >
      <path d="M2 1.5 L2 22.5 L7.4 17.4 L11 26 L14.6 24.4 L11.1 16 L18.4 16 Z" fill="#fff" stroke="#111" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}
