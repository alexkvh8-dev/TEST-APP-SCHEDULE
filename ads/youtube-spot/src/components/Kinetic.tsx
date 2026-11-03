import React from "react";

import { E, type Ease } from "../lib/ease";
import { seg } from "../lib/util";

/**
 * Masked per-glyph (or per-word) type. Each unit rises out of an invisible
 * edge on the house arrival curve and leaves upward on inCubic, and the whole
 * exit is finished before `exitAt + exitDur + stagger * n`.
 */
export function KLine({
  text,
  t,
  start,
  stagger = 0.028,
  dur = 0.5,
  unit = "glyph",
  exitAt,
  exitDur = 0.22,
  exitStagger = 0.012,
  ease = E.snap,
  colorAt,
  style,
  blur = true,
}: {
  text: string;
  t: number;
  start: number;
  stagger?: number;
  dur?: number;
  unit?: "glyph" | "word";
  exitAt?: number;
  exitDur?: number;
  exitStagger?: number;
  ease?: Ease;
  colorAt?: (i: number, unit: string) => string | undefined;
  style?: React.CSSProperties;
  blur?: boolean;
}) {
  const units = unit === "word" ? text.split(/(\s+)/) : Array.from(text);
  let idx = -1;
  return (
    <div style={{ display: "inline-block", overflow: "hidden", whiteSpace: "pre", paddingBottom: "0.08em", lineHeight: 1.12, ...style }}>
      {units.map((u, i) => {
        if (/^\s+$/.test(u)) return <span key={i}>{u}</span>;
        idx += 1;
        const p = seg(t, start + idx * stagger, start + idx * stagger + dur, ease);
        const q = exitAt == null ? 0 : seg(t, exitAt + idx * exitStagger, exitAt + idx * exitStagger + exitDur, E.inCubic);
        const y = (1 - p) * 105 - q * 110;
        const o = Math.min(seg(t, start + idx * stagger, start + idx * stagger + dur * 0.35), 1 - q);
        const b = blur ? (1 - p) * 10 + q * 6 : 0;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${y}%)`,
              opacity: o,
              filter: b > 0.2 ? `blur(${b}px)` : undefined,
              color: colorAt?.(idx, u),
            }}
          >
            {u}
          </span>
        );
      })}
    </div>
  );
}
