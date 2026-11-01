// Brand tokens for the Google spec ad. Every shot imports colours, type and glyphs from
// here; no shot hard-codes a hex value.
//
// Palette: Google's four brand colours plus the Material "Google grey" neutrals used by
// Search, Maps and the Google app. Logo paths are CC0 drawings from Iconify's "logos"
// set (logos:google, logos:google-icon), recoloured to the brand hexes.

export const C = {
  blue: '#4285F4',
  red: '#EA4335',
  yellow: '#FBBC05',
  green: '#34A853',
  blueDeep: '#1967D2', // route casing, links
  redDeep: '#B31412', // pin centre
  ink: '#202124', // grey 900, primary text
  ink2: '#3C4043', // grey 800
  mute: '#5F6368', // grey 700, secondary text and icons
  mute2: '#80868B', // grey 600
  line: '#DADCE0', // grey 300, borders and dividers
  hover: '#F1F3F4', // grey 100, hovered rows and chips
  surface: '#F8F9FA', // grey 50
  white: '#FFFFFF',
  blueTint: '#E8F0FE',
  // Maps-inspired cartography, built from the same neutral ramp
  land: '#F1F3F4',
  block: '#E8EAED',
  footprint: '#E3E5E8',
  park: '#CEEAD6',
  hill: '#D7EFDD',
  water: '#AECBFA',
  road: '#FFFFFF',
  roadCase: '#DADCE0',
  artery: '#FEEFC3',
  arteryCase: '#FDD663',
};

export const DOTS = [C.blue, C.red, C.yellow, C.green];

export const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
export const mix = (h1, h2, t) => {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
};

// ---------- logo ----------
// logos:google-icon, viewBox 0 0 256 262
export const G_ICON = {
  w: 256, h: 262, cx: 130.55, cy: 130.55, rOut: 130.55, rIn: 80.07,
  blue: 'M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027',
  green: 'M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1',
  yellow: 'M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z',
  red: 'M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251',
};
// Segment sweep angles (canvas radians, y down), counter-clockwise on screen = decreasing.
const D = Math.PI / 180;
export const G_SEGS = [
  { key: 'red', color: C.red, a0: -47.9 * D, a1: -153.3 * D },
  { key: 'yellow', color: C.yellow, a0: -153.3 * D, a1: -206.7 * D },
  { key: 'green', color: C.green, a0: -206.7 * D, a1: -311.2 * D },
  { key: 'blue', color: C.blue, a0: -311.2 * D, a1: -360 * D },
];
const _paths = {};
export const P = (d) => (_paths[d] ||= new Path2D(d));

// logos:google wordmark, viewBox 0 0 512 168 (letters left to right: G o o g l e)
export const WORDMARK = {
  w: 512, h: 168,
  letters: [
    { ch: 'G', color: C.blue, x0: 0.7, x1: 127.2, d: 'M66.59 112.328c-26.102 0-46.534-21.056-46.534-47.158c0-26.101 20.432-47.157 46.534-47.157c14.079 0 24.357 5.544 31.957 12.646l12.522-12.521C100.479 7.984 86.338.258 66.59.258C30.833.259.744 29.414.744 65.17s30.089 64.912 65.846 64.912c19.312 0 33.889-6.354 45.289-18.19c11.711-11.712 15.324-28.158 15.324-41.489c0-4.174-.498-8.472-1.059-11.649H66.59v17.318h42.423c-1.246 10.84-4.672 18.253-9.718 23.298c-6.105 6.168-15.76 12.958-32.705 12.958' },
    { ch: 'o', color: C.red, x0: 135, x1: 218.2, d: 'M218.216 88.78c0 23.984-18.688 41.613-41.613 41.613c-22.924 0-41.613-17.691-41.613-41.613c0-24.108 18.689-41.675 41.613-41.675c22.925 0 41.613 17.567 41.613 41.675m-18.19 0c0-14.95-10.84-25.23-23.423-25.23S153.18 73.83 153.18 88.78c0 14.826 10.84 25.23 23.423 25.23c12.584 0 23.423-10.404 23.423-25.23' },
    { ch: 'o', color: C.yellow, x0: 225.9, x1: 309.1, d: 'M309.105 88.967c0 23.984-18.689 41.613-41.613 41.613c-22.925 0-41.613-17.63-41.613-41.613c0-24.108 18.688-41.613 41.613-41.613c22.924 0 41.613 17.443 41.613 41.613m-18.253 0c0-14.95-10.839-25.23-23.423-25.23s-23.423 10.28-23.423 25.23c0 14.826 10.84 25.23 23.423 25.23c12.646 0 23.423-10.466 23.423-25.23' },
    { ch: 'g', color: C.blue, x0: 317.3, x1: 396.4, d: 'M379.125 50.593h17.318V124.6c0 30.711-18.128 43.357-39.558 43.357c-20.183 0-32.33-13.58-36.878-24.606l15.885-6.604c2.865 6.79 9.78 14.827 20.993 14.827c13.767 0 22.24-8.535 22.24-24.482v-5.98h-.623c-4.112 4.983-11.961 9.468-21.928 9.468c-20.807 0-39.87-18.128-39.87-41.488c0-23.486 19.063-41.8 39.87-41.8c9.905 0 17.816 4.423 21.928 9.282h.623zm1.245 38.499c0-14.702-9.78-25.417-22.239-25.417c-12.584 0-23.174 10.715-23.174 25.417c0 14.514 10.59 25.042 23.174 25.042c12.46.063 22.24-10.528 22.24-25.042' },
    { ch: 'l', color: C.green, x0: 407.4, x1: 425.3, d: 'M407.407 4.931h17.94v121.85h-17.94z' },
    { ch: 'e', color: C.red, x0: 434.3, x1: 512, d: 'm496.052 102.672l14.204 9.469c-4.61 6.79-15.636 18.44-34.699 18.44c-23.672 0-41.301-18.315-41.301-41.614c0-24.793 17.816-41.613 39.308-41.613c21.616 0 32.206 17.193 35.633 26.475l1.869 4.735l-55.692 23.049c4.236 8.348 10.84 12.584 20.183 12.584c9.345 0 15.823-4.61 20.495-11.525M452.384 87.66l37.19-15.45c-2.056-5.17-8.16-8.845-15.45-8.845c-9.281 0-22.176 8.223-21.74 24.295' },
  ],
};

// Draw the full-colour G icon with its centre at (x, y) and total height `size`.
export function drawGIcon(ctx, x, y, size, alpha = 1, colorOverride) {
  const k = size / G_ICON.h;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x - G_ICON.cx * k, y - G_ICON.cy * k);
  ctx.scale(k, k);
  for (const s of G_SEGS) {
    ctx.fillStyle = colorOverride ? colorOverride(s) : s.color;
    ctx.fill(P(G_ICON[s.key]));
  }
  ctx.restore();
}

// ---------- primitives ----------
export function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// White card with a soft neutral lift plus an optional coloured glow shadow (the glow
// replaces a grey drop shadow, Material/Apple-clean style).
export function card(ctx, x, y, w, h, r, { glow, glowA = 0.3, lift = 1, fill = C.white, border = 0 } = {}) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = rgba(glow, glowA * lift);
    ctx.shadowBlur = 64;
    ctx.shadowOffsetY = 22;
    rr(ctx, x + 10, y + 16, w - 20, h - 18, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.shadowColor = `rgba(32,33,36,${0.16 * lift})`;
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  if (border > 0) {
    ctx.save();
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
    ctx.strokeStyle = rgba(C.line, border);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

// Soft drifting colour fields on white: the "air" behind every light shot.
export function paper(ctx, W, H, t, { blobs = DOTS, alpha = 0.09, base = C.white, seed = 0, spread = 1 } = {}) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  if (alpha <= 0.001) return;
  const anchors = [[0.08, 0.12], [0.92, 0.18], [0.12, 0.92], [0.9, 0.88]];
  blobs.forEach((col, i) => {
    const [ax, ay] = anchors[(i + seed) % 4];
    const x = W * (0.5 + (ax - 0.5) * spread) + Math.sin(t * 0.21 + i * 1.7) * 60;
    const y = H * (0.5 + (ay - 0.5) * spread) + Math.cos(t * 0.17 + i * 2.3) * 50;
    const r = 620 + 60 * Math.sin(t * 0.13 + i);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, alpha));
    g.addColorStop(0.55, rgba(col, alpha * 0.35));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
}

// ---------- UI glyphs ----------
export function magnifier(ctx, x, y, s, color = C.mute, lw = 2.6) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 24, s / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(-2, -2, 7, 0, Math.PI * 2);
  ctx.moveTo(3.2, 3.2);
  ctx.lineTo(9, 9);
  ctx.stroke();
  ctx.restore();
}

// Arrow pointer with a soft shadow; (x, y) is the tip.
export function cursor(ctx, x, y, s = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s * 1.7, s * 1.7);
  const p = new Path2D('M0 0 L0 22 L5.6 16.8 L9.4 25.4 L13 23.8 L9.3 15.4 L16.6 15.2 Z');
  ctx.shadowColor = 'rgba(32,33,36,0.28)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = C.white;
  ctx.fill(p);
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.4;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ink;
  ctx.stroke(p);
  ctx.restore();
}

// Google-Maps-style destination pin; (x, y) is the tip on the ground. h = pixel height.
export function pin(ctx, x, y, h = 64, alpha = 1, squash = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(1 / Math.sqrt(squash), squash);
  const r = h * 0.36;
  const cy = -h + r;
  // ground shadow
  ctx.save();
  ctx.scale(1, 0.35);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.9);
  sg.addColorStop(0, 'rgba(32,33,36,0.28)');
  sg.addColorStop(1, 'rgba(32,33,36,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  const a = Math.asin(r / (h - r));
  ctx.moveTo(0, 0);
  ctx.arc(0, cy, r, Math.PI / 2 + a, Math.PI / 2 - a + Math.PI * 2, false);
  ctx.closePath();
  ctx.fillStyle = C.red;
  ctx.shadowColor = 'rgba(32,33,36,0.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = C.redDeep;
  ctx.lineWidth = Math.max(1, h * 0.03);
  ctx.stroke();
  ctx.fillStyle = C.redDeep;
  ctx.beginPath();
  ctx.arc(0, cy, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// "You are here" blue location puck with halo.
export function puck(ctx, x, y, r = 11, halo = 1, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (halo > 0) {
    ctx.fillStyle = rgba(C.blue, 0.18 * halo);
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowColor = 'rgba(32,33,36,0.3)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(x, y, r + 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = C.blue;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Map point-of-interest label (red text with a white halo), anchored left-middle.
export function poiLabel(ctx, x, y, str, fontFn, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = fontFn(27, 500);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = '#C5221F';
  ctx.fillText(str, x, y);
  ctx.restore();
}

// Corner bracket of the Lens viewfinder. corner: 0 TL, 1 TR, 2 BR, 3 BL.
export function bracket(ctx, x, y, corner, len = 70, rad = 26, lw = 9, color = C.white) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((corner * Math.PI) / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(32,33,36,0.22)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, len);
  ctx.lineTo(0, rad);
  ctx.arcTo(0, 0, rad, 0, rad);
  ctx.lineTo(len, 0);
  ctx.stroke();
  ctx.restore();
}

// Small label pill used on result cards: coloured dot + text.
export function labelPill(ctx, x, y, text, dot, fontFn, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = fontFn(26, 500);
  ctx.letterSpacing = '0px';
  const w = ctx.measureText(text).width + 70;
  ctx.shadowColor = 'rgba(32,33,36,0.14)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  rr(ctx, x, y, w, 50, 25);
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = dot;
  ctx.beginPath();
  ctx.arc(x + 28, y + 25, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 46, y + 26);
  ctx.restore();
  return w;
}
