// SHOT 7 · 0:47–1:00 · End card.
// The blue dot the world compressed into releases its three siblings (bookend of the
// opener), the dots breathe once, then each one paints its segment of the G (annular
// sweeps revealing the exact logo paths, the dot riding the stroke head). The G glides
// into the wordmark, the search box grows beneath it, and the line types itself:
// the google.com homepage as the call to action. Hold with a slow push.

import * as E from '../lib/ease.js';
import { clamp, lerp, seg } from '../lib/util.js';
import { font, text, measure } from '../lib/type.js';
import { C, DOTS, G_ICON, G_SEGS, WORDMARK, P, rgba, mix, paper, card, rr, magnifier } from '../lib/brand.js';

const R = 30;
const GC = { x: 960, y: 540, size: 300 };
const WM = { x: 660, y: 318, k: 600 / 512 }; // wordmark top-left and scale
const BARY = 612, BARW = 900, BARH = 92;
const LINE = 'What will you ask next?';
const TYPE_T = (() => { const o = []; let t = 6.45; for (let i = 0; i < LINE.length; i++) { o.push(t); t += 0.062 + ((i * 7) % 5) * 0.012 + (LINE[i] === ' ' ? 0.04 : 0); } return o; })();

// dot index (blue, red, yellow, green) -> G segment key
const SEG_OF = ['blue', 'red', 'yellow', 'green'];

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  const shot = { name: 'S7 End', start: 47, end: 60, scene, camera, useBg: true };

  const k = GC.size / G_ICON.h;
  const rOut = G_ICON.rOut * k, rIn = G_ICON.rIn * k, rc = (rOut + rIn) / 2;
  const at = (a) => [GC.x + Math.cos(a) * rc, GC.y + Math.sin(a) * rc];
  const segBy = Object.fromEntries(G_SEGS.map((s) => [s.key, s]));
  // wordmark "G" centre and height on screen
  const wmG = WORDMARK.letters[0];
  const WMG = { x: WM.x + ((wmG.x0 + wmG.x1) / 2) * WM.k, y: WM.y + 65.2 * WM.k, h: 130 * WM.k };

  function annular(g, a0, a1) {
    g.beginPath();
    g.arc(GC.x, GC.y, rOut + 3, a0, a1, true);
    g.arc(GC.x, GC.y, rIn - 1, a1, a0, false);
    g.closePath();
  }

  function drawIconPart(g, key, color) {
    g.save();
    g.translate(GC.x - G_ICON.cx * k, GC.y - G_ICON.cy * k);
    g.scale(k, k);
    g.fillStyle = color;
    g.fill(P(G_ICON[key]));
    g.restore();
  }

  function drawWordmark(g, alphaFor, offFor) {
    for (let i = 0; i < WORDMARK.letters.length; i++) {
      const L = WORDMARK.letters[i];
      const a = alphaFor(i);
      if (a <= 0.001) continue;
      const [dy, s] = offFor(i);
      const cx = WM.x + ((L.x0 + L.x1) / 2) * WM.k, cy = WM.y + 90 * WM.k;
      g.save();
      g.globalAlpha *= a;
      g.translate(cx, cy + dy);
      g.scale(s, s);
      g.translate(-cx, -cy);
      g.translate(WM.x, WM.y);
      g.scale(WM.k, WM.k);
      g.fillStyle = L.color;
      g.fill(P(L.d));
      g.restore();
    }
  }

  shot.update = (lt, t) => {
    const g = env.bg, f = env.fg;
    paper(g, W, H, t, { alpha: 0.075 });

    const push = 1 + 0.035 * seg(lt, 6.0, 13.0, E.inOutSine);
    g.save();
    g.translate(W / 2, H / 2 - 40);
    g.scale(push, push);
    g.translate(-W / 2, -(H / 2 - 40));

    // ================= dots -> G =================
    const sweepEnd = 3.35, barEnd = 3.75;
    const gDone = lt >= barEnd;
    const toWm = seg(lt, 4.3, 5.1, E.smooth);
    const iconA = 1 - seg(lt, 4.95, 5.15);
    if (iconA > 0) {
      // icon transform toward the wordmark G
      const s = lerp(1, WMG.h / GC.size, toWm);
      const ox = lerp(0, WMG.x - GC.x, toWm), oy = lerp(0, WMG.y - GC.y, toWm);
      g.save();
      g.globalAlpha = iconA;
      g.translate(GC.x + ox, GC.y + oy);
      g.scale(s, s);
      g.translate(-GC.x, -GC.y);
      const tint = 0; // colours stay true; the swap to the blue wordmark G is a short crossfade
      for (const S of G_SEGS) {
        const di = SEG_OF.indexOf(S.key);
        const t0 = 2.45 + di * 0.06;
        const p = seg(lt, t0, sweepEnd - (3 - di) * 0.02, E.inOutCubic);
        const color = mix(S.color, C.blue, tint);
        if (p <= 0) continue;
        if (gDone || (p >= 1 && S.key !== 'blue')) {
          drawIconPart(g, S.key, color);
          continue;
        }
        // annular sweep (clip), then for blue the crossbar wipe as a second pass
        g.save();
        annular(g, S.a0 + 0.25, lerp(S.a0, S.a1, p) - (p >= 1 ? 0.25 : 0));
        g.clip();
        drawIconPart(g, S.key, color);
        g.restore();
        if (S.key === 'blue') {
          const bp = seg(lt, sweepEnd, barEnd, E.inOutCubic);
          if (bp > 0) {
            const x0 = lerp(GC.x + rc, GC.x - 2, bp);
            g.save();
            g.beginPath();
            g.rect(x0, GC.y - 40, GC.x + rOut + 8 - x0, 80);
            g.clip();
            drawIconPart(g, S.key, color);
            g.restore();
          }
        }
      }
      g.restore();
    }

    // dots: emerge, breathe, travel to their segment, ride the sweep
    for (let i = 3; i >= 0; i--) {
      const S = segBy[SEG_OF[i]];
      const em = clamp(E.spring(lt - (0.1 + i * 0.07), 2.0, 0.6), 0, 1.15);
      let x = lerp(GC.x, GC.x + (i - 1.5) * 96, em), y = GC.y;
      let r = i === 0 ? R : R * clamp(0.55 + em * 0.5, 0, 1);
      const amp = 16 * seg(lt, 0.9, 1.2, E.inOutSine) * (1 - seg(lt, 1.75, 2.05, E.inOutSine));
      y -= amp * (0.5 - 0.5 * Math.cos(2 * Math.PI * (lt - 0.9) - i * 0.8));
      const tr = seg(lt, 2.05 + i * 0.04, 2.5 + i * 0.04, E.smooth);
      const [sx, sy] = at(S.a0);
      x = lerp(x, sx, tr);
      y = lerp(y, sy, tr) - Math.sin(Math.PI * tr) * 50;
      r = lerp(r, rOut - rc + 0.5, tr);
      const t0 = 2.45 + SEG_OF.indexOf(S.key) * 0.06;
      const p = seg(lt, t0, sweepEnd - (3 - i) * 0.02, E.inOutCubic);
      let alpha = 1;
      if (p > 0) {
        const [hx, hy] = at(lerp(S.a0, S.a1, p));
        x = hx; y = hy;
        if (S.key !== 'blue') alpha = 1 - seg(p, 0.82, 1.0);
        else {
          const bp = seg(lt, sweepEnd, barEnd, E.inOutCubic);
          r = lerp(r, 24.2 * k, seg(bp, 0, 0.3));
          x = Math.max(lerp(GC.x + rc, GC.x - 2, bp), GC.x + r);
          y = lerp(hy, GC.y + 0.43 * k, seg(bp, 0, 0.3));
          alpha = 1 - seg(bp, 0.72, 1.0);
        }
      }
      if (alpha <= 0 || r <= 0.2) continue;
      g.save();
      g.globalAlpha = alpha;
      g.fillStyle = DOTS[i];
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    // shine across the finished G
    const sh = seg(lt, 3.8, 4.4, E.inOutSine);
    if (sh > 0 && sh < 1 && iconA > 0) {
      g.save();
      g.translate(GC.x - G_ICON.cx * k, GC.y - G_ICON.cy * k);
      g.scale(k, k);
      const clipP = new Path2D();
      for (const S of G_SEGS) clipP.addPath(P(G_ICON[S.key]));
      g.clip(clipP);
      const bx = lerp(-120, 380, sh);
      const lg = g.createLinearGradient(bx - 60, 0, bx + 60, 60);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg;
      g.fillRect(-50, -50, 400, 400);
      g.restore();
    }

    // ================= wordmark =================
    drawWordmark(g, (i) => (i === 0 ? seg(lt, 4.95, 5.15) : seg(lt, 4.8 + i * 0.06, 5.2 + i * 0.06)),
      (i) => {
        if (i === 0) return [0, 1];
        const p = E.outQuint(seg(lt, 4.8 + i * 0.06, 5.45 + i * 0.06));
        return [(1 - p) * 46, 0.92 + 0.08 * p];
      });
    // final shine across the wordmark
    const sw = seg(lt, 9.6, 10.5, E.inOutSine);
    if (sw > 0 && sw < 1) {
      g.save();
      g.translate(WM.x, WM.y);
      g.scale(WM.k, WM.k);
      const clipP = new Path2D();
      for (const L of WORDMARK.letters) clipP.addPath(P(L.d));
      g.clip(clipP);
      const bx = lerp(-150, 660, sw);
      const lg = g.createLinearGradient(bx - 70, 0, bx + 70, 80);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0.5)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg;
      g.fillRect(-20, -20, 560, 220);
      g.restore();
    }

    // ================= search box =================
    const bg = seg(lt, 5.3, 6.05, E.snap);
    if (bg > 0) {
      const w = lerp(BARH, BARW, bg);
      const x = W / 2 - w / 2, y = BARY - BARH / 2;
      g.save();
      g.globalAlpha = clamp(bg * 3);
      card(g, x, y, w, BARH, BARH / 2, { lift: 1, border: bg });
      const mg = seg(lt, 5.75, 6.1, E.outBack(1.6));
      if (mg > 0) magnifier(g, x + 50, BARY, 30 * mg);
      for (let i = 0; i < 4; i++) {
        const dp = E.outBack(2)(seg(lt, 5.8 + i * 0.05, 6.1 + i * 0.05));
        if (dp <= 0) continue;
        const br = 1 + 0.12 * Math.max(0, Math.sin((lt - 6.5) * Math.PI * 2 * 0.8 - i * 0.7)) * seg(lt, 8.3, 8.8);
        g.fillStyle = DOTS[i];
        g.beginPath();
        g.arc(x + w - 62 - (3 - i) * 26, BARY, 8 * dp * br, 0, Math.PI * 2);
        g.fill();
      }
      // typing
      const n = TYPE_T.filter((v) => v <= lt).length;
      const typed = LINE.slice(0, n);
      text(g, typed, x + 96, BARY + 13, 37, 400, C.ink, 'left', 0);
      const since = lt - (n ? TYPE_T[n - 1] : 6.3);
      const blink = since < 0.45 ? 1 : clamp(Math.cos(((since - 0.45) * Math.PI * 2) / 1.0) * 4 + 0.5);
      const caret = seg(lt, 6.25, 6.35) * blink;
      if (caret > 0.01) {
        g.fillStyle = rgba(C.blue, caret);
        g.fillRect(x + 96 + measure(g, typed, 37, 400, 0) + 3, BARY - 23, 3, 46);
      }
      g.restore();
    }
    // buttons
    const bt = seg(lt, 6.0, 6.5, E.outQuint);
    if (bt > 0) {
      const labels = ['Google Search', "I'm Feeling Lucky"];
      const ws = labels.map((s) => measure(g, s, 26, 500, 0) + 56);
      let x = W / 2 - (ws[0] + ws[1] + 20) / 2;
      labels.forEach((s, i) => {
        const p = E.outQuint(seg(lt, 6.0 + i * 0.07, 6.55 + i * 0.07));
        g.save();
        g.globalAlpha = p;
        rr(g, x, 712 + (1 - p) * 16, ws[i], 60, 10);
        g.fillStyle = C.surface;
        g.fill();
        g.strokeStyle = rgba(C.line, 0.7);
        g.lineWidth = 1.5;
        g.stroke();
        text(g, s, x + ws[i] / 2, 751 + (1 - p) * 16, 26, 500, C.ink2, 'center', 0);
        g.restore();
        x += ws[i] + 20;
      });
    }
    g.restore();

    // small print, outside the push
    const sp = seg(lt, 8.5, 9.2);
    if (sp > 0) {
      f.save();
      f.globalAlpha = sp;
      text(f, 'Unofficial spec ad · Not produced or endorsed by Google', W / 2, 1032, 20, 400, '#9AA0A6', 'center', 0.01);
      f.restore();
    }
    void font;
    return { bloom: [0, 0.4, 0.9], grain: 0.014, vignette: 0.05, ca: 0.0005 };
  };
  return shot;
}
