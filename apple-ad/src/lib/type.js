// Apple-style typography. Inter Display stands in for SF Pro Display (SF's licence only
// covers UI mock-ups). Lines are short, centred, tightly tracked, and revealed with
// Apple's signature "resolve": opacity + a small rise + blur clearing to sharp.

import { clamp, lerp } from './util.js';
import { bezier } from './ease.js';

export const FAMILY = 'Inter Display';
export const TEXT_FAMILY = 'Inter';

export async function loadFonts(base = './assets/fonts/') {
  const faces = [
    [FAMILY, '400', 'InterDisplay-Regular.otf'],
    [FAMILY, '500', 'InterDisplay-Medium.otf'],
    [FAMILY, '600', 'InterDisplay-SemiBold.otf'],
    [FAMILY, '700', 'InterDisplay-Bold.otf'],
    [TEXT_FAMILY, '500', 'Inter-Medium.otf'],
    [TEXT_FAMILY, '600', 'Inter-SemiBold.otf'],
  ].map(([fam, w, f]) => new FontFace(fam, `url(${base}${f})`, { weight: w }));
  await Promise.all(faces.map((f) => f.load()));
  faces.forEach((f) => document.fonts.add(f));
  await document.fonts.ready;
}

export const font = (size, weight = 600, family = FAMILY) => `${weight} ${size}px "${family}"`;

// Long, soft ease-out used for every reveal (close to the curves on Apple's web pages).
export const RESOLVE = bezier(0.22, 0.61, 0.36, 1);
export const DISSOLVE = bezier(0.4, 0, 1, 1);

export function measure(ctx, str, size, weight = 600, tracking = -0.022, family = FAMILY) {
  ctx.save();
  ctx.font = font(size, weight, family);
  ctx.letterSpacing = `${tracking * size}px`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/**
 * Reveal a line Apple-style. Words resolve in sequence with a small stagger.
 * o.t: seconds since reveal start; o.out: seconds since dissolve start (or <0).
 * o.fill: CSS colour or a function (ctx, x0, width, y, size) => CanvasGradient.
 */
export function line(ctx, str, o) {
  const {
    x = 960, y = 540, size = 96, weight = 600, fill = '#f5f5f7', align = 'center', tracking = -0.022,
    t = 0, dur = 1.1, stagger = 0.09, rise = 0.22, blur = 14,
    out = -1, outDur = 0.6, outStagger = 0.04, family = FAMILY, alpha = 1,
  } = o;
  if (t <= 0) return;
  ctx.save();
  ctx.font = font(size, weight, family);
  ctx.letterSpacing = `${tracking * size}px`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const total = ctx.measureText(str).width;
  const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const style = typeof fill === 'function' ? fill(ctx, x0, total, y, size) : fill;
  // split into words, keep exact positions (kerning preserved by prefix measurement)
  const words = [];
  let i = 0;
  for (const w of str.split(/(\s+)/)) {
    if (w.trim()) words.push({ w, x: ctx.measureText(str.slice(0, i)).width });
    i += w.length;
  }
  words.forEach((wd, k) => {
    const p = RESOLVE(clamp((t - k * stagger) / dur));
    if (p <= 0) return;
    let a = p, dy = (1 - p) * size * rise, b = (1 - p) * blur;
    if (out >= 0) {
      const q = DISSOLVE(clamp((out - k * outStagger) / outDur));
      a *= 1 - q;
      dy -= q * size * 0.08;
      b += q * blur * 0.8;
    }
    if (a <= 0.003) return;
    ctx.save();
    ctx.globalAlpha = a * alpha;
    if (b > 0.35) ctx.filter = `blur(${b.toFixed(1)}px)`;
    ctx.fillStyle = style;
    ctx.fillText(wd.w, x0 + wd.x, y + dy);
    ctx.restore();
  });
  ctx.restore();
}

// Gradient fills used on Apple marketing type.
export const fills = {
  titanium: (ctx, x0, w, y, size) => {
    const g = ctx.createLinearGradient(x0, y - size, x0 + w, y);
    g.addColorStop(0, '#f5f5f7');
    g.addColorStop(0.45, '#bdb8b0');
    g.addColorStop(0.7, '#8d8780');
    g.addColorStop(1, '#e9e6e1');
    return g;
  },
  glow: (ctx, x0, w) => {
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    ['#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#FF9F0A'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    return g;
  },
};

export function text(ctx, str, x, y, size, weight, color, align = 'left', tracking = -0.01, family = FAMILY) {
  ctx.save();
  ctx.font = font(size, weight, family);
  ctx.letterSpacing = `${tracking * size}px`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
  ctx.restore();
}
