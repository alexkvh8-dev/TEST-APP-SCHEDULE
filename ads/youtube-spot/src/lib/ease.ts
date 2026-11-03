import { Easing } from "remotion";

/**
 * The film's house curves. Every move in every shot picks from this list, so
 * the whole piece shares one feel:
 *   arrivals  -> snap / outExpo / outQuint
 *   exits     -> inCubic
 *   camera    -> smooth / inOutCubic / inOutSine
 *   whips     -> swoop
 */
export type Ease = (p: number) => number;

export const E = {
  linear: (p: number) => p,
  outCubic: (p: number) => 1 - (1 - p) ** 3,
  outQuint: (p: number) => 1 - (1 - p) ** 5,
  outExpo: (p: number) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p)),
  inQuad: (p: number) => p * p,
  inCubic: (p: number) => p * p * p,
  inQuart: (p: number) => p ** 4,
  inExpo: (p: number) => (p <= 0 ? 0 : 2 ** (10 * p - 10)),
  inOutCubic: (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
  inOutSine: (p: number) => -(Math.cos(Math.PI * p) - 1) / 2,
  snap: Easing.bezier(0.16, 1, 0.3, 1),
  smooth: Easing.bezier(0.65, 0, 0.35, 1),
  swoop: Easing.bezier(0.83, 0, 0.17, 1),
  outBack:
    (s = 1.7) =>
    (p: number) =>
      1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2,
  /** Damped spring from 0 to 1. freq in oscillations over the segment, zeta = damping. */
  spring:
    (freq = 2.2, zeta = 0.42) =>
    (p: number) => {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      const w = freq * 2 * Math.PI;
      return 1 - Math.exp(-zeta * w * p) * Math.cos(w * Math.sqrt(1 - zeta * zeta) * p);
    },
};

/** Sharp attack, exponential decay. 0 before t=0. */
export const kick = (t: number, decay = 9) => (t < 0 ? 0 : Math.exp(-t * decay));
