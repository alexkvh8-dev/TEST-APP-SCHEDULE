import React from "react";
import { AbsoluteFill } from "remotion";

import { Cursor, cursorState } from "../components/Cursor";
import { YTLockup } from "../components/Logo";
import { SearchBar } from "../components/SearchBar";
import { Icon, P } from "../components/icons";
import { KLine } from "../components/Kinetic";
import { ThumbArt } from "../components/ThumbArt";
import { VIDEOS } from "../data";
import { C, DISPLAY, UI, displayAxes } from "../lib/brand";
import { E, kick } from "../lib/ease";
import { lerp, logLerp, seg } from "../lib/util";
import { R0 } from "./SearchFeed";

/*
 * 4.0 - 7.0 s. The watch page.
 *   4.00  opens on the player at exactly R0 (the rect the feed's zoom landed
 *         on), then pulls back to reveal title, channel row and description
 *   4.56  Like      (thumb fills and bursts)
 *   5.30  Subscribe (pill turns grey, widens, rainbow shimmer)
 *   6.00  Hit the bell (bell rings)
 *   6.43  the cursor grabs the scrubber and drags it to the end
 *   6.72  the red progress bar grows until it fills the frame (exactly at 7.0)
 */

const PL = { x: 72, y: 84, w: 1008, h: 567 };
const RADIUS = 18;
const S0 = R0.w / PL.w;
const BAR = { x: PL.x + 20, y: PL.y + PL.h - 54, w: PL.w - 40 };
const VIDEO_LEN = 728; // 12:08

const ROW_Y = 728;
const SUB_X = 384;
const LIKE_X = 652;

const T_LIKE = 4.56;
const T_SUB = 5.3;
const T_BELL = 6.0;
const T_GRAB = 6.43;
const T_END = 6.74;

function progressAt(t: number) {
  const playing = 0.18 + (t - 4) * 0.012;
  return lerp(playing, 1, seg(t, T_GRAB + 0.02, T_END, E.inOutCubic));
}

function fmt(sec: number) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Page -> screen is screen = s * p + (tx, ty). */
function cameraAt(t: number) {
  const p = seg(t, 4.0, 4.55, E.smooth);
  const s = logLerp(S0, 1, p);
  const tx = lerp(R0.x, PL.x, p) - PL.x * s;
  const ty = lerp(R0.y, PL.y, p) - PL.y * s;
  // A slow push about a screen point for the rest of the shot keeps the hold alive.
  const push = 1 + 0.03 * seg(t, 4.55, 6.7, E.inOutSine);
  const ox = 700;
  const oy = 600;
  return { s: s * push, tx: push * tx + (1 - push) * ox, ty: push * ty + (1 - push) * oy };
}

function Pill({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height: 54,
        borderRadius: 27,
        background: C.chip,
        color: C.text,
        display: "flex",
        alignItems: "center",
        fontFamily: UI,
        fontSize: 21,
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Sparks({ t, at, x, y }: { t: number; at: number; x: number; y: number }) {
  const p = seg(t, at, at + 0.42, E.outCubic);
  if (p <= 0 || p >= 1) return null;
  return (
    <svg style={{ position: "absolute", left: x - 80, top: y - 80, width: 160, height: 160, overflow: "visible" }}>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r1 = lerp(20, 58, p);
        const r2 = lerp(26, 72, p) - p * 6;
        return (
          <line
            key={i}
            x1={80 + Math.cos(a) * r1}
            y1={80 + Math.sin(a) * r1}
            x2={80 + Math.cos(a) * r2}
            y2={80 + Math.sin(a) * r2}
            stroke={i % 2 ? C.red : "#fff"}
            strokeWidth={4 * (1 - p) + 1}
            strokeLinecap="round"
            opacity={1 - p}
          />
        );
      })}
    </svg>
  );
}

export function Watch({ t }: { t: number }) {
  const cam = cameraAt(t);
  const video = VIDEOS.build;
  const reveal = (d: number) => seg(t, 4.22 + d, 4.62 + d, E.snap);
  const revealStyle = (d: number): React.CSSProperties => ({
    opacity: reveal(d),
    transform: `translateY(${(1 - reveal(d)) * 26}px)`,
  });

  const progress = progressAt(t);
  const hoverBar = seg(t, 6.3, 6.42, E.outCubic);
  const controls = Math.max(seg(t, 4.08, 4.3) * (1 - seg(t, 4.8, 5.05)), seg(t, 6.22, 6.36));

  // Like
  const liked = t >= T_LIKE;
  const likePop = liked ? lerp(0.55, 1, E.spring(2.1, 0.38)(seg(t, T_LIKE, T_LIKE + 0.5))) : 1;
  // Subscribe
  const sub = seg(t, T_SUB, T_SUB + 0.3, E.snap);
  const subW = lerp(152, 214, sub);
  const shimmer = seg(t, T_SUB + 0.02, T_SUB + 0.62, E.inOutSine);
  // Bell
  const bellOn = t >= T_BELL;
  const dt = t - T_BELL;
  const bellAngle = bellOn ? 24 * Math.exp(-dt * 5.5) * Math.sin(dt * Math.PI * 2 * 3.2) : 0;

  // Cursor
  const keys = [
    { t: 4.3, x: 980, y: 1010 },
    { t: 4.5, x: LIKE_X + 44, y: ROW_Y + 30, click: T_LIKE },
    { t: 5.22, x: SUB_X + 76, y: ROW_Y + 30, click: T_SUB },
    { t: 5.92, x: SUB_X + 30, y: ROW_Y + 28, click: T_BELL },
    { t: 6.4, x: BAR.x + progressAt(6.4) * BAR.w, y: BAR.y + 2, click: T_GRAB },
  ];
  let cur = cursorState(keys, t, 0.4, 40);
  if (t > T_GRAB) cur = { ...cur, x: BAR.x + progress * BAR.w, y: BAR.y + 2 };
  const cursorOpacity = seg(t, 4.22, 4.32) * (1 - seg(t, T_END, T_END + 0.08));

  // The bar's screen rect, which grows into a full-frame red at 7.0.
  const grow = seg(t, 6.7, 6.98, E.inOutCubic);
  const barH = lerp(5, 9, hoverBar);
  const bx = cam.tx + BAR.x * cam.s;
  const by = cam.ty + (BAR.y + 2 - barH / 2) * cam.s;
  const bw = BAR.w * progress * cam.s;
  const bh = barH * cam.s;

  // Headline exit must finish before the bar takes over.
  const lines = [
    { text: "Like.", at: T_LIKE, y: 290 },
    { text: "Subscribe.", at: T_SUB, y: 430 },
    { text: "Hit the bell.", at: T_BELL, y: 570 },
  ];

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${C.bgLift}, ${C.bg})` }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})` }}>
        {/* Header: the query from the opening is still in the field. */}
        <div style={{ position: "absolute", left: 24, top: 14, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", color: C.text, ...revealStyle(0) }}>
          <Icon d={P.menu} size={28} />
        </div>
        <div style={{ position: "absolute", left: 92, top: 25, ...revealStyle(0.02) }}>
          <YTLockup height={26} />
        </div>
        <div style={{ position: "absolute", left: 384, top: 14, transformOrigin: "0 0", transform: `scale(1.15) translateY(${(1 - reveal(0.04)) * 20}px)`, opacity: reveal(0.04) }}>
          <SearchBar>
            <div style={{ fontFamily: UI, fontSize: 16, color: C.text, whiteSpace: "pre" }}>
              how to <b>anything</b>
            </div>
          </SearchBar>
        </div>
        <div style={{ position: "absolute", right: 64, top: 16, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: C.text, ...revealStyle(0.06) }}>
          <Icon d={P.bell} size={28} />
        </div>
        <div style={{ position: "absolute", right: 22, top: 20, width: 36, height: 36, borderRadius: 18, background: "#7C4DFF", color: "#fff", fontFamily: UI, fontSize: 16, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", ...revealStyle(0.08) }}>
          A
        </div>

        {/* Player */}
        <div style={{ position: "absolute", left: PL.x, top: PL.y, width: PL.w, height: PL.h, borderRadius: RADIUS, overflow: "hidden", background: "#000" }}>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + (t - 4) * 0.012})` }}>
            <ThumbArt kind="build" seed={2 * 31 + 2 * 7 + 5} t={t * 0.6 + 4 * 0.3 + (t - 4) * 0.8} text={false} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, background: "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))", opacity: controls }} />
          {/* Progress bar (drawn here until it detaches and grows) */}
          <div style={{ position: "absolute", left: BAR.x - PL.x, top: BAR.y - PL.y + 2 - barH / 2, width: BAR.w, height: barH, opacity: Math.max(controls, grow > 0 ? 1 : 0) }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.22)" }} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(1, progress + 0.14) * 100}%`, background: "rgba(255,255,255,0.4)" }} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, background: C.red }} />
            <div
              style={{
                position: "absolute",
                left: `${progress * 100}%`,
                top: barH / 2 - 9,
                width: 18,
                height: 18,
                marginLeft: -9,
                borderRadius: 9,
                background: C.red,
                transform: `scale(${hoverBar})`,
              }}
            />
          </div>
          <div style={{ position: "absolute", left: 20, right: 20, bottom: 8, height: 40, display: "flex", alignItems: "center", gap: 18, color: "#fff", fontFamily: UI, fontSize: 19, opacity: controls }}>
            <Icon d={P.pause} size={34} />
            <Icon d={P.next} size={30} />
            <Icon d={P.volume} size={30} />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmt(progress * VIDEO_LEN)} / {fmt(VIDEO_LEN)}
            </span>
            <div style={{ flex: 1 }} />
            <Icon d={P.cc} size={30} />
            <Icon d={P.gear} size={30} />
            <Icon d={P.fullscreen} size={32} />
          </div>
        </div>

        {/* Title */}
        <div style={{ position: "absolute", left: PL.x, top: 670, width: PL.w, fontFamily: UI, fontSize: 32, fontWeight: 700, color: C.text, letterSpacing: "-0.005em", ...revealStyle(0) }}>
          {video.title}
        </div>

        {/* Channel row */}
        <div style={{ position: "absolute", left: PL.x, top: ROW_Y, height: 60, display: "flex", alignItems: "center", gap: 16, ...revealStyle(0.05) }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: video.avatar, color: "#fff", fontFamily: UI, fontSize: 24, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>M</div>
          <div style={{ fontFamily: UI, width: 216 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.text, fontSize: 23, fontWeight: 500 }}>
              {video.channel}
              <Icon d={P.verified} size={18} color={C.text2} />
            </div>
            <div style={{ color: C.text2, fontSize: 17, marginTop: 2 }}>1.2M subscribers</div>
          </div>
        </div>

        {/* Subscribe -> Subscribed */}
        <div style={{ position: "absolute", left: SUB_X, top: ROW_Y + 3, ...revealStyle(0.08) }}>
          <div
            style={{
              position: "relative",
              width: subW,
              height: 54,
              borderRadius: 27,
              overflow: "hidden",
              background: sub < 0.5 ? C.text : C.chip,
              transform: `scale(${1 - 0.06 * kick(t - T_SUB, 10) * (t > T_SUB ? 1 : 0)})`,
              fontFamily: UI,
              fontSize: 21,
              fontWeight: 500,
            }}
          >
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.bg, opacity: 1 - sub, transform: `translateY(${-sub * 20}px)` }}>Subscribe</div>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 16, gap: 8, color: C.text, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>
              <Icon d={bellOn ? P.bellActive : P.bell} size={26} style={{ transform: `rotate(${bellAngle}deg)`, transformOrigin: "50% 12%" }} />
              Subscribed
              <Icon d={P.chevron} size={24} />
            </div>
            {shimmer > 0 && shimmer < 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: 220,
                  left: lerp(-240, subW + 20, shimmer),
                  background: "linear-gradient(90deg, rgba(255,0,0,0), rgba(255,0,0,0.55), rgba(255,170,0,0.55), rgba(0,200,120,0.5), rgba(40,120,255,0.55), rgba(200,0,255,0.5), rgba(200,0,255,0))",
                  mixBlendMode: "screen",
                }}
              />
            )}
          </div>
        </div>

        {/* Action pills */}
        <div style={{ position: "absolute", left: LIKE_X, top: ROW_Y + 3, display: "flex", gap: 12, ...revealStyle(0.11) }}>
          <Pill>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 18px 0 20px", height: 54, borderRight: "1px solid rgba(255,255,255,0.2)" }}>
              <div style={{ position: "relative" }}>
                <Icon d={liked ? P.thumbUpFilled : P.thumbUp} size={28} style={{ transform: `scale(${likePop}) rotate(${liked ? -12 * (1 - seg(t, T_LIKE, T_LIKE + 0.4, E.outCubic)) : 0}deg)` }} />
              </div>
              48K
            </div>
            <div style={{ padding: "0 20px 0 16px", display: "flex", alignItems: "center" }}>
              <Icon d={P.thumbDown} size={28} />
            </div>
          </Pill>
          <Pill style={{ padding: "0 22px 0 18px", gap: 10 }}>
            <Icon d={P.share} size={26} />
            Share
          </Pill>
          <Pill style={{ width: 54, justifyContent: "center" }}>
            <Icon d={P.more} size={26} />
          </Pill>
        </div>
        <Sparks t={t} at={T_LIKE} x={LIKE_X + 34} y={ROW_Y + 30} />

        {/* Description box */}
        <div
          style={{
            position: "absolute",
            left: PL.x,
            top: 812,
            width: PL.w,
            height: 104,
            borderRadius: 14,
            background: "rgba(255,255,255,0.1)",
            padding: "14px 18px",
            boxSizing: "border-box",
            fontFamily: UI,
            fontSize: 19,
            color: C.text,
            ...revealStyle(0.14),
          }}
        >
          <div style={{ fontWeight: 500 }}>
            4.2M views  2 weeks ago  <span style={{ color: "#3EA6FF" }}>#tinyhouse #build #offgrid</span>
          </div>
          <div style={{ marginTop: 6, color: C.text }}>Thirty days, one hill, zero experience. Every mistake I made, so you don't have to…</div>
        </div>

        {/* Headline zone */}
        <div style={{ position: "absolute", left: 1150, top: 218, fontFamily: UI, fontSize: 30, color: C.text2 }}>
          <KLine text="Found something you love?" t={t} start={4.3} unit="word" stagger={0.06} dur={0.45} exitAt={6.3} exitDur={0.18} />
        </div>
        {lines.map((line, i) => {
          const next = lines[i + 1];
          const dim = next ? seg(t, next.at, next.at + 0.2, E.inOutSine) : 0;
          return (
            <div key={line.text} style={{ position: "absolute", left: 1146, top: line.y, opacity: 1 - dim * 0.7 }}>
              <KLine
                text={line.text}
                t={t}
                start={line.at - 0.04}
                stagger={0.022}
                dur={0.42}
                exitAt={6.3 + i * 0.04}
                exitDur={0.18}
                exitStagger={0.006}
                colorAt={(_, u) => (u === "." ? C.red : undefined)}
                style={{ fontFamily: DISPLAY, fontVariationSettings: displayAxes(880, 78), fontSize: 128, letterSpacing: "-0.025em", color: "#fff" }}
              />
            </div>
          );
        })}

        {cursorOpacity > 0 && <Cursor x={cur.x} y={cur.y} scale={cur.scale} opacity={cursorOpacity} size={34} />}
      </div>

      {/* The bar detaches and becomes the frame. */}
      {grow > 0 && (
        <div
          style={{
            position: "absolute",
            left: lerp(bx, 0, grow),
            top: lerp(by, 0, grow),
            width: lerp(bw, 1920, grow),
            height: lerp(bh, 1080, grow),
            background: C.red,
            // A pill while it grows (echoing the icon it becomes), square at both ends.
            borderRadius: Math.min(lerp(bh, 1080, grow) / 2, 4 + 120 * Math.sin(Math.PI * grow)),
          }}
        />
      )}
    </AbsoluteFill>
  );
}
