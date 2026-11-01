// The maple leaf: a 3D object that lives on the director's overlay layer so it keeps the
// same camera, lights and pose function on both sides of the S3 -> S4 cut. It swoops past
// the lens (object-as-wipe, covering the frame at the cut) and settles as the Lens hero.

import * as E from './ease.js';
import { clamp, lerp, seg } from './util.js';
import { C, mix } from './brand.js';

export const LEAF_T0 = 20.2; // enters
export const LEAF_TC = 21.0; // closest to the lens = the cut
export const LEAF_T1 = 22.2; // settled

const DEG = Math.PI / 180;
const LOBES = [[0, 1.0], [42, 0.9], [-42, 0.9], [84, 0.7], [-84, 0.7], [124, 0.42], [-124, 0.42]];

// Leaf outline radius for angle th (radians, 0 = up, clockwise positive).
function leafR(th) {
  let r = 0.2;
  for (const [a, len] of LOBES) {
    let d = Math.abs(th - a * DEG);
    d = Math.min(d, Math.PI * 2 - d);
    const w = 23 * DEG;
    const u = Math.max(0, 1 - d / w);
    const v = 0.3 + (len - 0.3) * Math.pow(u, 1.35);
    if (v > r) r = v;
  }
  const serr = 1 + 0.03 * Math.abs(((th / (3.2 * DEG)) % 2) - 1) * (r > 0.34 ? 1 : 0);
  return r * serr;
}

export function leafPath(ctx, cx, cy, s) {
  ctx.beginPath();
  for (let i = 0; i <= 720; i++) {
    const th = (i / 720) * Math.PI * 2 - Math.PI;
    const r = leafR(th) * s;
    const x = cx + Math.sin(th) * r, y = cy - Math.cos(th) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// Painted leaf (alpha outside the shape). Also used as the 2D thumbnail in S1/S4.
export function paintLeaf(size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size * 0.53, s = size * 0.46;
  leafPath(g, cx, cy, s);
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, s);
  grad.addColorStop(0, '#B3261E');
  grad.addColorStop(0.35, C.red);
  grad.addColorStop(0.75, mix(C.red, C.yellow, 0.42));
  grad.addColorStop(1, mix(C.red, C.yellow, 0.7));
  g.fillStyle = grad;
  g.fill();
  // veins
  g.save();
  leafPath(g, cx, cy, s);
  g.clip();
  g.lineCap = 'round';
  for (const [a, len] of LOBES) {
    const tx = cx + Math.sin(a * DEG) * len * s * 0.96, ty = cy - Math.cos(a * DEG) * len * s * 0.96;
    g.strokeStyle = 'rgba(255,214,190,0.55)';
    g.lineWidth = size * 0.009;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(tx, ty);
    g.stroke();
    for (let k = 1; k <= 5; k++) {
      const f = k / 6;
      const bx = cx + (tx - cx) * f, by = cy + (ty - cy) * f;
      for (const sd of [-1, 1]) {
        const ang = a * DEG + sd * 0.75;
        g.lineWidth = size * 0.003;
        g.strokeStyle = 'rgba(255,214,190,0.28)';
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + Math.sin(ang) * s * 0.12 * (1 - f * 0.6), by - Math.cos(ang) * s * 0.12 * (1 - f * 0.6));
        g.stroke();
      }
    }
  }
  // edge darkening
  const eg = g.createRadialGradient(cx, cy, s * 0.55, cx, cy, s * 1.05);
  eg.addColorStop(0, 'rgba(120,20,10,0)');
  eg.addColorStop(1, 'rgba(120,20,10,0.25)');
  g.fillStyle = eg;
  g.fillRect(0, 0, size, size);
  g.restore();
  // petiole
  g.strokeStyle = '#8E1F16';
  g.lineWidth = size * 0.014;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx, cy);
  g.quadraticCurveTo(cx + size * 0.01, cy + s * 0.5, cx - size * 0.02, size * 0.995);
  g.stroke();
  return c;
}

export function createLeaf(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 60);
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#F3D9C6', 1.1));
  const key = new THREE.DirectionalLight('#FFF6EC', 2.2);
  key.position.set(-3, 4, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#FFD38A', 1.6);
  rim.position.set(4, 2, -3);
  scene.add(rim);

  const canvas = paintLeaf(1024);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(2.5, 2.5, 48, 48);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    // cupped along the midrib, tips curling slightly back
    pos.setZ(i, 0.16 * x * x - 0.05 * y * y + 0.03 * Math.sin(y * 3.1));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide,
    roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color('#FFD7A8'), sheenRoughness: 0.5,
    clearcoat: 0.3, clearcoatRoughness: 0.35,
    emissive: new THREE.Color('#FFFFFF'), emissiveMap: tex, emissiveIntensity: 0.16,
  });
  mat.envMap = env.envLight;
  mat.envMapIntensity = 0.55;
  const leaf = new THREE.Mesh(geo, mat);
  const group = new THREE.Group();
  group.add(leaf);
  scene.add(group);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(5.4, -3.4, -9.5),
    new THREE.Vector3(2.5, -1.1, -4.2),
    new THREE.Vector3(0.05, 0.02, -0.78),
    new THREE.Vector3(1.1, -0.05, -4.6),
    new THREE.Vector3(1.25, 0.3, -6.0),
  ], false, 'catmullrom', 0.5);

  function pose(t) {
    let u;
    if (t < LEAF_TC) u = 0.5 * E.inSine(clamp((t - LEAF_T0) / (LEAF_TC - LEAF_T0)));
    else u = 0.5 + 0.5 * E.outQuad(clamp((t - LEAF_TC) / (LEAF_T1 - LEAF_TC)));
    const p = curve.getPoint(u);
    const settle = seg(t, LEAF_T1 - 0.4, LEAF_T1 + 1.2, E.inOutSine);
    p.y += 0.07 * Math.sin((t - LEAF_T1) * 1.15) * settle;
    p.x += 0.04 * Math.sin((t - LEAF_T1) * 0.7 + 1) * settle;
    const f = seg(t, LEAF_T0, LEAF_T1, E.inOutSine);
    const rx = lerp(-0.8, 0.0, f) + 0.12 * Math.sin((t - LEAF_T1) * 0.8) * settle;
    const ry = lerp(0.9, -0.12, f) + 0.2 * Math.sin((t - LEAF_T1) * 0.55) * settle;
    const rz = lerp(1.5, -0.22, f) + 0.07 * Math.sin((t - LEAF_T1) * 0.9) * settle;
    return { p, rx, ry, rz };
  }

  const prev = new THREE.Vector3();
  const api = {
    scene, camera, canvas,
    update(t) {
      const { p, rx, ry, rz } = pose(t);
      group.position.copy(p);
      group.rotation.set(rx, ry, rz);
      group.visible = t >= LEAF_T0 - 0.05;
    },
    // screen position of the leaf centre and its approximate pixel size
    screen(t) {
      const { p } = pose(t);
      const [x, y] = env.project(p, camera);
      const px = (2.5 * 0.92 * H) / (2 * -p.z * Math.tan((17.5 * Math.PI) / 180));
      return { x, y, size: px };
    },
    // whip blur from the leaf's screen speed while it is near the lens
    fx(t) {
      const a = pose(t).p, b = pose(t - 1 / 30).p;
      const pa = env.project(a, camera), pb = env.project(b, camera);
      const near = clamp((4.5 + a.z) / 3.2); // 0 when far, 1 near the lens
      const dx = ((pa[0] - pb[0]) / W) * 0.55 * near, dy = ((pa[1] - pb[1]) / H) * 0.55 * near;
      const m = Math.hypot(dx, dy), cap = 0.07;
      const k = m > cap ? cap / m : 1;
      return { dirBlur: [dx * k, -dy * k] };
    },
  };
  void prev;
  return api;
}
