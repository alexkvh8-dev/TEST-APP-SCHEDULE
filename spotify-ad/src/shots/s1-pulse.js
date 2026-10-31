// SHOT 1 · 0:00–0:05 · "Every moment has a sound."
// A green dot falls in (gravity ease + stretch), lands (squash, ripple), pulses on the
// beat, hops along an arc to become the sentence's full stop, then anticipates and
// zooms through camera until the frame is solid Spotify Green -> match cut to Shot 2.

import { C } from '../lib/brand.js';
import * as E from '../lib/ease.js';
import { lerp, seg, clamp } from '../lib/util.js';
import { kText, measure } from '../lib/type.js';

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  const shot = { name: 'S1 Pulse', start: 0, end: 5, scene, camera, useBg: true };

  const L1 = 'Every moment', L2 = 'has a sound', SIZE = 156;
  const R0 = 44, RP = 27, GAP = 16;
  let w2 = 0;

  // Squash impulse: starts at full squash, rings out like a spring.
  const squash = (t, t0, amp) => {
    const d = t - t0;
    return d < 0 ? 0 : amp * Math.exp(-7 * d) * Math.cos(2 * Math.PI * 3.2 * d);
  };

  function ring(g, x, y, r, t, t0, { grow = 360, life = 1.1, w = 7, flat = 1, alpha = 0.9 } = {}) {
    const p = (t - t0) / life;
    if (p < 0 || p > 1) return;
    const e = E.outCubic(p);
    g.save();
    g.translate(x, y);
    g.scale(1, flat);
    g.strokeStyle = C.green;
    g.globalAlpha = alpha * (1 - E.inQuad(p));
    g.lineWidth = lerp(w, 1, e) / Math.max(flat, 0.3);
    g.beginPath();
    g.arc(0, 0, r + grow * e, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  shot.update = (t) => {
    const g = env.bg, f = env.fg;
    if (!w2) w2 = measure(f, L2, SIZE);
    const lineW = w2 + GAP + RP * 2;
    const l2x = W / 2 - lineW / 2;
    const base1 = 505, base2 = 680;
    const px = l2x + w2 + GAP + RP, py = base2 - RP; // where the full stop sits

    // ---- dot choreography ----
    let x = W / 2, y = H / 2, r = R0, sx = 1, sy = 1, visible = t >= 0.35;
    if (t < 0.85) {
      const p = seg(t, 0.35, 0.85);
      y = lerp(-90, H / 2, E.inQuad(p));       // gravity: accelerate into the landing
      sy = 1 + 0.5 * p;                          // stretch with speed
      sx = 1 / Math.sqrt(sy);                    // keep volume
    }
    const beat = E.kick(t - 1.35) * 0.17 + E.kick(t - 1.85) * 0.17 + E.kick(t - 3.35) * 0.1;
    if (t >= 2.1 && t < 3.9) {
      const p = seg(t, 2.1, 2.75, E.inOutCubic);
      x = lerp(W / 2, px, p);
      y = lerp(H / 2, py, p) + Math.sin(Math.PI * p) * 120; // swoops under the line, not a straight path
      r = lerp(R0, RP, p);
      const v = Math.sin(Math.PI * p);
      sy *= 1 + 0.25 * v;
      sx *= 1 - 0.12 * v;
    }
    if (t >= 3.9) {
      const p = seg(t, 3.9, 4.3, E.inOutCubic);
      x = lerp(px, W / 2, p);
      y = lerp(py, H / 2, p);
      r = lerp(RP, R0, p);
      r *= 1 - 0.2 * seg(t, 4.18, 4.45, E.outQuad); // anticipation: shrink before the push
      if (t >= 4.45) r = lerp(R0 * 0.8, 1300, seg(t, 4.45, 5.0, E.inExpo));
    }
    const sq = squash(t, 0.85, 0.36) + squash(t, 2.75, 0.24);
    if (t >= 0.85) { sx *= 1 + sq; sy *= 1 - sq; }
    r *= 1 + beat;

    // ---- background: black + breathing green glow ----
    g.fillStyle = C.black;
    g.fillRect(0, 0, W, H);
    if (visible) {
      const glowA = clamp(0.1 + beat * 1.2 + seg(t, 4.3, 5, E.inQuad) * 0.5);
      const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(r * 7, 300));
      gr.addColorStop(0, `rgba(30,215,96,${0.35 * glowA})`);
      gr.addColorStop(1, 'rgba(30,215,96,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    }
    // landing ripple lies on an implied floor (flattened ellipses), beat rings face camera
    ring(g, W / 2, H / 2 + R0 * 0.9, R0 * 0.5, t, 0.85, { flat: 0.26, grow: 560, life: 1.2, w: 9 });
    ring(g, W / 2, H / 2 + R0 * 0.9, R0, t, 0.97, { flat: 0.26, grow: 380, life: 1.1, w: 5, alpha: 0.6 });
    ring(g, W / 2, H / 2, R0, t, 1.35, { grow: 300 });
    ring(g, W / 2, H / 2, R0, t, 1.85, { grow: 340 });
    ring(g, px, py, RP, t, 2.75, { grow: 140, life: 0.8, w: 4, alpha: 0.7 });
    ring(g, W / 2, H / 2, R0, t, 4.5, { grow: 900, life: 0.5, w: 14 });

    // ---- type: slow push-in on the type layer only (parallax vs. background) ----
    f.save();
    const z = 1 + 0.025 * seg(t, 1.4, 4.0, E.outSine);
    f.translate(W / 2, H / 2);
    f.scale(z, z);
    f.translate(-W / 2, -H / 2);
    // the dot lives on the type layer while it's punctuation, so the two stay locked;
    // drawn first so glyphs pass in front of it
    if (visible) {
      f.fillStyle = C.green;
      f.beginPath();
      f.ellipse(x, y, r * sx, r * sy, 0, 0, Math.PI * 2);
      f.fill();
    }
    kText(f, L1, { x: W / 2, y: base1, size: SIZE, align: 'center', t: t - 1.55, dur: 0.8, stagger: 0.035, out: t - 3.6, outStagger: 0.022 });
    kText(f, L2, { x: l2x, y: base2, size: SIZE, align: 'left', t: t - 2.0, dur: 0.8, stagger: 0.035, out: t - 3.66, outStagger: 0.022 });
    f.restore();

    const zb = seg(t, 4.55, 4.98, E.inQuad) * 0.32;
    return {
      bloom: [0.35, 0.4, 0.9],
      zoomBlur: zb,
      zoomCenter: [x / W, 1 - y / H],
      ca: 0.0012 + zb * 0.01,
      vignette: lerp(0.4, 0.12, seg(t, 4.4, 4.9)),
    };
  };
  return shot;
}
