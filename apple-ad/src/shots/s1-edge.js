// SHOT 1 · 0:00–0:07 · "Every edge, considered."
// Darkness. Light finds the titanium edge first: a strip reflection glides along the
// band and across the buttons as the macro camera drifts up the side of the phone.
// The cut to Shot 2 happens on a highlight flare (light-motivated cut).

import * as E from '../lib/ease.js';
import { lerp, seg } from '../lib/util.js';
import { line } from '../lib/type.js';
import { makeIPhone } from '../lib/models.js';
import { orbit, glide } from '../lib/cam.js';

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(24, W / H, 0.005, 50);
  const phone = makeIPhone(THREE, { finish: 'titanium', pro: true });
  scene.add(phone);
  // a grazing key that slides across: its specular line travels along the polished chamfer
  const sweep = new THREE.DirectionalLight('#ffffff', 0);
  scene.add(sweep, sweep.target);
  const shot = { name: 'S1 Edge', start: 0, end: 7, scene, camera };
  const v = new THREE.Vector3();

  shot.update = (lt) => {
    const p = seg(lt, 0, 7, glide);
    phone.rotation.set(0.05, -1.05 + 0.12 * p, 0);
    phone.updateMatrixWorld(true);
    scene.environmentIntensity = seg(lt, 0.15, 2.4, E.inOutSine);
    scene.environmentRotation.set(0, lerp(-1.25, 0.95, seg(lt, 0, 7, E.inOutSine)), 0);
    // macro: target slides up the right-hand edge, camera hugs it at a grazing angle
    v.set(0.36, lerp(-0.52, 0.36, p), 0.01);
    phone.localToWorld(v);
    orbit(camera, [v.x, v.y, v.z], lerp(0.42, 0.56, p), lerp(0.28, 0.12, p), lerp(0.22, -0.04, p), -0.38);

    const sa = lerp(-1.3, 1.1, seg(lt, 0.4, 6.8, E.inOutSine));
    sweep.position.set(v.x + Math.sin(sa) * 3, v.y + 2.2 * Math.cos(sa * 0.7), v.z + Math.cos(sa) * 3);
    sweep.target.position.copy(v);
    sweep.intensity = 5.5 * seg(lt, 0.6, 2.6, E.inOutSine);
    line(env.fg, 'Every edge, considered.', { x: W / 2, y: 900, size: 64, t: lt - 3.3, out: lt - 6.0 });

    const flare = seg(lt, 6.45, 7.0, E.inQuad);
    return {
      bloom: [0.5 + flare * 1.2, 0.55, 0.82],
      flash: flare * 0.85,
      vignette: 0.18,
    };
  };
  return shot;
}
