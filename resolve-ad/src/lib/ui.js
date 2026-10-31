// DaVinci Resolve interface, redrawn in canvas: page bar, Edit timeline, Color page
// (wheels / nodes / parade), Fusion node graph, Fairlight tracks + mixer, Deliver queue.
// Every function draws into a rectangle so pages can be composed or floated in 3D.

import { B, PAGES, rgba, drawResolveIcon } from './brand.js';
import { clamp, lerp, TAU, noise1 } from './util.js';

const F = (s, w = 500) => `${w} ${s}px "Inter"`;
export function label(g, s, x, y, size = 13, color = B.text, w = 500, align = 'left') {
  g.font = F(size, w);
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(s, x, y);
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

export function panel(g, x, y, w, h, title) {
  g.fillStyle = B.panel;
  rr(g, x, y, w, h, 6); g.fill();
  if (title) {
    g.fillStyle = B.panel2;
    rr(g, x, y, w, 26, [6, 6, 0, 0]); g.fill();
    label(g, title, x + 12, y + 13, 12, B.mute, 600);
  }
}

// ---- page bar with the seven page icons ----
function pageIcon(g, name, cx, cy, s, on) {
  g.save();
  g.strokeStyle = on ? '#ffffff' : '#9a9aa2';
  g.fillStyle = on ? '#ffffff' : '#9a9aa2';
  g.lineWidth = 1.8;
  const h = s / 2;
  switch (name) {
    case 'Media': rr(g, cx - h, cy - h * 0.75, s, s * 0.75, 2); g.stroke(); for (let i = 0; i < 3; i++) g.fillRect(cx - h + 3 + i * (s / 3), cy - h * 0.55, s / 5, s / 5); break;
    case 'Cut': for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * h * 0.5, cy + h * 0.5, h * 0.32, 0, TAU); g.stroke(); } g.beginPath(); g.moveTo(cx - h * 0.3, cy + h * 0.2); g.lineTo(cx + h * 0.5, cy - h); g.moveTo(cx + h * 0.3, cy + h * 0.2); g.lineTo(cx - h * 0.5, cy - h); g.stroke(); break;
    case 'Edit': for (let i = 0; i < 3; i++) g.fillRect(cx - h + (i % 2) * 5, cy - h + i * (s / 3), s - 5 - (i % 2) * 5, s / 5); break;
    case 'Fusion': [[-0.6, 0.5], [0.6, 0.5], [0, -0.6]].forEach(([a, b]) => { g.beginPath(); g.arc(cx + a * h, cy + b * h, h * 0.3, 0, TAU); g.stroke(); }); break;
    case 'Color': g.beginPath(); g.arc(cx, cy, h * 0.9, 0, TAU); g.stroke(); [[0, -0.4], [-0.38, 0.25], [0.38, 0.25]].forEach(([a, b]) => { g.beginPath(); g.arc(cx + a * h, cy + b * h, h * 0.18, 0, TAU); g.fill(); }); break;
    case 'Fairlight': for (let i = 0; i < 5; i++) { const bh = [0.4, 0.9, 1.5, 0.8, 0.5][i] * h; g.fillRect(cx - h + i * (s / 5), cy - bh / 2, s / 9, bh); } break;
    case 'Deliver': g.beginPath(); g.moveTo(cx, cy - h); g.quadraticCurveTo(cx + h * 0.7, cy - h * 0.1, cx + h * 0.35, cy + h * 0.6); g.lineTo(cx - h * 0.35, cy + h * 0.6); g.quadraticCurveTo(cx - h * 0.7, cy - h * 0.1, cx, cy - h); g.stroke(); g.fillRect(cx - 2, cy + h * 0.6, 4, h * 0.45); break;
  }
  g.restore();
}

export function pageBar(g, x, y, w, active, glowT = 0) {
  g.fillStyle = '#18181a';
  g.fillRect(x, y, w, 56);
  const step = 74, x0 = x + w / 2 - (PAGES.length - 1) * step / 2;
  PAGES.forEach((p, i) => {
    const cx = x0 + i * step, on = p === active;
    if (on) {
      g.fillStyle = rgba(B.orange, 0.12 + 0.1 * glowT);
      rr(g, cx - 32, y + 4, 64, 48, 8); g.fill();
    }
    pageIcon(g, p, cx, y + 21, 20, on);
    label(g, p, cx, y + 44, 11, on ? '#fff' : '#8b8b93', on ? 600 : 500, 'center');
  });
  drawResolveIcon(g, x + 28, y + 28, 26);
  label(g, 'DaVinci Resolve 21', x + 50, y + 28, 12, B.mute, 600);
}

export function topBar(g, x, y, w, title) {
  g.fillStyle = '#18181a';
  g.fillRect(x, y, w, 34);
  label(g, title, x + w / 2, y + 17, 13, B.text, 600, 'center');
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + 18 + i * 20, y + 17, 6, 0, TAU); g.fill(); });
}

// ---- Edit timeline ----
export const CLIPS = [
  { tr: 0, a: 0.02, b: 0.24, name: 'A001_C004', col: B.clipV },
  { tr: 0, a: 0.25, b: 0.43, name: 'A002_C011', col: B.clipV },
  { tr: 0, a: 0.44, b: 0.70, name: 'B004_C002', col: B.clipV },
  { tr: 0, a: 0.71, b: 0.97, name: 'A007_C001', col: B.clipV },
  { tr: 1, a: 0.12, b: 0.33, name: 'Title', col: B.clipFx },
  { tr: 1, a: 0.52, b: 0.66, name: 'B-Roll', col: B.clipV2 },
  { tr: 2, a: 0.02, b: 0.97, name: 'Score.wav', col: B.clipA, audio: true },
  { tr: 3, a: 0.02, b: 0.55, name: 'VO_take3.wav', col: B.clipA, audio: true },
  { tr: 3, a: 0.58, b: 0.92, name: 'VO_take5.wav', col: B.clipA, audio: true },
];

export function timeline(g, x, y, w, h, st) {
  const { playhead = 0.3, arrive = 1, t = 0, zoom = 1, highlight = -1 } = st;
  panel(g, x, y, w, h);
  const head = 120, tracks = ['V3', 'V2', 'V1', 'A1', 'A2'];
  const th = (h - 40) / tracks.length;
  // ruler
  g.fillStyle = '#1f1f22';
  g.fillRect(x + head, y, w - head, 28);
  g.strokeStyle = '#4a4a52'; g.lineWidth = 1;
  for (let i = 0; i <= 40; i++) {
    const xx = x + head + (i / 40) * (w - head);
    g.beginPath(); g.moveTo(xx, y + (i % 5 ? 20 : 12)); g.lineTo(xx, y + 28); g.stroke();
    if (i % 10 === 0) label(g, `01:00:${String(i).padStart(2, '0')}:00`, xx + 4, y + 9, 10, B.mute);
  }
  // track headers
  tracks.forEach((n, i) => {
    const ty = y + 32 + i * th;
    g.fillStyle = '#26262a';
    g.fillRect(x, ty, head - 4, th - 3);
    label(g, n, x + 14, ty + th / 2, 13, n[0] === 'V' ? '#cfd7ff' : '#cfe9d6', 700);
    g.fillStyle = 'rgba(255,255,255,0.03)';
    g.fillRect(x + head, ty, w - head, th - 3);
  });
  // clips: arrive with a staggered snap from the right (magnetic timeline)
  const map = [2, 1, 3, 4];
  CLIPS.forEach((c, k) => {
    const row = c.audio ? (c.tr === 2 ? 3 : 4) : [2, 1][c.tr] ?? 0;
    const p = clamp(arrive * CLIPS.length - k * 0.55);
    if (p <= 0) return;
    const e = 1 - Math.pow(1 - clamp(p), 3);
    const cx = x + head + (c.a + (1 - e) * 0.4) * (w - head);
    const cw = (c.b - c.a) * (w - head);
    const cy = y + 32 + row * th + 2;
    g.globalAlpha = clamp(p * 2);
    g.fillStyle = c.col;
    rr(g, cx, cy, cw, th - 7, 4); g.fill();
    if (c.audio) {
      g.fillStyle = 'rgba(190,255,205,0.55)';
      for (let i = 0; i < cw; i += 3) {
        const a = Math.abs(noise1(i * 0.08 + k * 10, 1)) * (th - 14) * 0.45 + 1;
        g.fillRect(cx + i, cy + (th - 7) / 2 - a, 2, a * 2);
      }
    } else {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 6; i++) g.fillRect(cx + 6 + i * Math.max(30, cw / 6), cy + 18, Math.max(24, cw / 6 - 6), th - 30);
    }
    if (highlight === k) { g.strokeStyle = B.sel; g.lineWidth = 2.5; rr(g, cx, cy, cw, th - 7, 4); g.stroke(); }
    label(g, c.name, cx + 8, cy + 10, 11, 'rgba(255,255,255,0.9)', 600);
    g.globalAlpha = 1;
  });
  // playhead
  const px = x + head + playhead * (w - head);
  g.strokeStyle = B.playhead; g.fillStyle = B.playhead; g.lineWidth = 2;
  g.beginPath(); g.moveTo(px, y + 4); g.lineTo(px, y + h); g.stroke();
  g.beginPath(); g.moveTo(px - 7, y + 4); g.lineTo(px + 7, y + 4); g.lineTo(px, y + 14); g.closePath(); g.fill();
}

export function timecode(g, x, y, sec, size = 22) {
  const f = Math.floor((sec % 1) * 24), s = Math.floor(sec) % 60, m = Math.floor(sec / 60) % 60;
  label(g, `01:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`, x, y, size, '#ff8a3d', 600);
}

export function mediaPool(g, x, y, w, h, t) {
  panel(g, x, y, w, h, 'Media Pool');
  const cols = 3, cw = (w - 40) / cols, ch = cw * 0.62;
  const tints = ['#c9874d', '#6f8fb8', '#8aa06a', '#b07a8c', '#d0a35a', '#5e7fa6'];
  for (let i = 0; i < 9; i++) {
    const cx = x + 12 + (i % cols) * (cw + 8), cy = y + 38 + Math.floor(i / cols) * (ch + 28);
    const gr = g.createLinearGradient(cx, cy, cx, cy + ch);
    gr.addColorStop(0, tints[i % 6]); gr.addColorStop(1, '#222');
    g.fillStyle = gr;
    rr(g, cx, cy, cw, ch, 4); g.fill();
    label(g, `A00${i + 1}_C0${(i * 7) % 9 + 1}`, cx, cy + ch + 12, 10, B.mute);
  }
}

// ---- Color page ----
// wheels: [{name, x, y}] puck offsets in -1..1
export function colorWheels(g, x, y, w, h, pucks, t) {
  panel(g, x, y, w, h, 'Primaries – Color Wheels');
  const names = ['Lift', 'Gamma', 'Gain', 'Offset'];
  const r = Math.min((w - 60) / 8, h * 0.3);
  names.forEach((n, i) => {
    const cx = x + (w / 4) * (i + 0.5), cy = y + 40 + r + 18;
    label(g, n, cx, y + 44, 12, B.text, 600, 'center');
    // hue ring
    const cg = g.createConicGradient(-Math.PI / 2, cx, cy);
    ['#ff3b30', '#ffcc00', '#34c759', '#00c7be', '#0a84ff', '#bf5af2', '#ff3b30'].forEach((c, k, a) => cg.addColorStop(k / (a.length - 1), c));
    g.strokeStyle = cg; g.lineWidth = 6;
    g.beginPath(); g.arc(cx, cy + 8, r, 0, TAU); g.stroke();
    g.fillStyle = '#18181b';
    g.beginPath(); g.arc(cx, cy + 8, r - 5, 0, TAU); g.fill();
    g.strokeStyle = '#3a3a42'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - r * 0.7, cy + 8); g.lineTo(cx + r * 0.7, cy + 8); g.moveTo(cx, cy + 8 - r * 0.7); g.lineTo(cx, cy + 8 + r * 0.7); g.stroke();
    const p = pucks[i] || [0, 0];
    const px = cx + p[0] * r * 0.8, py = cy + 8 + p[1] * r * 0.8;
    const gl = g.createRadialGradient(px, py, 0, px, py, 16);
    gl.addColorStop(0, 'rgba(255,255,255,0.35)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(px, py, 16, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 4.5, 0, TAU); g.fill();
    // master dial + values
    g.fillStyle = '#2f2f35'; rr(g, cx - r, cy + r + 26, r * 2, 8, 4); g.fill();
    g.fillStyle = B.orange; rr(g, cx - 3 + (p[2] || 0) * r, cy + r + 22, 6, 16, 3); g.fill();
    label(g, `${(p[0] * 0.1).toFixed(2)}  ${(-p[1] * 0.1).toFixed(2)}  ${((p[2] || 0) * 0.1).toFixed(2)}`, cx, cy + r + 52, 11, B.mute, 500, 'center');
  });
}

export function parade(g, x, y, w, h, scope) {
  panel(g, x, y, w, h, 'Scopes – Parade');
  const ix = x + 12, iy = y + 34, iw = w - 24, ih = h - 46;
  g.fillStyle = '#0c0c0e'; g.fillRect(ix, iy, iw, ih);
  g.strokeStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(ix, iy + (i / 4) * ih); g.lineTo(ix + iw, iy + (i / 4) * ih); g.stroke(); }
  if (!scope) return;
  const { buf, w: sw, h: sh } = scope;
  const third = iw / 3;
  const cols = ['rgba(255,70,60,0.10)', 'rgba(70,255,120,0.10)', 'rgba(80,140,255,0.11)'];
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let ch = 0; ch < 3; ch++) {
    g.fillStyle = cols[ch];
    for (let yy = 0; yy < sh; yy += 2) for (let xx = 0; xx < sw; xx++) {
      const v = buf[(yy * sw + xx) * 4 + ch] / 255;
      g.fillRect(ix + ch * third + (xx / sw) * (third - 6), iy + (1 - v) * ih, 2, 2);
    }
  }
  g.restore();
}

export function nodeGraph(g, x, y, w, h, nodes, links, st = {}) {
  const { flow = 0, title = 'Node Editor', accent = '#7fd3ff' } = st;
  panel(g, x, y, w, h, title);
  g.save();
  g.beginPath(); g.rect(x, y + 26, w, h - 26); g.clip();
  // dotted grid
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let gx = x + 10; gx < x + w; gx += 22) for (let gy = y + 36; gy < y + h; gy += 22) g.fillRect(gx, gy, 2, 2);
  links.forEach(([a, b], i) => {
    const A = nodes[a], Bn = nodes[b];
    if (!A || !Bn || (A.a ?? 1) <= 0 || (Bn.a ?? 1) <= 0) return;
    const ax = x + A.x + A.w, ay = y + A.y + A.h / 2, bx = x + Bn.x, by = y + Bn.y + Bn.h / 2;
    const reveal = Math.min(A.a ?? 1, Bn.a ?? 1);
    g.strokeStyle = rgba('#f2c14e', 0.85 * reveal); g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(ax, ay); g.bezierCurveTo(ax + 60, ay, bx - 60, by, bx, by); g.stroke();
    // a pulse travelling along the wire
    const p = (flow + i * 0.27) % 1;
    const u = 1 - p;
    const qx = u * u * u * ax + 3 * u * u * p * (ax + 60) + 3 * u * p * p * (bx - 60) + p * p * p * bx;
    const qy = u * u * u * ay + 3 * u * u * p * ay + 3 * u * p * p * by + p * p * p * by;
    const pg = g.createRadialGradient(qx, qy, 0, qx, qy, 12);
    pg.addColorStop(0, rgba('#ffe7a3', reveal)); pg.addColorStop(1, 'rgba(255,231,163,0)');
    g.fillStyle = pg; g.beginPath(); g.arc(qx, qy, 12, 0, TAU); g.fill();
  });
  nodes.forEach((n) => {
    const a = n.a ?? 1;
    if (a <= 0) return;
    g.save();
    g.globalAlpha = clamp(a);
    const s = 0.8 + 0.2 * clamp(a);
    g.translate(x + n.x + n.w / 2, y + n.y + n.h / 2);
    g.scale(s, s);
    g.translate(-n.w / 2, -n.h / 2);
    g.fillStyle = n.col || '#3b3b44';
    rr(g, 0, 0, n.w, n.h, 6); g.fill();
    g.strokeStyle = n.sel ? B.sel : 'rgba(255,255,255,0.18)'; g.lineWidth = n.sel ? 2.5 : 1;
    rr(g, 0, 0, n.w, n.h, 6); g.stroke();
    if (n.thumb) { const gr = g.createLinearGradient(0, 0, 0, n.h); gr.addColorStop(0, n.thumb); gr.addColorStop(1, '#222'); g.fillStyle = gr; rr(g, 8, 8, n.w - 16, n.h - 30, 3); g.fill(); }
    label(g, n.label, n.w / 2, n.h - 12, 12, '#fff', 600, 'center');
    g.fillStyle = accent; g.beginPath(); g.arc(0, n.h / 2, 5, 0, TAU); g.fill();
    g.fillStyle = '#7dff9a'; g.beginPath(); g.arc(n.w, n.h / 2, 5, 0, TAU); g.fill();
    g.restore();
  });
  g.restore();
}

// ---- Fairlight ----
export function fairlight(g, x, y, w, h, st) {
  const { t = 0, clean = 0, playhead = 0.4 } = st;
  panel(g, x, y, w, h * 0.62, 'Fairlight – Timeline');
  const names = ['Dialogue', 'Music', 'FX', 'Ambience'];
  const th = (h * 0.62 - 40) / names.length;
  names.forEach((n, i) => {
    const ty = y + 32 + i * th;
    g.fillStyle = '#26262a'; g.fillRect(x + 6, ty, 110, th - 4);
    label(g, n, x + 16, ty + th / 2, 12, B.text, 600);
    const col = ['#4fd18b', '#59a6ff', '#e0b14a', '#b48cff'][i];
    g.fillStyle = rgba(col, 0.22); rr(g, x + 122, ty + 2, w - 130, th - 8, 4); g.fill();
    g.fillStyle = rgba(col, 0.85);
    const mid = ty + (th - 4) / 2;
    for (let xx = 0; xx < w - 136; xx += 2) {
      const ph = xx * 0.035 + t * 4;
      let a = (0.35 + 0.65 * Math.abs(noise1(ph * 0.5 + i * 9, i))) * Math.abs(Math.sin(ph * 0.9 + i)) * (th * 0.4);
      if (i === 0) { const noise = (1 - clean) * Math.abs(noise1(xx * 0.9 + t * 30, 7)) * th * 0.28; a = a * (0.6 + 0.4 * clean) + noise; }
      g.fillRect(x + 126 + xx, mid - a, 1.5, a * 2);
    }
  });
  const px = x + 122 + playhead * (w - 130);
  g.strokeStyle = B.playhead; g.lineWidth = 2; g.beginPath(); g.moveTo(px, y + 28); g.lineTo(px, y + h * 0.62); g.stroke();
  // mixer strip
  const my = y + h * 0.64, mh = h * 0.36;
  panel(g, x, my, w, mh, 'Mixer');
  const n = 10;
  for (let i = 0; i < n; i++) {
    const cx = x + 40 + i * ((w - 80) / (n - 1));
    const lvl = clamp(0.35 + 0.55 * Math.abs(noise1(t * 3 + i * 3.3, i)) * (i < 8 ? 1 : 0.8));
    // meter
    const mt = my + 36, mhh = mh - 56;
    const gr = g.createLinearGradient(0, mt + mhh, 0, mt);
    gr.addColorStop(0, '#2bd46a'); gr.addColorStop(0.7, '#e6d23a'); gr.addColorStop(1, '#ff4b3e');
    g.fillStyle = '#121214'; g.fillRect(cx - 22, mt, 8, mhh);
    g.fillStyle = gr; g.fillRect(cx - 22, mt + mhh * (1 - lvl), 8, mhh * lvl);
    // fader
    g.fillStyle = '#121214'; g.fillRect(cx + 4, mt, 4, mhh);
    const fy = mt + mhh * (0.3 + 0.12 * Math.sin(t * 0.8 + i));
    g.fillStyle = '#c9ccd3'; rr(g, cx - 6, fy - 9, 24, 18, 3); g.fill();
    g.fillStyle = '#555'; g.fillRect(cx - 4, fy - 1, 20, 2);
    label(g, i < 8 ? `A${i + 1}` : `Bus${i - 7}`, cx + 2, my + mh - 12, 10, B.mute, 600, 'center');
  }
}

// ---- Deliver ----
export function deliver(g, x, y, w, h, st) {
  const { progress = 0, pick = 0 } = st;
  panel(g, x, y, w * 0.34, h, 'Render Settings');
  const presets = ['Custom', 'H.264', 'H.265', 'ProRes', 'YouTube', 'Vimeo', 'TikTok', 'DCP'];
  presets.forEach((p, i) => {
    const cx = x + 14 + (i % 4) * ((w * 0.34 - 28) / 4), cy = y + 40 + Math.floor(i / 4) * 66;
    const on = i === pick;
    g.fillStyle = on ? rgba(B.orange, 0.25) : '#2d2d33';
    rr(g, cx, cy, (w * 0.34 - 28) / 4 - 8, 56, 6); g.fill();
    if (on) { g.strokeStyle = B.orange; g.lineWidth = 2; rr(g, cx, cy, (w * 0.34 - 28) / 4 - 8, 56, 6); g.stroke(); }
    label(g, p, cx + ((w * 0.34 - 28) / 4 - 8) / 2, cy + 28, 12, on ? '#fff' : B.text, 600, 'center');
  });
  [['Format', 'MP4'], ['Codec', 'H.265'], ['Resolution', '3840 × 2160 Ultra HD'], ['Frame rate', '24'], ['Quality', 'Best']].forEach(([k, v], i) => {
    label(g, k, x + 20, y + 190 + i * 34, 12, B.mute); label(g, v, x + w * 0.34 - 20, y + 190 + i * 34, 12, B.text, 600, 'right');
  });
  g.fillStyle = B.orange; rr(g, x + 20, y + h - 56, w * 0.34 - 40, 38, 6); g.fill();
  label(g, 'Add to Render Queue', x + w * 0.17, y + h - 37, 13, '#111', 700, 'center');
  const qx = x + w * 0.68, qw = w * 0.32;
  panel(g, qx, y, qw, h, 'Render Queue');
  ['Job 1 · Mountain Film · 4K H.265', 'Job 2 · Social 9:16 · 1080p', 'Job 3 · ProRes 422 HQ master'].forEach((j, i) => {
    const jy = y + 40 + i * 74;
    g.fillStyle = '#2d2d33'; rr(g, qx + 12, jy, qw - 24, 64, 6); g.fill();
    label(g, j, qx + 24, jy + 18, 12, B.text, 600);
    const p = clamp(progress * 3 - i);
    g.fillStyle = '#1a1a1d'; rr(g, qx + 24, jy + 38, qw - 48, 10, 5); g.fill();
    g.fillStyle = p >= 1 ? '#2bd46a' : B.orange; rr(g, qx + 24, jy + 38, (qw - 48) * p, 10, 5); g.fill();
    label(g, p >= 1 ? 'Complete' : `${Math.round(p * 100)}%`, qx + qw - 24, jy + 18, 11, p >= 1 ? '#2bd46a' : B.mute, 600, 'right');
  });
}
