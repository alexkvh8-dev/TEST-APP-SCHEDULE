# "Hello" — Apple 3D product film spec ad

A 60-second, 1920×1080, 30 fps product film in Apple's visual language, built entirely in code
(three.js + Canvas 2D) and rendered frame by frame. **Picture only — no music or SFX.**

**Watch:** [`out/apple-hello-web.mp4`](out/apple-hello-web.mp4) (H.264, BT.709, under 20 MB).

> Unofficial spec / portfolio piece. Not produced, commissioned or endorsed by Apple. Apple, the
> Apple logo, iPhone, Apple Watch, AirPods and MacBook are trademarks of Apple Inc.

**Research first:** [RESEARCH.md](RESEARCH.md) covers what Apple's guidelines and its product films
do, and how each finding shaped this film.

## Storyboard

| Time | Shot | What happens | Cut |
| --- | --- | --- | --- |
| 0:00–0:07 | **Edge** | Darkness. A grazing light finds the titanium band and slides along the chamfer and Camera Control as the macro camera drifts up the side. "Every edge, considered." | The highlight swells into a flare |
| 0:07–0:14 | **Lens** | Out of the flare: a macro orbit over the camera plateau, strip lights gliding across the lens rings and iridescent coatings. "Look closer." | Pushes into the lens until the frame goes dark |
| 0:14–0:31 | **Hello / Inside** | "Hello." on black. The phone emerges mid-turn (back, side, front), wakes to a 9:41 Lock Screen, and the Dynamic Island blooms into a Live Activity. It tilts into an exploded view: layers part along one axis, logic-board traces pulse with light. "Inside and out." Then it reassembles and settles face-on | Invisible: same pose and size |
| 0:31–0:39 | **Glow** | The Live Activity folds away; the intelligence edge glow flows around the screen, colours spill into the room and tint the frame. "Ready when you are." | The glow swells into a white-out |
| 0:39–0:55 | **Colors / Together** | The bright stage. Five colour iPhones arrive edge-on, turn to show their backs, then wake in a wave. "Choose your color." Four fade away; one glides into a family shot as MacBook (lid opening), Apple Watch and AirPods join and light up. "Better together." | Fade to black |
| 0:55–1:00 | **Logo** | The logo alone, resolving from a soft blur, with one sheen of light | End |

## How it follows Apple's language

- **Motion**: long ease-outs, critically damped springs, slow continuous camera moves. No
  squash, no overshoot, no whip pans.
- **Light as the storyteller**: a custom studio environment of softbox strips. Sweeps are made
  by rotating the environment, so reflections glide across titanium, glass and lens coatings.
- **Type**: one short, declarative line per beat, centred, Inter Display Semibold (standing in
  for SF Pro Display), resolving from blur. Plain `#f5f5f7` on black, `#1d1d1f` on light, and
  the multicolour gradient only for the intelligence line.
- **Product truth**: proportion-accurate models; the 9:41 Lock Screen; Dynamic Island; the
  exploded view; the colour lineup; the family shot; the logo once, at the end.

## Preview and render

Needs Node 18+ and ffmpeg. Playwright (with its Chromium) is required only for rendering.

```bash
cd apple-ad
npm install
npm run preview          # http://127.0.0.1:5173/  (space = play/pause, arrows = step, ?t=31 to jump)
npm run render           # out/apple-hello.mp4 (CRF 16 master, not committed)
node scripts/render.mjs --stills 14.5,26,33 --out out/stills
node scripts/render.mjs --query test=models --stills 2,12,22,32,42,52 --out out/models   # model turntable
```

To make the under-20 MB web version:

```bash
cd out
ffmpeg -i apple-hello.mp4 -c:v libx264 -preset veryslow -tune film -b:v 2350k -maxrate 4500k -bufsize 9000k -pass 1 -an -f mp4 /dev/null
ffmpeg -i apple-hello.mp4 -c:v libx264 -preset veryslow -tune film -b:v 2350k -maxrate 4500k -bufsize 9000k -pass 2 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart apple-hello-web.mp4
```

## Layout

```
RESEARCH.md           design and motion research, with sources
src/main.js           director: renderer, post stack, studio environments, shot timeline
src/lib/apple.js      palette, finishes, logo outline, continuous-corner shapes
src/lib/type.js       Inter Display type with Apple-style resolve reveals and gradient fills
src/lib/studio.js     softbox-strip environment maps (dark Pro room, bright cove)
src/lib/models.js     iPhone (Pro and colour, with explodable internals), Watch, AirPods, MacBook
src/lib/screens.js    Lock Screen + Dynamic Island + edge glow, Watch face, Mac desktop
src/lib/cam.js        orbit rig, house easing curves, critically damped spring, fades
src/shots/s1..s6      one module per shot; test-models.js is a dev turntable
scripts/              offline renderer (Playwright → ffmpeg) and static server
assets/fonts/         Inter / Inter Display (SIL Open Font License)
```
