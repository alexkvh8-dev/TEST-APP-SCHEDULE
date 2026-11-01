// SHOT 4 · 0:21–0:33 · "For every mood."
// Spotify-style duotone cards. Each mood gets a colour pair, a giant word, an outline
// marquee and a glossy 3D object with its own personality (bounce / snap / wobble /
// rock). Each object flies into the lens while a circle of the next colour opens from
// it — the object "carries" the next scene in. The summary deals the four mood mixes out
// as playlist covers, landing on the exact screen rects of Shot 5's hero tiles, so the
// cut into the 3D library wall is invisible.

import { C, drawSpotifyIcon } from '../lib/brand.js';
import * as E from '../lib/ease.js';
import { lerp, seg, clamp, TAU, rng } from '../lib/util.js';
import { kText, font, measure } from '../lib/type.js';

const CARD = 2.6;
const CARDS = [
  { word: 'HYPE', label: 'Your Hype Mix', bg: C.pink, ink: '#3D0A1E', obj: 'bolt', col: C.blue, t0: 21.0 },
  { word: 'FOCUS', label: 'Deep Focus', bg: C.blue, ink: C.lime, obj: 'cube', col: C.lime, t0: 23.6 },
  { word: 'CHILL', label: 'Chill Vibes', bg: C.lime, ink: C.navy, obj: 'blob', col: C.navy, t0: 26.2 },
  { word: 'LATE\nNIGHT', label: 'Late Night Drive', bg: C.navy, ink: C.yellow, obj: 'moon', col: C.yellow, t0: 28.8 },
];
const SUM_T0 = 31.4;

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envMap;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  camera.position.set(0, 0, 8);
  const shot = { name: 'S4 Moods', start: 21, end: 33, scene, camera, useBg: true };

  scene.add(new THREE.AmbientLight('#ffffff', 0.35));
  const key = new THREE.DirectionalLight('#ffffff', 2.0);
  key.position.set(-3, 4, 6);
  const fill = new THREE.DirectionalLight('#ffffff', 0.6);
  fill.position.set(4, -2, 3);
  scene.add(key, fill);

  const gloss = (col) => new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.85 });
  const extrude = (shape, depth) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4, curveSegments: 48 });
    g.center();
    return g;
  };

  // --- HYPE: lightning bolt ---
  const boltS = new THREE.Shape();
  [[0.2, 1.05], [-0.62, -0.08], [-0.06, -0.08], [-0.28, -1.05], [0.66, 0.2], [0.08, 0.2]].forEach(([x, y], i) => (i ? boltS.lineTo(x, y) : boltS.moveTo(x, y)));
  boltS.closePath();
  const bolt = new THREE.Mesh(extrude(boltS, 0.34), gloss(C.blue));

  // --- FOCUS: rounded cube + gyroscope ring ---
  const cube = new THREE.Group();
  cube.add(new THREE.Mesh(new env.RoundedBox(1.25, 1.25, 1.25, 8, 0.16), gloss(C.lime)));
  const gyro = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.035, 16, 160), gloss(C.lime));
  cube.add(gyro);

  // --- CHILL: blob (sphere displaced on the CPU, normals recomputed) ---
  const blobGeo = new THREE.SphereGeometry(1, 128, 96);
  const blobBase = blobGeo.attributes.position.array.slice();
  const blob = new THREE.Mesh(blobGeo, gloss(C.navy));

  // --- LATE NIGHT: crescent moon + stars ---
  const moonS = new THREE.Shape();
  moonS.moveTo(0.139, 0.9906);
  moonS.absarc(0, 0, 1, 1.431, -0.4664, false);
  moonS.absarc(0.42, 0.22, 0.82, -0.9558, 1.9204, true);
  const moon = new THREE.Group();
  const moonMesh = new THREE.Mesh(extrude(moonS, 0.32), gloss(C.yellow));
  moon.add(moonMesh);
  const starS = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 0.055 : 0.2, a = (i / 8) * TAU + Math.PI / 2;
    i ? starS.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starS.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  starS.closePath();
  const starGeo = extrude(starS, 0.06);
  const sr = rng(8);
  const stars = Array.from({ length: 7 }, (_, i) => {
    const m = new THREE.Mesh(starGeo, gloss('#FFFFFF'));
    m.userData = { x: (sr() - 0.5) * 3.2, y: (sr() - 0.5) * 2.6, z: sr() * 0.8, s: 0.5 + sr() * 0.7, ph: sr() };
    moon.add(m);
    return m;
  });

  const objs = { bolt, cube, blob, moon };
  Object.values(objs).forEach((o) => { o.visible = false; scene.add(o); });
  const HOME = new THREE.Vector3(2.05, -0.05, 0);

  function idle(c, o, lc) {
    o.rotation.set(0, 0, 0);
    o.scale.setScalar(1);
    if (c.obj === 'bolt') {
      const ph = (lc % 0.5) / 0.5;
      const hgt = 4 * ph * (1 - ph);                 // parabola per beat
      const contact = Math.exp(-ph * 14) + Math.exp(-(1 - ph) * 14);
      o.position.y += hgt * 0.5 - 0.25;
      const sy = 1 - 0.22 * contact + 0.08 * hgt, sx = 1 + 0.16 * contact - 0.04 * hgt;
      o.scale.set(sx, sy, sx);
      o.rotation.set(0, lc * 1.8, -0.22);
    } else if (c.obj === 'cube') {
      const k = Math.floor(lc / 0.5);
      const e = E.inOutExpo(clamp(((lc % 0.5) / 0.5) / 0.7));
      const xs = Math.floor((k + 1) / 2) + (k % 2 === 1 ? e : 0);
      const ys = Math.floor(k / 2) + (k % 2 === 0 ? e : 0);
      o.children[0].rotation.set(xs * Math.PI / 2 + 0.5, ys * Math.PI / 2 + 0.6, 0);
      o.children[0].scale.setScalar(1 + 0.05 * E.kick((lc % 0.5) - 0.33, 0.03, 9));
      gyro.rotation.set(1.1 + lc * 0.8, lc * 1.3, 0.3);
    } else if (c.obj === 'blob') {
      const pos = blobGeo.attributes.position.array;
      const tt = lc * 1.6;
      for (let i = 0; i < pos.length; i += 3) {
        const x = blobBase[i], y = blobBase[i + 1], z = blobBase[i + 2];
        const d = 1 + 0.13 * Math.sin(2.6 * x + tt) * Math.sin(2.3 * y + tt * 1.3) * Math.sin(2.1 * z + tt * 0.7)
          + 0.06 * Math.sin(5.1 * y - tt * 1.7 + x * 2.0);
        pos[i] = x * d; pos[i + 1] = y * d; pos[i + 2] = z * d;
      }
      blobGeo.attributes.position.needsUpdate = true;
      blobGeo.computeVertexNormals();
      o.position.y += 0.12 * Math.sin(lc * 2.2);
      o.rotation.set(0.3, lc * 0.6, 0.1);
    } else if (c.obj === 'moon') {
      o.position.y += 0.1 * Math.sin(lc * 2);
      moonMesh.rotation.set(0.15, -0.35 + 0.2 * Math.sin(lc * 1.4), 0.3 + 0.18 * Math.sin(lc * 1.7));
      stars.forEach((s, i) => {
        const u = s.userData;
        const tw = 0.6 + 0.4 * Math.sin(lc * 6 + u.ph * TAU);
        const appear = E.outBack(2)(seg(lc, 0.25 + i * 0.07, 0.6 + i * 0.07));
        s.position.set(u.x, u.y, u.z);
        s.scale.setScalar(u.s * tw * appear);
        s.rotation.z = lc * 1.5 + u.ph * 6;
      });
    }
  }

  function marquee(g, word, ink, lc, alpha) {
    const str = (word.replace('\n', ' ') + '  •  ').repeat(6);
    g.save();
    g.font = font(250, 900);
    g.letterSpacing = '-6px';
    g.strokeStyle = ink;
    g.lineWidth = 3;
    g.globalAlpha = alpha * 0.2;
    const w = g.measureText(word.replace('\n', ' ') + '  •  ').width;
    [170, 545, 920].forEach((y, r) => {
      const dir = r % 2 ? 1 : -1;
      const off = ((lc * 160 * dir + r * 333) % w + w) % w;
      g.strokeText(str, -off, y + 90);
    });
    g.restore();
  }

  function wordBlock(f, c, lc) {
    const lines = c.word.split('\n');
    const size = lines.length > 1 ? 250 : Math.min(320, (1000 / measure(f, lines[0], 100)) * 100);
    const lh = size * 0.86;
    const y0 = 560 + (lines.length > 1 ? -lh * 0.32 : size * 0.33);
    const top = y0 - size * 0.74;
    // label with the small icon
    const la = seg(lc, 0.25, 0.6, E.outCubic) * (1 - seg(lc, 2.0, 2.25));
    f.save();
    f.globalAlpha = la;
    drawSpotifyIcon(f, 140, top - 62 + (1 - la) * 20, 22, { discColor: c.ink, arcColor: c.bg });
    f.font = font(42, 800);
    f.letterSpacing = '-0.5px';
    f.fillStyle = c.ink;
    f.fillText(c.label, 176, top - 47 + (1 - la) * 20);
    f.restore();
    lines.forEach((ln, i) => {
      kText(f, ln, {
        x: 116, y: y0 + i * lh, size, color: c.ink, mode: 'pop', ease: E.outBack(2.2), dur: 0.5, stagger: 0.05,
        t: lc - 0.1 - i * 0.12, out: lc - 2.0, outDur: 0.3, outStagger: 0.025, outEase: E.inBack(1.5), mask: false, tracking: -0.04,
      });
    });
  }

  // The four mixes are dealt out as covers onto Shot 5's hero tiles (projected through
  // Shot 5's opening camera). Each starts as a chip of its mood colour, rises into place on
  // a soft spring and "prints" its artwork; everything is settled well before the cut.
  const SUM_FX = { bloom: [0.32, 0.45, 0.88], vignette: 0.32 }; // = Shot 5's first frame
  function summary(g, f, t) {
    const ls = t - SUM_T0;
    const lib = env.shared.library;
    kText(f, 'For every mood.', {
      x: W / 2, y: 290, size: 120, align: 'center', t: ls - 0.08, stagger: 0.03, out: ls - 1.0, outStagger: 0.012, outDur: 0.35,
      colorAt: (i) => (i === 14 ? C.green : null),
    });
    lib.heroRects.forEach(([x, y, w, h], i) => {
      const ts = 0.12 + i * 0.07;
      const p = seg(ls, ts, ts + 0.62);
      if (p <= 0) return;
      const rise = E.outBack(1.25)(p);
      const grow = E.outCubic(seg(ls, ts, ts + 0.42));
      const cx = x + w / 2, cy = y + h / 2 + (1 - rise) * 170;
      // a pill that widens into the square tile
      const tw = w * lerp(0.42, 1, grow), th = h * lerp(0.18, 1, E.outCubic(seg(ls, ts + 0.04, ts + 0.5)));
      const rad = lerp(Math.min(tw, th) / 2, w * lib.radius, E.inOutSine(seg(ls, ts + 0.1, ts + 0.55)));
      const art = E.inOutSine(seg(ls, ts + 0.22, ts + 0.72));
      g.save();
      g.beginPath();
      g.roundRect(cx - tw / 2, cy - th / 2, tw, th, rad);
      g.clip();
      g.fillStyle = CARDS[i].bg;
      g.fillRect(cx - tw / 2, cy - th / 2, tw, th);
      if (art > 0) {
        g.globalAlpha = art;
        g.drawImage(lib.heroCanvases[i], cx - w / 2, cy - h / 2, w, h);
      }
      g.restore();
    });
  }

  shot.update = (lt, t) => {
    const g = env.bg, f = env.fg;
    let fx = { bloom: [0.3, 0.4, 0.92], vignette: 0.22 };
    Object.values(objs).forEach((o) => (o.visible = false));
    camera.position.set(0.08 * Math.sin(lt * 0.7), 0.05 * Math.sin(lt * 0.9), 8);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    // which card is on screen (summary after the last)
    const ci = CARDS.findIndex((c) => t >= c.t0 && t < c.t0 + CARD);
    if (ci < 0) {
      g.fillStyle = C.ink;
      g.fillRect(0, 0, W, H);
      summary(g, f, t);
      return { ...SUM_FX };
    }
    const c = CARDS[ci], lc = t - c.t0;
    const next = CARDS[ci + 1] ? CARDS[ci + 1].bg : C.ink;

    g.fillStyle = c.bg;
    g.fillRect(0, 0, W, H);
    marquee(g, c.word, c.ink, lc, seg(lc, 0, 0.4) * (1 - seg(lc, 2.0, 2.3)));

    // 3D object: spring in, idle, then fly through the lens
    const o = objs[c.obj];
    o.visible = true;
    o.position.copy(HOME);
    idle(c, o, lc);
    const enter = E.spring(lc - 0.04, 1.9, 0.42);
    const exitP = seg(lc, 2.1, 2.6, E.inExpo);
    o.scale.multiplyScalar(Math.max(0.0001, enter));
    o.rotation.y += (1 - clamp(enter)) * 2.5;
    o.position.x = lerp(o.position.x, 0.3, exitP);
    o.position.y = lerp(o.position.y, 0, exitP);
    o.position.z = lerp(0, 7.3, exitP);
    o.rotation.z += exitP * 1.2;

    wordBlock(f, c, lc);

    // circle wipe of the next colour, born where the object is on screen
    const sp = env.project(o.position, camera);
    const wp = seg(lc, 2.24, 2.6, E.inCubic);
    if (wp > 0) {
      g.fillStyle = next;
      g.beginPath();
      g.arc(sp[0], sp[1], wp * 2300, 0, TAU);
      g.fill();
    }
    // first card: inherit the zoom blur from Shot 3's art fly-in
    if (ci === 0) {
      const zb = (1 - seg(lc, 0, 0.45, E.outQuad)) * 0.22;
      fx = { ...fx, zoomBlur: zb };
    }
    fx.zoomBlur = (fx.zoomBlur || 0) + exitP * 0.12;
    fx.zoomCenter = [sp[0] / W, 1 - sp[1] / H];
    return fx;
  };
  return shot;
}
