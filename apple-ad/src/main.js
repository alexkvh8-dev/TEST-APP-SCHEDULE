// Director: renderer, post stack, studio environments, shot timeline.
// Every frame is a pure function of t, so frames can be rendered in any order.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { loadFonts } from './lib/type.js';
import { FinalShader } from './lib/fx.js';
import { studioEnv } from './lib/studio.js';
import { setRoundedBox } from './lib/models.js';

export const W = 1920, H = 1080, FPS = 30, DURATION = 60;
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
if (RENDER) document.body.classList.add('render');

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping;
document.getElementById('stage').appendChild(renderer.domElement);
setRoundedBox(RoundedBoxGeometry);

function layer() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
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
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.3, 0.4, 0.9);
const hudPass = new RenderPass(hudScene, hudCam);
hudPass.clear = false;
const finalPass = new ShaderPass(FinalShader);
composer.addPass(scenePass);
composer.addPass(bloom);
composer.addPass(hudPass);
composer.addPass(finalPass);

const _v = new THREE.Vector3();
function project(p, camera) {
  _v.copy(p).project(camera);
  return [(_v.x * 0.5 + 0.5) * W, (-_v.y * 0.5 + 0.5) * H, _v.z];
}

let shots = [];
// Apple's films are clean: almost no grain, barely any vignette, no visible fringing.
const DEFAULT_FX = () => ({
  bloom: [0.28, 0.45, 0.9], grain: 0.012, vignette: 0.12, ca: 0.0003,
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
    THREE, W, H, renderer, project,
    bg: bg.ctx, fg: fg.ctx,
    envDark: studioEnv(THREE, renderer, 'dark'),
    envLight: studioEnv(THREE, renderer, 'light'),
    shared: {},
  };
  const list = params.get('test') === 'models'
    ? [(await import('./shots/test-models.js')).default]
    : await Promise.all([
      's1-edge', 's2-lens', 's3-hero', 's4-glow', 's5-lineup', 's6-logo',
    ].map(async (n) => (await import(`./shots/${n}.js`)).default));
  shots = list.map((make) => make(env));
  for (const s of shots) renderAt(s.start + 0.01);
  window.__ad = { renderAt, W, H, FPS, DURATION, ready: true, shots: shots.map((s) => [s.name, s.start, s.end]) };
  window.__dbg = { shots, THREE, fg, bg, composer, bloom };
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
    if (playing) {
      t += (now - last) / 1000;
      if (t >= DURATION) t = 0;
    }
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
  window.__ad = { error: String((e && e.stack) || e) };
});
