// Procedural album / playlist artwork in the Spotify editorial style: bold duotones,
// a single graphic idea per cover, heavy type, the small icon in the corner.

import { C, drawSpotifyIcon, roundRect } from './brand.js';
import { font } from './type.js';
import { rng } from './util.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function wrapTitle(ctx, title, x, y, size, color, maxW) {
  ctx.font = font(size, 900);
  ctx.letterSpacing = `${-0.04 * size}px`;
  ctx.fillStyle = color;
  const words = title.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y - (lines.length - 1 - i) * size * 0.92));
}

const PATTERNS = {
  sun(ctx, S, a, b, r) {
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.arc(S * (0.55 + r() * 0.2), S * 0.52, S * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = a;
    for (let i = 0; i < 6; i++) ctx.fillRect(0, S * 0.5 + i * S * 0.05, S, S * 0.012 * (i + 1));
  },
  rings(ctx, S, a, b) {
    ctx.strokeStyle = b;
    ctx.lineWidth = S * 0.035;
    for (let i = 1; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(S * 0.7, S * 0.35, i * S * 0.07, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  stripes(ctx, S, a, b) {
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-0.5);
    ctx.fillStyle = b;
    for (let i = -8; i < 8; i++) ctx.fillRect(i * S * 0.12, -S, S * 0.05, S * 2);
    ctx.restore();
  },
  dots(ctx, S, a, b) {
    ctx.fillStyle = b;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const rr = S * 0.012 * (1 + ((x + y) % 4));
      ctx.beginPath();
      ctx.arc(S * (0.08 + x * 0.12), S * (0.08 + y * 0.09), rr, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  wave(ctx, S, a, b) {
    ctx.fillStyle = b;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(0, S);
      for (let x = 0; x <= S; x += 8) ctx.lineTo(x, S * (0.35 + k * 0.12) + Math.sin(x / S * Math.PI * 2 + k) * S * 0.06);
      ctx.lineTo(S, S);
      ctx.closePath();
      ctx.globalAlpha = 0.45 + k * 0.25;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  blob(ctx, S, a, b, r) {
    ctx.fillStyle = b;
    ctx.beginPath();
    const n = 9, cx = S * 0.6, cy = S * 0.4;
    for (let i = 0; i <= n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const rad = S * (0.26 + r() * 0.1);
      const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
      i === 0 ? ctx.moveTo(px, py) : ctx.quadraticCurveTo(cx + Math.cos(ang - 0.35) * rad * 1.15, cy + Math.sin(ang - 0.35) * rad * 1.15, px, py);
    }
    ctx.fill();
  },
  grid(ctx, S, a, b) {
    ctx.strokeStyle = b;
    ctx.lineWidth = S * 0.012;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i * S / 10, 0); ctx.lineTo(i * S / 10, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * S / 10); ctx.lineTo(S, i * S / 10); ctx.stroke();
    }
    ctx.fillStyle = b;
    roundRect(ctx, S * 0.5, S * 0.1, S * 0.4, S * 0.4, S * 0.2);
    ctx.fill();
  },
  bars(ctx, S, a, b, r) {
    ctx.fillStyle = b;
    for (let i = 0; i < 9; i++) {
      const h = S * (0.15 + r() * 0.5);
      roundRect(ctx, S * (0.06 + i * 0.1), S * 0.72 - h, S * 0.06, h, S * 0.03);
      ctx.fill();
    }
  },
};

export const COVER_SPECS = [
  { title: 'Daily Mix 1', a: C.pink, b: C.orange, ink: '#fff', p: 'sun', band: C.pink },
  { title: 'Discover Weekly', a: C.blue, b: C.lime, ink: '#fff', p: 'rings', band: null },
  { title: 'Release Radar', a: C.lime, b: C.navy, ink: C.navy, p: 'dots', band: null },
  { title: 'On Repeat', a: C.purple, b: C.pink, ink: '#fff', p: 'stripes', band: null },
  { title: 'Chill Vibes', a: C.teal, b: C.lime, ink: '#fff', p: 'wave', band: null },
  { title: 'Beast Mode', a: C.red, b: C.yellow, ink: '#fff', p: 'bars', band: null },
  { title: 'Deep Focus', a: C.navy, b: C.sky, ink: '#fff', p: 'grid', band: null },
  { title: 'Late Night Drive', a: C.plum, b: C.pink, ink: '#fff', p: 'blob', band: null },
  { title: 'Daily Mix 2', a: C.yellow, b: C.orange, ink: C.ink, p: 'sun', band: C.yellow },
  { title: 'Your Top Songs', a: C.green, b: C.ink, ink: C.ink, p: 'rings', band: null },
  { title: 'Throwback', a: C.orange, b: C.purple, ink: '#fff', p: 'stripes', band: null },
  { title: 'Indie Mix', a: C.sky, b: C.navy, ink: '#fff', p: 'blob', band: null },
  { title: 'Summer Hits', a: C.yellow, b: C.pink, ink: C.ink, p: 'wave', band: null },
  { title: 'Daylist', a: C.lime, b: C.purple, ink: C.ink, p: 'bars', band: null },
];

export function makeCover(spec, S = 512, seed = 1) {
  const c = canvas(S, S);
  const ctx = c.getContext('2d');
  const r = rng(seed);
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, spec.a);
  g.addColorStop(1, spec.a);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  PATTERNS[spec.p](ctx, S, spec.a, spec.b, r);
  // Subtle top-left lighting so covers don't look like flat swatches in 3D.
  const sh = ctx.createLinearGradient(0, 0, S, S);
  sh.addColorStop(0, 'rgba(255,255,255,0.10)');
  sh.addColorStop(0.5, 'rgba(255,255,255,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, S, S);
  if (spec.band) {
    ctx.fillStyle = spec.band;
    ctx.fillRect(0, S * 0.78, S, S * 0.22);
  }
  drawSpotifyIcon(ctx, S * 0.085, S * 0.085, S * 0.04, { discColor: spec.ink === '#fff' ? '#fff' : spec.ink, arcColor: spec.a });
  wrapTitle(ctx, spec.title, S * 0.06, S * 0.92, S * 0.12, spec.band ? C.ink : spec.ink, S * 0.85);
  return c;
}

// The hero single used on the Now Playing screen.
export function makeHeroArt(S = 1024) {
  const c = canvas(S, S);
  const ctx = c.getContext('2d');
  ctx.fillStyle = C.pink;
  ctx.fillRect(0, 0, S, S);
  // sun
  const sg = ctx.createLinearGradient(0, S * 0.3, 0, S * 0.85);
  sg.addColorStop(0, C.yellow);
  sg.addColorStop(1, C.orange);
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(S * 0.62, S * 0.62, S * 0.27, 0, Math.PI * 2);
  ctx.fill();
  // horizon cuts through the sun
  ctx.fillStyle = C.pink;
  for (let i = 0; i < 7; i++) ctx.fillRect(0, S * (0.6 + i * 0.045), S, S * (0.006 + i * 0.0045));
  ctx.fillStyle = C.purple;
  ctx.fillRect(0, S * 0.86, S, S * 0.14);
  // arcs echo
  ctx.strokeStyle = 'rgba(30,50,100,0.9)';
  ctx.lineWidth = S * 0.018;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(S * 0.62, S * 0.62, S * (0.34 + i * 0.06), Math.PI * 1.08, Math.PI * 1.55);
    ctx.stroke();
  }
  ctx.font = font(S * 0.085, 900);
  ctx.letterSpacing = `${-0.03 * S * 0.085}px`;
  ctx.fillStyle = C.navy;
  ctx.fillText('GOLDEN', S * 0.07, S * 0.17);
  ctx.fillText('HOUR', S * 0.07, S * 0.25);
  ctx.font = font(S * 0.03, 700);
  ctx.letterSpacing = `${0.2 * S * 0.03}px`;
  ctx.fillText('NEON ARCS', S * 0.075, S * 0.31);
  return c;
}
