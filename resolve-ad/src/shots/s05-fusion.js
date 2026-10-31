// 0:41–0:50 · FUSION. From the 2D node graph into a 3D one: glossy node blocks wired
// with glowing tubes, light pulses running the signal path, the camera flying the chain
// to MediaOut, where the composite plays — footage, an extruded chrome title and drifting
// particles. Exits on a whip pan.

import * as E from '../lib/ease.js';
import { lerp, seg, clamp, kf, rng, TAU } from '../lib/util.js';
import { kText, line } from '../lib/type.js';
import { B } from '../lib/brand.js';
import { uiPanel, viewer, mountOn, glowBackdrop, canvas } from '../lib/stage.js';
import { topBar, label } from '../lib/ui.js';
import { glide } from '../lib/cam.js';

const NODES = [
  { name: 'MediaIn1', kind: 'Media', col: '#5c6b80', p: [-5.6, 0, 0] },
  { name: 'Text1', kind: 'Text+', col: '#d08a2c', p: [-3.2, 1.7, -1.0] },
  { name: 'Merge1', kind: 'Merge', col: '#4f7dc9', p: [-1.0, 0.1, -0.5] },
  { name: 'Transform1', kind: 'Transform', col: '#8a5cc9', p: [1.9, 0.35, -1.3] },
  { name: 'MediaOut1', kind: 'Media', col: '#5c6b80', p: [4.6, 0, -0.4] },
];
const LINKS = [[0, 2], [1, 2], [2, 3], [3, 4]];

export default function create(env) {
  const { THREE, W, H, footage } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 200);
  const shot = { name: 'S05 Fusion', start: 41, end: 50, scene, camera, useBg: true };

  const blocks = NODES.map((n) => {
    const c = canvas(512, 212), g = c.getContext('2d');
    g.fillStyle = '#2a2b31'; g.fillRect(0, 0, 512, 212);
    g.fillStyle = n.col; g.fillRect(0, 0, 512, 34);
    g.fillStyle = '#fff'; g.font = '600 52px "Inter"'; g.textBaseline = 'middle'; g.fillText(n.name, 34, 118);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = '500 30px "Inter"'; g.fillText(n.kind, 36, 172);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const side = new THREE.MeshPhysicalMaterial({ color: '#25262b', roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 });
    const front = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35 });
    const m = new THREE.Mesh(new env.RB(1.6, 0.66, 0.24, 4, 0.06), [side, side, side, side, front, side]);
    m.position.set(...n.p);
    scene.add(m);
    return m;
  });
  const curves = LINKS.map(([a, b]) => {
    const A = new THREE.Vector3(...NODES[a].p).add(new THREE.Vector3(0.82, 0, 0));
    const Bv = new THREE.Vector3(...NODES[b].p).add(new THREE.Vector3(-0.82, 0, 0));
    return new THREE.CubicBezierCurve3(A, A.clone().add(new THREE.Vector3(1.2, 0, 0)), Bv.clone().add(new THREE.Vector3(-1.2, 0, 0)), Bv);
  });
  const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb347').multiplyScalar(1.6) });
  curves.forEach((c) => scene.add(new THREE.Mesh(new THREE.TubeGeometry(c, 80, 0.022, 10), tubeMat)));
  const pulses = curves.map(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.4, 2.4) }));
    scene.add(m);
    return m;
  });
  // floor grid
  const grid = new THREE.GridHelper(60, 60, '#3a4660', '#1d2433');
  grid.position.y = -1.6;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  // MediaOut viewer with the composite
  const vp = uiPanel(THREE, 1280, 760, 4.4, { radius: 14 });
  vp.mesh.position.set(8.6, 0.35, -1.2);
  vp.mesh.rotation.y = -0.45;
  scene.add(vp.mesh);
  const vw = viewer(THREE, footage, 1.6, 0.9);
  const VR = [24, 56, 1232, 693];
  mountOn(vp, vw.mesh, ...VR);
  const titleGeo = new env.TextGeometry('SUMMIT', { font: env.font3d, size: 0.5, depth: 0.14, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.012, bevelSegments: 3 });
  titleGeo.center();
  const title = new THREE.Mesh(titleGeo, new THREE.MeshPhysicalMaterial({ color: '#f4f6fa', metalness: 0.85, roughness: 0.16, envMapIntensity: 2.2, emissive: '#ffe2b8', emissiveIntensity: 0.18, clearcoat: 1 }));
  const tLight = new THREE.PointLight('#ffd9a8', 6, 6, 2);
  tLight.position.set(-0.6, 0.8, 1.4);
  vp.mesh.add(tLight);
  vp.mesh.add(title);
  const r = rng(12), PN = 160;
  const pg = new THREE.BufferGeometry(), pos = new Float32Array(PN * 3), seed = [];
  for (let i = 0; i < PN; i++) seed.push([r() * 4 - 2, r() * 2.4 - 1.2, r() * 0.8, r()]);
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dc = canvas(64, 64), dg = dc.getContext('2d');
  const grd = dg.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, '#fff'); grd.addColorStop(1, 'rgba(255,255,255,0)'); dg.fillStyle = grd; dg.fillRect(0, 0, 64, 64);
  const parts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.05, map: new THREE.CanvasTexture(dc), color: new THREE.Color(2.4, 1.7, 1.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  vp.mesh.add(parts);
  scene.add(new THREE.AmbientLight('#ffffff', 0.25));
  const key = new THREE.DirectionalLight('#ffe9cc', 1.6);
  key.position.set(-4, 6, 6);
  scene.add(key);

  const camKeys = [
    [0, [-8.6, 1.4, 4.6], [-5.4, 0.1, 0]],
    [2.6, [-3.2, 2.2, 3.6], [-1.6, 0.6, -0.6]],
    [5.0, [1.6, 1.3, 3.4], [2.6, 0.3, -1.0]],
    [7.0, [6.2, 0.9, 3.4], [8.6, 0.35, -1.2]],
    [9.0, [6.9, 0.55, 2.1], [8.7, 0.35, -1.2]],
  ];
  const ck = (lt, idx) => kf(lt, camKeys.map(([t0, p, l], i) => [t0, idx === 0 ? p : l, i ? glide : undefined]));

  shot.update = (lt, t) => {
    glowBackdrop(env.bg, W, H, { base: '#05060a', glows: [[W * 0.5, H * 0.4, 1300, '#1c2a44', 0.9], [W * 0.75, H * 0.35, 700, '#6a3d14', 0.35]] });
    blocks.forEach((b, i) => {
      const a = E.outBack(1.5)(seg(lt, 0.1 + i * 0.12, 0.8 + i * 0.12));
      b.scale.setScalar(Math.max(0.001, a));
      b.position.y = NODES[i].p[1] + 0.05 * Math.sin(lt * 1.3 + i);
      b.rotation.y = 0.12 * Math.sin(lt * 0.7 + i);
    });
    pulses.forEach((m, i) => {
      const p = ((lt * 0.55 + i * 0.27) % 1);
      m.position.copy(curves[i].getPoint(p));
      m.visible = lt > 0.6;
    });
    footage.render(lt + 2, 'orbit', 'golden');
    Object.assign(vw.u.uContrast, { value: 1.12 });
    vw.u.uTeal.value = 0.8;
    vw.u.uSat.value = 1.1;
    const g = vp.g;
    g.reset(); g.fillStyle = B.ui; g.fillRect(0, 0, 1280, 760);
    g.fillStyle = '#18181a'; g.fillRect(0, 0, 1280, 44);
    label(g, 'Fusion  —  MediaOut1', 640, 22, 16, '#d9d9de', 600, 'center');
    g.fillStyle = '#000'; g.fillRect(...VR);
    vp.commit();
    // composite: chrome title + particles in front of the footage
    const ti = E.outExpo(seg(lt, 5.2, 6.6));
    title.position.set(0, 0.1, 0.12 + (1 - ti) * 0.8);
    title.scale.setScalar(Math.max(0.001, lerp(0.6, 1, ti)));
    title.rotation.y = (1 - ti) * 0.9 + 0.08 * Math.sin(lt * 0.8);
    title.visible = ti > 0.001;
    const pp = pg.attributes.position.array;
    seed.forEach(([x, y, z, s], i) => { pp.set([x + Math.sin(lt * 0.4 + s * 9) * 0.15, ((y + lt * (0.1 + s * 0.15) + 1.2) % 2.4) - 1.2, 0.1 + z], i * 3); });
    pg.attributes.position.needsUpdate = true;
    parts.visible = lt > 5.0;

    camera.position.set(...ck(lt, 0));
    camera.lookAt(...ck(lt, 1));
    const whip = E.inExpo(seg(lt, 8.45, 9.0)) * 0.9;
    camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -whip);

    const f = env.fg;
    kText(f, 'VFX & motion graphics.', { x: 110, y: 200, size: 100, weight: 900, t: lt - 0.9, dur: 0.6, stagger: 0.02, out: lt - 4.4, colorAt: (i) => (i === 21 ? B.orange : null) });
    line(f, 'Fusion. Built right in.', { x: 114, y: 272, size: 46, weight: 500, align: 'left', fill: '#b9bcc6', t: lt - 1.6, out: lt - 4.4 });
    line(f, '3D titles  ·  particles  ·  compositing', { x: 114, y: 980, size: 34, weight: 500, align: 'left', fill: '#d4d6dc', t: lt - 6.4, out: lt - 8.3, family: 'Inter', tracking: 0.01 });

    return {
      bloom: [0.55, 0.5, 0.82],
      streak: 0.55, streakThreshold: 0.88,
      flash: (1 - seg(lt, 0, 0.5, E.outCubic)) * 0.55,
      flashColor: [1, 0.86, 0.66],
      zoomBlur: (1 - seg(lt, 0, 0.6, E.outQuad)) * 0.25,
      dirBlur: [clamp((E.inExpo(seg(lt, 8.5, 9.0)) - E.inExpo(seg(lt, 8.45, 8.95))) * 6, 0, 0.28), 0],
    };
  };
  return shot;
}
