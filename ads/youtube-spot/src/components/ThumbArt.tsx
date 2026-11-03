import React from "react";

import { DISPLAY, displayAxes } from "../lib/brand";
import { rng } from "../lib/util";

/**
 * Procedural "video thumbnails". Every one is original vector art on a
 * 320x180 grid, so the feed reads as YouTube without borrowing anybody's
 * actual video. `t` animates the scene (used when a thumbnail becomes the
 * playing video); `text` is the thumbnail's punchy overlay.
 */
export type Kind =
  | "cook"
  | "skate"
  | "code"
  | "music"
  | "draw"
  | "fix"
  | "dance"
  | "bake"
  | "fly"
  | "travel"
  | "space"
  | "game"
  | "fitness"
  | "podcast"
  | "live"
  | "build";

export const KIND_TEXT: Record<Kind, string[]> = {
  cook: ["SO EASY"],
  skate: ["DAY 7", "KICKFLIP?!"],
  code: ["10 MIN", "APP"],
  music: ["ONE TAKE"],
  draw: ["DRAW", "THIS"],
  fix: ["FIX IT", "YOURSELF"],
  dance: ["LEARN", "THIS"],
  bake: ["PERFECT", "BREAD"],
  fly: ["50 M!"],
  travel: ["48H IN", "THE ALPS"],
  space: ["HOW BIG?"],
  game: ["WORLD", "RECORD"],
  fitness: ["30 DAYS"],
  podcast: ["EP. 142"],
  live: [],
  build: ["TINY", "HOUSE"],
};

const W = 320;
const H = 180;

function Grad({ id, a, b, x2 = 0, y2 = 1 }: { id: string; a: string; b: string; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
}

function Overlay({ lines, color = "#fff", x = 16, y = 50, size = 40, rot = -4 }: {
  lines: string[];
  color?: string;
  x?: number;
  y?: number;
  size?: number;
  rot?: number;
}) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x}
          y={y + i * size * 0.92}
          fontSize={size}
          fill={color}
          stroke="#0b0b0b"
          strokeWidth={size * 0.14}
          strokeLinejoin="round"
          paintOrder="stroke"
          style={{ fontFamily: DISPLAY, fontVariationSettings: displayAxes(950, 72), letterSpacing: "-0.01em" }}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function Scene({ kind, t, id, seed }: { kind: Kind; t: number; id: string; seed: number }) {
  const r = rng(seed);
  switch (kind) {
    case "cook":
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#FFB347" b="#FF5E3A" x2={1} />
            <radialGradient id={`${id}p`}>
              <stop offset="0.7" stopColor="#3A3A3A" />
              <stop offset="1" stopColor="#1C1C1C" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          <rect x={268} y={96} width={70} height={14} rx={6} fill="#1A1A1A" transform="rotate(-8 268 96)" />
          <ellipse cx={196} cy={112} rx={96} ry={60} fill="#222" />
          <ellipse cx={196} cy={108} rx={84} ry={50} fill={`url(#${id}p)`} />
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M${140 + i * 10} ${92 + (i % 2) * 8} q 14 -14 28 0 t 28 0 t 28 0`}
              stroke="#FFD66B"
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
          ))}
          <circle cx={176} cy={104} r={9} fill="#E63946" />
          <circle cx={222} cy={118} r={8} fill="#E63946" />
          <circle cx={173} cy={101} r={2.5} fill="#ffffff88" />
          <ellipse cx={204} cy={96} rx={9} ry={4.5} fill="#2F9E44" transform="rotate(-30 204 96)" />
          <ellipse cx={240} cy={104} rx={8} ry={4} fill="#2F9E44" transform="rotate(25 240 104)" />
          {[0, 1, 2].map((i) => {
            const y = 54 - ((t * 18 + i * 9) % 26);
            return (
              <path
                key={i}
                d={`M${172 + i * 24} ${y + 20} q -8 -9 0 -18 t 0 -18`}
                stroke="#fff"
                strokeOpacity={0.55}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
        </>
      );
    case "skate":
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#38B6FF" b="#B9F0FF" />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          <circle cx={268} cy={38} r={22} fill="#FFF3B0" />
          <path d="M0 180 L0 70 Q 6 160 120 166 L 320 166 L 320 180 Z" fill="#8E9AAF" />
          <path d="M0 70 Q 6 160 120 166 L 320 166" stroke="#E9ECEF" strokeWidth={4} fill="none" />
          <g transform="translate(196 78) rotate(-24)">
            <rect x={-50} y={-6} width={100} height={12} rx={6} fill="#FF006E" />
            <rect x={-40} y={6} width={14} height={5} fill="#555" />
            <rect x={26} y={6} width={14} height={5} fill="#555" />
            <circle cx={-38} cy={14} r={6} fill="#F1F1F1" />
            <circle cx={-28} cy={14} r={6} fill="#F1F1F1" />
            <circle cx={28} cy={14} r={6} fill="#F1F1F1" />
            <circle cx={38} cy={14} r={6} fill="#F1F1F1" />
          </g>
          {[0, 1, 2].map((i) => (
            <line key={i} x1={110 + i * 6} y1={66 + i * 14} x2={140 + i * 6} y2={60 + i * 14} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
          ))}
        </>
      );
    case "code": {
      const cols = ["#7DD3FC", "#F472B6", "#A3E635", "#FBBF24", "#C4B5FD"];
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#0B132B" b="#1C2541" x2={1} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          <rect x={150} y={26} width={152} height={128} rx={8} fill="#0F172A" stroke="#334155" />
          {["#FF5F56", "#FFBD2E", "#27C93F"].map((c, i) => (
            <circle key={c} cx={162 + i * 10} cy={37} r={3.2} fill={c} />
          ))}
          {Array.from({ length: 8 }, (_, i) => {
            const indent = [0, 10, 20, 20, 10, 20, 10, 0][i];
            const w = 30 + r() * 70;
            return (
              <g key={i}>
                <rect x={162 + indent} y={50 + i * 12} width={w * 0.45} height={6} rx={3} fill={cols[i % 5]} />
                <rect x={162 + indent + w * 0.45 + 5} y={50 + i * 12} width={w * 0.5} height={6} rx={3} fill={cols[(i + 2) % 5]} opacity={0.75} />
              </g>
            );
          })}
          <path d="M60 118 l14 -30 h-12 l14 -34" stroke="#FFD60A" strokeWidth={7} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </>
      );
    }
    case "music": {
      const spin = t * 120;
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#7B2FF7" b="#F107A3" x2={1} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          <g transform={`translate(222 92) rotate(${spin})`}>
            <circle r={72} fill="#111" />
            {[64, 56, 48, 40, 32].map((rr) => (
              <circle key={rr} r={rr} fill="none" stroke="#2A2A2A" strokeWidth={1.4} />
            ))}
            <circle r={22} fill="#FFD60A" />
            <circle r={4} fill="#111" />
            <rect x={8} y={-3} width={10} height={6} rx={2} fill="#FF006E" />
          </g>
          {Array.from({ length: 9 }, (_, i) => {
            const h = 14 + Math.abs(Math.sin(i * 1.7 + t * 6)) * 46;
            return <rect key={i} x={20 + i * 12} y={150 - h} width={7} height={h} rx={3.5} fill="#fff" opacity={0.85} />;
          })}
        </>
      );
    }
    case "draw":
      return (
        <>
          <rect width={W} height={H} fill="#F4EFE6" />
          <circle cx={200} cy={92} r={46} fill="#FF595E" opacity={0.55} />
          <circle cx={236} cy={112} r={36} fill="#1982C4" opacity={0.5} />
          <circle cx={178} cy={120} r={28} fill="#FFCA3A" opacity={0.6} />
          <path d="M150 60 q 40 -30 80 0 t 70 10" stroke="#1F2937" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M160 140 q 30 20 60 0 t 60 -6" stroke="#1F2937" strokeWidth={3} fill="none" strokeLinecap="round" />
          <g transform="translate(250 40) rotate(40)">
            <rect x={0} y={-7} width={70} height={14} fill="#FFD60A" />
            <rect x={-12} y={-7} width={12} height={14} fill="#FF8FAB" />
            <path d="M70 -7 L88 0 L70 7 Z" fill="#E9C46A" />
            <path d="M82 -2.4 L88 0 L82 2.4 Z" fill="#222" />
          </g>
        </>
      );
    case "fix":
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#2A9D8F" b="#264653" x2={1} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          <g transform={`translate(210 92) rotate(${t * 40})`}>
            <circle r={60} fill="none" stroke="#E9ECEF" strokeWidth={7} />
            <circle r={52} fill="none" stroke="#212529" strokeWidth={5} />
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1={0} y1={0} x2={52 * Math.cos((i * Math.PI) / 6)} y2={52 * Math.sin((i * Math.PI) / 6)} stroke="#CED4DA" strokeWidth={1.5} />
            ))}
            <circle r={7} fill="#ADB5BD" />
          </g>
          <g transform="translate(84 120) rotate(-35)">
            <rect x={-6} y={-40} width={12} height={70} rx={5} fill="#CED4DA" />
            <path d="M-15 -48 a 15 15 0 1 0 30 0 l-7 0 l0 8 l-16 0 l0 -8 Z" fill="#CED4DA" />
          </g>
        </>
      );
    case "dance":
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#FF006E" b="#FB5607" x2={1} />
            <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity={0.55} />
              <stop offset="1" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          {[0, 1, 2].map((i) => {
            const sway = Math.sin(t * 2 + i) * 14;
            return <path key={i} d={`M${120 + i * 70} 0 L${80 + i * 70 + sway} 180 L${170 + i * 70 + sway} 180 Z`} fill={`url(#${id}b)`} />;
          })}
          <circle cx={230} cy={46} r={26} fill="#DEE2E6" />
          {[-16, -6, 4, 14].map((x) => (
            <line key={x} x1={230 + x} y1={22} x2={230 + x} y2={70} stroke="#ADB5BD" strokeWidth={1} />
          ))}
          {[-14, -2, 10].map((y) => (
            <line key={y} x1={206} y1={46 + y} x2={254} y2={46 + y} stroke="#ADB5BD" strokeWidth={1} />
          ))}
          <line x1={230} y1={0} x2={230} y2={20} stroke="#ADB5BD" strokeWidth={2} />
        </>
      );
    case "bake":
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#F6D186" b="#E09F3E" x2={1} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          <ellipse cx={206} cy={150} rx={110} ry={16} fill="#00000022" />
          <path d="M106 140 C 100 70 160 52 210 52 C 270 52 316 78 304 140 Z" fill="#B5651D" />
          <path d="M118 140 C 116 86 166 66 210 66 C 262 66 300 88 292 140 Z" fill="#C97B2E" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${150 + i * 44} ${80 + (i === 1 ? -6 : 0)} q 18 10 34 0`} stroke="#F5D0A0" strokeWidth={6} fill="none" strokeLinecap="round" />
          ))}
          {Array.from({ length: 30 }, (_, i) => (
            <circle key={i} cx={20 + r() * 300} cy={10 + r() * 60} r={1.2 + r() * 1.5} fill="#fff" opacity={0.7} />
          ))}
        </>
      );
    case "fly":
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#48CAE4" b="#CAF0F8" />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          {[[60, 50], [250, 120], [150, 150]].map(([x, y], i) => (
            <g key={i} fill="#fff" transform={`translate(${x - t * 10} ${y})`}>
              <circle r={16} />
              <circle cx={18} cy={4} r={12} />
              <circle cx={-18} cy={5} r={11} />
            </g>
          ))}
          <path d="M20 150 Q 120 140 190 80" stroke="#023E8A" strokeWidth={2.5} strokeDasharray="6 7" fill="none" />
          <g transform="translate(206 70) rotate(-24)">
            <path d="M0 0 L-62 -20 L-46 0 Z" fill="#FFFFFF" />
            <path d="M0 0 L-46 0 L-56 16 Z" fill="#D6E2EA" />
          </g>
        </>
      );
    case "travel":
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#FF9E6D" b="#FFD27D" />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          <circle cx={226} cy={74} r={28} fill="#FFF1C1" />
          <path d="M-10 180 L90 54 L150 120 L210 70 L330 180 Z" fill="#3D405B" />
          <path d="M90 54 L108 76 L96 72 L84 80 L76 72 Z" fill="#F4F1DE" />
          <path d="M210 70 L224 88 L212 84 L200 92 Z" fill="#F4F1DE" />
          <path d="M-10 180 L60 120 L130 160 L220 110 L330 170 L330 180 Z" fill="#5C6189" />
          <path d="M-10 180 L110 150 L240 168 L330 150 L330 180 Z" fill="#81B29A" />
        </>
      );
    case "space": {
      const stars = Array.from({ length: 50 }, () => [r() * W, r() * H, 0.4 + r() * 1.1]);
      return (
        <>
          <defs>
            <radialGradient id={`${id}n`} cx="0.3" cy="0.4" r="0.7">
              <stop offset="0" stopColor="#7209B7" stopOpacity={0.9} />
              <stop offset="1" stopColor="#050816" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={`${id}p`} cx="0.35" cy="0.35" r="0.8">
              <stop offset="0" stopColor="#FFD166" />
              <stop offset="1" stopColor="#E85D04" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="#050816" />
          <rect width={W} height={H} fill={`url(#${id}n)`} />
          {stars.map(([x, y, s], i) => (
            <circle key={i} cx={x} cy={y} r={s} fill="#fff" opacity={0.5 + 0.5 * Math.sin(t * 3 + i)} />
          ))}
          <circle cx={214} cy={92} r={46} fill={`url(#${id}p)`} />
          <ellipse cx={214} cy={92} rx={82} ry={18} fill="none" stroke="#FFD166" strokeWidth={5} transform="rotate(-16 214 92)" />
        </>
      );
    }
    case "game":
      return (
        <>
          <defs>
            <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFBE0B" />
              <stop offset="1" stopColor="#FF006E" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="#0D0221" />
          <circle cx={210} cy={86} r={44} fill={`url(#${id}s)`} />
          {[72, 82, 92, 102, 112].map((y, i) => (
            <rect key={y} x={160} y={y} width={100} height={2 + i * 0.8} fill="#0D0221" />
          ))}
          <rect x={0} y={112} width={W} height={68} fill="#0D0221" />
          {Array.from({ length: 13 }, (_, i) => (
            <line key={i} x1={210} y1={112} x2={-150 + i * 60} y2={180} stroke="#00F5D4" strokeWidth={1.2} opacity={0.8} />
          ))}
          {[118, 128, 142, 162].map((y) => (
            <line key={y} x1={0} y1={y} x2={W} y2={y} stroke="#00F5D4" strokeWidth={1.2} opacity={0.8} />
          ))}
        </>
      );
    case "fitness":
      return (
        <>
          <rect width={W} height={H} fill="#FFD60A" />
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={-80 + i * 44} y={-20} width={18} height={240} fill="#FFC300" transform={`rotate(25 ${-80 + i * 44} 0)`} />
          ))}
          <g transform="translate(222 98) rotate(-18)">
            <rect x={-60} y={-5} width={120} height={10} rx={4} fill="#222" />
            <rect x={-72} y={-30} width={20} height={60} rx={5} fill="#111" />
            <rect x={-88} y={-22} width={16} height={44} rx={4} fill="#111" />
            <rect x={52} y={-30} width={20} height={60} rx={5} fill="#111" />
            <rect x={72} y={-22} width={16} height={44} rx={4} fill="#111" />
          </g>
        </>
      );
    case "podcast":
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#0F766E" b="#134E4A" x2={1} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          {[170, 250].map((x, i) => (
            <g key={x} transform={`translate(${x} 70) rotate(${i ? 10 : -10})`}>
              <rect x={-16} y={-34} width={32} height={58} rx={16} fill="#E5E7EB" />
              {[-20, -10, 0, 10].map((y) => (
                <line key={y} x1={-16} y1={y} x2={16} y2={y} stroke="#9CA3AF" strokeWidth={1.2} />
              ))}
              <path d="M-24 4 a 24 24 0 0 0 48 0" stroke="#E5E7EB" strokeWidth={4} fill="none" />
              <line x1={0} y1={28} x2={0} y2={80} stroke="#E5E7EB" strokeWidth={4} />
            </g>
          ))}
          <g transform="translate(40 110)">
            <rect width={72} height={34} rx={17} fill="#fff" />
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={22 + i * 14} cy={17} r={4} fill="#0F766E" opacity={0.4 + 0.6 * ((Math.floor(t * 6) + i) % 3 === 0 ? 1 : 0)} />
            ))}
          </g>
        </>
      );
    case "live":
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#10002B" b="#3C096C" />
            <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F72585" stopOpacity={0.8} />
              <stop offset="1" stopColor="#F72585" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4CC9F0" stopOpacity={0.8} />
              <stop offset="1" stopColor="#4CC9F0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          {[0, 1, 2, 3].map((i) => {
            const a = Math.sin(t * 2.4 + i * 1.3) * 22;
            return (
              <path
                key={i}
                d={`M${60 + i * 66} 0 L${30 + i * 66 + a} 150 L${110 + i * 66 + a} 150 Z`}
                fill={`url(#${id}${i % 2 ? "b" : "c"})`}
              />
            );
          })}
          <rect y={150} width={W} height={30} fill="#000" />
          {Array.from({ length: 22 }, (_, i) => {
            const bob = Math.abs(Math.sin(t * 5 + i * 0.9)) * 4;
            return <circle key={i} cx={8 + i * 14.5} cy={146 - bob + (i % 3) * 2} r={8} fill="#000" />;
          })}
        </>
      );
    case "build": {
      // The hero video: a small A-frame in green hills. Clouds drift and the
      // chimney smokes, so it reads as footage when it plays.
      const drift = t * 9;
      return (
        <>
          <defs>
            <Grad id={`${id}g`} a="#9ED8FF" b="#FDF6DC" />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          <circle cx={262} cy={44} r={20} fill="#FFD166" />
          <circle cx={262} cy={44} r={30} fill="#FFD166" opacity={0.25} />
          {[[40, 36, 1], [170, 26, 0.8], [300, 50, 0.9]].map(([x, y, s], i) => (
            <g key={i} fill="#fff" transform={`translate(${((x + drift * (i + 1) * 0.5) % 380) - 30} ${y}) scale(${s})`}>
              <ellipse rx={22} ry={9} />
              <ellipse cx={14} cy={-5} rx={14} ry={9} />
              <ellipse cx={-12} cy={-3} rx={11} ry={7} />
            </g>
          ))}
          <path d="M-10 132 Q 70 96 160 120 T 330 112 L330 180 L-10 180 Z" fill="#74C69D" />
          <path d="M-10 150 Q 90 126 200 146 T 330 140 L330 180 L-10 180 Z" fill="#52B788" />
          <g transform="translate(150 70)">
            <rect x={44} y={6} width={9} height={22} fill="#6B4226" />
            {[0, 1, 2].map((i) => {
              const k = (t * 0.9 + i / 3) % 1;
              return <circle key={i} cx={48 + Math.sin(k * 6) * 4} cy={2 - k * 30} r={4 + k * 7} fill="#fff" opacity={0.6 * (1 - k)} />;
            })}
            <path d="M0 64 L36 0 L72 64 Z" fill="#8B5E34" />
            <path d="M8 64 L36 14 L64 64 Z" fill="#A47148" />
            {[24, 34, 44, 54].map((y) => (
              <line key={y} x1={36 - (y - 14) * 0.56} y1={y} x2={36 + (y - 14) * 0.56} y2={y} stroke="#7F5539" strokeWidth={1.4} />
            ))}
            <path d="M28 64 L28 46 a 8 8 0 0 1 16 0 L44 64 Z" fill="#432818" />
            <circle cx={36} cy={30} r={6} fill="#FFD166" />
            <rect x={-6} y={62} width={84} height={6} rx={2} fill="#6B4226" />
          </g>
          <g transform="translate(84 112)">
            <rect x={-2} y={0} width={4} height={18} fill="#6B4226" />
            <circle cy={-6} r={13} fill="#2D6A4F" />
            <circle cx={-6} cy={-12} r={8} fill="#40916C" />
          </g>
          <path d="M-10 166 Q 120 150 330 170 L330 180 L-10 180 Z" fill="#40916C" />
        </>
      );
    }
  }
}

export function ThumbArt({
  kind,
  t = 0,
  seed = 1,
  text = true,
  textOpacity = 1,
  style,
}: {
  kind: Kind;
  t?: number;
  seed?: number;
  text?: boolean;
  textOpacity?: number;
  style?: React.CSSProperties;
}) {
  const id = `${kind}${seed}`;
  const lines = KIND_TEXT[kind];
  const textColor = ["skate", "fix"].includes(kind) ? "#FFD60A" : kind === "game" ? "#00F5D4" : "#FFFFFF";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ display: "block", width: "100%", height: "100%", ...style }}>
      <Scene kind={kind} t={t} id={id} seed={seed} />
      {text && textOpacity > 0 && lines.length > 0 && (
        <g opacity={textOpacity}>
          <Overlay lines={lines} color={textColor} size={lines.length > 1 ? 36 : 42} y={lines.length > 1 ? 54 : 62} />
        </g>
      )}
    </svg>
  );
}
