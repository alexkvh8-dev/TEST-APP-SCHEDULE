/**
 * Generates the PWA icons with no image dependencies — a tiny PNG encoder plus
 * a rasteriser for rounded rectangles. The mark is three ascending bars, the
 * same language the app's charts use.
 *
 *   node scripts/generate-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const BLUE = [42, 120, 214];
const WHITE = [255, 255, 255];

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
  const dx = px - cx;
  const dy = py - cy;
  return Math.hypot(dx, dy) - r;
}

function render(size, { inset }) {
  const pixels = new Uint8Array(size * size * 4);
  const s = size / 512; // design is authored at 512

  // Bars: x, width, height — measured in the 512 grid, sitting on a baseline.
  const baseline = 372 * s;
  const bars = [
    { x: 150, w: 62, h: 108 },
    { x: 225, w: 62, h: 178 },
    { x: 300, w: 62, h: 248 },
  ].map((b) => {
    // Maskable icons must keep their content inside the middle 80%.
    const scale = inset ? 0.8 : 1;
    const cx = 256;
    return {
      x: (cx + (b.x - cx) * scale) * s,
      w: b.w * scale * s,
      h: b.h * scale * s,
      baseline: (256 + (372 - 256) * scale) * s,
    };
  });

  const radius = 14 * s * (inset ? 0.8 : 1);
  const bgRadius = inset ? size : 112 * s; // maskable is full-bleed

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const i = (y * size + x) * 4;

      // Background plate
      const bgD = roundedRectDistance(px, py, 0, 0, size, size, bgRadius);
      const bgAlpha = Math.max(0, Math.min(1, 0.5 - bgD));
      if (bgAlpha <= 0) continue;

      let r = BLUE[0];
      let g = BLUE[1];
      let b = BLUE[2];

      // Bars, antialiased against the plate
      for (const bar of bars) {
        const d = roundedRectDistance(px, py, bar.x, bar.baseline - bar.h, bar.w, bar.h, radius);
        const a = Math.max(0, Math.min(1, 0.5 - d));
        if (a > 0) {
          r = Math.round(r * (1 - a) + WHITE[0] * a);
          g = Math.round(g * (1 - a) + WHITE[1] * a);
          b = Math.round(b * (1 - a) + WHITE[2] * a);
        }
      }

      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = Math.round(bgAlpha * 255);
    }
  }

  return encodePng(size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const outputs = [
  ["icon-192.png", 192, { inset: false }],
  ["icon-512.png", 512, { inset: false }],
  ["icon-maskable-512.png", 512, { inset: true }],
];

for (const [name, size, options] of outputs) {
  writeFileSync(join(OUT_DIR, name), render(size, options));
  console.log(`wrote icons/${name} (${size}x${size})`);
}
