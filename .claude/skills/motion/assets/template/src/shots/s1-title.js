// SHOT 1 · 0:00–0:04 · Kinetic title, then a dot that becomes Shot 2's sphere.
// Demonstrates: staggered per-glyph type with an accent full stop, a hold, a masked exit,
// and a SIZE/POSITION MATCH CUT: the 2D dot ends exactly where Shot 2's 3D sphere starts
// (Shot 2 publishes the sphere's on-screen centre and radius in env.shared.sphere).

import * as E from '../lib/ease.js';
import { lerp, seg } from '../lib/util.js';
import { kText } from '../lib/type.js';

const ACCENT = '#ffffff'; // replace with the brand accent

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  const shot = { name: 'S1 Title', start: 0, end: 4, scene, camera, useBg: true };

  shot.update = (lt) => {
    const g = env.bg, f = env.fg;
    g.fillStyle = '#0b0b0c';
    g.fillRect(0, 0, W, H);

    // in: per-glyph rise with expo ease-out and a 30 ms stagger; out: inverse, faster
    kText(f, 'Every frame matters', {
      x: W / 2, y: H / 2 + 40, size: 140, align: 'center',
      t: lt - 0.2, dur: 0.7, stagger: 0.03, ease: E.outExpo,
      out: lt - 2.4, outDur: 0.4, outStagger: 0.015,
    });

    // the dot: pops in (small overshoot), holds, then glides to the match position
    const target = env.shared.sphere; // { x, y, r } in pixels at Shot 2's first frame
    const pop = E.outBack(1.6)(seg(lt, 2.2, 2.6));
    const glide = seg(lt, 2.75, 3.85, E.inOutCubic);
    const x = lerp(W / 2, target.x, glide);
    const y = lerp(H / 2 + 120, target.y, glide);
    const r = lerp(14, target.r, glide) * pop;
    if (r > 0.1) {
      g.fillStyle = ACCENT;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    return { bloom: [0.3, 0.4, 0.9], vignette: 0.28 };
  };
  return shot;
}
