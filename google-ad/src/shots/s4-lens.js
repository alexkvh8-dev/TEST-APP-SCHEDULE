// SHOT 4 · 0:21–0:29 · "Search what you see."
// The maple leaf that wiped the map settles in front of warm autumn bokeh. Lens corner
// brackets lock on, the scan shimmers in the four brand colours, sparkle dots twinkle and
// a result card rises. The card then expands to fill the frame with white (container
// transform), which Shot 5 contracts into the Translate card.

import * as E from '../lib/ease.js';
import { clamp, lerp, seg, rng } from '../lib/util.js';
import { kText, font, text, measure } from '../lib/type.js';
import { C, DOTS, rgba, mix, card, rr, bracket } from '../lib/brand.js';

const RES = { x: 1010, y: 800, w: 600, h: 210 };

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  const shot = { name: 'S4 Lens', start: 21, end: 29, scene, camera, useBg: true };
  const leafImg = env.leaf.canvas;

  const r = rng(21);
  const BOKEH = [...Array(16)].map((_, i) => ({
    x: r() * W, y: r() * H, rad: 90 + r() * 220, depth: 0.3 + r() * 0.7,
    col: [C.red, C.yellow, mix(C.red, C.yellow, 0.5), C.green][i % 4 === 3 && r() < 0.6 ? 0 : i % 4],
    a: 0.14 + r() * 0.16, ph: r() * 6,
  }));
  const SPARK = [...Array(26)].map(() => ({ u: r() * 2 - 1, v: r() * 2 - 1, t0: 1.95 + r() * 1.0, s: 3 + r() * 5 }));

  function bokeh(g, lt) {
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#FFF8F1');
    gr.addColorStop(0.6, '#FDEBDD');
    gr.addColorStop(1, '#FBDCC8');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    for (const b of BOKEH) {
      const x = b.x + Math.sin(lt * 0.25 * b.depth + b.ph) * 40 * b.depth - lt * 10 * b.depth;
      const y = b.y + Math.cos(lt * 0.2 * b.depth + b.ph) * 30 * b.depth;
      const rg = g.createRadialGradient(x, y, 0, x, y, b.rad);
      rg.addColorStop(0, rgba(b.col, b.a));
      rg.addColorStop(0.7, rgba(b.col, b.a * 0.55));
      rg.addColorStop(1, rgba(b.col, 0));
      g.fillStyle = rg;
      g.beginPath();
      g.arc(x, y, b.rad, 0, Math.PI * 2);
      g.fill();
    }
    // soft window light from the top right
    const lg = g.createRadialGradient(W * 0.85, -100, 0, W * 0.85, -100, 900);
    lg.addColorStop(0, 'rgba(255,255,255,0.65)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg;
    g.fillRect(0, 0, W, H);
  }

  shot.update = (lt, t) => {
    const g = env.bg, f = env.fg;
    bokeh(g, lt);
    const L = env.leaf.screen(t);
    const ui = 1 - seg(lt, 6.8, 7.1, E.inCubic);

    // ---- Lens brackets ----
    const bk = seg(lt, 1.25, 1.85, E.outQuint);
    if (bk > 0 && ui > 0) {
      const half = 250 + 70 * (1 - bk);
      f.save();
      f.globalAlpha = clamp(bk * 1.5) * ui;
      bracket(f, L.x - half, L.y - half, 0, 84, 30, 10);
      bracket(f, L.x + half, L.y - half, 1, 84, 30, 10);
      bracket(f, L.x + half, L.y + half, 2, 84, 30, 10);
      bracket(f, L.x - half, L.y + half, 3, 84, 30, 10);
      f.restore();
    }
    // ---- scan: a soft four-colour band sweeps the frame ----
    const sc = seg(lt, 1.9, 2.95, E.inOutSine);
    if (sc > 0 && sc < 1) {
      const half = 250;
      f.save();
      rr(f, L.x - half, L.y - half, half * 2, half * 2, 30);
      f.clip();
      const by = lerp(L.y - half - 160, L.y + half + 160, sc);
      const band = f.createLinearGradient(L.x - half, 0, L.x + half, 0);
      DOTS.forEach((c, i) => band.addColorStop(i / 3, rgba(c, 0.55)));
      f.globalCompositeOperation = 'screen';
      f.globalAlpha = Math.sin(Math.PI * sc);
      for (let k = 0; k < 6; k++) {
        const hh = 18 + k * 26;
        f.globalAlpha = Math.sin(Math.PI * sc) * (0.5 / (k + 1));
        f.fillStyle = band;
        f.fillRect(L.x - half, by - hh / 2, half * 2, hh);
      }
      f.restore();
    }
    // ---- sparkle dots ----
    for (const sp of SPARK) {
      const p = clamp((lt - sp.t0) / 0.7);
      if (p <= 0 || p >= 1 || ui <= 0) continue;
      const a = Math.sin(Math.PI * p);
      const x = L.x + sp.u * 225, y = L.y + sp.v * 225;
      f.save();
      f.globalAlpha = a * ui;
      f.shadowColor = 'rgba(255,255,255,0.9)';
      f.shadowBlur = 12;
      f.fillStyle = C.white;
      f.beginPath();
      f.arc(x, y, sp.s * a, 0, Math.PI * 2);
      f.fill();
      f.restore();
    }

    // ---- headline ----
    const tagA = seg(lt, 0.95, 1.35, E.outExpo) * (1 - seg(lt, 6.7, 7.0));
    if (tagA > 0) {
      f.save();
      f.globalAlpha = tagA;
      f.fillStyle = C.yellow;
      f.beginPath();
      f.arc(134, 297, 9, 0, Math.PI * 2);
      f.fill();
      text(f, 'Google Lens', 156, 308, 32, 500, C.mute, 'left', 0);
      f.restore();
    }
    kText(f, 'Search what', { x: 120, y: 430, size: 124, weight: 500, t: lt - 1.05, stagger: 0.025, out: lt - 6.75, outDur: 0.32, outStagger: 0.01 });
    kText(f, 'you see.', {
      x: 120, y: 568, size: 124, weight: 500, t: lt - 1.3, stagger: 0.025, out: lt - 6.82, outDur: 0.32, outStagger: 0.01,
      colorAt: (i) => (i === 7 ? C.yellow : null),
    });
    kText(f, 'Point your camera. Get answers.', {
      x: 124, y: 650, size: 38, weight: 400, color: C.mute, unit: 'word', mode: 'fade', t: lt - 1.7, stagger: 0.06, dur: 0.6,
      out: lt - 6.7, outDur: 0.3, outStagger: 0.01,
    });

    // ---- result card -> full-frame white ----
    const ce = seg(lt, 3.0, 3.7, E.outQuint);
    const ex = seg(lt, 7.0, 7.95, E.smooth);
    if (ce > 0) {
      const x = lerp(RES.x, 0, ex), y = lerp(RES.y + (1 - ce) * 110, 0, ex);
      const w = lerp(RES.w, W, ex), h = lerp(RES.h, H, ex);
      const rad = 32 * clamp((1 - ex) / 0.3);
      f.save();
      f.globalAlpha = clamp(ce * 1.5);
      card(f, x, y, w, h, rad, { glow: C.yellow, glowA: 0.4, lift: 1 - ex });
      const ca = 1 - seg(lt, 6.85, 7.1);
      if (ca > 0) {
        f.globalAlpha *= ca;
        const tx = RES.x, ty = RES.y + (1 - ce) * 110;
        f.save();
        rr(f, tx + 26, ty + 28, 154, 154, 20);
        f.clip();
        const tg = f.createLinearGradient(tx, ty, tx + 180, ty + 180);
        tg.addColorStop(0, '#FFF3E6');
        tg.addColorStop(1, '#FCD3B8');
        f.fillStyle = tg;
        f.fillRect(tx + 26, ty + 28, 154, 154);
        f.translate(tx + 103, ty + 105);
        f.rotate(-0.3);
        f.drawImage(leafImg, -78, -78, 156, 156);
        f.restore();
        text(f, 'Japanese maple', tx + 208, ty + 82, 42, 500, C.ink, 'left', 0);
        text(f, 'Acer palmatum', tx + 208, ty + 124, 28, 400, C.mute, 'left', 0);
        let cx = tx + 208;
        ['Care tips', 'Where to see'].forEach((s, i) => {
          const ap = seg(lt, 3.45 + i * 0.08, 3.85 + i * 0.08, E.outQuint);
          const wv = measure(f, s, 22, 500, 0) + 36;
          f.save();
          f.globalAlpha *= ap;
          rr(f, cx, ty + 146 + (1 - ap) * 10, wv, 40, 20);
          f.strokeStyle = C.line;
          f.lineWidth = 2;
          f.stroke();
          text(f, s, cx + wv / 2, ty + 173 + (1 - ap) * 10, 22, 500, C.ink2, 'center', 0);
          f.restore();
          cx += wv + 10;
        });
      }
      f.restore();
    }

    return Object.assign({ bloom: [0, 0.4, 0.9], grain: 0.014, vignette: 0.05, ca: 0.0005, overlay: true }, env.leaf.fx(t));
  };
  return shot;
}
