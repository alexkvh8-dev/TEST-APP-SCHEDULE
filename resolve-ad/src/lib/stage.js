// Shared scene pieces: UI panels that glow like real screens and float in 3D, viewer
// planes running the grading shader, and a few backdrop helpers.

import { gradeUniforms, gradeMaterial } from './footage.js';

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function roundMask(THREE, w, h, r) {
  const c = canvas(256, Math.round(256 * h / w)), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(0, 0, c.width, c.height, r * 256 / w); g.fill();
  const t = new THREE.CanvasTexture(c);
  return t;
}

/** A UI "screen": canvas-driven, emissive like a display, glossy like glass. */
export function uiPanel(THREE, cw, ch, worldW, { radius = 18, glass = true } = {}) {
  const c = canvas(cw, ch), g = c.getContext('2d', { willReadFrequently: true });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const worldH = worldW * ch / cw;
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#000000', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1,
    roughness: 0.08, metalness: 0, clearcoat: glass ? 1 : 0, clearcoatRoughness: 0.05, envMapIntensity: 0.35,
    alphaMap: roundMask(THREE, cw, ch, radius), transparent: true, alphaTest: 0.02,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldH), mat);
  // a thin glass edge slab behind the screen (catches rim light)
  const edge = new THREE.Mesh(
    new THREE.PlaneGeometry(worldW * 1.006, worldH * 1.01),
    new THREE.MeshPhysicalMaterial({ color: '#30333a', metalness: 0.6, roughness: 0.25, alphaMap: roundMask(THREE, cw, ch, radius), transparent: true })
  );
  edge.position.z = -0.006;
  mesh.add(edge);
  return {
    mesh, g, tex, cw, ch, worldW, worldH, mat,
    commit() { tex.needsUpdate = true; },
    // local-space centre for a pixel rect on this panel (for overlays like viewers)
    rectToLocal(x, y, w, h) {
      return { x: ((x + w / 2) / cw - 0.5) * worldW, y: (0.5 - (y + h / 2) / ch) * worldH, w: (w / cw) * worldW, h: (h / ch) * worldH };
    },
  };
}

/** A viewer that plays the footage through the grading shader. */
export function viewer(THREE, footage, w, h) {
  const u = gradeUniforms(THREE);
  u.tSrc.value = footage.rt.texture;
  u.tMask.value = footage.maskRT.texture;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), gradeMaterial(THREE, u));
  return { mesh, u };
}

/** Place an overlay mesh onto a panel at a pixel rect (slightly in front). */
export function mountOn(panel, mesh, x, y, w, h, dz = 0.004) {
  const r = panel.rectToLocal(x, y, w, h);
  mesh.position.set(r.x, r.y, dz);
  mesh.scale.set(r.w / mesh.geometry.parameters.width, r.h / mesh.geometry.parameters.height, 1);
  panel.mesh.add(mesh);
}

export function glowBackdrop(g, W, H, { base = '#08090b', glows = [] } = {}) {
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  for (const [x, y, r, col, a] of glows) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const n = parseInt(col.slice(1), 16);
    gr.addColorStop(0, `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }
}
