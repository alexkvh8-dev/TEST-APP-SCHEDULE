// Easing library. Every curve maps 0..1 -> 0..1 (back/elastic/spring may overshoot).
// The ad never uses linear motion for anything that starts or stops on screen.

export const linear = (t) => t;

export const inQuad = (t) => t * t;
export const outQuad = (t) => 1 - (1 - t) * (1 - t);
export const inOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const inCubic = (t) => t * t * t;
export const outCubic = (t) => 1 - Math.pow(1 - t, 3);
export const inOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const inQuart = (t) => t * t * t * t;
export const outQuart = (t) => 1 - Math.pow(1 - t, 4);
export const inOutQuart = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2);

export const outQuint = (t) => 1 - Math.pow(1 - t, 5);
export const inOutQuint = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);

export const inExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const inOutExpo = (t) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;

export const inSine = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const outSine = (t) => Math.sin((t * Math.PI) / 2);
export const inOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export const inBack = (s = 1.70158) => (t) => (s + 1) * t * t * t - s * t * t;
export const outBack = (s = 1.70158) => (t) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const inOutBack = (s = 1.70158) => {
  const c = s * 1.525;
  return (t) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
};

export const outElastic = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

// CSS-style cubic-bezier(x1, y1, x2, y2). Newton-Raphson with a bisection fallback.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return t;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) return t;
      if (x > v) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)));
}

// Motion-design staples (After Effects "graph editor" style curves).
export const smooth = bezier(0.65, 0, 0.35, 1);      // symmetrical, strong ease in/out
export const snap = bezier(0.16, 1, 0.3, 1);          // fast attack, long settle
export const swoop = bezier(0.83, 0, 0.17, 1);        // very aggressive in-out (camera moves)
export const glide = bezier(0.25, 0.1, 0.25, 1);      // soft
export const anticipate = bezier(0.6, -0.35, 0.4, 1); // pulls back before going

// Damped harmonic oscillator step response. `t` is seconds since release.
// freq in Hz, damping ratio z (0..1). Returns 0 -> 1 with physical overshoot.
export function spring(t, freq = 2.2, z = 0.32) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

// Decaying oscillation around 0, starting at amplitude 1 (for wobble / follow-through).
export function wobble(t, freq = 3, decay = 5) {
  if (t <= 0) return 0;
  return Math.exp(-decay * t) * Math.sin(2 * Math.PI * freq * t);
}

// Sharp attack, exponential decay "kick" for beat pulses.
export function kick(t, attack = 0.04, decay = 7) {
  if (t < 0) return 0;
  if (t < attack) return outQuad(t / attack);
  return Math.exp(-decay * (t - attack));
}
