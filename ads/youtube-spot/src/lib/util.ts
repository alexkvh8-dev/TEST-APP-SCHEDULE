import type { Ease } from "./ease";

export const FPS = 60;
export const W = 1920;
export const H = 1080;
export const DURATION = 10;
/** 120 BPM grid: cuts and accents land on multiples of this. */
export const BEAT = 0.5;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Interpolate scale/distance in log space so perceived speed stays constant. */
export const logLerp = (a: number, b: number, p: number) => Math.exp(lerp(Math.log(a), Math.log(b), p));

/** Map time into an eased 0..1 over [t0, t1]. */
export const seg = (t: number, t0: number, t1: number, ease: Ease = (p) => p) =>
  ease(clamp((t - t0) / (t1 - t0)));

/** Seeded PRNG (mulberry32). Use at build time only, never per frame. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Smooth deterministic 1D value noise in [-1, 1]. */
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
}

/** Frame-exact time helpers. */
export const frameToTime = (f: number) => f / FPS;
