import React from "react";
import { AbsoluteFill } from "remotion";

import { CARD, VideoCard } from "../components/VideoCard";
import { Icon, P } from "../components/icons";
import { KLine } from "../components/Kinetic";
import { SearchBar, SEARCH, SEARCH_W } from "../components/SearchBar";
import { ThumbArt } from "../components/ThumbArt";
import { YTLockup } from "../components/Logo";
import { CHIPS, FEED_KINDS, SLOT, VIDEOS } from "../data";
import { C, DISPLAY, UI, displayAxes } from "../lib/brand";
import { E, kick } from "../lib/ease";
import { clamp, lerp, logLerp, noise1, seg } from "../lib/util";

/*
 * 0.0 - 4.0 s. One continuous camera, no cuts:
 *   0.00  the search field slams in and types "how to "
 *   0.52  the last word spins like a slot reel and lands on "anything"
 *   1.25  the field flies up into its real place in the header; the home
 *         page builds around it (chips, then a ripple of cards)
 *   1.95  the page tilts into 3D and the camera flies over the feed
 *   2.50  "It's all here." with the category chips stepping on the beat
 *   3.50  container transform: one thumbnail is pulled into focus and grows
 *         to the exact rect the watch page's player opens at (R0).
 */

export const R0 = { x: 240, y: 135, w: 1440, h: 810 };

const COL_PITCH = CARD.w + 16;
const ROW_PITCH = CARD.h + 36;
const GRID_LEFT = 96;
const GRID_TOP = 136;
const COLS = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const ROWS = [0, 1, 2, 3, 4, 5, 6, 7];
const HERO = { c: 2, r: 2 };
const heroX = GRID_LEFT + HERO.c * COL_PITCH;
const heroY = GRID_TOP + HERO.r * ROW_PITCH;
const HERO_C = { x: heroX + CARD.w / 2, y: heroY + CARD.thumbH / 2 };
const ZOOM_S = R0.w / CARD.w;
/** Player corner radius on screen at R0 (watch page radius 18 x its start scale). */
export const R0_RADIUS = 18 * (R0.w / 1008);

const SEARCH_SLOT = { x: (1920 - SEARCH_W) / 2, y: 8 };

/** Scroll distance down the feed (plane px): velocity ramps in, then holds. */
function scroll(t: number) {
  const V = 520;
  const t0 = 1.95;
  const ramp = 0.6;
  if (t <= t0) return 0;
  if (t <= t0 + ramp) return (V * (t - t0) ** 2) / (2 * ramp);
  return V * ramp * 0.5 + V * (t - t0 - ramp);
}

function camera(t: number) {
  const p = seg(t, 1.95, 2.75, E.inOutCubic);
  let a = 50 * p;
  let b = -18 * p;
  let s = lerp(1, 1.12, p);
  let fx = 960 + 90 * p + noise1(t * 0.4, 3) * 10 * p;
  let fy = 540 + scroll(t);
  let cx = 960;
  let cy = lerp(540, 600, p);

  const z = seg(t, 3.5, 4.0, E.smooth);
  if (z > 0) {
    a = lerp(a, 0, z);
    b = lerp(b, 0, z);
    s = logLerp(s, ZOOM_S, z);
    fx = lerp(fx, HERO_C.x, z);
    fy = lerp(fy, HERO_C.y, z);
    cx = lerp(cx, R0.x + R0.w / 2, z);
    cy = lerp(cy, R0.y + R0.h / 2, z);
  }
  return { a, b, s, fx, fy, cx, cy };
}

function SlotWord({ t, pos }: { t: number; pos: number }) {
  const L = 26;
  const speed = Math.abs(9 * 3 * (1 - seg(t, 0.52, 1.18)) ** 2) / 0.66; // words/s, derivative of outCubic
  const blurY = clamp((speed * L) / 60 / 2.2, 0, 9);
  const landed = seg(t, 1.17, 1.24);
  const underline = seg(t, 1.2, 1.42, E.snap);
  return (
    <span style={{ position: "relative", display: "inline-block", height: L, verticalAlign: "top", clipPath: "inset(0 -600px 0 -4px)" }}>
      <span style={{ visibility: "hidden", fontWeight: 700 }}>anything</span>
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translateY(${-pos * L}px)`,
          filter: blurY > 0.3 ? "url(#slotblur)" : undefined,
        }}
      >
        {SLOT.map((s, i) => (
          <span
            key={s.word}
            style={{
              display: "block",
              height: L,
              lineHeight: `${L}px`,
              whiteSpace: "nowrap",
              fontWeight: i === SLOT.length - 1 ? 700 : 400,
              color: i === SLOT.length - 1 ? lerpColor(C.text, "#FFFFFF", landed) : C.text,
            }}
          >
            {s.word}
          </span>
        ))}
      </span>
      <span
        style={{
          position: "absolute",
          left: 0,
          bottom: 1,
          height: 2.5,
          borderRadius: 2,
          width: `${underline * 100}%`,
          background: C.red,
        }}
      />
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="slotblur" x="-10%" y="-200%" width="120%" height="500%">
          <feGaussianBlur stdDeviation={`0 ${blurY}`} />
        </filter>
      </svg>
    </span>
  );
}

function lerpColor(a: string, b: string, p: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], p))).join(",")})`;
}

function Header({ t }: { t: number }) {
  const style = (d: number): React.CSSProperties => ({
    opacity: seg(t, 1.45 + d, 1.7 + d),
    transform: `translateY(${(1 - seg(t, 1.45 + d, 1.8 + d, E.snap)) * -14}px)`,
  });
  return (
    <>
      <div style={{ position: "absolute", left: 16, top: 8, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: C.text, ...style(0) }}>
        <Icon d={P.menu} />
      </div>
      <div style={{ position: "absolute", left: 72, top: 18, ...style(0.03) }}>
        <YTLockup height={20} />
      </div>
      <div style={{ position: "absolute", right: 120, top: 10, height: 36, padding: "0 16px 0 10px", borderRadius: 18, background: C.chip, display: "flex", alignItems: "center", gap: 6, color: C.text, fontFamily: UI, fontSize: 14, fontWeight: 500, ...style(0.06) }}>
        <span style={{ fontSize: 26, fontWeight: 300, lineHeight: "20px", marginTop: -3 }}>+</span>Create
      </div>
      <div style={{ position: "absolute", right: 64, top: 8, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: C.text, ...style(0.09) }}>
        <Icon d={P.bell} />
        <span style={{ position: "absolute", left: 20, top: 2, background: C.red, color: "#fff", fontFamily: UI, fontSize: 11, fontWeight: 500, padding: "0 4px", borderRadius: 8, lineHeight: "16px", border: `2px solid ${C.bg}` }}>9+</span>
      </div>
      <div style={{ position: "absolute", right: 24, top: 12, width: 32, height: 32, borderRadius: 16, background: "#7C4DFF", color: "#fff", fontFamily: UI, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", ...style(0.12) }}>
        A
      </div>
      {/* Mini guide */}
      {[
        [P.home, "Home"],
        [P.shorts, "Shorts"],
        [P.subs, "Subscriptions"],
        [P.you, "You"],
      ].map(([d, label], i) => (
        <div
          key={label}
          style={{
            position: "absolute",
            left: 4,
            top: 60 + i * 74,
            width: 64,
            height: 74,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: C.text,
            fontFamily: UI,
            fontSize: 10,
            opacity: seg(t, 1.5 + i * 0.04, 1.75 + i * 0.04),
            transform: `translateX(${(1 - seg(t, 1.5 + i * 0.04, 1.85 + i * 0.04, E.snap)) * -30}px)`,
            borderRadius: 10,
            background: i === 0 ? "rgba(255,255,255,0.1)" : undefined,
          }}
        >
          <Icon d={d} />
          {label}
        </div>
      ))}
      {/* Chips */}
      <div style={{ position: "absolute", left: GRID_LEFT, top: 68, display: "flex", gap: 12 }}>
        {CHIPS.map((chip, i) => {
          const q = seg(t, 1.55 + i * 0.028, 1.95 + i * 0.028, E.snap);
          return (
            <div
              key={chip}
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 8,
                background: i === 0 ? C.text : C.chip,
                color: i === 0 ? C.bg : C.text,
                fontFamily: UI,
                fontSize: 14,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                opacity: q,
                transform: `translateY(${(1 - q) * 12}px) scale(${lerp(0.9, 1, q)})`,
              }}
            >
              {chip}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Feed({ t }: { t: number }) {
  const fadeOthers = 1 - seg(t, 3.5, 3.85, E.inOutSine);
  const heroMeta = 1 - seg(t, 3.5, 3.72, E.inOutSine);
  const heroRadius = lerp(CARD.radius, R0_RADIUS / ZOOM_S, seg(t, 3.5, 4.0, E.smooth));
  let k = 0;
  const cards: React.ReactNode[] = [];
  for (const r of ROWS) {
    for (const c of COLS) {
      const isHero = r === HERO.r && c === HERO.c;
      const kind = FEED_KINDS[(k++ * 7 + r * 3) % FEED_KINDS.length];
      const video = isHero ? VIDEOS.build : VIDEOS[kind];
      const x = GRID_LEFT + c * COL_PITCH;
      const y = GRID_TOP + r * ROW_PITCH;
      const d = Math.hypot(x + CARD.w / 2 - 960, y + CARD.thumbH / 2 - 28);
      // Columns outside the real page wait for the tilt, so the flat page reads true.
      const offPage = c < 0 || c > 3;
      const start = Math.max(1.52 + d * 0.00021, offPage ? 1.98 : 0);
      const p = seg(t, start, start + 0.5, E.outQuint);
      if (p <= 0) continue;
      const o = p * (isHero ? 1 : fadeOthers);
      if (o <= 0.002) continue;
      cards.push(
        <div
          key={`${r}:${c}`}
          style={{
            position: "absolute",
            left: x,
            top: y,
            opacity: o,
            transform: `translateY(${(1 - p) * 46}px) scale(${lerp(0.9, 1, p)})`,
            transformOrigin: "50% 30%",
          }}
        >
          <VideoCard
            video={video}
            seed={r * 31 + c * 7 + 5}
            t={t * 0.6 + (r + c) * 0.3}
            radius={isHero ? heroRadius : CARD.radius}
            metaOpacity={isHero ? heroMeta : 1}
            textOpacity={isHero ? heroMeta : 1}
          />
        </div>,
      );
    }
  }
  return <>{cards}</>;
}

/** The 2D headline + chip strip laid over the flying feed. */
function Overlay({ t }: { t: number }) {
  const scrim = seg(t, 2.35, 2.7, E.inOutSine) * (1 - seg(t, 3.3, 3.55, E.inOutSine));
  const chips = ["All", "Music", "Gaming", "Live", "Podcasts", "Cooking"];
  const active = t < 2.75 ? 0 : t < 3.0 ? 1 : t < 3.25 ? 2 : 3;
  const changedAt = [2.5, 2.75, 3.0, 3.25][active];
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: scrim,
          background: "radial-gradient(ellipse 62% 48% at 50% 50%, rgba(15,15,15,0.92) 0%, rgba(15,15,15,0.7) 45%, rgba(15,15,15,0) 100%)",
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center" }}>
        <KLine
          text="It's all here."
          t={t}
          start={2.5}
          stagger={0.03}
          dur={0.55}
          exitAt={3.26}
          exitDur={0.18}
          exitStagger={0.008}
          colorAt={(i, u) => (u === "." ? C.red : undefined)}
          style={{ fontFamily: DISPLAY, fontVariationSettings: displayAxes(880, 84), fontSize: 196, letterSpacing: "-0.025em", color: "#fff" }}
        />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 618, display: "flex", justifyContent: "center", gap: 18 }}>
        {chips.map((chip, i) => {
          const q = seg(t, 2.62 + i * 0.035, 2.98 + i * 0.035, E.snap);
          const out = seg(t, 3.26 + i * 0.015, 3.44 + i * 0.015, E.inCubic);
          const on = i === active;
          const pop = on ? 1 + 0.08 * kick(t - changedAt, 14) : 1;
          return (
            <div
              key={chip}
              style={{
                height: 64,
                padding: "0 28px",
                borderRadius: 16,
                background: on ? C.text : "rgba(39,39,39,0.92)",
                color: on ? C.bg : C.text,
                fontFamily: UI,
                fontSize: 30,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                opacity: q * (1 - out),
                transform: `translateY(${(1 - q) * 30 - out * 24}px) scale(${pop})`,
                boxShadow: on ? "0 10px 30px rgba(0,0,0,0.5)" : undefined,
              }}
            >
              {chip}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

export function SearchFeed({ t }: { t: number }) {
  const cam = camera(t);

  // Search field: slam-in, then fly up into its header slot.
  const slam = seg(t, 0, 0.3, E.snap);
  const fly = seg(t, 1.25, 1.66, E.smooth);
  const bigK = lerp(3.5, 2.6, slam) * (1 + 0.035 * kick(t - 1.18, 10));
  const k = logLerp(bigK, 1, fly);
  const dy = lerp(492, 0, fly);
  const barBlur = (1 - seg(t, 0, 0.26, E.outCubic)) * 14;
  const unfold = seg(t, 0.04, 0.34, E.snap);
  const typed = "how to ";
  const nTyped = Math.floor(clamp((t - 0.2) / 0.045, 0, typed.length));
  const pos = 9 * E.outCubic(seg(t, 0.52, 1.18));
  const caretOn = (t < 0.52 || t > 1.24) && Math.floor(t / 0.26) % 2 === 0;
  const press = seg(t, 1.14, 1.2, E.inQuad) * (1 - seg(t, 1.2, 1.36, E.outCubic));
  const ripple = seg(t, 1.2, 1.6, E.outCubic);

  // Flash montage behind the spinning word.
  const montage = seg(t, 0.48, 0.6) * (1 - seg(t, 1.24, 1.42, E.inOutSine));
  const slotKind = SLOT[Math.round(pos)].kind;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${C.bgLift}, ${C.bg})` }} />
      {montage > 0 && (
        <AbsoluteFill style={{ opacity: montage * 0.55, filter: "blur(16px) brightness(0.55) saturate(1.2)", transform: `scale(${1.18 + t * 0.04})` }}>
          <ThumbArt kind={slotKind} seed={Math.round(pos) + 40} t={t} text={false} />
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: "960px 540px" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            transformOrigin: "0 0",
            transform: `translate(${cam.cx}px, ${cam.cy}px) rotateX(${cam.a}deg) rotateZ(${cam.b}deg) scale(${cam.s}) translate(${-cam.fx}px, ${-cam.fy}px)`,
          }}
        >
          <Feed t={t} />
          <Header t={t} />
          {/* The search cluster lives in the page, so it tilts with it later. */}
          <div
            style={{
              position: "absolute",
              left: SEARCH_SLOT.x,
              top: SEARCH_SLOT.y,
              width: SEARCH_W,
              height: SEARCH.h,
              transformOrigin: "50% 50%",
              transform: `translate(${(-(1 - lerp(0.12, 1, unfold)) * SEARCH.inputW * k) / 2}px, ${dy}px) scale(${k})`,
              opacity: seg(t, 0, 0.08),
              filter: barBlur > 0.3 ? `blur(${barBlur / k}px)` : undefined,
            }}
          >
            <SearchBar inputScaleX={lerp(0.12, 1, unfold)} pressed={press} focus={0.9 * (1 - fly)}>
              <div style={{ display: "flex", alignItems: "center", fontSize: 18, color: C.text, whiteSpace: "pre", height: 26, opacity: seg(t, 0.12, 0.2) }}>
                <span>{typed.slice(0, nTyped)}</span>
                {t >= 0.5 && <SlotWord t={t} pos={pos} />}
                <span style={{ width: 1.5, height: 20, background: C.text, marginLeft: 1, opacity: caretOn ? 1 : 0 }} />
              </div>
            </SearchBar>
            {ripple > 0 && ripple < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: SEARCH.inputW + SEARCH.buttonW / 2 - 40,
                  top: SEARCH.h / 2 - 40,
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  border: "1.5px solid rgba(255,255,255,0.7)",
                  transform: `scale(${lerp(0.4, 1.6, ripple)})`,
                  opacity: 1 - ripple,
                }}
              />
            )}
          </div>
        </div>
      </AbsoluteFill>

      {t > 2.3 && t < 3.62 && <Overlay t={t} />}
    </AbsoluteFill>
  );
}
