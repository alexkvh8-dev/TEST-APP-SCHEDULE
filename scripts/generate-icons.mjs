/**
 * Generates the FinX PWA icons with no image dependencies — a tiny PNG encoder
 * plus a supersampled polygon rasteriser.
 *
 * The mark is two faceted leaves climbing to the right, one green and one near
 * black, with a small dark hexagon above them. Low-poly facets, so the shape
 * still reads at 48px on a home screen where a gradient would turn to mud.
 *
 *   node scripts/generate-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const WHITE = [255, 255, 255];

// Facet shades. Each leaf is drawn as triangles alternating between these, so
// the fold lines come from the colour change rather than from an outline.
const GREEN_LIGHT = [74, 222, 96];
const GREEN_MID = [34, 178, 76];
const GREEN_DARK = [17, 122, 56];
const GREEN_DEEP = [8, 84, 44];

const INK_LIGHT = [58, 58, 58];
const INK_MID = [32, 32, 32];
const INK_DARK = [12, 12, 12];
const INK_DEEP = [0, 0, 0];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** pixels: Uint8Array of RGBA, length = size * size * 4 */
function encodePng(size, pixels) {
  const stride = size * 4;
  // One filter byte (0 = none) per scanline.
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Signed distance to a rounded rectangle — negative inside. */
function roundedRectDistance(px, py, x, y, w, h, r) {
  const cx = Math.max(x + r, Math.min(px, x + w - r));
  const cy = Math.max(y + r, Math.min(py, y + h - r));
  return Math.hypot(px - cx, py - cy) - r;
}

function pointInTriangle(px, py, [ax, ay], [bx, by], [cx, cy]) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/*
 * The mark, authored on a 100x100 grid.
 *
 * Each leaf is a fan of triangles sharing a spine, so neighbouring facets meet
 * exactly and no seam shows through to the plate behind. Order matters: later
 * triangles paint over earlier ones.
 */
/**
 * Builds one leaf as a fan of triangles from an interior point out to an
 * outline. Neighbouring facets share an edge exactly, so no seam shows through
 * to the plate behind, and each gets its own shade to make the fold.
 */
function fan(centre, outline, shades) {
  return outline.map((point, i) => ({
    p: [centre, point, outline[(i + 1) % outline.length]],
    c: shades[i % shades.length],
  }));
}

function markTriangles() {
  /*
   * The green leaf: a blade rising to a point, with two stepped tabs cut off
   * its lower-left edge. Bright at the tip, deep at the base.
   */
  const greenOutline = [
    [41, 25],
    [50, 42],
    [52, 60],
    [47, 78],
    [38, 91],
    [30, 74],
    [26, 50],
    [33, 35],
  ];
  const greenCentre = [40, 56];
  const green = fan(greenCentre, greenOutline, [
    GREEN_LIGHT,
    GREEN_MID,
    GREEN_DARK,
    GREEN_DEEP,
    GREEN_DEEP,
    GREEN_DARK,
    GREEN_MID,
    GREEN_LIGHT,
  ]);

  // The two tabs, stepping down and left away from the blade.
  const tabs = [
    { p: [[27, 54], [12, 63], [29, 67]], c: GREEN_MID },
    { p: [[27, 54], [29, 67], [30, 59]], c: GREEN_DARK },
    { p: [[29, 70], [10, 81], [31, 84]], c: GREEN_DARK },
    { p: [[29, 70], [31, 84], [32, 75]], c: GREEN_DEEP },
  ];

  /*
   * The dark leaf: a wide sweep with a notch cut into its top, so it reads as
   * two prongs rather than one blade. The hexagon sits in that notch — that
   * relationship is the whole silhouette, and flattening it to a single spike
   * loses the mark.
   */
  const inkOutline = [
    [47, 26],
    [58, 45],
    [66, 50],
    [74, 31],
    [86, 25],
    [81, 54],
    [74, 70],
    [58, 86],
    [37, 91],
    [45, 60],
  ];
  const ink = fan([61, 57], inkOutline, [
    INK_LIGHT,
    INK_MID,
    INK_LIGHT,
    INK_MID,
    INK_DARK,
    INK_DEEP,
    INK_DARK,
    INK_DEEP,
    INK_DARK,
    INK_MID,
  ]);

  // The hexagon that floats in the notch, drawn as a fan from its centre.
  const cx = 67;
  const cy = 15;
  const r = 9.5;
  const hexShades = [INK_LIGHT, INK_MID, INK_DARK, INK_DEEP, INK_DARK, INK_MID];
  const hex = [];
  for (let i = 0; i < 6; i++) {
    const a0 = (Math.PI / 3) * i - Math.PI / 2;
    const a1 = (Math.PI / 3) * (i + 1) - Math.PI / 2;
    hex.push({
      p: [
        [cx, cy],
        [cx + r * Math.cos(a0), cy + r * Math.sin(a0)],
        [cx + r * Math.cos(a1), cy + r * Math.sin(a1)],
      ],
      c: hexShades[i],
    });
  }

  /*
   * The white halo: the green outline pushed out from its centre, painted
   * between the two leaves. Without it the green sits directly on the black
   * and the two shapes merge into one dark mass at small sizes.
   */
  const HALO = 1.09;
  const haloOutline = greenOutline.map(([x, y]) => [
    greenCentre[0] + (x - greenCentre[0]) * HALO,
    greenCentre[1] + (y - greenCentre[1]) * HALO,
  ]);
  const halo = fan(greenCentre, haloOutline, [WHITE]);
  const tabHalo = tabs.map(({ p }) => ({
    p: p.map(([x, y]) => [
      greenCentre[0] + (x - greenCentre[0]) * HALO,
      greenCentre[1] + (y - greenCentre[1]) * HALO,
    ]),
    c: WHITE,
  }));

  return [...ink, ...halo, ...tabHalo, ...green, ...tabs, ...hex];
}

const SS = 3; // supersampling factor per axis

function render(size, { maskable }) {
  const pixels = new Uint8Array(size * size * 4);

  // Maskable icons must survive being cropped to a circle, so the mark shrinks
  // into the safe zone and the plate goes full-bleed.
  const scale = maskable ? 0.62 : 0.82;
  const unit = (size * scale) / 100;
  const originX = (size - 100 * unit) / 2;
  const originY = (size - 100 * unit) / 2;

  const triangles = markTriangles().map(({ p, c }) => ({
    p: p.map(([x, y]) => [originX + x * unit, originY + y * unit]),
    c,
  }));

  const plateRadius = maskable ? 0 : size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;

          const inPlate =
            maskable || roundedRectDistance(px, py, 0, 0, size, size, plateRadius) <= 0;
          if (!inPlate) continue;

          let colour = WHITE;
          // Last triangle wins, which is what gives the facets their overlap.
          for (const tri of triangles) {
            if (pointInTriangle(px, py, tri.p[0], tri.p[1], tri.p[2])) colour = tri.c;
          }

          rSum += colour[0];
          gSum += colour[1];
          bSum += colour[2];
          aSum += 1;
        }
      }

      const samples = SS * SS;
      const i = (y * size + x) * 4;
      if (aSum === 0) continue;

      // Averaging over covered samples only keeps the mark's own edges crisp
      // while the plate's rounded corner stays antialiased.
      pixels[i] = Math.round(rSum / aSum);
      pixels[i + 1] = Math.round(gSum / aSum);
      pixels[i + 2] = Math.round(bSum / aSum);
      pixels[i + 3] = Math.round((aSum / samples) * 255);
    }
  }

  return encodePng(size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const outputs = [
  ["icon-192.png", 192, { maskable: false }],
  ["icon-512.png", 512, { maskable: false }],
  ["icon-maskable-512.png", 512, { maskable: true }],
];

for (const [name, size, options] of outputs) {
  writeFileSync(join(OUT_DIR, name), render(size, options));
  console.log(`wrote icons/${name} (${size}x${size})`);
}
