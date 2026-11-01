# QA: review loop

Stills lie less than you'd think, and the video lies less still. Check both.

## While building (per shot)

1. Render stills at the shot's first frame, its key beats and its last frame:
   `node scripts/render.mjs --stills 11.97,12.0,13.5,16.9,20.97 --out out/st`
2. Make contact sheets: `python3 <skill>/scripts/contact_sheet.py out/st sheets/`, then look
   at them.
3. For every cut, render the frame before (`cut - 1/fps`) and the frame at the cut. A match
   cut should look identical apart from grain.
4. If something looks wrong, debug it in the page. A small Playwright script can toggle
   `scene.environment`, lights or materials via `window.__dbg.shots[i]` and re-render a
   frame, which isolates which object causes an artefact. Probe pixel rows rather than
   guessing, and keep in mind the sRGB curve: a small linear addition on a dark background
   looks larger than it is.

## After the full render

- `python3 <skill>/scripts/seam_check.py out/master.mp4 <cut times...>`. A match cut
  scores a low mean difference (~1–5 for 0–255 values); for whips and wipes, check that luma
  is similar on both sides.
- `python3 <skill>/scripts/track_motion.py out/master.mp4 <first> <last> --rgb r,g,b`
  on anything that must feel smooth. No acceleration spikes is the goal. Confirm any flagged
  frames visually, because material changes can fake spikes.
- Check the frame count, duration, colour tags and size of the web cut with `ffprobe`.

## Checklist before delivery

- [ ] Every cut was looked at as a before/after pair from the video
- [ ] No type or overlay survives past its shot; type over busy imagery has a scrim
- [ ] Brand colours are exact where the brand is shown (logo, accent)
- [ ] No strobing spins (<5°/frame), no stacked kicks on hero moves, no overshoot at seams
- [ ] Reflections behave (no blown-out strips on screens, no lone catchlights)
- [ ] Web cut is under the size budget, BT.709 tagged, with the right frame count
- [ ] README has the storyboard, brand sources, render instructions and spec-ad notice
- [ ] Committed and pushed; the file was sent to the user
