// Director: owns the renderer and post stack, picks the active shot for time t and
// renders it. Every frame is a pure function of t (no clocks, no Math.random, no
// accumulated state), so the offline renderer can ask for frames in any order, across
// several browsers, and get identical pixels.
//
// Layers per frame:   bg canvas (2D, behind 3D)  ->  3D scene  ->  3D overlay (shared
//                     across shots, e.g. the maple leaf that wipes S3 -> S4)  ->  bloom
//                     ->  fg canvas (2D type/UI, crisp, after bloom)  ->  FinalShader (lens)
//
// Two hosts drive renderAt(t): the motion skill's Playwright renderer (scripts/render.mjs)
// and HyperFrames (hyperframes.html), which seeks through the `hf-seek` event.

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
import { createLeaf } from './lib/leaf.js';

import sSearch from './shots/s1-search.js';
import sMaps from './shots/s3-maps.js';
import sLens from './shots/s4-lens.js';
import sTranslate from './shots/s5-translate.js';
import sGlobe from './shots/s6-globe.js';
import sEnd from './shots/s7-end.js';

// The shot list is the edit. Keep it in one place; each shot owns [start, end).
const SHOTS = [sSearch, sMaps, sLens, sTranslate, sGlobe, sEnd];
export const W = 1920, H = 1080, FPS = 30, DURATION = 60;

const params = new URLSearchParams(location.search);
const HF = !!window.__HF_MODE;
const RENDER = params.has('render') || HF;
if (RENDER) document.body.classList.add('render');

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping; // FinalShader does linear -> sRGB itself
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
const overlayPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
overlayPass.clear = false;
overlayPass.clearDepth = true;
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.5, 0.85);
const hudPass = new RenderPass(hudScene, hudCam);
hudPass.clear = false;
const finalPass = new ShaderPass(FinalShader);
composer.addPass(scenePass);
composer.addPass(overlayPass);
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
let overlay = null;
const DEFAULT_FX = () => ({
  bloom: [0, 0.4, 0.9], grain: 0.014, vignette: 0.05, ca: 0.0005,
  zoomBlur: 0, zoomCenter: [0.5, 0.5], dirBlur: [0, 0], flash: 0, flashColor: [1, 1, 1], fade: 0,
  overlay: false,
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
  overlayPass.enabled = !!fx.overlay;
  if (fx.overlay) {
    overlay.update(t);
    overlayPass.scene = overlay.scene;
    overlayPass.camera = overlay.camera;
  }
  bloom.enabled = fx.bloom[0] > 0.001;
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
    envLight: studioEnv(THREE, renderer, 'light'),
    bg: bg.ctx, fg: fg.ctx,
    shared: {}, // cross-shot hand-offs for match cuts (a later shot publishes, an earlier one reads at render time)
  };
  overlay = createLeaf(env);
  env.leaf = overlay;
  shots = SHOTS.map((make) => make(env));
  for (const s of shots) renderAt(s.start + 0.01); // compile every shader before the first real frame
  renderAt(20.9); // and the overlay leaf
  window.__ad = { renderAt, W, H, FPS, DURATION, ready: true, shots: shots.map((s) => [s.name, s.start, s.end]) };
  window.__dbg = { shots, THREE, fg, bg, composer, bloom, overlay };
  if (HF) {
    // HyperFrames seek protocol: draw the frame for e.detail.time, derived from t alone.
    const offset = Number(window.__HF_OFFSET || 0); // lets a short test composition render a slice
    window.addEventListener('hf-seek', (e) => renderAt(e.detail.time + offset));
    renderAt(offset);
  } else if (RENDER && params.has('t')) renderAt(Number(params.get('t')));
  // the interactive preview player lives in src/preview.js (index.html only)
}

const booted = boot().catch((e) => {
  console.error(e);
  window.__ad = { error: String(e && e.stack || e) };
});
// HyperFrames waits on registered build promises before its first seek.
window.__hf = window.__hf || {};
window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.engine = booted;
