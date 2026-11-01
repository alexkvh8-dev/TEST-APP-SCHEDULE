// SHOT 5 · 0:29–0:37 · "Speak the language."
// The white frame Shot 4 expanded into contracts into a Translate card (reverse container
// transform). "Thank you" types in, then the translation slot-swaps through eight
// languages on the beat and lands on ありがとう. The four dots speak (Google's voice bars),
// merge into one blue dot and glide to centre at exactly the size of Shot 6's globe.

import * as E from '../lib/ease.js';
import { clamp, lerp, seg, noise1 } from '../lib/util.js';
import { kText, font, text, measure } from '../lib/type.js';
import { C, DOTS, rgba, paper, card, rr } from '../lib/brand.js';

const CARD = { x: 860, y: 190, w: 940, h: 700 };
const WORDS = [
  ['Gracias', 'Spanish'], ['Merci', 'French'], ['Danke', 'German'], ['Grazie', 'Italian'],
  ['धन्यवाद', 'Hindi'], ['감사합니다', 'Korean'], ['Obrigado', 'Portuguese'], ['ありがとう', 'Japanese'],
];
const SWAP0 = 2.0, SWAP_DT = 0.5;
const SRC = 'Thank you';
const TYPE_T = [0.95, 1.02, 1.1, 1.17, 1.24, 1.36, 1.43, 1.5, 1.56];

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  const shot = { name: 'S5 Translate', start: 29, end: 37, scene, camera, useBg: true };

  const wordIdx = (lt) => Math.min(WORDS.length - 1, Math.floor((lt - SWAP0) / SWAP_DT));

  function chip(g, x, y, w, label, filled, a = 1) {
    g.save();
    g.globalAlpha *= a;
    rr(g, x, y, w, 56, 28);
    if (filled) { g.fillStyle = C.blueTint; g.fill(); }
    else { g.strokeStyle = C.line; g.lineWidth = 2; g.stroke(); }
    g.restore();
    void label;
  }

  shot.update = (lt) => {
    const g = env.bg, f = env.fg;
    paper(g, W, H, lt + 29, { alpha: 0.075 * seg(lt, 0.3, 1.4, E.inOutSine) });

    // ---- card contracts out of the full-white frame ----
    const ce = seg(lt, 0.05, 1.0, E.smooth);
    const out = seg(lt, 6.9, 7.4, E.inCubic);
    let x = lerp(0, CARD.x, ce), y = lerp(0, CARD.y, ce), w = lerp(W, CARD.w, ce), h = lerp(H, CARD.h, ce);
    const rad = 36 * clamp(ce / 0.3);
    // speaker dots (needed for the exit anchor)
    const dotX0 = CARD.x + 150, dotY = CARD.y + 600;
    const blueX = dotX0;
    if (out < 1) {
      g.save();
      g.globalAlpha = 1 - seg(out, 0.55, 1);
      const s = 1 - out; // the card folds into the blue dot
      g.translate(blueX, dotY);
      g.scale(s, s);
      g.translate(-blueX, -dotY);
      card(g, x, y, w, h, rad, { glow: C.blue, glowA: 0.3, lift: ce });
      g.restore();
    }
    const ca = 1 - seg(lt, 6.8, 7.05);
    if (ca > 0 && ce > 0.6) {
      g.save();
      g.globalAlpha = ca;
      // language chips
      const chA = seg(lt, 0.7, 1.1, E.outQuint);
      g.globalAlpha = ca * chA;
      chip(g, CARD.x + 60, CARD.y + 48, 180, 'English', false);
      text(g, 'English', CARD.x + 150, CARD.y + 86, 27, 500, C.ink2, 'center', 0);
      // swap arrows
      g.save();
      g.translate(CARD.x + 290, CARD.y + 76);
      g.rotate(Math.PI * E.inOutCubic(seg(lt, 1.6, 2.0)));
      g.strokeStyle = C.mute;
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-14, -6); g.lineTo(14, -6); g.lineTo(8, -12);
      g.moveTo(14, 6); g.lineTo(-14, 6); g.lineTo(-8, 12);
      g.stroke();
      g.restore();
      // target chip with animated width and slot-swapped label
      const k = wordIdx(lt);
      const labelNow = k >= 0 ? WORDS[k][1] : 'Detect';
      const labelPrev = k >= 1 ? WORDS[k - 1][1] : 'Detect';
      const sw = k >= 0 ? seg(lt, SWAP0 + k * SWAP_DT, SWAP0 + k * SWAP_DT + 0.25, E.smooth) : 1;
      const wNow = measure(g, labelNow, 27, 500, 0) + 56, wPrev = measure(g, labelPrev, 27, 500, 0) + 56;
      const cw = lerp(wPrev, wNow, sw);
      chip(g, CARD.x + 340, CARD.y + 48, cw, '', true);
      g.save();
      rr(g, CARD.x + 340, CARD.y + 48, cw, 56, 28);
      g.clip();
      const ccx = CARD.x + 340 + cw / 2;
      if (sw < 1) text(g, labelPrev, ccx, CARD.y + 86 - sw * 40, 27, 500, C.blueDeep, 'center', 0);
      g.globalAlpha *= clamp(sw * 1.5);
      text(g, labelNow, ccx, CARD.y + 86 + (1 - sw) * 40, 27, 500, C.blueDeep, 'center', 0);
      g.restore();
      g.globalAlpha = ca;

      // source text types in
      const n = TYPE_T.filter((v) => v <= lt).length;
      const typed = SRC.slice(0, n);
      text(g, typed, CARD.x + 64, CARD.y + 250, 76, 400, C.ink, 'left', -0.01);
      const since = lt - (n ? TYPE_T[n - 1] : 0.9);
      const blink = since < 0.4 ? 1 : clamp(Math.cos(((since - 0.4) * Math.PI * 2) / 1.0) * 4 + 0.5);
      const caret = seg(lt, 0.85, 0.95) * (1 - seg(lt, 1.9, 2.0)) * blink;
      if (caret > 0.01) {
        g.fillStyle = rgba(C.blue, caret);
        g.fillRect(CARD.x + 64 + measure(g, typed, 76, 400, -0.01) + 4, CARD.y + 192, 4, 72);
      }
      // divider
      const dv = seg(lt, 1.6, 2.05, E.outExpo);
      g.fillStyle = C.line;
      g.fillRect(CARD.x + 64, CARD.y + 320, (CARD.w - 128) * dv, 2);

      // translation roulette
      const ty = CARD.y + 480, size = 120;
      g.save();
      g.beginPath();
      g.rect(CARD.x + 40, ty - size * 1.05, CARD.w - 80, size * 1.45);
      g.clip();
      if (k >= 0) {
        const tIn = lt - (SWAP0 + k * SWAP_DT);
        const pin = E.outExpo(clamp(tIn / 0.4));
        const final = k === WORDS.length - 1;
        const pop = final ? 1 + 0.05 * Math.sin(Math.PI * seg(lt, SWAP0 + k * SWAP_DT + 0.1, SWAP0 + k * SWAP_DT + 0.6)) : 1;
        if (k >= 1 && tIn < 0.3) {
          const po = E.inCubic(clamp(tIn / 0.24));
          g.save();
          g.globalAlpha *= 1 - po;
          g.filter = `blur(${(po * 8).toFixed(1)}px)`;
          text(g, WORDS[k - 1][0], CARD.x + 64, ty - po * size * 0.6, size, 500, C.blue, 'left', -0.01);
          g.restore();
        }
        g.save();
        g.globalAlpha *= clamp(pin * 1.4);
        if (pin < 0.98) g.filter = `blur(${((1 - pin) * 10).toFixed(1)}px)`;
        g.translate(CARD.x + 64, ty + (1 - pin) * size * 0.6);
        g.scale(pop, pop);
        text(g, WORDS[k][0], 0, 0, size, 500, C.blue, 'left', -0.01);
        g.restore();
      }
      g.restore();
      // romanisation hint under the final word
      const rh = seg(lt, 5.75, 6.15, E.outExpo);
      if (rh > 0) {
        g.save();
        g.globalAlpha *= rh;
        text(g, 'Arigatō', CARD.x + 64, CARD.y + 545 + (1 - rh) * 10, 30, 400, C.mute, 'left', 0);
        g.restore();
      }
      // speaker glyph
      const sa = seg(lt, 5.6, 5.9, E.outBack(1.6));
      if (sa > 0) {
        g.save();
        g.globalAlpha *= clamp(sa);
        g.translate(CARD.x + 86, dotY);
        g.scale(sa, sa);
        g.fillStyle = C.mute;
        g.beginPath();
        g.moveTo(-14, -7); g.lineTo(-6, -7); g.lineTo(4, -16); g.lineTo(4, 16); g.lineTo(-6, 7); g.lineTo(-14, 7);
        g.closePath();
        g.fill();
        g.strokeStyle = C.mute;
        g.lineWidth = 3;
        g.lineCap = 'round';
        g.beginPath();
        g.arc(6, 0, 10, -0.8, 0.8);
        g.stroke();
        g.restore();
      }
      g.restore();
    }

    // ---- the four dots: pop, speak, merge, glide to the globe ----
    const target = env.shared.globe; // {x, y, r} = Shot 6 first frame
    const merge = seg(lt, 6.95, 7.35, E.inOutCubic);
    const glide = seg(lt, 7.2, 7.96, E.smooth);
    const speak = seg(lt, 5.95, 6.15) * (1 - seg(lt, 6.6, 6.85));
    for (let i = 3; i >= 0; i--) {
      const ap = E.outBack(1.8)(seg(lt, 5.65 + i * 0.05, 5.95 + i * 0.05));
      if (ap <= 0) continue;
      const r0 = 11;
      let dx = lerp(dotX0 + i * 30, blueX, merge);
      let dy = dotY;
      let rr0 = r0 * ap * (i === 0 ? 1 : 1 - 0.6 * merge);
      if (i > 0 && merge >= 1) continue;
      if (i === 0) {
        dx = lerp(dx, target.x, glide);
        dy = lerp(dy, target.y, glide) - Math.sin(Math.PI * glide) * 40;
        rr0 = lerp(rr0, target.r, glide);
      }
      const hb = speak * 48 * Math.abs(noise1(lt * 7.5 + i * 1.9, i + 3));
      g.fillStyle = DOTS[i];
      rr(g, dx - rr0, dy - rr0 - hb / 2, rr0 * 2, rr0 * 2 + hb, rr0);
      g.fill();
    }

    // ---- headline ----
    const tagA = seg(lt, 0.95, 1.35, E.outExpo) * (1 - seg(lt, 6.6, 6.9));
    if (tagA > 0) {
      f.save();
      f.globalAlpha = tagA;
      f.fillStyle = C.blue;
      f.beginPath();
      f.arc(134, 297, 9, 0, Math.PI * 2);
      f.fill();
      text(f, 'Google Translate', 156, 308, 32, 500, C.mute, 'left', 0);
      f.restore();
    }
    kText(f, 'Speak the', { x: 120, y: 430, size: 124, weight: 500, t: lt - 1.05, stagger: 0.025, out: lt - 6.6, outDur: 0.32, outStagger: 0.01 });
    kText(f, 'language.', {
      x: 120, y: 568, size: 124, weight: 500, t: lt - 1.3, stagger: 0.025, out: lt - 6.67, outDur: 0.32, outStagger: 0.01,
      colorAt: (i) => (i === 8 ? C.blue : null),
    });
    kText(f, 'Say thank you like a local.', {
      x: 124, y: 650, size: 38, weight: 400, color: C.mute, unit: 'word', mode: 'fade', t: lt - 1.7, stagger: 0.06, dur: 0.6,
      out: lt - 6.55, outDur: 0.3, outStagger: 0.01,
    });

    return { bloom: [0, 0.4, 0.9], grain: 0.014, vignette: 0.05, ca: 0.0005 };
  };
  return shot;
}
