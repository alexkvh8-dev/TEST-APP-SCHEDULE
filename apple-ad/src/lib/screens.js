// UI drawn into device screens: iPhone Lock Screen (with Dynamic Island and the
// Siri edge glow), Apple Watch activity face, Mac desktop. Times read 9:41, as on
// every Apple product shot.

import { A, roundRect, squircle, drawLogo } from './apple.js';
import { font, text } from './type.js';
import { clamp, lerp, TAU } from './util.js';

export const PHONE_PX = { w: 680, h: 1440, r: 112 };

function aurora(g, w, h, t, scale = 1, palette = ['#0b1640', '#2a3fb8', '#7b3fd6', '#ff7a45']) {
  g.save();
  g.translate(w / 2, h / 2);
  g.scale(scale, scale);
  g.translate(-w / 2, -h / 2);
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, palette[0]);
  bg.addColorStop(1, '#05060c');
  g.fillStyle = bg;
  g.fillRect(-w, -h, w * 3, h * 3);
  const blob = (x, y, r, c, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, c);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = a;
    g.fillStyle = gr;
    g.fillRect(-w, -h, w * 3, h * 3);
  };
  blob(w * (0.3 + 0.05 * Math.sin(t * 0.3)), h * 0.62, w * 0.9, palette[1], 0.9);
  blob(w * (0.75 + 0.04 * Math.sin(t * 0.25 + 1)), h * 0.78, w * 0.8, palette[2], 0.85);
  blob(w * 0.55, h * (0.98 + 0.02 * Math.sin(t * 0.4)), w * 0.7, palette[3], 0.8);
  g.globalAlpha = 1;
  g.restore();
}

export function solidWallpaper(g, w, h, c1, c2) {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, c1);
  bg.addColorStop(1, c2);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
}

/**
 * st.wake 0..1, st.t seconds, st.island 0..1 (Live Activity expansion),
 * st.glow 0..1 (Siri edge glow), st.wall optional palette or [c1, c2] solid colours.
 */
export function lockScreen(g, st) {
  const { w, h, r } = PHONE_PX;
  const { wake = 1, t = 0, island = 0, glow = 0, wall } = st;
  g.reset();
  g.save();
  squircle(g, 0, 0, w, h, r);
  g.clip();
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  g.globalAlpha = wake;
  if (wall && wall.length === 2) solidWallpaper(g, w, h, wall[0], wall[1]);
  else aurora(g, w, h, t, lerp(1.12, 1, wake), wall);
  // dim behind the glow
  if (glow > 0) { g.fillStyle = `rgba(0,0,0,${0.35 * glow})`; g.fillRect(0, 0, w, h); }
  // date + clock (clock is Apple's iconic 9:41)
  const ca = clamp(wake * 1.4 - 0.4);
  g.globalAlpha = ca;
  text(g, 'Tuesday, September 9', w / 2, 236, 38, 600, 'rgba(255,255,255,0.88)', 'center', -0.005);
  text(g, '9:41', w / 2, 476, 240, 600, 'rgba(255,255,255,0.94)', 'center', -0.03);
  // bottom controls
  for (const [x, glyph] of [[118, 'torch'], [w - 118, 'cam']]) {
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.beginPath(); g.arc(x, h - 150, 52, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 5;
    if (glyph === 'torch') { roundRect(g, x - 11, h - 178, 22, 56, 6); g.stroke(); }
    else { roundRect(g, x - 22, h - 168, 44, 34, 8); g.stroke(); g.beginPath(); g.arc(x, h - 151, 9, 0, TAU); g.stroke(); }
  }
  g.fillStyle = 'rgba(255,255,255,0.92)';
  roundRect(g, w / 2 - 130, h - 30, 260, 10, 5); g.fill();
  g.globalAlpha = 1;

  // Dynamic Island: pill that grows into a Live Activity
  const iw = lerp(196, 620, island), ih = lerp(58, 150, island), ir = lerp(29, 56, island);
  g.fillStyle = '#000';
  roundRect(g, w / 2 - iw / 2, 30, iw, ih, ir);
  g.fill();
  if (island > 0.35) {
    const a = clamp((island - 0.35) / 0.4);
    g.globalAlpha = a;
    const ax = w / 2 - iw / 2 + 28, ay = 30 + ih / 2;
    const art = g.createLinearGradient(ax, ay - 40, ax + 80, ay + 40);
    art.addColorStop(0, '#ff9f0a');
    art.addColorStop(1, '#ff375f');
    g.fillStyle = art;
    roundRect(g, ax, ay - 40, 80, 80, 16); g.fill();
    text(g, 'Now Playing', ax + 104, ay - 6, 30, 600, '#fff', 'left', 0, 'Inter');
    text(g, 'Golden Hour', ax + 104, ay + 30, 26, 500, 'rgba(255,255,255,0.6)', 'left', 0, 'Inter');
    // live waveform
    g.fillStyle = '#ff9f0a';
    for (let i = 0; i < 6; i++) {
      const bh = 14 + 30 * Math.abs(Math.sin(t * 6 + i * 1.3));
      roundRect(g, w / 2 + iw / 2 - 120 + i * 15, ay - bh / 2, 8, bh, 4); g.fill();
    }
    g.globalAlpha = 1;
  }
  // camera dot inside the island
  g.fillStyle = '#111';
  g.beginPath(); g.arc(w / 2 + iw / 2 - 30 - island * 400, 30 + 29, island > 0.2 ? 0 : 12, 0, TAU); g.fill();

  // Siri / intelligence edge glow
  if (glow > 0) edgeGlow(g, w, h, r, t, glow);
  g.restore();
}

export function edgeGlow(g, w, h, r, t, amt) {
  const cg = g.createConicGradient(t * 1.4, w / 2, h / 2);
  const cols = A.glow.concat([A.glow[0]]);
  cols.forEach((c, i) => cg.addColorStop(i / (cols.length - 1), c));
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const [lw, blur, a] of [[90, 40, 0.55], [36, 14, 0.8], [10, 2, 1]]) {
    g.globalAlpha = a * amt;
    g.filter = `blur(${blur}px)`;
    g.strokeStyle = cg;
    g.lineWidth = lw;
    squircle(g, 0, 0, w, h, r);
    g.stroke();
  }
  g.restore();
}

export function watchFace(g, S, t, wake = 1) {
  g.reset();
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S * 1.22);
  g.globalAlpha = wake;
  const cx = S / 2, cy = S * 0.66;
  const rings = [['#FA114F', 0.78], ['#92E82A', 0.62], ['#1EEAEF', 0.85]];
  rings.forEach(([c, frac], i) => {
    const rr = S * (0.36 - i * 0.1);
    g.lineCap = 'round';
    g.lineWidth = S * 0.085;
    g.strokeStyle = c;
    g.globalAlpha = 0.25 * wake;
    g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.stroke();
    g.globalAlpha = wake;
    g.beginPath(); g.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + TAU * frac * clamp(wake * 1.2)); g.stroke();
  });
  text(g, '10:09', S * 0.92, S * 0.2, S * 0.16, 600, '#fff', 'right', -0.02);
}

export function macDesktop(g, w, h, t, on = 1) {
  g.reset();
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  g.globalAlpha = on;
  aurora(g, w, h, t, 1, ['#0d1b4a', '#3156d6', '#8a4dde', '#ff8a4c']);
  // menu bar
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(0, 0, w, h * 0.035);
  drawLogo(g, w * 0.022, h * 0.0175, h * 0.022, '#fff');
  ['Finder', 'File', 'Edit', 'View', 'Go', 'Window', 'Help'].reduce((x, s, i) => {
    text(g, s, x, h * 0.025, h * 0.019, i ? 500 : 600, '#fff', 'left', 0, 'Inter');
    return x + (s.length * h * 0.012 + h * 0.022);
  }, w * 0.045);
  text(g, 'Tue Sep 9  9:41 AM', w * 0.985, h * 0.025, h * 0.019, 500, '#fff', 'right', 0, 'Inter');
  // dock
  const n = 11, s = h * 0.075, gap = s * 0.25, dw = n * s + (n + 1) * gap;
  g.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(g, w / 2 - dw / 2, h - s - gap * 3.2, dw, s + gap * 2, s * 0.35); g.fill();
  const cols = ['#0A84FF', '#30D158', '#FF9F0A', '#FF375F', '#BF5AF2', '#64D2FF', '#FFD60A', '#ff6b6b', '#5E5CE6', '#8e8e93', '#34c759'];
  cols.forEach((c, i) => {
    const x = w / 2 - dw / 2 + gap + i * (s + gap), y = h - s - gap * 2.2;
    const gr = g.createLinearGradient(x, y, x, y + s);
    gr.addColorStop(0, c);
    gr.addColorStop(1, '#1d1d1f');
    g.fillStyle = gr;
    squircle(g, x, y, s, s, s * 0.24); g.fill();
  });
  g.globalAlpha = 1;
}
