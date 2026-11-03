// Render specific frames (or times) to PNG with one bundle:
//   node scripts/stills.mjs out/st 0.1 0.6 1.2 2.5     (seconds)
//   node scripts/stills.mjs out/st f60 f61              (frames)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [outDir, ...marks] = process.argv.slice(2);
const browserExecutable =
  process.env.REMOTION_BROWSER ??
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "YouTubeSpot", browserExecutable });
for (const m of marks) {
  const frame = m.startsWith("f") ? Number(m.slice(1)) : Math.round(Number(m) * composition.fps);
  const output = path.join(outDir, `f${String(frame).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame, output, browserExecutable, imageFormat: "png", scale: Number(process.env.SCALE ?? 1) });
  console.log(output);
}
