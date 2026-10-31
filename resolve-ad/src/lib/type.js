// Typography for the Resolve ad. Inter Display (OFL) throughout.
// Two systems: kinetic per-glyph motion (slams, pops, stretches) and the soft "resolve"
// reveal (opacity + rise + blur clearing) for calmer lines.

import { clamp, lerp } from './util.js';
import * as E from './ease.js';
import { bezier } from './ease.js';

export const FAMILY = 'Inter Display';
export const TEXT_FAMILY = 'Inter';

export async function loadFonts(base = './assets/fonts/') {
  const faces = [
    [FAMILY, '300', 'InterDisplay-Light.otf'], [FAMILY, '400', 'InterDisplay-Regular.otf'],
    [FAMILY, '500', 'InterDisplay-Medium.otf'], [FAMILY, '600', 'InterDisplay-SemiBold.otf'],
    [FAMILY, '700', 'InterDisplay-Bold.otf'], [FAMILY, '900', 'InterDisplay-Black.otf'],
    [TEXT_FAMILY, '500', 'Inter-Medium.otf'], [TEXT_FAMILY, '600', 'Inter-SemiBold.otf'],
  ].map(([fam, w, f]) => new FontFace(fam, `url(${base}${f})`, { weight: w }));
  await Promise.all(faces.map((f) => f.load()));
  faces.forEach((f) => document.fonts.add(f));
  // Inter weights 700 used by the UI fall back to SemiBold, which is fine at UI sizes
  await document.fonts.ready;
}

export const font = (size, weight = 700, family = FAMILY) => `${weight} ${size}px "${family}"`;
export const RESOLVE = bezier(0.22, 0.61, 0.36, 1);
export const DISSOLVE = bezier(0.4, 0, 1, 1);

// Lay out a string: returns glyph units with x offsets relative to the line start.
function layout(ctx, str, unit) {
  const units = [];
  if (unit === 'word') {
    let i = 0;
    for (const w of str.split(/(\s+)/)) {
      if (w.length && !/^\s+$/.test(w)) {
        units.push({ ch: w, x: ctx.measureText(str.slice(0, i)).width, w: ctx.measureText(w).width, idx: units.length });
      }
      i += w.length;
    }
  } else {
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const x = ctx.measureText(str.slice(0, i)).width;
      const w = ctx.measureText(ch).width;
      if (ch !== ' ') units.push({ ch, x, w, idx: units.length, ci: i });
    }
  }
  return { units, width: ctx.measureText(str).width };
}

const MODES = {
  // Each returns {dx, dy, sx, sy, rot, a, blur} for progress p (0 = hidden, 1 = settled).
  rise: (p, s) => ({ dy: (1 - p) * s * 1.08 }),
  drop: (p, s) => ({ dy: -(1 - p) * s * 1.08 }),
  pop: (p) => ({ sx: p, sy: p, a: clamp(p * 3) }),
  fade: (p, s) => ({ dy: (1 - p) * s * 0.25, a: clamp(p), blur: (1 - clamp(p)) * 18 }),
  slide: (p, s) => ({ dx: (1 - p) * s * 0.9, a: clamp(p * 2) }),
  spin: (p, s) => ({ dy: (1 - p) * s * 0.6, rot: (1 - p) * 0.6, sx: lerp(0.3, 1, p), sy: lerp(0.3, 1, p), a: clamp(p * 2) }),
  stretch: (p, s) => ({ dy: (1 - p) * s * 1.08, sy: lerp(1.6, 1, clamp(p)), sx: lerp(0.8, 1, clamp(p)) }),
  emerge: (p, s) => ({ dx: -(1 - p) * s * 1.7 }),
  slam: (p) => ({ sx: lerp(1.9, 1, p), sy: lerp(1.9, 1, p), a: clamp(p * 2.5), blur: (1 - p) * 16 }),
};

/**
 * Draw kinetic text.
 * o.t        seconds since the "in" animation began (negative = not yet)
 * o.out      seconds since the "out" animation began (negative/undefined = not yet)
 * o.mode / o.outMode: keys of MODES. Out uses the mirror of the mode by default.
 * o.mask     clip each line to its own band so glyphs slide from behind an invisible edge.
 * o.colorAt  optional (charIndex) => color, for accent punctuation.
 */
export function kText(ctx, str, o) {
  const {
    x = 0, y = 0, size = 120, weight = 800, color = '#fff', align = 'left', tracking = -0.03,
    t = 0, dur = 0.7, stagger = 0.03, ease = E.outExpo, mode = 'rise',
    out = -1, outDur = 0.45, outStagger = 0.02, outEase = E.inCubic, outMode,
    mask = true, unit = 'char', colorAt, alpha = 1, order = 'ltr',
  } = o;
  ctx.save();
  ctx.font = font(size, weight, o.family || FAMILY);
  ctx.letterSpacing = `${tracking * size}px`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const L = layout(ctx, str, unit);
  const x0 = align === 'center' ? x - L.width / 2 : align === 'right' ? x - L.width : x;
  if (mask) {
    ctx.beginPath();
    ctx.rect(x0 - size, y - size * 1.0, L.width + size * 2, size * 1.3);
    ctx.clip();
  }
  const n = L.units.length;
  const inF = MODES[mode];
  const outF = MODES[outMode || mode];
  for (const u of L.units) {
    const k = order === 'rtl' ? n - 1 - u.idx : order === 'center' ? Math.abs(u.idx - (n - 1) / 2) : u.idx;
    const pin = ease(clamp((t - k * stagger) / dur));
    if (t - k * stagger <= 0) continue;
    let st = inF(pin, size);
    if (out >= 0) {
      const po = outEase(clamp((out - k * outStagger) / outDur));
      if (po >= 1) continue;
      const so = outF(1 - po, size);
      // Out motion leaves in the opposite direction for rise/drop.
      if ((outMode || mode) === 'rise' || (outMode || mode) === 'stretch') so.dy = -(so.dy || 0);
      st = {
        dx: (st.dx || 0) + (so.dx || 0), dy: (st.dy || 0) + (so.dy || 0),
        sx: (st.sx ?? 1) * (so.sx ?? 1), sy: (st.sy ?? 1) * (so.sy ?? 1),
        rot: (st.rot || 0) + (so.rot || 0), a: (st.a ?? 1) * (so.a ?? 1), blur: (st.blur || 0) + (so.blur || 0),
      };
    }
    const cx = x0 + u.x + u.w / 2;
    ctx.save();
    ctx.globalAlpha = alpha * (st.a ?? 1);
    ctx.translate(cx + (st.dx || 0), y + (st.dy || 0) - size * 0.35);
    if (st.rot) ctx.rotate(st.rot);
    ctx.scale(st.sx ?? 1, st.sy ?? 1);
    if (st.blur > 0.3) ctx.filter = `blur(${st.blur.toFixed(1)}px)`;
    ctx.fillStyle = colorAt ? colorAt(u.ci ?? u.idx) || color : color;
    ctx.fillText(u.ch, -u.w / 2, size * 0.35);
    ctx.restore();
  }
  ctx.restore();
  return L.width;
}

export function measure(ctx, str, size, weight = 700, tracking = -0.03, family = FAMILY) {
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
    x = 960, y = 540, size = 96, weight = 600, fill = '#f2f2f4', align = 'center', tracking = -0.022,
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
