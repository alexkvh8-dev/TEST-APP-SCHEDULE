// SHOT 3 · 0:14–0:31 · "Hello." / "Inside and out."
// A title card on black, then the phone emerges from darkness mid-turn (back → side →
// front), wakes to a 9:41 Lock Screen and the Dynamic Island blooms into a Live
// Activity. It tilts back into an exploded view — layers part along one axis with a
// precise stagger, the logic board's traces pulse with light — then reassembles and
// settles dead-centre, face-on, exactly where Shot 4 picks it up.

import * as E from '../lib/ease.js';
import { lerp, seg, clamp } from '../lib/util.js';
import { line } from '../lib/type.js';
import { makeIPhone } from '../lib/models.js';
import { orbit, glide, settle, smoothSpring } from '../lib/cam.js';

export const HERO_D = 3.75; // camera distance at the hand-off to Shot 4

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 50);
  const phone = makeIPhone(THREE, { finish: 'titanium', pro: true, internals: true });
  scene.add(phone);
  const u = phone.userData;
  const key = new THREE.DirectionalLight('#ffffff', 0.9);
  key.position.set(-2, 3, 4);
  scene.add(key);
  const shot = { name: 'S3 Hero', start: 14, end: 31, scene, camera };
  const Z0 = 0.0375;

  // per-layer explode: [object, offset along local Z, stagger index]
  const layers = [[u.front, 0.5, 0], [u.mid, 0.26, 1], [u.board, 0.1, 2], [u.battery, -0.04, 2], [u.camMod, -0.22, 3], [u.back, -0.5, 4]];
  const base = new Map(layers.map(([o]) => [o, o.position.z]));

  shot.update = (lt) => {
    // ---- title card ----
    line(env.fg, 'Hello.', { x: W / 2, y: 590, size: 168, t: lt - 0.25, dur: 1.3, out: lt - 2.0, outDur: 0.7 });

    // ---- light and turn ----
    scene.environmentIntensity = seg(lt, 1.7, 3.8, E.inOutSine);
    key.intensity = 0.9 * scene.environmentIntensity;
    scene.environmentRotation.set(0, lerp(-0.6, 0.5, seg(lt, 1.5, 17, E.inOutSine)), 0);
    const turn = seg(lt, 1.9, 6.5, glide);
    let ry = lerp(Math.PI - 0.85, 0, turn), rx = 0.05, rz = 0;
    // tilt back into the exploded-view angle, then return face-on
    const tilt = seg(lt, 8.0, 9.5, glide) * (1 - seg(lt, 15.4, 16.9, glide));
    ry = lerp(ry, -0.78, tilt);
    rx = lerp(rx, 0.32, tilt);
    rz = lerp(rz, 0.08, tilt);
    phone.rotation.set(rx, ry, rz);
    phone.position.y = 0.02 * Math.sin(lt * 0.7) * (1 - seg(lt, 15.4, 16.9));

    // ---- screen wake + Dynamic Island ----
    const wake = seg(lt, 6.0, 6.9, settle);
    u.scrMat.emissiveIntensity = wake;
    const island = smoothSpring(lt - 7.3, 0.55);
    u.drawScreen({ wake, t: lt + 14, island });

    // ---- exploded view ----
    const ex = (k) => seg(lt, 9.3 + k * 0.16, 11.2 + k * 0.16, settle) * (1 - seg(lt, 14.3 + (4 - k) * 0.12, 15.8 + (4 - k) * 0.12, glide));
    for (const [o, off, k] of layers) o.position.z = base.get(o) + off * ex(k);
    u.inner.visible = ex(0) > 0.001 || ex(4) > 0.001;
    u.drawBoard(lt, seg(lt, 10.8, 12.0) * (1 - seg(lt, 14.0, 14.8)));
    line(env.fg, 'Inside and out.', { x: W / 2, y: 995, size: 72, t: lt - 11.5, out: lt - 14.1 });

    // ---- camera ----
    const c1 = seg(lt, 8.0, 9.6, glide), orbitP = seg(lt, 9.4, 14.8, E.inOutSine), back = seg(lt, 15.0, 16.9, glide);
    let d = lerp(4.1, 3.85, seg(lt, 1.8, 7.5, glide));
    d = lerp(d, 4.5, c1);
    let az = lerp(0, lerp(0.42, -0.3, orbitP), c1);
    let el = lerp(0.03, 0.26, c1);
    d = lerp(d, HERO_D, back);
    az = lerp(az, 0, back);
    el = lerp(el, 0, back);
    orbit(camera, [0, 0, 0], d, az, el);

    return { bloom: [0.32, 0.5, 0.88], vignette: 0.16 };
  };
  return shot;
}
