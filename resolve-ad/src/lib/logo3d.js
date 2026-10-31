// The DaVinci Resolve mark as a physical object: a polished metal frame and three
// solid-glass petals with real refraction (transmission), thickness, absorption tint and
// spectral dispersion, sitting in front of emissive light bars so the bending is visible.

import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RESOLVE_PATH, PETAL_PATHS, B } from './brand.js';

function shapesFrom(THREE, d) {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}"/></svg>`);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}

export function makeGlassLogo(THREE) {
  const root = new THREE.Group();
  const S = 0.125; // 24 units -> 3.0 world units
  const toWorld = (geo) => { geo.translate(-12, -12, 0); geo.scale(S, -S, S); geo.computeVertexNormals(); return geo; };

  const frameGeo = toWorld(new THREE.ExtrudeGeometry(shapesFrom(THREE, RESOLVE_PATH), { depth: 1.0, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.18, bevelSegments: 6, curveSegments: 48 }));
  frameGeo.translate(0, 0, -0.06);
  const frame = new THREE.Mesh(frameGeo, new THREE.MeshPhysicalMaterial({ color: '#d7dbe2', metalness: 1, roughness: 0.14, clearcoat: 0.6, envMapIntensity: 1.2 }));
  // frosted navy glass plate behind the petals
  const pw = 22.6 * S, pr = 4.6 * S, ps = new THREE.Shape();
  ps.moveTo(-pw / 2 + pr, -pw / 2);
  ps.lineTo(pw / 2 - pr, -pw / 2); ps.absarc(pw / 2 - pr, -pw / 2 + pr, pr, -Math.PI / 2, 0, false);
  ps.lineTo(pw / 2, pw / 2 - pr); ps.absarc(pw / 2 - pr, pw / 2 - pr, pr, 0, Math.PI / 2, false);
  ps.lineTo(-pw / 2 + pr, pw / 2); ps.absarc(-pw / 2 + pr, pw / 2 - pr, pr, Math.PI / 2, Math.PI, false);
  ps.lineTo(-pw / 2, -pw / 2 + pr); ps.absarc(-pw / 2 + pr, -pw / 2 + pr, pr, Math.PI, Math.PI * 1.5, false);
  const plateGeo = new THREE.ExtrudeGeometry(ps, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 24 });
  const plate = new THREE.Mesh(plateGeo, new THREE.MeshPhysicalMaterial({
    color: B.resolve, roughness: 0.35, transmission: 0.8, thickness: 0.3, ior: 1.45, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.2,
  }));
  plate.position.z = -0.12;
  const petals = PETAL_PATHS.map((d, i) => {
    const geo = toWorld(new THREE.ExtrudeGeometry(shapesFrom(THREE, d), { depth: 1.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.32, bevelSegments: 10, curveSegments: 48 }));
    geo.computeBoundingBox();
    const c = new THREE.Vector3();
    geo.boundingBox.getCenter(c);
    geo.translate(-c.x, -c.y, -c.z);
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffffff').lerp(new THREE.Color(B.petals[i]), 0.5), metalness: 0, roughness: 0.05, transmission: 1, thickness: 0.9, ior: 1.5,
      dispersion: 3, attenuationColor: B.petals[i], attenuationDistance: 0.32, clearcoat: 1, clearcoatRoughness: 0.02,
      specularIntensity: 1, envMapIntensity: 1.2, iridescence: 0.25, iridescenceIOR: 1.3,
    }));
    m.userData.home = c.clone();
    m.position.copy(c);
    return m;
  });
  // halo around the mark (transparent, so it's not refracted; the refracted glow lives in the backdrop)
  const bc = document.createElement('canvas');
  bc.width = bc.height = 256;
  const bg = bc.getContext('2d');
  const gr = bg.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,235,210,0.55)'); gr.addColorStop(1, 'rgba(255,220,180,0)');
  bg.fillStyle = gr; bg.fillRect(0, 0, 256, 256);
  const backlight = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), color: new THREE.Color(0.9, 0.8, 0.7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  backlight.position.z = -0.5;
  root.add(backlight, plate, frame, ...petals);
  root.userData.backlight = backlight;
  Object.assign(root.userData, { frame, plate, petals });
  return root;
}

// Bright bars behind glass so refraction and dispersion read on camera.
export function makeLightBars(THREE, n = 3, colors = ['#ffffff', '#ffc070', '#9fd0ff']) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const c = new THREE.Color(colors[i % colors.length]).multiplyScalar(1.8);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 2.6), new THREE.MeshBasicMaterial({ color: c }));
    m.position.set((i - (n - 1) / 2) * 1.3, 0.2, -1.4 - i * 0.3);
    m.rotation.z = 0.32;
    g.add(m);
  }
  return g;
}
