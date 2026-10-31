// Camera rig + motion helpers in Apple's register: slow, weighted, never overshooting.
import { lerp } from './util.js';
import { bezier } from './ease.js';

// Spherical orbit around a target: distance d, azimuth az, elevation el, optional roll.
export function orbit(camera, T, d, az, el, roll = 0) {
  camera.position.set(
    T[0] + d * Math.sin(az) * Math.cos(el),
    T[1] + d * Math.sin(el),
    T[2] + d * Math.cos(az) * Math.cos(el)
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(T[0], T[1], T[2]);
  if (roll) camera.rotateZ(roll);
}

export const logLerp = (a, b, p) => Math.exp(lerp(Math.log(a), Math.log(b), p));

// The house curves.
export const glide = bezier(0.45, 0, 0.2, 1);    // camera and product moves: slow start, long settle
export const settle = bezier(0.22, 0.61, 0.36, 1); // arrivals
export const leave = bezier(0.55, 0, 0.85, 0.35);  // departures

// Critically damped spring step (SwiftUI-style .smooth): reaches 1 with no overshoot.
export function smoothSpring(t, response = 0.45) {
  if (t <= 0) return 0;
  const w = (2 * Math.PI) / response;
  return 1 - Math.exp(-w * t) * (1 + w * t);
}

// Fade every material under an object (for HIG-style "fade, then relocate").
export function setOpacity(obj, a) {
  obj.traverse((o) => {
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
      const want = a < 0.999;
      if (m.transparent !== want && !m.userData.alwaysTransparent) { m.transparent = want; m.needsUpdate = true; }
      m.opacity = m.userData.baseOpacity * a;
      m.depthWrite = !want || a > 0.6;
    }
  });
  obj.visible = a > 0.002;
}
