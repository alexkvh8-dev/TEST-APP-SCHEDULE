// "Footage": a procedural mountain world rendered as drone shots into an HDR target.
// It feeds every viewer in the ad through gradeMaterial(), a real grading shader
// (camera-log flattening, lift/gamma/gain, contrast, saturation, split-tone, a before/after
// wipe, and a Magic Mask style subject matte). Scopes are computed from actual pixels.

import { noise1, clamp, lerp, rng } from './util.js';

function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}
function fbm(x, y, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; }
  return s;
}
function ridged(x, y, oct = 6) {
  let s = 0, a = 0.5, f = 1, w = 1;
  for (let i = 0; i < oct; i++) {
    let n = 1 - Math.abs(vnoise(x * f, y * f));
    n *= n * w;
    w = clamp(n * 1.6);
    s += a * n; f *= 2.1; a *= 0.5;
  }
  return s;
}
export function terrainH(x, z) {
  const m = Math.pow(ridged(x * 0.018 + 3.1, z * 0.018 - 1.7), 1.7) * 30;
  const hills = fbm(x * 0.06, z * 0.06) * 2.5;
  const valley = 1 - Math.exp(-((x * 0.06) ** 2)); // carve a valley along z for the drone path
  return (m * (0.35 + 0.65 * valley) + hills) - 4;
}

export const PRESETS = {
  golden: { sun: [-0.35, 0.16, -1], horizon: '#ffb36b', zenith: '#3b5f99', sunCol: '#ffd29a', sunI: 3.4, hemiSky: '#9fb6d9', hemiGround: '#5a4430', fog: '#e8a76c', exposure: 1.0 },
  blue: { sun: [0.6, 0.05, -1], horizon: '#8fa9d6', zenith: '#16264d', sunCol: '#b9c8ff', sunI: 1.2, hemiSky: '#6c84b8', hemiGround: '#202630', fog: '#7d93c0', exposure: 1.25 },
  dawn: { sun: [0.25, 0.08, -1], horizon: '#ff8fa0', zenith: '#40507f', sunCol: '#ffc0b0', sunI: 2.4, hemiSky: '#a6a8d4', hemiGround: '#4b3a3e', fog: '#d99aa6', exposure: 1.05 },
};

export function makeFootage(env) {
  const { THREE, renderer } = env;
  const rt = new THREE.WebGLRenderTarget(1280, 720, { type: THREE.HalfFloatType, samples: 4 });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.2, 600);

  // ---- terrain ----
  const S = 260, N = 240;
  const geo = new THREE.PlaneGeometry(S, S, N, N).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const grass = new THREE.Color('#4a5f30'), rock = new THREE.Color('#6d6052'), dark = new THREE.Color('#3a332c'), snow = new THREE.Color('#eef2f6');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainH(x, z);
    pos.setY(i, h);
    const slope = Math.abs(terrainH(x + 0.6, z) - h) + Math.abs(terrainH(x, z + 0.6) - h);
    c.copy(grass).lerp(rock, clamp(slope * 0.9 + (h - 4) * 0.06)).lerp(dark, clamp((slope - 1.2) * 0.5));
    if (h > 15 + fbm(x * 0.2, z * 0.2) * 3) c.lerp(snow, clamp((h - 15) * 0.25) * clamp(1.4 - slope * 0.5));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  scene.add(terrain);

  // ---- lake in the valley ----
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#1d2a36', roughness: 0.08, metalness: 0.0, clearcoat: 1 }));
  lake.position.y = -2.2;
  scene.add(lake);

  // ---- sky ----
  const skyU = {
    uHorizon: { value: new THREE.Color() }, uZenith: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3() },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform vec3 uHorizon, uZenith, uSunCol, uSun; varying vec3 vD;
      void main(){
        float h = clamp(vD.y, 0.0, 1.0);
        vec3 c = mix(uHorizon, uZenith, pow(h, 0.55));
        float s = max(dot(normalize(vD), normalize(uSun)), 0.0);
        c += uSunCol * (pow(s, 900.0) * 40.0 + pow(s, 24.0) * 0.6 + pow(s, 4.0) * 0.18);
        c = mix(c, uHorizon * 0.6, clamp(-vD.y * 3.0, 0.0, 1.0));
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff', 3);
  const hemi = new THREE.HemisphereLight('#fff', '#444', 0.8);
  scene.add(sun, hemi);
  scene.fog = new THREE.Fog('#fff', 25, 175);

  // ---- a hiker on the ridge (the subject for Magic Mask) ----
  const hiker = new THREE.Group();
  const dk = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.8 });
  const jacket = new THREE.MeshStandardMaterial({ color: '#b5462e', roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 16), jacket);
  body.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), dk);
  head.position.y = 1.62;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.22), dk);
  pack.position.set(0, 1.12, 0.2);
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.55, 4, 10), dk);
  legs.position.set(-0.09, 0.42, 0);
  const legs2 = legs.clone();
  legs2.position.x = 0.09;
  hiker.add(body, head, pack, legs, legs2);
  const HX = 6.5, HZ = -22;
  hiker.position.set(HX, terrainH(HX, HZ) - 0.05, HZ);
  hiker.scale.setScalar(1.6);
  scene.add(hiker);

  // ---- matte for the subject (Magic Mask) ----
  const maskRT = new THREE.WebGLRenderTarget(640, 360);
  const white = new THREE.MeshBasicMaterial({ color: '#fff' });

  // ---- camera moves ("clips") ----
  const shots = {
    // push along the valley toward the sun
    valley: (t) => { const z = 60 - t * 6; return { p: [Math.sin(t * 0.2) * 3, terrainH(0, z) + 9 + t * 0.3, z], l: [0, 9, z - 40] }; },
    // slow orbit around the peak
    orbit: (t) => { const a = 0.6 + t * 0.12; return { p: [Math.sin(a) * 55, 26, Math.cos(a) * 55 - 30], l: [0, 10, -30] }; },
    // low lateral over the lake
    lake: (t) => ({ p: [-18 + t * 3.2, 0.6, 18], l: [-6 + t * 3.2, 3, -40] }),
    // hiker on the ridge against the sky
    hiker: (t) => { const a = -0.25 + t * 0.03; return { p: [HX + Math.sin(a) * 9, hiker.position.y + 2.3, HZ + Math.cos(a) * 9], l: [HX, hiker.position.y + 2.4, HZ] }; },
  };

  let current = { shot: 'valley', preset: 'golden' };
  function render(t, shot = 'valley', preset = 'golden') {
    const P = PRESETS[preset];
    skyU.uHorizon.value.set(P.horizon);
    skyU.uZenith.value.set(P.zenith);
    skyU.uSunCol.value.set(P.sunCol);
    skyU.uSun.value.set(...P.sun).normalize();
    sun.color.set(P.sunCol);
    sun.intensity = P.sunI;
    sun.position.set(...P.sun).multiplyScalar(-100).multiplyScalar(-1);
    hemi.color.set(P.hemiSky);
    hemi.groundColor.set(P.hemiGround);
    scene.fog.color.set(P.fog);
    const s = shots[shot](t);
    camera.position.set(...s.p);
    camera.lookAt(...s.l);
    current = { shot, preset };
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    return P.exposure;
  }
  function renderMask() {
    scene.overrideMaterial = null;
    const vis = [terrain.visible, lake.visible, sky.visible];
    terrain.visible = lake.visible = sky.visible = false;
    const fogged = scene.fog;
    scene.fog = null;
    const prev = hiker.children.map((m) => m.material);
    hiker.children.forEach((m) => (m.material = white));
    renderer.setRenderTarget(maskRT);
    renderer.setClearColor('#000', 1);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    hiker.children.forEach((m, i) => (m.material = prev[i]));
    [terrain.visible, lake.visible, sky.visible] = vis;
    scene.fog = fogged;
  }
  return { rt, maskRT, render, renderMask, camera, scene, hiker };
}

// ---- grading ----
export function gradeUniforms(THREE) {
  return {
    tSrc: { value: null }, tMask: { value: null },
    uExposure: { value: 1 }, uLog: { value: 0 },
    uLift: { value: new THREE.Vector3(0, 0, 0) }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
    uSat: { value: 1 }, uContrast: { value: 1 }, uSplit: { value: -1 }, uTeal: { value: 0 },
    uMask: { value: 0 }, uMaskEdge: { value: 0 }, uTime: { value: 0 }, uBright: { value: 1 }, uVignette: { value: 0.0 },
  };
}

export const GRADE_GLSL = /* glsl */ `
  uniform sampler2D tSrc, tMask;
  uniform float uExposure, uLog, uSat, uContrast, uSplit, uTeal, uMask, uMaskEdge, uTime, uBright, uVignette;
  uniform vec3 uLift, uGamma, uGain;
  varying vec2 vUv;
  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
  vec3 toLin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
  vec3 toGam(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  vec3 graded(vec2 uv, out vec3 flatc) {
    vec3 lin = texture2D(tSrc, uv).rgb * uExposure;
    vec3 disp = toGam(aces(lin));
    // camera log: lifted blacks, rolled highlights, low saturation
    vec3 logc = 0.2 + 0.58 * disp;
    logc = mix(vec3(luma(logc)), logc, 0.55);
    vec3 base = mix(disp, logc, uLog);
    flatc = base;
    vec3 g = base * uGain + uLift * (1.0 - base);
    g = pow(max(g, 0.0), 1.0 / uGamma);
    g = (g - 0.45) * uContrast + 0.45;
    float l = luma(g);
    g = mix(vec3(l), g, uSat);
    // split-tone: teal shadows, warm highlights
    g += uTeal * (vec3(-0.06, 0.02, 0.07) * (1.0 - smoothstep(0.0, 0.5, l)) + vec3(0.07, 0.025, -0.05) * smoothstep(0.45, 1.0, l));
    return clamp(g, 0.0, 1.0);
  }
`;

export function gradeMaterial(THREE, uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: GRADE_GLSL + /* glsl */ `
      void main() {
        vec3 flatc;
        vec3 g = graded(vUv, flatc);
        // before / after wipe
        if (uSplit >= 0.0) {
          if (vUv.x < uSplit) g = flatc;
          g += vec3(1.0, 0.75, 0.4) * smoothstep(0.004, 0.0, abs(vUv.x - uSplit)) * 1.5;
        }
        // Magic Mask: shimmering matte over the subject
        if (uMask > 0.0) {
          float m = texture2D(tMask, vUv).r;
          vec2 px = vec2(1.0 / 640.0, 1.0 / 360.0) * 2.0;
          float e = abs(texture2D(tMask, vUv + vec2(px.x, 0.0)).r - texture2D(tMask, vUv - vec2(px.x, 0.0)).r)
                  + abs(texture2D(tMask, vUv + vec2(0.0, px.y)).r - texture2D(tMask, vUv - vec2(0.0, px.y)).r);
          float sweep = smoothstep(0.0, 0.05, uMaskEdge - (1.0 - vUv.y));
          vec3 tint = vec3(0.25, 0.75, 1.0);
          g = mix(g, g * 0.55 + tint * 0.45, m * uMask * 0.55 * sweep);
          g += tint * clamp(e, 0.0, 1.0) * 1.6 * uMask * sweep * (0.75 + 0.25 * sin(uTime * 12.0 + vUv.y * 80.0));
          g *= mix(1.0, 0.55 + 0.45 * m, uMask * 0.6);
        }
        vec2 d = vUv - 0.5;
        g *= 1.0 - uVignette * dot(d, d) * 2.0;
        gl_FragColor = vec4(toLin(g) * uBright, 1.0);
      }`,
    toneMapped: false,
  });
}

// Read back a small graded frame and draw an RGB parade into a 2D canvas.
export function makeScopes(env, uniforms) {
  const { THREE, renderer } = env;
  const w = 160, h = 90;
  const rt = new THREE.WebGLRenderTarget(w, h);
  const quadScene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: GRADE_GLSL + 'void main(){ vec3 f; vec3 g = graded(vUv, f); if (uSplit >= 0.0 && vUv.x < uSplit) g = f; gl_FragColor = vec4(g, 1.0); }',
  });
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const buf = new Uint8Array(w * h * 4);
  return {
    sample() {
      renderer.setRenderTarget(rt);
      renderer.render(quadScene, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
      renderer.setRenderTarget(null);
      return { buf, w, h };
    },
  };
}
