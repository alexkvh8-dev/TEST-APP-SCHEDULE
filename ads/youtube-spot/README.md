# YouTube — 10-second spec spot (Remotion)

> **Unofficial spec ad.** Not produced, commissioned or endorsed by YouTube or
> Google. YouTube, the YouTube logo and the play-button icon are trademarks of
> Google LLC, used here only to show a concept. The end card carries the same
> notice on screen. Don't present this film as an official YouTube asset.

`youtube-spot-10s.mp4`: 1920×1080, 60 fps, 10.0 s (600 frames), H.264,
BT.709, picture only. Cuts land on a 120 BPM grid (0.5 s beats), so a music
track can be dropped in.

## Storyboard

Line: **"Press play on anything."** The hook asks the question ("how to …"),
the middle shows the answer in YouTube's own interface, and the end card
returns to the same word ("anything").

| Time | Shot | What happens | Transition out |
| --- | --- | --- | --- |
| 0.00–1.25 | **Search hook** | The search field slams in out of focus and types `how to `. The last word spins like a slot reel (cook → skate → code → sing → draw → fix a bike → dance → bake bread → fly), each with its own thumbnail flashing behind, then lands on **anything** with a red underline. The search button presses. | The field flies up and becomes the real header search bar (same element, same text). |
| 1.25–2.0 | **Home feed builds** | The header, the mini-guide and the chips arrive, and the video cards ripple in by distance from the search bar. | None. The same camera keeps going. |
| 1.95–3.5 | **Fly-over** | The page tilts into 3D and the camera flies down the feed. "It's all here." sits over a scrim while the category chips step on 8th notes. | Headline and chips finish exiting at 3.56 s. |
| 3.5–4.0 | **Container transform** | One thumbnail ("I built a tiny house in 30 days") is pulled into focus. The other cards fade, the thumbnail's caption fades, and it un-tilts and grows to the exact rect the player opens at. | Match cut at 4.0 s: same art, same rect (1440×810 at 240,135) and same corner radius on both sides. |
| 4.0–6.4 | **Watch page** | The camera pulls back from the player to reveal the header (the query is still `how to anything`), title, channel row and description. On the right: "Found something you love?" then **Like.** (thumb fills and bursts) → **Subscribe.** (the pill goes grey with a rainbow shimmer) → **Hit the bell.** (the bell rings). The cursor clicks each one on its beat. | Type exits by 6.6 s. |
| 6.4–7.0 | **Scrub → red** | The cursor grabs the scrubber and drags it to 12:08. The red progress bar detaches and grows until it fills the frame (done one frame before the cut). | Colour match at 7.0 s: solid red on both sides of the cut. |
| 7.0–7.5 | **Logo reveal** | The red frame *is* the play-button icon at 14× scale, so it shrinks straight into the icon on one log-scaled curve and settles with a squash. | None. |
| 7.42–8.4 | **Lockup** | The white triangle springs in with a shockwave ring and a red glow. The icon slides into the lockup and the wordmark slides out from behind it. | None. |
| 8.24–10.0 | **End card** | "Press play on anything." (red full stop), a "Start watching" CTA, and a cursor click with a ripple at 9.38 s. The feed keeps drifting past as a 9 % ghost layer. | Hold. |

## Brand sources (and what could not be verified)

The build sandbox's network policy blocked `brand.youtube` and `youtube.com`,
so the official guidelines could not be read. Everything below comes from
sources that were reachable:

| Token | Value | Source |
| --- | --- | --- |
| YouTube red | `#FF0000` | Simple Icons (CC0) metadata, which cites YouTube's brand-resources page |
| Logo, icon and wordmark geometry | vector paths | `gilbarbara/logos` (CC0), via `@iconify-json/logos` 1.2.18 |
| Wordmark on dark grounds | white | The same file uses `#282828` for light grounds. On dark grounds the wordmark is shown white, as in YouTube's dark-theme logo |
| UI typeface | Roboto (Apache 2.0) | YouTube's interface face |
| Display typeface | Roboto Flex, weight 780–950, width 72–88 (OFL) | Stand-in for the proprietary YouTube Sans |
| Dark-theme greys (`#0F0F0F`, `#272727`, `#AAAAAA`…) | approximate | Used only for the recreated interface, never for the logo |

The logo colours are never altered: the triangle is always white and the body
always red. Every video, channel name, view count and thumbnail in the film is
invented and drawn procedurally (`src/components/ThumbArt.tsx`). No real
creator's content appears.

## Project

```
src/Film.tsx              director: picks the shot for the film time t, then post
src/shots/SearchFeed.tsx  0–4 s   search hook, feed build, 3D fly-over, container zoom
src/shots/Watch.tsx       4–7 s   watch page, Like/Subscribe/bell, scrub, red grow
src/shots/EndCard.tsx     7–10 s  icon reveal, lockup, line, CTA
src/components/           ThumbArt, VideoCard, SearchBar, Logo, Kinetic (masked type), Cursor, Post (grain + vignette), icons
src/lib/                  brand tokens, house easing curves, seg/lerp/rng/noise, font loading
public/fonts, public/grain  Roboto + Roboto Flex (licences alongside), pre-baked grain tiles
scripts/stills.mjs        render chosen frames to PNG with one bundle
scripts/encode_web.sh     two-pass H.264 web cut under a size budget
```

Every animated value is a pure function of film time: no `Math.random` and no
state carried between frames. Any frame can be rendered alone, in any order,
and a still always matches the video.

## Render

```bash
npm install
npm run studio                                   # live preview in Remotion Studio
node scripts/stills.mjs out/st 0.9 3.2 5.6 8.6   # stills at chosen seconds (or f<frame>)
npx remotion render src/index.ts YouTubeSpot out/master.mp4   # CRF 12 master
bash scripts/encode_web.sh out/master.mp4 youtube-spot-10s.mp4 12
```

`remotion.config.ts` points Remotion at the sandbox's Chromium headless shell.
Set `REMOTION_BROWSER` to use another binary, or delete that line to let
Remotion download its own copy.
