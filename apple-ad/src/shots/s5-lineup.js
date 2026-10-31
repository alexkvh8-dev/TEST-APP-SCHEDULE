// SHOT 5 · 0:39–0:55 · "Choose your color." / "Better together."
// The white-out resolves into Apple's bright stage. Five colour iPhones arrive one
// after another, turning from edge-on to show their backs, then turn in a gentle wave
// to wake their screens. Four fade away (HIG: fade, then relocate); the remaining
// phone glides into a family shot as MacBook, Apple Watch and AirPods join and their
// screens light up in sequence.

import * as E from '../lib/ease.js';
import { lerp, seg, clamp } from '../lib/util.js';
import { line, text } from '../lib/type.js';
import { A, FINISH } from '../lib/apple.js';
import { makeIPhone, makeWatch, makeAirPods, makeMacBook, contactShadow } from '../lib/models.js';
import { glide, settle, setOpacity } from '../lib/cam.js';

const NAMES = ['ultramarine', 'teal', 'pink', 'white', 'black'];
const WALLS = {
  ultramarine: ['#3d4fe0', '#9aa6ff'], teal: ['#2f8f86', '#a6e3d9'], pink: ['#e06aa8', '#ffd1e8'],
  white: ['#d9d9de', '#ffffff'], black: ['#1c1c1e', '#5a5a5e'],
};
const FLOOR = -0.74;

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envLight;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 80);
  const shot = { name: 'S5 Lineup', start: 39, end: 55, scene, camera, useBg: true };
  const key = new THREE.DirectionalLight('#ffffff', 0.6);
  key.position.set(-3, 5, 4);
  scene.add(key, new THREE.AmbientLight('#ffffff', 0.25));

  const phones = NAMES.map((n) => {
    const p = makeIPhone(THREE, { finish: n, pro: false });
    const sh = contactShadow(THREE, 0.95, 0.22, 0.45);
    scene.add(p, sh);
    p.userData.shadow = sh;
    return p;
  });
  const mac = makeMacBook(THREE, { color: '#2e2e30' });
  mac.scale.setScalar(0.62);
  const watch = makeWatch(THREE, { caseColor: '#d9d9dc', bandColor: '#c7d2e8' });
  const pods = makeAirPods(THREE);
  const macSh = contactShadow(THREE, 2.6, 1.8, 0.35), watchSh = contactShadow(THREE, 0.8, 1.3, 0.3), podsSh = contactShadow(THREE, 0.8, 0.45, 0.4);
  scene.add(mac, watch, pods, macSh, watchSh, podsSh);

  shot.update = (lt, t) => {
    // ---- stage ----
    const g = env.bg;
    const sg = g.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(0.55, '#f5f5f7');
    sg.addColorStop(1, '#e8e8ed');
    g.fillStyle = sg;
    g.fillRect(0, 0, W, H);

    // ---- camera ----
    const fam = seg(lt, 7.3, 10.2, glide);
    camera.position.set(lerp(0, 0.25, fam), lerp(0.4, 1.2, fam), lerp(6.0, 6.5, fam) - 0.25 * seg(lt, 0, 7, E.inOutSine));
    camera.lookAt(lerp(0, 0.25, fam), lerp(0.02, -0.02, fam), lerp(0, -0.35, fam));
    camera.updateMatrixWorld(true);

    // ---- phones ----
    const gone = seg(lt, 7.2, 8.1, E.inOutSine);
    phones.forEach((p, i) => {
      const arrive = seg(lt, 0.25 + i * 0.13, 1.95 + i * 0.13, settle);
      const turnFront = seg(lt, 4.4 + i * 0.08, 5.9 + i * 0.08, glide);
      const x0 = (i - 2) * 1.0;
      p.position.set(x0 + (1 - arrive) * 4.8, 0, 0);
      p.rotation.set(0, lerp(Math.PI / 2 + 0.25, Math.PI, arrive) + turnFront * Math.PI, 0);
      p.userData.scrMat.emissiveIntensity = seg(lt, 5.1 + i * 0.08, 5.9 + i * 0.08);
      p.userData.drawScreen({ wake: p.userData.scrMat.emissiveIntensity, t, wall: WALLS[NAMES[i]] });
      let a = 1;
      if (i === 0) {
        // the keeper: glides into the family shot, 3/4 front
        const mv = seg(lt, 7.6, 9.8, glide);
        p.position.set(lerp(x0, -1.6, mv), 0, lerp(0, 0.9, mv));
        p.rotation.y = lerp(p.rotation.y, 2 * Math.PI - 0.45, mv);
      } else a = 1 - gone;
      setOpacity(p, a * clamp(arrive * 3));
      const sh = p.userData.shadow;
      sh.position.set(p.position.x, FLOOR + 0.001, p.position.z);
      sh.material.opacity = 0.45 * a * arrive;
    });

    // ---- family ----
    const inMac = seg(lt, 7.9, 9.3, settle), inWatch = seg(lt, 8.4, 9.8, settle), inPods = seg(lt, 8.7, 10.1, settle);
    mac.position.set(0.0, FLOOR - 0.25 * (1 - inMac), -1.7);
    mac.rotation.y = -0.12;
    mac.userData.hinge.rotation.x = lerp(1.25, -0.26, seg(lt, 8.2, 10.0, glide));
    mac.userData.draw(t, seg(lt, 9.9, 10.6));
    setOpacity(mac, inMac);
    macSh.position.set(0.0, FLOOR + 0.001, -1.65);
    macSh.material.opacity = 0.35 * inMac;

    watch.position.set(1.05, FLOOR - watch.userData.loopBottom - 0.2 * (1 - inWatch), 1.05);
    watch.rotation.set(0, -0.42, 0);
    watch.userData.draw(t, seg(lt, 10.2, 11.2));
    setOpacity(watch, inWatch);
    watchSh.position.set(1.05, FLOOR + 0.001, 0.75);
    watchSh.material.opacity = 0.3 * inWatch;

    pods.position.set(2.05, FLOOR + 0.226 - 0.2 * (1 - inPods), 0.45);
    pods.rotation.set(0, -0.55, 0);
    pods.userData.led.material.color.set(seg(lt, 10.5, 10.7) > 0 ? '#30d158' : '#f7f7f5');
    setOpacity(pods, inPods);
    podsSh.position.set(2.05, FLOOR + 0.001, 0.45);
    podsSh.material.opacity = 0.4 * inPods;

    scene.environmentRotation.set(0, lerp(-0.3, 0.3, seg(lt, 0, 16, E.inOutSine)), 0);

    // ---- type ----
    const f = env.fg;
    line(f, 'Choose your color.', { x: W / 2, y: 175, size: 72, fill: A.ink, t: lt - 1.6, out: lt - 7.0 });
    phones.forEach((p, i) => {
      const v = new THREE.Vector3((i - 2) * 1.0, FLOOR - 0.12, 0);
      const [x, y] = env.project(v, camera);
      line(f, FINISH[NAMES[i]].name, { x, y: y + 6, size: 28, weight: 500, fill: '#6e6e73', t: lt - 2.3 - i * 0.07, out: lt - 6.9, family: 'Inter', tracking: 0 });
    });
    line(f, 'Better together.', { x: W / 2, y: 160, size: 76, fill: A.ink, t: lt - 10.6, out: lt - 14.6 });

    return {
      bloom: [0.15, 0.4, 0.97],
      grain: 0.01,
      vignette: 0.05,
      flash: (1 - seg(lt, 0, 0.8, E.outCubic)),
      flashColor: [0.913, 0.913, 0.93],
      fade: seg(lt, 15.0, 15.95, E.inOutSine),
    };
  };
  return shot;
}
