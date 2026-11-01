# Motion toolkit: fundamentals to advanced

Contents
1. Timing and rhythm
2. Easing vocabulary
3. The 12 principles, applied
4. Smoothness rules (anti-jitter)
5. Transitions and match cuts
6. Camera language
7. Kinetic typography
8. 3D realism: materials and light
9. Lens and post
10. Depth, scale and cascades
11. Recipes from the Spotify ad

Helpers referenced below live in `assets/template/src/lib/`: `seg(t,t0,t1,ease)` maps
time into an eased 0..1, `lerp`, `clamp`, `kf` (keyframe tracks), `rng` (seeded random),
`noise1` and `shake`, and `E.*` easings, `E.spring`, `E.kick` and `E.wobble`.

## 1. Timing and rhythm

- Pick a beat grid before animating (120 BPM → `BEAT = 0.5 s`). Cuts, pops, kicks and
  the CTA land on it, so a music track can be laid in later.
- Hold readable things long enough: about 0.3 s per word for a headline. A hero line needs at
  least 1 s fully settled before it exits.
- A 60 s ad typically runs 6–8 shots of 5–12 s. Open fast (the hook lands inside 2 s), let
  the middle breathe, and end with a 6–9 s end card that has the logo lockup, line and CTA.
- Overlap: the next element starts before the previous one finishes (stagger 30–120 ms),
  otherwise motion feels robotic.

## 2. Easing vocabulary

| Use | Curve |
| --- | --- |
| Type / UI arriving | `outExpo`, `outQuint`, `snap` bezier (0.16,1,0.3,1) |
| Type / UI leaving | `inCubic`, `inBack(1.5)` for a playful exit |
| Camera moves, long glides, colour/material morphs | `inOutCubic`, `inOutSine`, `smooth` bezier (0.65,0,0.35,1) |
| Aggressive camera push / whip | `swoop` bezier (0.83,0,0.17,1), `inExpo` into a whip |
| Physical arrival with life | `E.spring(t, freq≈1.6–3, zeta≈0.3–0.5)`, `outBack(1.2–2)` |
| Beat pulses | `E.kick(t)` (sharp attack, exponential decay) |
| Anticipation | `anticipate` bezier (0.6,-0.35,0.4,1) or a short `inQuad` press before the release |
| Distance / zoom | interpolate in **log space**: `exp(lerp(log a, log b, p))`, so the perceived speed stays constant |

Define the film's "house" curves once and reuse them, because consistency of feel is part of brand consistency.

## 3. The 12 principles, applied

- **Squash & stretch**: preserve volume (`sx = 1/sqrt(sy)`); dot landing, bouncing bolt.
- **Anticipation**: the button presses in (`inQuad`, 150 ms) before it springs out; a dot shrinks before a zoom-through.
- **Staging**: one focal point per moment. Dim, blur or fog everything else, and give type a scrim.
- **Straight-ahead vs pose-to-pose**: pose-to-pose via `kf` tracks; straight-ahead for procedural idles (noise, sine drift).
- **Follow-through / overlapping action**: exploded UI layers collapse with staggered timing; per-letter springs.
- **Slow in / slow out**: everything eases (section 2).
- **Arcs**: travel along curves (`pos.y += sin(π·p)·h`) rather than straight lines.
- **Secondary action**: shockwave rings, sparks, a twinkle, a gyroscope ring around a cube.
- **Timing**: on the beat grid; heavier things move slower.
- **Exaggeration**: in pops and slams only. Calm moments stay calm.
- **Solid drawing**: real 3D, bevels, correct perspective, consistent light direction.
- **Appeal**: brand colour blocking, generous negative space, one bold idea per shot.

## 4. Smoothness rules (anti-jitter)

These come from fixing a sequence the user called "jittery":

1. **Angular speed per frame.** If something spins with `angle = f(t)`, check
   `Δangle per frame = f'(t)/fps`. Above ~5°/frame it strobes. A spiral whose angle grew as
   `6·p³` hit ~50°/frame near the end. Use one `inOutCubic` spiral instead (peak ~3°/frame).
2. **Don't stack kicks on a continuous move.** Absorption "pulses" added on top of a
   growing sphere read as stutter. One eased growth curve looks better.
3. **No overshoot during a hero move.** `outBack` and springs on something that is about to
   be match-cut cause a visible wobble at the seam. Settle before the cut.
4. **No oscillation faster than ~2 Hz** on anything large (a 3 Hz squash looked like vibration).
5. **Coin turns and flips**: use `inOutCubic` or `inOutSine`, not `inOutExpo`, whose snap
   in the middle reads as a pop.
6. **Velocity continuity across a cut**: if the camera moves into a cut, the next shot starts
   moving at a similar speed, or both sides are still.
7. **Fades of many elements**: fade opacity on an eased curve, not a linear one.
8. **Verify with numbers**: `scripts/track_motion.py` on the rendered video. Acceleration
   spikes mean a pop. A material change can also fake a spike, so confirm by eye.

## 5. Transitions and match cuts

Plan every cut as a hand-off. The next shot's first frame is known: a shot *publishes*
its first-frame geometry through `env.shared`, and the previous shot draws into it.

- **Colour match**: the outgoing element (art card, object) flies into the lens until its flat
  colour fills the frame. The next shot opens on that solid colour. Hand the 3D material over
  from lit to flat emissive (`color→black, emissive→colour, specular/clearcoat→0`) so the
  colour is exact.
- **Shape match**: same silhouette, same screen size (vinyl label, 300 px → play button,
  300 px). Size the incoming camera distance from the target pixel size:
  `d = (worldSize · H) / (2 · tan(fov/2) · pixelSize)`.
- **Size/position match** (2D↔3D): project the next shot's 3D object through its *start
  camera* (a clone positioned at the first-frame pose) and draw the 2D element at exactly
  that rect, with the same corner radius as a fraction of size. The cut is invisible.
- **Circle / iris wipe**: a circle of the next background colour grows from the object's
  projected screen position.
- **Whip pan**: `inExpo` rotation into the cut, directional blur proportional to angular
  velocity (`blur = clamp(|ω|·0.02, 0, 0.3)`). The next shot starts with decaying blur.
  Match luminance on both sides. Darken a bright outgoing shot during the whip.
- **Zoom-through**: push through a dot or a node, zoom blur centred on the projected point.
- **Material morph**: lit 3D to flat 2D (sphere → flat logo disc), then swap for the vector
  logo on a frame where they are pixel-identical.
- Text, chips and overlays must **finish their exit before the cut**: count
  `out + stagger·(n−1) + outDur`.

## 6. Camera language

- Pull-back reveals (log-distance), push-ins to a hero, slow orbit drift (`inOutSine` over
  many seconds), crane up, whip pans, rack focus (where DOF is available).
- Handheld micro-drift: `0.05·sin(t·0.9)` scale, never random per frame.
- Impact shake: `shake(t, amp·kick(t−hit))` from `util.js`. It is deterministic noise.
- A camera that is about to be match-cut ends with zero velocity, or with a velocity that the next shot continues.

## 7. Kinetic typography

`kText(ctx, str, {...})` in `type.js` lays out glyphs with real kerning and animates each one:
- Modes: `rise` (masked slide-up, the default), `drop`, `pop`, `fade` (with blur),
  `slide`, `spin`, `stretch`, `emerge`. `unit: 'word'` for sublines.
- `mask: true` clips each line to its band, so glyphs appear from behind an invisible edge.
- `colorAt(i)` puts the brand accent on punctuation (a green full stop).
- `order: 'center'` makes glyphs radiate from the middle.
- Counters: draw each digit in a **fixed slot** (`measure('0')`) so the line never shifts
  while counting; ease the value with `outExpo`.
- Scrim under type over busy imagery: a vertical gradient from 0 to ~0.9 opacity of the
  background colour, with its stops weighted toward the text.
- 2D type goes on the `fg` layer (after bloom), so it stays crisp. Put it on `bg` only when it should glow.

## 8. 3D realism: materials and light

- **Studio environment**: `studioEnv(THREE, renderer, 'dark'|'light')` gives softbox
  strips in a black room or a bright cove. Rotate `scene.environmentRotation` slowly so
  reflections slide (Apple-style light sweep).
- **Rim lights in the brand palette** (e.g. pink and green directional lights from behind)
  trace silhouettes and tie 3D to the brand.
- **Materials**: `MeshPhysicalMaterial` with clearcoat (plastic, glass, screens),
  `anisotropy` (brushed metal), `iridescence` (lens coatings), `transmission` +
  `thickness` + `dispersion` (glass), real bevels (`ExtrudeGeometry` bevel, `RoundedBox`).
- **Devices**: build from a rounded-rect band with a hole (frame), side keys, front glass
  slab, an emissive display plane with an alpha-mapped rounded mask, punch-hole, back
  glass with a frost texture, a camera island with ringed lenses. Display reflections should be
  faint (~0.08 env intensity): a strong strip across a screen reads as a light leak.
- **Catchlights**: a point light on the camera axis prints a lone dot in the centre of a
  glossy sphere. Place fill/glow lights along the key light's direction so catchlights merge.
- **Exact colour where it matters**: hand lit materials over to flat emissive before a cut or
  a logo, because lit materials never hit a hex value exactly.

## 9. Lens and post

`FinalShader` in `fx.js` runs last: zoom blur, directional blur, chromatic aberration
(radial), flash, linear→sRGB, vignette, animated grain. Bloom
(`UnrealBloomPass`) runs on the 3D and bg layers. Per shot, `update()` returns
`{ bloom: [strength, radius, threshold], vignette, ca, grain, zoomBlur, zoomCenter, dirBlur, flash, fade }`.
Keep values in a narrow band across the film and **identical across a match cut**.

## 10. Depth, scale and cascades

- Parallax layers, floating cards at varied z, fog to the background colour, dust particles.
- Scale: one `InstancedMesh` with a custom shader for hundreds or thousands of tiles. Use texture
  atlases (8×8 cells, gutters against mip bleed), a cell picked per instance, a rounded-SDF
  mask, a light-sweep band and depth fog.
- Cascades/ripples: delay each element by its distance from an origin
  (`delay = d·0.035–0.055 s`). Flip waves turn tiles edge-on at the halfway point and swap
  content when they are invisible.

## 11. Recipes from the Spotify ad (60 s)

| Shot | Idea | Technique |
| --- | --- | --- |
| Pulse | A green dot falls, squashes, pulses on the beat, hops to become a full stop | gravity ease + volume-preserving squash; arc hop; zoom-through colour match |
| Vinyl | Pull back from inside the label to a spinning record | log-distance dolly; anisotropic grooves; flip settles face-on at 300 px |
| Press play | Label → play button on a realistic phone; exploded UI collapses; press, shockwave, sparks; floating cards | shape match; staggered collapse; anticipation + spring; art card flies into lens with lit→flat handover |
| Moods | Duotone cards with a 3D object each; circle wipes born from the object | spring entrances, idle personalities, outline marquees, iris wipe |
| Library | The four mixes become the hero tiles of a curved wall; filter chips flip it to podcasts, audiobooks, all | 2D→3D match via projected rects; instanced wall; flip waves; fixed-slot counter; scrims; whip with luminance match |
| Made for you | Covers orbit 3D type; the full stop is a sphere that absorbs them | spring letters; one smooth spiral; glide + single growth curve |
| End card | Sphere coin-turns flat, swaps to the 2D logo, lockup, CTA with shine | material morph, pixel-matched swap, arcs draw on, shine sweep |
