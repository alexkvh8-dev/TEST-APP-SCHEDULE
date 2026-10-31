# Apple's design and motion language: research notes

This is the analysis done before building the ad. Each finding ends with the decision it drove.

**What I could and couldn't access.** Apple's Human Interface Guidelines and fonts pages
(developer.apple.com) were read directly. apple.com is blocked by this environment's network
policy, so I could not inspect apple.com pages or watch Apple's films. Notes on the films come
from published breakdowns (linked below) and from my own familiarity with Apple's product films
and event openers. That second category is my observation, not a citation, and is marked
*(observation)*.

## 1. Motion: Apple's stated principles

From the HIG [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) page:

- "Add motion purposefully, supporting the experience without overshadowing it. Don't add
  motion for the sake of adding motion."
- "Strive for realistic feedback motion that follows people's gestures and expectations… motion
  that doesn't make sense… can make them feel disoriented."
- "Aim for brevity and precision."
- "Consider using fades when you need to relocate an object."
- "Consider giving people a stationary frame of reference."

**Decisions**
- No cartoon physics. The Spotify piece used squash and stretch and overshooting springs; this
  one uses none. Everything moves like a heavy, precise object.
- Springs are critically damped (they settle without bouncing), in the spirit of SwiftUI's
  `.smooth` spring.
- The camera moves slowly and continuously. Cuts are motivated by light or by shape, never by
  flashy transitions.
- Text relocates by fading out and back in, not by flying around.

## 2. Typography

From the HIG [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
and [Fonts](https://developer.apple.com/fonts/) pages:

- San Francisco (SF Pro) is the system typeface. Its "dynamic optical sizes… merge discrete
  optical sizes (like Text and Display)… into a single, continuous design."
- "Prefer Regular, Medium, Semibold, or Bold font weights, and avoid Ultralight, Thin, and Light."
- "Minimize the number of typefaces you use."
- The SF license limits the font to "creating mock-ups of user interfaces" for Apple platforms,
  and forbids using it for "artwork, website content or any other work product."

Secondary analyses ([moonb.io](https://www.moonb.io/blog/kinetic-typography),
[motion.so](https://motion.so/learn/apple-style-product-launch-video)) describe Apple's on-screen
type as rationed, generously spaced, timed precisely, and set on black or white without drop
shadows.

**Decisions**
- SF can't legally be used in an ad, so the ad uses **Inter Display** (Semibold for headlines,
  Medium for supporting lines). It's the closest open-source match to SF Pro Display, with the
  same neo-grotesque construction and optical-size thinking. License: SIL OFL.
- Headlines are centred, one short declarative line ending in a full stop, with tight negative
  tracking at display sizes *(observation: "Titanium." "Scary fast." "Hello.")*.
- One typeface family, two weights, no shadows, black or white backgrounds.
- The reveal is Apple's web/film signature *(observation)*: opacity plus a small upward drift
  plus a blur that resolves to sharp, all on one long ease-out.

## 3. Brand and colour

From the HIG [Branding](https://developer.apple.com/design/human-interface-guidelines/branding)
page: "Ensure branding always defers to content," and "Resist the temptation to display your
logo throughout." [Apple's trademark guidelines](https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html)
restrict use of the Apple logo without permission.

Colour values used on apple.com are not officially published. Community references
([kombai](https://kombai.com/examples/design-systems/apple-kombai)) list near-black `#1d1d1f`,
blue `#0071e3` / `#2997ff`, and light-grey canvases. iOS system blue is `#007AFF` (light) and
`#0A84FF` (dark).

**Decisions**
- Pro shots sit on pure black `#000` with white or `#f5f5f7` type. The ecosystem shot flips to
  Apple's bright `#f5f5f7` and `#fff` world with `#1d1d1f` type.
- The logo appears once, at the very end, alone and small, as on Apple's end cards
  *(observation)*.
- Colour comes from the products (titanium, the colour lineup) and from light, not from graphic
  decoration.

## 4. How Apple's product films work

- **CAD-accurate CG product, sometimes cut into live action.** The [iPhone 5s "exploded view"
  film by Chapeau Studios](https://www.chapeaustudios.com/work/apple-iphone-5s-touch) set the
  standard that the industry copied ([Quince](https://quincemedia.com/2026/09/10/apple-3d-product-launch-videos/)).
- **Light as the storyteller.** Edges are backlit to reveal form, then a fill light brings in
  the signature screen reflection. Macro shots keep the product sharp
  ([Manfrotto](https://www.manfrotto.com/global-uk/stories/how-to-shoot-cinematic-tech-videos-like-apple/)).
- **Practical craft is celebrated.** The watch faces were shot with real fire and water
  ([TechCrunch](https://techcrunch.com/2018/09/20/apple-watch-fire-face-was-made-with-actual-fire)),
  and recent campaigns show the making-of
  ([Fortune](https://fortune.com/2026/10/15/apples-hand-embroidered-product-launch/),
  [The Apple Post](https://www.theapplepost.com/2026/04/24/70582/apple-shares-behind-the-scenes-look-at-macbook-neo-launch-ad/)).
- *(observation)* Typical beats: darkness, then a sliver of light tracing a chamfer; macro over
  the camera lenses; a slow hero rotation showing back, side and front; the screen waking to a
  9:41 Lock Screen; an exploded view of the internals with a glowing chip; the flowing
  multicolour edge glow of Siri and Apple Intelligence; the colour lineup turning in unison;
  products shown working together on a bright set; the logo alone at the end.

**Decisions**
- The film follows those beats in that order. The table in [README.md](README.md) maps each beat
  to a shot.
- The lighting is a custom "studio" environment of long softbox strips, so metal and glass get
  the crisp strip reflections of product photography. The frame uses an anisotropic
  brushed-titanium material.

## 5. Contrast with the Spotify piece

| | Spotify spec | Apple spec |
| --- | --- | --- |
| Energy | playful, beat-driven, bouncy springs | calm, precise, weighty |
| Cuts | many, punchy match cuts | few; light-led and shape-led |
| Colour | saturated duotones | black and white, colour from product and light |
| Type | huge kinetic words, per-letter pops | one short line, blur-fade reveal |
| Easing | outBack, spring overshoot | long ease-out, critically damped, no overshoot |
