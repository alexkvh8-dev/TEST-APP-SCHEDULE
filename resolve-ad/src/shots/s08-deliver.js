// 0:67–0:75 · DELIVER + COLLABORATE. The Deliver page renders the queue to green ticks;
// the camera slides across to a shared timeline where collaborators' cursors work on the
// same project at once (Blackmagic Cloud).

import * as E from '../lib/ease.js';
import { lerp, seg, clamp, noise1, TAU } from '../lib/util.js';
import { kText, line } from '../lib/type.js';
import { B, rgba } from '../lib/brand.js';
import { uiPanel, viewer, mountOn, glowBackdrop } from '../lib/stage.js';
import { topBar, pageBar, deliver, timeline, label } from '../lib/ui.js';
import { orbit, glide } from '../lib/cam.js';

const PEOPLE = [['MK', '#ff7a59'], ['JS', '#59a6ff'], ['AL', '#3fe08a']];

export default function create(env) {
  const { THREE, W, H, footage } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(34, W / H, 0.05, 100);
  const shot = { name: 'S08 Deliver', start: 67, end: 75, scene, camera, useBg: true };

  const dp = uiPanel(THREE, 1920, 1080, 6.4);
  dp.mesh.position.set(-3.6, 0, 0);
  dp.mesh.rotation.y = 0.32;
  scene.add(dp.mesh);
  const vw = viewer(THREE, footage, 1.6, 0.9);
  const VR = [670, 60, 560, 315];
  mountOn(dp, vw.mesh, ...VR);
  const cp = uiPanel(THREE, 1920, 820, 6.4);
  cp.mesh.position.set(3.9, -0.1, -0.6);
  cp.mesh.rotation.y = -0.3;
  scene.add(cp.mesh);

  shot.update = (lt, t) => {
    glowBackdrop(env.bg, W, H, { base: '#05060a', glows: [[W * 0.3, H * 0.4, 1100, B.resolve, 0.8], [W * 0.8, H * 0.5, 900, '#3a2610', 0.45]] });
    footage.render(lt + 14, 'valley', 'golden');
    vw.u.uContrast.value = 1.12; vw.u.uTeal.value = 0.8; vw.u.uSat.value = 1.1;
    const progress = seg(lt, 1.4, 4.4, E.inOutSine);

    let g = dp.g;
    g.reset(); g.fillStyle = B.ui; g.fillRect(0, 0, 1920, 1080);
    topBar(g, 0, 0, 1920, 'Mountain Film  —  Deliver');
    deliver(g, 12, 46, 1896, 560, { progress, pick: Math.floor(seg(lt, 0.4, 1.2) * 2.99) + 1 });
    g.fillStyle = '#000'; g.fillRect(...VR);
    timeline(g, 12, 616, 1896, 400, { playhead: 0.1 + progress * 0.85, arrive: 1, t: lt });
    pageBar(g, 0, 1024, 1920, 'Deliver', 1);
    dp.commit();

    // shared timeline with live collaborators
    g = cp.g;
    g.reset(); g.fillStyle = B.ui; g.fillRect(0, 0, 1920, 820);
    g.fillStyle = '#18181a'; g.fillRect(0, 0, 1920, 60);
    label(g, 'Mountain Film  —  Shared project', 960, 30, 18, '#d9d9de', 600, 'center');
    label(g, '☁  Blackmagic Cloud', 1780, 30, 16, '#9fd0ff', 600, 'right');
    timeline(g, 12, 76, 1896, 600, { playhead: 0.62, arrive: 1, t: lt, highlight: Math.floor(lt * 1.5) % 4 });
    PEOPLE.forEach(([ini, col], i) => {
      const a = E.outBack(1.6)(seg(lt, 4.6 + i * 0.18, 5.1 + i * 0.18));
      if (a <= 0) return;
      g.save(); g.globalAlpha = clamp(a);
      g.fillStyle = col; g.beginPath(); g.arc(1640 - i * 64, 30, 22 * a, 0, TAU); g.fill();
      label(g, ini, 1640 - i * 64, 31, 15, '#111', 700, 'center');
      // cursor wandering over the timeline
      const cx = 300 + 1400 * (0.5 + 0.45 * noise1(lt * 0.7 + i * 7, i)), cy = 200 + 420 * (0.5 + 0.45 * noise1(lt * 0.6 + i * 3, i + 4));
      g.fillStyle = col;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 18, cy + 30); g.lineTo(cx + 6, cy + 27); g.lineTo(cx, cy + 40); g.closePath(); g.fill();
      g.beginPath(); g.roundRect(cx + 16, cy + 30, 52, 28, 14); g.fill();
      label(g, ini, cx + 42, cy + 45, 14, '#111', 700, 'center');
      g.restore();
    });
    g.fillStyle = '#18181a'; g.fillRect(0, 690, 1920, 130);
    label(g, 'Editor, colorist, VFX artist and sound mixer — same timeline, same time.', 960, 755, 24, '#b9bcc6', 500, 'center');
    cp.commit();

    const p = seg(lt, 3.9, 5.4, glide);
    orbit(camera, [lerp(-3.4, 3.7, p), 0, lerp(0, -0.5, p)], lerp(6.9, 6.6, p), lerp(0.18, -0.12, p) + 0.04 * Math.sin(lt * 0.5), 0.05);
    const whip = seg(lt, 3.9, 5.4);
    const vel = Math.sin(Math.PI * whip);

    const f = env.fg;
    kText(f, 'Deliver anywhere.', { x: W - 110, y: 200, size: 100, weight: 900, align: 'right', t: lt - 0.5, dur: 0.6, stagger: 0.02, out: lt - 3.6, colorAt: (i) => (i === 16 ? B.orange : null) });
    line(f, '4K, HDR, ProRes, H.265 — or straight to social.', { x: W - 114, y: 268, size: 40, weight: 500, align: 'right', fill: '#b9bcc6', t: lt - 1.1, out: lt - 3.6, family: 'Inter', tracking: 0 });
    kText(f, 'Work together.', { x: 110, y: 200, size: 100, weight: 900, t: lt - 5.3, dur: 0.6, stagger: 0.02, out: lt - 7.5, colorAt: (i) => (i === 13 ? B.orange : null) });
    line(f, 'Real-time collaboration with Blackmagic Cloud.', { x: 114, y: 268, size: 40, weight: 500, align: 'left', fill: '#b9bcc6', t: lt - 5.9, out: lt - 7.5, family: 'Inter', tracking: 0 });

    return {
      bloom: [0.4, 0.5, 0.86],
      streak: 0.3, streakThreshold: 0.92,
      dirBlur: [0.05 * vel, 0],
      flash: (1 - seg(lt, 0, 0.45, E.outCubic)) * 0.5 + seg(lt, 7.6, 8.0, E.inQuad) * 0.35,
      flashColor: [1, 0.9, 0.75],
      dof: { focus: camera.position.distanceTo(new THREE.Vector3(lerp(-3.4, 3.7, p), 0, 0)), aperture: 0.001, maxblur: 0.006 },
    };
  };
  return shot;
}
