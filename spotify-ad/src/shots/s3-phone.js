// SHOT 3 · 0:12–0:21 · "Press play."
// Match cut: the record label becomes the green play button (same size, same spot).
// The camera pulls back to reveal a real phone — machined aluminium band, glass, keys,
// camera island — lit by studio strip lights with pink/green rim light. Its Now Playing
// screen is exploded into floating layers (a glossy glass album card, the title strip and
// a 3D play button); the layers collapse with staggered timing, the button is pressed
// (anticipation -> spring), the glyph morphs play->pause, a shockwave and sparks fire,
// and Spotify UI cards float in around the device. Finally the album card lifts off and
// flies into the lens until its flat pink corner fills the frame (cut to Shot 4).

import { C, icon, roundRect } from '../lib/brand.js';
import * as E from '../lib/ease.js';
import { lerp, seg, clamp, rng, TAU, shake } from '../lib/util.js';
import { kText, font, text } from '../lib/type.js';
import { makePhone, slab, roundMask } from '../lib/phone.js';
import { MATCH_PX } from './s2-vinyl.js';

const SW = 950, SH = 2050;          // screen canvas px (1000 px = 1 world unit)
const wx = (px) => (px - SW / 2) / 1000;
const wy = (py) => (SH / 2 - py) / 1000;
const PLAY = { x: 475, y: 1500, r: 95 };
const ART = { x: 75, y: 250, s: 800 };

function cnv(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawBase(g, st) {
  g.reset();
  g.save();
  roundRect(g, 0, 0, SW, SH, 110);
  g.clip();
  const bgG = g.createLinearGradient(0, 0, 0, SH);
  bgG.addColorStop(0, '#B4416C');
  bgG.addColorStop(0.42, '#5A2340');
  bgG.addColorStop(0.75, '#121212');
  bgG.addColorStop(1, '#121212');
  g.fillStyle = bgG;
  g.fillRect(0, 0, SW, SH);
  // status bar with a punch-hole front camera
  text(g, '9:41', 80, 62, 30, 700, '#fff', 'left', 0);
  g.fillStyle = '#fff';
  roundRect(g, 820, 42, 54, 24, 7); g.fill();
  roundRect(g, 760, 46, 40, 18, 4); g.globalAlpha = 0.7; g.fill(); g.globalAlpha = 1;
  g.fillStyle = '#050506'; g.beginPath(); g.arc(SW / 2, 52, 17, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(80,90,120,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(SW / 2, 52, 9, 0, TAU); g.stroke();
  // header
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  icon.chevronDown(g, 80, 140, 36);
  icon.dots(g, 870, 140, 40);
  text(g, 'PLAYING FROM PLAYLIST', SW / 2, 125, 22, 700, 'rgba(255,255,255,0.75)', 'center', 0.1);
  text(g, 'Daily Mix 1', SW / 2, 165, 31, 800, '#fff', 'center', -0.01);
  // soft shadows where the floating layers sit (sells the depth when exploded)
  g.save();
  g.filter = 'blur(28px)';
  g.fillStyle = `rgba(0,0,0,${0.15 + 0.4 * st.ex})`;
  g.fillRect(ART.x + 30, ART.y + 50, ART.s - 60, ART.s - 20);
  g.beginPath(); g.arc(PLAY.x, PLAY.y + 20, PLAY.r, 0, TAU); g.fill();
  g.restore();
  // progress
  const y = 1320;
  g.fillStyle = 'rgba(255,255,255,0.28)';
  roundRect(g, 75, y - 4, 800, 8, 4); g.fill();
  g.fillStyle = '#fff';
  roundRect(g, 75, y - 4, 800 * st.progress, 8, 4); g.fill();
  g.beginPath(); g.arc(75 + 800 * st.progress, y, 15, 0, TAU); g.fill();
  const secs = Math.floor(st.progress * 204);
  text(g, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 75, 1372, 25, 500, C.mute, 'left', 0);
  text(g, '3:24', 875, 1372, 25, 500, C.mute, 'right', 0);
  // transport (the play button itself is a 3D object)
  g.lineWidth = 6;
  g.strokeStyle = C.green; g.fillStyle = C.green;
  icon.shuffle(g, 115, PLAY.y, 62);
  g.beginPath(); g.arc(115, PLAY.y + 46, 6, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  icon.next(g, 290, PLAY.y, 72, -1);
  icon.next(g, 660, PLAY.y, 72, 1);
  icon.repeat(g, 840, PLAY.y, 66);
  g.lineWidth = 4.5;
  g.strokeStyle = C.mute; g.fillStyle = C.mute;
  icon.devices(g, 95, 1690, 52);
  icon.share(g, 770, 1690, 48);
  icon.queue(g, 870, 1690, 48);
  // lyrics card peeking in
  g.fillStyle = '#C2456F';
  roundRect(g, 40, 1790, 870, 400, 28); g.fill();
  text(g, 'Lyrics', 85, 1862, 34, 800, '#fff', 'left', -0.01);
  text(g, 'Every moment', 85, 1945, 56, 900, '#fff', 'left', -0.02);
  text(g, 'has a sound', 85, 2008, 56, 900, `rgba(255,255,255,${0.35 + 0.65 * st.beatLyric})`, 'left', -0.02);
  g.restore();
}

function drawTitles(g) {
  g.clearRect(0, 0, SW, 200);
  text(g, 'Golden Hour', 75, 82, 60, 900, '#fff', 'left', -0.025);
  text(g, 'Neon Arcs', 75, 138, 37, 500, C.mute, 'left', -0.01);
  icon.heartCheck(g, 855, 88, 58, C.green);
}

// Play button face: brand green disc with the glyph printed on it (no transparent overlay).
function drawFace(g, morph, scale) {
  const S = 512;
  g.reset();
  g.fillStyle = C.green;
  g.fillRect(0, 0, S, S);
  g.translate(S / 2, S / 2);
  g.scale(scale, scale);
  g.fillStyle = '#000';
  const A = [[-0.3, -0.4], [0.06, -0.2], [0.06, 0.2], [-0.3, 0.4]];
  const B = [[0.06, -0.2], [0.42, 0], [0.42, 0], [0.06, 0.2]];
  const A2 = [[-0.3, -0.38], [-0.08, -0.38], [-0.08, 0.38], [-0.3, 0.38]];
  const B2 = [[0.08, -0.38], [0.3, -0.38], [0.3, 0.38], [0.08, 0.38]];
  for (const [P, Q] of [[A, A2], [B, B2]]) {
    g.beginPath();
    P.forEach((p, i) => {
      const x = lerp(p[0], Q[i][0], morph) * S * 0.31, y = lerp(p[1], Q[i][1], morph) * S * 0.31;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.closePath();
    g.fill();
  }
}

// Floating Spotify UI card: a glossy dark glass panel with a glowing UI face.
function uiCard(THREE, w, h, draw) {
  const c = cnv(w, h), g = c.getContext('2d', { willReadFrequently: true });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const ww = w / 1000, hh = h / 1000;
  const grp = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), new THREE.MeshPhysicalMaterial({
    color: '#000', emissive: '#fff', emissiveMap: t, emissiveIntensity: 1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04,
    envMapIntensity: 0.6, alphaMap: roundMask(THREE, w / 4, h / 4, 7), transparent: true, depthWrite: false,
  }));
  const edge = new THREE.Mesh(slab(THREE, ww + 0.006, hh + 0.006, 0.03, 0.012, 0.004), new THREE.MeshPhysicalMaterial({ color: '#2a2b30', metalness: 0.8, roughness: 0.25, transparent: true }));
  edge.position.z = -0.008;
  grp.add(edge, face);
  grp.userData = { g, t, draw, mats: [face.material, edge.material] };
  return grp;
}

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envStudio;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.01, 100);
  const shot = { name: 'S3 Phone', start: 12, end: 21, scene, camera, useBg: true };

  const tex = (c, srgb = true) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const baseC = cnv(SW, SH), baseG = baseC.getContext('2d', { willReadFrequently: true });
  const baseT = tex(baseC);
  const ph = makePhone(THREE, env.RoundedBox, { screen: baseT, envMap: env.envStudio });
  const phone = ph.root;
  scene.add(phone);
  const DZ = ph.displayZ;

  // album art as a glossy glass card
  const artC = cnv(1024, 1024), artG = artC.getContext('2d');
  artG.drawImage(env.heroArt, 0, 0);
  const artT = tex(artC);
  const artGeo = slab(THREE, ART.s / 1000, ART.s / 1000, 0.026, 0.012, 0.004, 4, 16);
  const auv = artGeo.attributes.uv, apos = artGeo.attributes.position;
  for (let i = 0; i < auv.count; i++) auv.setXY(i, 0.5 + apos.getX(i) / (ART.s / 1000), 0.5 + apos.getY(i) / (ART.s / 1000));
  const artMat = new THREE.MeshPhysicalMaterial({
    map: artT, emissive: '#ffffff', emissiveMap: artT, emissiveIntensity: 0.45, roughness: 0.16,
    clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.7,
  });
  const art = new THREE.Mesh(artGeo, artMat);
  phone.add(art);
  const artHome = new THREE.Vector3(wx(ART.x + ART.s / 2), wy(ART.y + ART.s / 2), 0);

  const titC = cnv(SW, 200), titG = titC.getContext('2d');
  drawTitles(titG);
  const titles = new THREE.Mesh(new THREE.PlaneGeometry(SW / 1000, 0.2), new THREE.MeshBasicMaterial({ map: tex(titC), transparent: true }));
  titles.position.set(0, wy(1120 + 100), 0);
  phone.add(titles);

  // 3D play button: glossy green body, printed face
  const playG = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAY.r / 1000, PLAY.r / 1000, 0.03, 96, 1, true).rotateX(Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: C.greenDeep, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide })
  );
  const faceC = cnv(512, 512), faceG = faceC.getContext('2d', { willReadFrequently: true });
  const faceT = tex(faceC);
  const face = new THREE.Mesh(new THREE.CircleGeometry(PLAY.r / 1000, 96), new THREE.MeshBasicMaterial({ map: faceT }));
  face.position.z = 0.0151;
  playG.add(body, face);
  phone.add(playG);
  const playHome = new THREE.Vector3(wx(PLAY.x), wy(PLAY.y), 0);

  // shockwave + sparks
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 96), new THREE.MeshBasicMaterial({ color: C.green, transparent: true, depthWrite: false }));
  phone.add(ring);
  const PN = 30, pr = rng(21);
  const parts = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), PN);
  const pal = [C.green, C.pink, C.lime, C.yellow, '#ffffff'].map((h) => new THREE.Color(h).multiplyScalar(1.6));
  const pdat = Array.from({ length: PN }, (_, i) => ({
    a: pr() * TAU, s: 0.45 + pr() * 0.9, z: 0.1 + pr() * 0.6, r: 0.007 + pr() * 0.012, c: pal[i % pal.length], d: pr() * 0.05,
  }));
  pdat.forEach((p, i) => parts.setColorAt(i, p.c));
  phone.add(parts);

  // supporting UI cards floating around the device
  const cards = [
    uiCard(THREE, 560, 120, (g, t) => {
      g.reset(); g.fillStyle = '#1f1f22'; g.fillRect(0, 0, 560, 120);
      icon.heartCheck(g, 60, 60, 54, C.green);
      text(g, 'Added to Liked Songs', 108, 72, 34, 700, '#fff', 'left', -0.01);
    }),
    uiCard(THREE, 500, 150, (g, t) => {
      g.reset(); g.fillStyle = '#1f1f22'; g.fillRect(0, 0, 500, 150);
      g.strokeStyle = C.green; g.lineWidth = 5;
      g.beginPath(); g.roundRect(30, 36, 56, 78, 10); g.stroke();
      g.beginPath(); g.arc(58, 88, 14, 0, TAU); g.stroke();
      text(g, 'Listening on', 110, 66, 26, 500, C.mute, 'left', 0);
      text(g, 'Living Room', 110, 106, 34, 800, C.green, 'left', -0.01);
    }),
    uiCard(THREE, 360, 140, (g, t) => {
      g.reset(); g.fillStyle = '#1f1f22'; g.fillRect(0, 0, 360, 140);
      g.fillStyle = C.green;
      for (let i = 0; i < 5; i++) { const h = 20 + 60 * Math.abs(Math.sin(t * 7 + i * 1.3)); g.beginPath(); g.roundRect(30 + i * 22, 70 - h / 2, 12, h, 6); g.fill(); }
      text(g, 'Now playing', 160, 64, 26, 500, C.mute, 'left', 0);
      text(g, 'Golden Hour', 160, 102, 32, 800, '#fff', 'left', -0.01);
    }),
  ];
  const cardHome = [[-1.02, -0.62, 0.55, 0.2], [1.12, 0.62, -0.1, -0.22], [1.0, -0.82, 0.42, -0.14]];
  cards.forEach((c) => scene.add(c));

  // floating, pre-blurred covers far behind (fake depth of field + parallax)
  const fr = rng(4);
  const floaters = env.covers.slice(0, 9).map((cv) => {
    const c = cnv(256, 256), g = c.getContext('2d');
    g.filter = 'blur(7px)';
    g.drawImage(cv, 8, 8, 240, 240);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, opacity: 0.55, depthWrite: false }));
    m.userData = { x: (fr() - 0.5) * 9, y: (fr() - 0.5) * 4.5, z: -2.5 - fr() * 4, ph: fr() * TAU };
    scene.add(m);
    return m;
  });

  // lighting: studio strips (environment) + key + coloured rims that trace the band
  scene.add(new THREE.AmbientLight('#ffffff', 0.12));
  const key = new THREE.DirectionalLight('#fff3ea', 1.3);
  key.position.set(-2.5, 3.5, 4);
  const rimPink = new THREE.DirectionalLight('#ff6fa8', 2.4);
  rimPink.position.set(4, 1.5, -3);
  const rimGreen = new THREE.DirectionalLight('#3cf08a', 1.6);
  rimGreen.position.set(-4, -1, -2.5);
  scene.add(key, rimPink, rimGreen);

  const T = new THREE.Vector3(), tmp = new THREE.Vector3();
  const logLerp = (a, b, p) => Math.exp(lerp(Math.log(a), Math.log(b), p));
  const dMatch = (2 * PLAY.r / 1000 * H) / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * MATCH_PX);
  const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  const pinkLin = new THREE.Color('#ffffff'), black = new THREE.Color('#000000');

  shot.update = (lt, t) => {
    const PRESS = 3.95, REL = 4.1;
    // ---- explode amounts per layer (staggered collapse = overlapping action) ----
    const exArt = 1 - seg(lt, 2.2, 2.95, E.inOutExpo);
    const exTit = 1 - seg(lt, 2.32, 3.07, E.inOutExpo);
    const exPlay = 1 - seg(lt, 2.44, 3.19, E.inOutExpo);
    const land = E.kick(lt - 3.0, 0.03, 9) * 0.01;

    phone.position.set(0, 0.025 * Math.sin(lt * 1.2), 0);
    phone.rotation.set(0.04 * Math.sin(lt * 0.9), 0.1 * Math.sin(lt * 0.6), 0);
    phone.scale.setScalar(1 + land);
    scene.environmentRotation.set(0, lerp(-0.7, 0.8, seg(lt, 0, 9, E.inOutSine)), 0);
    ph.dispMat.envMapRotation.copy(scene.environmentRotation);

    // ---- play button: press, anticipation, spring ----
    const pressIn = seg(lt, PRESS, REL, E.inQuad);
    const release = lt >= REL ? E.spring(lt - REL, 3.2, 0.28) : 0;
    const btnScale = 1 - 0.14 * pressIn + 0.14 * release;
    const depthS = lerp(0.25, 1, exPlay);
    body.scale.set(btnScale, btnScale, depthS * (1 - 0.4 * pressIn + 0.4 * release));
    face.scale.setScalar(btnScale);
    face.position.z = 0.015 * depthS * (1 - 0.4 * pressIn + 0.4 * release) + 0.0004;
    playG.position.set(playHome.x, playHome.y, DZ + 0.015 * depthS + 0.42 * exPlay - 0.01 * pressIn + 0.01 * release);
    drawFace(faceG, seg(lt, REL, REL + 0.28, E.inOutCubic), E.outBack(2.2)(seg(lt, 0.12, 0.55)));
    faceT.needsUpdate = true;

    titles.position.z = DZ + 0.002 + 0.2 * exTit;
    const beat = lt > REL ? E.kick(((lt - REL) % 0.5)) : 0;

    // ---- art: layer -> collapse -> lifts off and flies into the lens ----
    const fly = seg(lt, 6.95, 8.95, E.inOutExpo);
    const artLocal = new THREE.Vector3(artHome.x, artHome.y, DZ + 0.007 + 0.3 * exArt + 0.25 * seg(lt, 6.5, 7.2, E.outCubic));
    const artS = 1 + beat * 0.02 * (1 - fly);
    // as it nears the lens the glossy card hands over to flat, exact artwork colour
    const flat = seg(fly, 0.45, 0.85);
    artMat.color.copy(pinkLin).lerp(black, flat);
    artMat.emissiveIntensity = lerp(0.45, 1, flat);
    artMat.envMapIntensity = 0.7 * (1 - flat);
    artMat.clearcoat = 1 - flat;
    artMat.specularIntensity = 1 - flat;
    phone.updateMatrixWorld(true);

    // ---- base UI (on the display) ----
    const progress = lt < REL ? 0.35 : 0.35 + (lt - REL) / 204;
    drawBase(baseG, { ex: Math.max(exArt, exPlay), progress, beatLyric: seg(lt, REL + 0.3, REL + 0.9) });
    baseT.needsUpdate = true;

    // ---- shockwave + sparks ----
    const sw = lt - REL;
    ring.visible = sw > 0 && sw < 0.9;
    if (ring.visible) {
      const p = E.outCubic(sw / 0.9);
      ring.scale.setScalar(lerp(0.1, 0.95, p));
      ring.material.opacity = 0.9 * (1 - p);
      ring.position.set(playHome.x, playHome.y, DZ + 0.03);
    }
    parts.visible = sw > 0 && sw < 1.3;
    if (parts.visible) {
      const d = new THREE.Object3D();
      pdat.forEach((p, i) => {
        const tt = Math.max(0, sw - p.d);
        const travel = (1 - Math.exp(-3.2 * tt)) / 3.2;
        d.position.set(playHome.x + Math.cos(p.a) * p.s * travel, playHome.y + Math.sin(p.a) * p.s * travel - 0.06 * tt * tt, DZ + 0.04 + p.z * travel);
        d.scale.setScalar(p.r * clamp(1 - tt / 1.2) * (tt > 0 ? 1 : 0));
        d.updateMatrix();
        parts.setMatrixAt(i, d.matrix);
      });
      parts.instanceMatrix.needsUpdate = true;
    }

    // ---- supporting cards: spring in after the press, leave before the fly ----
    cards.forEach((c, i) => {
      const inP = E.spring(lt - (REL + 0.35 + i * 0.18), 1.6, 0.5);
      const outP = seg(lt, 6.3 + i * 0.08, 6.8 + i * 0.08, E.inCubic);
      const a = clamp(inP * 1.2) * (1 - outP);
      const [hx, hy, hz, ry] = cardHome[i];
      c.position.set(hx + 0.05 * Math.sin(lt * 0.7 + i), hy + 0.04 * Math.sin(lt * 0.9 + i * 2) - (1 - clamp(inP)) * 0.25, hz + outP * 0.6);
      c.rotation.set(0.05 * Math.sin(lt * 0.6 + i), ry + 0.06 * Math.sin(lt * 0.5 + i), 0);
      c.scale.setScalar(Math.max(0.001, 1.65 * lerp(0.85, 1, clamp(inP))));
      c.visible = a > 0.002;
      c.userData.mats.forEach((m) => (m.opacity = a));
      if (c.visible) { c.userData.draw(c.userData.g, t); c.userData.t.needsUpdate = true; }
    });

    // ---- camera ----
    const pA = seg(lt, 0.25, 2.9, E.swoop);
    const pB = seg(lt, 4.5, 6.8, E.inOutCubic);
    const btnWorld = new THREE.Vector3(playHome.x, playHome.y, DZ + 0.03 + 0.42);
    let target = [lerp(btnWorld.x, -0.55, pA), lerp(btnWorld.y, 0.02, pA), lerp(btnWorld.z, 0, pA)];
    let d = logLerp(dMatch, 3.75, pA);
    let az = lerp(0, -0.5, pA), el = lerp(0, 0.1, pA);
    target = [lerp(target[0], 0.55, pB), target[1], target[2]];
    az = lerp(az, 0.45, pB);
    el = lerp(el, -0.04, pB);
    d = lerp(d, 3.55, pB);
    const [sx, sy] = shake(lt, E.kick(lt - REL, 0.02, 10) * 0.012, 3);
    T.set(target[0] + sx, target[1] + sy, target[2]);
    camera.position.set(T.x + d * Math.sin(az) * Math.cos(el), T.y + d * Math.sin(el), T.z + d * Math.cos(az) * Math.cos(el));
    camera.up.set(0, 1, 0);
    camera.lookAt(T);
    camera.updateMatrixWorld(true);

    // art pose: blend from its place on the phone to a pose locked to the lens
    tmp.copy(artLocal).applyMatrix4(phone.matrixWorld);
    phone.getWorldQuaternion(qA);
    const SIZE = 5.2; // final art scale: only the flat pink corner fills the frame
    const fin = new THREE.Vector3((0.5 - 0.12) * 0.8 * SIZE, (0.5 - 0.28) * 0.8 * SIZE, -0.5).applyMatrix4(camera.matrixWorld);
    camera.getWorldQuaternion(qB);
    const worldPos = tmp.clone().lerp(fin, fly);
    worldPos.addScaledVector(new THREE.Vector3(0, 1, 0), Math.sin(Math.PI * fly) * 0.35); // arc
    const q = qA.clone().slerp(qB, E.inOutCubic(seg(lt, 6.95, 8.7)));
    const sc = lerp(artS, SIZE, Math.pow(fly, 2.2));
    m4.compose(worldPos, q, new THREE.Vector3(sc, sc, sc));
    m4.premultiply(new THREE.Matrix4().copy(phone.matrixWorld).invert());
    m4.decompose(art.position, art.quaternion, art.scale);

    floaters.forEach((m) => {
      const u = m.userData;
      m.position.set(u.x + 0.15 * Math.sin(lt * 0.4 + u.ph), u.y + 0.12 * Math.sin(lt * 0.5 + u.ph * 2), u.z);
      m.rotation.set(0.2 * Math.sin(u.ph), 0.3 * Math.sin(lt * 0.3 + u.ph), 0.1 * Math.sin(u.ph * 3));
      m.material.opacity = 0.5 * seg(lt, 0.6, 2.0);
    });

    // ---- background ----
    const g = env.bg;
    g.fillStyle = C.ink;
    g.fillRect(0, 0, W, H);
    const blob = (x, y, r, col, a) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col.replace('A', a));
      gr.addColorStop(1, col.replace('A', 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    };
    const energy = 0.6 + 0.4 * seg(lt, REL, REL + 0.6) + beat * 0.25;
    blob(W * (0.7 + 0.08 * Math.sin(lt * 0.4)), H * 0.35, 900, 'rgba(245,115,160,A)', 0.22 * energy);
    blob(W * (0.25 + 0.06 * Math.sin(lt * 0.5 + 2)), H * 0.75, 800, 'rgba(255,100,55,A)', 0.14 * energy);
    blob(W * 0.5, H * 0.5, 1100, 'rgba(175,40,150,A)', 0.1 * energy);

    // ---- type ----
    kText(env.fg, 'Press play.', {
      x: 120, y: 590, size: 176, t: lt - 2.95, dur: 0.85, stagger: 0.04, out: lt - 4.7, outStagger: 0.025,
      colorAt: (i) => (i === 10 ? C.green : null),
    });

    const zb = seg(lt, 8.45, 9.0, E.inQuad) * 0.22;
    return {
      bloom: [0.38, 0.5, 0.88],
      flash: E.kick(lt - REL, 0.02, 9) * 0.06,
      flashColor: [0.12, 0.84, 0.38],
      zoomBlur: zb,
      ca: 0.0012 + zb * 0.01 + E.kick(lt - REL, 0.02, 8) * 0.003,
    };
  };
  return shot;
}
