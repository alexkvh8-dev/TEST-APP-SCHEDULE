---
name: motion
description: Make broadcast-quality motion-graphics films, ads, promos, brand spots, product reveals, explainers, logo animations and title sequences entirely in code (three.js + Canvas 2D), rendered frame-accurate to MP4 with Playwright + ffmpeg. Covers the whole job, from brand research and storyboard to motion design (easing, match cuts, kinetic type, camera moves, transitions, 3D materials and lighting, lens effects), rendering, frame-by-frame QA and a web cut under a size budget. Use this whenever the user wants an animated video or ad for a brand, product or app, wants "motion graphics", "an After Effects / Cinema 4D style" piece, a 3D animated commercial, kinetic typography, or wants to fix, smooth or re-cut such a film, even if they never say "motion graphics".
---

# Motion

Build motion-graphics films the way a studio would: brand-true design, a story that
sells, motion that obeys animation fundamentals, and a deterministic render pipeline
that produces the same pixels every time. The approach was proven on a 60 s Spotify
spec ad (realistic 3D phone, mood cards, a library wall, a sphere-to-logo end card).
The same engine also produced an Apple ad and a 90 s DaVinci Resolve ad.

Picture only unless asked: no music or SFX, but cut on a beat grid so a track drops in.

## The workflow

Each stage has a reason, so don't skip stages to get to pixels sooner.

1. **Research the brand** before designing anything. Find its real palette (hex values),
   type (and a licensed stand-in if the face is proprietary), logo construction, UI
   language and how its own ads move. Reference links may be unreachable (Pinterest
   short links, some brand sites). Say so, then work from what you can verify.
   Details: `references/brand-and-story.md`.
2. **Write the storyboard as a table**: time, shot, what happens, and *the transition
   out*. Plan every transition as a hand-off: a match cut, whip, colour wipe or zoom-through.
   A film where shots merely follow each other feels like slides. Use a hook in the first
   2 s, then proof, then a payoff, an end card and a CTA.
3. **Scaffold from the template**: copy `assets/template/` into the project, run
   `npm install`, then `npm run preview`. It holds the director, the post stack, the
   easing/type/fx/studio libraries, the deterministic renderer and a working
   two-shot demo with a match cut. Architecture and rules: `references/pipeline.md`.
4. **Build shot by shot**, one module per shot. For each one, render stills at its
   key moments and at both edges, then look at them before moving on.
5. **Polish motion**: run the smoothness rules in `references/principles.md`. Users notice
   jitter long before they can name its cause.
6. **Render the master**: `node scripts/render.mjs --workers <cores>`. It renders in the
   background, about 0.8 frames/s on 4 vCPUs with software GL. When only some shots
   change, re-render just those ranges and splice them (see pipeline.md).
7. **Run QA on the actual video, not just stills**: `scripts/seam_check.py` for every cut,
   `scripts/track_motion.py` on anything the user called jittery, plus contact sheets
   (`scripts/contact_sheet.py`). Details: `references/qa.md`.
8. **Deliver**: `scripts/encode_web.sh master.mp4 web.mp4 18.5` (two-pass, under a size
   budget, BT.709). Commit, write a README storyboard, and send the file.

## Principles that matter most

The full toolkit, with recipes, is in `references/principles.md`. These are the ones that
separate "AI slideshow" from "studio piece":

- **Nothing linear.** Every start and stop eases. Use expo/quint out for UI and type
  arrivals, in-out cubic/sine for camera and long moves, and damped springs for physical
  objects. Keep overshoot (`outBack`, springs) for arrivals that should feel alive, and
  never put it on something the eye is tracking during a slow, emotional move.
- **One move, one curve.** Stacking several small eased moves on the same property
  (kicks on a growth, pulses during a glide) reads as stutter. Merge them into a single
  continuous curve.
- **Per-frame budget.** Rotations faster than ~5° per frame strobe at 30 fps. Check
  `angle'(t) / fps` for anything spinning, especially when speed scales with 1/radius.
- **Every cut is designed.** Match colour (fill the frame with the next shot's background),
  shape (vinyl label to play button), size and position (a 2D dot to a 3D sphere, pixel
  for pixel), or 2D↔3D (flat covers that become the first tiles of a 3D wall). Compute
  match positions by projecting the next shot's first-frame camera. Never eyeball them.
- **Light-sweep whips need matched luminance**: dim or brighten the outgoing shot so the
  cut lands on the incoming frame's exposure.
- **Type is choreography**: per-glyph staggers (20–40 ms), masked reveals, an accent
  colour on the full stop, numbers in fixed digit slots so counters never wobble, and exits
  that finish *before* the cut. Put a scrim under type laid over busy imagery.
- **Show the product's own language.** Abstract visualisations confuse viewers. The bar-field
  "spectrogram" was rejected as hard to understand. A wall of real-looking covers, driven
  by the app's own filter chips (Music → Podcasts → Audiobooks), explained the same idea at
  a glance.
- **Realism comes from light.** Use studio strip environments (`studio.js`) rotated over
  time so reflections glide, plus coloured rim lights in the brand palette, clearcoat, anisotropy
  on metal and real bevels. Hand over from lit to flat emissive at a cut, so brand colours
  are exact where it counts.

## Consistency rules

- Keep one palette module and one type module, and use them everywhere. Don't use one-off hex values in shots.
- Use one easing vocabulary for the whole film: the same "house" curves for type in, type out,
  camera and UI.
- Use one rhythm: a beat grid (e.g. 120 BPM = 0.5 s), with cuts and accents on it.
- Use one light: the same studio environment family and rim colours across 3D shots, and match
  reflections across cuts (same env rotation, same lights on both sides).
- Use one grain/vignette/bloom look, tuned per shot only within a narrow band. Bloom and vignette
  must be equal on both sides of a match cut.
- Recurring motifs (the brand dot, the full stop in the accent colour) tie shots together.

## Working with the user

- Before a long render, show stills of the shots you changed. Renders take tens of minutes.
- When the user flags a section ("jittery", "not understandable"), find the *cause* by
  inspecting the motion maths and the rendered frames, then say what it was in plain words.
- For brand work, make it clear the piece is an unofficial spec ad, put the trademark notice in the
  README, and never present it as an official brand asset or publish it as one.
- Keep the deliverable under any size cap with `encode_web.sh` and verify the size.

## Bundled files

| Path | What it is |
| --- | --- |
| `assets/template/` | Runnable project: director (`src/main.js`), libs (`ease`, `util`, `type`, `fx`, `studio`), demo shots, preview page, `scripts/render.mjs` and `serve.mjs`, and Figtree fonts (OFL) |
| `scripts/contact_sheet.py` | Labelled 2×2 sheets from a folder of stills |
| `scripts/seam_check.py` | Frame-before and frame-after every cut, with difference and luma numbers |
| `scripts/track_motion.py` | Colour-tracks an element per frame and flags acceleration spikes (jitter) |
| `scripts/encode_web.sh` | Two-pass H.264 to a size budget, BT.709 tagged |
| `references/principles.md` | The motion toolkit: fundamentals → advanced, with code recipes |
| `references/pipeline.md` | Architecture, shot contract, determinism, rendering, splicing, three.js pitfalls |
| `references/brand-and-story.md` | Brand research, design tokens, story structure, storyboard template, worked example |
| `references/qa.md` | The review loop and what to look for |
