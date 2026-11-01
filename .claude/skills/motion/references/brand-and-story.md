# Brand, story and storyboard

## 1. Research the brand first

Collect, cite and write these into the README:
- **Palette** with hex values: the primary, the background(s), secondary text, and the
  expressive/secondary colours. Example (Spotify): Green `#1ED760`, ink `#121212`, mute
  `#B3B3B3`, duotones pink `#F573A0`, blue `#4100F5`, lime `#CDF564`, navy `#1E3264`,
  yellow `#FFC864`.
- **Type**: the brand face and a licensed stand-in if it's proprietary (Spotify Mix/Circular
  → Figtree; SF Pro → Inter; custom lettering → Inter Display). Note the substitution.
- **Logo construction**: draw it procedurally or from CC0 path data (Simple Icons). Keep
  clear space and never distort it.
- **UI language** if it's an app: real screens, components (chips, cards, players), and how
  selection states look. Recreating the brand's own UI makes an ad read as authentic.
- **How the brand moves**: watch its ads and note the pacing, type behaviour, transitions and
  materials. Apple uses slow light sweeps on product, minimal type and huge negative space.
  Spotify uses bold duotones, playful type, and beat-driven pops. Resolve leans on pro UI and
  cinematic glass.
- **Current facts and offer**: feature names, stats ("100 million+ songs") and pricing, with
  sources. Check they're current.

If references are unreachable (blocked links, network policy), say so plainly and work
from what you can verify. Don't invent "official" values.

## 2. Design tokens and consistency

Put everything into `src/lib/brand.js`: colours, logo drawers, UI glyph drawers. Shots import
tokens and never hard-code hex values. Use one type scale (e.g. 46 / 84 / 120–150 px at 1080p), one
tracking style (-0.02 to -0.04 em for display), and an accent colour reserved for one job
(full stops, selection, the CTA).

## 3. Story structure for a conversion ad

Hook → what it is → proof (features, as visible product behaviour) → emotional beat →
recap/payoff → offer and CTA.

- **Hook (0–3 s)**: one striking image or a kinetic slam. No logo-first cold opens unless the
  brand is the hook.
- **Each claim is shown**: "100 million+ songs" is a wall of covers, "Podcasts" is that wall
  flipping into podcasts. If a section needs explaining, redesign the visual rather than
  adding copy.
- **End card**: logo lockup, line, CTA in brand styling, and a final light/shine accent. Hold it
  at least 2 s after the CTA lands.
- Keep the copy short. Headlines are 1–4 words, sublines a single short sentence.

## 4. Storyboard template

| Time | Shot | What happens | Transition out |
| --- | --- | --- | --- |
| 0:00–0:05 | Hook | … | colour match via zoom-through |
| 0:05–0:12 | … | … | shape match (A → B at N px) |
| … | … | … | 2D→3D match / whip / iris wipe |
| 0:51–1:00 | End card | lockup, line, CTA | fade |

Write it before building and keep it in the README, updated as the film changes.

## 5. Legal and honesty

- Brand ads made this way are **unofficial spec pieces**. Add a README notice: "Not
  produced, commissioned or endorsed by X; names and logos are trademarks of X."
- Don't fabricate endorsements, testimonials, prices or statistics. Use sourced numbers.
- Deliver as files. Don't publish brand-impersonating pages.

## 6. Worked example: the Spotify spec ad

60 s, 1920×1080, 30 fps, 7 shots, 120 BPM grid. Throughline: "Every moment has a sound."

| Time | Shot | Transition out |
| --- | --- | --- |
| 0:00 | Pulse: green dot falls, squashes, pulses, becomes a full stop | zoom-through → solid green |
| 0:05 | Vinyl: pull back from the label to a spinning record | label settles at 300 px |
| 0:12 | Press play: realistic phone, exploded UI, press, sparks, floating cards | shape match in; art flies into the lens → pink |
| 0:21 | Moods: duotone cards with 3D objects; "For every mood." deals covers | iris wipes; covers land on the S5 hero rects |
| 0:33 | Library: curved cover wall; chips flip it Music → Podcasts → Audiobooks → All | whip pan (dimmed) |
| 0:43 | Made for you: covers orbit 3D type; the full stop sphere absorbs them | size/position match on the sphere |
| 0:51.5 | End card: coin turn to the flat icon, lockup, line, "Get Spotify Free" | fade |

Lessons from the user's feedback: a stylised spectrogram "didn't feel understandable"
(fixed by showing the product's own UI and content); a phone built from primitives didn't
read as real (fixed with a modelled device and studio lighting); a sphere move felt
jittery (fixed by the smoothness rules in principles.md §4).
