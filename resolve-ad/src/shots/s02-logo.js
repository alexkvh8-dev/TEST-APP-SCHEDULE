// 0:06–0:13 · The mark. Out of the flare, three solid-glass petals fly in and lock into
// a polished frame. Light bars behind them bend and split into spectra through the glass
// (real transmission + dispersion), anamorphic streaks on the hot edges, shallow depth
// of field. Then the camera dives into the glass.

import * as E from '../lib/ease.js';
import { lerp, seg, clamp } from '../lib/util.js';
import { line } from '../lib/type.js';
import { B } from '../lib/brand.js';
import { makeGlassLogo, makeLightBars } from '../lib/logo3d.js';
import { glowBackdrop } from '../lib/stage.js';
import { orbit, glide, settle } from '../lib/cam.js';

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 100);
  const logo = makeGlassLogo(THREE);
  logo.position.y = 0.45;
  const bars = makeLightBars(THREE, 3);
  const flare = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 6, 4) }));
  scene.add(logo, bars, flare);
  const shot = { name: 'S02 Logo', start: 6, end: 13, scene, camera, useBg: true };
  const { petals, frame, plate } = logo.userData;
  const from = [[-2.5, 3.2, -6], [3.4, -1.8, -5], [-3.4, -2.4, -7]];

  shot.update = (lt) => {
    const breathe = 0.9 + 0.1 * Math.sin(lt * 1.3);
    glowBackdrop(env.bg, W, H, { base: '#04050a', glows: [[W / 2, H * 0.5, 1200, B.resolve, 0.85], [W / 2 + 60 * Math.sin(lt * 0.5), H * 0.5, 430, '#fff3e2', 0.95 * breathe], [W / 2, H * 0.5, 250, '#ffffff', 0.8], [W * 0.38, H * 0.58, 380, '#6fb6ff', 0.4], [W * 0.62, H * 0.42, 360, '#ff8a4a', 0.4]] });
    petals.forEach((m, i) => {
      const p = E.outExpo(seg(lt, 0.1 + i * 0.16, 1.5 + i * 0.16));
      const h = m.userData.home;
      m.position.set(lerp(h.x + from[i][0], h.x, p), lerp(h.y + from[i][1], h.y, p), lerp(from[i][2], h.z, p));
      m.rotation.set((1 - p) * 2.2, (1 - p) * -3.1 * (i % 2 ? 1 : -1), (1 - p) * 1.4);
    });
    const fp = E.outExpo(seg(lt, 0.7, 1.9));
    frame.scale.setScalar(lerp(0.7, 1, fp));
    frame.rotation.z = (1 - fp) * -0.4;
    plate.scale.setScalar(lerp(0.7, 1, fp));
    frame.visible = plate.visible = fp > 0.01;
    logo.userData.backlight.material.opacity = fp;
    const lock = E.kick(lt - 1.95, 0.02, 7);
    logo.scale.setScalar(1 + 0.03 * lock);
    logo.rotation.set(0.08 * Math.sin(lt * 0.6), lerp(-0.5, 0.42, seg(lt, 0.5, 6.4, E.inOutSine)), 0);

    bars.position.x = lerp(1.8, -1.8, seg(lt, 0, 7, E.inOutSine));
    flare.position.set(lerp(-5, 5, seg(lt, 2.4, 4.8, E.inOutSine)), 1.6, -1.2);

    const dive = seg(lt, 6.0, 7.0, E.inExpo);
    const d = lerp(lerp(12.2, 10.6, seg(lt, 0, 6, glide)), 0.9, dive);
    orbit(camera, [0, 0.45, 0], d, 0.04 * Math.sin(lt * 0.4), 0.03);

    line(env.fg, 'DaVinci Resolve', { x: W / 2, y: 935, size: 100, weight: 300, t: lt - 2.3, out: lt - 5.6, tracking: -0.01 });
    line(env.fg, "From Hollywood's grading suites to your desk.", { x: W / 2, y: 1000, size: 36, weight: 400, fill: '#a9adb8', t: lt - 3.0, out: lt - 5.5, family: 'Inter', tracking: 0 });

    return {
      bloom: [0.42, 0.5, 0.9],
      streak: 0.45, streakThreshold: 0.95,
      dof: { focus: d - 0.1, aperture: 0.0011, maxblur: 0.005 },
      zoomBlur: dive * 0.25,
      flash: (1 - seg(lt, 0, 0.5, E.outCubic)) * 0.85 + seg(lt, 6.6, 7.0, E.inQuad) * 0.7,
      flashColor: [1, 0.86, 0.68],
      distort: 0.07,
      ca: 0.0006,
    };
  };
  return shot;
}
