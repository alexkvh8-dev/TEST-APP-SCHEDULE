// SHOT 2 · 0:04–0:08 · Hero object under studio light.
// Opens on a flat, unlit disc that matches Shot 1's dot pixel for pixel, then the
// material hands over from flat emissive to lit glossy (material morph) while the camera
// eases back and the environment rotates (light sweep across the surface).

import * as E from '../lib/ease.js';
import { lerp, seg } from '../lib/util.js';

const ACCENT = '#ffffff';
const R = 0.6, CAM_Z = 5;

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envStudio;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  const shot = { name: 'S2 Object', start: 4, end: 8, scene, camera, useBg: true };

  scene.add(new THREE.AmbientLight('#ffffff', 0.2));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-3, 4, 5);
  scene.add(key);

  // NOTE (three r169): a material that inherits scene.environment ignores its own
  // envMapIntensity (scene.environmentIntensity wins). Assign envMap explicitly when a
  // material needs its own reflection strength, and keep envMapRotation in step.
  const mat = new THREE.MeshPhysicalMaterial({ color: ACCENT, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  mat.envMap = env.envStudio;
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), mat);
  sphere.scale.setScalar(R);
  scene.add(sphere);
  const white = new THREE.Color(ACCENT), black = new THREE.Color('#000');

  // publish where the sphere sits on screen at our first frame (Shot 1 reads this)
  const rPx = (R / (CAM_Z * Math.tan(THREE.MathUtils.degToRad(17.5)))) * (H / 2);
  env.shared.sphere = { x: W / 2, y: H / 2, r: rPx };

  shot.update = (lt, t) => {
    const g = env.bg;
    g.fillStyle = '#0b0b0c';
    g.fillRect(0, 0, W, H);

    // flat -> lit: at lt = 0 the sphere renders as a flat disc of exactly ACCENT
    const lit = seg(lt, 0.15, 1.2, E.inOutSine);
    mat.color.copy(black).lerp(white, lit);
    mat.emissive.copy(white);
    mat.emissiveIntensity = 1 - lit;
    mat.clearcoat = lit;
    mat.specularIntensity = lit;
    mat.envMapIntensity = lit;

    const env_rot = t * 0.15;
    mat.envMapRotation.set(0, env_rot, 0);

    const back = seg(lt, 0.3, 3.6, E.inOutCubic); // one long, eased move: no stop-start
    camera.position.set(0, lerp(0, 0.4, back), lerp(CAM_Z, 7.5, back));
    camera.lookAt(0, 0, 0);
    sphere.rotation.y = lt * 0.3;

    // sphere must be exactly centred at lt = 0 for the match, so it only drifts later
    sphere.position.y = 0.06 * Math.sin(Math.max(0, lt - 0.3) * 1.4) * seg(lt, 0.3, 1.2);
    return { bloom: [0.3, 0.4, 0.9], vignette: 0.28, fade: seg(lt, 3.6, 4.0) };
  };
  return shot;
}
