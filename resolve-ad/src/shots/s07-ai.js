// 0:58–0:67 · AI. DaVinci Neural Engine. Magic Mask sweeps down the frame and locks a
// living matte onto the hiker; IntelliSearch finds "hiker at sunset" across the media;
// the AI toolset lands as a row of chips.

import * as E from '../lib/ease.js';
import { lerp, seg, clamp, TAU } from '../lib/util.js';
import { kText, line } from '../lib/type.js';
import { B, rgba } from '../lib/brand.js';
import { uiPanel, viewer, mountOn, glowBackdrop } from '../lib/stage.js';
import { label } from '../lib/ui.js';
import { orbit, glide } from '../lib/cam.js';

const CHIPS = ['Magic Mask', 'IntelliSearch', 'IntelliScript', 'Voice Isolation', 'CineFocus', 'Smart Reframe'];

function thumb(g, x, y, w, h, hue, sun) {
  const gr = g.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, hue[0]); gr.addColorStop(0.65, hue[1]); gr.addColorStop(1, '#1d1f22');
  g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, 8); g.fill();
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, 8); g.clip();
  g.fillStyle = 'rgba(255,240,210,0.9)'; g.beginPath(); g.arc(x + w * sun, y + h * 0.5, h * 0.12, 0, TAU); g.fill();
  g.fillStyle = 'rgba(20,22,26,0.85)';
  g.beginPath(); g.moveTo(x, y + h);
  for (let i = 0; i <= 10; i++) g.lineTo(x + (i / 10) * w, y + h * (0.55 + 0.18 * Math.sin(i * 1.7 + sun * 9)));
  g.lineTo(x + w, y + h); g.closePath(); g.fill();
  g.restore();
}

export default function create(env) {
  const { THREE, W, H, footage } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 100);
  const shot = { name: 'S07 AI', start: 58, end: 67, scene, camera, useBg: true };
  const vp = uiPanel(THREE, 1600, 940, 7.2, { radius: 16 });
  scene.add(vp.mesh);
  const vw = viewer(THREE, footage, 1.6, 0.9);
  const VR = [20, 70, 1560, 850];
  mountOn(vp, vw.mesh, ...VR);
  const vwW = new THREE.Vector3();

  shot.update = (lt, t) => {
    glowBackdrop(env.bg, W, H, { base: '#05060a', glows: [[W * 0.5, H * 0.45, 1400, '#11273a', 0.95], [W * 0.5, H * 0.5, 700, '#1a4a66', 0.4]] });
    footage.render(lt * 0.6 + 8, 'hiker', 'golden');
    footage.renderMask();
    const u = vw.u;
    u.uContrast.value = 1.12; u.uTeal.value = 0.8; u.uSat.value = 1.1; u.uTime.value = t;
    u.uMask.value = seg(lt, 0.9, 1.2) * (1 - seg(lt, 3.4, 3.9));
    u.uMaskEdge.value = lerp(0, 1.15, seg(lt, 1.0, 2.9, E.inOutSine));
    const search = seg(lt, 3.6, 4.0) * (1 - seg(lt, 6.2, 6.6));
    u.uBright.value = 1 - 0.55 * search;

    const g = vp.g;
    g.reset(); g.fillStyle = B.ui; g.fillRect(0, 0, 1600, 940);
    g.fillStyle = '#18181a'; g.fillRect(0, 0, 1600, 56);
    label(g, 'Color  —  Magic Mask', 800, 28, 18, '#d9d9de', 600, 'center');
    g.fillStyle = rgba('#7fd3ff', 0.18 * u.uMask.value); g.beginPath(); g.roundRect(1320, 12, 260, 32, 16); g.fill();
    if (u.uMask.value > 0.01) label(g, 'Tracking  ●', 1450, 28, 15, '#bfe9ff', 600, 'center');
    g.fillStyle = '#000'; g.fillRect(...VR);
    vp.commit();

    const p = seg(lt, 0, 9, E.inOutSine);
    orbit(camera, [0, 0, 0], lerp(10.2, 8.6, p), lerp(-0.22, 0.18, p), 0.05);
    const land = 1 - E.outExpo(seg(lt, 0, 0.6));

    // ---- IntelliSearch overlay ----
    const f = env.fg;
    if (search > 0) {
      f.save();
      f.globalAlpha = search;
      const bx = W / 2 - 460, by = 230;
      f.fillStyle = 'rgba(28,30,36,0.92)'; f.beginPath(); f.roundRect(bx, by, 920, 84, 42); f.fill();
      f.strokeStyle = rgba(B.orange, 0.7); f.lineWidth = 2; f.stroke();
      const q = 'hiker at sunset';
      const n = Math.floor(clamp((lt - 4.0) / 0.9) * q.length);
      label(f, '⌕', bx + 46, by + 42, 34, '#c9ccd3', 600, 'center');
      label(f, q.slice(0, n) + ((Math.floor(lt * 4) % 2) ? '|' : ''), bx + 84, by + 43, 34, '#ffffff', 500);
      const hues = [['#ffb36b', '#8a4a2a'], ['#8fa9d6', '#2a3c66'], ['#ff8fa0', '#6a3a4c'], ['#ffd29a', '#6b4b2a'], ['#b0c4ff', '#30406a'], ['#ffa76c', '#7a3f22'], ['#9bd0c8', '#2a4f4a'], ['#ffcf8a', '#80522a']];
      hues.forEach((h, i) => {
        const a = E.outExpo(seg(lt, 5.0 + i * 0.06, 5.6 + i * 0.06));
        const tx = W / 2 - 4 * 205 + (i % 4) * 410 + 20, ty = 360 + Math.floor(i / 4) * 250 + (1 - a) * 60;
        f.globalAlpha = search * a;
        thumb(f, tx, ty, 370, 210, h, 0.3 + (i * 0.17) % 0.5);
        const hit = i === 0 || i === 3 || i === 5;
        if (hit && lt > 5.8) { f.strokeStyle = B.orange; f.lineWidth = 4; f.beginPath(); f.roundRect(tx - 3, ty - 3, 376, 216, 10); f.stroke(); }
      });
      f.restore();
    }
    kText(f, 'AI that does the tedious work.', { x: W / 2, y: 140, size: 84, weight: 900, align: 'center', t: lt - 0.5, dur: 0.6, stagger: 0.018, out: lt - 3.5, colorAt: (i) => (i === 29 ? B.orange : null) });
    line(f, 'DaVinci Neural Engine', { x: W / 2, y: 60, size: 30, weight: 600, fill: '#9fb4c8', t: lt - 0.2, out: lt - 3.5, family: 'Inter', tracking: 0.08 });
    line(f, 'Find any shot. By what’s in it.', { x: W / 2, y: 175, size: 60, weight: 700, t: lt - 3.9, out: lt - 6.2 });
    // chips
    CHIPS.forEach((c, i) => {
      const a = E.outBack(1.5)(seg(lt, 6.5 + i * 0.09, 7.1 + i * 0.09)) * (1 - seg(lt, 8.5, 8.9));
      if (a <= 0) return;
      const cw = 300, cx = W / 2 + ((i % 3) - 1) * 330 - cw / 2, cy = 470 + Math.floor(i / 3) * 110;
      f.save();
      f.globalAlpha = clamp(a);
      f.translate(cx + cw / 2, cy + 40); f.scale(a, a); f.translate(-cw / 2, -40);
      f.fillStyle = 'rgba(22,24,30,0.9)'; f.beginPath(); f.roundRect(0, 0, cw, 80, 40); f.fill();
      f.strokeStyle = rgba(B.petals[i % 3], 0.9); f.lineWidth = 2.5; f.stroke();
      f.fillStyle = B.petals[i % 3]; f.beginPath(); f.arc(40, 40, 9, 0, TAU); f.fill();
      label(f, c, 64, 41, 28, '#fff', 600);
      f.restore();
    });
    const chipsDim = seg(lt, 6.3, 6.7) * (1 - seg(lt, 8.5, 8.9));
    u.uBright.value *= 1 - 0.6 * chipsDim;

    return {
      bloom: [0.4, 0.5, 0.86],
      streak: 0.35, streakThreshold: 0.9,
      flash: (1 - seg(lt, 0, 0.45, E.outCubic)) * 0.8 + seg(lt, 8.6, 9.0, E.inQuad) * 0.5,
      flashColor: [0.92, 1, 0.96],
    };
  };
  return shot;
}
