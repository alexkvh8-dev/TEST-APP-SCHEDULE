// Director: renderer, post stack, studio environments, shot timeline.
// Every frame is a pure function of t, so frames can be rendered in any order.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { loadFonts } from './lib/type.js';
import { FinalShader, StreakPass } from './lib/fx.js';
import { studioEnv } from './lib/studio.js';
import { setRB } from './lib/hardware.js';
import { makeFootage } from './lib/footage.js';

export const W = 1920, H = 1080, FPS = 30, DURATION = 90;
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
// profiling switches: ?nodof ?nostreak ?nobloom ?msaa=N
const OPT = { dof: !params.has('nodof'), streak: !params.has('nostreak'), bloom: !params.has('nobloom'), msaa: Number(params.get('msaa') ?? 2) };
if (RENDER) document.body.classList.add('render');

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping;
document.getElementById('stage').appendChild(renderer.domElement);
setRB(RoundedBoxGeometry);

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

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: OPT.msaa });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1);
composer.setSize(W, H);
const scenePass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
const bokeh = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 5, aperture: 0.002, maxblur: 0.01 });
bokeh.enabled = false;
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.45, 0.5, 0.85);
const streak = new StreakPass(W, H);
const hudPass = new RenderPass(hudScene, hudCam);
hudPass.clear = false;
const finalPass = new ShaderPass(FinalShader);
finalPass.uniforms.tStreak.value = streak.rt.texture;
composer.addPass(scenePass);
composer.addPass(bokeh);
composer.addPass(bloom);
composer.addPass(streak);
composer.addPass(hudPass);
composer.addPass(finalPass);

const _v = new THREE.Vector3();
function project(p, camera) {
  _v.copy(p).project(camera);
  return [(_v.x * 0.5 + 0.5) * W, (-_v.y * 0.5 + 0.5) * H, _v.z];
}

let shots = [];
// A filmed-through-glass finish: slight barrel distortion + per-channel dispersion,
// anamorphic streaks on hot highlights, bloom, grain.
const DEFAULT_FX = () => ({
  bloom: [0.45, 0.5, 0.85], grain: 0.028, vignette: 0.28, ca: 0.0011, distort: 0.06,
  streak: 0.0, streakTint: [1, 0.68, 0.32], streakThreshold: 0.9,
  zoomBlur: 0, zoomCenter: [0.5, 0.5], dirBlur: [0, 0], flash: 0, flashColor: [1, 1, 1], fade: 0, lift: [0, 0, 0],
  dof: null,
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
  bokeh.enabled = !!fx.dof && OPT.dof;
  bloom.enabled = OPT.bloom;
  if (fx.dof) {
    bokeh.scene = shot.scene;
    bokeh.camera = shot.camera;
    bokeh.uniforms.focus.value = fx.dof.focus;
    bokeh.uniforms.aperture.value = fx.dof.aperture;
    bokeh.uniforms.maxblur.value = fx.dof.maxblur ?? 0.012;
  }
  streak.active = fx.streak > 0.001 && OPT.streak;
  streak.material.uniforms.uThreshold.value = fx.streakThreshold;
  const u = finalPass.uniforms;
  u.uDistort.value = fx.distort;
  u.uStreak.value = fx.streak;
  u.uStreakTint.value = fx.streakTint;
  u.uLift.value = fx.lift;
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
    footage: makeFootage({ THREE, renderer }),
    RB: RoundedBoxGeometry,
    TextGeometry,
    font3d: new Font(await new TTFLoader().loadAsync('./assets/fonts/InterDisplay-Black.otf')),
    shared: {},
  };
  const names = params.get('shots') ? params.get('shots').split(',') : [
    's01-hook', 's02-logo', 's03-edit', 's04-color', 's05-fusion', 's06-fairlight', 's07-ai', 's08-deliver', 's09-montage', 's10-cta',
  ];
  const list = await Promise.all(names.map(async (n) => (await import(`./shots/${n}.js`)).default));
  shots = list.map((make) => make(env));
  env.shots = shots;
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
