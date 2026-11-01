// SHOT 7 · 0:51.5–1:00 · End card.
// The glossy sphere from Shot 6 turns like a coin as it flattens, and its material
// morphs from lit 3D to flat brand green. The flat disc is swapped (pixel-matched) for
// a 2D icon whose arcs draw on, the lockup slides into place with the wordmark
// emerging from behind the icon, then the line and the call to action land.

import { C, drawSpotifyIcon, roundRect } from '../lib/brand.js';
import * as E from '../lib/ease.js';
import { lerp, seg, clamp, TAU } from '../lib/util.js';
import { kText, font, measure } from '../lib/type.js';
import { SPHERE_R, CAM_END, sphereMaterial } from './s6-carousel.js';

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envStudio;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  camera.position.set(...CAM_END);
  camera.lookAt(0, 0, 0);
  const shot = { name: 'S7 Logo', start: 51.5, end: 60, scene, camera, useBg: true };

  scene.add(new THREE.AmbientLight('#ffffff', 0.3));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const glow = new THREE.PointLight(C.green, 2.5, 8, 2);
  glow.position.set(0, 0, 1.2);
  scene.add(glow);

  const mat = sphereMaterial(THREE);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), mat);
  scene.add(sphere);
  const green = new THREE.Color(C.green), black = new THREE.Color('#000');

  // On-screen radius of the sphere/disc (perspective, camera on axis).
  const R0 = (SPHERE_R / (CAM_END[2] * Math.tan(THREE.MathUtils.degToRad(17.5)))) * (H / 2);
  const SWAP = 1.95;

  shot.update = (lt, t) => {
    // ---- 3D: a slow coin turn as it flattens, material morphs to flat brand green ----
    scene.environmentRotation.set(0, t * 0.06, 0); // continuous with Shot 6's reflections
    const p = seg(lt, 0.2, 1.85, E.inOutCubic);
    const flatP = seg(lt, 0.9, 1.85, E.inOutSine);
    sphere.visible = lt < SWAP;
    const bulge = Math.sin(Math.PI * p) * 0.03;
    sphere.scale.set(SPHERE_R * (1 + bulge), SPHERE_R * (1 + bulge), SPHERE_R * lerp(1, 0.002, p));
    sphere.rotation.set(0, 0.75 * Math.sin(Math.PI * p), 0);
    // reflections die first, then the albedo hands over to flat emissive brand green
    const gloss = 1 - seg(lt, 0.6, 1.6, E.inOutSine);
    mat.color.copy(green).lerp(black, flatP);
    mat.emissiveIntensity = lerp(0.12, 1, flatP);
    mat.envMapIntensity = 0.8 * gloss;
    mat.clearcoat = gloss;
    mat.roughness = lerp(0.18, 1, 1 - gloss);
    mat.specularIntensity = gloss;
    glow.intensity = 2.5 * (1 - flatP);

    // ---- background ----
    const g = env.bg, f = env.fg;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    // open on Shot 6's exact background (ink + low green glow) and dissolve it to black
    const carry = 1 - seg(lt, 0.2, 1.6, E.inOutSine);
    if (carry > 0) {
      g.globalAlpha = carry;
      g.fillStyle = C.ink;
      g.fillRect(0, 0, W, H);
      const cg = g.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, W * 0.55);
      cg.addColorStop(0, 'rgba(30,215,96,0.22)');
      cg.addColorStop(1, 'rgba(30,215,96,0)');
      g.fillStyle = cg;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    const drift = (x, y, r, col, a) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col.replace('A', a));
      gr.addColorStop(1, col.replace('A', 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    };

    // ---- lockup geometry ----
    const WORD = 'Spotify', WSIZE = 200, ICON_R = 118, GAP = 44;
    const wordW = measure(f, WORD, WSIZE, 800, -0.03);
    const totalW = ICON_R * 2 + GAP + wordW;
    const iconX = W / 2 - totalW / 2 + ICON_R, LOCK_Y = 455;
    const mv = seg(lt, 3.15, 4.15, E.inOutCubic);
    const cx = lerp(W / 2, iconX, mv), cy = lerp(H / 2, LOCK_Y, mv);
    const r = lerp(R0, ICON_R, mv);

    const glowA = lerp(0.12, 0.2, seg(lt, 0.6, 1.8)) * (1 + 0.15 * Math.sin(lt * 2.2));
    drift(cx, cy, 700, 'rgba(30,215,96,A)', glowA);
    drift(W * (0.2 + 0.03 * Math.sin(lt * 0.3)), H * 0.85, 900, 'rgba(65,0,245,A)', 0.07 * seg(lt, 2.7, 4.7));
    drift(W * (0.85 - 0.03 * Math.sin(lt * 0.25)), H * 0.15, 800, 'rgba(245,115,160,A)', 0.05 * seg(lt, 2.7, 4.7));

    // gentle overall push-in for life on the end card
    const z = 1 + 0.03 * seg(lt, 3.2, 8.5, E.outSine);
    f.save();
    f.translate(W / 2, H / 2);
    f.scale(z, z);
    f.translate(-W / 2, -H / 2);

    if (lt >= SWAP) {
      // ripple when the arcs finish
      const rp = seg(lt, 2.75, 3.7);
      if (rp > 0 && rp < 1) {
        f.save();
        f.strokeStyle = C.green;
        f.globalAlpha = 0.6 * (1 - rp);
        f.lineWidth = lerp(8, 1, rp);
        f.beginPath();
        f.arc(cx, cy, r + 260 * E.outCubic(rp), 0, TAU);
        f.stroke();
        f.restore();
      }
      const arcs = [0, 1, 2].map((i) => E.inOutCubic(seg(lt, SWAP + 0.1 + i * 0.13, SWAP + 0.65 + i * 0.13)));
      drawSpotifyIcon(f, cx, cy, r * (1 + 0.03 * E.kick(lt - 2.7, 0.05, 5)), { arcs });

      // wordmark emerges from behind the icon
      f.save();
      f.beginPath();
      f.rect(cx + r + 8, cy - 200, W, 400);
      f.clip();
      kText(f, WORD, {
        x: iconX + ICON_R + GAP, y: LOCK_Y + WSIZE * 0.36, size: WSIZE, weight: 800, tracking: -0.03,
        mode: 'emerge', t: lt - 3.45, dur: 0.9, stagger: 0.04, ease: E.outExpo, mask: false, order: 'rtl',
      });
      f.restore();

      kText(f, 'Every moment has a sound.', {
        x: W / 2, y: 690, size: 56, weight: 700, color: C.mute, align: 'center', unit: 'word', stagger: 0.07, dur: 0.7, t: lt - 4.3, tracking: -0.01,
      });

      // call to action
      const cp = E.outBack(1.7)(seg(lt, 4.95, 5.6));
      if (cp > 0) {
        const bw = 560, bh = 108, bx = W / 2, by = 828;
        f.save();
        f.translate(bx, by);
        f.scale(lerp(0.6, 1, cp), lerp(0.6, 1, cp));
        f.globalAlpha = clamp(cp * 2);
        f.fillStyle = C.green;
        roundRect(f, -bw / 2, -bh / 2, bw, bh, bh / 2);
        f.fill();
        // shine sweep
        const sp = seg(lt, 6.4, 7.1, E.inOutCubic);
        if (sp > 0 && sp < 1) {
          f.save();
          roundRect(f, -bw / 2, -bh / 2, bw, bh, bh / 2);
          f.clip();
          const sx = lerp(-bw, bw, sp);
          const sh = f.createLinearGradient(sx - 120, 0, sx + 120, 0);
          sh.addColorStop(0, 'rgba(255,255,255,0)');
          sh.addColorStop(0.5, 'rgba(255,255,255,0.55)');
          sh.addColorStop(1, 'rgba(255,255,255,0)');
          f.fillStyle = sh;
          f.transform(1, 0, -0.35, 1, 0, 0);
          f.fillRect(-bw, -bh, bw * 2, bh * 2);
          f.restore();
        }
        f.font = font(34, 800);
        f.letterSpacing = '3.4px';
        f.fillStyle = '#000';
        f.textAlign = 'center';
        f.textBaseline = 'middle';
        f.globalAlpha = clamp((cp - 0.4) * 2);
        f.fillText('GET SPOTIFY FREE', 0, 3);
        f.restore();
      }
    }
    f.restore();

    return {
      bloom: [0.3, 0.45, 0.9],
      vignette: 0.3,
      fade: seg(lt, 8.15, 8.5, E.inQuad),
    };
  };
  return shot;
}
