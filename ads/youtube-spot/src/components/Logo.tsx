import React from "react";

import { C } from "../lib/brand";
import { ICON_RED_PATH, ICON_TRIANGLE_PATH, WORDMARK_TEXT_PATH } from "../lib/logoPaths";

/** Measured with getBBox on the CC0 path data (units of the 512x116 lockup). */
export const ICON_BOX = { w: 163.497, h: 114.503 };
export const TRI_BOX = { x: 65.413, y: 32.715, w: 42.362, h: 49.073 };
export const TEXT_BOX = { x: 179.497, y: 4.509, w: 332.501, h: 102.864 };
export const LOCKUP_BOX = { w: 512, h: 116 };
/** Centroid of the play triangle, used as its scale origin. */
export const TRI_CENTROID = { x: (65.413 * 2 + 107.775) / 3, y: 57.252 };

/**
 * The play-button icon. Red body and white triangle are separate so the
 * triangle can be animated on its own; the colours themselves never change.
 */
export function YTIcon({
  height,
  triangleScale = 1,
  triangleRotate = 0,
  style,
}: {
  height: number;
  triangleScale?: number;
  triangleRotate?: number;
  style?: React.CSSProperties;
}) {
  const k = height / ICON_BOX.h;
  return (
    <svg
      width={ICON_BOX.w * k}
      height={height}
      viewBox={`0 0 ${ICON_BOX.w} ${ICON_BOX.h}`}
      style={{ display: "block", overflow: "visible", ...style }}
    >
      <path d={ICON_RED_PATH} fill={C.red} />
      {triangleScale > 0.001 && (
        <g
          transform={`translate(${TRI_CENTROID.x} ${TRI_CENTROID.y}) rotate(${triangleRotate}) scale(${triangleScale}) translate(${-TRI_CENTROID.x} ${-TRI_CENTROID.y})`}
        >
          <path d={ICON_TRIANGLE_PATH} fill={C.white} />
        </g>
      )}
    </svg>
  );
}

/** Full lockup. On dark grounds the wordmark is white, as in YouTube's dark-theme logo. */
export function YTLockup({ height, textColor = C.white }: { height: number; textColor?: string }) {
  const k = height / LOCKUP_BOX.h;
  return (
    <svg width={LOCKUP_BOX.w * k} height={height} viewBox={`0 0 ${LOCKUP_BOX.w} ${LOCKUP_BOX.h}`} style={{ display: "block" }}>
      <path d={ICON_RED_PATH} fill={C.red} />
      <path d={ICON_TRIANGLE_PATH} fill={C.white} />
      <path d={WORDMARK_TEXT_PATH} fill={textColor} />
    </svg>
  );
}

export function WordmarkText({ height, color = C.white }: { height: number; color?: string }) {
  // Drawn in lockup units so it sits exactly where the full lockup would put it.
  const k = height / LOCKUP_BOX.h;
  return (
    <svg
      width={LOCKUP_BOX.w * k}
      height={height}
      viewBox={`0 0 ${LOCKUP_BOX.w} ${LOCKUP_BOX.h}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <path d={WORDMARK_TEXT_PATH} fill={color} />
    </svg>
  );
}
