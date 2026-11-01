// Kinetic typography on a 2D canvas. Text is laid out once per call with real kerning
// (prefix measurement), then each glyph (or word) gets its own staggered, eased motion.
//
// Brand face: Google Sans (OFL 1.1, via Fontsource). Noto subsets cover the Japanese,
// Korean and Devanagari words in the Translate shot; the canvas falls back per glyph.

import { clamp, lerp } from './util.js';
import * as E from './ease.js';

export const FAMILY = "'Google Sans', 'Noto JP', 'Noto KR1', 'Noto KR2', 'Noto KR3', 'Noto Deva', sans-serif";

export async function loadFonts(base = './assets/fonts/') {
  const faces = [
    ['Google Sans', '400', 'GoogleSans-400.woff2'],
    ['Google Sans', '500', 'GoogleSans-500.woff2'],
    ['Google Sans', '700', 'GoogleSans-700.woff2'],
    ['Noto JP', '400 700', 'NotoSansJP-500-s119.woff2'],
    ['Noto KR1', '400 700', 'NotoSansKR-500-s117.woff2'],
    ['Noto KR2', '400 700', 'NotoSansKR-500-s118.woff2'],
    ['Noto KR3', '400 700', 'NotoSansKR-500-s119.woff2'],
    ['Noto Deva', '400 700', 'NotoSansDevanagari-500.woff2'],
  ].map(([fam, w, f]) => new FontFace(fam, `url(${base}${f})`, { weight: w }));
  await Promise.all(faces.map((f) => f.load()));
  faces.forEach((f) => document.fonts.add(f));
  await document.fonts.ready;
}

export function font(size, weight = 500) {
  return `${weight} ${size}px ${FAMILY}`;
}

// Lay out a string: returns glyph units with x offsets relative to the line start.
function layout(ctx, str, unit) {
  const units = [];
  if (unit === 'word') {
    let i = 0;
    for (const w of str.split(/(\s+)/)) {
      if (w.length && !/^\s+$/.test(w)) {
        units.push({ ch: w, x: ctx.measureText(str.slice(0, i)).width, w: ctx.measureText(w).width, idx: units.length, ci: i + w.length - 1 });
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
    x = 0, y = 0, size = 120, weight = 500, color = '#202124', align = 'left', tracking = -0.025,
    t = 0, dur = 0.7, stagger = 0.03, ease = E.outExpo, mode = 'rise',
    out = -1, outDur = 0.45, outStagger = 0.02, outEase = E.inCubic, outMode,
    mask = true, unit = 'char', colorAt, alpha = 1, order = 'ltr',
  } = o;
  ctx.save();
  ctx.font = font(size, weight);
  ctx.letterSpacing = `${tracking * size}px`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const L = layout(ctx, str, unit);
  const x0 = align === 'center' ? x - L.width / 2 : align === 'right' ? x - L.width : x;
  if (mask) {
    ctx.beginPath();
    ctx.rect(x0 - size, y - size * 1.0, L.width + size * 2, size * 1.32);
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

export function measure(ctx, str, size, weight = 500, tracking = -0.025) {
  ctx.save();
  ctx.font = font(size, weight);
  ctx.letterSpacing = `${tracking * size}px`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

// Plain text with tracking, no animation.
export function text(ctx, str, x, y, size, weight, color, align = 'left', tracking = -0.01) {
  ctx.save();
  ctx.font = font(size, weight);
  ctx.letterSpacing = `${tracking * size}px`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
  ctx.restore();
}
