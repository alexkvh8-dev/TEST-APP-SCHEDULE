// Blackmagic hardware, modelled procedurally with physically based materials:
// the DaVinci Resolve Speed Editor (keys + knurled search dial) and a Micro Color Panel
// style trackball deck (glossy trackballs in knurled rotary rings + a row of knobs).

import { B } from './brand.js';
import { rng, TAU } from './util.js';

let RB = null;
export const setRB = (x) => (RB = x);

function keyCanvas(text, bg, fg = '#e9e9ee') {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 160, 128);
  g.fillStyle = fg;
  g.font = '700 22px "Inter"';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((l, i) => g.fillText(l, 80, 64 + (i - (lines.length - 1) / 2) * 26));
  return c;
}

function knurledCylinder(THREE, r, h, ridges = 140, depth = 0.012) {
  const g = new THREE.CylinderGeometry(r, r, h, ridges * 2, 1, false);
  const p = g.attributes.position, nrm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    if (Math.abs(nrm.getY(i)) > 0.5) continue; // leave the flat caps untouched
    const a = Math.atan2(z, x);
    const k = 1 + (Math.sign(Math.sin(a * ridges)) * depth) / r;
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  // recompute normals for the knurled wall only; caps keep their flat normals
  const capN = [];
  for (let i = 0; i < nrm.count; i++) capN.push(Math.abs(nrm.getY(i)) > 0.5 ? nrm.getY(i) : null);
  g.computeVertexNormals();
  capN.forEach((ny, i) => { if (ny !== null) nrm.setXYZ(i, 0, Math.sign(ny), 0); });
  return g;
}

function radialBrush(THREE, N = 512) {
  // anisotropy direction map: tangential brushing (like turned aluminium)
  const d = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = (i + 0.5) / N - 0.5, dy = (j + 0.5) / N - 0.5, r = Math.hypot(dx, dy) || 1;
    const k = (j * N + i) * 4;
    d[k] = (-dy / r * 0.5 + 0.5) * 255; d[k + 1] = (dx / r * 0.5 + 0.5) * 255; d[k + 2] = 255; d[k + 3] = 255;
  }
  const t = new THREE.DataTexture(d, N, N);
  t.needsUpdate = true;
  return t;
}

export function makeSpeedEditor(THREE) {
  const root = new THREE.Group();
  const shell = new THREE.MeshPhysicalMaterial({ color: '#2b2b2f', roughness: 0.55, metalness: 0.1, clearcoat: 0.3, clearcoatRoughness: 0.6 });
  const body = new THREE.Mesh(new RB(4.2, 0.34, 2.4, 6, 0.1), shell);
  body.position.y = 0.17;
  root.add(body);
  const deck = new THREE.Mesh(new RB(4.0, 0.04, 2.2, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: '#1f1f22', roughness: 0.7 }));
  deck.position.y = 0.345;
  root.add(deck);
  const keyMats = new Map();
  const side = new THREE.MeshPhysicalMaterial({ color: '#3a3a40', roughness: 0.45 });
  const key = (txt, x, z, w = 0.36, d = 0.3, bg = '#3d3d43', fg) => {
    const id = txt + bg;
    if (!keyMats.has(id)) {
      const tex = new THREE.CanvasTexture(keyCanvas(txt, bg, fg));
      tex.colorSpace = THREE.SRGBColorSpace;
      keyMats.set(id, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.4 }));
    }
    const m = new THREE.Mesh(new RB(w, 0.12, d, 3, 0.035), [side, side, keyMats.get(id), side, side, side]);
    m.position.set(x, 0.42, z);
    root.add(m);
    return m;
  };
  const keys = [];
  // left: edit functions
  [['SMART\nINSRT', 'APPND', 'RIPL\nOWR'], ['CLOSE\nUP', 'PLACE\nON TOP', 'SRC\nOWR'], ['IN', 'OUT', 'TRIM\nIN']].forEach((row, r) =>
    row.forEach((t, c) => keys.push(key(t, -1.72 + c * 0.42, -0.62 + r * 0.38))));
  // cut keys row (colour accents)
  keys.push(key('CUT', -1.72, 0.55, 0.36, 0.3, '#b83a2e'));
  keys.push(key('DIS', -1.30, 0.55, 0.36, 0.3, '#3d3d43'));
  keys.push(key('SMTH\nCUT', -0.88, 0.55, 0.36, 0.3, '#3d3d43'));
  // camera grid 1–9
  for (let i = 0; i < 9; i++) keys.push(key(`CAM\n${i + 1}`, -0.32 + (i % 3) * 0.42, -0.62 + Math.floor(i / 3) * 0.38));
  keys.push(key('LIVE\nOWR', -0.32, 0.55)); keys.push(key('VIDEO\nONLY', 0.10, 0.55)); keys.push(key('AUDIO\nONLY', 0.52, 0.55));
  // transport above the dial
  keys.push(key('SHTL', 1.05, -0.86, 0.34, 0.24)); keys.push(key('JOG', 1.47, -0.86, 0.34, 0.24)); keys.push(key('SCRL', 1.89, -0.86, 0.34, 0.24));
  keys.push(key('STOP /\nPLAY', 1.05, 0.86, 0.6, 0.26, '#3d3d43'));
  // search dial
  const dialMat = new THREE.MeshPhysicalMaterial({ color: '#4a4b50', metalness: 1, roughness: 0.32, anisotropy: 0.8, anisotropyMap: radialBrush(THREE), clearcoat: 0.2 });
  const dial = new THREE.Group();
  const knurl = new THREE.Mesh(knurledCylinder(THREE, 0.66, 0.16, 120, 0.01), dialMat);
  const dimple = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 16, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#2a2a2e', metalness: 1, roughness: 0.2 }));
  dimple.scale.set(1, 0.25, 1);
  dimple.position.set(0.38, 0.08, 0);
  dial.add(knurl, dimple);
  dial.position.set(1.47, 0.46, 0.05);
  root.add(dial);
  // status LEDs
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), new THREE.MeshBasicMaterial({ color: '#ff9f2a' }));
  led.rotation.x = -Math.PI / 2;
  led.position.set(-1.72, 0.484, -0.72);
  root.add(led);
  root.userData = { dial, keys };
  return root;
}

export function makeTrackballPanel(THREE) {
  const root = new THREE.Group();
  const shell = new THREE.MeshPhysicalMaterial({ color: '#232326', roughness: 0.6, metalness: 0.15 });
  const body = new THREE.Mesh(new RB(6.0, 0.36, 2.9, 6, 0.12), shell);
  body.position.y = 0.18;
  root.add(body);
  // speckled glossy trackballs
  const spk = document.createElement('canvas');
  spk.width = 512; spk.height = 256;
  const sg = spk.getContext('2d');
  sg.fillStyle = '#0a0a0c'; sg.fillRect(0, 0, 512, 256);
  const r = rng(4);
  for (let i = 0; i < 2600; i++) { sg.fillStyle = `rgba(150,150,160,${0.25 + r() * 0.35})`; sg.fillRect(r() * 512, r() * 256, 1.4, 1.4); }
  const spkT = new THREE.CanvasTexture(spk);
  spkT.colorSpace = THREE.SRGBColorSpace;
  const ballMat = new THREE.MeshPhysicalMaterial({ map: spkT, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3 });
  const ringMat = new THREE.MeshPhysicalMaterial({ color: '#5a5b61', metalness: 1, roughness: 0.28, anisotropy: 0.7, anisotropyMap: radialBrush(THREE) });
  const balls = [], rings = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 1.85;
    const ring = new THREE.Mesh(knurledCylinder(THREE, 0.78, 0.12, 150, 0.008), ringMat);
    ring.position.set(x, 0.42, 0.25);
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.13, 64), new THREE.MeshPhysicalMaterial({ color: '#0d0d0f', roughness: 0.5 }));
    well.position.set(x, 0.425, 0.25);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 96, 64), ballMat);
    ball.position.set(x, 0.56, 0.25);
    root.add(ring, well, ball);
    balls.push(ball); rings.push(ring);
  }
  // knob row
  const knobMat = new THREE.MeshPhysicalMaterial({ color: '#3a3b40', metalness: 0.9, roughness: 0.35 });
  const knobs = [];
  for (let i = 0; i < 12; i++) {
    const k = new THREE.Mesh(knurledCylinder(THREE, 0.13, 0.18, 40, 0.006), knobMat);
    k.position.set(-2.6 + i * (5.2 / 11), 0.45, -1.05);
    root.add(k);
    knobs.push(k);
  }
  root.userData = { balls, rings, knobs };
  return root;
}
