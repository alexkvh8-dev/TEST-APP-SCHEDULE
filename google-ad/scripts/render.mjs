// Offline renderer. Drives headless Chromium frame-by-frame (no real-time playback,
// so no dropped frames) and pipes lossless PNGs into ffmpeg.
//
//   node scripts/render.mjs                         -> out/master.mp4 (whole film @ 30fps)
//   node scripts/render.mjs --fps 60 --workers 4
//   node scripts/render.mjs --from 12 --to 21 --out out/shot3.mp4
//   node scripts/render.mjs --stills 0.5,4.9,5.0 --out out/stills
//
// Needs: ffmpeg on PATH, and the `playwright` package (global installs are picked up).

import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  const tries = ['playwright', '/opt/node-tools/node_modules/playwright'];
  for (const p of tries) { try { return require(p); } catch {} }
  throw new Error('playwright not found: npm i -D playwright (or install globally)');
}
const { chromium } = loadPlaywright();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
    return acc;
  }, [])
);
const FPS = Number(args.fps || 30);
const WORKERS = Number(args.workers || 3);
const FROM = Number(args.from || 0);
let TO = Number(args.to || 0); // 0 = the film's DURATION, read from the page
const CHROME_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

async function openPage(port) {
  const browser = await chromium.launch({ args: CHROME_ARGS });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/index.html?render`);
  await page.waitForFunction('window.__ad && (window.__ad.ready || window.__ad.error)', null, { timeout: 120000 });
  const err = await page.evaluate('window.__ad.error');
  if (err) throw new Error(err);
  return { browser, page };
}

async function grab(page, t) {
  const url = await page.evaluate((tt) => {
    window.__ad.renderAt(tt);
    return document.querySelector('canvas').toDataURL('image/png');
  }, t);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

function ffmpeg(argv) {
  const p = spawn('ffmpeg', argv, { stdio: ['pipe', 'ignore', 'pipe'] });
  let log = '';
  p.stderr.on('data', (d) => { log = (log + d).slice(-4000); });
  p.done = new Promise((ok, bad) => p.on('close', (c) => (c === 0 ? ok() : bad(new Error(`ffmpeg exited ${c}\n${log}`)))));
  return p;
}

const ENCODE = [
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 16), '-tune', 'grain',
  '-g', String(FPS * 2), '-bf', '2',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
];

async function stills(port) {
  const out = resolve(ROOT, typeof args.out === 'string' ? args.out : 'out/stills');
  await mkdir(out, { recursive: true });
  const { browser, page } = await openPage(port);
  for (const t of String(args.stills).split(',').map(Number)) {
    const file = join(out, `t${t.toFixed(2).padStart(5, '0')}.png`);
    await writeFile(file, await grab(page, t));
    console.log('wrote', file);
  }
  await browser.close();
}

async function video(port) {
  const out = resolve(ROOT, typeof args.out === 'string' ? args.out : 'out/master.mp4');
  if (!TO) {
    const probe = await openPage(port);
    TO = await probe.page.evaluate('window.__ad.DURATION');
    await probe.browser.close();
  }
  const tmp = join(dirname(out), '.segments');
  await mkdir(tmp, { recursive: true });
  const first = Math.round(FROM * FPS), last = Math.round(TO * FPS); // [first, last)
  const total = last - first;
  const per = Math.ceil(total / WORKERS);
  let done = 0;
  const t0 = Date.now();
  const segs = [];
  await Promise.all([...Array(WORKERS)].map(async (_, w) => {
    const a = first + w * per, b = Math.min(last, a + per);
    if (a >= b) return;
    const seg = join(tmp, `seg${String(w).padStart(2, '0')}.mp4`);
    segs[w] = seg;
    const { browser, page } = await openPage(port);
    const enc = ffmpeg(['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...ENCODE, '-r', String(FPS), seg]);
    for (let f = a; f < b; f++) {
      const png = await grab(page, f / FPS);
      if (!enc.stdin.write(png)) await new Promise((ok) => enc.stdin.once('drain', ok));
      done++;
      if (done % 30 === 0 || done === total) {
        const el = (Date.now() - t0) / 1000;
        const eta = (el / done) * (total - done);
        process.stdout.write(`\r${done}/${total} frames  ${(done / el).toFixed(2)} fps  eta ${Math.round(eta)}s   `);
      }
    }
    enc.stdin.end();
    await enc.done;
    await browser.close();
  }));
  console.log('\nconcatenating…');
  const list = join(tmp, 'list.txt');
  await writeFile(list, segs.filter(Boolean).map((s) => `file '${s}'`).join('\n'));
  const cat = ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  cat.stdin.end();
  await cat.done;
  await rm(tmp, { recursive: true, force: true });
  console.log('wrote', out, `in ${Math.round((Date.now() - t0) / 1000)}s`);
}

const server = await startServer(0);
const port = server.address().port;
try {
  if (args.stills) await stills(port);
  else await video(port);
} finally {
  server.close();
}
