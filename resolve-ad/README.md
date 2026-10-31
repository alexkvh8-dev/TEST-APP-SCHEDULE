# "Resolve" — DaVinci Resolve 3D motion-graphics spec ad

A 90-second, 1920×1080, 30 fps ad for DaVinci Resolve, built entirely in code (three.js + Canvas 2D)
and rendered frame by frame. **Picture only — no music or SFX.** Cuts and accents sit on a beat
grid, ready for a track.

**Watch:** [`out/resolve-web.mp4`](out/resolve-web.mp4) (H.264, BT.709, under 20 MB).

> Unofficial spec / portfolio piece. Not produced, commissioned or endorsed by Blackmagic Design.
> DaVinci, DaVinci Resolve, Fairlight, Blackmagic Cloud, the page names, icons and logos are
> trademarks of Blackmagic Design.

## Funnel

Hook → what it is → proof, page by page → AI → collaboration → recap → offer.
It ends on the conversion path Blackmagic actually uses: **download free, upgrade to Studio**
(US list price $295, one-time purchase).

| Time | Shot | What it shows | Hand-off |
| --- | --- | --- | --- |
| 0:00 | **Hook** | EDIT. COLOR. VFX. AUDIO. DELIVER. — kinetic slams, each with its page's signature graphic, whip blurs and lens punches, then "ONE APP." | Collapses to a point of light, which flares |
| 0:06 | **The mark** | Glass petals fly in and lock into a polished frame. Real refraction, dispersion, anamorphic flares, depth of field. "DaVinci Resolve" | Dive into the glass |
| 0:13 | **Edit** | The Edit page floating in 3D, with the timeline exploded forward; clips snap in and the playhead really cuts the viewer between shots. "Cut fast." Then the Speed Editor: the search dial scrubs and the CUT key cuts | Top-down on the dial (**match cut**: dial to wheel) |
| 0:25 | **Color** | The Gamma wheel at the dial's size and position, pulling back to the Color page over a trackball panel. The footage grades live from flat LOG to teal/orange, with pucks, trackballs and an RGB parade (from real pixels) in sync. Rack focus, a before/after wipe, the node graph, three looks in a burst | Dive into a node |
| 0:41 | **Fusion** | A 3D node graph with glowing wires and signal pulses; the camera flies the chain to MediaOut: footage, a chrome 3D title and particles | Whip pan |
| 0:50 | **Fairlight** | A 3D dialogue waveform; a light blade sweeps across as Voice Isolation strips the noise | Flash |
| 0:58 | **AI** | DaVinci Neural Engine: Magic Mask locks a matte onto the hiker, IntelliSearch finds "hiker at sunset", the toolset lands as chips | Flash |
| 1:07 | **Deliver + Cloud** | Render queue to green ticks, a whip across to a shared timeline with collaborators' cursors (Blackmagic Cloud) | Flash |
| 1:15 | **Recap** | Speed-ramped montage re-rendering live moments from every page, with the hook's words slamming back, then "ALL IN ONE." | Flare |
| 1:21 | **Offer** | The glass mark beside "Download free.", Studio upgrade and price, a button with a shine pass, the URL, the Blackmagic Design mark | End |

## Motion and finishing toolkit

- **Easing**: expo, quint, back, bezier, damped springs. Every move eases.
- **Classic principles**: anticipation (key press), follow-through (layers clapping together),
  overlap (staggered glyphs and clips), arcs (petal flights), secondary action (pulses, particles).
- **Transitions**: match cuts (dial to wheel, 2D nodes to 3D nodes), whip pans with directional
  blur, light-led flares, zoom-through dives, a speed-ramped montage.
- **3D realism**: physically based materials; glass with transmission, thickness, absorption tint and
  **spectral dispersion**; brushed and knurled metal with anisotropy; clearcoat plastics; glossy
  trackballs; studio-strip environment lighting.
- **Lens**: barrel distortion with per-channel dispersion (real chromatic aberration), anamorphic
  streaks, bloom, depth of field and rack focus, vignette, grain.
- **Live content**: a procedural drone-footage world feeds every viewer through a real grading
  shader (log, lift/gamma/gain, contrast, saturation, split-tone, wipe, subject matte). Scopes are
  computed from read-back pixels.

## Brand notes and sources

- Logo outlines come from [Simple Icons](https://simpleicons.org) (CC0 path data): DaVinci Resolve
  `#233A51`, Blackmagic Design `#FFA200`.
- I couldn't verify the official petal colours here (Wikipedia, Wikimedia and blackmagicdesign.com
  are blocked in this environment). They're rendered as red/green/blue tinted glass, a nod to the
  three channels the wheels grade. Change `B.petals` in `src/lib/brand.js` to the official hexes.
- Blackmagic's wordmark is custom lettering ([madegooddesigns](https://madegooddesigns.com/blackmagic-font/)),
  so type is **Inter Display** (SIL OFL).
- Features shown are current: Magic Mask v2, IntelliScript, AI audio tools (Resolve 20,
  [Blackmagic](https://www.blackmagicdesign.com/media/partial/release/20250404-02),
  [CineD](https://www.cined.com/davinci-resolve-20-released-with-handful-of-ai-assisted-features/));
  IntelliSearch and CineFocus (Resolve 21,
  [CineD](https://www.cined.com/davinci-resolve-21-announced-new-photo-page-eight-new-ai-tools-tethered-camera-controls-and-more/),
  [Newsshooter](https://www.newsshooter.com/2026/04/13/blackmagic-design-announces-davinci-resolve-21-major-update-adds-new-photo-page/)).
  The free version plus a $295 one-time Studio licence is from
  [Miracamp](https://www.miracamp.com/learn/davinci-resolve/davinci-resolve-pricing) and
  [Fluxnote](https://fluxnote.io/guides/davinci-resolve-pricing-guide-2026); check regional pricing
  before using it.

## Preview and render

```bash
cd resolve-ad
npm install
npm run preview          # http://127.0.0.1:5173/  (space = play/pause, arrows = step, ?t=25 to jump)
npm run render           # out/resolve.mp4 (CRF 16 master, not committed), ~70–90 min on 4 vCPU software GL
node scripts/render.mjs --query shots=s04-color --stills 27,31,36 --out out/stills   # one shot only
```

## Layout

```
src/main.js            director: post stack (DOF -> bloom -> streaks -> type -> lens), shot list
src/lib/brand.js       palette, logo paths, 2D marks
src/lib/footage.js     procedural drone-footage world, grading shader, Magic Mask matte, scopes
src/lib/ui.js          Resolve UI: page bar, timeline, colour wheels, parade, nodes, Fairlight, Deliver
src/lib/hardware.js    Speed Editor, trackball panel
src/lib/logo3d.js      refractive glass mark
src/lib/fx.js          lens shader + anamorphic streak pass
src/lib/stage.js       floating UI panels, viewers, backdrops
src/shots/s01..s10     one module per shot
```
