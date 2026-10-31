// Procedural, proportion-accurate product models (1 unit = 100 mm).
// iPhone (Pro and colour models, with explodable internals), Apple Watch,
// AirPods Pro case, MacBook. All materials are physically based so the studio
// environment's strip lights read correctly on titanium, aluminium and glass.

import { FINISH, A, drawLogo, squircle, roundRect } from './apple.js';
import { PHONE_PX, lockScreen, watchFace, macDesktop } from './screens.js';
import { rng, TAU } from './util.js';

function cnv(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Rounded rectangle with per-corner radii [tl, tr, br, bl], centred on (cx, cy).
export function rr(THREE, w, h, r, cx = 0, cy = 0, PathType) {
  const s = new (PathType || THREE.Shape)();
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  const x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + bl, y);
  s.lineTo(x + w - br, y);
  br ? s.absarc(x + w - br, y + br, br, -Math.PI / 2, 0, false) : s.lineTo(x + w, y);
  s.lineTo(x + w, y + h - tr);
  tr ? s.absarc(x + w - tr, y + h - tr, tr, 0, Math.PI / 2, false) : s.lineTo(x + w, y + h);
  s.lineTo(x + tl, y + h);
  tl ? s.absarc(x + tl, y + h - tl, tl, Math.PI / 2, Math.PI, false) : s.lineTo(x, y + h);
  s.lineTo(x, y + bl);
  bl ? s.absarc(x + bl, y + bl, bl, Math.PI, Math.PI * 1.5, false) : s.lineTo(x, y);
  return s;
}

function slab(THREE, w, h, r, depth, bevel, segs = 5, curve = 24) {
  const g = new THREE.ExtrudeGeometry(rr(THREE, w - 2 * bevel, h - 2 * bevel, Math.max(0.001, (Array.isArray(r) ? r : r) - bevel)), {
    depth: Math.max(0.0005, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: curve,
  });
  g.translate(0, 0, -Math.max(0.0005, depth - 2 * bevel) / 2);
  return g;
}

function tex(THREE, c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function maskTex(THREE, w, h, r) {
  const c = cnv(w, h), g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff';
  squircle(g, 0, 0, w, h, r);
  g.fill();
  return tex(THREE, c, false);
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  return `rgb(${ch.join(',')})`;
}

// ---------------------------------------------------------------- iPhone
export function makeIPhone(THREE, { finish = 'titanium', pro = true, internals = false } = {}) {
  const F = FINISH[finish];
  const W = 0.716, H = 1.476, D = 0.083, R = 0.118, B = 0.012;
  const root = new THREE.Group();
  const frameMat = new THREE.MeshPhysicalMaterial({
    color: F.frame, metalness: 1, roughness: pro ? 0.2 : 0.22, envMapIntensity: 1.1,
    ...(pro ? { anisotropy: 0.55, anisotropyRotation: Math.PI / 2 } : {}),
  });
  // titanium/aluminium band: outline with an opening, so the internals can live inside
  const outer = rr(THREE, W - 2 * B, H - 2 * B, R - B);
  outer.holes.push(rr(THREE, W - 2 * B - 0.02, H - 2 * B - 0.02, R - B - 0.01, 0, 0, THREE.Path));
  const bandGeo = new THREE.ExtrudeGeometry(outer, { depth: D - 2 * B, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 14, curveSegments: 48 });
  bandGeo.translate(0, 0, -(D - 2 * B) / 2);
  const band = new THREE.Mesh(bandGeo, frameMat);
  root.add(band);

  // buttons
  const btn = (side, y, len, depth = 0.032) => {
    const m = new THREE.Mesh(new (env_RoundedBox())(0.014, len, depth, 2, 0.006), frameMat);
    m.position.set(side * (W / 2 + 0.002), y, 0);
    root.add(m);
    return m;
  };
  btn(-1, 0.43, 0.065); btn(-1, 0.29, 0.12); btn(-1, 0.14, 0.12); btn(1, 0.26, 0.19);
  const cc = btn(1, -0.17, 0.11, 0.028);
  if (pro) cc.material = new THREE.MeshPhysicalMaterial({ color: '#1c1c1e', metalness: 0.3, roughness: 0.08, clearcoat: 1 });

  // front: glass + display
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#050506', roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.0 });
  const front = new THREE.Group();
  const fg = new THREE.Mesh(slab(THREE, W - 0.022, H - 0.022, R - 0.011, 0.01, 0.003), glassMat);
  front.add(fg);
  const scrC = cnv(PHONE_PX.w, PHONE_PX.h), scrG = scrC.getContext('2d', { willReadFrequently: true });
  const scrT = tex(THREE, scrC);
  const scrMat = new THREE.MeshPhysicalMaterial({
    color: '#000', roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.7,
    emissive: '#ffffff', emissiveMap: scrT, emissiveIntensity: 0,
    alphaMap: maskTex(THREE, 340, 720, 56), alphaTest: 0.5,
  });
  const display = new THREE.Mesh(new THREE.PlaneGeometry(PHONE_PX.w / 1000, PHONE_PX.h / 1000), scrMat);
  display.position.z = 0.0052;
  front.add(display);
  front.position.z = D / 2 - 0.004;
  root.add(front);

  // back: frosted colour glass, glossy logo, camera plateau
  const back = new THREE.Group();
  const bc = cnv(512, 1056), bg = bc.getContext('2d');
  const rc = cnv(512, 1056), rgc = rc.getContext('2d');
  bg.fillStyle = F.back; bg.fillRect(0, 0, 512, 1056);
  const nr = rng(3);
  for (let i = 0; i < 9000; i++) { bg.fillStyle = `rgba(${nr() > 0.5 ? '255,255,255' : '0,0,0'},0.035)`; bg.fillRect(nr() * 512, nr() * 1056, 1.5, 1.5); }
  rgc.fillStyle = '#ffffff'; rgc.fillRect(0, 0, 512, 1056);
  const logoY = pro ? 528 : 528;
  drawLogo(bg, 256, logoY, 96, shade(F.back, 0.88));
  drawLogo(rgc, 256, logoY, 96, '#141414');
  const backMat = new THREE.MeshPhysicalMaterial({
    map: tex(THREE, bc), roughness: 0.62, roughnessMap: tex(THREE, rc, false), metalness: 0,
    clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 1,
  });
  const bglass = new THREE.Mesh(slab(THREE, W - 0.022, H - 0.022, R - 0.011, 0.01, 0.003), [backMat, new THREE.MeshPhysicalMaterial({ color: F.back, roughness: 0.4 })]);
  // UVs of extrude caps are raw xy: remap so the canvas spans the whole back
  const uv = bglass.geometry.attributes.uv, pos = bglass.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 - pos.getX(i) / (W - 0.022), 0.5 + pos.getY(i) / (H - 0.022));
  back.add(bglass);

  const plateauMat = new THREE.MeshPhysicalMaterial({ color: F.back, roughness: pro ? 0.22 : 0.15, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 });
  const ringMat = new THREE.MeshPhysicalMaterial({ color: pro ? '#7c7872' : F.frame, metalness: 1, roughness: 0.18 });
  const lensTex = (() => {
    const c = cnv(256, 256), g = c.getContext('2d');
    g.fillStyle = '#020203'; g.fillRect(0, 0, 256, 256);
    for (let i = 10; i > 0; i--) { g.strokeStyle = `rgba(${40 + i * 8},${40 + i * 8},${60 + i * 10},0.55)`; g.lineWidth = 2; g.beginPath(); g.arc(128, 128, i * 11, 0, TAU); g.stroke(); }
    const gr = g.createRadialGradient(108, 104, 0, 128, 128, 120);
    gr.addColorStop(0, 'rgba(120,90,255,0.35)'); gr.addColorStop(0.5, 'rgba(30,80,120,0.15)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#000'; g.beginPath(); g.arc(128, 128, 26, 0, TAU); g.fill();
    return tex(THREE, c);
  })();
  const lensMat = new THREE.MeshPhysicalMaterial({
    map: lensTex, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02,
    iridescence: 0.9, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 650], envMapIntensity: 1.3,
  });
  const zb = -0.0052; // outer face of the back glass (local to `back`)
  const plateau = new THREE.Group();
  const lens = (bx, by, r = 0.068) => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.024, 72, 1, false).rotateX(Math.PI / 2), ringMat);
    ring.position.z = -0.012;
    const glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.82, 64), lensMat);
    glass.rotation.y = Math.PI;
    glass.position.z = -0.0245;
    g.add(ring, glass);
    g.position.set(-bx, by, 0);
    plateau.add(g);
    return g;
  };
  const dot = (bx, by, r, col, rough = 0.4, emi = 0) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshPhysicalMaterial({ color: col, roughness: rough, emissive: col, emissiveIntensity: emi }));
    m.rotation.y = Math.PI;
    m.position.set(-bx, by, -0.0131);
    plateau.add(m);
    return m;
  };
  let lensWorld = [];
  if (pro) {
    const pw = 0.355, ph = 0.36;
    const p = new THREE.Mesh(slab(THREE, pw, ph, 0.08, 0.013, 0.004), plateauMat);
    p.position.z = -0.0065;
    plateau.add(p);
    lensWorld = [lens(-0.088, 0.088), lens(-0.088, -0.088), lens(0.088, 0)];
    dot(0.09, 0.115, 0.022, '#f4ecd8', 0.6);
    dot(0.09, -0.115, 0.02, '#050505', 0.05);
    plateau.position.set(-(-W / 2 + 0.035 + pw / 2), H / 2 - 0.035 - ph / 2, zb);
  } else {
    const pw = 0.17, ph = 0.36;
    const p = new THREE.Mesh(slab(THREE, pw, ph, 0.085, 0.012, 0.004), plateauMat);
    p.position.z = -0.006;
    plateau.add(p);
    lensWorld = [lens(0, 0.092, 0.062), lens(0, -0.092, 0.062)];
    dot(0.15, 0.11, 0.02, '#f4ecd8', 0.6);
    plateau.position.set(-(-W / 2 + 0.05 + pw / 2), H / 2 - 0.05 - ph / 2, zb);
  }
  back.add(plateau);
  back.position.z = -(D / 2 - 0.004);
  root.add(back);

  const parts = { band, front, back, display, plateau, lenses: lensWorld, frameMat, scrMat, scrT };

  // ---- internals (only revealed by the exploded view) ----
  if (internals) {
    const inner = new THREE.Group();
    const mid = new THREE.Mesh(slab(THREE, W - 0.05, H - 0.05, R - 0.03, 0.004, 0.001), new THREE.MeshPhysicalMaterial({ color: '#a7a8ad', metalness: 1, roughness: 0.42 }));
    const batC = cnv(512, 768), bgc = batC.getContext('2d');
    bgc.fillStyle = '#2b2b2e'; bgc.fillRect(0, 0, 512, 768);
    bgc.fillStyle = 'rgba(255,255,255,0.75)'; bgc.font = '600 34px "Inter"'; bgc.fillText('Li-ion Polymer', 40, 690);
    bgc.fillStyle = 'rgba(255,255,255,0.4)'; bgc.font = '500 22px "Inter"'; bgc.fillText('Designed by Apple in California', 40, 730);
    const battery = new THREE.Mesh(new (env_RoundedBox())(0.47, 0.74, 0.02, 3, 0.008), new THREE.MeshPhysicalMaterial({ map: tex(THREE, batC), roughness: 0.55, metalness: 0.2 }));
    battery.position.set(0, -0.26, 0);
    // logic board with an animated "current" texture and the chip
    const boardC = cnv(512, 512), boardG = boardC.getContext('2d', { willReadFrequently: true });
    const boardT = tex(THREE, boardC);
    const boardMat = new THREE.MeshPhysicalMaterial({ color: '#0f1113', roughness: 0.5, metalness: 0.3, emissive: '#ffffff', emissiveMap: boardT, emissiveIntensity: 1 });
    const board = new THREE.Mesh(new (env_RoundedBox())(0.56, 0.44, 0.01, 2, 0.004), boardMat);
    board.position.set(0.02, 0.43, 0);
    const chipC = cnv(256, 256), cg = chipC.getContext('2d');
    const cgr = cg.createLinearGradient(0, 0, 256, 256);
    cgr.addColorStop(0, '#d9d9de'); cgr.addColorStop(0.5, '#9a9aa2'); cgr.addColorStop(1, '#e6e6ea');
    cg.fillStyle = cgr; cg.fillRect(0, 0, 256, 256);
    drawLogo(cg, 128, 120, 92, '#4a4a50');
    const chip = new THREE.Mesh(new (env_RoundedBox())(0.15, 0.15, 0.014, 2, 0.006), new THREE.MeshPhysicalMaterial({ map: tex(THREE, chipC), metalness: 1, roughness: 0.25 }));
    chip.position.set(-0.04, 0.0, 0.012);
    board.add(chip);
    const cr = rng(9);
    for (let i = 0; i < 22; i++) {
      const s = 0.015 + cr() * 0.04;
      const comp = new THREE.Mesh(new THREE.BoxGeometry(s, s * (0.5 + cr()), 0.008), new THREE.MeshPhysicalMaterial({ color: cr() > 0.7 ? '#b8b8bc' : '#1a1a1c', metalness: 0.6, roughness: 0.35 }));
      const ang = cr() * TAU, rad = 0.11 + cr() * 0.1;
      comp.position.set(Math.cos(ang) * rad * 1.1, Math.sin(ang) * rad * 0.8, 0.009);
      board.add(comp);
    }
    const camMod = new THREE.Group();
    const camMat = new THREE.MeshPhysicalMaterial({ color: '#2a2a2c', metalness: 0.8, roughness: 0.3 });
    parts.lenses.forEach((l) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 48).rotateX(Math.PI / 2), camMat);
      c.position.set(l.position.x + plateau.position.x, l.position.y + plateau.position.y, 0);
      camMod.add(c);
    });
    inner.add(mid, battery, board, camMod);
    root.add(inner);
    Object.assign(parts, { inner, mid, battery, board, chip, camMod, boardG, boardT });
    parts.drawBoard = (t, glow) => {
      const g = boardG;
      g.reset();
      g.fillStyle = '#000';
      g.fillRect(0, 0, 512, 512);
      // traces radiating from the chip with travelling pulses of light
      const cx = 220, cy = 256;
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * TAU;
        const len = 120 + (i % 5) * 30;
        const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len;
        g.strokeStyle = `rgba(80,140,255,${0.18 * glow})`;
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); g.lineTo(ex, ey); g.stroke();
        const ph = ((t * 0.9 + i * 0.137) % 1);
        const px = cx + Math.cos(a) * (60 + ph * (len - 60)), py = cy + Math.sin(a) * (60 + ph * (len - 60));
        const pg = g.createRadialGradient(px, py, 0, px, py, 14);
        pg.addColorStop(0, `rgba(140,200,255,${0.9 * glow})`);
        pg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = pg;
        g.fillRect(px - 14, py - 14, 28, 28);
      }
      const halo = g.createRadialGradient(cx, cy, 30, cx, cy, 140);
      halo.addColorStop(0, `rgba(90,150,255,${0.55 * glow})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = halo;
      g.fillRect(0, 0, 512, 512);
      boardT.needsUpdate = true;
    };
  }

  parts.drawScreen = (st) => {
    lockScreen(scrG, st);
    scrT.needsUpdate = true;
  };
  root.userData = parts;
  return root;
}

// three's RoundedBoxGeometry is injected once by main.js (keeps this module import-free)
let _RB = null;
export function setRoundedBox(RB) { _RB = RB; }
function env_RoundedBox() { return _RB; }

// ---------------------------------------------------------------- Apple Watch
export function makeWatch(THREE, { caseColor = '#2c2c2f', bandColor = '#2e3a52' } = {}) {
  const W = 0.42, H = 0.51, D = 0.105, R = 0.125;
  const root = new THREE.Group();
  const alu = new THREE.MeshPhysicalMaterial({ color: caseColor, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 });
  root.add(new THREE.Mesh(slab(THREE, W, H, R, D, 0.035, 8, 40), alu));
  const glass = new THREE.MeshPhysicalMaterial({ color: '#030303', roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02 });
  const front = new THREE.Mesh(slab(THREE, W - 0.03, H - 0.03, R - 0.015, 0.03, 0.014, 6, 40), glass);
  front.position.z = D / 2 - 0.012;
  root.add(front);
  const faceC = cnv(300, 366), faceG = faceC.getContext('2d', { willReadFrequently: true });
  const faceT = tex(THREE, faceC);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.415), new THREE.MeshPhysicalMaterial({
    color: '#000', roughness: 0.03, clearcoat: 1, emissive: '#fff', emissiveMap: faceT, emissiveIntensity: 1,
    alphaMap: maskTex(THREE, 170, 207, 46), alphaTest: 0.5,
  }));
  face.position.z = D / 2 + 0.0035;
  root.add(face);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.04, 48).rotateZ(Math.PI / 2), alu);
  crown.position.set(W / 2 + 0.012, 0.09, 0);
  const sbtn = new THREE.Mesh(new (env_RoundedBox())(0.014, 0.13, 0.03, 2, 0.006), alu);
  sbtn.position.set(W / 2 + 0.002, -0.07, 0);
  root.add(crown, sbtn);
  // Sport Loop style band: an open torus in the YZ plane, attached at the top and bottom
  // of the case and looping behind it (the classic standing product pose).
  const bandMat = new THREE.MeshPhysicalMaterial({ color: bandColor, roughness: 0.8, sheen: 0.5, sheenColor: '#ffffff', sheenRoughness: 0.6 });
  const LR = 0.5, c = Math.sqrt(LR * LR - (H / 2 - 0.03) ** 2), a0 = Math.atan2(H / 2 - 0.03, c);
  const loopGeo = new THREE.TorusGeometry(LR, 0.045, 24, 160, Math.PI * 2 - 2 * a0).rotateZ(a0).rotateY(-Math.PI / 2).scale(3.6, 1, 1);
  loopGeo.translate(0, 0, -c - 0.01);
  const loop = new THREE.Mesh(loopGeo, bandMat);
  root.add(loop);
  root.userData.loopBottom = -(LR + 0.045);
  root.userData.draw = (t, wake) => { watchFace(faceG, 300, t, wake); faceT.needsUpdate = true; };
  return root;
}

// ---------------------------------------------------------------- AirPods Pro case
export function makeAirPods(THREE) {
  const root = new THREE.Group();
  const W = 0.606, Hc = 0.452, Dp = 0.217, SEAM = 0.72; // seam height as a fraction from the bottom
  // seam drawn into the side faces only (RoundedBox keeps BoxGeometry's per-face groups)
  const c = cnv(64, 256), g = c.getContext('2d');
  g.fillStyle = '#f7f7f5'; g.fillRect(0, 0, 64, 256);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 256 * (1 - SEAM) - 1.5, 64, 3);
  const seamMat = new THREE.MeshPhysicalMaterial({ map: tex(THREE, c), roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.9 });
  const plain = new THREE.MeshPhysicalMaterial({ color: '#f7f7f5', roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.9 });
  const body = new THREE.Mesh(new (env_RoundedBox())(W, Hc, Dp, 10, 0.105), [seamMat, seamMat, plain, plain, seamMat, seamMat]);
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.008, 24), new THREE.MeshBasicMaterial({ color: '#30d158' }));
  led.position.set(0, 0.02, Dp / 2 + 0.0008);
  root.add(body, led);
  root.userData = { led };
  return root;
}

// ---------------------------------------------------------------- MacBook
export function makeMacBook(THREE, { color = '#2e2e30' } = {}) {
  const root = new THREE.Group();
  const alu = new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.34, envMapIntensity: 1.0 });
  const W = 3.04, Dd = 2.14;
  const base = new THREE.Mesh(slab(THREE, W, Dd, 0.1, 0.05, 0.014, 4, 24).rotateX(-Math.PI / 2), alu);
  base.position.y = 0.025;
  root.add(base);
  // keyboard deck
  const kc = cnv(1520, 1070), kg = kc.getContext('2d');
  kg.fillStyle = color; kg.fillRect(0, 0, 1520, 1070);
  kg.fillStyle = '#0c0c0d';
  const kw = 1180 / 14;
  for (let r = 0; r < 6; r++) for (let c = 0; c < 14; c++) roundRect(kg, 170 + c * kw + 4, 90 + r * (r === 0 ? 50 : 80) + (r ? -30 : 0) + 4, kw - 8, r === 0 ? 40 : 70, 8), kg.fill();
  kg.strokeStyle = 'rgba(0,0,0,0.35)'; kg.lineWidth = 4;
  roundRect(kg, 470, 600, 580, 400, 22); kg.stroke();
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, Dd - 0.04), new THREE.MeshPhysicalMaterial({ map: tex(THREE, kc), metalness: 0.9, roughness: 0.4 }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.0505;
  root.add(deck);
  // lid on a hinge at the back edge
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.05, -Dd / 2 + 0.02);
  const lid = new THREE.Group();
  const shell = new THREE.Mesh(slab(THREE, W, 2.06, 0.1, 0.028, 0.008, 4, 24), alu);
  lid.add(shell);
  const lc = cnv(512, 352), lg = lc.getContext('2d');
  lg.fillStyle = color; lg.fillRect(0, 0, 512, 352);
  drawLogo(lg, 256, 176, 70, shade(color.length === 7 ? color : '#2e2e30', 1.35));
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, 2.0), new THREE.MeshPhysicalMaterial({ map: tex(THREE, lc), metalness: 1, roughness: 0.3 }));
  logo.rotation.y = Math.PI;
  logo.position.z = -0.0145;
  lid.add(logo);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, 2.02), new THREE.MeshPhysicalMaterial({ color: '#030303', roughness: 0.05, clearcoat: 1 }));
  bezel.position.z = 0.0145;
  lid.add(bezel);
  const dc = cnv(1456, 944), dg = dc.getContext('2d', { willReadFrequently: true });
  const dt = tex(THREE, dc);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(2.91, 1.887), new THREE.MeshPhysicalMaterial({ color: '#000', roughness: 0.04, clearcoat: 1, emissive: '#fff', emissiveMap: dt, emissiveIntensity: 1 }));
  disp.position.set(0, -0.03, 0.0152);
  lid.add(disp);
  // notch
  const notch = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.06), new THREE.MeshBasicMaterial({ color: '#000' }));
  notch.position.set(0, 0.92, 0.0156);
  lid.add(notch);
  lid.position.set(0, 1.03, 0);
  hinge.add(lid);
  root.add(hinge);
  root.userData = { hinge, draw: (t, on) => { macDesktop(dg, 1456, 944, t, on); dt.needsUpdate = true; } };
  return root;
}

// Soft contact shadow (for the bright stage).
export function contactShadow(THREE, w, h, opacity = 0.35) {
  const c = cnv(256, 256), g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(THREE, c), transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}
