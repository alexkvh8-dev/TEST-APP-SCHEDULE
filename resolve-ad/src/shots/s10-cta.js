// 0:81–1:30 · CALL TO ACTION. The glass mark returns, turning slowly in its light,
// beside the offer: download free, upgrade to Studio, a button with a shine pass,
// the URL and the Blackmagic Design mark.

import * as E from '../lib/ease.js';
import { lerp, seg, clamp } from '../lib/util.js';
import { kText, line, text } from '../lib/type.js';
import { B, drawBMD } from '../lib/brand.js';
import { makeGlassLogo, makeLightBars } from '../lib/logo3d.js';
import { glowBackdrop } from '../lib/stage.js';
import { label } from '../lib/ui.js';
import { orbit, glide } from '../lib/cam.js';

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 100);
  const logo = makeGlassLogo(THREE);
  const bars = makeLightBars(THREE, 3);
  scene.add(logo, bars);
  const shot = { name: 'S10 CTA', start: 81, end: 90, scene, camera, useBg: true };
  const LX = -2.75;

  shot.update = (lt) => {
    // keep the glow behind the logo's on-screen position so the glass refracts it
    const lx = W * 0.5 + (LX / (11.2 * Math.tan(THREE.MathUtils.degToRad(15)) * (W / H))) * (W / 2);
    const breathe = 0.9 + 0.1 * Math.sin(lt * 1.2);
    glowBackdrop(env.bg, W, H, { base: '#04050a', glows: [[W * 0.45, H * 0.5, 1500, B.resolve, 0.85], [lx, H * 0.5, 430, '#fff3e2', 0.9 * breathe], [lx, H * 0.5, 240, '#ffffff', 0.75], [lx - 160, H * 0.62, 360, '#6fb6ff', 0.35], [lx + 160, H * 0.4, 340, '#ff8a4a', 0.35], [W * 0.78, H * 0.55, 900, '#3a2410', 0.35]] });
    const inP = E.outExpo(seg(lt, 0, 1.4));
    logo.position.set(LX, 0, lerp(-3, 0, inP));
    logo.rotation.set(0.06 * Math.sin(lt * 0.5), lerp(0.9, 0, inP) + 0.28 * Math.sin(lt * 0.45), 0);
    logo.userData.petals.forEach((m, i) => { const h = m.userData.home; m.position.set(h.x, h.y, h.z + 0.04 * Math.sin(lt * 1.6 + i * 2)); });
    bars.position.set(LX + lerp(1.4, -1.4, seg(lt, 0, 9, E.inOutSine)), 0, 0);
    orbit(camera, [0, 0, 0], lerp(11.6, 11.0, seg(lt, 0, 9, E.inOutSine)), 0, 0.02);

    const f = env.fg, x0 = 1000;
    line(f, 'DaVinci Resolve', { x: x0, y: 330, size: 72, weight: 300, align: 'left', t: lt - 0.8, tracking: -0.01 });
    kText(f, 'Download free.', { x: x0 - 4, y: 470, size: 132, weight: 900, t: lt - 1.3, dur: 0.6, stagger: 0.025, mode: 'rise', colorAt: (i) => (i === 13 ? B.orange : null) });
    line(f, 'Go further with DaVinci Resolve Studio', { x: x0, y: 560, size: 40, weight: 500, align: 'left', fill: '#b9bcc6', t: lt - 2.0, family: 'Inter', tracking: 0 });
    line(f, '$295  ·  one-time purchase, no subscription', { x: x0, y: 614, size: 40, weight: 600, align: 'left', fill: '#ffffff', t: lt - 2.4, family: 'Inter', tracking: 0 });
    // button
    const bp = E.outBack(1.7)(seg(lt, 2.9, 3.5));
    if (bp > 0) {
      const bw = 380, bh = 88, bx = x0, by = 680;
      f.save();
      f.translate(bx + bw / 2, by + bh / 2);
      f.scale(lerp(0.7, 1, bp), lerp(0.7, 1, bp));
      f.globalAlpha = clamp(bp * 2);
      f.fillStyle = B.orange; f.beginPath(); f.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); f.fill();
      for (const t0 of [4.4, 7.2]) {
        const sp = seg(lt, t0, t0 + 0.8, E.inOutCubic);
        if (sp > 0 && sp < 1) {
          f.save(); f.beginPath(); f.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); f.clip();
          const sx = lerp(-bw, bw, sp);
          const sh = f.createLinearGradient(sx - 90, 0, sx + 90, 0);
          sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.65)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
          f.fillStyle = sh; f.transform(1, 0, -0.35, 1, 0, 0); f.fillRect(-bw, -bh, bw * 2, bh * 2);
          f.restore();
        }
      }
      label(f, 'Download now', 0, 2, 34, '#111111', 700, 'center');
      f.restore();
    }
    line(f, 'blackmagicdesign.com/davinciresolve', { x: x0 + 2, y: 830, size: 32, weight: 500, align: 'left', fill: '#8f94a0', t: lt - 3.6, family: 'Inter', tracking: 0 });
    const bmd = seg(lt, 4.0, 4.8);
    if (bmd > 0) {
      f.save(); f.globalAlpha = bmd;
      drawBMD(f, W - 380, H - 90, 40, '#ffffff');
      text(f, 'Blackmagic Design', W - 350, H - 78, 30, 600, '#ffffff', 'left', 0, 'Inter');
      f.restore();
    }
    return {
      bloom: [0.42, 0.5, 0.9],
      streak: 0.45, streakThreshold: 0.95,
      flash: (1 - seg(lt, 0, 0.6, E.outCubic)) * 0.85,
      flashColor: [1, 0.86, 0.68],
      ca: 0.0006,
      fade: seg(lt, 8.7, 9.0) * 0.0,
    };
  };
  return shot;
}
