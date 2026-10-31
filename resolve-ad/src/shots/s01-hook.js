// 0:00–0:06 · HOOK. Five words slam in on the beat, each with its page's signature
// graphic behind it (timeline, colour wheel, node chain, waveform, render bar), joined
// by whip blurs and lens-distortion punches. Lands on "One app." and collapses into a
// point of light that flares into the logo shot.

import * as E from '../lib/ease.js';
import { lerp, seg, clamp, TAU, noise1 } from '../lib/util.js';
import { kText, line } from '../lib/type.js';
import { B } from '../lib/brand.js';
import { glowBackdrop } from '../lib/stage.js';

const BEATS = [
  { t: 0.2, w: 'EDIT.', g: 'timeline', c: B.petals[2] },
  { t: 0.9, w: 'COLOR.', g: 'wheel', c: B.petals[0] },
  { t: 1.6, w: 'VFX.', g: 'nodes', c: B.orange },
  { t: 2.3, w: 'AUDIO.', g: 'wave', c: B.petals[1] },
  { t: 3.0, w: 'DELIVER.', g: 'render', c: B.orange },
];
const ONE = 3.75;

function gfx(g, kind, cx, cy, s, u, W) {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.globalCompositeOperation = 'lighter';
  if (kind === 'timeline') {
    const rows = [[B.clipV, -120], [B.clipV2, -40], [B.clipA, 40], [B.clipA, 120]];
    rows.forEach(([c, y], r) => {
      for (let i = 0; i < 5; i++) {
        const p = E.outExpo(clamp((u - r * 0.04 - i * 0.03) / 0.35));
        const x = -760 + i * 310 + (1 - p) * 900;
        g.fillStyle = c;
        g.globalAlpha = 0.55 * p;
        g.beginPath(); g.roundRect(x, y - 30, 290 - (i % 2) * 60, 60, 8); g.fill();
      }
    });
    g.globalAlpha = 1;
    g.strokeStyle = B.playhead; g.lineWidth = 4;
    const px = -700 + u * 900;
    g.beginPath(); g.moveTo(px, -190); g.lineTo(px, 190); g.stroke();
  } else if (kind === 'wheel') {
    g.rotate(u * 2.2);
    const cg = g.createConicGradient(0, 0, 0);
    ['#ff3b30', '#ffcc00', '#34c759', '#00c7be', '#0a84ff', '#bf5af2', '#ff3b30'].forEach((c, k, a) => cg.addColorStop(k / (a.length - 1), c));
    g.strokeStyle = cg; g.lineWidth = 34; g.globalAlpha = 0.85;
    g.beginPath(); g.arc(0, 0, 330, 0, TAU); g.stroke();
    g.lineWidth = 3; g.globalAlpha = 0.35;
    g.beginPath(); g.arc(0, 0, 260, 0, TAU); g.stroke();
    g.globalAlpha = 1;
    B.petals.forEach((c, i) => { const a = (i / 3) * TAU - u * 3; g.fillStyle = c; g.beginPath(); g.arc(Math.cos(a) * 150, Math.sin(a) * 150, 22, 0, TAU); g.fill(); });
  } else if (kind === 'nodes') {
    for (let i = 0; i < 4; i++) {
      const x = -600 + i * 400, p = E.outBack(1.6)(clamp((u - i * 0.06) / 0.3));
      if (i < 3) {
        g.strokeStyle = 'rgba(255,190,80,0.8)'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(x + 120, 0); g.bezierCurveTo(x + 220, 0, x + 180, 0, x + 280, 0); g.stroke();
        const q = (u * 2 + i * 0.3) % 1;
        g.fillStyle = '#fff2c8'; g.beginPath(); g.arc(x + 120 + q * 160, 0, 10, 0, TAU); g.fill();
      }
      g.save(); g.translate(x, 0); g.scale(p, p);
      g.fillStyle = '#3a3c46'; g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(-120, -70, 240, 140, 18); g.fill(); g.stroke();
      g.restore();
    }
  } else if (kind === 'wave') {
    g.fillStyle = B.petals[1];
    for (let i = -60; i <= 60; i++) {
      const a = (40 + 220 * Math.abs(noise1(i * 0.35 + u * 8, 3)) * Math.exp(-((i / 45) ** 2))) * E.outExpo(clamp(u / 0.3));
      g.globalAlpha = 0.75;
      g.beginPath(); g.roundRect(i * 13 - 4, -a, 8, a * 2, 4); g.fill();
    }
  } else if (kind === 'render') {
    const p = E.inOutCubic(clamp(u / 0.6));
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.beginPath(); g.roundRect(-520, 120, 1040, 26, 13); g.fill();
    g.fillStyle = B.orange;
    g.beginPath(); g.roundRect(-520, 120, 1040 * p, 26, 13); g.fill();
  }
  g.restore();
}

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 10);
  const shot = { name: 'S01 Hook', start: 0, end: 6, scene, camera, useBg: true };

  shot.update = (lt) => {
    const g = env.bg, f = env.fg;
    glowBackdrop(g, W, H, { base: '#060608', glows: [[W / 2, H / 2, 900, B.resolve, 0.5]] });
    let k = -1;
    BEATS.forEach((b, i) => { if (lt >= b.t) k = i; });
    let punch = 0, whip = 0;
    BEATS.forEach((b) => { punch += E.kick(lt - b.t, 0.02, 9); whip += Math.exp(-(((lt - b.t) / 0.05) ** 2)); });
    const collapse = seg(lt, 5.15, 5.95, E.inExpo);
    if (lt < ONE && k >= 0) {
      const b = BEATS[k], u = lt - b.t;
      gfx(g, b.g, W / 2, H / 2, 1 + 0.18 * (1 - E.outExpo(clamp(u / 0.4))), u, W);
      kText(f, b.w, {
        x: W / 2, y: H / 2 + 80, size: 230, weight: 900, align: 'center', mode: 'slam', t: u, dur: 0.26, stagger: 0.014, ease: E.outExpo,
        mask: false, colorAt: (i) => (i === b.w.length - 1 ? b.c : null),
      });
    } else if (lt >= ONE) {
      const u = lt - ONE;
      punch += E.kick(u, 0.02, 7);
      f.save();
      const s = lerp(1, 0.02, collapse);
      f.translate(W / 2, H / 2);
      f.scale(s, s);
      f.translate(-W / 2, -H / 2);
      kText(f, 'ONE APP.', { x: W / 2, y: H / 2 + 70, size: 250, weight: 900, align: 'center', mode: 'stretch', t: u, dur: 0.5, stagger: 0.03, mask: true, colorAt: (i) => (i === 7 ? B.orange : null) });
      line(f, 'Edit  ·  Color  ·  Effects  ·  Audio  ·  Deliver', { x: W / 2, y: H / 2 + 170, size: 38, weight: 500, fill: '#b9bcc6', t: u - 0.45, family: 'Inter', tracking: 0.02 });
      f.restore();
      // the collapsing point of light
      if (collapse > 0) {
        const r = 30 + 900 * E.inExpo(seg(lt, 5.6, 6.0));
        const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
        gr.addColorStop(0, 'rgba(255,240,220,1)'); gr.addColorStop(0.3, 'rgba(255,170,80,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.globalCompositeOperation = 'lighter'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
      }
    }
    return {
      bloom: [0.7, 0.5, 0.45],
      distort: 0.06 + 0.16 * Math.min(punch, 1.2),
      ca: 0.0012 + 0.003 * Math.min(punch, 1),
      dirBlur: [0.09 * Math.min(whip, 1), 0],
      flash: seg(lt, 5.7, 6.0, E.inQuad) * 0.9,
      flashColor: [1, 0.85, 0.65],
      streak: 0.6, streakThreshold: 0.75,
    };
  };
  return shot;
}
