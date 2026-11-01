// A small, stylised Kyoto: the grid, the Kamo river, the Higashiyama hills, a route up
// Shijo-dori to Kiyomizu-dera. One data set feeds both the 2D map card (S1) and the 3D
// city (S3), so the card can expand into the 3D shot with a pixel-matched cut: the map is
// painted once into a canvas, drawn with drawImage in 2D and used as the ground texture
// under a straight-down camera in 3D (a plane parallel to the image is a pure scale).

import { C } from './brand.js';
import { rng } from './util.js';

export const L = 48; // world size (units), centred on the origin
export const TEX = 4096; // texture/canvas pixels
export const PPU = TEX / L; // canvas pixels per world unit
export const START_SCALE = 64; // S3 first frame: screen px per world unit (texture minified 0.75x)
export const START_TARGET = [5.4, 2.1]; // S3 first-frame camera target (x, z)

export const riverX = (z) => 5.6 + 0.5 * Math.sin(z * 0.09 + 0.5);
export const hillX = (z) => 10.4 + 1.2 * Math.sin(z * 0.23) + 0.6 * Math.sin(z * 0.61 + 1.0);

const GRID = [];
for (let k = 0; k <= 16; k++) GRID.push(-24 + 3 * k);
const MAJOR_X = new Set([-12, 3]);
const MAJOR_Z = new Set([-12, 0]);

export const ROUTE = [[-3, 6], [3, 6], [3, 0], [9, 0], [10.2, -0.15], [11.0, -0.8], [11.9, -0.5], [12.6, -1.1], [13.2, -1.2]];
export const HILL_PATH = [[9, 0], [10.2, -0.15], [11.0, -0.8], [11.9, -0.5], [12.6, -1.1], [13.2, -1.2], [14.2, -2.2], [15.4, -2.6], [17, -4]];
export const DEST = [13.75, -1.75]; // pin / pagoda
export const PAGODA = [14.05, -2.05];
export const TOWER = [-1.5, 10.5];
const PARKS = [[-12, -24, -6, -15], [-3, -6, 0, -3]];

// arc-length parametrised route
const segLen = [];
let routeLen = 0;
for (let i = 1; i < ROUTE.length; i++) {
  const d = Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]);
  segLen.push(d);
  routeLen += d;
}
export const ROUTE_LEN = routeLen;
export function routeAt(u) {
  let d = Math.max(0, Math.min(1, u)) * routeLen;
  for (let i = 0; i < segLen.length; i++) {
    if (d <= segLen[i] || i === segLen.length - 1) {
      const f = segLen[i] ? Math.min(1, d / segLen[i]) : 0;
      const a = ROUTE[i], b = ROUTE[i + 1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])];
    }
    d -= segLen[i];
  }
  return [...ROUTE[ROUTE.length - 1], 0];
}
// Points of the route up to fraction u (for draw-on).
export function routeUpTo(u) {
  const pts = [ROUTE[0]];
  let d = Math.max(0, Math.min(1, u)) * routeLen;
  for (let i = 0; i < segLen.length; i++) {
    if (d >= segLen[i]) { pts.push(ROUTE[i + 1]); d -= segLen[i]; continue; }
    const f = d / segLen[i], a = ROUTE[i], b = ROUTE[i + 1];
    pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    break;
  }
  return pts;
}

const inPark = (x, z) => PARKS.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);

// Building footprints: [x, z, w, d, h]
export const BUILDINGS = (() => {
  const r = rng(11);
  const out = [];
  for (let i = 0; i < GRID.length - 1; i++) {
    for (let j = 0; j < GRID.length - 1; j++) {
      const x0 = GRID[i] + 0.34, x1 = GRID[i + 1] - 0.34;
      const z0 = GRID[j] + 0.34, z1 = GRID[j + 1] - 0.34;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (inPark(cx, cz)) continue;
      if (x1 > hillX(cz) - 0.6) continue;
      const rv = riverX(cz);
      if (x1 > rv - 1.3 && x0 < rv + 1.3) continue;
      const nx = 2 + Math.floor(r() * 2), nz = 2 + Math.floor(r() * 2);
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < nz; b++) {
          if (r() < 0.12) continue;
          const lx0 = x0 + ((x1 - x0) * a) / nx, lx1 = x0 + ((x1 - x0) * (a + 1)) / nx;
          const lz0 = z0 + ((z1 - z0) * b) / nz, lz1 = z0 + ((z1 - z0) * (b + 1)) / nz;
          const ins = 0.07 + r() * 0.1;
          const w = lx1 - lx0 - ins * 2, d = lz1 - lz0 - ins * 2;
          const px = (lx0 + lx1) / 2, pz = (lz0 + lz1) / 2;
          if (Math.hypot(px - TOWER[0], pz - TOWER[1]) < 0.9) continue;
          const tall = pz > 6.5 && px < 3 ? 1.8 : 1;
          const h = (0.32 + r() * r() * 1.3) * tall + (r() < 0.06 ? 1.2 : 0);
          out.push([px, pz, w, d, h]);
        }
      }
    }
  }
  return out;
})();

const toPx = (v) => (v + L / 2) * PPU;

function strokePoly(ctx, pts, map = toPx) {
  ctx.beginPath();
  pts.forEach(([x, z], i) => (i ? ctx.lineTo(map(x), map(z)) : ctx.moveTo(map(x), map(z))));
  ctx.stroke();
}

// Route with casing, in any 2D space: `px` maps a world [x,z] to canvas coords, `s` = px per unit.
export function drawRoute(ctx, pts, px, s) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const path = () => {
    ctx.beginPath();
    pts.forEach((p, i) => { const [x, y] = px(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  };
  ctx.strokeStyle = C.blueDeep;
  ctx.lineWidth = 0.46 * s;
  path();
  ctx.stroke();
  ctx.strokeStyle = C.blue;
  ctx.lineWidth = 0.32 * s;
  path();
  ctx.stroke();
  ctx.restore();
}

// Paint the map (without the route) into a TEX x TEX canvas.
export function paintMap(fontFn) {
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = C.land;
  g.fillRect(0, 0, TEX, TEX);

  // parks
  g.fillStyle = C.park;
  for (const [x0, z0, x1, z1] of PARKS) {
    g.beginPath();
    g.roundRect(toPx(x0 + 0.3), toPx(z0 + 0.3), (x1 - x0 - 0.6) * PPU, (z1 - z0 - 0.6) * PPU, 0.4 * PPU);
    g.fill();
  }

  // building footprints
  g.fillStyle = C.footprint;
  g.strokeStyle = '#D9DCE0';
  g.lineWidth = 2;
  for (const [x, z, w, d] of BUILDINGS) {
    g.beginPath();
    g.rect(toPx(x - w / 2), toPx(z - d / 2), w * PPU, d * PPU);
    g.fill();
    g.stroke();
  }

  // roads: casing pass, then fill pass; majors drawn last
  const road = (pass, major) => {
    for (const x of GRID) {
      if (x === 6) continue; // the river runs here
      if (MAJOR_X.has(x) !== major) continue;
      g.lineWidth = (major ? 0.62 : 0.3) * PPU + (pass ? 0 : 5);
      strokePoly(g, [[x, -24], [x, 24]]);
    }
    for (const z of GRID) {
      if (MAJOR_Z.has(z) !== major) continue;
      g.lineWidth = (major ? 0.62 : 0.3) * PPU + (pass ? 0 : 5);
      strokePoly(g, [[-24, z], [hillX(z) + 0.3, z]]);
    }
  };
  g.lineCap = 'butt';
  g.strokeStyle = C.roadCase; road(0, false);
  g.strokeStyle = C.road; road(1, false);
  g.strokeStyle = C.arteryCase; road(0, true);
  g.strokeStyle = C.artery; road(1, true);

  // river with green banks (drawn over roads; the major roads re-cross as bridges)
  const river = (half, color) => {
    g.fillStyle = color;
    g.beginPath();
    for (let z = -24; z <= 24; z += 0.5) g.lineTo(toPx(riverX(z) - half), toPx(z));
    for (let z = 24; z >= -24; z -= 0.5) g.lineTo(toPx(riverX(z) + half), toPx(z));
    g.closePath();
    g.fill();
  };
  river(1.05, C.park);
  river(0.62, C.water);
  for (const z of GRID) {
    const major = MAJOR_Z.has(z);
    const x = riverX(z);
    g.strokeStyle = major ? C.arteryCase : C.roadCase;
    g.lineWidth = (major ? 0.62 : 0.3) * PPU + 5;
    strokePoly(g, [[x - 1.2, z], [x + 1.2, z]]);
    g.strokeStyle = major ? C.artery : C.road;
    g.lineWidth = (major ? 0.62 : 0.3) * PPU;
    strokePoly(g, [[x - 1.25, z], [x + 1.25, z]]);
  }

  // Higashiyama hills
  g.fillStyle = C.hill;
  g.beginPath();
  for (let z = -24; z <= 24; z += 0.4) g.lineTo(toPx(hillX(z)), toPx(z));
  g.lineTo(toPx(24), toPx(24));
  g.lineTo(toPx(24), toPx(-24));
  g.closePath();
  g.fill();
  // contour hints
  g.strokeStyle = 'rgba(52,168,83,0.16)';
  g.lineWidth = 3;
  for (let k = 1; k <= 4; k++) {
    g.beginPath();
    for (let z = -24; z <= 24; z += 0.4) g.lineTo(toPx(hillX(z) + k * 1.6 + 0.3 * Math.sin(z * 0.5 + k)), toPx(z));
    g.stroke();
  }
  // winding path up the hill
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = C.roadCase;
  g.lineWidth = 0.3 * PPU + 5;
  strokePoly(g, HILL_PATH);
  g.strokeStyle = C.road;
  g.lineWidth = 0.3 * PPU;
  strokePoly(g, HILL_PATH);

  // labels
  const label = (txt, x, z, size, color, rot = 0, spacing = 0, weight = 500) => {
    g.save();
    g.translate(toPx(x), toPx(z));
    g.rotate(rot);
    g.font = fontFn(size, weight);
    g.letterSpacing = `${spacing}px`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 7;
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineJoin = 'round';
    g.strokeText(txt, 0, 0);
    g.fillStyle = color;
    g.fillText(txt, 0, 0);
    g.restore();
  };
  label('Kamo River', riverX(-7.5), -7.5, 30, C.blueDeep, Math.PI / 2, 1);
  label('Kamo River', riverX(13.5), 13.5, 30, C.blueDeep, Math.PI / 2, 1);
  label('Shijo-dori', -7.5, 0, 28, C.mute, 0, 0.5);
  label('Kawaramachi-dori', 3, -7.5, 28, C.mute, -Math.PI / 2, 0.5);
  label('GION', 8.0, 3.2, 30, C.mute2, 0, 8, 700);
  label('HIGASHIYAMA', 17.2, 5.0, 30, '#188038', 0, 8, 700);
  label('Imperial Palace Park', -9, -19.5, 30, '#188038', 0, 0.5);
  label('Kyoto Tower', TOWER[0], TOWER[1] + 0.85, 26, C.mute, 0, 0.3);
  return c;
}

// Shared, painted once per page.
export function getMap(env, fontFn) {
  if (!env.shared.mapBase) {
    env.shared.mapBase = paintMap(fontFn);
    env.shared.mapFull = paintMapWithRoute(env.shared.mapBase);
  }
  return env.shared;
}

// Draw the map (base canvas) so that world (tx, tz) lands on screen (cx, cy) at s px/unit.
export function drawMapView(ctx, base, cx, cy, s, quality = 'high', tx = START_TARGET[0], tz = START_TARGET[1]) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  // 'low' = bilinear, like the 3D ground texture's non-mipmapped first-frame sampler
  ctx.imageSmoothingQuality = quality;
  ctx.translate(cx - (tx + L / 2) * s, cy - (tz + L / 2) * s);
  ctx.scale(s / PPU, s / PPU);
  ctx.drawImage(base, 0, 0);
  ctx.restore();
  return ([x, z]) => [cx + (x - tx) * s, cy + (z - tz) * s];
}

// Base map + baked route, for the 3D ground texture.
export function paintMapWithRoute(base) {
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(base, 0, 0);
  drawRoute(g, ROUTE, ([x, z]) => [toPx(x), toPx(z)], PPU);
  return c;
}
