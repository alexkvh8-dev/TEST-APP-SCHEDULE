// Cover artwork for the library wall: music (albums + Spotify-made playlists), podcasts
// and audiobooks, packed into 8x8 texture atlases (one per category) plus large versions
// for the four hero tiles that the previous shot hands over.

import { C, drawSpotifyIcon } from './brand.js';
import { makeCover } from './covers.js';
import { font } from './type.js';
import { rng, TAU } from './util.js';

const PAL = [C.pink, C.blue, C.lime, C.navy, C.yellow, C.orange, C.red, C.purple, C.sky, C.teal, '#E8115B', '#148A08', '#BC5900', '#503750', '#8D67AB', '#E1118C', '#27856A', '#1E3264', '#B49BC8', '#DC148C'];
const PATTERNS = ['sun', 'rings', 'stripes', 'dots', 'wave', 'blob', 'grid', 'bars'];
const MUSIC = ['Discover Weekly', 'Release Radar', 'On Repeat', 'Repeat Rewind', 'Daylist', 'Time Capsule', 'Chill Mix', 'Workout Mix', 'Focus Flow', 'Night Drive', 'Mood Booster', 'Afterglow', 'Low Tide', 'Glasshouse', 'Velvet Hours', 'Saltwater', 'Prism', 'Wildflowers', 'Satellite Hearts', 'Northern Static', 'Lucid', 'Summer Rewind', 'Indie Mix', 'Throwback', 'Daily Mix 3', 'Daily Mix 4', 'Daily Mix 5', 'Sunday Slow', 'Golden Hour', 'Neon Nights', 'Road Trip', 'Fresh Finds'];
const PODCASTS = ['Deep Talks', 'Morning Brief', 'Tech Unfiltered', 'True Story', 'Mind Matters', 'Off the Record', 'Laugh Track', 'Startup Diaries', 'The Long Game', 'Night Shift', 'Field Notes', 'Sound Mind', 'Two Coffees', 'Plot Twist', 'Big Ideas', 'Small Talk', 'Game Day', 'Cold Case', 'Past Lives', 'Money Moves', 'Out Loud', 'Daily Dose', 'Behind the Beat', 'Late Night Radio'];
const BOOKS = ['The Quiet Sea', 'Northern Lights', 'A Year of Rain', 'The Last Orchard', 'Silver Road', 'Paper Moons', 'The Glass Garden', 'Winter Letters', 'Salt and Stars', 'The Lighthouse', 'City of Echoes', 'Wild Atlas', 'The Long Way Home', 'Small Fires', 'Blue Hour', 'The Cartographer'];
const AUTHORS = ['A. Rivera', 'M. Okafor', 'J. Lindqvist', 'S. Patel', 'E. Moreno', 'K. Tanaka', 'R. Adeyemi', 'L. Novak', 'D. Castillo', 'H. Bergström'];

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function wrap(g, str, x, y, size, maxW, lh = 0.95) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  lines.push(line);
  lines.forEach((l, i) => g.fillText(l, x, y - (lines.length - 1 - i) * size * lh));
}

// ---- music ----
export function musicCover(i, S, spec) {
  const r = rng(100 + i);
  const a = PAL[i % PAL.length], b = PAL[(i * 7 + 3) % PAL.length];
  const light = [C.lime, C.yellow, C.sky, '#B49BC8'].includes(a);
  return makeCover(spec || {
    title: MUSIC[i % MUSIC.length], a, b: b === a ? C.ink : b, ink: light ? C.ink : '#fff',
    p: PATTERNS[Math.floor(r() * PATTERNS.length)], band: i % 9 === 0 ? b : null,
  }, S, i + 3);
}

// ---- podcasts: bold type, a host "portrait" or a mic, the PODCAST eyebrow ----
export function podcastCover(i, S) {
  const c = canvas(S, S), g = c.getContext('2d');
  const r = rng(300 + i);
  const a = PAL[(i * 3 + 1) % PAL.length], b = PAL[(i * 5 + 7) % PAL.length];
  const dark = ![C.lime, C.yellow, C.sky, '#B49BC8'].includes(a);
  const ink = dark ? '#ffffff' : C.ink;
  g.fillStyle = a; g.fillRect(0, 0, S, S);
  const style = i % 3;
  if (style === 0) {
    // host portrait: abstract head + shoulders in a circle
    g.fillStyle = b; g.beginPath(); g.arc(S * 0.66, S * 0.42, S * 0.3, 0, TAU); g.fill();
    g.fillStyle = dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)';
    g.beginPath(); g.arc(S * 0.66, S * 0.36, S * 0.1, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(S * 0.66, S * 0.62, S * 0.17, S * 0.12, 0, Math.PI, 0); g.fill();
  } else if (style === 1) {
    // studio mic
    g.save(); g.translate(S * 0.72, S * 0.36); g.rotate(-0.25);
    g.fillStyle = b; g.beginPath(); g.roundRect(-S * 0.08, -S * 0.17, S * 0.16, S * 0.26, S * 0.08); g.fill();
    g.strokeStyle = b; g.lineWidth = S * 0.025;
    g.beginPath(); g.arc(0, 0, S * 0.13, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.beginPath(); g.moveTo(0, S * 0.13); g.lineTo(0, S * 0.22); g.stroke();
    g.restore();
  } else {
    // speech waveform
    g.fillStyle = b;
    for (let k = 0; k < 11; k++) { const h = S * (0.05 + 0.22 * Math.abs(Math.sin(k * 1.7 + i))); g.beginPath(); g.roundRect(S * (0.42 + k * 0.045), S * 0.32 - h / 2, S * 0.026, h, S * 0.013); g.fill(); }
  }
  g.fillStyle = ink;
  g.font = font(S * 0.055, 800);
  g.letterSpacing = `${S * 0.012}px`;
  g.globalAlpha = 0.85;
  g.fillText('PODCAST', S * 0.07, S * 0.12);
  g.globalAlpha = 1;
  g.font = font(S * 0.13, 900);
  g.letterSpacing = `${-S * 0.004}px`;
  wrap(g, PODCASTS[i % PODCASTS.length].toUpperCase(), S * 0.07, S * 0.9, S * 0.13, S * 0.86);
  return c;
}

// ---- audiobooks: a book (with spine and title) sitting on the tile ----
export function bookCover(i, S) {
  const c = canvas(S, S), g = c.getContext('2d');
  const r = rng(500 + i);
  const a = PAL[(i * 7 + 2) % PAL.length], b = PAL[(i * 3 + 9) % PAL.length];
  g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, S, S);
  const bw = S * 0.6, bh = S * 0.86, bx = (S - bw) / 2, by = S * 0.07;
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = S * 0.06; g.shadowOffsetY = S * 0.02;
  const gr = g.createLinearGradient(bx, by, bx + bw, by + bh);
  gr.addColorStop(0, a); gr.addColorStop(1, b);
  g.fillStyle = gr; g.fillRect(bx, by, bw, bh);
  g.restore();
  g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
  // motif
  const m = i % 4;
  g.fillStyle = 'rgba(255,255,255,0.85)';
  if (m === 0) { g.beginPath(); g.arc(bx + bw * 0.5, by + bh * 0.42, bw * 0.2, 0, TAU); g.fill(); }
  else if (m === 1) { g.beginPath(); g.moveTo(bx, by + bh * 0.6); for (let k = 0; k <= 6; k++) g.lineTo(bx + (k / 6) * bw, by + bh * (0.45 + (k % 2) * 0.12)); g.lineTo(bx + bw, by + bh); g.lineTo(bx, by + bh); g.fill(); }
  else if (m === 2) { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = S * 0.012; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(bx, by + bh * (0.35 + k * 0.06)); g.bezierCurveTo(bx + bw * 0.3, by + bh * (0.3 + k * 0.06), bx + bw * 0.6, by + bh * (0.42 + k * 0.06), bx + bw, by + bh * (0.36 + k * 0.06)); g.stroke(); } }
  else { for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(bx + r() * bw, by + bh * (0.2 + r() * 0.4), S * (0.004 + r() * 0.008), 0, TAU); g.fill(); } g.beginPath(); g.arc(bx + bw * 0.7, by + bh * 0.32, bw * 0.12, 0, TAU); g.fill(); }
  // spine shading
  const sp = g.createLinearGradient(bx, 0, bx + bw * 0.12, 0);
  sp.addColorStop(0, 'rgba(0,0,0,0.45)'); sp.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sp; g.fillRect(bx, by, bw * 0.12, bh);
  g.restore();
  g.fillStyle = '#ffffff';
  g.font = font(S * 0.068, 900);
  g.letterSpacing = `${S * 0.004}px`;
  wrap(g, BOOKS[i % BOOKS.length].toUpperCase(), bx + bw * 0.12, by + bh * 0.84, S * 0.07, bw * 0.8, 1.0);
  g.font = font(S * 0.04, 700);
  g.letterSpacing = `${S * 0.006}px`;
  g.globalAlpha = 0.85;
  g.fillText(AUTHORS[i % AUTHORS.length].toUpperCase(), bx + bw * 0.12, by + bh * 0.94);
  g.globalAlpha = 1;
  return c;
}

export const HERO_SPECS = [
  { title: 'Your Hype Mix', a: C.pink, b: C.orange, ink: '#fff', p: 'bars', band: null },
  { title: 'Deep Focus', a: C.blue, b: C.lime, ink: '#fff', p: 'grid', band: null },
  { title: 'Chill Vibes', a: C.lime, b: C.navy, ink: C.navy, p: 'sun', band: null },
  { title: 'Late Night Drive', a: C.navy, b: C.yellow, ink: '#fff', p: 'blob', band: null },
];

// 8x8 atlas of 256px cells (6px gutter inside each cell against mip bleed).
export function atlas(draw) {
  const N = 8, S = 256, gut = 6;
  const c = canvas(N * S, N * S), g = c.getContext('2d');
  g.fillStyle = '#121212'; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < N * N; i++) {
    const cv = draw(i, S - gut * 2);
    g.drawImage(cv, (i % N) * S + gut, Math.floor(i / N) * S + gut);
  }
  return c;
}
