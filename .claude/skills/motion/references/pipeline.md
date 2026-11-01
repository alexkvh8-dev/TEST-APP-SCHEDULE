# Pipeline: architecture, rendering and pitfalls

## Architecture (assets/template)

```
index.html          preview player (space = play/pause, arrows = step, ?t=12 to jump) + import map
src/main.js         director: renderer, post stack, SHOTS list, DURATION, renderAt(t)
src/lib/ease.js     easing functions, bezier solver, spring/wobble/kick
src/lib/util.js     seg, lerp, clamp, kf keyframes, seeded rng, noise, shake, BEAT
src/lib/type.js     font loading, kText kinetic type, measure, text
src/lib/fx.js       FinalShader (lens/post)
src/lib/studio.js   studio environment maps (dark strips / bright cove)
src/shots/sN-*.js   one module per shot
scripts/render.mjs  Playwright (headless Chromium) → PNG frames → ffmpeg segments → concat
scripts/serve.mjs   zero-dependency static server (no-store caching)
```

Add a `src/lib/brand.js` per project (palette tokens, logo drawing, UI glyphs) and other
libraries as needed (product models, cover art generators).

Each frame is composited in this order: **bg canvas** (2D, used as `scene.background` when
`shot.useBg`) → **3D scene** → **bloom** → **fg canvas** (2D type/UI, crisp) → **FinalShader**.

## Shot contract

```js
export default function create(env) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  const shot = { name: 'S3 Phone', start: 12, end: 21, scene, camera, useBg: true };
  // build everything once here; publish first-frame geometry for match cuts:
  env.shared.phone = { ... };
  shot.update = (lt, t) => {   // lt = local time, t = film time
    // set every animated property from lt — never accumulate across frames
    return { bloom: [0.3, 0.45, 0.9], vignette: 0.3 };  // post overrides
  };
  return shot;
}
```

- **Determinism**: no `Date`, `performance.now`, `Math.random` or accumulated state in `update`.
  Use `rng(seed)` at build time and `noise1(t)` at frame time. This is what lets frames render
  out of order across parallel browsers, and lets stills match the final video.
- **Cross-shot hand-offs**: a later shot publishes in `create()` (e.g. hero rects projected
  through a cloned start camera); an earlier shot reads `env.shared.x` inside `update()`
  (all shots are created before the first render).
- Set things you toggle every frame (visibility, opacity) on every frame, because a shot's update
  may run after a seek.

## Rendering

```bash
npm install && npm run preview                       # http://127.0.0.1:5173/?t=12
node scripts/render.mjs --stills 11.97,12.0,14.5 --out out/st      # check stills first
node scripts/render.mjs --workers 4                  # out/master.mp4, CRF 16, BT.709
node scripts/render.mjs --from 33 --to 43 --workers 4 --out out/r33/r33.mp4
```

- Software GL (`--use-angle=swiftshader`) runs about 0.8 frames/s on 4 vCPUs at 1080p with 4×MSAA.
  Run long renders in the background and wait on the PID, not with sleep polling.
- Playwright: if `require('playwright')` fails, the script falls back to a global path.
  Use the pre-installed Chromium and don't reinstall browsers.
- Parallel renders: give each range its **own output directory**. The segment temp folder is
  `dirname(out)/.segments`, so two renders writing into one folder corrupt each other.
- **Splicing** changed ranges without a full re-render: render the ranges, then build the
  web cut with a concat filter (frame-exact, no keyframe alignment needed):

```bash
ffmpeg -i master.mp4 -i r12.mp4 -i r33.mp4 -filter_complex \
 "[0:v]split=2[m1][m2];[m1]trim=start_frame=0:end_frame=360,setpts=PTS-STARTPTS[a];\
  [m2]trim=start_frame=630:end_frame=990,setpts=PTS-STARTPTS[c];\
  [1:v]setpts=PTS-STARTPTS[b];[2:v]setpts=PTS-STARTPTS[d];\
  [a][b][c][d]concat=n=4:v=1:a=0[v]" -map "[v]" ...encode args...
```
  Verify that the total frame count equals `DURATION·FPS` with `ffprobe -count_frames`.
- Web cut: `scripts/encode_web.sh master.mp4 web.mp4 18.5`. Bitrate is derived from the
  budget and duration, with a light `hqdn3d` temporal denoise so the grain doesn't eat the bits.
  Keep the CRF 16 master out of git (it is hundreds of MB). Commit the web cut. If the repo ignores
  `out/`, re-include just that file.

## three.js / browser pitfalls (all hit in practice)

| Symptom | Cause | Fix |
| --- | --- | --- |
| `envMapIntensity` has no effect; a screen shows a blown-out strip reflection | r169: materials inheriting `scene.environment` use `scene.environmentIntensity` | set `material.envMap = tex` explicitly and copy `scene.environmentRotation` into `material.envMapRotation` each frame |
| Instanced tiles show the whole atlas | `USE_INSTANCING` is defined only in the vertex stage | branch in the fragment on a varying (e.g. `vId < 0` for non-instanced) |
| Every pixel of a tile picks a different atlas cell (noise) | interpolated id varies by ulps; the hash amplifies it | `floor(vId + 0.5)` before hashing, or a `flat` varying |
| Rounded tiles render as hollow frames | box SDF without the interior term; `fwidth(d)` = 0 → undefined `smoothstep` | `d = length(max(q,0)) + min(max(q.x,q.y),0) - r`; `aa = max(fwidth(d), 1e-4)` |
| GLSL compile error on a variable named `flat` | GLSL ES 3.00 keyword | rename it |
| 2D canvas not clearing between frames | GPU canvas path after a texture upload | `getContext('2d', { willReadFrequently: true })` + `ctx.reset()` each frame |
| `RoundedBoxGeometry` corners look square | radius is capped by the smallest dimension | build slabs from an extruded rounded-rect shape with a bevel |
| Transparent planes draw as dark squares | depth/sorting with alpha | `alphaTest` or `depthWrite: false`, or bake the shape into the texture |
| Text tails visible after a cut | the exit's last glyph finishes after the shot ends | `out + stagger·(n-1) + outDur < shot end` |
| `-(x)**2` syntax error | JS exponent precedence | `-((x) ** 2)` |
| Killing a render with `pkill -f pattern` kills your own shell | the pattern matches the command line | kill by PID |
