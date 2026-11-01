// SHOT 1 · 0:00–0:12.5 · "It all starts with a question."
// The four brand dots drop in (gravity, squash and stretch), breathe in Google's
// "listening" wave, then slide into a search box that grows out from behind them.
// A query types itself, suggestions open, Enter is pressed, and a bento of results rises
// with coloured glow shadows. The cursor picks the Maps card, which expands to full
// frame (container transform) and lands pixel-for-pixel on Shot 3's top-down 3D city.

import * as E from '../lib/ease.js';
import { clamp, lerp, seg, rng } from '../lib/util.js';
const { kick } = E;
import { kText, font, measure, text } from '../lib/type.js';
import { C, DOTS, rgba, mix, paper, card, rr, magnifier, cursor, pin, puck, poiLabel, labelPill, bracket } from '../lib/brand.js';
import { getMap, drawMapView, drawRoute, routeUpTo, ROUTE, DEST, START_SCALE } from '../lib/map.js';

const QUERY = 'kyoto in autumn';
const SUGG = ['kyoto in autumn', 'kyoto in autumn leaves', 'kyoto in autumn itinerary'];
const R = 30; // hero dot radius
const BAR = { cx: 960, cy: 540, w: 1040, h: 96 };
const CARDS = [
  { key: 'maps', x: 230, y: 232, w: 800, h: 760, glow: C.green, label: 'Maps' },
  { key: 'lens', x: 1062, y: 232, w: 628, h: 360, glow: C.yellow, label: 'Lens' },
  { key: 'translate', x: 1062, y: 624, w: 298, h: 368, glow: C.blue, label: 'Translate' },
  { key: 'images', x: 1392, y: 624, w: 298, h: 368, glow: C.red, label: 'Images' },
];
const MAP_CARD_SCALE = 40; // px per world unit inside the card

// typing schedule
const TYPE_T = (() => {
  const r = rng(5);
  const out = [];
  let t = 5.05;
  for (let i = 0; i < QUERY.length; i++) {
    out.push(t);
    t += 0.068 + r() * 0.06 + (QUERY[i] === ' ' ? 0.05 : 0);
  }
  return out;
})();
const typedAt = (t) => TYPE_T.filter((x) => x <= t).length;

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  const shot = { name: 'S1 Search', start: 0, end: 12.5, scene, camera, useBg: true };
  const maps = getMap(env, font);
  const leafImg = env.leaf.canvas;

  // ---- hero dots ----
  function dotState(i, t) {
    const restX = 960 + (i - 1.5) * 96, restY = 500;
    const tl = t - (0.08 + 0.2 * i);
    let y = -80, sy = 1;
    if (tl > 0) {
      const p = clamp(tl / 0.4);
      y = lerp(-80, restY, p * p);
      sy = 1 + 0.2 * p * p;
      if (tl > 0.4) {
        const a = tl - 0.4;
        y = restY;
        if (a < 0.34) y -= 54 * 4 * (a / 0.34) * (1 - a / 0.34);
        else if (a < 0.56) { const b = (a - 0.34) / 0.22; y -= 16 * 4 * b * (1 - b); }
        const sq = 0.36 * kick(tl - 0.4, 0.03, 15) + 0.2 * kick(tl - 0.74, 0.03, 17) + 0.08 * kick(tl - 0.96, 0.03, 19);
        sy = 1 - sq;
        if (a < 0.34) sy *= 1 + 0.1 * Math.sin(Math.PI * (a / 0.34));
      }
    }
    // listening wave
    const amp = 18 * seg(t, 1.3, 1.8, E.inOutSine) * (1 - seg(t, 3.0, 3.45, E.inOutSine));
    const wv = 0.5 - 0.5 * Math.cos(2 * Math.PI * (t - 1.3) - i * 0.8);
    y -= amp * wv;
    let r = R * (1 + 0.05 * wv * (amp / 18));
    let x = restX;
    // squeeze together, then glide into the search box
    const sq = seg(t, 3.42, 3.72, E.inOutCubic);
    x = lerp(x, 960 + (i - 1.5) * 64, sq);
    const g = seg(t, 3.68 + (3 - i) * 0.035, 4.42 + (3 - i) * 0.035, E.smooth);
    const bx = BAR.cx + BAR.w / 2 - 62 - (3 - i) * 26;
    x = lerp(x, bx, g);
    y = lerp(y, BAR.cy, g) - Math.sin(Math.PI * g) * 26;
    r = lerp(r, 8, g);
    return { x, y, r, sy: lerp(sy, 1, g) };
  }

  function drawDot(ctx, x, y, r, sy, color) {
    const sx = 1 / Math.pow(sy, 0.8);
    ctx.save();
    ctx.translate(x, y + r * (1 - sy));
    ctx.scale(sx, sy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- search box geometry over time ----
  function barGeom(t) {
    const grow = seg(t, 3.74, 4.6, E.snap);
    const mv = seg(t, 7.85, 8.65, E.smooth);
    const w0 = lerp(96, BAR.w, grow);
    const cy0 = lerp(512, BAR.cy, seg(t, 3.74, 4.4, E.smooth));
    return {
      grow,
      w: lerp(w0, 860, mv),
      cx: BAR.cx,
      cy: lerp(cy0, 128, mv),
      h: BAR.h,
      mv,
    };
  }

  function drawPhotoTile(ctx, x, y, w, h, k) {
    const pal = [
      [C.yellow, C.red, '#B3261E'],
      ['#CDE3FF', C.green, '#1E8E3E'],
      ['#FEEFC3', mix(C.red, C.yellow, 0.4), C.red],
      ['#D2E3FC', C.blue, C.blueDeep],
    ][k];
    ctx.save();
    rr(ctx, x, y, w, h, 14);
    ctx.clip();
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, pal[0]);
    sky.addColorStop(1, C.white);
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = rgba(C.white, 0.85);
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h * 0.3, w * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal[1];
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    for (let i = 0; i <= 10; i++) ctx.lineTo(x + (w * i) / 10, y + h * (0.58 + 0.1 * Math.sin(i * 1.3 + k)));
    ctx.lineTo(x + w, y + h);
    ctx.fill();
    ctx.fillStyle = pal[2];
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    for (let i = 0; i <= 10; i++) ctx.lineTo(x + (w * i) / 10, y + h * (0.76 + 0.08 * Math.sin(i * 1.9 + k * 2)));
    ctx.lineTo(x + w, y + h);
    ctx.fill();
    if (k === 0 || k === 3) {
      // tiny pagoda silhouette
      ctx.fillStyle = k === 0 ? '#7A1C14' : '#174EA6';
      const px = x + w * 0.3, py = y + h * 0.72;
      for (let j = 0; j < 3; j++) {
        const ww = w * (0.16 - j * 0.035), yy = py - j * h * 0.09;
        ctx.fillRect(px - ww / 2, yy - h * 0.025, ww, h * 0.025);
        ctx.fillRect(px - ww * 0.3, yy - h * 0.06, ww * 0.6, h * 0.035);
      }
      ctx.fillRect(px - 1.5, py - h * 0.33, 3, h * 0.07);
    }
    ctx.restore();
  }

  function warmPhoto(ctx, x, y, w, h, t) {
    const gr = ctx.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, '#FFF3E6');
    gr.addColorStop(1, '#FCD9C2');
    ctx.fillStyle = gr;
    ctx.fillRect(x, y, w, h);
    const r = rng(9);
    for (let i = 0; i < 9; i++) {
      const bx = x + r() * w, by = y + r() * h, br = 30 + r() * 70;
      const col = [C.red, C.yellow, mix(C.red, C.yellow, 0.5)][i % 3];
      const gg = ctx.createRadialGradient(bx, by + Math.sin(t + i) * 4, 0, bx, by, br);
      gg.addColorStop(0, rgba(col, 0.32));
      gg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(x, y, w, h);
    }
  }

  shot.update = (t) => {
    const g = env.bg, f = env.fg;
    paper(g, W, H, t, { alpha: 0.075 });

    const zoom = 1 + 0.03 * seg(t, 0, 7.4, E.inOutSine) * (1 - seg(t, 7.6, 8.6, E.smooth));
    const ex = seg(t, 11.05, 12.35, E.smooth); // map card expansion
    const others = seg(t, 11.0, 11.45, E.inCubic);

    // ===== search box =====
    const b = barGeom(t);
    const barOut = seg(t, 11.0, 11.35, E.inCubic);
    const open = seg(t, 6.15, 6.6, E.snap) * (1 - seg(t, 7.5, 7.85, E.inOutCubic));
    const pr = t < 7.45 ? seg(t, 7.35, 7.45, E.inQuad) : 1 - E.outBack(1.6)(seg(t, 7.45, 7.8));
    const press = 1 - 0.018 * pr;
    g.save();
    g.translate(960, 540);
    g.scale(zoom, zoom);
    g.translate(-960, -540);
    g.globalAlpha = 1 - barOut;
    g.translate(0, -24 * barOut);
    if (b.grow > 0.001) {
      const hh = b.h + open * (3 * 68 + 24);
      const top = b.cy - b.h / 2;
      g.save();
      g.translate(b.cx, b.cy);
      g.scale(press, press);
      g.translate(-b.cx, -b.cy);
      const lift = clamp((b.w - 96) / 500);
      card(g, b.cx - b.w / 2, top, b.w, hh, lerp(48, 30, open), { lift: lerp(0.4, 1.15, lift) + open * 0.3, border: lift * (1 - open * 0.5) });
      const left = b.cx - b.w / 2;
      // magnifier
      const mg = seg(t, 4.2, 4.6, E.outBack(1.6));
      if (mg > 0) {
        g.save();
        g.globalAlpha *= clamp(mg);
        magnifier(g, left + 50, b.cy, 30 * mg);
        g.restore();
      }
      // typed text + caret
      const n = typedAt(t);
      const typed = QUERY.slice(0, n);
      const tx = left + 96;
      text(g, typed, tx, b.cy + 13, 38, 400, C.ink, 'left', 0);
      const lastType = n ? TYPE_T[n - 1] : 4.75;
      const since = t - lastType;
      const blink = since < 0.45 ? 1 : clamp(Math.cos(((since - 0.45) * Math.PI * 2) / 1.0) * 4 + 0.5);
      const caretOn = seg(t, 4.75, 4.85) * (1 - seg(t, 7.4, 7.5)) * blink;
      if (caretOn > 0.01) {
        g.fillStyle = rgba(C.blue, caretOn);
        g.fillRect(tx + measure(g, typed, 38, 400, 0) + 3, b.cy - 23, 3, 46);
      }
      // dropdown
      if (open > 0.01) {
        g.save();
        rr(g, left, top, b.w, hh, lerp(48, 30, open));
        g.clip();
        g.fillStyle = rgba(C.line, open);
        g.fillRect(left + 28, b.cy + b.h / 2 - 1, b.w - 56, 1.5);
        SUGG.forEach((s, k) => {
          const a = seg(t, 6.3 + k * 0.06, 6.75 + k * 0.06, E.outExpo) * (1 - seg(t, 7.48, 7.62));
          if (a <= 0) return;
          const ry = b.cy + b.h / 2 + 12 + k * 68 + 34;
          g.save();
          g.globalAlpha *= a;
          g.translate(0, (1 - a) * 10);
          if (k === 0) {
            const hl = seg(t, 7.02, 7.16);
            if (hl > 0) {
              g.fillStyle = rgba(C.hover, hl);
              rr(g, left + 12, ry - 32, b.w - 24, 64, 14);
              g.fill();
            }
          }
          magnifier(g, left + 50, ry, 24, C.mute2, 2.4);
          text(g, typed, tx, ry + 11, 32, 400, C.ink, 'left', 0);
          const wTyped = measure(g, typed, 32, 400, 0);
          text(g, s.slice(typed.length), tx + wTyped, ry + 11, 32, 700, C.ink, 'left', 0);
          g.restore();
        });
        g.restore();
      }
      g.restore();
    }
    g.restore();

    // ===== hero dots (above the box) =====
    g.save();
    g.translate(960, 540);
    g.scale(zoom, zoom);
    g.translate(-960, -540);
    g.globalAlpha = 1 - barOut;
    g.translate(0, -24 * barOut);
    for (let i = 0; i < 4; i++) {
      const d = dotState(i, t);
      // ride along when the box glides up to the results layout
      const offX = (lerp(BAR.w, 860, b.mv) - BAR.w) / 2, offY = lerp(0, 128 - BAR.cy, b.mv);
      // breathe gently while the box is idle
      const br = 1 + 0.12 * Math.max(0, Math.sin((t - 4.6) * Math.PI * 2 * 0.8 - i * 0.7)) * seg(t, 4.6, 5.0) * (1 - seg(t, 7.2, 7.4));
      drawDot(g, d.x + offX, d.y + offY, d.r * br, d.sy, DOTS[i]);
    }
    g.restore();

    // headline
    kText(f, 'It all starts with a question.', {
      x: 960, y: 700, size: 76, weight: 500, align: 'center',
      t: t - 1.35, dur: 0.7, stagger: 0.02, ease: E.outExpo,
      out: t - 3.05, outDur: 0.32, outStagger: 0.008,
      colorAt: (i) => (i === 29 ? C.blue : null),
    });

    // ===== results bento =====
    CARDS.forEach((cd, k) => {
      const e = seg(t, 8.3 + k * 0.09, 9.05 + k * 0.09, E.outQuint);
      if (e <= 0) return;
      const isMap = k === 0;
      const fl = 4 * Math.sin(t * 1.3 + k * 1.7) * seg(t, 9.2, 9.8) * (1 - seg(t, 10.5, 11.0));
      let x = cd.x, y = cd.y + (1 - e) * 140 + fl, w = cd.w, h = cd.h, r = 32;
      let sc = 0.94 + 0.06 * e;
      let alpha = clamp(e * 2);
      if (isMap) {
        const click = Math.sin(Math.PI * seg(t, 10.93, 11.12)) * 0.015;
        sc *= 1 - click;
        x = lerp(x, 0, ex); y = lerp(y, 0, ex); w = lerp(w, W, ex); h = lerp(h, H, ex);
        r = 32 * clamp((1 - ex) / 0.3);
        sc = lerp(sc, 1, ex);
      } else {
        alpha *= 1 - others;
        sc *= 1 - 0.05 * others;
        y += 30 * others;
      }
      if (alpha <= 0.002) return;
      const ctx = isMap ? g : g;
      ctx.save();
      ctx.globalAlpha = alpha;
      const ccx = x + w / 2, ccy = y + h / 2;
      ctx.translate(ccx, ccy);
      ctx.scale(sc, sc);
      ctx.translate(-ccx, -ccy);
      card(ctx, x, y, w, h, r, { glow: cd.glow, glowA: 0.34, lift: isMap ? 1 - ex : 1 });
      ctx.save();
      rr(ctx, x, y, w, h, r);
      ctx.clip();
      if (cd.key === 'maps') {
        const s = Math.exp(lerp(Math.log(MAP_CARD_SCALE), Math.log(START_SCALE), ex));
        const toS = drawMapView(ctx, maps.mapBase, ccx, ccy, s, ex > 0.9 ? 'low' : 'high');
        const ru = seg(t, 8.95, 10.15, E.inOutCubic);
        drawRoute(ctx, routeUpTo(ru), toS, s);
        const [px, py] = toS(ROUTE[0]);
        const halo = 0.6 + 0.4 * Math.sin(t * 3);
        puck(ctx, px, py, 11, lerp(halo, 1, ex), seg(t, 8.8, 9.0));
        const pp = seg(t, 10.05, 10.5);
        if (pp > 0) {
          const [qx, qy] = toS(DEST);
          const sp = E.spring(t - 10.05, 2.4, 0.42);
          pin(ctx, qx, qy, 64 * clamp(sp, 0, 1.3), 1, 1);
          poiLabel(ctx, qx + 30, qy - 40, 'Kiyomizu-dera', font, seg(t, 10.25, 10.5));
        }
        labelPill(ctx, x + 26, y + 26, cd.label, cd.glow, font, 1 - seg(t, 11.0, 11.25));
      } else if (cd.key === 'lens') {
        warmPhoto(ctx, x, y, w, h, t);
        const ls = 250;
        ctx.save();
        ctx.translate(x + w * 0.56, y + h * 0.52);
        ctx.rotate(-0.25 + 0.05 * Math.sin(t * 0.9));
        ctx.drawImage(leafImg, -ls / 2, -ls / 2, ls, ls);
        ctx.restore();
        const bxc = x + w * 0.56, byc = y + h * 0.52, half = 128;
        const bk = seg(t, 9.1, 9.5, E.outQuint);
        const o = lerp(30, 0, bk);
        ctx.globalAlpha *= bk;
        bracket(ctx, bxc - half - o, byc - half - o, 0, 34, 14, 5);
        bracket(ctx, bxc + half + o, byc - half - o, 1, 34, 14, 5);
        bracket(ctx, bxc + half + o, byc + half + o, 2, 34, 14, 5);
        bracket(ctx, bxc - half - o, byc + half + o, 3, 34, 14, 5);
        ctx.globalAlpha = alpha;
        labelPill(ctx, x + 24, y + 24, cd.label, cd.glow, font);
      } else if (cd.key === 'translate') {
        labelPill(ctx, x + 22, y + 24, cd.label, cd.glow, font);
        text(ctx, 'English', x + 30, y + 140, 22, 500, C.mute2, 'left', 0.02);
        text(ctx, 'Thank you', x + 30, y + 182, 34, 400, C.ink, 'left', 0);
        ctx.fillStyle = C.line;
        ctx.fillRect(x + 30, y + 214, w - 60, 1.5);
        text(ctx, 'Japanese', x + 30, y + 256, 22, 500, C.mute2, 'left', 0.02);
        text(ctx, 'ありがとう', x + 30, y + 312, 46, 500, C.blue, 'left', 0);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = DOTS[i];
          ctx.beginPath();
          ctx.arc(x + 38 + i * 20, y + 340, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        labelPill(ctx, x + 22, y + 24, cd.label, cd.glow, font);
        const pad = 22, gap = 12, tw = (w - pad * 2 - gap) / 2, th = (h - 100 - pad - gap) / 2;
        for (let k2 = 0; k2 < 4; k2++) {
          const tx2 = x + pad + (k2 % 2) * (tw + gap), ty2 = y + 96 + Math.floor(k2 / 2) * (th + gap);
          const pe = seg(t, 9.0 + k2 * 0.07, 9.4 + k2 * 0.07, E.outQuint);
          ctx.save();
          ctx.globalAlpha *= pe;
          ctx.translate(tx2 + tw / 2, ty2 + th / 2);
          ctx.scale(0.9 + 0.1 * pe, 0.9 + 0.1 * pe);
          drawPhotoTile(ctx, -tw / 2, -th / 2, tw, th, k2);
          ctx.restore();
        }
      }
      // light sweep across the card
      const sw = seg(t, 9.35 + k * 0.12, 10.15 + k * 0.12, E.inOutSine);
      if (sw > 0 && sw < 1) {
        const sx = lerp(x - w * 0.6, x + w * 1.4, sw);
        const lg = ctx.createLinearGradient(sx - 160, y, sx + 160, y + h * 0.3);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.5, 'rgba(255,255,255,0.32)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();
      ctx.restore();
    });

    // ===== cursor =====
    const cm = seg(t, 10.0, 10.85, E.smooth);
    if (cm > 0) {
      const ca = 1 - seg(t, 11.12, 11.32);
      const cx = lerp(1560, 660, cm);
      const cy = lerp(1130, 640, cm) - Math.sin(Math.PI * cm) * 110;
      const pressC = 1 - 0.12 * Math.sin(Math.PI * seg(t, 10.92, 11.04));
      const rp = seg(t, 10.96, 11.4, E.outCubic);
      if (rp > 0 && rp < 1) {
        f.save();
        f.strokeStyle = rgba(C.green, 1 - rp);
        f.lineWidth = 3;
        f.beginPath();
        f.arc(660, 640, 12 + rp * 90, 0, Math.PI * 2);
        f.stroke();
        f.restore();
      }
      if (ca > 0) cursor(f, cx, cy, pressC, ca);
    }

    return { bloom: [0, 0.4, 0.9], grain: 0.014, vignette: 0.05, ca: 0.0005 };
  };
  return shot;
}
