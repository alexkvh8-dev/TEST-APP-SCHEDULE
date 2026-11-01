// SHOT 5 · 0:33–0:43 · "100 million+ songs. Podcasts. Audiobooks. All in one place."
// The four mood mixes from Shot 4 are the first four tiles of a curved, endless wall of
// covers: the camera pulls back as the library ripples into existence around them.
// Spotify's own filter chips (All · Music · Podcasts · Audiobooks) drive the story — each
// tap sends a flip wave across the wall from the centre outwards, turning every tile into
// a podcast, then an audiobook, then a mix of all three. Exits on a whip pan into Shot 6.

import { C } from '../lib/brand.js';
import * as E from '../lib/ease.js';
import { lerp, seg, clamp, rng } from '../lib/util.js';
import { kText, font, measure, text } from '../lib/type.js';
import { makeCover } from '../lib/covers.js';
import { atlas, musicCover, podcastCover, bookCover, HERO_SPECS } from '../lib/library.js';

export const COLS = 41, ROWS = 23, P = 1.14, RCYL = 24, START_D = 5.0;
export const TILE_R = 0.07; // corner radius as a fraction of tile size (Shot 4 draws the same)
const CX = 20.5, CY = 11, HERO_COLS = [19, 20, 21, 22];
const WAVES = [[3.1, 1], [5.4, 2], [7.6, -1]]; // [time, layer]; -1 = a mix of all three
const CHIP_AT = [[0.0, 1], [2.95, 2], [5.25, 3], [7.45, 0]];
const LABELS = ['All', 'Music', 'Podcasts', 'Audiobooks'];

function pose(c, r) {
  const phi = ((c - CX) * P) / RCYL;
  return { x: RCYL * Math.sin(phi), y: (r - CY) * P, z: RCYL * (1 - Math.cos(phi)), ry: -phi };
}

const VERT = /* glsl */ `
  varying vec2 vUv; varying float vLayer; varying float vId; varying float vShade; varying float vAlpha;
  varying float vDepth; varying vec3 vWorld;
  #ifdef USE_INSTANCING
    attribute float aLayer; attribute float aId; attribute float aShade; attribute float aAlpha;
  #else
    uniform float uLayer; uniform float uShade; uniform float uAlpha;
  #endif
  void main() {
    vUv = uv;
    #ifdef USE_INSTANCING
      vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vLayer = aLayer; vId = aId; vShade = aShade; vAlpha = aAlpha;
    #else
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vLayer = uLayer; vId = -1.0; vShade = uShade; vAlpha = uAlpha;
    #endif
    vWorld = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG = /* glsl */ `
  uniform sampler2D t0, t1, t2;
  uniform float uR, uSweep, uFogNear, uFogFar;
  uniform vec3 uFog;
  varying vec2 vUv; varying float vLayer; varying float vId; varying float vShade; varying float vAlpha;
  varying float vDepth; varying vec3 vWorld;
  float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  // USE_INSTANCING is only defined for the vertex stage, so the fragment stage tells the
  // wall (atlas cell picked by hash) from the hero tiles (own texture, vId < 0) by vId.
  vec3 cell(sampler2D t, float salt) {
    if (vId < 0.0) return texture2D(t, vUv).rgb;
    // snap: the interpolated id wobbles by ulps and the hash would amplify that per pixel
    float n = floor(hash(floor(vId + 0.5) * 1.731 + salt) * 64.0);
    vec2 c = vec2(mod(n, 8.0), floor(n / 8.0));
    vec2 inC = (6.0 + vUv * 244.0) / 256.0;
    return texture2D(t, vec2((c.x + inC.x) / 8.0, 1.0 - (c.y + 1.0 - inC.y) / 8.0)).rgb;
  }
  void main() {
    // rounded-square SDF (exact inside too, so fwidth never collapses to 0 mid-tile)
    vec2 q = abs(vUv - 0.5) - (0.5 - uR);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uR;
    float aa = max(fwidth(d) * 1.2, 1e-4);
    float mask = 1.0 - smoothstep(-aa, aa, d);
    vec3 col = vLayer < 0.5 ? cell(t0, 0.0) : (vLayer < 1.5 ? cell(t1, 31.7) : cell(t2, 77.3));
    col *= vShade;
    float s = exp(-pow((vWorld.x + vWorld.y * 0.45 - uSweep) / 1.5, 2.0));
    col += vec3(1.0, 0.98, 0.95) * 0.14 * s;
    col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vDepth));
    float a = mask * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }`;

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.ink);
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);
  const shot = { name: 'S5 Library', start: 33, end: 43, scene, camera };

  const texOf = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const atl = [atlas((i, S) => musicCover(i, S)), atlas((i, S) => podcastCover(i, S)), atlas((i, S) => bookCover(i, S))].map(texOf);
  const fog = new THREE.Color(C.ink);
  const uniforms = (maps) => ({
    t0: { value: maps[0] }, t1: { value: maps[1] }, t2: { value: maps[2] },
    uR: { value: TILE_R }, uSweep: { value: -40 }, uFogNear: { value: 16 }, uFogFar: { value: 34 }, uFog: { value: fog },
    uLayer: { value: 0 }, uShade: { value: 1 }, uAlpha: { value: 1 },
  });
  const wallMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms(atl), transparent: true, side: THREE.DoubleSide });

  // tiles (heroes excluded from the instanced wall; they get their own high-res meshes)
  const r0 = rng(77);
  const tiles = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (r === CY && HERO_COLS.includes(c)) continue;
    tiles.push({ c, r, d: Math.hypot(c - CX, r - CY), p: pose(c, r), mix: Math.floor(r0() * 3), id: tiles.length });
  }
  const geo = new THREE.PlaneGeometry(1, 1);
  const wall = new THREE.InstancedMesh(geo, wallMat, tiles.length);
  const attr = (name) => {
    const a = new THREE.InstancedBufferAttribute(new Float32Array(tiles.length), 1);
    a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute(name, a);
    return a;
  };
  const aLayer = attr('aLayer'), aShade = attr('aShade'), aAlpha = attr('aAlpha');
  const aId = new THREE.InstancedBufferAttribute(new Float32Array(tiles.map((t) => t.id)), 1);
  geo.setAttribute('aId', aId);
  wall.frustumCulled = false;
  scene.add(wall);

  const heroCanvases = HERO_SPECS.map((s, i) => makeCover(s, 512, 40 + i));
  const heroes = HERO_COLS.map((c, i) => {
    const maps = [heroCanvases[i], podcastCover(3 + i * 5, 512), bookCover(2 + i * 3, 512)].map(texOf);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms(maps), transparent: true, side: THREE.DoubleSide }));
    const p = pose(c, CY);
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = p.ry;
    m.userData = { p, d: Math.abs(c - CX) };
    scene.add(m);
    return m;
  });

  // hand-off for Shot 4: where the hero tiles sit on screen at our first frame
  const startCam = camera.clone();
  startCam.position.set(0, 0, START_D);
  startCam.lookAt(0, 0, 0);
  startCam.updateMatrixWorld(true);
  startCam.updateProjectionMatrix();
  const v = new THREE.Vector3();
  const heroRects = heroes.map((m) => {
    m.updateMatrixWorld(true);
    const xs = [], ys = [];
    for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      v.set(a, b, 0).applyMatrix4(m.matrixWorld).project(startCam);
      xs.push((v.x * 0.5 + 0.5) * W);
      ys.push((-v.y * 0.5 + 0.5) * H);
    }
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  });
  env.shared.library = { heroRects, heroCanvases, radius: TILE_R };

  // flip state for a tile at grid distance d
  function flipState(lt, d, mixLayer) {
    let layer = 0, ang = 0;
    for (const [t0, to] of WAVES) {
      const u = clamp((lt - t0 - d * 0.035) / 0.55);
      if (u <= 0) break;
      const e = E.inOutCubic(u);
      if (e < 0.5) ang = e * Math.PI;
      else { layer = to < 0 ? mixLayer : to; ang = (e - 1) * Math.PI; }
      if (u < 1) break;
      ang = 0;
    }
    return { layer, ang };
  }

  const dummy = new THREE.Object3D();
  const whipAngle = (lt) => E.inExpo(seg(lt, 8.55, 10.0)) * 0.95;

  function chips(f, lt) {
    const a = E.outCubic(seg(lt, 0.45, 0.95));
    if (a <= 0) return;
    f.save();
    f.globalAlpha = a;
    f.font = font(30, 700);
    f.letterSpacing = '0px';
    const ws = LABELS.map((l) => f.measureText(l).width + 60);
    const gap = 14, total = ws.reduce((s, w) => s + w, 0) + gap * (ws.length - 1);
    let x = W / 2 - total / 2;
    const y = 88 - (1 - a) * 24, h = 62;
    const rects = ws.map((w) => { const r = [x, y, w, h]; x += w + gap; return r; });
    // which chip is selected, with a smooth slide between selections
    let prev = 1, cur = 1, st = 0;
    for (const [t0, idx] of CHIP_AT) if (lt >= t0) { prev = cur; cur = idx; st = t0; }
    const e = st === 0 ? 1 : E.inOutCubic(seg(lt, st, st + 0.35));
    const hr = rects[prev].map((v, k) => lerp(v, rects[cur][k], e));
    rects.forEach(([rx, ry, rw, rh]) => { f.fillStyle = 'rgba(255,255,255,0.1)'; f.beginPath(); f.roundRect(rx, ry, rw, rh, rh / 2); f.fill(); });
    f.fillStyle = C.green; f.beginPath(); f.roundRect(hr[0], hr[1], hr[2], hr[3], hr[3] / 2); f.fill();
    // tap ripple on the newly selected chip
    if (st > 0) {
      const rp = seg(lt, st, st + 0.45);
      if (rp > 0 && rp < 1) {
        const [rx, ry, rw, rh] = rects[cur];
        f.save(); f.beginPath(); f.roundRect(rx, ry, rw, rh, rh / 2); f.clip();
        f.fillStyle = `rgba(255,255,255,${0.35 * (1 - rp)})`;
        f.beginPath(); f.arc(rx + rw / 2, ry + rh / 2, 20 + rw * 0.6 * E.outCubic(rp), 0, Math.PI * 2); f.fill();
        f.restore();
      }
    }
    rects.forEach(([rx, ry, rw, rh], i) => {
      const cover = clamp((Math.min(rx + rw, hr[0] + hr[2]) - Math.max(rx, hr[0])) / rw);
      f.fillStyle = cover > 0.5 ? '#000' : '#fff';
      f.textAlign = 'center';
      f.textBaseline = 'middle';
      f.fillText(LABELS[i], rx + rw / 2, ry + rh / 2 + 1);
    });
    f.restore();
  }

  shot.update = (lt, t) => {
    // ---- wall ----
    tiles.forEach((tl, k) => {
      const reveal = E.outCubic(seg(lt, 0.25 + tl.d * 0.055, 0.85 + tl.d * 0.055));
      const { layer, ang } = flipState(lt, tl.d, tl.mix);
      const breathe = 0.04 * Math.sin(tl.d * 0.55 - lt * 1.6);
      dummy.position.set(tl.p.x, tl.p.y, tl.p.z - (1 - reveal) * 0.9 + breathe * reveal);
      dummy.rotation.set(0, tl.p.ry + ang, 0);
      dummy.scale.setScalar(lerp(0.55, 1, reveal));
      dummy.updateMatrix();
      wall.setMatrixAt(k, dummy.matrix);
      aLayer.array[k] = layer;
      aShade.array[k] = 0.62 + 0.38 * Math.cos(ang);
      aAlpha.array[k] = reveal;
    });
    wall.instanceMatrix.needsUpdate = true;
    aLayer.needsUpdate = aShade.needsUpdate = aAlpha.needsUpdate = true;
    heroes.forEach((m) => {
      const { layer, ang } = flipState(lt, m.userData.d, 0);
      m.rotation.y = m.userData.p.ry + ang;
      const u = m.material.uniforms;
      u.uLayer.value = layer;
      u.uShade.value = 0.62 + 0.38 * Math.cos(ang);
    });
    const sweep = lerp(-30, 30, seg(lt, 2.4, 4.6, E.inOutSine)) + lerp(0, 60, seg(lt, 7.8, 9.4, E.inOutSine));
    wallMat.uniforms.uSweep.value = sweep;
    heroes.forEach((m) => (m.material.uniforms.uSweep.value = sweep));

    // ---- camera: pull back to reveal, slow drift, whip out ----
    const pull = seg(lt, 0.2, 3.0, E.inOutCubic);
    const drift = seg(lt, 3.0, 8.6, E.inOutSine);
    let d = Math.exp(lerp(Math.log(START_D), Math.log(17.5), pull));
    d = lerp(d, 15.2, drift);
    const az = lerp(0, -0.12, pull) + 0.28 * drift;
    const el = lerp(0, 0.09, pull) - 0.05 * drift;
    camera.position.set(d * Math.sin(az) * Math.cos(el), d * Math.sin(el), d * Math.cos(az) * Math.cos(el));
    camera.up.set(0, 1, 0);
    camera.lookAt(0, lerp(0, -0.6, pull), 0);
    camera.rotateZ(lerp(0, -0.04, pull) * (1 - drift));
    const wa = whipAngle(lt);
    camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -wa);
    const vel = (whipAngle(lt + 1 / 60) - wa) * 60;

    // ---- type: chips drive the story, headline bottom-left over a soft scrim ----
    const f = env.fg;
    const scrim = seg(lt, 0.6, 1.2) * (1 - seg(lt, 8.6, 9.2));
    if (scrim > 0) {
      const sg = f.createLinearGradient(0, 560, 0, H);
      sg.addColorStop(0, 'rgba(18,18,18,0)');
      sg.addColorStop(0.42, `rgba(18,18,18,${0.72 * scrim})`);
      sg.addColorStop(1, `rgba(18,18,18,${0.94 * scrim})`);
      f.fillStyle = sg; f.fillRect(0, 560, W, H - 560);
      const tg = f.createLinearGradient(0, 0, 0, 220);
      tg.addColorStop(0, `rgba(18,18,18,${0.7 * scrim})`);
      tg.addColorStop(1, 'rgba(18,18,18,0)');
      f.fillStyle = tg; f.fillRect(0, 0, W, 220);
    }
    chips(f, lt);
    const X = 120;
    // "100 million+" — digits in fixed slots so the line never jitters while counting
    const n = Math.round(100 * E.outExpo(seg(lt, 0.9, 2.5)));
    const inA = E.outExpo(seg(lt, 0.8, 1.6)), outA = seg(lt, 2.85, 3.2, E.inCubic);
    if (inA > 0 && outA < 1) {
      f.save();
      f.beginPath(); f.rect(0, 760, W, 180); f.clip();
      f.translate(0, (1 - inA) * 150 - outA * 150);
      f.font = font(150, 900);
      f.letterSpacing = '-4px';
      const dw = measure(f, '0', 150, 900, -0.03);
      const digits = String(n).padStart(3, ' ');
      [...digits].forEach((ch, i) => { if (ch !== ' ') text(f, ch, X + i * dw + dw / 2, 900, 150, 900, '#fff', 'center', -0.03); });
      text(f, 'million', X + 3 * dw + 28, 900, 150, 900, '#fff', 'left', -0.03);
      const mw = measure(f, 'million', 150, 900, -0.03);
      text(f, '+', X + 3 * dw + 28 + mw + 10, 900, 150, 900, C.green, 'left', 0);
      f.restore();
    }
    kText(f, 'songs.', { x: X + 4, y: 1000, size: 84, weight: 800, t: lt - 1.3, out: lt - 2.9, colorAt: (i) => (i === 5 ? C.green : null) });
    const head = (str, sub, t0, t1, size = 150) => {
      kText(f, str, { x: X, y: 900, size, weight: 900, t: lt - t0, dur: 0.7, stagger: 0.03, out: lt - t1, outStagger: 0.015, colorAt: (i) => (i === str.length - 1 ? C.green : null) });
      kText(f, sub, { x: X + 4, y: 985, size: 46, weight: 500, color: C.mute, mode: 'fade', unit: 'word', stagger: 0.05, t: lt - t0 - 0.25, out: lt - t1, tracking: -0.01 });
    };
    head('Podcasts.', 'Stories, news and conversations.', 3.2, 5.15);
    head('Audiobooks.', 'Get lost in a good book.', 5.5, 7.35);
    head('All in one place.', 'Music, podcasts and audiobooks. One app.', 7.7, 8.75, 132);

    const blur = clamp(Math.abs(vel) * 0.02, 0, 0.3);
    return {
      bloom: [0.32, 0.45, 0.88],
      dirBlur: [blur, 0],
      ca: 0.0012 + blur * 0.02,
      vignette: 0.32,
    };
  };
  return shot;
}
