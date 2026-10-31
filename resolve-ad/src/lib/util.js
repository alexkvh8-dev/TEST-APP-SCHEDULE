// Small deterministic helpers. Nothing here reads the wall clock, so any frame can be
// rendered in any order and always looks identical.

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const smoothstep = (a, b, x) => {
  const t = invLerp(a, b, x);
  return t * t * (3 - 2 * t);
};

// Eased progress of `t` through the window [t0, t1].
export const seg = (t, t0, t1, ease = (v) => v) => ease(invLerp(t0, t1, t));

// Keyframe track: keys = [[time, value, easeIntoThisKey], ...] sorted by time.
// Values may be numbers or arrays of numbers.
export function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const p = (e || ((x) => x))((t - t0) / (t1 - t0));
      if (Array.isArray(v0)) return v0.map((a, k) => lerp(a, v1[k], p));
      return lerp(v0, v1, p);
    }
  }
  return keys[keys.length - 1][1];
}

// Seeded PRNG (mulberry32).
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

// Smooth 1D value noise in [-1, 1].
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i + seed * 57.3), hash1(i + 1 + seed * 57.3), u) * 2 - 1;
}

// Camera / object shake: sum of two noise octaves, scaled by amplitude.
export function shake(t, amp, seed = 0) {
  return [
    (noise1(t * 18, seed) * 0.7 + noise1(t * 41, seed + 3) * 0.3) * amp,
    (noise1(t * 17, seed + 7) * 0.7 + noise1(t * 39, seed + 9) * 0.3) * amp,
  ];
}

export const BEAT = 0.5; // 120 BPM grid — every cut and accent lands on it.
