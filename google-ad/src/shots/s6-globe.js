// SHOT 6 · 0:37–0:47 · "Every question opens a world."
// Opens on a flat blue disc that matches Shot 5's dot pixel for pixel, then the camera
// dollies in (log distance) while the material hands over from flat emissive blue to a lit
// white globe. Land (Natural Earth) appears as dots in the four brand colours, cascading
// out from Kyoto, and searches arc from Kyoto to cities around the world. At the end the
// world compresses back into the blue dot, which Shot 7 picks up.

import * as E from '../lib/ease.js';
import { clamp, lerp, seg, noise1 } from '../lib/util.js';
import { kText, font, text } from '../lib/type.js';
import { C, DOTS, rgba, paper } from '../lib/brand.js';
import { LAND_DOTS } from '../data/land-dots.js';

const DEG = Math.PI / 180;
const R0_PX = 30; // first/last frame disc radius in pixels
const R1_PX = 400; // hero size
const SHIFT_PX = 360; // hero offset to the right of centre
const KYOTO = [35.0, 135.8];
const CITIES = [
  [40.7, -74.0], [51.5, -0.1], [-23.5, -46.6], [19.1, 72.9], [-33.9, 151.2],
  [37.8, -122.4], [6.5, 3.4], [37.6, 127.0], [19.4, -99.1], [48.9, 2.35], [1.35, 103.8], [-1.3, 36.8],
];

const ll = (THREE, lat, lon, r = 1) => {
  const a = lat * DEG, b = lon * DEG;
  return new THREE.Vector3(Math.cos(a) * Math.sin(b) * r, Math.sin(a) * r, Math.cos(a) * Math.cos(b) * r);
};

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 200);
  const shot = { name: 'S6 Globe', start: 37, end: 47, scene, camera, useBg: true };
  env.shared.globe = { x: W / 2, y: H / 2, r: R0_PX };

  const T = Math.tan(17.5 * DEG);
  const distFor = (px) => 1 / Math.sin(Math.atan((px * T) / (H / 2)));
  const D0 = distFor(R0_PX), D1 = distFor(R1_PX);

  scene.add(new THREE.HemisphereLight('#FFFFFF', '#C9D7F0', 1.0));
  const key = new THREE.DirectionalLight('#FFFFFF', 2.0);
  key.position.set(-3, 3, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(C.blue, 1.4);
  rim.position.set(4, 1, -3);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  const globeMat = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  globeMat.envMap = env.envLight;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), globeMat);
  world.add(globe);
  const blue = new THREE.Color(C.blue), white = new THREE.Color('#FFFFFF'), black = new THREE.Color('#000000');

  // land dots
  const kN = ll(THREE, ...KYOTO);
  const dotGeo = new THREE.CircleGeometry(0.0118, 12);
  const dotMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, LAND_DOTS.length);
  const dotInfo = [];
  const col = new THREE.Color();
  LAND_DOTS.forEach(([lat, lon], i) => {
    const n = ll(THREE, lat, lon);
    const v = 0.55 * (noise1(n.x * 2.3 + 10, 1) + noise1(n.y * 2.6 + 3, 2) + noise1(n.z * 2.1 + 7, 3) + 0.6 * noise1((n.x + n.z) * 4.0 + 1, 4));
    const ci = v < -0.25 ? 3 : v < 0.05 ? 0 : v < 0.3 ? 1 : 2;
    col.set(DOTS[ci]);
    dots.setColorAt(i, col);
    dotInfo.push({ n, delay: 0.85 + Math.acos(clamp(n.dot(kN), -1, 1)) * 0.6, out: 8.35 + (1 - n.dot(kN)) * 0.35 });
  });
  world.add(dots);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1), sc = new THREE.Vector3(), ps = new THREE.Vector3();

  // search arcs from Kyoto
  const arcs = CITIES.map(([lat, lon], k) => {
    const a = ll(THREE, ...KYOTO, 1.003), b = ll(THREE, lat, lon, 1.003);
    const ang = a.angleTo(b);
    const mid = a.clone().add(b).normalize().multiplyScalar(1 + 0.12 + ang * 0.16);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.TubeGeometry(curve, 96, 0.0058, 6, false);
    const color = DOTS[k % 4];
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.017, 16, 12), new THREE.MeshBasicMaterial({ color, transparent: true }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.028, 40), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(b);
    ring.quaternion.setFromUnitVectors(zAxis, b.clone().normalize());
    world.add(mesh, head, ring);
    return { curve, geo, mesh, head, ring, t0: 2.75 + k * 0.33, count: geo.index.count };
  });

  // Kyoto facing the camera at lt = 3.2, tilted so it sits a little above centre
  const TILT = 0.42;
  const SPIN0 = -KYOTO[1] * DEG - 3.2 * 0.16;

  shot.update = (lt) => {
    const g = env.bg, f = env.fg;
    paper(g, W, H, lt + 37, { alpha: 0.075 });

    // ---- camera: dolly in, pan, drift, then all the way back ----
    const din = seg(lt, 0.1, 2.5, E.smooth);
    const dout = seg(lt, 8.4, 9.95, E.smooth);
    const logD = lerp(lerp(Math.log(D0), Math.log(D1), din), Math.log(D0), dout);
    let D = Math.exp(logD) - 0.25 * seg(lt, 2.5, 8.4, E.inOutSine) * (1 - dout);
    const pan = seg(lt, 1.9, 3.3, E.smooth) * (1 - seg(lt, 8.3, 9.4, E.smooth));
    const shiftPx = SHIFT_PX * pan;
    const cx = -(shiftPx * D * T) / (H / 2);
    camera.position.set(cx, 0, D);
    camera.lookAt(cx, 0, 0);

    world.rotation.set(TILT, SPIN0 + lt * 0.16, 0, 'XYZ');

    // ---- flat blue disc <-> lit white globe ----
    const lit = seg(lt, 0.25, 1.5, E.inOutSine) * (1 - seg(lt, 8.9, 9.75, E.inOutSine));
    globeMat.color.copy(black).lerp(white, lit);
    globeMat.emissive.copy(blue);
    globeMat.emissiveIntensity = 1 - lit;
    globeMat.clearcoat = 0.5 * lit;
    globeMat.specularIntensity = lit;
    globeMat.envMapIntensity = 0.6 * lit;

    // ---- land dots cascade from Kyoto ----
    for (let i = 0; i < dotInfo.length; i++) {
      const d = dotInfo[i];
      const s = clamp(E.outBack(1.7)(seg(lt, d.delay, d.delay + 0.45)), 0, 1.3) * (1 - E.inCubic(seg(lt, d.out, d.out + 0.4)));
      if (s < 0.01) sc.set(0, 0, 0); else sc.setScalar(s);
      ps.copy(d.n).multiplyScalar(1.0015);
      q.setFromUnitVectors(zAxis, d.n);
      m4.compose(ps, q, sc);
      dots.setMatrixAt(i, m4);
    }
    dots.instanceMatrix.needsUpdate = true;

    // ---- arcs ----
    const arcFade = 1 - seg(lt, 8.15, 8.55);
    for (const a of arcs) {
      const p = E.inOutCubic(seg(lt, a.t0, a.t0 + 1.1));
      const vis = p > 0.001 && arcFade > 0.001;
      a.mesh.visible = vis;
      a.head.visible = vis && p < 0.999;
      a.ring.visible = vis;
      if (!vis) continue;
      const cnt = Math.floor((a.count * p) / 6) * 6;
      a.geo.setDrawRange(0, cnt);
      a.mesh.material.opacity = arcFade;
      a.head.position.copy(a.curve.getPoint(p));
      a.head.material.opacity = arcFade;
      const rp = seg(lt, a.t0 + 1.05, a.t0 + 1.75, E.outCubic);
      a.ring.scale.setScalar(1 + rp * 2.6);
      a.ring.material.opacity = (rp > 0 ? 1 - rp : 0) * arcFade;
    }

    // ---- atmosphere halo on the bg layer ----
    const gx = W / 2 + shiftPx, gy = H / 2;
    const rpx = (H / 2) * Math.tan(Math.asin(Math.min(1, 1 / D))) / T;
    const hal = lit;
    if (hal > 0.01) {
      const hg = g.createRadialGradient(gx, gy, rpx * 0.96, gx, gy, rpx * 1.32);
      hg.addColorStop(0, rgba(C.blue, 0.2 * hal));
      hg.addColorStop(0.35, rgba(C.blue, 0.07 * hal));
      hg.addColorStop(1, rgba(C.blue, 0));
      g.fillStyle = hg;
      g.beginPath();
      g.arc(gx, gy, rpx * 1.32, 0, Math.PI * 2);
      g.fill();
    }

    // ---- headline ----
    kText(f, 'Every question', { x: 120, y: 470, size: 112, weight: 500, t: lt - 3.0, stagger: 0.025, out: lt - 7.75, outDur: 0.32, outStagger: 0.01 });
    kText(f, 'opens a world.', {
      x: 120, y: 598, size: 112, weight: 500, t: lt - 3.25, stagger: 0.025, out: lt - 7.82, outDur: 0.32, outStagger: 0.01,
      colorAt: (i) => (i === 13 ? C.blue : null),
    });
    kText(f, 'Search, Maps, Lens and Translate, working together.', {
      x: 124, y: 676, size: 34, weight: 400, color: C.mute, unit: 'word', mode: 'fade', t: lt - 3.7, stagger: 0.05, dur: 0.6,
      out: lt - 7.7, outDur: 0.3, outStagger: 0.01,
    });
    void font; void text;

    return { bloom: [0, 0.4, 0.9], grain: 0.014, vignette: 0.05, ca: 0.0005 };
  };
  return shot;
}
