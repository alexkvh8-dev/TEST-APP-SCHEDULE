// SHOT 2 · 0:05–0:12 · "Find yours."
// Opens inside the green label (colour match from Shot 1), whips back on a log-distance
// dolly to reveal a spinning record with real anisotropic groove highlights. A fan of
// coloured records springs in behind it, flies out, then the hero record flips and
// settles face-on with its label exactly where Shot 3's play button will be.

import { C } from '../lib/brand.js';
import * as E from '../lib/ease.js';
import { lerp, seg, clamp, rng, TAU } from '../lib/util.js';
import { kText, font } from '../lib/type.js';

export const LABEL_R = 0.34;
export const MATCH_PX = 300; // label diameter on screen at the cut (Shot 3 matches it)

function grooveMaps(THREE, N = 1024) {
  const aniso = new Uint8Array(N * N * 4);
  const rough = new Uint8Array(N * N * 4);
  const r = rng(11);
  const ringNoise = Array.from({ length: 400 }, () => r());
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const dx = (i + 0.5) / N - 0.5, dy = (j + 0.5) / N - 0.5;
      const rad = Math.hypot(dx, dy) * 2;
      const k = (j * N + i) * 4;
      const tx = -dy / (rad || 1), ty = dx / (rad || 1);
      const inGrooves = rad > 0.355 && rad < 0.975;
      aniso[k] = (tx * 0.5 + 0.5) * 255;
      aniso[k + 1] = (ty * 0.5 + 0.5) * 255;
      aniso[k + 2] = inGrooves ? 255 : 30;
      aniso[k + 3] = 255;
      // track gaps are smoother (shinier) rings; grooves get micro variation per ring
      const gap = [0.5, 0.62, 0.73, 0.84, 0.93].some((g) => Math.abs(rad - g) < 0.006);
      const n = ringNoise[Math.floor(rad * 399)] || 0;
      let ro = inGrooves ? 0.3 + n * 0.12 : 0.22;
      if (gap) ro = 0.08;
      rough[k] = rough[k + 1] = rough[k + 2] = ro * 255;
      rough[k + 3] = 255;
    }
  }
  const mk = (data) => {
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.colorSpace = THREE.NoColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  };
  return { aniso: mk(aniso), rough: mk(rough) };
}

function heroLabel(THREE) {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = C.green;
  g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, TAU); g.fill();
  const ink = '#0B5A2A';
  // circular ring text
  const str = 'EVERY MOMENT HAS A SOUND  •  SIDE A  •  33⅓ RPM  •  STEREO  •  ';
  g.font = font(40, 900);
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const total = [...str].reduce((a, ch) => a + g.measureText(ch).width + 6, 0);
  let a = -Math.PI / 2 + 0.6;
  for (const ch of str) {
    const w = g.measureText(ch).width + 6;
    a += (w / total) * TAU * 0.5;
    g.save();
    g.translate(S / 2 + Math.cos(a) * 430, S / 2 + Math.sin(a) * 430);
    g.rotate(a + Math.PI / 2);
    g.fillText(ch, 0, 0);
    g.restore();
    a += (w / total) * TAU * 0.5;
  }
  g.strokeStyle = ink;
  g.lineWidth = 3;
  g.beginPath(); g.arc(S / 2, S / 2, 392, 0, TAU); g.stroke();
  g.font = font(64, 900);
  g.fillText('NEON ARCS', S / 2, S / 2 - 180);
  g.font = font(40, 700);
  g.fillText('GOLDEN HOUR', S / 2, S / 2 + 175);
  g.fillStyle = '#050505';
  g.beginPath(); g.arc(S / 2, S / 2, 30, 0, TAU); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function smallLabel(THREE, color) {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#F2F2F2';
  g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, TAU); g.fill();
  g.fillStyle = color;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.36, 0, TAU); g.fill();
  g.fillStyle = '#050505';
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.06, 0, TAU); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envMap;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.01, 100);
  const shot = { name: 'S2 Vinyl', start: 5, end: 12, scene, camera, useBg: true };

  const maps = grooveMaps(THREE);
  const faceGeo = new THREE.CircleGeometry(1, 256);
  const edgeGeo = new THREE.CylinderGeometry(1, 1, 0.014, 256, 1, true).rotateX(Math.PI / 2);
  const labelGeo = new THREE.CircleGeometry(1, 128);

  function makeRecord(color, label, labelR, aniso = 1, envI = 1.25, coat = 0.5) {
    const mat = new THREE.MeshPhysicalMaterial({
      color, roughness: 1, roughnessMap: maps.rough, metalness: 0,
      anisotropy: aniso, anisotropyMap: maps.aniso, clearcoat: coat, clearcoatRoughness: 0.3,
      envMapIntensity: envI,
    });
    const g = new THREE.Group();
    const front = new THREE.Mesh(faceGeo, mat);
    front.position.z = 0.007;
    const back = new THREE.Mesh(faceGeo, mat);
    back.position.z = -0.007;
    back.rotation.y = Math.PI;
    const edge = new THREE.Mesh(edgeGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
    const lm = new THREE.MeshBasicMaterial({ map: label });
    const lf = new THREE.Mesh(labelGeo, lm);
    lf.scale.setScalar(labelR);
    lf.position.z = 0.0085;
    const lb = lf.clone();
    lb.position.z = -0.0085;
    lb.rotation.y = Math.PI;
    const spin = new THREE.Group();
    spin.add(front, back, edge, lf, lb);
    g.add(spin);
    g.userData.spin = spin;
    return g;
  }

  const hero = makeRecord('#0b0b0b', heroLabel(THREE), LABEL_R);
  scene.add(hero);

  const fanColors = [C.pink, C.blue, C.lime, C.orange, C.purple];
  const fan = fanColors.map((col, i) => {
    const rec = makeRecord(col, smallLabel(THREE, C.ink), 0.3, 0.3, 0.28, 0);
    scene.add(rec);
    return rec;
  });

  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-3, 4, 5);
  const rim = new THREE.PointLight(C.green, 18, 12, 2);
  rim.position.set(2.5, 1.5, -2);
  scene.add(key, rim, new THREE.AmbientLight('#ffffff', 0.15));

  // Floating dust for depth.
  const dustN = 260, rnd = rng(5);
  const dustBase = new Float32Array(dustN * 3), dustVel = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustBase.set([(rnd() - 0.5) * 10, (rnd() - 0.5) * 6, (rnd() - 0.5) * 8 - 1], i * 3);
    dustVel.set([(rnd() - 0.5) * 0.08, 0.05 + rnd() * 0.08, (rnd() - 0.5) * 0.05], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dustN * 3), 3));
  const dc = document.createElement('canvas');
  dc.width = dc.height = 64;
  const dg = dc.getContext('2d');
  const grad = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  dg.fillStyle = grad;
  dg.fillRect(0, 0, 64, 64);
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.035, map: new THREE.CanvasTexture(dc), transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending, color: '#cfeedd',
  }));
  scene.add(dust);

  // Camera rig: spherical coordinates around a moving target, distance on a log scale
  // so zooms feel uniform in speed.
  const T = new THREE.Vector3();
  function rig(target, d, az, el, roll) {
    T.set(...target);
    camera.position.set(
      T.x + d * Math.sin(az) * Math.cos(el),
      T.y + d * Math.sin(el),
      T.z + d * Math.cos(az) * Math.cos(el)
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(T);
    camera.rotateZ(roll);
  }
  const logLerp = (a, b, p) => Math.exp(lerp(Math.log(a), Math.log(b), p));
  const dMatch = (2 * LABEL_R * H) / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * MATCH_PX);

  shot.update = (lt) => {
    // ---- record motion ----
    hero.userData.spin.rotation.z = -lt * 4.2;
    const flip = seg(lt, 4.35, 5.7, E.inOutExpo);
    hero.rotation.set(0, flip * TAU, 0);
    hero.position.set(0, 0, 0);

    fan.forEach((rec, i) => {
      const k = i + 1;
      const pin = seg(lt, 1.55 + i * 0.11, 2.55 + i * 0.11, E.outBack(1.4));
      const pout = seg(lt, 3.85 + (4 - i) * 0.07, 4.65 + (4 - i) * 0.07, E.inBack(1.6));
      const home = [0.6 * k, 0.15 * k, -0.5 * k];
      const from = [home[0] + 5, home[1] + 2.2, home[2] - 4];
      const to = [home[0] + 3.5, home[1] + 4, home[2] - 2];
      const p = [0, 1, 2].map((a) => lerp(lerp(from[a], home[a], pin), to[a], pout));
      rec.position.set(...p);
      rec.rotation.set(0.12 * Math.sin(lt * 1.3 + k), -0.18 * k + (1 - pin) * 1.4 - pout * 1.2, 0.05 * k);
      rec.userData.spin.rotation.z = -lt * (3 + k * 0.4);
      rec.visible = pin > 0.001 && pout < 0.999;
    });

    // ---- camera ----
    const pA = seg(lt, 0, 2.3, E.outExpo);
    const pB = seg(lt, 1.6, 4.0, E.inOutCubic);
    const pC = seg(lt, 4.1, 6.5, E.swoop);
    let target = [lerp(0.15, 0, pA), 0, 0.0075];
    let d = logLerp(0.12, 4.6, pA);
    let az = lerp(0, -0.6, pA), el = lerp(0, 0.2, pA), roll = lerp(0.6, 0, pA);
    // phase B: drift to frame the fan, records on the right of frame
    target = [lerp(target[0], -0.75, pB), lerp(0, 0.15, pB), lerp(target[2], -1.0, pB)];
    d = lerp(d, 6.0, pB);
    az = lerp(az, -0.32, pB);
    el = lerp(el, 0.14, pB);
    // phase C: return dead-centre, face-on, label at MATCH_PX
    target = [lerp(target[0], 0, pC), lerp(target[1], 0, pC), lerp(target[2], 0.0075, pC)];
    d = logLerp(d, dMatch * 1.08, pC);
    az = lerp(az, 0, pC);
    el = lerp(el, 0, pC);
    d = lerp(d, dMatch, seg(lt, 6.0, 7.0, E.outCubic)); // final settle
    rig(target, d, az, el, roll);

    // ---- dust ----
    const pos = dustGeo.attributes.position.array;
    for (let i = 0; i < dustN * 3; i++) {
      const range = i % 3 === 0 ? 10 : i % 3 === 1 ? 6 : 8;
      let v = dustBase[i] + dustVel[i] * (lt + 5);
      v = ((v + range / 2) % range + range) % range - range / 2;
      pos[i] = v + (i % 3 === 2 ? -1 : 0);
    }
    dustGeo.attributes.position.needsUpdate = true;
    dust.material.opacity = 0.55 * seg(lt, 0.3, 1.2);

    // ---- background ----
    const g = env.bg;
    g.fillStyle = '#030303';
    g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W * 0.55, H * 0.5, 0, W * 0.55, H * 0.5, W * 0.6);
    glow.addColorStop(0, 'rgba(30,215,96,0.16)');
    glow.addColorStop(0.5, 'rgba(30,215,96,0.04)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);

    // ---- type ----
    kText(env.fg, 'Find yours.', {
      x: 120, y: 585, size: 176, t: lt - 2.0, dur: 0.85, stagger: 0.04, out: lt - 3.9, outStagger: 0.025,
      colorAt: (i) => (i === 10 ? C.green : null),
    });

    return {
      bloom: [0.4, 0.45, 0.88],
      zoomBlur: (1 - seg(lt, 0, 0.4, E.outQuad)) * 0.3,
      ca: 0.0012 + (1 - seg(lt, 0, 0.5)) * 0.004,
      vignette: lerp(0.12, 0.34, seg(lt, 0, 0.8)),
    };
  };
  return shot;
}
