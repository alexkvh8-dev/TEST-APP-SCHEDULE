// 0:75–0:81 · RECAP. A speed-ramped montage that re-renders live moments from the
// earlier shots (it borrows their scenes and cameras) with whip blurs between them and
// the hook's words slamming back in faster — then "All in one." on black.

import * as E from '../lib/ease.js';
import { lerp, seg, clamp } from '../lib/util.js';
import { kText, line } from '../lib/type.js';
import { B } from '../lib/brand.js';

const BEATS = [
  ['S03 Edit', 4.0, 'EDIT.', B.petals[2]],
  ['S04 Color', 4.8, 'COLOR.', B.petals[0]],
  ['S05 Fusion', 2.3, 'VFX.', B.orange],
  ['S06 Fairlight', 3.8, 'AUDIO.', B.petals[1]],
  ['S07 AI', 2.0, 'AI.', '#7fd3ff'],
  ['S08 Deliver', 2.4, 'DELIVER.', B.orange],
];
const STEP = 0.55, END = BEATS.length * STEP; // 3.3s of beats

export default function create(env) {
  const { THREE, W, H } = env;
  const own = new THREE.Scene();
  own.background = new THREE.Color('#050507');
  const ownCam = new THREE.PerspectiveCamera(35, W / H, 0.1, 10);
  const shot = { name: 'S09 Montage', start: 75, end: 81, scene: own, camera: ownCam, useBg: false };

  shot.update = (lt) => {
    const f = env.fg;
    if (lt < END) {
      const k = Math.min(BEATS.length - 1, Math.floor(lt / STEP));
      const [name, at, word, col] = BEATS[k];
      const sub = env.shots.find((s) => s.name === name);
      const u = lt - k * STEP;
      env.fg.reset();
      env.bg.reset();
      const fx = sub.update(at + u * 1.8, sub.start + at + u * 1.8) || {};
      env.fg.reset();
      shot.scene = sub.scene;
      shot.camera = sub.camera;
      shot.useBg = !!sub.useBg;
      kText(f, word, { x: W / 2, y: H / 2 + 80, size: 240, weight: 900, align: 'center', mode: 'slam', t: u, dur: 0.22, stagger: 0.012, ease: E.outExpo, mask: false, colorAt: (i) => (i === word.length - 1 ? col : null) });
      const whip = Math.exp(-((u / 0.06) ** 2)) + Math.exp(-(((u - STEP) / 0.06) ** 2));
      return {
        ...fx,
        dof: fx.dof || null,
        dirBlur: [0.14 * whip, 0],
        distort: 0.08 + 0.14 * E.kick(u, 0.02, 9),
        ca: 0.0014 + 0.003 * E.kick(u, 0.02, 9),
        flash: 0, fade: 0, zoomBlur: 0,
        lift: [-0.01, -0.01, -0.01],
      };
    }
    shot.scene = own;
    shot.camera = ownCam;
    shot.useBg = false;
    const u = lt - END;
    kText(f, 'ALL IN ONE.', { x: W / 2, y: H / 2 + 70, size: 230, weight: 900, align: 'center', mode: 'stretch', t: u, dur: 0.5, stagger: 0.03, colorAt: (i) => (i === 10 ? B.orange : null) });
    line(f, 'One app. One timeline. Every step after the shoot.', { x: W / 2, y: H / 2 + 170, size: 40, weight: 500, fill: '#b9bcc6', t: u - 0.5, family: 'Inter', tracking: 0 });
    return {
      bloom: [0.5, 0.5, 0.6],
      distort: 0.06 + 0.12 * E.kick(u, 0.02, 7),
      flash: seg(lt, 5.55, 6.0, E.inQuad) * 0.85,
      flashColor: [1, 0.86, 0.68],
      streak: 0.4, streakThreshold: 0.8,
    };
  };
  return shot;
}
