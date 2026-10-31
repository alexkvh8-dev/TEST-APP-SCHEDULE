// SHOT 4 · 0:31–0:39 · "Ready when you are."
// Same phone, same pose as the end of Shot 3 (invisible cut). The Live Activity folds
// back into the island, then the intelligence glow flows around the screen edge. Its
// colours spill into the room (background aura + coloured lights catching the frame),
// and finally swell into a white-out that becomes the bright stage of Shot 5.

import * as E from '../lib/ease.js';
import { lerp, seg, TAU } from '../lib/util.js';
import { line, fills } from '../lib/type.js';
import { A } from '../lib/apple.js';
import { makeIPhone } from '../lib/models.js';
import { orbit, glide, smoothSpring } from '../lib/cam.js';
import { HERO_D } from './s3-hero.js';

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 50);
  const phone = makeIPhone(THREE, { finish: 'titanium', pro: true });
  scene.add(phone);
  const u = phone.userData;
  u.scrMat.emissiveIntensity = 1;
  const lights = A.glow.slice(0, 4).map((c) => {
    const l = new THREE.PointLight(c, 0, 4, 2);
    scene.add(l);
    return l;
  });
  const key = new THREE.DirectionalLight('#ffffff', 0.9);
  key.position.set(-2, 3, 4);
  scene.add(key);
  const shot = { name: 'S4 Glow', start: 31, end: 39, scene, camera, useBg: true };
  const v = new THREE.Vector3();

  shot.update = (lt, t) => {
    const glow = seg(lt, 0.9, 2.2, E.inOutSine);
    const island = 1 - smoothSpring(lt - 0.15, 0.55);
    u.drawScreen({ wake: 1, t, island, glow });
    scene.environmentRotation.set(0, lerp(0.5, 0.9, seg(lt, 0, 8)), 0);
    phone.rotation.set(0.02 * Math.sin(lt * 0.5) * glow, -0.18 * seg(lt, 1.0, 3.0, glide) + 0.05 * Math.sin(lt * 0.4), 0);

    lights.forEach((l, i) => {
      const a = lt * 0.9 + (i / lights.length) * TAU;
      l.position.set(Math.cos(a) * 0.75, Math.sin(a) * 1.0, 0.25);
      l.intensity = 2.2 * glow;
    });

    const truck = seg(lt, 1.0, 3.0, glide);
    orbit(camera, [lerp(0, -0.62, truck), 0, 0], lerp(HERO_D, 3.45, seg(lt, 0, 8, E.inOutSine)), 0, 0);
    camera.updateMatrixWorld(true);

    // background aura projected around the phone
    const g = env.bg;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    phone.getWorldPosition(v);
    const [sx, sy] = env.project(v, camera);
    const swell = seg(lt, 6.4, 8.0, E.inQuad);
    A.glow.slice(0, 5).forEach((c, i) => {
      const a = t * 0.8 + (i / 5) * TAU;
      const x = sx + Math.cos(a) * 170, y = sy + Math.sin(a) * 300;
      const r = 520 + 1400 * swell;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const n = parseInt(c.slice(1), 16);
      gr.addColorStop(0, `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${(0.2 + 0.25 * swell) * glow * (0.85 + 0.15 * Math.sin(t * 2 + i))})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    });
    g.globalCompositeOperation = 'source-over';

    line(env.fg, 'Ready when you are.', { x: 150, y: 575, size: 88, align: 'left', fill: fills.glow, t: lt - 2.6, out: lt - 6.1 });

    const white = seg(lt, 7.1, 8.0, E.inQuad);
    return {
      bloom: [0.38 + swell * 0.6, 0.6, 0.82],
      flash: white,
      flashColor: [0.913, 0.913, 0.93],
      vignette: 0.16 * (1 - white),
    };
  };
  return shot;
}
