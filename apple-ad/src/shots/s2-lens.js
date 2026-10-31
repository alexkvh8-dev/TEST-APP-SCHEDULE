// SHOT 2 · 0:07–0:14 · "Look closer."
// Opens on the dying flare. A slow macro orbit across the camera plateau: the
// iridescent lens coatings shift colour as the light moves, then the camera pushes
// into the top lens until the frame goes dark — the cut to Shot 3 is through black.

import * as E from '../lib/ease.js';
import { lerp, seg } from '../lib/util.js';
import { line } from '../lib/type.js';
import { makeIPhone } from '../lib/models.js';
import { orbit, glide, logLerp } from '../lib/cam.js';

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(26, W / H, 0.002, 50);
  const phone = makeIPhone(THREE, { finish: 'titanium', pro: true });
  scene.add(phone);
  const shot = { name: 'S2 Lens', start: 7, end: 14, scene, camera };
  const pc = new THREE.Vector3(), lc = new THREE.Vector3();

  shot.update = (lt) => {
    phone.rotation.set(-0.12, Math.PI + 0.1, 0);
    phone.updateMatrixWorld(true);
    phone.userData.plateau.getWorldPosition(pc);
    phone.userData.lenses[0].getWorldPosition(lc);
    lc.z -= 0.02; // lens glass sits proud of the housing
    scene.environmentRotation.set(0, lerp(0.7, -1.0, seg(lt, 0, 7, E.inOutSine)), 0);

    const p = seg(lt, 0, 5.9, glide);
    const push = seg(lt, 5.4, 7.0, E.inCubic);
    const T = [lerp(pc.x, lc.x, push), lerp(pc.y, lc.y, push), lerp(pc.z, lc.z, push)];
    let d = logLerp(1.05, 0.46, p);
    d = logLerp(d, 0.035, push);
    orbit(camera, T, d, lerp(-0.55, 0.25, p), lerp(0.4, 0.1, p), 0.05 * Math.sin(lt * 0.4));

    line(env.fg, 'Look closer.', { x: W / 2, y: 900, size: 72, t: lt - 2.4, out: lt - 5.1 });

    return {
      bloom: [0.45, 0.55, 0.82],
      flash: (1 - seg(lt, 0, 0.6, E.outCubic)) * 0.85,
      fade: seg(lt, 6.15, 6.95, E.inQuad),
      vignette: 0.2,
    };
  };
  return shot;
}
