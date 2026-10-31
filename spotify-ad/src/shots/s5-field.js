// SHOT 5 · 0:33–0:43 · "100,000,000+ songs. Podcasts. Audiobooks."
// A 3D spectrogram: each column is a frequency band, each row is the same signal a
// moment older, so waves roll away from camera. Opens on a flat front view that matches
// the 2D bars at the end of Shot 4, cranes up to reveal the field, orbits, then whips
// right (directional blur) into Shot 6.

import { C } from '../lib/brand.js';
import * as E from '../lib/ease.js';
import { lerp, seg, clamp, noise1, TAU } from '../lib/util.js';
import { kText, font, measure } from '../lib/type.js';

export const NX = 32, NZ = 36, SP = 0.32, FOOT = 0.2, Z_FRONT = 5.6;
export const colX = (ix) => (ix - (NX - 1) / 2) * SP;
export const rowZ = (iz) => Z_FRONT - iz * SP;
export const START_CAM = { pos: [0, 1.25, Z_FRONT + 10.2], look: [0, 1.25, Z_FRONT] };

const STOPS = [C.pink, C.blue, C.green, C.lime, C.yellow];
export function columnColor(THREE, ix) {
  const f = (ix / (NX - 1)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(f));
  return new THREE.Color(STOPS[i]).lerp(new THREE.Color(STOPS[i + 1]), f - i);
}

function spec(ix, tau) {
  const f = ix / (NX - 1);
  const ph = (((tau % 0.5) + 0.5) % 0.5) / 0.5;
  const kick = Math.exp(-ph * 5.5);
  const bass = kick * Math.pow(1 - f, 1.4);
  const mid = (0.5 + 0.5 * Math.sin(tau * 3.3 + f * 9.0)) * 0.5 * Math.sin(Math.PI * clamp(f * 1.2));
  const hi = (0.5 + 0.5 * noise1(tau * 8 + ix * 13.1, 2)) * 0.45 * f;
  const snare = Math.exp(-((((tau + 0.25) % 1) + 1) % 1) * 7) * 0.35 * Math.exp(-Math.pow((f - 0.55) / 0.2, 2));
  return clamp(0.1 + bass * 0.95 + mid + hi + snare, 0, 1.5);
}

export function energy(t) {
  return 1 + 0.4 * seg(t, 40.2, 41.6, E.inOutSine) - 0.25 * seg(t, 41.6, 42.6, E.inOutSine);
}

// Height of bar (ix, iz) at absolute time t. Shot 4 uses this too, for the match cut.
export function barHeight(ix, iz, t) {
  return 0.06 + spec(ix, t - iz * 0.075) * 1.8 * energy(t);
}

function odometer(ctx, value, x, y, size, alpha) {
  // Fixed-width slots, each digit rolls like a mechanical counter.
  const final = '100,000,000';
  ctx.save();
  ctx.font = font(size, 900);
  ctx.letterSpacing = `${-0.02 * size}px`;
  const dw = ctx.measureText('0').width, cw = ctx.measureText(',').width;
  const top = y - size * 0.82, hgt = size * 1.0;
  let px = x, k = 8;
  const N = value;
  const lead = Math.max(1, Math.floor(Math.log10(Math.max(1, N))) + 1);
  for (const ch of final) {
    if (ch === ',') {
      if (k + 1 < lead) { ctx.globalAlpha = alpha; ctx.fillStyle = '#fff'; ctx.fillText(',', px, y); }
      px += cw;
      continue;
    }
    if (k < lead) {
      const v = N / Math.pow(10, k);
      const d = Math.floor(v) % 10;
      const frac = k === 0 ? 0 : Math.min(1, (v % 1) * 1.0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(px - 4, top, dw + 8, hgt);
      ctx.clip();
      const speed = k < 3 ? 1 : 0; // the fastest wheels smear
      if (speed && N < 1e8) ctx.filter = 'blur(2px)';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.fillText(String(d), px, y - frac * size);
      ctx.fillText(String((d + 1) % 10), px, y - frac * size + size);
      ctx.restore();
    }
    px += dw;
    k--;
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.green;
  ctx.fillText('+', px + 6, y);
  ctx.restore();
}

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.ink);
  scene.fog = new THREE.FogExp2(C.ink, 0.055);
  scene.environment = env.envMap;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);
  const shot = { name: 'S5 Field', start: 33, end: 43, scene, camera };

  const geo = new THREE.BoxGeometry(FOOT, 1, FOOT).translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.0, envMapIntensity: 0.25 });
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * 0.3;'
    );
  };
  const bars = new THREE.InstancedMesh(geo, mat, NX * NZ);
  for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) bars.setColorAt(iz * NX + ix, columnColor(THREE, ix));
  scene.add(bars);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#070707', roughness: 0.7, metalness: 0.2, envMapIntensity: 0.25 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  scene.add(new THREE.HemisphereLight('#ffffff', '#101010', 0.45));
  const key = new THREE.DirectionalLight('#ffffff', 0.8);
  key.position.set(-4, 8, 6);
  scene.add(key);

  env.shared.field = { camera: null };
  // A copy of the opening camera so Shot 4 can project the front row exactly.
  const startCam = camera.clone();
  startCam.position.set(...START_CAM.pos);
  startCam.lookAt(...START_CAM.look);
  startCam.updateMatrixWorld(true);
  startCam.updateProjectionMatrix();
  env.shared.field.camera = startCam;

  const d = new THREE.Object3D();
  const T = new THREE.Vector3();
  const logLerp = (a, b, p) => Math.exp(lerp(Math.log(a), Math.log(b), p));
  const whipAngle = (lt) => E.inExpo(seg(lt, 8.55, 10.0)) * 0.95;

  shot.update = (lt, t) => {
    for (let iz = 0; iz < NZ; iz++) {
      for (let ix = 0; ix < NX; ix++) {
        d.position.set(colX(ix), 0, rowZ(iz));
        // only the front row exists at the cut (it matches Shot 4's 2D bars);
        // the rows behind grow out of the floor in a wave that rolls away from camera
        const grow = iz === 0 ? 1 : E.outCubic(seg(lt, 0.05 + iz * 0.035, 0.6 + iz * 0.035));
        d.scale.set(1, Math.max(0.0001, barHeight(ix, iz, t) * grow), 1);
        d.updateMatrix();
        bars.setMatrixAt(iz * NX + ix, d.matrix);
      }
    }
    bars.instanceMatrix.needsUpdate = true;

    // ---- camera: front -> crane up -> orbit -> whip ----
    const p1 = seg(lt, 0.15, 3.3, E.swoop);
    const p2 = seg(lt, 3.3, 8.6, E.inOutSine);
    const start = { tgt: START_CAM.look, d: START_CAM.pos[2] - Z_FRONT, az: 0, el: 0 };
    let tgt = [0, lerp(start.tgt[1], 1.9, p1), lerp(start.tgt[2], -0.6, p1)];
    let dist = logLerp(start.d, 13.5, p1);
    let az = lerp(0, -0.5, p1), el = lerp(0, 0.6, p1);
    az = lerp(az, 0.28, p2);
    el = lerp(el, 0.5, p2);
    dist = lerp(dist, 11.2, p2);
    T.set(...tgt);
    camera.position.set(T.x + dist * Math.sin(az) * Math.cos(el), T.y + dist * Math.sin(el), T.z + dist * Math.cos(az) * Math.cos(el));
    camera.lookAt(T);
    const wa = whipAngle(lt);
    camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -wa);
    const vel = (whipAngle(lt + 1 / 60) - wa) * 60; // rad/s

    // ---- type ----
    const f = env.fg;
    const scrimA = 0.55 * seg(lt, 0.6, 1.4) * (1 - seg(lt, 8.4, 9.0));
    if (scrimA > 0) {
      const sg = f.createLinearGradient(0, 0, 0, 560);
      sg.addColorStop(0, `rgba(18,18,18,${scrimA})`);
      sg.addColorStop(1, 'rgba(18,18,18,0)');
      f.fillStyle = sg;
      f.fillRect(0, 0, W, 560);
    }
    const L = 112;
    const count = Math.round(1e8 * E.outExpo(seg(lt, 0.9, 3.0)));
    const outA = seg(lt, 3.3, 3.75, E.inCubic);
    if (lt > 0.85 && outA < 1) {
      f.save();
      f.beginPath();
      f.rect(0, 120, W, 210);
      f.clip();
      odometer(f, count, L, 290 - outA * 200 + (1 - E.outExpo(seg(lt, 0.85, 1.4))) * 200, 160, 1);
      f.restore();
    }
    kText(f, 'songs.', { x: L, y: 410, size: 96, weight: 800, t: lt - 1.25, out: lt - 3.32, colorAt: (i) => (i === 5 ? C.green : null) });
    kText(f, 'Podcasts.', { x: L, y: 300, size: 160, t: lt - 3.6, stagger: 0.035, out: lt - 5.05, colorAt: (i) => (i === 8 ? C.green : null) });
    kText(f, 'Audiobooks.', { x: L, y: 300, size: 160, mode: 'stretch', t: lt - 5.3, stagger: 0.03, out: lt - 6.75, colorAt: (i) => (i === 10 ? C.green : null) });
    kText(f, 'All in one place', { x: L, y: 300, size: 150, mode: 'rise', unit: 'word', stagger: 0.09, dur: 0.75, t: lt - 7.0, out: lt - 8.45, outStagger: 0.05 });

    const blur = clamp(Math.abs(vel) * 0.02, 0, 0.3);
    return {
      bloom: [lerp(0.12, 0.38, seg(lt, 0, 1.2)), 0.5, 0.9],
      dirBlur: [blur, 0],
      ca: 0.0012 + blur * 0.02,
      vignette: 0.35,
    };
  };
  return shot;
}
