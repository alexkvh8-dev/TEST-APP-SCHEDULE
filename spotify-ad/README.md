# "Every Moment" — Spotify 3D motion-graphics spec ad

A 60-second, 1920×1080, 30 fps motion-graphics ad built entirely in code (three.js + Canvas 2D),
rendered frame-by-frame to `out/spotify-every-moment.mp4`. **Picture only — no music or SFX.**
Every cut and accent sits on a 120 BPM grid (0.5 s), so a track can be dropped in later and
land on the beats.

> Unofficial spec / portfolio piece. Not produced, commissioned or endorsed by Spotify.
> The Spotify name, icon and green are Spotify trademarks.

## Brand system used

| Token | Value | Where |
| --- | --- | --- |
| Spotify Green | `#1ED760` | the dot, label, play button, sphere, icon, CTA |
| Ink / app background | `#121212`, black `#000` | dark scenes, end card |
| Secondary text | `#B3B3B3` | artist name, tagline |
| Expressive duotones | pink `#F573A0`, electric blue `#4100F5`, lime `#CDF564`, navy `#1E3264`, yellow `#FFC864`, orange `#FF6437`, purple `#AF2896` | mood cards, covers, spectrogram |
| Type | Figtree 500/700/900 (stand-in for Spotify Mix / Circular, which are proprietary) | all copy, 3D extruded text |

The icon (disc + three tilted arcs) is drawn procedurally in `src/lib/brand.js`, and the
Now Playing screen recreates the app's dark UI (header, art, title, progress, transport,
lyrics card) in `src/shots/s3-phone.js`.

## Storyboard

| Time | Shot | What happens | Transition out |
| --- | --- | --- | --- |
| 0:00–0:05 | **Pulse** | Green dot falls (gravity ease, stretch), lands (squash + floor ripple), pulses on the beat, hops on an arc to become the full stop of "Every moment has a sound." | Anticipation shrink, then zoom through the dot: **colour match cut** on solid green |
| 0:05–0:12 | **Vinyl** | Opens inside the green record label, log-distance pull-back reveals a spinning record with anisotropic groove highlights; five coloured records spring in behind; "Find yours." | Record flips 360° and settles face-on; label sized to exactly 300 px |
| 0:12–0:21 | **Press play** | **Shape match cut**: label becomes the 3D play button. The phone's UI is exploded into floating layers, which collapse with staggered timing. Then the button press: anticipation, spring overshoot, play→pause glyph morph, shockwave, particle burst | Album art lifts off and flies into the lens until its pink corner fills the frame |
| 0:21–0:33 | **Moods** | Wrapped-style duotone cards: HYPE (bouncing bolt), FOCUS (cube snapping 90° on every beat), CHILL (wobbling blob), LATE NIGHT (rocking moon + twinkling stars). Outline marquees, popping kinetic type | Each object flies into camera while a circle of the next colour opens from it. The summary's 32 bars are drawn at the exact screen positions of Shot 5's front row: **2D→3D match cut** |
| 0:33–0:43 | **Everything** | 3D spectrogram (columns are frequency bands, rows are the same signal a moment older). Back rows grow out of the floor, crane-up reveal, odometer counter "100,000,000+ songs." → "Podcasts." → "Audiobooks." → "All in one place" | **Whip pan** with directional motion blur |
| 0:43–0:51.5 | **Made for you** | Lands out of the whip on a ring of playlist covers; extruded 3D type flips up on springs; the full stop is a green sphere | Type falls away, the sphere hops to centre, covers spiral in (spinning faster as the radius shrinks) and are absorbed. Camera push: **size/position match cut** |
| 0:51.5–1:00 | **End card** | Sphere coin-turns and flattens while its material morphs from glossy 3D to flat brand green. A pixel-matched swap to 2D, the arcs draw on, the lockup slides into place with the wordmark emerging from behind the icon, then the tagline and a "Get Spotify Free" CTA with a shine sweep | Short fade |

## Motion principles and effects (where to find them)

- **Easing**: custom cubic-bezier solver plus expo/quint/back/elastic families and a physical
  damped spring (`src/lib/ease.js`). Nothing that starts or stops on screen moves linearly.
- **Squash & stretch with volume preservation**: dot fall/landing (S1), bolt bounce (S4), sphere hop (S6).
- **Anticipation**: dot shrinks before the zoom (S1), play button presses in before releasing (S3).
- **Follow-through / overlapping action**: staggered layer collapse (S3), per-letter springs (S4, S6), cover bobbing (S6).
- **Arcs**: dot hop (S1), art flight (S3), sphere hop (S6).
- **Secondary action**: ripples and shockwaves, particle burst, gyroscope ring around the cube, twinkling stars.
- **Timing & spacing**: 120 BPM grid; beat-locked pulses, snaps and EQ kicks.
- **Match cuts**: colour (S1→S2, S3→S4), shape/size (S2→S3, S6→S7), 2D→3D (S4→S5), 3D→2D (inside S7).
- **Camera language**: log-distance dolly zooms, crane, orbit, push-in, whip pan, handheld micro-drift, impact shake.
- **Depth**: exploded UI layers, parallax floating covers with pre-blurred textures (fake DOF), fog, dust particles.
- **Lens / post** (`src/lib/fx.js`): bloom, zoom blur, directional blur, chromatic aberration,
  vignette, animated film grain, colour flash, done in linear light with a manual sRGB transfer.
- **Kinetic typography** (`src/lib/type.js`): kerning-preserving per-glyph layout, masked
  reveals, pop/stretch/emerge modes, a mechanical odometer counter, word-level staggers.
- **Materials**: anisotropic vinyl grooves, clearcoat plastics, metal phone frame, and a material morph from lit to flat emissive.

## Preview and render

Needs Node 18+ and ffmpeg. Playwright (with its Chromium) is required only for rendering.

```bash
cd spotify-ad
npm install
npm run preview          # http://127.0.0.1:5173/  (space = play/pause, arrows = step)
```

Open `http://127.0.0.1:5173/?t=33` to jump to a timestamp.

```bash
npm run render                                         # out/spotify-every-moment.mp4
node scripts/render.mjs --fps 60 --workers 4           # 60 fps master
node scripts/render.mjs --from 12 --to 21 --out out/shot3.mp4
node scripts/render.mjs --stills 4.95,5.0 --out out/stills
```

The renderer drives headless Chromium one frame at a time, so frames are never dropped, and pipes
lossless PNGs into x264 (CRF 16, BT.709). Each frame is a pure function of time, so several
browsers render chunks in parallel and the segments are concatenated.

## Layout

```
index.html            preview player + import map
src/main.js           director: renderer, post stack, shot timeline
src/lib/              easing, keyframes, type, brand (palette/icon/UI glyphs), covers, post FX
src/shots/s1..s7      one module per shot; each exports start/end and update(localTime)
scripts/render.mjs    offline renderer (Playwright → ffmpeg)
scripts/serve.mjs     zero-dependency static server
assets/fonts/         Figtree (SIL Open Font License)
```
