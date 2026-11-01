// A realistic, brand-neutral flagship phone (1 unit = 100 mm, 19.5:9 display):
// rounded-rect aluminium band with machined chamfers, side keys, black front glass with
// a thin even bezel, an emissive display under clearcoat glass (so the studio lights
// reflect across the screen), frosted back glass and a camera island with three lenses.

import { rng, TAU } from './util.js';

function cnv(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function rr(THREE, w, h, r, PathType) {
  const s = new (PathType || THREE.Shape)();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

export function slab(THREE, w, h, r, depth, bevel, segs = 5, curve = 32) {
  const g = new THREE.ExtrudeGeometry(rr(THREE, w - 2 * bevel, h - 2 * bevel, Math.max(0.001, r - bevel)), {
    depth: Math.max(0.0005, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: curve,
  });
  g.translate(0, 0, -Math.max(0.0005, depth - 2 * bevel) / 2);
  return g;
}

// Rounded-rectangle alpha mask (white inside) for the display's corners.
export function roundMask(THREE, w, h, r) {
  const c = cnv(Math.round(w), Math.round(h)), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(0, 0, c.width, c.height, r); g.fill();
  return new THREE.CanvasTexture(c);
}

/**
 * opts.screen: CanvasTexture for the display (sRGB). Display is 0.95 x 2.05 with 0.11 corners.
 * opts.envMap: the scene's environment, assigned to the display so its low envMapIntensity applies.
 * Returns the group plus handles; `displayZ` is the local z of the display surface.
 */
export function makePhone(THREE, RB, { screen, envMap = null, frame = '#3a3b41', backGlass = '#2a2b31' } = {}) {
  const W = 1.0, H = 2.1, D = 0.09, R = 0.135, B = 0.018;
  const root = new THREE.Group();
  const metal = new THREE.MeshPhysicalMaterial({
    color: frame, metalness: 1, roughness: 0.2, anisotropy: 0.45, anisotropyRotation: Math.PI / 2,
    clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.25,
  });
  const outer = rr(THREE, W - 2 * B, H - 2 * B, R - B);
  outer.holes.push(rr(THREE, W - 2 * B - 0.02, H - 2 * B - 0.02, R - B - 0.01, THREE.Path));
  const bandGeo = new THREE.ExtrudeGeometry(outer, { depth: D - 2 * B, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 12, curveSegments: 56 });
  bandGeo.translate(0, 0, -(D - 2 * B) / 2);
  root.add(new THREE.Mesh(bandGeo, metal));

  // side keys (power + volume rocker) and the antenna lines machined into the band
  const key = (y, len) => {
    const m = new THREE.Mesh(new RB(0.016, len, 0.036, 2, 0.007), metal);
    m.position.set(W / 2 + 0.003, y, 0);
    root.add(m);
  };
  key(0.42, 0.17); key(0.12, 0.28);
  const lineMat = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.6 });
  for (const [x, y, w, h] of [[0.33, H / 2 + 0.0005, 0.012, 0.03], [-0.33, -H / 2 - 0.0005, 0.012, 0.03], [W / 2 + 0.0005, -0.62, 0.03, 0.012], [-W / 2 - 0.0005, 0.7, 0.03, 0.012]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, D * 0.72), lineMat);
    m.position.set(x, y, 0);
    root.add(m);
  }

  // front glass + display
  const glass = new THREE.MeshPhysicalMaterial({ color: '#030304', roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.1 });
  const front = new THREE.Mesh(slab(THREE, W - 0.012, H - 0.012, R - 0.006, 0.01, 0.003), glass);
  front.position.z = D / 2 - 0.004;
  root.add(front);
  const displayZ = D / 2 + 0.0013;
  const dispMat = new THREE.MeshPhysicalMaterial({
    color: '#000000', emissive: '#ffffff', emissiveMap: screen, emissiveIntensity: 1,
    roughness: 0.06, clearcoat: 0.35, clearcoatRoughness: 0.08, envMapIntensity: 0.08,
    alphaMap: roundMask(THREE, 190, 410, 22), alphaTest: 0.5,
  });
  // three.js uses scene.environmentIntensity (not envMapIntensity) for materials that
  // inherit scene.environment, so the display gets the map explicitly to keep its
  // reflections faint; callers keep dispMat.envMapRotation in step with the scene.
  if (envMap) dispMat.envMap = envMap;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.05), dispMat);
  display.position.z = displayZ;
  root.add(display);
  // earpiece slot
  const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.008), new THREE.MeshBasicMaterial({ color: '#0b0b0d' }));
  slot.position.set(0, H / 2 - 0.0135, D / 2 + 0.0012);
  root.add(slot);

  // back glass with a soft frost and a camera island
  const bc = cnv(256, 540), bgc = bc.getContext('2d');
  bgc.fillStyle = backGlass; bgc.fillRect(0, 0, 256, 540);
  const nr = rng(5);
  for (let i = 0; i < 4000; i++) { bgc.fillStyle = `rgba(${nr() > 0.5 ? '255,255,255' : '0,0,0'},0.04)`; bgc.fillRect(nr() * 256, nr() * 540, 1.2, 1.2); }
  const backTex = new THREE.CanvasTexture(bc);
  backTex.colorSpace = THREE.SRGBColorSpace;
  const back = new THREE.Mesh(slab(THREE, W - 0.012, H - 0.012, R - 0.006, 0.01, 0.003), new THREE.MeshPhysicalMaterial({ map: backTex, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4 }));
  back.position.z = -(D / 2 - 0.004);
  root.add(back);
  const island = new THREE.Group();
  const isl = new THREE.Mesh(slab(THREE, 0.34, 0.5, 0.11, 0.014, 0.005), new THREE.MeshPhysicalMaterial({ color: '#202126', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }));
  island.add(isl);
  const lensC = cnv(128, 128), lg = lensC.getContext('2d');
  lg.fillStyle = '#020203'; lg.fillRect(0, 0, 128, 128);
  for (let i = 8; i > 0; i--) { lg.strokeStyle = `rgba(${50 + i * 8},${50 + i * 8},${70 + i * 10},0.5)`; lg.lineWidth = 1.5; lg.beginPath(); lg.arc(64, 64, i * 7, 0, TAU); lg.stroke(); }
  const lensT = new THREE.CanvasTexture(lensC);
  lensT.colorSpace = THREE.SRGBColorSpace;
  const lensMat = new THREE.MeshPhysicalMaterial({ map: lensT, roughness: 0.03, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 600] });
  const ringMat = new THREE.MeshPhysicalMaterial({ color: '#8a8b90', metalness: 1, roughness: 0.18 });
  [[0, 0.13], [0, -0.04], [0, -0.2]].forEach(([x, y]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.02, 64).rotateX(Math.PI / 2), ringMat);
    ring.position.set(x, y, -0.012);
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.056, 48), lensMat);
    l.rotation.y = Math.PI;
    l.position.set(x, y, -0.0225);
    island.add(ring, l);
  });
  island.position.set(W / 2 - 0.26, H / 2 - 0.36, -(D / 2 + 0.006));
  root.add(island);

  return { root, display, dispMat, displayZ, W, H, D };
}
