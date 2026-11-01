// Director: owns the renderer and post stack, picks the active shot for time t and
// renders it. Every frame is a pure function of t (no clocks, no Math.random, no
// accumulated state), so the offline renderer can ask for frames in any order, across
// several browsers, and get identical pixels.
//
// Layers per frame:   bg canvas (2D, behind 3D)  ->  3D scene  ->  bloom
//                     ->  fg canvas (2D type/UI, crisp, after bloom)  ->  FinalShader (lens)

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { loadFonts } from './lib/type.js';
import { FinalShader } from './lib/fx.js';
import { studioEnv } from './lib/studio.js';

import s1 from './shots/s1-title.js';
import s2 from './shots/s2-object.js';

// The shot list is the edit. Keep it in one place; each shot owns [start, end).
const SHOTS = [s1, s2];
export const W = 1920, H = 1080, FPS = 30, DURATION = 8;

const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
if (RENDER) document.body.classList.add('render');

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping; // FinalShader does linear -> sRGB itself
document.getElementById('stage').appendChild(renderer.domElement);

function layer() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  // CPU-backed: the GPU canvas path in headless Chromium can ignore a clearRect issued
  // right after the canvas was uploaded as a WebGL texture.
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return { c, ctx, tex };
}
const bg = layer();
const fg = layer();

const hudScene = new THREE.Scene();
const hudCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
hudScene.add(new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.MeshBasicMaterial({ map: fg.tex, transparent: true, depthTest: false, depthWrite: false })
));

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1);
composer.setSize(W, H);
const scenePass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.5, 0.85);
const hudPass = new RenderPass(hudScene, hudCam);
hudPass.clear = false;
const finalPass = new ShaderPass(FinalShader);
composer.addPass(scenePass);
composer.addPass(bloom);
composer.addPass(hudPass);
composer.addPass(finalPass);

const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// Project a world point to canvas pixels (for 2D elements that must sit on 3D ones).
const _v = new THREE.Vector3();
function project(p, camera) {
  _v.copy(p).project(camera);
  return [(_v.x * 0.5 + 0.5) * W, (-_v.y * 0.5 + 0.5) * H, _v.z];
}

let shots = [];
const DEFAULT_FX = () => ({
  bloom: [0.45, 0.5, 0.85], grain: 0.04, vignette: 0.3, ca: 0.0012,
  zoomBlur: 0, zoomCenter: [0.5, 0.5], dirBlur: [0, 0], flash: 0, flashColor: [1, 1, 1], fade: 0,
});

function renderAt(t) {
  t = Math.min(Math.max(t, 0), DURATION - 1e-6);
  const shot = shots.find((s) => t >= s.start && t < s.end) || shots[shots.length - 1];
  fg.ctx.reset();
  bg.ctx.reset();
  const fx = Object.assign(DEFAULT_FX(), shot.update(t - shot.start, t) || {});
  if (shot.useBg) {
    shot.scene.background = bg.tex;
    bg.tex.needsUpdate = true;
  }
  fg.tex.needsUpdate = true;
  scenePass.scene = shot.scene;
  scenePass.camera = shot.camera;
  [bloom.strength, bloom.radius, bloom.threshold] = fx.bloom;
  const u = finalPass.uniforms;
  u.uTime.value = Math.round(t * FPS);
  u.uGrain.value = fx.grain;
  u.uVignette.value = fx.vignette;
  u.uCA.value = fx.ca;
  u.uZoomBlur.value = fx.zoomBlur;
  u.uZoomCenter.value = fx.zoomCenter;
  u.uDirBlur.value = fx.dirBlur;
  u.uFlash.value = fx.flash;
  u.uFlashColor.value = fx.flashColor;
  u.uFade.value = fx.fade;
  composer.render();
  return shot.name;
}

async function boot() {
  await loadFonts();
  const env = {
    THREE, W, H, FPS, renderer, envMap, project, RoundedBox: RoundedBoxGeometry,
    envStudio: studioEnv(THREE, renderer, 'dark'),
    bg: bg.ctx, fg: fg.ctx,
    shared: {}, // cross-shot hand-offs for match cuts (a later shot publishes, an earlier one reads at render time)
  };
  shots = SHOTS.map((make) => make(env));
  for (const s of shots) renderAt(s.start + 0.01); // compile every shader before the first real frame
  window.__ad = { renderAt, W, H, FPS, DURATION, ready: true, shots: shots.map((s) => [s.name, s.start, s.end]) };
  window.__dbg = { shots, THREE, fg, bg, composer, bloom };
  document.getElementById('scrub').max = DURATION;
  if (!RENDER) startPreview();
  else if (params.has('t')) renderAt(Number(params.get('t')));
}

function startPreview() {
  const btn = document.getElementById('play');
  const scrub = document.getElementById('scrub');
  const tc = document.getElementById('tc');
  let t = Number(params.get('t') || 0), playing = !params.has('t'), last = performance.now();
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}`;
  btn.onclick = () => { playing = !playing; last = performance.now(); };
  scrub.oninput = () => { t = Number(scrub.value); playing = false; };
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { playing = !playing; last = performance.now(); e.preventDefault(); }
    if (e.code === 'ArrowRight') t = Math.min(DURATION, t + (e.shiftKey ? 1 : 1 / FPS));
    if (e.code === 'ArrowLeft') t = Math.max(0, t - (e.shiftKey ? 1 : 1 / FPS));
  });
  const loop = (now) => {
    if (playing) { t += (now - last) / 1000; if (t >= DURATION) t = 0; }
    last = now;
    renderAt(t);
    scrub.value = t;
    tc.textContent = fmt(t);
    btn.textContent = playing ? '❚❚' : '▶';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot().catch((e) => {
  console.error(e);
  window.__ad = { error: String(e && e.stack || e) };
});
