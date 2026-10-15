# Laptop cursor animation (Remotion)

A 14-second, 60 fps product shot. A hand cursor tours the icons on a 3D
laptop's dashboard and comes to rest on **Dedicated Servers**. The camera
moves through a 3D scene and follows the cursor as it goes.

Rendered videos:

| File | Size | Use |
| --- | --- | --- |
| `out/laptop-cursor-1080p60.mp4` | 1920×1080, 60 fps, H.264 | YouTube, Behance, presentations |
| `out/laptop-cursor-square-1080p60.mp4` | 1080×1080, 60 fps, H.264 | Instagram, LinkedIn, X |

## Running it

```bash
cd video
npm install
npm run studio        # live preview with a scrubber
npm run render        # 16:9 MP4  -> out/laptop-cursor-1080p60.mp4
npm run render:square # 1:1 MP4   -> out/laptop-cursor-square-1080p60.mp4
```

Rendering takes about 3 seconds per frame on 4 CPU cores, so a full 840-frame
render takes around 45 minutes on a laptop without a GPU.

## How it's built

The scene uses no WebGL. It's built from real DOM elements with CSS 3D
transforms, so the dashboard text stays sharp even when the camera is close.

- **`src/dashboard/`**: the dashboard UI, rebuilt as HTML from the reference
  design. `layout.ts` holds every position the cursor aims at, so the UI and
  the animation can't drift apart.
- **`src/motion/timeline.ts`**: the choreography. Each `SEGMENTS` entry is one
  cursor move with its own start time, duration, easing curve and arc. The
  click comes at `CLICK_T`.
- **`src/motion/track.ts`**: simulates every frame ahead of time:
  - hover fades (quick in, slow out)
  - the cursor tilting into its moves
  - the cursor's height above the glass: it drops in, lifts while it travels,
    rises slightly before the click, then presses down and springs back
  - the camera rig: an establishing orbit, then a damped chase of the cursor
    (orbiting to its side of the screen and easing out on fast moves), then a
    slow push-in and orbit after the click
- **`src/motion/math.ts`**: the easing curves. They're named by feel: `glide`,
  `hop`, `swoop`, and `settle` (which lands slightly past the target and eases
  back).
- **`src/scene/`**: the laptop (base, keyboard, lid edges, notch, a glass
  reflection that moves with the camera), the cursor (motion blur and a
  contact shadow), the environment (rocks, floor, haze, depth-of-field dust)
  and the film finish (vignette, grain, fades).

### Common tweaks

- **Choose a different final icon:** change `ACTIVE_FINAL` in
  `src/dashboard/layout.ts`, and the last entry in `SEGMENTS` (`nav(2)`) in
  `src/motion/timeline.ts`.
- **Change the route or pacing:** edit the `SEGMENTS` start times and
  durations. Keep every segment starting after the previous one ends.
- **Change the cursor size:** set `CURSOR_H` in `src/config.ts`.
- **Change the brand or data:** edit the text in `src/dashboard/Dashboard.tsx`.

### Assets

- `public/cursor-hand.png`: the supplied hand cursor, with its background cut
  out.
- `public/rock-*.png` and `public/grain-*.png`: procedural textures. Regenerate
  them with `python3 scripts/generate-assets.py` (needs numpy and Pillow).

`remotion.config.ts` forces Chrome's SwiftShader GPU path (`swangle`). Chrome's
default software path sometimes drops the floating cursor layer from the 3D
scene.
