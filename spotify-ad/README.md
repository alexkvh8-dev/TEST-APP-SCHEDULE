# "Every Moment" — Spotify 3D motion-graphics spec ad

A 60-second, 1920×1080, 30 fps motion-graphics ad built entirely in code (three.js + Canvas 2D),
rendered frame by frame. **Picture only — no music or SFX.**

**Watch:** [`out/spotify-every-moment-web.mp4`](out/spotify-every-moment-web.mp4) (H.264 High, BT.709, two-pass 2.35 Mbps, 17.8 MB).

To make the same under-20 MB cut from a fresh render:

```bash
cd out
ffmpeg -i spotify-every-moment.mp4 -c:v libx264 -preset veryslow -tune film -b:v 2350k -maxrate 4500k -bufsize 9000k -pass 1 -an -f mp4 /dev/null
ffmpeg -i spotify-every-moment.mp4 -c:v libx264 -preset veryslow -tune film -b:v 2350k -maxrate 4500k -bufsize 9000k -pass 2 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart spotify-every-moment-web.mp4
```

`npm run render` produces the full-quality `out/spotify-every-moment.mp4` (CRF 16 master;
the film grain makes it large, so it isn't committed).
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
| Expressive duotones | pink `#F573A0`, electric blue `#4100F5`, lime `#CDF564`, navy `#1E3264`, yellow `#FFC864`, orange `#FF6437`, purple `#AF2896` | mood cards, covers, library wall |
| Type | Figtree 500/700/900 (stand-in for Spotify Mix / Circular, which are proprietary) | all copy, 3D extruded text |

The icon (disc + three tilted arcs) is drawn procedurally in `src/lib/brand.js`, and the
Now Playing screen recreates the app's dark UI (header, art, title, progress, transport,
lyrics card) in `src/shots/s3-phone.js`. The filter chips in Shot 5 (All, Music, Podcasts,
Audiobooks) follow the app's home-screen chips: white text on translucent pills, and the
selected one in green with black text.

## Storyboard

| Time | Shot | What happens | Transition out |
| --- | --- | --- | --- |
| 0:00–0:05 | **Pulse** | Green dot falls (gravity ease, stretch), lands (squash + floor ripple), pulses on the beat, hops on an arc to become the full stop of "Every moment has a sound." | Anticipation shrink, then zoom through the dot: **colour match cut** on solid green |
| 0:05–0:12 | **Vinyl** | Opens inside the green record label, log-distance pull-back reveals a spinning record with anisotropic groove highlights; five coloured records spring in behind; "Find yours." | Record flips 360° and settles face-on; label sized to exactly 300 px |
| 0:12–0:21 | **Press play** | **Shape match cut**: label becomes the 3D play button on a realistic flagship phone (machined aluminium band, side keys, punch-hole display under glass, frosted back, three-lens camera island) lit like a product shoot: studio strip lights sliding along the band, pink and green rim lights. The UI is exploded into floating layers that collapse with staggered timing. Then the press: anticipation, spring overshoot, play→pause morph, shockwave, sparks, and floating cards ("Added to Liked Songs", "Listening on Living Room", "Now playing") | Album art lifts off and flies into the lens until its pink corner fills the frame |
| 0:21–0:33 | **Moods** | Wrapped-style duotone cards: HYPE (bouncing bolt), FOCUS (cube snapping 90° on every beat), CHILL (wobbling blob), LATE NIGHT (rocking moon + twinkling stars). Outline marquees, popping kinetic type. "For every mood." deals the four mixes out as playlist covers | Each object flies into camera while a circle of the next colour opens from it. The four covers land on the exact screen rects of Shot 5's hero tiles: **2D→3D match cut** |
| 0:33–0:43 | **The library** | The four mixes are the first tiles of a curved wall of covers that ripples into existence as the camera pulls back: "100 million+ songs." Spotify's filter chips drive the rest: tapping Podcasts sends a flip wave across the wall from the centre out and every tile turns into a podcast; Audiobooks flips it into books; All mixes the three. "Podcasts." → "Audiobooks." → "All in one place." | **Whip pan** with directional motion blur |
| 0:43–0:51.5 | **Made for you** | Lands out of the whip on a ring of playlist covers; extruded 3D type flips up on springs; the full stop is a green sphere | Type falls away, the sphere glides to centre on one eased arc, covers spiral in on a single in-out curve and dissolve into it as it grows. Slow camera push: **size/position match cut** |
| 0:51.5–1:00 | **End card** | Sphere turns slowly like a coin and flattens while its material morphs from glossy 3D to flat brand green. A pixel-matched swap to 2D, the arcs draw on, the lockup slides into place with the wordmark emerging from behind the icon, then the tagline and a "Get Spotify Free" CTA with a shine sweep | Short fade |

## Motion principles and effects (where to find them)

- **Easing**: custom cubic-bezier solver plus expo/quint/back/elastic families and a physical
  damped spring (`src/lib/ease.js`). Nothing that starts or stops on screen moves linearly.
- **Squash & stretch with volume preservation**: dot fall/landing (S1), bolt bounce (S4).
- **Anticipation**: dot shrinks before the zoom (S1), play button presses in before releasing (S3).
- **Follow-through / overlapping action**: staggered layer collapse (S3), per-letter springs (S4, S6), cover bobbing (S6).
- **Arcs**: dot hop (S1), art flight (S3), sphere glide (S6).
- **Waves / cascades**: the library's reveal ripple and flip waves run outward from the centre,
  each tile delayed by its grid distance (S5).
- **Secondary action**: ripples and shockwaves, particle burst, gyroscope ring around the cube, twinkling stars.
- **Timing & spacing**: 120 BPM grid; beat-locked pulses, snaps and EQ kicks.
- **Match cuts**: colour (S1→S2, S3→S4), shape/size (S2→S3, S6→S7), 2D→3D (S4→S5), 3D→2D (inside S7).
- **Camera language**: log-distance dolly zooms, pull-back reveal, orbit drift, push-in, whip pan, handheld micro-drift, impact shake.
- **Depth**: exploded UI layers, parallax floating covers with pre-blurred textures (fake DOF), fog, dust particles.
- **Lens / post** (`src/lib/fx.js`): bloom, zoom blur, directional blur, chromatic aberration,
  vignette, animated film grain, colour flash, done in linear light with a manual sRGB transfer.
- **Kinetic typography** (`src/lib/type.js`): kerning-preserving per-glyph layout, masked
  reveals, pop/stretch/emerge modes, a counter with fixed digit slots (no jitter), word-level staggers.
- **Materials and lighting**: anisotropic vinyl grooves and brushed aluminium, clearcoat plastics and
  glass, iridescent lens coatings, studio strip-light environments (`src/lib/studio.js`) rotated to
  sweep reflections, and a material morph from lit to flat emissive.
- **Scale**: the library wall is one instanced mesh (900+ tiles) with a custom shader: three 8×8
  cover atlases (music, podcasts, audiobooks), rounded-corner SDF masks, a light sweep and depth fog.

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

With software WebGL on 4 vCPUs a full render takes about 45 minutes (~0.7 frames/s).
The renderer drives headless Chromium one frame at a time, so frames are never dropped, and pipes
lossless PNGs into x264 (CRF 16, BT.709). Each frame is a pure function of time, so several
browsers render chunks in parallel and the segments are concatenated.

## Layout

```
index.html            preview player + import map
src/main.js           director: renderer, post stack, shot timeline
src/lib/              easing, keyframes, type, brand (palette/icon/UI glyphs), covers, post FX,
                      phone model, studio lighting, library artwork (music/podcast/audiobook)
src/shots/s1..s7      one module per shot; each exports start/end and update(localTime)
scripts/render.mjs    offline renderer (Playwright → ffmpeg)
scripts/serve.mjs     zero-dependency static server
assets/fonts/         Figtree (SIL Open Font License)
```
