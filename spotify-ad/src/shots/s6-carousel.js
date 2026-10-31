// SHOT 6 · 0:43–0:51.5 · "Made for you."
// Lands out of the whip pan (decaying directional blur) on a ring of playlist covers
// orbiting extruded 3D type. Letters flip up on springs; the full stop is a green
// sphere. The type falls away, the full stop hops to centre, and the covers spiral in
// (speeding up as the radius shrinks) and are absorbed while the sphere swells — the
// camera pushes in to hand the sphere to Shot 7 at a fixed size.

import { C, roundRect } from '../lib/brand.js';
import * as E from '../lib/ease.js';
import { lerp, seg, clamp, TAU } from '../lib/util.js';

export const SPHERE_R = 0.55;
export const CAM_END = [0, 0, 4.0];

export function sphereMaterial(THREE) {
  return new THREE.MeshPhysicalMaterial({
    color: C.green, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08,
    emissive: C.green, emissiveIntensity: 0.12, envMapIntensity: 0.45,
  });
}

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envMap;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  const shot = { name: 'S6 Carousel', start: 43, end: 51.5, scene, camera, useBg: true };

  scene.add(new THREE.AmbientLight('#ffffff', 0.3));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-3, 4, 5);
  const back = new THREE.DirectionalLight('#ffffff', 0.9);
  back.position.set(0, 2, -5);
  const glow = new THREE.PointLight(C.green, 0, 8, 2);
  scene.add(key, back, glow);

  // ---- covers ----
  const N = 12, R = 2.9, S = 1.15;
  const covers = env.covers.slice(0, N).map((cv, i) => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    roundRect(g, 0, 0, 512, 512, 22);
    g.clip();
    g.drawImage(cv, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const grp = new THREE.Group();
    const front = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5 }));
    const backM = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshBasicMaterial({ color: '#1c1c1c', map: tex, alphaTest: 0.5 }));
    backM.rotation.y = Math.PI;
    backM.material.color.set('#2a2a2a');
    grp.add(front, backM);
    scene.add(grp);
    return grp;
  });

  // ---- 3D type: one mesh per glyph so each can spring independently ----
  const font = env.font3d, size = 0.7;
  const scale = size / font.data.resolution;
  const word = 'Made for you';
  const letterMat = new THREE.MeshPhysicalMaterial({ color: '#e9e9e9', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.45 });
  const letters = [];
  let pen = 0;
  for (const ch of word) {
    const glyph = font.data.glyphs[ch];
    const adv = (glyph ? glyph.ha : font.data.resolution * 0.3) * scale - size * 0.035;
    if (ch !== ' ') {
      const geo = new env.TextGeometry(ch, { font, size, depth: 0.16, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.01, bevelSegments: 3 });
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      const cx = (bb.min.x + bb.max.x) / 2;
      geo.translate(-cx, 0, -0.08); // pivot on the baseline, centred in x and depth
      const m = new THREE.Mesh(geo, letterMat);
      m.userData.x = pen + cx;
      letters.push(m);
    }
    pen += adv;
  }
  const dotR = 0.085;
  const dotX = pen + size * 0.02 + dotR;
  const total = dotX + dotR;
  const typeGrp = new THREE.Group();
  letters.forEach((m) => { m.userData.x -= total / 2; typeGrp.add(m); });
  scene.add(typeGrp);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), sphereMaterial(THREE));
  scene.add(dot);
  const TYPE_Y = 0.92;
  const dotHome = new THREE.Vector3(dotX - total / 2, TYPE_Y + dotR, 0);

  const yawAt = (lt) => 0.6 * (1 - E.outExpo(seg(lt, 0, 1.0)));

  shot.update = (lt) => {
    // ---- ring ----
    const spiral = (i) => seg(lt, 5.0 + i * 0.045, 7.1 + i * 0.045, E.inCubic);
    covers.forEach((cv, i) => {
      const p = spiral(i);
      const fin = E.outExpo(seg(lt, -0.35 + i * 0.03, 0.9 + i * 0.03));
      const rad = lerp(6, R, fin) * (1 - p);
      const th = (i / N) * TAU + lt * 0.38 + 6 * p * p * p + (1 - fin) * 1.2;
      const y = 0.12 * Math.sin(lt * 1.8 + i * 0.9) * (1 - p) + (1 - fin) * (i % 2 ? 1.5 : -1.5);
      cv.position.set(rad * Math.sin(th), y, rad * Math.cos(th));
      cv.rotation.set(0.08 * Math.sin(lt * 1.5 + i), th, 0.05 * Math.sin(lt + i * 2));
      const sc = Math.max(0.0001, (1 - Math.pow(p, 1.4)) * fin);
      cv.scale.setScalar(sc);
      const facing = (Math.cos(th) + 1) / 2;
      cv.children[0].material.color.setScalar(lerp(0.4, 1, facing));
      cv.visible = sc > 0.002;
    });

    // ---- type: flip up on springs, then fall away ----
    letters.forEach((m, i) => {
      const s = E.spring(lt - 0.85 - i * 0.055, 1.8, 0.45);
      const out = seg(lt, 4.75 + i * 0.035, 5.35 + i * 0.035, E.inBack(1.8));
      m.position.set(m.userData.x, TYPE_Y - out * 0.6, 0);
      m.rotation.set(lerp(-Math.PI / 2, 0, s) + out * 1.4, 0, 0);
      m.scale.setScalar(Math.max(0.0001, clamp(s * 3) * (1 - out)));
    });

    // ---- the full stop: pops in, hops to centre, swells as covers are absorbed ----
    const pin = E.outBack(2.5)(seg(lt, 1.55, 1.95));
    const hop = seg(lt, 5.1, 5.9, E.inOutCubic);
    const pos = dotHome.clone().lerp(new THREE.Vector3(0, 0, 0), hop);
    pos.y += Math.sin(Math.PI * hop) * 0.55;
    const land = (t0) => { const d = lt - t0; return d < 0 ? 0 : 0.3 * Math.exp(-7 * d) * Math.cos(2 * Math.PI * 3 * d); };
    const sq = land(5.9);
    let r = dotR * pin;
    let absorbed = 0;
    for (let i = 0; i < N; i++) absorbed += E.kick(lt - (7.1 + i * 0.045), 0.03, 8);
    r = lerp(r, SPHERE_R, E.outBack(1.3)(seg(lt, 6.0, 7.6)));
    r *= 1 + 0.035 * Math.min(absorbed, 2);
    dot.position.copy(pos);
    const stretch = Math.sin(Math.PI * hop) * 0.25;
    dot.scale.set(r * (1 + sq - stretch * 0.5), r * (1 - sq + stretch), r * (1 + sq - stretch * 0.5));
    dot.visible = r > 0.001;
    glow.intensity = 2.5 * seg(lt, 6.0, 7.4);
    glow.position.set(0, 0, 1.2);

    // ---- camera ----
    const push = seg(lt, 6.0, 8.3, E.swoop);
    const cp = [lerp(0, CAM_END[0], push), lerp(1.05, CAM_END[1], push), lerp(7.6, CAM_END[2], push)];
    const look = [0, lerp(0.05, 0, push), 0];
    camera.position.set(...cp);
    camera.up.set(0, 1, 0);
    camera.lookAt(...look);
    const yaw = yawAt(lt);
    camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), yaw);
    const vel = (yaw - yawAt(lt + 1 / 60)) * 60;

    // ---- background ----
    const g = env.bg;
    g.fillStyle = C.ink;
    g.fillRect(0, 0, W, H);
    const gr = g.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, W * 0.55);
    const ga = 0.12 + 0.1 * seg(lt, 6.0, 7.5);
    gr.addColorStop(0, `rgba(30,215,96,${ga})`);
    gr.addColorStop(1, 'rgba(30,215,96,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);

    const blur = clamp(Math.abs(vel) * 0.02, 0, 0.3);
    return {
      bloom: [0.3, 0.45, 0.93],
      dirBlur: [blur, 0],
      ca: 0.0012 + blur * 0.02,
      flash: E.kick(lt - 7.2, 0.03, 6) * 0.08,
      flashColor: [0.12, 0.84, 0.38],
      vignette: 0.32,
    };
  };
  return shot;
}
