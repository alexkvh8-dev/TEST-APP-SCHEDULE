import React from "react";
import { AbsoluteFill } from "remotion";

import { Cursor, cursorState } from "../components/Cursor";
import { Icon, P } from "../components/icons";
import { KLine } from "../components/Kinetic";
import { ICON_BOX, LOCKUP_BOX, TEXT_BOX, WordmarkText, YTIcon } from "../components/Logo";
import { ThumbArt, type Kind } from "../components/ThumbArt";
import { C, DISPLAY, UI, displayAxes } from "../lib/brand";
import { E, kick } from "../lib/ease";
import { lerp, logLerp, seg } from "../lib/util";

/*
 * 7.0 - 10.0 s. End card.
 *   7.00  the frame is solid red: it is the play-button icon scaled 14x
 *         (the watch shot's progress bar grew into exactly this)
 *   7.00  the icon shrinks to its hero size (one smooth curve, log-scaled)
 *   7.42  the white triangle springs in, with a shockwave ring
 *   7.86  icon and wordmark settle into the lockup; the wordmark slides out
 *         from behind the icon
 *   8.25  "Press play on anything."   8.55  CTA   9.38  cursor clicks it
 */

const K_FULL = 14;
const HERO_H = 300;
const LOCK_H = 150;
const LOCK_K = LOCK_H / LOCKUP_BOX.h;
const LOCK = { x: 960 - (LOCKUP_BOX.w * LOCK_K) / 2, y: 318 };
const CTA = { cx: 960, cy: 742, w: 372, h: 84 };

const GHOST: Kind[] = ["cook", "space", "skate", "music", "travel", "code", "dance", "bake", "game", "fly", "fix", "live", "draw", "fitness", "podcast"];

function GhostRow({ t, y, dir, offset }: { t: number; y: number; dir: 1 | -1; offset: number }) {
  const w = 256;
  const gap = 20;
  const shift = ((t - 7) * 46 * dir + offset) % (w + gap);
  return (
    <div style={{ position: "absolute", left: -w + shift, top: y, display: "flex", gap }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ width: w, height: w * 0.5625, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
          <ThumbArt kind={GHOST[(i * 3 + (dir > 0 ? 1 : 5)) % GHOST.length]} seed={i + (dir > 0 ? 80 : 90)} t={t * 0.5} text={false} />
        </div>
      ))}
    </div>
  );
}

export function EndCard({ t }: { t: number }) {
  // Icon height over time: full-frame -> hero -> lockup.
  const shrink = seg(t, 7.0, 7.5, E.smooth);
  const lock = seg(t, 7.84, 8.26, E.smooth);
  const heroK = HERO_H / ICON_BOX.h;
  const k = lock > 0 ? logLerp(heroK, LOCK_K, lock) : logLerp(K_FULL, heroK, shrink);
  const iconH = ICON_BOX.h * k;
  const iconW = ICON_BOX.w * k;
  // Centre of the icon: frame centre -> a little high -> its place in the lockup.
  const heroC = { x: 960, y: 500 };
  const lockC = { x: LOCK.x + (ICON_BOX.w * LOCK_K) / 2, y: LOCK.y + (ICON_BOX.h * LOCK_K) / 2 };
  const cx = lock > 0 ? lerp(heroC.x, lockC.x, lock) : 960;
  const cy = lock > 0 ? lerp(heroC.y, lockC.y, lock) : lerp(540, heroC.y, shrink);

  // Settle squash as the shrink lands (volume preserving, then springs out).
  const sq = 0.07 * kick(t - 7.5, 7) * Math.cos((t - 7.5) * 18) * (t > 7.5 ? 1 : 0);
  const sx = 1 + sq;
  const sy = 1 / Math.sqrt(sx) - sq * 0.4;

  const tri = E.spring(2.3, 0.4)(seg(t, 7.42, 7.92));
  const triRot = lerp(-16, 0, seg(t, 7.42, 7.8, E.outCubic));
  const ring = seg(t, 7.48, 8.0, E.outCubic);
  const glow = seg(t, 7.3, 7.9, E.inOutSine) * (0.85 + 0.15 * Math.sin(t * 2.4));

  const word = seg(t, 8.1, 8.52, E.snap);
  const push = 1 + 0.035 * seg(t, 7.5, 10, E.inOutSine);

  const ctaIn = seg(t, 8.55, 8.95, E.outBack(1.5));
  const shine = seg(t, 9.0, 9.5, E.inOutSine);
  const curKeys = [
    { t: 8.95, x: 1240, y: 980 },
    { t: 9.3, x: CTA.cx + 70, y: CTA.cy + 14, click: 9.38 },
  ];
  const cur = cursorState(curKeys, t, 0.36, 30);
  const press = 1 - 0.05 * seg(t, 9.32, 9.38, E.inQuad) * (1 - seg(t, 9.38, 9.6, E.outBack(2)));
  const ripple = seg(t, 9.38, 9.9, E.outCubic);

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${C.bgLift}, ${C.bg})` }} />
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        {/* Ghost layer: the feed keeps drifting past, barely there. */}
        <AbsoluteFill style={{ opacity: 0.09 * seg(t, 7.6, 8.3), filter: "blur(1.5px)" }}>
          <GhostRow t={t} y={34} dir={-1} offset={90} />
          <GhostRow t={t} y={1080 - 34 - 144} dir={1} offset={10} />
        </AbsoluteFill>

        <div
          style={{
            position: "absolute",
            left: cx - 700,
            top: cy - 700,
            width: 1400,
            height: 1400,
            borderRadius: 700,
            background: "radial-gradient(circle, rgba(255,0,0,0.30) 0%, rgba(255,0,0,0.10) 35%, rgba(255,0,0,0) 65%)",
            opacity: glow,
          }}
        />

        {ring > 0 && ring < 1 && (
          <div
            style={{
              position: "absolute",
              left: cx - 300,
              top: cy - 300,
              width: 600,
              height: 600,
              borderRadius: 300,
              border: `${lerp(8, 1, ring)}px solid rgba(255,255,255,${0.55 * (1 - ring)})`,
              transform: `scale(${lerp(0.55, 1.35, ring)})`,
              boxSizing: "border-box",
            }}
          />
        )}

        {/* Wordmark slides out from behind the icon. */}
        {word > 0 && (
          <div
            style={{
              position: "absolute",
              left: LOCK.x,
              top: LOCK.y,
              clipPath: `inset(-10px -10px -10px ${TEXT_BOX.x * LOCK_K - 6}px)`,
            }}
          >
            <div style={{ transform: `translateX(${(1 - word) * -150}px)`, opacity: Math.min(1, word * 2.5) }}>
              <WordmarkText height={LOCK_H} />
            </div>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: cx - iconW / 2,
            top: cy - iconH / 2,
            transform: `scale(${sx}, ${sy})`,
            transformOrigin: "50% 100%",
          }}
        >
          <YTIcon height={iconH} triangleScale={tri} triangleRotate={triRot} />
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, top: 528, textAlign: "center" }}>
          <KLine
            text="Press play on anything."
            t={t}
            start={8.24}
            stagger={0.022}
            dur={0.5}
            colorAt={(_, u) => (u === "." ? C.red : undefined)}
            style={{ fontFamily: DISPLAY, fontVariationSettings: displayAxes(780, 88), fontSize: 84, letterSpacing: "-0.02em", color: C.text }}
          />
        </div>

        {/* CTA */}
        <div
          style={{
            position: "absolute",
            left: CTA.cx - CTA.w / 2,
            top: CTA.cy - CTA.h / 2,
            width: CTA.w,
            height: CTA.h,
            borderRadius: CTA.h / 2,
            background: C.text,
            color: C.bg,
            fontFamily: UI,
            fontSize: 32,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            overflow: "hidden",
            opacity: seg(t, 8.55, 8.7),
            transform: `scale(${lerp(0.8, 1, ctaIn) * press})`,
            boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
          }}
        >
          <Icon d={P.play} size={36} />
          Start watching
          {shine > 0 && shine < 1 && (
            <div
              style={{
                position: "absolute",
                top: -20,
                bottom: -20,
                width: 90,
                left: lerp(-140, CTA.w + 40, shine),
                transform: "skewX(-20deg)",
                background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.9), rgba(255,255,255,0))",
                mixBlendMode: "soft-light",
              }}
            />
          )}
        </div>
        {ripple > 0 && ripple < 1 && (
          <div
            style={{
              position: "absolute",
              left: CTA.cx - CTA.w / 2,
              top: CTA.cy - CTA.h / 2,
              width: CTA.w,
              height: CTA.h,
              borderRadius: CTA.h / 2,
              border: "2px solid rgba(241,241,241,0.8)",
              transform: `scale(${lerp(1, 1.35, ripple)}, ${lerp(1, 1.9, ripple)})`,
              opacity: 1 - ripple,
            }}
          />
        )}
        <div style={{ position: "absolute", left: 0, right: 0, top: 812, textAlign: "center", fontFamily: UI, fontSize: 24, color: C.text2, opacity: seg(t, 8.8, 9.1) }}>
          youtube.com
        </div>
        {t > 8.9 && <Cursor x={cur.x} y={cur.y} scale={cur.scale} opacity={seg(t, 8.9, 9.0)} size={36} />}
      </AbsoluteFill>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, textAlign: "center", fontFamily: UI, fontSize: 17, color: "#5E5E5E", opacity: seg(t, 7.9, 8.3) }}>
        Unofficial spec ad · not produced or endorsed by YouTube or Google
      </div>
    </AbsoluteFill>
  );
}
