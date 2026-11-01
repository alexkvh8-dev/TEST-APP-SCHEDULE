# Google: "Every question opens a world" (60 s spec ad)

A one-minute, fully code-built motion-graphics spot in Google's brand language. Every
frame is generated: three.js for the 3D shots (a Kyoto city that rises out of a map, a maple
leaf, a dotted globe) and Canvas 2D for type and product UI. Two renderers drive the same
engine:

- **Motion skill pipeline** (`scripts/render.mjs`): Playwright + headless Chromium, frame by
  frame into ffmpeg. This rendered the master.
- **HyperFrames** (`hyperframes.html`): the same engine registered as a HyperFrames
  composition and seeked through its `hf-seek` protocol. `hyperframes lint` reports
  0 errors and 0 warnings, and a test slice rendered through `hyperframes render` matched
  the engine's own frames.

Deliverable: [`google-spec-ad.mp4`](google-spec-ad.mp4) (1920×1080, 30 fps, 60.0 s,
H.264, BT.709, picture only, cut on a 120 BPM grid so a track can be dropped in).

> **Unofficial spec ad.** Not produced, commissioned or endorsed by Google. Google, the
> Google logo, Google Maps, Google Lens and Google Translate are trademarks of Google LLC.
> This is a portfolio piece; don't present it as an official Google asset.

## Story

One thread runs through the film: a single search ("kyoto in autumn") opens into Maps,
Lens and Translate, and the four brand dots carry the viewer from shot to shot. The dots
are the opener, the voice indicator in the search box, the speaking bars in Translate,
the point that becomes the globe, and finally the strokes that paint the G.

| Time | Shot | What happens | Transition out |
| --- | --- | --- | --- |
| 0:00–0:12.5 | **Search** | The four dots drop in (gravity, squash and stretch) and breathe in the "listening" wave. "It all starts with a question." A search box grows out from behind them and the dots tuck in as its voice icon. The query types itself, suggestions open, Enter is pressed. A results bento rises with coloured glow shadows (Maps, Lens, Translate, Images), the route draws on the map card, and the cursor clicks Maps. | **Container transform + 2D→3D match:** the Maps card expands to full frame and lands pixel for pixel on Shot 3's top-down camera (mean frame difference 0.69/255 in the master). |
| 0:12.5–0:21 | **Maps (3D)** | The painted map is the ground texture under a straight-down camera. The camera tilts into 3D while about 330 buildings, Kyoto Tower and a vermilion pagoda rise in a cascade. The location puck walks Shijo-dori and the pin rides up onto the pagoda. "Find your way." with a place card. | **Object-as-wipe:** a 3D maple leaf swoops through the lens and covers the frame at the cut. It lives on a shared overlay layer, so its pose and light are continuous across the cut. |
| 0:21–0:29 | **Lens** | The leaf settles over warm autumn bokeh. Lens corner brackets lock on, a four-colour scan sweeps it, sparkles twinkle, and a result card rises ("Japanese maple"). "Search what you see." | **Container transform:** the result card expands to a full white frame. |
| 0:29–0:37 | **Translate** | The white frame contracts into a Translate card. "Thank you" types in; the translation slot-swaps on the beat through Spanish, French, German, Italian, Hindi, Korean and Portuguese and lands on ありがとう. The dots speak as voice bars. "Speak the language." | **Size/position match:** the card folds into the blue dot, which glides to centre at exactly the globe's first-frame size (mean difference 1.14/255). |
| 0:37–0:47 | **Globe (3D)** | The flat blue disc dollies in (log distance) and hands over from flat emissive blue to a lit white globe. Land appears as dots in the four brand colours, cascading out from Kyoto, and search arcs fly to twelve cities. "Every question opens a world." | **Material morph in reverse:** the world compresses back into the blue dot (mean difference 1.01/255). |
| 0:47–1:00 | **End card** | The dot releases its three siblings (a bookend of the opener). They breathe once, then each one paints its segment of the G, riding the stroke head. The G glides into the wordmark, the search box grows below it, and the line types itself: "What will you ask next?" It holds on the google.com homepage composition with a slow push. | Hold. |

## Brand system

All tokens live in `src/lib/brand.js`; shots never hard-code colours.

| Token | Hex | Use |
| --- | --- | --- |
| Blue | `#4285F4` | primary accent, carets, route, Search/Translate |
| Red | `#EA4335` | pin, leaf, Images |
| Yellow | `#FBBC05` | Lens accent |
| Green | `#34A853` | Maps accent |
| Grey 900 / 700 / 300 / 100 / 50 | `#202124` `#5F6368` `#DADCE0` `#F1F3F4` `#F8F9FA` | text, icons, borders, chips, surfaces |

- **Type:** Google Sans 400/500/700. Google released it as open source under the SIL OFL 1.1,
  and it is used here through the Fontsource package. Noto Sans JP, KR and Devanagari subsets
  (OFL) cover ありがとう, 감사합니다 and धन्यवाद. Display tracking is −0.025 em.
- **Logos:** the G icon and the wordmark are the CC0 path drawings from Iconify's `logos`
  set (`logos:google-icon`, `logos:google`), recoloured to the brand hexes. They are never
  distorted.
- **Accent discipline:** each chapter owns one colour: the full stop of its headline, its
  card glow and its tag dot.
- **Motion vocabulary:** expo/quint out for arrivals, cubic in for exits, a smooth bezier for
  camera moves, and springs only on physical arrivals (dots, pins, buildings). Every hold drifts.
- **Map data:** Natural Earth land (public domain) via `world-atlas` gives 4,235 dots on a
  Fibonacci sphere (`tools/build-globe.mjs`). The Kyoto map is a stylised, hand-built grid
  (`src/lib/map.js`).

Brand references: the four-colour palette as published in Google's brand material (see,
e.g., [Google for Work brand colours](https://brand-genome.github.io/brands/google-for-work/)),
and the [open-sourcing of Google Sans](https://www.creativebloq.com/design/fonts-typography/googles-iconic-brand-font-is-now-free-for-anyone-to-use)
([Google Sans Flex coverage](https://9to5google.com/2025/11/18/google-sans-flex-font-available/)).
UI numbers are deliberately avoided, and the film makes no product claims or statistics.

## Project layout

```
index.html            preview player (space = play/pause, arrows = step, ?t=12 jumps)
hyperframes.html      HyperFrames composition: the same engine, seeked via hf-seek
src/main.js           director: renderer, post stack, shared 3D overlay layer, shot list
src/preview.js        real-time preview loop (index.html only)
src/lib/brand.js      palette, logo paths, UI glyphs (cards, pins, cursor, brackets)
src/lib/map.js        Kyoto map data, painted once for both the 2D card and 3D ground
src/lib/leaf.js       the maple leaf (overlay scene, pose function, whip blur)
src/lib/type.js       Google Sans + kinetic type (per-glyph staggers, masked reveals)
src/lib/ease.js, util.js, fx.js, studio.js   motion skill engine
src/shots/s1-search.js … s7-end.js           one module per shot
src/data/land-dots.js generated globe dots
tools/build-globe.mjs Natural Earth → land dots
```

## Render

```bash
npm install
```

```bash
npm run preview
```

```bash
node scripts/render.mjs --workers 4 --out out/master.mp4
```

```bash
bash path/to/motion/scripts/encode_web.sh out/master.mp4 google-spec-ad.mp4 18.5
```

Or through HyperFrames:

```bash
npx hyperframes lint ./hyperframes.html
```

```bash
npx hyperframes render -c ./hyperframes.html -o out/hyperframes.mp4
```

Software GL renders about 1.1 frames/s with 4 workers (around 27 minutes for the film).
HyperFrames uses screenshot capture under software GL, so it is slower.

## QA

- Every cut was checked as a before/after frame pair from the rendered master with
  `seam_check.py`:

  | Cut | Type | Mean abs. difference (0–255) | Luma before → after |
  | --- | --- | --- | --- |
  | 12.5 s | card → 3D map, pixel match | 0.69 | 228.0 → 228.0 |
  | 21.0 s | leaf object-wipe (meant to change) | 29.74 | 160.4 → 150.6 |
  | 29.0 s | white → white container transform | 0.94 | 249.8 → 249.8 |
  | 37.0 s | dot → globe, size/position match | 1.14 | 246.2 → 246.2 |
  | 47.0 s | globe → dot, material morph | 1.01 | 245.9 → 246.1 |

- `track_motion.py` on the dot glide into the globe shows one clean velocity bell
  (2 → 8.6 → 0 px/frame at 480 px wide) with no sign flips.
- The master has 1,800 frames over 60.000 s. The web cut is 17.9 MB, two-pass H.264 and
  BT.709-tagged.
- Rotations stay under 5°/frame. The leaf peaks at about 3°/frame and the globe spins at
  0.3°/frame. No overshoot sits on a frame that is match-cut.
- Type exits finish before every cut; type over the 3D map has a white scrim.
