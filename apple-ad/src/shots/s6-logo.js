// SHOT 6 · 0:55–1:00 · End card.
// The logo alone, centred, resolving from a soft blur, with one slow sheen of light
// passing across it — the way Apple's films and event openers sign off.

import * as E from '../lib/ease.js';
import { lerp, seg } from '../lib/util.js';
import { drawLogo } from '../lib/apple.js';
import { RESOLVE } from '../lib/type.js';

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 10);
  const shot = { name: 'S6 Logo', start: 55, end: 60, scene, camera };
  const off = document.createElement('canvas');
  off.width = 400;
  off.height = 400;
  const og = off.getContext('2d', { willReadFrequently: true });

  shot.update = (lt) => {
    const p = RESOLVE(seg(lt, 0.45, 2.0));
    og.reset();
    drawLogo(og, 200, 200, 300, '#f5f5f7');
    const sw = seg(lt, 2.3, 3.6, E.inOutSine);
    if (sw > 0 && sw < 1) {
      og.globalCompositeOperation = 'source-atop';
      const x = lerp(-120, 520, sw);
      const gr = og.createLinearGradient(x - 90, 0, x + 90, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.5, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      og.fillStyle = '#8e8e93';
      og.globalAlpha = 0.35 * Math.sin(Math.PI * sw);
      og.fillRect(0, 0, 400, 400);
      og.globalAlpha = 1;
      og.fillStyle = gr;
      og.setTransform(1, 0, -0.4, 1, 80, 0);
      og.fillRect(-200, 0, 800, 400);
    }
    const f = env.fg;
    const s = lerp(0.965, 1, p) * 0.5; // 300px source drawn at ~150px
    f.save();
    f.globalAlpha = p;
    if (p < 0.99) f.filter = `blur(${((1 - p) * 16).toFixed(1)}px)`;
    f.translate(W / 2, H / 2 - 6);
    f.scale(s, s);
    f.drawImage(off, -200, -200);
    f.restore();
    return { bloom: [0.2, 0.4, 0.95], vignette: 0.1 };
  };
  return shot;
}
