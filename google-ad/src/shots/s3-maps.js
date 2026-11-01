// SHOT 3 · 0:12.5–0:21 · "Find your way."
// Opens on the exact frame the Maps card expanded to: the painted map as a ground texture
// under a straight-down camera. The camera tilts into a 3D city while buildings, Kyoto
// Tower and a vermilion pagoda rise in a cascade; the location puck walks the route; the
// pin rides up onto the pagoda. A maple leaf swoops through the lens to wipe into Lens.

import * as E from '../lib/ease.js';
import { clamp, lerp, seg } from '../lib/util.js';
import { kText, font, text } from '../lib/type.js';
import { C, card, rr, pin, puck, poiLabel, rgba } from '../lib/brand.js';
import { getMap, L, START_SCALE, START_TARGET, BUILDINGS, TOWER, PAGODA, DEST, ROUTE, routeAt } from '../lib/map.js';
import { LEAF_T0 } from '../lib/leaf.js';

const DEG = Math.PI / 180;

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.land);
  scene.fog = new THREE.Fog(C.land, 36, 78);
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.5, 200);
  scene.add(camera);
  const shot = { name: 'S3 Maps', start: 12.5, end: 21, scene, camera, useBg: false };
  const maps = getMap(env, font);

  // ---- ground ----
  const mkTex = (mips) => {
    const t = new THREE.CanvasTexture(maps.mapFull);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = mips;
    t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = mips ? Math.min(8, env.renderer.capabilities.getMaxAnisotropy()) : 1;
    return t;
  };
  const texFlat = mkTex(false), texMip = mkTex(true);
  const groundMat = new THREE.MeshBasicMaterial({ map: texFlat });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(L, L), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: C.land }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = -0.03;
  scene.add(under);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(L, L), new THREE.ShadowMaterial({ opacity: 0.17 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.004;
  catcher.receiveShadow = true;
  scene.add(catcher);

  // ---- light ----
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#D5D8DC', 1.35));
  const key = new THREE.DirectionalLight('#FFFFFF', 1.9);
  key.position.set(START_TARGET[0] - 16, 30, START_TARGET[1] + 10);
  key.target.position.set(START_TARGET[0], 0, START_TARGET[1]);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 80 });
  key.shadow.bias = -0.0006;
  key.shadow.radius = 3;
  scene.add(key, key.target);

  const envOf = (m, k) => { m.envMap = env.envLight; m.envMapIntensity = k; return m; };

  // ---- buildings (instanced) ----
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const bMat = envOf(new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.82, metalness: 0 }), 0.3);
  const N = BUILDINGS.length;
  const blds = new THREE.InstancedMesh(boxGeo, bMat, N);
  blds.castShadow = true;
  blds.receiveShadow = true;
  const tint = new THREE.Color();
  BUILDINGS.forEach((b, i) => {
    const v = 0.9 + 0.1 * ((i * 37) % 11) / 10;
    tint.setRGB(v, v, v * 1.01);
    blds.setColorAt(i, tint);
  });
  scene.add(blds);
  const delays = BUILDINGS.map(([x, z]) => 0.32 + Math.hypot(x - START_TARGET[0], z - START_TARGET[1]) * 0.042);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();

  // ---- landmarks ----
  const white = envOf(new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5 }), 0.5);
  const red = envOf(new THREE.MeshStandardMaterial({ color: C.red, roughness: 0.55 }), 0.35);
  const roof = envOf(new THREE.MeshStandardMaterial({ color: '#3C4043', roughness: 0.6 }), 0.4);
  const gold = envOf(new THREE.MeshStandardMaterial({ color: C.yellow, roughness: 0.3, metalness: 0.6 }), 0.8);
  const shadowAll = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  const tower = new THREE.Group();
  const tBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.0).translate(0, 0.5, 0), white);
  tBase.scale.y = 1.3;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, 3.0, 32).translate(0, 1.5, 0), white);
  shaft.position.y = 1.3;
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.42, 32).translate(0, 0.21, 0), red);
  deck.position.y = 3.9;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 0.3, 32).translate(0, 0.15, 0), white);
  cap.position.y = 4.32;
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.9, 12).translate(0, 0.45, 0), red);
  needle.position.y = 4.62;
  tower.add(tBase, shaft, deck, cap, needle);
  tower.position.set(TOWER[0], 0, TOWER[1]);
  shadowAll(tower);
  scene.add(tower);

  const pagoda = new THREE.Group();
  let y = 0.25;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.25, 1.25).translate(0, 0.125, 0), white);
  pagoda.add(plinth);
  [[0.82, 0.62], [0.68, 0.55], [0.54, 0.5]].forEach(([w, h]) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w).translate(0, h / 2, 0), red);
    body.position.y = y;
    const rf = new THREE.Mesh(new THREE.ConeGeometry(w * 1.02, 0.34, 4, 1).rotateY(Math.PI / 4).translate(0, 0.17, 0), roof);
    rf.position.y = y + h - 0.04;
    pagoda.add(body, rf);
    y += h + 0.18;
  });
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.8, 12).translate(0, 0.4, 0), gold);
  spire.position.y = y - 0.12;
  pagoda.add(spire);
  const PAGODA_H = y + 0.7;
  pagoda.position.set(PAGODA[0], 0, PAGODA[1]);
  pagoda.rotation.y = 0.3;
  shadowAll(pagoda);
  scene.add(pagoda);

  // ---- camera ----
  const D0 = (H / 2) / (START_SCALE * Math.tan(17.5 * DEG));
  function setCamera(lt) {
    const mv = seg(lt, 0.15, 3.1, E.smooth);
    const drift = seg(lt, 0.15, 8.5, E.inOutSine);
    const yaw = (-16 * mv - 22 * drift) * DEG;
    const pitch = (90 - 40 * mv - 5 * drift) * DEG;
    const dist = Math.exp(lerp(Math.log(D0), Math.log(23), mv)) - 3 * seg(lt, 1.2, 8.5, E.inOutSine);
    const pu = routeAt(seg(lt, 1.2, 6.4, E.inOutSine));
    const follow = seg(lt, 1.0, 5.0, E.inOutSine) * 0.3;
    const tx = lerp(START_TARGET[0], pu[0], follow) + 1.8 * mv, tz = lerp(START_TARGET[1], pu[1], follow) - 3.2 * mv;
    camera.rotation.order = 'YXZ';
    camera.rotation.set(-pitch, yaw, 0);
    const fwd = new THREE.Vector3(-Math.cos(pitch) * Math.sin(yaw), -Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw));
    camera.position.set(tx, 0, tz).addScaledVector(fwd, -dist);
    camera.updateMatrixWorld();
    return pu;
  }

  shot.update = (lt, t) => {
    const f = env.fg;
    groundMat.map = lt < 0.2 ? texFlat : texMip;
    const pu = setCamera(lt);

    // buildings rise in a cascade
    for (let i = 0; i < N; i++) {
      const [x, z, w, d, h] = BUILDINGS[i];
      const k = clamp(E.spring(lt - delays[i], 1.25, 0.62), 0, 1.25);
      const hh = h * k;
      if (hh < 0.003) sc.set(0, 0, 0); else sc.set(w, hh, d);
      ps.set(x, 0, z);
      m4.compose(ps, q, sc);
      blds.setMatrixAt(i, m4);
    }
    blds.instanceMatrix.needsUpdate = true;
    const tr = clamp(E.spring(lt - 0.55, 1.1, 0.6), 0, 1.25);
    tower.scale.set(tr > 0.003 ? 1 : 0, Math.max(tr, 0.0001), tr > 0.003 ? 1 : 0);
    const pr = clamp(E.spring(lt - 1.15, 1.1, 0.6), 0, 1.25);
    pagoda.scale.set(pr > 0.003 ? 1 : 0, Math.max(pr, 0.0001), pr > 0.003 ? 1 : 0);

    // ---- overlays: puck, pin, label ----
    const mk = 1 - seg(lt, 7.55, 7.85); // markers leave before the leaf passes the lens
    const [px, py] = env.project(new THREE.Vector3(pu[0], 0, pu[1]), camera);
    puck(f, px, py, 11, 1, mk);
    const ride = seg(lt, 1.2, 2.6, E.smooth);
    const anchor = new THREE.Vector3(lerp(DEST[0], PAGODA[0], ride), lerp(0, PAGODA_H * clamp(pr, 0, 1), ride), lerp(DEST[1], PAGODA[1], ride));
    const [qx, qy] = env.project(anchor, camera);
    pin(f, qx, qy, 64, mk, 1);
    poiLabel(f, qx + 30, qy - 40, 'Kiyomizu-dera', font, mk);

    // ---- headline with scrim ----
    const scr = seg(lt, 2.2, 2.9, E.inOutSine) * (1 - seg(lt, 7.1, 7.6, E.inOutSine));
    if (scr > 0) {
      const sg = f.createLinearGradient(0, 0, 1050, 0);
      sg.addColorStop(0, rgba(C.white, 0.9 * scr));
      sg.addColorStop(0.55, rgba(C.white, 0.65 * scr));
      sg.addColorStop(1, rgba(C.white, 0));
      f.fillStyle = sg;
      f.fillRect(0, 0, 1050, H);
    }
    const tagA = seg(lt, 2.35, 2.75, E.outExpo) * (1 - seg(lt, 6.9, 7.2));
    if (tagA > 0) {
      f.save();
      f.globalAlpha = tagA;
      f.fillStyle = C.green;
      f.beginPath();
      f.arc(134, 207, 9, 0, Math.PI * 2);
      f.fill();
      text(f, 'Google Maps', 156, 218, 32, 500, C.mute, 'left', 0);
      f.restore();
    }
    kText(f, 'Find your way.', {
      x: 120, y: 340, size: 124, weight: 500, t: lt - 2.45, stagger: 0.025, dur: 0.75,
      out: lt - 6.95, outDur: 0.35, outStagger: 0.01, colorAt: (i) => (i === 13 ? C.green : null),
    });
    kText(f, 'From the first search to the last step.', {
      x: 124, y: 420, size: 38, weight: 400, color: C.mute, unit: 'word', t: lt - 2.9, stagger: 0.05, dur: 0.6,
      mode: 'fade', out: lt - 6.85, outDur: 0.3, outStagger: 0.01,
    });

    // ---- place card ----
    const ce = seg(lt, 3.1, 3.8, E.outQuint) * (1 - seg(lt, 7.0, 7.45, E.inCubic));
    if (ce > 0.002) {
      const cx = 120, cy = H - 120 - 216 + (1 - ce) * 80;
      f.save();
      f.globalAlpha = clamp(ce * 1.6);
      card(f, cx, cy, 580, 216, 28, { glow: C.green, glowA: 0.25 });
      text(f, 'Kiyomizu-dera', cx + 36, cy + 66, 42, 500, C.ink, 'left', 0);
      text(f, 'Temple · Higashiyama, Kyoto', cx + 36, cy + 110, 28, 400, C.mute, 'left', 0);
      rr(f, cx + 36, cy + 138, 214, 52, 26);
      f.fillStyle = C.blueDeep;
      f.fill();
      text(f, 'Directions', cx + 143, cy + 173, 26, 500, C.white, 'center', 0);
      rr(f, cx + 266, cy + 138, 140, 52, 26);
      f.strokeStyle = C.line;
      f.lineWidth = 2;
      f.stroke();
      text(f, 'Start', cx + 336, cy + 173, 26, 500, C.blueDeep, 'center', 0);
      f.restore();
    }

    const leaf = t >= LEAF_T0 - 0.05;
    return Object.assign({ bloom: [0, 0.4, 0.9], grain: 0.014, vignette: 0.05, ca: 0.0005, overlay: leaf }, leaf ? env.leaf.fx(t) : {});
  };
  return shot;
}
